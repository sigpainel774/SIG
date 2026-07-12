'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertTriangle, RefreshCw, CheckCircle2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { IconTile } from '@/components/ui/icon-tile'

export default function OcorrenciasPage() {
  const [dataFiltro, setDataFiltro] = useState('')
  const [gravidadeFiltro, setGravidadeFiltro] = useState('todas')
  const [ocorrencias, setOcorrencias] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchOcorrencias = async () => {
    setLoading(true)
    const { data, error } = await (supabase.from as any)('ocorrencias')
      .select('*, alunos(nome), turmas(nome), funcionarios(nome)')
      .order('data', { ascending: false })
    
    if (data) setOcorrencias(data)
    setLoading(false)
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

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-secondary border-b border-border">
            <TableRow className="border-none hover:bg-transparent">
              <TableHead className="text-muted-foreground font-semibold">Data</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Aluno</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Turma</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Tipo / Gravidade</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Descrição</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Registro por</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Status (Pais)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ocorrencias.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Nenhuma ocorrência disciplinar registrada.
                </TableCell>
              </TableRow>
            )}
            {ocorrencias.map((oco) => (
              <TableRow key={oco.id} className="border-b border-border hover:bg-hoverCustom transition-colors">
                <TableCell className="text-muted-foreground text-sm font-normal whitespace-nowrap">{new Date(oco.data).toLocaleDateString('pt-BR')}</TableCell>
                <TableCell className="text-foreground font-semibold text-sm">{oco.alunos?.nome}</TableCell>
                <TableCell className="text-muted-foreground text-sm font-normal">{oco.turmas?.nome}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1 items-start">
                    <span className="text-sm font-medium text-foreground">{oco.tipo}</span>
                    <Badge variant="outline" className={`text-xs font-semibold ${getGravidadeColor(oco.gravidade)}`}>
                      {oco.gravidade}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm font-normal max-w-[250px] truncate" title={oco.descricao}>
                  {oco.descricao}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm font-normal">{oco.funcionarios?.nome || '-'}</TableCell>
                <TableCell>
                  <span className={`flex items-center gap-1.5 text-sm font-medium ${getStatusPaisColor(oco.status_pais)}`}>
                    {oco.status_pais === 'Cientes' && <CheckCircle2 className="w-4 h-4 text-success" />}
                    {oco.status_pais}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
