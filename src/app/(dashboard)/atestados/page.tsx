'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FilePlus, Search, CheckCircle2, Clock, Paperclip, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { ModalAtestado } from '@/components/ModalAtestado'

export default function AtestadosPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [atestados, setAtestados] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const supabase = createClient()

  const fetchAtestados = async () => {
    setLoading(true)
    const { data, error } = await (supabase.from as any)('atestados')
      .select('*, funcionarios(nome, cargo)')
      .order('data_inclusao', { ascending: false })
    
    if (data) setAtestados(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchAtestados()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#3f3f46]">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/home">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <FilePlus className="w-6 h-6 text-emerald-500" /> 
              Atestados Médicos
            </h2>
          </div>
          <p className="text-[#aaa] text-sm mt-1">Controle de faltas justificadas e afastamentos de saúde.</p>
        </div>
        
        <Button 
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2"
          onClick={() => setIsModalOpen(true)}
        >
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
              <TableHead className="text-[#ccc] font-semibold">Anexo</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {atestados.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Nenhum atestado registrado.
                </TableCell>
              </TableRow>
            )}
            {atestados.map((item) => (
              <TableRow key={item.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                <TableCell className="text-[#aaa]">{new Date(item.data_inclusao).toLocaleDateString('pt-BR')}</TableCell>
                <TableCell className="text-white font-medium">{item.funcionarios?.nome}</TableCell>
                <TableCell className="text-[#aaa]">{item.funcionarios?.cargo || '-'}</TableCell>
                <TableCell className="text-white font-bold">{item.dias_afastamento} dias</TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-[#18181b] text-[#ccc] border-[#3f3f46]">
                    {item.cid}
                  </Badge>
                </TableCell>
                <TableCell>
                  {item.anexo_url ? (
                    <a 
                      href={item.anexo_url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="flex items-center justify-center w-8 h-8 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                      title={item.anexo_nome || 'Ver Anexo'}
                    >
                      <Paperclip className="w-4 h-4" />
                    </a>
                  ) : (
                    <span className="text-[#555]">-</span>
                  )}
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

      <ModalAtestado 
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSuccess={fetchAtestados}
      />
    </div>
  )
}
