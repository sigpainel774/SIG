'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { UserCheck, RefreshCw, Eye, ArrowLeftRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'

export default function AdminSolicitacoesPage() {
  const router = useRouter()
  const supabase = createClient()
  const [solicitacoes, setSolicitacoes] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'PENDENTE' | 'ACEITA' | 'REJEITADA' | 'ARQUIVADA'>('PENDENTE')

  const loadSolicitacoes = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('transferencias_alunos')
      .select(`
        *,
        alunos(nome),
        origem:escola_origem_id(nome),
        destino:escola_destino_id(nome),
        solicitante:solicitante_id(nome)
      `)
      .eq('status', activeTab)
      .order('created_at', { ascending: false })

    if (data) setSolicitacoes(data)
    setLoading(false)
  }

  useEffect(() => {
    loadSolicitacoes()
  }, [activeTab])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#3f3f46]">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-purple-500" /> Solicitações & Chamados
          </h2>
          <p className="text-[#aaa] text-sm mt-1">Visão ROOT de todas as transferências e solicitações da rede.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            onClick={loadSolicitacoes}
            disabled={loading}
            className="bg-[#121212] border-[#3f3f46] text-white hover:bg-[#27272a]"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="bg-[#121212] p-1.5 rounded-lg border border-[#3f3f46] inline-flex mb-2">
        {['PENDENTE', 'ACEITA', 'REJEITADA', 'ARQUIVADA'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === tab ? 'bg-[#3f3f46] text-white' : 'text-[#aaa] hover:text-white'}`}
          >
            {tab}s
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-[#3f3f46] bg-[#121212] overflow-hidden">
        <Table>
          <TableHeader className="bg-[#181818] border-b border-[#3f3f46]">
            <TableRow className="border-none hover:bg-transparent">
              <TableHead className="text-[#ccc] font-semibold">Aluno / Motivo</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Trajeto</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Solicitante</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Data</TableHead>
              <TableHead className="text-right text-[#ccc] font-semibold">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {solicitacoes.map((sol) => (
              <TableRow key={sol.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                <TableCell>
                  <div className="font-medium text-white">{sol.alunos?.nome}</div>
                  <div className="text-xs text-[#aaa] max-w-[200px] truncate">{sol.motivo}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-white flex items-center gap-1.5">
                    {sol.origem?.nome || 'N/A'} <ArrowLeftRight className="w-3 h-3 text-[#555]" /> {sol.fora_da_rede ? 'Fora da Rede' : sol.destino?.nome}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-[#aaa]">
                  {sol.solicitante?.nome?.split(' ')[0]}
                </TableCell>
                <TableCell className="text-sm text-[#aaa]">
                  {formatDate(sol.created_at)}
                </TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => router.push(`/admin/solicitacoes/${sol.id}`)}
                    className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                  >
                    <Eye className="w-4 h-4 mr-2" /> Avaliar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {solicitacoes.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-[#aaa]">Nenhuma solicitação {activeTab.toLowerCase()}.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
