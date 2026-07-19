'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { ArchiveRestore, RefreshCw, Undo2, Trash2, Eye, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StandardTable, TableColumn } from '@/components/ui/table'
import { PageHeader } from '@/components/ui/page-header'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { reverterArquivado, excluirDefinitivamenteArquivado } from '@/lib/audit/archive-agent'
import { useAuthStore } from '@/store/useAuthStore'
import { ModalDetalhesArquivado } from '@/components/modals/modal-detalhes-arquivado'
import { useLocalSearch } from '@/hooks/useLocalSearch'

export default function AdminArquivadosPage() {
  const supabase = createClient()
  const { funcionario } = useAuthStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [arquivados, setArquivados] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedArq, setSelectedArq] = useState<any | null>(null)

  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const loadArquivados = async () => {
    if (isMounted.current) setLoading(true)
    try {
      const { data, error } = await supabase
        .from('arquivados')
        .select('*, funcionarios!arquivado_por(nome), revertido_por:funcionarios!revertido_por(nome), excluido_por:funcionarios!excluido_por(nome), escolas(nome)')
        .order('created_at', { ascending: false })

      if (error) throw error

      if (isMounted.current) {
        setArquivados(data || [])
      }
    } catch (err: any) {
      console.error('Erro ao carregar arquivados:', err)
      toast.error('Erro ao buscar registros arquivados: ' + (err.message || 'Erro de conexão'))
      if (isMounted.current) setArquivados([])
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }

  useEffect(() => {
    loadArquivados()
  }, [])

  const arquivadosFiltrados = useLocalSearch(arquivados, searchTerm, (item, term) => {
    const nome = item.snapshot_data?.nome ?? item.nome ?? ''
    const tipo = item.entity ?? ''
    const motivo = item.motivo ?? ''
    const escola = item.escolas?.nome ?? ''

    return [nome, tipo, motivo, escola].some(val =>
      val.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(term)
    )
  })

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
        <Badge variant="outline" className="text-xs font-semibold bg-[#1a1a2e] text-[#3ea6ff] border-[#3ea6ff]/30">
          {arq.entity ?? 'DESCONHECIDO'}
        </Badge>
      )
    },
    {
      header: 'Nome / Identificação',
      accessor: (arq) => (
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-white uppercase">{arq.snapshot_data?.nome ?? arq.nome ?? 'Sem nome'}</span>
          <span className="text-xs text-zinc-400">ID: {arq.original_id ?? arq.id}</span>
        </div>
      )
    },
    {
      header: 'Escola de Origem',
      accessor: (arq) => arq.escolas?.nome ?? 'Rede Municipal',
      className: 'text-zinc-400 text-sm'
    },
    {
      header: 'Motivo',
      accessor: (arq) => arq.motivo ?? '-',
      className: 'text-zinc-400 text-sm max-w-[200px] truncate'
    },
    {
      header: 'Data Arquivamento',
      accessor: (arq) => (
        <span className="text-zinc-400 text-sm whitespace-nowrap">
          {arq.created_at ? new Date(arq.created_at).toLocaleDateString('pt-BR') : '-'}
        </span>
      )
    },
    {
      header: 'Ações',
      headClassName: 'text-right',
      className: 'text-right',
      accessor: (arq) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedArq(arq)}
            className="h-8 w-8 text-sky-400 hover:bg-sky-400/10"
            title="Inspecionar snapshot"
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleReverter(arq)}
            className="h-8 w-8 text-emerald-400 hover:bg-emerald-400/10"
            title="Reverter e restaurar"
          >
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handlePurge(arq)}
            className="h-8 w-8 text-rose-500 hover:bg-rose-500/10"
            title="Excluir definitivamente (Purge)"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Registros Arquivados"
        description="Gerencie alunos fora da rede ou registros concluídos."
        icon={ArchiveRestore}
        iconVariant="primary"
        backHref="/admin"
        actions={
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, tipo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-[220px] bg-[#121212] border-[#3f3f46] text-white text-xs h-10"
              />
            </div>

            <Button 
              variant="outline"
              onClick={loadArquivados}
              disabled={loading}
              className="bg-[#121212] border-[#3f3f46] text-white hover:bg-[#27272a] h-10"
              title="Recarregar arquivados"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        }
      />

      <StandardTable
        data={arquivadosFiltrados}
        columns={columns}
        keyExtractor={(arq) => arq.id}
        loading={loading}
        loadingMessage="Carregando registros arquivados..."
        emptyMessage="Nenhum registro arquivado encontrado."
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
