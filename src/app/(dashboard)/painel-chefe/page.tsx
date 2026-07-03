'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  ShieldAlert, 
  Users, 
  Calendar, 
  Clock, 
  Bell, 
  Search, 
  CheckCircle, 
  XCircle, 
  UserCheck,
  FileCheck,
  Plus
} from 'lucide-react'
import { toast } from 'sonner'

const mockEquipe = [
  { id: '1', nome: 'Roberto Alves', cargo: 'Professor', escola: 'Colégio Dr Eraldo Tinoco', status: 'Em turno', horario: '07:30 - 12:00' },
  { id: '2', nome: 'Mariana Lima', cargo: 'Monitor', escola: 'Escola Castelo Branco', status: 'Falta', horario: '08:00 - 17:00' },
  { id: '3', nome: 'Carlos Souza', cargo: 'Professor', escola: 'Colégio Moisés Alves', status: 'Em turno', horario: '13:00 - 17:30' },
  { id: '4', nome: 'Juliana Paes', cargo: 'Monitor', escola: 'Escolhinha PIU-PIU', status: 'Folga', horario: 'Escala 12x36' },
]

const mockEscalas = [
  { id: '1', funcionario: 'Roberto Alves', data: '03/07/2026', turno: 'Matutino', escola: 'Colégio Dr Eraldo Tinoco', status: 'Confirmada' },
  { id: '2', funcionario: 'Mariana Lima', data: '03/07/2026', turno: 'Integral', escola: 'Escola Castelo Branco', status: 'Pendente' },
]

const mockAlertas = [
  { id: '1', funcionario: 'Mariana Lima', tipo: 'Atestado Médico', data: '03/07/2026', motivo: 'Gripe Forte', status: 'Pendente' },
  { id: '2', funcionario: 'Carlos Souza', tipo: 'Troca de Turno', data: '04/07/2026', motivo: 'Consulta Médica', status: 'Aprovado' },
]

