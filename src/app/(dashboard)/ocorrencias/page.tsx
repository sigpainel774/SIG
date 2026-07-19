'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { StandardTable } from '@/components/ui/table'
import { AlertTriangle, RefreshCw, CheckCircle2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { IconTile } from '@/components/ui/icon-tile'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

export default function OcorrenciasPage() {
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/home">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <IconTile icon={AlertTriangle} variant="destructive" className="h-10 w-10 shrink-0" /> 
              Gestão de Ocorrências
            </h1>
          </div>
          <p className="text-muted-foreground text-sm font-normal mt-2 ml-14">Monitoramento disciplinar e pedagógico da escola.</p>
        </div>

        <div className="flex items-center gap-3">
          <Input 
            type="date"
            value={dataFiltro}
            onChange={(e) => setDataFiltro(e.target.value)}
            className="bg-background border-border text-foreground w-auto"
          />
          
          <Select value={gravidadeFiltro} onValueChange={(val) => val && setGravidadeFiltro(val)}>
            <SelectTrigger className="w-[180px] bg-background border-border text-foreground">
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
            className="bg-background border-border text-foreground hover:bg-hoverCustom"
            onClick={fetchOcorrencias}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <StandardTable
        data={ocorrencias}
        keyExtractor={(oco) => oco.id}
        loading={loading}
        loadingMessage="Carregando ocorrências..."
        emptyMessage="Nenhuma ocorrência disciplinar registrada."
        columns={[
          {
            header: "Data",
            accessor: (oco) => formatDate(oco.data),
            className: "text-muted-foreground text-sm font-normal whitespace-nowrap",
          },
          {
            header: "Aluno",
            accessor: (oco) => oco.alunos?.nome,
            className: "text-foreground font-semibold text-sm",
          },
          {
            header: "Turma",
            accessor: (oco) => oco.turmas?.nome,
            className: "text-muted-foreground text-sm font-normal",
          },
          {
            header: "Tipo / Gravidade",
            accessor: (oco) => (
              <div className="flex flex-col gap-1 items-start">
                <span className="text-sm font-medium text-foreground">{oco.tipo}</span>
                <Badge variant="outline" className={`text-xs font-semibold ${getGravidadeColor(oco.gravidade)}`}>
                  {oco.gravidade}
                </Badge>
              </div>
            ),
          },
          {
            header: "Descrição",
            accessor: (oco) => oco.descricao,
            className: "text-muted-foreground text-sm font-normal max-w-[250px] truncate",
          },
          {
            header: "Registro por",
            accessor: (oco) => oco.funcionarios?.nome || '-',
            className: "text-muted-foreground text-sm font-normal",
          },
          {
            header: "Status (Pais)",
            accessor: (oco) => (
              <span className={`flex items-center gap-1.5 text-sm font-medium ${getStatusPaisColor(oco.status_pais)}`}>
                {oco.status_pais === 'Cientes' && <CheckCircle2 className="w-4 h-4 text-success" />}
                {oco.status_pais}
              </span>
            ),
          }
        ]}
      />
    </div>
  )
}
