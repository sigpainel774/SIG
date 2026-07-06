'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

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
      case 'Alta': return 'bg-red-500/20 text-red-500 border-red-500/30'
      case 'Média': return 'bg-amber-500/20 text-amber-500 border-amber-500/30'
      case 'Baixa': return 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getStatusPaisColor = (status: string) => {
    switch (status) {
      case 'Cientes': return 'text-emerald-500'
      case 'Reunião Agendada': return 'text-amber-500'
      default: return 'text-[#aaa]'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#3f3f46]">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-[#ff9800]" /> 
            Gestão de Ocorrências
          </h2>
          <p className="text-[#aaa] text-sm mt-1">Monitoramento disciplinar e pedagógico da escola.</p>
        </div>

        <div className="flex items-center gap-3">
          <Input 
            type="date"
            value={dataFiltro}
            onChange={(e) => setDataFiltro(e.target.value)}
            className="bg-[#121212] border-[#3f3f46] text-white w-auto"
          />
          
          <Select value={gravidadeFiltro} onValueChange={(val) => val && setGravidadeFiltro(val)}>
            <SelectTrigger className="w-[180px] bg-[#121212] border-[#3f3f46] text-white">
              <SelectValue placeholder="Gravidade" />
            </SelectTrigger>
            <SelectContent className="bg-[#18181b] border-[#3f3f46] text-white">
              <SelectItem value="todas">Todas as Gravidades</SelectItem>
              <SelectItem value="Baixa">Baixa</SelectItem>
              <SelectItem value="Média">Média</SelectItem>
              <SelectItem value="Alta">Alta</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            variant="outline" 
            className="bg-[#121212] border-[#3f3f46] text-white hover:bg-[#27272a]"
            onClick={fetchOcorrencias}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-[#3f3f46] bg-[#121212] overflow-hidden">
        <Table>
          <TableHeader className="bg-[#181818] border-b border-[#3f3f46]">
            <TableRow className="border-none hover:bg-transparent">
              <TableHead className="text-[#ccc] font-semibold">Data</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Aluno</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Turma</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Tipo / Gravidade</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Descrição</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Registro por</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Status (Pais)</TableHead>
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
              <TableRow key={oco.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a] transition-colors">
                <TableCell className="text-[#aaa] whitespace-nowrap">{new Date(oco.data).toLocaleDateString('pt-BR')}</TableCell>
                <TableCell className="text-white font-medium">{oco.alunos?.nome}</TableCell>
                <TableCell className="text-[#aaa]">{oco.turmas?.nome}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1 items-start">
                    <span className="text-sm text-white">{oco.tipo}</span>
                    <Badge variant="outline" className={`text-xs font-semibold ${getGravidadeColor(oco.gravidade)}`}>
                      {oco.gravidade}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-[#aaa] max-w-[250px] truncate" title={oco.descricao}>
                  {oco.descricao}
                </TableCell>
                <TableCell className="text-[#aaa]">{oco.funcionarios?.nome || '-'}</TableCell>
                <TableCell>
                  <span className={`flex items-center gap-1.5 text-sm font-medium ${getStatusPaisColor(oco.status_pais)}`}>
                    {oco.status_pais === 'Cientes' && <CheckCircle2 className="w-4 h-4" />}
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
