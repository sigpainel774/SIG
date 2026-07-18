'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { Escola } from '@/store/useSchoolStore'
import { useAuthStore } from '@/store/useAuthStore'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Users, CalendarCheck, CheckCircle2, ShieldAlert, Search, RefreshCw } from 'lucide-react'

interface RelatorioOcorrenciasProps {
  selectedEscola: Escola | null
}

export default function RelatorioOcorrencias({ selectedEscola }: RelatorioOcorrenciasProps) {
  const { funcionario, acessos } = useAuthStore()
  const supabase = createClient()

  // Permissão: Nível 1, Superadmin ou pode_ocorrencias
  const isAuthorized = 
    funcionario?.is_superadmin || 
    acessos.some(a => a.nivel === 1) || 
    acessos.some(a => a.pode_ocorrencias)

  // Estados
  const [ocorrencias, setOcorrencias] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filtros locais
  const [searchTerm, setSearchTerm] = useState('')
  const [gravidadeFiltro, setGravidadeFiltro] = useState('todas')

  const fetchOcorrencias = async () => {
    if (!isAuthorized) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('ocorrencias')
        .select(`
          id,
          tipo,
          gravidade,
          descricao,
          status_pais,
          data,
          aluno_id,
          alunos (nome),
          turma_id,
          turmas (nome),
          escola_id,
          escolas (nome),
          registrado_por,
          funcionarios (nome)
        `)
        .order('data', { ascending: false })

      if (selectedEscola?.id) {
        query = query.eq('escola_id', selectedEscola.id)
      }

      const { data, error: err } = await query
      if (err) throw err

      setOcorrencias(data ?? [])
    } catch (err: any) {
      console.error('Erro ao buscar ocorrências:', err)
      setError(err?.message ?? 'Erro inesperado ao carregar ocorrências.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOcorrencias()
  }, [selectedEscola])

  // Filtragem dos dados locais baseada em busca por nome do aluno e gravidade
  const filteredOcorrencias = ocorrencias.filter((oco) => {
    const nomeAluno = oco.alunos?.nome?.toLowerCase() ?? ''
    const tipoOco = oco.tipo?.toLowerCase() ?? ''
    const matchesSearch = nomeAluno.includes(searchTerm.toLowerCase()) || tipoOco.includes(searchTerm.toLowerCase())
    const matchesGravidade = gravidadeFiltro === 'todas' || oco.gravidade === gravidadeFiltro
    return matchesSearch && matchesGravidade
  })

  // Cálculos de Métricas
  const totalOcorrencias = filteredOcorrencias.length
  const totalAlta = filteredOcorrencias.filter(o => o.gravidade === 'Alta').length
  const totalMedia = filteredOcorrencias.filter(o => o.gravidade === 'Média').length
  const totalBaixa = filteredOcorrencias.filter(o => o.gravidade === 'Baixa').length

  const cientes = filteredOcorrencias.filter(o => o.status_pais === 'Cientes').length
  const taxaCientes = totalOcorrencias > 0 ? Math.round((cientes / totalOcorrencias) * 100) : 0

  // Determinar a turma com mais ocorrências
  const turmaCounts: Record<string, number> = {}
  filteredOcorrencias.forEach(o => {
    const tNome = o.turmas?.nome
    if (tNome) {
      turmaCounts[tNome] = (turmaCounts[tNome] ?? 0) + 1
    }
  })
  let principalTurma = '-'
  let maxCounts = 0
  Object.entries(turmaCounts).forEach(([turma, count]) => {
    if (count > maxCounts) {
      maxCounts = count
      principalTurma = turma
    }
  })

  const getGravidadeColor = (gravidade: string) => {
    switch (gravidade) {
      case 'Alta': return 'bg-destructive/20 text-destructive border-destructive/30'
      case 'Média': return 'bg-warning/20 text-warning border-warning/30'
      case 'Baixa': return 'bg-success/20 text-success border-success/30'
      default: return 'bg-muted text-muted-foreground border-border'
    }
  }

  const getStatusPaisColor = (status: string) => {
    switch (status) {
      case 'Cientes': return 'text-success'
      case 'Reunião Agendada': return 'text-warning'
      default: return 'text-muted-foreground'
    }
  }

  if (!isAuthorized) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-6 text-center text-destructive-foreground">
        <h3 className="text-base font-bold mb-2">Acesso Negado</h3>
        <p className="text-xs">Você não tem permissão para visualizar o relatório de ocorrências.</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6 text-center text-rose-300">
        <h3 className="text-base font-bold mb-2">Erro de Carregamento</h3>
        <p className="text-xs">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Total de Ocorrências</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-black text-foreground mt-2">{loading ? '...' : totalOcorrencias}</p>
          <span className="text-[10px] text-muted-foreground mt-1 block">
            {selectedEscola ? 'Na escola selecionada' : 'Consolidado na rede'}
          </span>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Gravidade Alta</span>
            <ShieldAlert className="w-4 h-4 text-destructive" />
          </div>
          <p className="text-2xl font-black text-destructive mt-2">{loading ? '...' : totalAlta}</p>
          <span className="text-[10px] text-muted-foreground mt-1 block">
            Médias: {totalMedia} | Baixas: {totalBaixa}
          </span>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Ciência dos Pais</span>
            <CheckCircle2 className="w-4 h-4 text-success" />
          </div>
          <p className="text-2xl font-black text-success mt-2">{loading ? '...' : `${taxaCientes}%`}</p>
          <span className="text-[10px] text-muted-foreground mt-1 block">
            {cientes} de {totalOcorrencias} cientes
          </span>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Turma Mais Afetada</span>
            <Users className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-black text-primary mt-2">{loading ? '...' : principalTurma}</p>
          <span className="text-[10px] text-muted-foreground mt-1 block">
            {maxCounts > 0 ? `${maxCounts} incidentes` : 'Sem registros'}
          </span>
        </div>
      </div>

      {/* Barra de Filtros e Ferramentas */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-card border border-border no-print">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por aluno ou tipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-background border-border text-foreground text-xs"
            />
          </div>

          <Select value={gravidadeFiltro} onValueChange={(val) => val && setGravidadeFiltro(val)}>
            <SelectTrigger className="w-[180px] bg-background border-border text-foreground text-xs">
              <SelectValue placeholder="Gravidade" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-foreground">
              <SelectItem value="todas">Todas as Gravidades</SelectItem>
              <SelectItem value="Baixa">Baixa</SelectItem>
              <SelectItem value="Média">Média</SelectItem>
              <SelectItem value="Alta">Alta</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button 
          variant="outline" 
          size="sm"
          onClick={fetchOcorrencias}
          disabled={loading}
          className="bg-background border-border text-foreground hover:bg-hoverCustom gap-2 self-end md:self-auto text-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Tabela de Dados */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-secondary border-b border-border">
            <TableRow className="border-none hover:bg-transparent">
              <TableHead className="text-muted-foreground font-semibold">Data</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Aluno</TableHead>
              {!selectedEscola && (
                <TableHead className="text-muted-foreground font-semibold">Escola</TableHead>
              )}
              <TableHead className="text-muted-foreground font-semibold">Turma</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Tipo / Gravidade</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Descrição</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Registrado por</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Status (Pais)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={selectedEscola ? 7 : 8} className="text-center text-muted-foreground py-8">
                  Carregando ocorrências...
                </TableCell>
              </TableRow>
            ) : filteredOcorrencias.length === 0 ? (
              <TableRow>
                <TableCell colSpan={selectedEscola ? 7 : 8} className="text-center text-muted-foreground py-8">
                  Nenhuma ocorrência disciplinar encontrada.
                </TableCell>
              </TableRow>
            ) : (
              filteredOcorrencias.map((oco) => (
                <TableRow key={oco.id} className="border-b border-border hover:bg-hoverCustom transition-colors">
                  <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                    {oco.data ? new Date(oco.data).toLocaleDateString('pt-BR') : '-'}
                  </TableCell>
                  <TableCell className="text-foreground font-semibold text-xs">
                    {oco.alunos?.nome ?? 'Sem nome'}
                  </TableCell>
                  {!selectedEscola && (
                    <TableCell className="text-muted-foreground text-xs">
                      {oco.escolas?.nome ?? 'Sem escola'}
                    </TableCell>
                  )}
                  <TableCell className="text-muted-foreground text-xs font-normal">
                    {oco.turmas?.nome ?? 'Sem turma'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 items-start">
                      <span className="text-xs font-medium text-foreground">{oco.tipo ?? 'Ocorrência'}</span>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 font-semibold ${getGravidadeColor(oco.gravidade ?? 'Baixa')}`}>
                        {oco.gravidade ?? 'Baixa'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs font-normal max-w-[200px] truncate" title={oco.descricao}>
                    {oco.descricao ?? 'Sem descrição'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs font-normal">
                    {oco.funcionarios?.nome ?? '-'}
                  </TableCell>
                  <TableCell>
                    <span className={`flex items-center gap-1 text-xs font-medium ${getStatusPaisColor(oco.status_pais ?? 'Pendente')}`}>
                      {oco.status_pais === 'Cientes' && <CheckCircle2 className="w-3.5 h-3.5 text-success" />}
                      {oco.status_pais ?? 'Pendente'}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
