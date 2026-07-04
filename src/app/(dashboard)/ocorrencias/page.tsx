'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const mockOcorrencias = [
  {
    id: 1,
    data: '15/10/2026',
    aluno: 'João Pedro Silva',
    turma: '9º Ano A',
    gravidade: 'Média',
    tipo: 'Indisciplina',
    descricao: 'Uso de celular durante a explicação do professor, ignorando advertências.',
    registroPor: 'Prof. Marcos',
    statusPais: 'Cientes',
  },
  {
    id: 2,
    data: '14/10/2026',
    aluno: 'Maria Eduarda',
    turma: '7º Ano B',
    gravidade: 'Baixa',
    tipo: 'Atraso',
    descricao: 'Chegou 20 minutos atrasada para a primeira aula.',
    registroPor: 'Portaria',
    statusPais: 'Pendente',
  },
  {
    id: 3,
    data: '10/10/2026',
    aluno: 'Carlos Eduardo',
    turma: '8º Ano C',
    gravidade: 'Alta',
    tipo: 'Briga',
    descricao: 'Envolvimento em discussão agressiva no pátio durante o intervalo.',
    registroPor: 'Coordenação',
    statusPais: 'Reunião Agendada',
  }
]

export default function OcorrenciasPage() {
  const [dataFiltro, setDataFiltro] = useState('')
  const [gravidadeFiltro, setGravidadeFiltro] = useState('todas')

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

          <Button variant="outline" className="bg-[#121212] border-[#3f3f46] text-white hover:bg-[#27272a]">
            <RefreshCw className="w-4 h-4" />
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
            {mockOcorrencias.map((oco) => (
              <TableRow key={oco.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a] transition-colors">
                <TableCell className="text-[#aaa] whitespace-nowrap">{oco.data}</TableCell>
                <TableCell className="text-white font-medium">{oco.aluno}</TableCell>
                <TableCell className="text-[#aaa]">{oco.turma}</TableCell>
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
                <TableCell className="text-[#aaa]">{oco.registroPor}</TableCell>
                <TableCell>
                  <span className={`flex items-center gap-1.5 text-sm font-medium ${getStatusPaisColor(oco.statusPais)}`}>
                    {oco.statusPais === 'Cientes' && <CheckCircle2 className="w-4 h-4" />}
                    {oco.statusPais}
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
