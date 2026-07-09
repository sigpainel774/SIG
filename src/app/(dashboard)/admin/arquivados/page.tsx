'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { ArchiveRestore, RefreshCw, Undo2, Trash2, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { reverterArquivado, excluirDefinitivamenteArquivado } from '@/lib/audit/archive-agent'
import { useAuthStore } from '@/store/useAuthStore'
import { ModalDetalhesArquivado } from '@/components/modals/modal-detalhes-arquivado'

export default function AdminArquivadosPage() {
  const supabase = createClient()
  const { funcionario } = useAuthStore()
  const [arquivados, setArquivados] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedArq, setSelectedArq] = useState<any | null>(null)

  const loadArquivados = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('arquivados')
      .select('*, funcionarios!arquivado_por(nome), revertido_por:funcionarios!revertido_por(nome), excluido_por:funcionarios!excluido_por(nome), escolas(nome)')
      .order('created_at', { ascending: false })

    if (data) setArquivados(data)
    setLoading(false)
  }

  useEffect(() => {
    loadArquivados()
  }, [])

  const handleReverter = async (arq: any) => {
    if (!funcionario) return
    const confirm = window.confirm('Deseja realmente reverter este arquivamento e restaurar os dados originais?')
    if (!confirm) return

    setLoading(true)
    // Usar supabaseAdmin normalmente requer backend (Route Handler).
    // Como estamos no cliente, chamamos o reverterArquivado que usará o client logado,
    // garantindo que ele tenha permissões ou chamando uma API real.
    // Para fins do design da interface (agente), passamos o cliente Supabase do frontend.
    const res = await reverterArquivado({
      supabaseAdmin: supabase, 
      arquivadoId: arq.id,
      revertidoPor: { id: funcionario.id, name: funcionario.nome, email: funcionario.email }
    })

    if (res.success) {
      toast.success('Registro revertido com sucesso!')
      loadArquivados()
    } else {
      toast.error('Erro ao reverter arquivamento')
    }
    setLoading(false)
  }

  const handlePurge = async (arq: any) => {
    if (!funcionario) return
    const confirm = window.confirm('ATENÇÃO: Deseja EXCLUIR DEFINITIVAMENTE este registro? Esta ação é irreversível.')
    if (!confirm) return

    setLoading(true)
    const res = await excluirDefinitivamenteArquivado({
      supabaseAdmin: supabase,
      arquivadoId: arq.id,
      excluidoPor: { id: funcionario.id, name: funcionario.nome, email: funcionario.email }
    })

    if (res.success) {
      toast.success('Registro excluído definitivamente!')
      loadArquivados()
    } else {
      toast.error('Erro ao expurgar registro')
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#3f3f46]">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <ArchiveRestore className="w-6 h-6 text-indigo-500" /> Registros Arquivados
          </h2>
          <p className="text-[#aaa] text-sm mt-1">Gerencie alunos fora da rede ou registros concluídos.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            onClick={loadArquivados}
            disabled={loading}
            className="bg-[#121212] border-[#3f3f46] text-white hover:bg-[#27272a]"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-[#3f3f46] bg-[#121212] overflow-hidden">
        <Table>
          <TableHeader className="bg-[#181818] border-b border-[#3f3f46]">
            <TableRow className="border-none hover:bg-transparent">
              <TableHead className="text-[#ccc] font-semibold">Tipo</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Dados Arquivados</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Motivo / Status</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Data</TableHead>
              <TableHead className="text-right text-[#ccc] font-semibold">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {arquivados.map((arq) => (
              <TableRow key={arq.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                <TableCell>
                  <Badge variant="outline" className="text-xs bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
                    {arq.tipo}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="font-medium text-white">{arq.payload_completo?.nome || 'Registro sem nome'}</div>
                  <div className="text-xs text-[#aaa]">Origem: {arq.escolas?.nome || 'N/A'}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-white">{arq.motivo}</div>
                  <Badge variant="outline" className={`text-[10px] mt-1 ${
                    arq.status === 'ARQUIVADO' ? 'bg-amber-500/20 text-amber-500 border-amber-500/30' :
                    arq.status === 'REVERTIDO' ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' :
                    'bg-rose-500/20 text-rose-500 border-rose-500/30'
                  }`}>
                    {arq.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-[#aaa]">
                    {new Date(arq.created_at).toLocaleDateString('pt-BR')}
                  </div>
                  <div className="text-xs text-[#777]">
                    por {arq.funcionarios?.nome?.split(' ')[0]}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSelectedArq(arq)} 
                      className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10" 
                      title="Ver Detalhes"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    {arq.status === 'ARQUIVADO' && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => handleReverter(arq)} className="text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10" title="Reverter">
                          <Undo2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handlePurge(arq)} className="text-rose-500 hover:text-rose-400 hover:bg-rose-500/10" title="Excluir Definitivamente">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {arquivados.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-[#aaa]">Nenhum registro arquivado.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {selectedArq && (
        <ModalDetalhesArquivado
          open={!!selectedArq}
          onOpenChange={(open) => !open && setSelectedArq(null)}
          arquivado={selectedArq}
        />
      )}
    </div>
  )
}