export default function PainelChefePage() {
  const [activeTab, setActiveTab] = useState<'equipe' | 'escalas' | 'registros' | 'alertas'>('equipe')
  const [busca, setBusca] = useState('')
  const cargosGerenciados = ['Professor', 'Monitor', 'Agente de Portaria']

  const equipeFiltrada = mockEquipe.filter(
    (membro) => 
      membro.nome.toLowerCase().includes(busca.toLowerCase()) ||
      membro.cargo.toLowerCase().includes(busca.toLowerCase()) ||
      membro.escola.toLowerCase().includes(busca.toLowerCase())
  )

  const handleAprovar = (id: string, tipo: string) => {
    toast.success(`${tipo} aprovado(a) com sucesso!`)
  }

  const handleRejeitar = (id: string, tipo: string) => {
    toast.error(`${tipo} rejeitado(a).`)
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

        <Button onClick={() => toast.info('Nova escala')} className="bg-highlight text-background hover:bg-highlight/90 font-bold gap-2">
          <Plus className="w-4 h-4" /> Criar Escala de Trabalho
        </Button>
      </div>

      {/* Main Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-borderCustom bg-[#121212] p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase font-semibold">Total da Equipe</p>
            <div className="text-2xl font-bold text-white mt-1">{mockEquipe.length}</div>
          </div>
          <Users className="w-8 h-8 text-highlight opacity-80" />
        </Card>

        <Card className="border-borderCustom bg-[#121212] p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase font-semibold">Em Turno Agora</p>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {mockEquipe.filter(m => m.status === 'Em turno').length}
            </div>
          </div>
          <Clock className="w-8 h-8 text-emerald-400 opacity-80" />
        </Card>

        <Card className="border-borderCustom bg-[#121212] p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase font-semibold">Escalas Pendentes</p>
            <div className="text-2xl font-bold text-amber-400 mt-1">1</div>
          </div>
          <Calendar className="w-8 h-8 text-amber-400 opacity-80" />
        </Card>

        <Card className="border-borderCustom bg-[#121212] p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase font-semibold">Solicitações de Atestado</p>
            <div className="text-2xl font-bold text-rose-400 mt-1">1</div>
          </div>
          <Bell className="w-8 h-8 text-rose-400 opacity-80" />
        </Card>
      </div>

      {/* Horizontal Tab Navigation */}
      <div className="flex border-b border-borderCustom gap-2">
        {[
          { id: 'equipe', label: 'Minha Equipe', icon: Users },
          { id: 'escalas', label: 'Escalas de Turno', icon: Calendar },
          { id: 'registros', label: 'Registros de Ponto', icon: Clock },
          { id: 'alertas', label: 'Atestados & Justificativas', icon: Bell },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
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
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar membro por nome, cargo ou escola..."
                className="pl-9 bg-[#121212] border-borderCustom text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-semibold uppercase">Cargos Sob Sua Gestão:</span>
              {cargosGerenciados.map((c) => (
                <span key={c} className="px-2.5 py-1 bg-highlight/10 text-highlight border border-highlight/20 text-xs rounded-full font-bold">
                  {c}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-borderCustom bg-[#121212] overflow-hidden shadow-md">
            <Table>
              <TableHeader className="bg-[#0d0d0d]">
                <TableRow className="border-borderCustom hover:bg-transparent">
                  <TableHead className="text-foregroundCustom font-semibold">Nome do Membro</TableHead>
                  <TableHead className="text-foregroundCustom font-semibold">Cargo</TableHead>
                  <TableHead className="text-foregroundCustom font-semibold">Escola Lotação</TableHead>
                  <TableHead className="text-foregroundCustom font-semibold">Escala / Horário</TableHead>
                  <TableHead className="text-foregroundCustom font-semibold">Status Hoje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipeFiltrada.map((membro) => (
                  <TableRow key={membro.id} className="border-borderCustom hover:bg-hoverCustom transition-colors">
                    <TableCell className="font-semibold text-white">{membro.nome}</TableCell>
                    <TableCell className="text-muted-foreground">{membro.cargo}</TableCell>
                    <TableCell className="text-muted-foreground">{membro.escola}</TableCell>
                    <TableCell className="text-xs font-mono text-white">{membro.horario}</TableCell>
                    <TableCell>
                      <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${
                        membro.status === 'Em turno'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : membro.status === 'Falta'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}>
                        {membro.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
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
          <div className="rounded-2xl border border-borderCustom bg-[#121212] overflow-hidden">
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
                {mockEscalas.map((esc) => (
                  <TableRow key={esc.id} className="border-borderCustom">
                    <TableCell className="font-semibold text-white">{esc.funcionario}</TableCell>
                    <TableCell className="font-mono text-xs">{esc.data}</TableCell>
                    <TableCell>{esc.turno}</TableCell>
                    <TableCell>{esc.escola}</TableCell>
                    <TableCell>
                      <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-full text-xs font-bold border border-amber-500/20">
                        {esc.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button onClick={() => handleAprovar(esc.id, 'Escala')} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Aprovar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
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
            {mockAlertas.map((alerta) => (
              <Card key={alerta.id} className="bg-[#121212] border-borderCustom p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">{alerta.funcionario}</span>
                  <span className="text-xs font-mono text-muted-foreground">{alerta.data}</span>
                </div>
                <div>
                  <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 rounded-full text-xs font-bold border border-rose-500/20">
                    {alerta.tipo}
                  </span>
                  <p className="text-sm text-foregroundCustom/80 mt-2">Motivo: {alerta.motivo}</p>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-borderCustom">
                  <Button onClick={() => handleRejeitar(alerta.id, alerta.tipo)} variant="outline" size="sm" className="border-rose-600/40 text-rose-400 hover:bg-rose-950/30 gap-1">
                    <XCircle className="w-3.5 h-3.5" /> Rejeitar
                  </Button>
                  <Button onClick={() => handleAprovar(alerta.id, alerta.tipo)} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Aprovar
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
