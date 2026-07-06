'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Users, 
  Calendar, 
  Clock, 
  Bell, 
  Search, 
  CheckCircle, 
  XCircle, 
  UserCheck,
  Plus,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/useAuthStore'

export default function PainelChefePage() {
  const { funcionario } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'equipe' | 'escalas' | 'registros' | 'alertas'>('equipe')
  const [busca, setBusca] = useState('')
  const [cargosGerenciados, setCargosGerenciados] = useState<string[]>([])

  const supabase = createClient()
  const [equipe, setEquipe] = useState<any[]>([])
  const [escalas, setEscalas] = useState<any[]>([])
  const [alertas, setAlertas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPainelData = async () => {
    setLoading(true)
    const [funcRes, escRes, altRes] = await Promise.all([
      supabase.from('funcionarios').select('*').order('nome'),
      (supabase.from as any)('escalas_servico').select('*, funcionarios(nome), escolas(nome)').order('data', { ascending: false }),
      (supabase.from as any)('solicitacoes_rh').select('*, funcionarios(nome)').order('data', { ascending: false })
    ])
    
    if (funcRes.data) setEquipe(funcRes.data)
    if (escRes.data) setEscalas(escRes.data)
    if (altRes.data) setAlertas(altRes.data)
    
    setLoading(false)
  }

  useEffect(() => {
    fetchPainelData()
  }, [])

  // Buscar cargos gerenciados pelo funcionário logado no ABAC
  useEffect(() => {
    const fetchCargosGerenciados = async () => {
      if (!funcionario?.id) return
      const { data } = await supabase
        .from('acessos_usuarios')
        .select('cargos_gerenciados')
        .eq('funcionario_id', funcionario.id)
        .maybeSingle()

      if (data?.cargos_gerenciados && Array.isArray(data.cargos_gerenciados)) {
        setCargosGerenciados(data.cargos_gerenciados)
      }
    }
    fetchCargosGerenciados()
  }, [funcionario?.id])

  const equipeFiltrada = equipe.filter(
    (membro) => 
      (membro.nome || '').toLowerCase().includes(busca.toLowerCase()) ||
      (membro.cargo || '').toLowerCase().includes(busca.toLowerCase()) ||
      (membro.orgao || '').toLowerCase().includes(busca.toLowerCase())
  )

  const handleAprovar = async (id: string, tipo: 'Escala' | 'Solicitacao') => {
    if (tipo === 'Escala') {
      const { error } = await (supabase.from as any)('escalas_servico')
        .update({ status: 'Aprovado' })
        .eq('id', id)

      if (error) {
        toast.error('Erro ao aprovar escala: ' + error.message)
      } else {
        toast.success('Escala aprovada com sucesso!')
        fetchPainelData()
      }
    } else {
      const { error } = await (supabase.from as any)('solicitacoes_rh')
        .update({ status: 'Aprovado' })
        .eq('id', id)

      if (error) {
        toast.error('Erro ao aprovar solicitação: ' + error.message)
      } else {
        toast.success('Solicitação aprovada com sucesso!')
        fetchPainelData()
      }
    }
  }

  const handleRejeitar = async (id: string, tipo: 'Escala' | 'Solicitacao') => {
    if (tipo === 'Escala') {
      const { error } = await (supabase.from as any)('escalas_servico')
        .update({ status: 'Rejeitado' })
        .eq('id', id)

      if (error) {
        toast.error('Erro ao rejeitar escala: ' + error.message)
      } else {
        toast.error('Escala rejeitada.')
        fetchPainelData()
      }
    } else {
      const { error } = await (supabase.from as any)('solicitacoes_rh')
        .update({ status: 'Rejeitado' })
        .eq('id', id)

      if (error) {
        toast.error('Erro ao rejeitar solicitação: ' + error.message)
      } else {
        toast.error('Solicitação rejeitada.')
        fetchPainelData()
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-borderCustom">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
            <UserCheck className="w-8 h-8 text-highlight" />
            Painel da Liderança (Chefia de Equipe)
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestão operacional de subordinados pelos cargos autorizados no seu perfil (ABAC - Nível 5).
          </p>
        </div>

        <Button onClick={() => toast.info('Funcionalidade de criação de escalas')} className="bg-highlight text-background hover:bg-highlight/90 font-bold gap-2 cursor-pointer">
          <Plus className="w-4 h-4" /> Criar Escala de Trabalho
        </Button>
      </div>

      {/* Main Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-borderCustom bg-[#121212] p-4 flex items-center justify-between shadow-md">
          <div>
            <p className="text-xs text-muted-foreground uppercase font-semibold">Total da Equipe</p>
            <div className="text-2xl font-bold text-white mt-1">{equipe.length}</div>
          </div>
          <Users className="w-8 h-8 text-highlight opacity-80" />
        </Card>

        <Card className="border-borderCustom bg-[#121212] p-4 flex items-center justify-between shadow-md">
          <div>
            <p className="text-xs text-muted-foreground uppercase font-semibold">Em Turno Agora</p>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {equipe.filter(m => (m.status || 'ATIVO').toUpperCase() === 'ATIVO').length}
            </div>
          </div>
          <Clock className="w-8 h-8 text-emerald-400 opacity-80" />
        </Card>

        <Card className="border-borderCustom bg-[#121212] p-4 flex items-center justify-between shadow-md">
          <div>
            <p className="text-xs text-muted-foreground uppercase font-semibold">Escalas Pendentes</p>
            <div className="text-2xl font-bold text-amber-400 mt-1">{escalas.filter(e => e.status === 'Pendente').length}</div>
          </div>
          <Calendar className="w-8 h-8 text-amber-400 opacity-80" />
        </Card>

        <Card className="border-borderCustom bg-[#121212] p-4 flex items-center justify-between shadow-md">
          <div>
            <p className="text-xs text-muted-foreground uppercase font-semibold">Solicitações Pendentes</p>
            <div className="text-2xl font-bold text-rose-400 mt-1">{alertas.filter(a => a.status === 'Pendente').length}</div>
          </div>
          <Bell className="w-8 h-8 text-rose-400 opacity-80" />
        </Card>
      </div>

      {/* Horizontal Tab Navigation */}
      <div className="flex border-b border-borderCustom gap-2">
        {[
          { id: 'equipe', label: 'Minha Equipe', icon: Users },
          { id: 'escalas', label: 'Escalas de Turno', icon: Calendar },
          { id: 'alertas', label: 'Atestados & Justificativas', icon: Bell },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                isActive 
                  ? 'border-highlight text-highlight bg-highlight/5' 
                  : 'border-transparent text-foregroundCustom/70 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* TAB 1: MINHA EQUIPE */}
      {activeTab === 'equipe' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md w-full">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar membro por nome, cargo ou escola..."
                className="pl-9 bg-[#121212] border-borderCustom text-white"
              />
            </div>
            {cargosGerenciados.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground font-semibold uppercase">Cargos Sob Sua Gestão:</span>
                {cargosGerenciados.map((c) => (
                  <span key={c} className="px-2.5 py-1 bg-highlight/10 text-highlight border border-highlight/20 text-xs rounded-full font-bold">
                    {c}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-borderCustom bg-[#121212] overflow-hidden shadow-md">
            <Table>
              <TableHeader className="bg-[#0d0d0d]">
                <TableRow className="border-borderCustom hover:bg-transparent">
                  <TableHead className="text-foregroundCustom font-semibold">Nome do Membro</TableHead>
                  <TableHead className="text-foregroundCustom font-semibold">Cargo</TableHead>
                  <TableHead className="text-foregroundCustom font-semibold">Escola Lotação</TableHead>
                  <TableHead className="text-foregroundCustom font-semibold">Status Hoje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
                        <Loader2 className="w-4 h-4 animate-spin text-highlight" />
                        <span>Carregando dados da equipe...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : equipeFiltrada.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-sm">
                      Nenhum membro encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  equipeFiltrada.map((membro) => (
                    <TableRow key={membro.id} className="border-borderCustom hover:bg-hoverCustom transition-colors">
                      <TableCell className="font-semibold text-white">{membro.nome}</TableCell>
                      <TableCell className="text-muted-foreground">{membro.cargo || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{membro.orgao || '-'}</TableCell>
                      <TableCell>
                        <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${
                          (membro.status || 'ATIVO').toUpperCase() === 'ATIVO'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : (membro.status || '').toUpperCase() === 'SUSPENSO'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}>
                          {membro.status || 'ATIVO'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* TAB 2: ESCALAS */}
      {activeTab === 'escalas' && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-highlight" />
            Escalas de Trabalho da Equipe
          </h2>
          <div className="rounded-2xl border border-borderCustom bg-[#121212] overflow-hidden shadow-md">
            <Table>
              <TableHeader className="bg-[#0d0d0d]">
                <TableRow className="border-borderCustom">
                  <TableHead className="text-white">Funcionário</TableHead>
                  <TableHead className="text-white">Data</TableHead>
                  <TableHead className="text-white">Turno</TableHead>
                  <TableHead className="text-white">Escola</TableHead>
                  <TableHead className="text-white">Status</TableHead>
                  <TableHead className="text-right text-white">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
                        <Loader2 className="w-4 h-4 animate-spin text-highlight" />
                        <span>Carregando escalas...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : escalas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                      Nenhuma escala registrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  escalas.map((esc) => (
                    <TableRow key={esc.id} className="border-borderCustom hover:bg-hoverCustom">
                      <TableCell className="font-semibold text-white">{esc.funcionarios?.nome || '-'}</TableCell>
                      <TableCell className="font-mono text-xs text-white">{esc.data ? new Date(esc.data).toLocaleDateString('pt-BR') : '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{esc.turno || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{esc.escolas?.nome || '-'}</TableCell>
                      <TableCell>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          esc.status === 'Pendente' 
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                            : esc.status === 'Aprovado'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                          {esc.status || 'Pendente'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {esc.status === 'Pendente' && (
                          <div className="flex justify-end gap-2">
                            <Button onClick={() => handleRejeitar(esc.id, 'Escala')} variant="outline" size="sm" className="border-rose-600/40 text-rose-400 hover:bg-rose-950/30 text-xs gap-1 cursor-pointer">
                              <XCircle className="w-3.5 h-3.5" /> Rejeitar
                            </Button>
                            <Button onClick={() => handleAprovar(esc.id, 'Escala')} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1 cursor-pointer">
                              <CheckCircle className="w-3.5 h-3.5" /> Aprovar
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* TAB 3: ATESTADOS & JUSTIFICATIVAS */}
      {activeTab === 'alertas' && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-rose-400" />
            Solicitações de Atestados e Trocas de Turno
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading ? (
              <div className="col-span-full text-center text-muted-foreground py-8 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-highlight" />
                <span>Carregando solicitações...</span>
              </div>
            ) : alertas.length === 0 ? (
              <div className="col-span-full text-center text-muted-foreground py-8 border border-dashed border-borderCustom rounded-2xl">
                Nenhuma solicitação pendente.
              </div>
            ) : (
              alertas.map((alerta) => (
                <Card key={alerta.id} className="bg-[#121212] border-borderCustom p-5 space-y-3 shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{alerta.funcionarios?.nome || 'Servidor'}</span>
                    <span className="text-xs font-mono text-muted-foreground">{alerta.data ? new Date(alerta.data).toLocaleDateString('pt-BR') : '-'}</span>
                  </div>
                  <div>
                    <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 rounded-full text-xs font-bold border border-rose-500/20">
                      {alerta.tipo || 'Solicitação'}
                    </span>
                    <p className="text-sm text-foregroundCustom/80 mt-2">Motivo: {alerta.motivo || '-'}</p>
                  </div>
                  {alerta.status === 'Pendente' ? (
                    <div className="flex justify-end gap-2 pt-2 border-t border-borderCustom">
                      <Button onClick={() => handleRejeitar(alerta.id, 'Solicitacao')} variant="outline" size="sm" className="border-rose-600/40 text-rose-400 hover:bg-rose-950/30 gap-1 cursor-pointer">
                        <XCircle className="w-3.5 h-3.5" /> Rejeitar
                      </Button>
                      <Button onClick={() => handleAprovar(alerta.id, 'Solicitacao')} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 cursor-pointer">
                        <CheckCircle className="w-3.5 h-3.5" /> Aprovar
                      </Button>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-borderCustom">
                      <span className={`text-xs font-semibold ${alerta.status === 'Aprovado' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        Status: {alerta.status}
                      </span>
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
