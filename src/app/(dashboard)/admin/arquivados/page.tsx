'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { ArchiveRestore, RefreshCw, Undo2, Trash2, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StandardTable, TableColumn } from '@/components/ui/table'
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

  const columns: TableColumn<any>[] = [
    {
      header: 'Tipo',
      accessor: (arq) => (
        <Badge variant="outline" className="text-xs bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
          {arq.tipo}
        </Badge>
      ),
      className: 'w-24'
    },
    {
      header: 'Dados Arquivados',
      accessor: (arq) => (
        <>
          <div className="font-medium text-white">{arq.payload_completo?.nome || 'Registro sem nome'}</div>
          <div className="text-xs text-[#aaa]">Origem: {arq.escolas?.nome || 'N/A'}</div>
        </>
      )
    },
    {
      header: 'Motivo / Status',
      accessor: (arq) => (
        <>
          <div className="text-sm text-white">{arq.motivo}</div>
          <Badge variant="outline" className={`text-[10px] mt-1 ${
            arq.status === 'ARQUIVADO' ? 'bg-amber-500/20 text-amber-500 border-amber-500/30' :
            arq.status === 'REVERTIDO' ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' :
            'bg-rose-500/20 text-rose-500 border-rose-500/30'
          }`}>
            {arq.status}
          </Badge>
        </>
      )
    },
    {
      header: 'Data',
      accessor: (arq) => (
        <>
          <div className="text-sm text-[#aaa]">
            {new Date(arq.created_at).toLocaleDateString('pt-BR')}
          </div>
          <div className="text-xs text-[#777]">
            por {arq.funcionarios?.nome?.split(' ')[0]}
          </div>
        </>
      )
    },
    {
      header: 'Ações',
      accessor: (arq) => (
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
      ),
      className: 'text-right'
    }
  ]

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

      <StandardTable
        data={arquivados}
        columns={columns}
        keyExtractor={(arq) => arq.id}
        loading={loading}
        emptyMessage="Nenhum registro arquivado."
      />

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
