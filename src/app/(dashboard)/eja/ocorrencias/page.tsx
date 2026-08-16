'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { StandardTable } from '@/components/ui/table'
import { PageHeader } from '@/components/ui/page-header'
import { AlertTriangle, RefreshCw, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { useLocalSearch } from '@/hooks/useLocalSearch'
import { useSchoolStore } from '@/store/useSchoolStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useEjaGuard } from '@/hooks/useEjaGuard'

export default function EjaOcorrenciasPage() {
  const { authorized } = useEjaGuard()
  const [searchTerm, setSearchTerm] = useState('')
  const [dataFiltro, setDataFiltro] = useState('')
  const [gravidadeFiltro, setGravidadeFiltro] = useState('todas')
  const [ocorrencias, setOcorrencias] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const { selectedEscola } = useSchoolStore()
  const { escolaAtivaId } = useAuthStore()

  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const fetchOcorrencias = async () => {
    const targetEscolaId = escolaAtivaId || selectedEscola?.id
    if (!targetEscolaId) {
      setOcorrencias([])
      setLoading(false)
      return
    }

    if (isMounted.current) setLoading(true)
    try {
      const { data, error } = await (supabase.from as any)('ocorrencias')
        .select('id, aluno_id, turma_id, escola_id, tipo, gravidade, descricao, status_pais, data, registrado_por, created_at, alunos(nome), turmas(nome), funcionarios(nome)')
        .eq('escola_id', targetEscolaId)
        .order('data', { ascending: false })
      
      if (error) throw error

      if (isMounted.current) {
        // Filtra ocorrências cujas turmas sejam EJA
        const filtradasEja = (data || []).filter((item: any) => {
          const turmaNome = (item.turmas?.nome || '').toUpperCase()
          return turmaNome.includes('EJA')
        })
        setOcorrencias(filtradasEja)
      }
    } catch (err: any) {
      console.error('Erro ao carregar ocorrências EJA:', err)
      toast.error('Erro ao carregar ocorrências: ' + (err.message || 'Erro de conexão'))
      if (isMounted.current) setOcorrencias([])
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }

  useEffect(() => {
    if (authorized) {
      fetchOcorrencias()
    }
  }, [escolaAtivaId, selectedEscola?.id, authorized])

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

  if (authorized === false) return null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ocorrências - EJA"
        description="Monitoramento disciplinar e pedagógico dos estudantes da Educação de Jovens e Adultos."
        icon={AlertTriangle}
        iconVariant="purple"
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
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        }
      />

      <StandardTable
        data={ocorrenciasFiltradas}
        isLoading={loading}
        columns={[
          {
            header: 'Data',
            accessor: (item) => (
              <span className="font-mono text-xs">
                {formatDate(item.data)}
              </span>
            ),
            className: 'w-[100px]',
          },
          {
            header: 'Aluno(a)',
            accessor: (item) => (
              <div className="flex flex-col">
                <span className="font-semibold text-foreground">{item.alunos?.nome ?? 'Sem nome'}</span>
                <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">Turma: {item.turmas?.nome ?? 'Sem turma'}</span>
              </div>
            ),
          },
          {
            header: 'Tipo de Ocorrência',
            accessor: (item) => (
              <span className="text-muted-foreground">{item.tipo ?? 'Não especificado'}</span>
            ),
          },
          {
            header: 'Gravidade',
            accessor: (item) => (
              <Badge className={`${getGravidadeColor(item.gravidade)} text-xs border font-medium`}>
                {item.gravidade ?? 'Baixa'}
              </Badge>
            ),
            className: 'w-[110px]',
          },
          {
            header: 'Status Pais',
            accessor: (item) => (
              <span className={`text-xs font-medium ${getStatusPaisColor(item.status_pais)}`}>
                {item.status_pais ?? 'Pendente'}
              </span>
            ),
            className: 'w-[120px]',
          },
          {
            header: 'Registrado Por',
            accessor: (item) => (
              <span className="text-xs text-muted-foreground">{item.funcionarios?.nome ?? 'Sistema'}</span>
            ),
          },
          {
            header: 'Descrição',
            accessor: (item) => (
              <p className="text-xs text-muted-foreground line-clamp-2 max-w-xs">{item.descricao}</p>
            ),
          },
        ]}
        emptyMessage="Nenhuma ocorrência da modalidade EJA encontrada."
      />
    </div>
  )
}
