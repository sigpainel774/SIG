'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FilePlus, Search, CheckCircle2, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const mockAtestados = [
  { id: 1, servidor: 'Maria Souza', cargo: 'Merendeira', dataInclusao: '15/10/2026', diasAfasta: 3, cid: 'J00 - Resfriado comum', status: 'Aprovado' },
  { id: 2, servidor: 'Carlos Silva', cargo: 'Vigia', dataInclusao: '14/10/2026', diasAfasta: 1, cid: 'M54 - Dorsalgia', status: 'Em Análise' },
]

export default function AtestadosPage() {
  const [searchTerm, setSearchTerm] = useState('')

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#3f3f46]">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <FilePlus className="w-6 h-6 text-emerald-500" /> 
            Atestados Médicos
          </h2>
          <p className="text-[#aaa] text-sm mt-1">Controle de faltas justificadas e afastamentos de saúde.</p>
        </div>
        
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2">
          <FilePlus className="w-4 h-4" />
          Registrar Atestado
        </Button>
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#aaa]" />
          <Input
            type="search"
            placeholder="Buscar por servidor ou CID..."
            className="pl-8 bg-[#121212] border-[#3f3f46] text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-xl border border-[#3f3f46] bg-[#121212] overflow-hidden">
        <Table>
          <TableHeader className="bg-[#181818] border-b border-[#3f3f46]">
            <TableRow className="border-none hover:bg-transparent">
              <TableHead className="text-[#ccc] font-semibold">Data</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Servidor</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Cargo</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Dias</TableHead>
              <TableHead className="text-[#ccc] font-semibold">CID</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockAtestados.map((item) => (
              <TableRow key={item.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                <TableCell className="text-[#aaa]">{item.dataInclusao}</TableCell>
                <TableCell className="text-white font-medium">{item.servidor}</TableCell>
                <TableCell className="text-[#aaa]">{item.cargo}</TableCell>
                <TableCell className="text-white font-bold">{item.diasAfasta} dias</TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-[#18181b] text-[#ccc] border-[#3f3f46]">
                    {item.cid}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className={`flex items-center gap-1.5 text-sm font-medium ${item.status === 'Aprovado' ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {item.status === 'Aprovado' ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    {item.status}
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
