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
  Loader2,
  ArrowLeft,
  AlertTriangle
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/useAuthStore'
import { useSchoolStore } from '@/store/useSchoolStore'
import { ModalEscala } from '@/components/ModalEscala'
import { HorariosSlotsSection } from '@/components/HorariosSlotsSection'
import { GradeSemanalSection } from '@/components/GradeSemanalSection'

const formatarDataBR = (dataStr: string | null | undefined) => {
  if (!dataStr) return '-'
  const clean = String(dataStr).split('T')[0]
  const parts = clean.split('-')
  if (parts.length !== 3) return dataStr
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

export default function PainelChefePage() {
  const { funcionario, isDiretor, isChefe, isAdminGlobalOrRoot, acessos } = useAuthStore()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'equipe' | 'escalas' | 'registros' | 'alertas' | 'horarios' | 'grade'>('equipe')
  const [busca, setBusca] = useState('')
  const [cargosGerenciados, setCargosGerenciados] = useState<string[]>([])
  const [isModalEscalaOpen, setIsModalEscalaOpen] = useState(false)
  const selectedSecretaria = useSchoolStore((state) => state.selectedSecretaria)
  const isSaude = selectedSecretaria?.nome?.toLowerCase().includes('saúde') || false

  useEffect(() => {
    if (funcionario && !isDiretor() && !isChefe() && !isAdminGlobalOrRoot()) {
      toast.error('Acesso restrito a Administradores (Nível 1), Diretores (Nível 2) e Chefes de Equipe (Nível 5).')
      router.push('/home')
    }
  }, [funcionario, isDiretor, isChefe, isAdminGlobalOrRoot, router])

  const supabase = createClient()
  const [equipe, setEquipe] = useState<any[]>([])
  const [escalas, setEscalas] = useState<any[]>([])
  const [alertas, setAlertas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPainelData = async (isMountedRef = { current: true }) => {
    const state = useAuthStore.getState()
    const isDir = state.isDiretor()
    const isCh = state.isChefe()
    const isAdmin = state.isAdminGlobalOrRoot()
    const userId = state.funcionario?.id

    if (!userId) return // Aguarda hydrate do Zustand

    setLoading(true)

    let cargos: string[] = []
    if (isCh) {
      const { data } = await supabase
        .from('acessos_usuarios')
        .select('cargos_gerenciados')
        .eq('funcionario_id', userId)
        .maybeSingle()
      if (data?.cargos_gerenciados && Array.isArray(data.cargos_gerenciados)) {
        cargos = data.cargos_gerenciados
        if (isMountedRef.current) setCargosGerenciados(cargos)
      }
    }

    let queryFunc = supabase
      .from('funcionarios')
      .select('id, nome, cargo, orgao, status, email, is_superadmin, is_conta_especial, acessos_usuarios(nivel, ativo)')
      .order('nome')

    if (isDir) {
      queryFunc = queryFunc.not('is_superadmin', 'eq', true)
    } else if (isCh) {
      if (cargos.length === 0) {
        // Se é chefe e não tem cargos gerenciados, não retorna ninguém
        if (isMountedRef.current) {
          setEquipe([])
          setEscalas([])
          setAlertas([])
          setLoading(false)
        }
        return
      }
      queryFunc = queryFunc.in('cargo', cargos)
    }

    const { data: funcData } = await queryFunc
    if (!isMountedRef.current) return

    let filteredEquipe = (funcData || []).filter((f: any) => !f.is_conta_especial)
    if (isDir && funcData) {
      // Filtros adicionais client-side mais complexos para Diretores (ABAC níveis)
      filteredEquipe = filteredEquipe.filter((f: any) => {
        if (f.nome?.toLowerCase() === 'root' || f.email?.toLowerCase().startsWith('root@')) return false
        const acessosList = (f.acessos_usuarios as Array<{ nivel: number | null; ativo: boolean }>) ?? []
        if (acessosList.some(a => (a.nivel === 1 || a.nivel === 2) && a.ativo)) return false
        return true
      })
    }
    
    setEquipe(filteredEquipe)
    const equipeIds = filteredEquipe.map((f: any) => f.id)

    // Se não for admin e a equipe estiver vazia, não precisa buscar escalas/alertas
    if (!isAdmin && equipeIds.length === 0) {
      setEscalas([])
      setAlertas([])
      setLoading(false)
      return
    }

    let queryEsc = (supabase.from as any)('escalas_servico')
      .select('*, funcionarios(nome), escolas(nome)')
      .order('data', { ascending: false })
      
    let queryAlt = (supabase.from as any)('solicitacoes_rh')
      .select('*, funcionarios(nome)')
      .order('data', { ascending: false })

    if (isDir || isCh) {
      queryEsc = queryEsc.in('funcionario_id', equipeIds)
      queryAlt = queryAlt.in('funcionario_id', equipeIds)
    }

    const [escRes, altRes] = await Promise.all([queryEsc, queryAlt])
    
    if (isMountedRef.current) {
      setEscalas(escRes.data || [])
      setAlertas(altRes.data || [])
      setLoading(false)
    }
  }

  useEffect(() => {
    const isMountedRef = { current: true }
    fetchPainelData(isMountedRef)
    return () => {
      isMountedRef.current = false
    }
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
          <div className="flex items-center gap-3">
            <Link href="/home">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-2">
              <UserCheck className="w-8 h-8 text-highlight" />
              Painel da Liderança (Chefia de Equipe)
            </h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Gestão operacional de subordinados pelos cargos autorizados no seu perfil (ABAC - Nível 5).
          </p>
        </div>

        <Button onClick={() => setIsModalEscalaOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-2 cursor-pointer">
          <Plus className="w-4 h-4" /> Criar Escala de Trabalho
        </Button>
      </div>

      {/* Main Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-borderCustom bg-card p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs text-muted-foreground uppercase font-semibold">Total da Equipe</p>
            <div className="text-2xl font-bold text-foreground mt-1">{equipe.length}</div>
          </div>
          <Users className="w-8 h-8 text-highlight opacity-80" />
        </Card>

        <Card className="border-borderCustom bg-card p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs text-muted-foreground uppercase font-semibold">Em Turno Agora</p>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {equipe.filter(m => (m.status || 'ATIVO').toUpperCase() === 'ATIVO').length}
            </div>
          </div>
          <Clock className="w-8 h-8 text-emerald-400 opacity-80" />
        </Card>

        <Card className="border-borderCustom bg-card p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs text-muted-foreground uppercase font-semibold">Escalas Pendentes</p>
            <div className="text-2xl font-bold text-amber-400 mt-1">{escalas.filter(e => e.status === 'Pendente').length}</div>
          </div>
          <Calendar className="w-8 h-8 text-amber-400 opacity-80" />
        </Card>

        <Card className="border-borderCustom bg-card p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs text-muted-foreground uppercase font-semibold">Solicitações Pendentes</p>
            <div className="text-2xl font-bold text-rose-400 mt-1">{alertas.filter(a => a.status === 'Pendente').length}</div>
          </div>
          <Bell className="w-8 h-8 text-rose-400 opacity-80" />
        </Card>
      </div>

      {/* Horizontal Tab Navigation */}
      <div className="flex border-b border-borderCustom gap-2 overflow-x-auto">
        {[
          { id: 'equipe', label: 'Minha Equipe', icon: Users },
          { id: 'escalas', label: 'Escalas de Turno', icon: Calendar },
          { id: 'alertas', label: 'Atestados & Justificativas', icon: Bell },
          ...(isSaude ? [] : [
            { id: 'horarios', label: 'Configurar Horários', icon: Clock },
            { id: 'grade', label: 'Montar Grade Semanal', icon: Calendar }
          ])
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
                  : 'border-transparent text-muted-foreground hover:text-foreground'
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
          {isChefe() && cargosGerenciados.length === 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-amber-500 text-sm flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>Nenhum cargo configurado sob sua gestão. Solicite a atribuição de cargos ao administrador para gerenciar sua equipe.</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md w-full">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar membro por nome, cargo ou escola..."
                className="pl-9 bg-input border-borderCustom text-foreground"
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

          <div className="rounded-2xl border border-borderCustom bg-card overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-muted/60">
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
                      <TableCell className="font-semibold text-foreground">{membro.nome}</TableCell>
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
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Calendar className="w-5 h-5 text-highlight" />
            Escalas de Trabalho da Equipe
          </h2>
          <div className="rounded-2xl border border-borderCustom bg-card overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-muted/60">
                <TableRow className="border-borderCustom">
                  <TableHead className="text-muted-foreground">Funcionário</TableHead>
                  <TableHead className="text-muted-foreground">Data</TableHead>
                  <TableHead className="text-muted-foreground">Turno</TableHead>
                  <TableHead className="text-muted-foreground">Escola</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-right text-muted-foreground">Ações</TableHead>
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
                      <TableCell className="font-semibold text-foreground">{esc.funcionarios?.nome || '-'}</TableCell>
                      <TableCell className="font-mono text-xs text-foreground">{formatarDataBR(esc.data)}</TableCell>
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
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
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
                <Card key={alerta.id} className="bg-card border-borderCustom p-5 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">{alerta.funcionarios?.nome || 'Servidor'}</span>
                    <span className="text-xs font-mono text-muted-foreground">{formatarDataBR(alerta.data)}</span>
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

      {!isSaude && activeTab === 'horarios' && (
        <HorariosSlotsSection />
      )}

      {!isSaude && activeTab === 'grade' && (
        <GradeSemanalSection />
      )}

      <ModalEscala 
        open={isModalEscalaOpen} 
        onOpenChange={setIsModalEscalaOpen} 
        equipe={equipe} 
        onSuccess={fetchPainelData} 
      />
    </div>
  )
}
