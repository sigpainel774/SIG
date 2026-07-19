'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { UserCheck, RefreshCw, Eye, ArrowLeftRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StandardTable, TableColumn } from '@/components/ui/table'
import { PageHeader } from '@/components/ui/page-header'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

export default function AdminSolicitacoesPage() {
  const router = useRouter()
  const supabase = createClient()
  const [solicitacoes, setSolicitacoes] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'PENDENTE' | 'ACEITA' | 'REJEITADA' | 'ARQUIVADA'>('PENDENTE')

  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const loadSolicitacoes = async () => {
    if (isMounted.current) setLoading(true)
    try {
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

      if (error) throw error

      if (isMounted.current) {
        setSolicitacoes(data || [])
      }
    } catch (err: any) {
      console.error('Erro ao carregar solicitações:', err)
      toast.error('Erro ao carregar chamados: ' + (err.message || 'Erro de conexão'))
      if (isMounted.current) setSolicitacoes([])
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }

  useEffect(() => {
    loadSolicitacoes()
  }, [activeTab])

  const columns: TableColumn<any>[] = [
    {
      header: 'Aluno / Motivo',
      accessor: (sol) => (
        <div className="flex flex-col">
          <span className="font-semibold text-white uppercase">{sol.alunos?.nome ?? 'Aluno não identificado'}</span>
          <span className="text-xs text-[#aaa] max-w-[220px] truncate">{sol.motivo ?? 'Sem motivo registrado'}</span>
        </div>
      )
    },
    {
      header: 'Trajeto',
      accessor: (sol) => (
        <div className="text-sm text-white flex items-center gap-1.5">
          <span>{sol.origem?.nome ?? 'Rede'}</span>
          <ArrowLeftRight className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span>{sol.fora_da_rede ? 'Fora da Rede' : sol.destino?.nome ?? 'Destino não informado'}</span>
        </div>
      )
    },
    {
      header: 'Solicitante',
      accessor: (sol) => sol.solicitante?.nome ?? '-',
      className: 'text-sm text-zinc-400'
    },
    {
      header: 'Data',
      accessor: (sol) => (
        <span className="text-sm text-zinc-400 whitespace-nowrap">
          {formatDate(sol.created_at)}
        </span>
      )
    },
    {
      header: 'Ações',
      headClassName: 'text-right',
      className: 'text-right',
      accessor: (sol) => (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.push(`/admin/solicitacoes/${sol.id}`)}
          className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 gap-1.5"
        >
          <Eye className="w-4 h-4" /> Avaliar
        </Button>
      )
    }
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Solicitações & Chamados"
        description="Visão ROOT de todas as transferências e solicitações da rede."
        icon={UserCheck}
        iconVariant="primary"
        backHref="/admin"
        actions={
          <Button 
            variant="outline"
            onClick={loadSolicitacoes}
            disabled={loading}
            className="bg-[#121212] border-[#3f3f46] text-white hover:bg-[#27272a] h-10"
            title="Recarregar solicitações"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        }
      />

      <div className="bg-[#121212] p-1.5 rounded-lg border border-[#3f3f46] inline-flex mb-2">
        {['PENDENTE', 'ACEITA', 'REJEITADA', 'ARQUIVADA'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-colors ${activeTab === tab ? 'bg-[#3f3f46] text-white' : 'text-[#aaa] hover:text-white'}`}
          >
            {tab}s
          </button>
        ))}
      </div>

      <StandardTable
        data={solicitacoes}
        columns={columns}
        keyExtractor={(sol) => sol.id}
        loading={loading}
        loadingMessage="Carregando solicitações..."
        emptyMessage={`Nenhuma solicitação ${activeTab.toLowerCase()} encontrada.`}
      />
    </div>
  )
}

