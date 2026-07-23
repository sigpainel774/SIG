'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { StandardTable } from '@/components/ui/table'
import { PageHeader } from '@/components/ui/page-header'
import { AlertTriangle, RefreshCw, CheckCircle2, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { useLocalSearch } from '@/hooks/useLocalSearch'

export default function OcorrenciasPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [dataFiltro, setDataFiltro] = useState('')
  const [gravidadeFiltro, setGravidadeFiltro] = useState('todas')
  const [ocorrencias, setOcorrencias] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const fetchOcorrencias = async () => {
    if (isMounted.current) setLoading(true)
    try {
      const { data, error } = await (supabase.from as any)('ocorrencias')
        .select('*, alunos(nome), turmas(nome), funcionarios(nome)')
        .order('data', { ascending: false })
      
      if (error) throw error

      if (isMounted.current) {
        setOcorrencias(data || [])
      }
    } catch (err: any) {
      console.error('Erro ao carregar ocorrências:', err)
      toast.error('Erro ao carregar ocorrências: ' + (err.message || 'Erro de conexão'))
      if (isMounted.current) setOcorrencias([])
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }

  useEffect(() => {
    fetchOcorrencias()
  }, [])

  // 1. Aplica busca com acentuação e busca insensível a caixa alta/baixa
  const ocorrenciasBuscadas = useLocalSearch(ocorrencias, searchTerm, (item, term) => {
    const alunoNome = item.alunos?.nome ?? ''
    const turmaNome = item.turmas?.nome ?? ''
    const funcNome = item.funcionarios?.nome ?? ''
    const tipo = item.tipo ?? ''
    const descricao = item.descricao ?? ''

    return [alunoNome, turmaNome, funcNome, tipo, descricao].some(val => 
      val.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(term)
    )
  })

  // 2. Aplica filtros secundários de data e gravidade de forma resiliente
  const ocorrenciasFiltradas = useMemo(() => {
    return ocorrenciasBuscadas.filter((item) => {
      if (dataFiltro && item.data !== dataFiltro) return false
      if (gravidadeFiltro !== 'todas' && item.gravidade !== gravidadeFiltro) return false
      return true
    })
  }, [ocorrenciasBuscadas, dataFiltro, gravidadeFiltro])

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestão de Ocorrências"
        description="Monitoramento disciplinar e pedagógico da escola."
        icon={AlertTriangle}
        iconVariant="destructive"
        backHref="/home"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por aluno, tipo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-[200px] bg-background border-border text-foreground text-xs h-10"
              />
            </div>

            <Input 
              type="date"
              value={dataFiltro}
              onChange={(e) => setDataFiltro(e.target.value)}
              className="bg-background border-border text-foreground w-auto text-xs h-10"
            />
            
            <Select value={gravidadeFiltro} onValueChange={(val) => val && setGravidadeFiltro(val)}>
              <SelectTrigger className="w-[160px] bg-background border-border text-foreground text-xs h-10">
                <SelectValue placeholder="Gravidade" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-foreground">
                <SelectItem value="todas">Todas as Gravidades</SelectItem>
                <SelectItem value="Baixa">Baixa</SelectItem>
                <SelectItem value="Média">Média</SelectItem>
                <SelectItem value="Alta">Alta</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              className="bg-background border-border text-foreground hover:bg-accent hover:text-accent-foreground h-10"
              onClick={fetchOcorrencias}
              disabled={loading}
              title="Recarregar ocorrências"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        }
      />

      <StandardTable
        data={ocorrenciasFiltradas}
        keyExtractor={(oco) => oco.id}
        loading={loading}
        loadingMessage="Carregando ocorrências..."
        emptyMessage="Nenhuma ocorrência disciplinar encontrada com os filtros selecionados."
        columns={[
          {
            header: "Data",
            accessor: (oco) => formatDate(oco.data),
            className: "text-muted-foreground text-sm font-normal whitespace-nowrap",
          },
          {
            header: "Aluno",
            accessor: (oco) => oco.alunos?.nome ?? 'Sem nome',
            className: "text-foreground font-semibold text-sm",
          },
          {
            header: "Turma",
            accessor: (oco) => oco.turmas?.nome ?? 'Sem turma',
            className: "text-muted-foreground text-sm font-normal",
          },
          {
            header: "Tipo / Gravidade",
            accessor: (oco) => (
              <div className="flex flex-col gap-1 items-start">
                <span className="text-sm font-medium text-foreground">{oco.tipo ?? '-'}</span>
                <Badge variant="outline" className={`text-xs font-semibold ${getGravidadeColor(oco.gravidade)}`}>
                  {oco.gravidade ?? 'Não informada'}
                </Badge>
              </div>
            ),
          },
          {
            header: "Descrição",
            accessor: (oco) => oco.descricao ?? '-',
            className: "text-muted-foreground text-sm font-normal max-w-[250px] truncate",
          },
          {
            header: "Registro por",
            accessor: (oco) => oco.funcionarios?.nome ?? '-',
            className: "text-muted-foreground text-sm font-normal",
          },
          {
            header: "Status (Pais)",
            accessor: (oco) => (
              <span className={`flex items-center gap-1.5 text-sm font-medium ${getStatusPaisColor(oco.status_pais)}`}>
                {oco.status_pais === 'Cientes' && <CheckCircle2 className="w-4 h-4 text-success" />}
                {oco.status_pais ?? 'Não notificado'}
              </span>
            ),
          }
        ]}
      />
    </div>
  )
}

