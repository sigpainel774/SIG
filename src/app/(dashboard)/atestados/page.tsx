'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { StandardTable } from '@/components/ui/table'
import { PageHeader } from '@/components/ui/page-header'
import { FilePlus, Search, CheckCircle2, Clock, Paperclip } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { ModalAtestado } from '@/components/ModalAtestado'
import { useAuthStore } from '@/store/useAuthStore'
import { toast } from 'sonner'


export default function AtestadosPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [atestados, setAtestados] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const supabase = createClient()
  const { escolaAtivaId } = useAuthStore()

  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const fetchAtestados = async () => {
    if (isMounted.current) setLoading(true)
    try {
      let query = supabase.from('atestados')
        .select('*, funcionarios(nome, cargo, is_superadmin, acessos_usuarios(nivel, ativo))')

      if (escolaAtivaId) {
        query = query.eq('escola_id', escolaAtivaId)
      }

      const { data, error } = await query.order('data_inclusao', { ascending: false })
      
      if (error) throw error

      if (!isMounted.current) return

      if (data) {
        const filtrados = data.filter((item: any) => {
          const f = item.funcionarios
          if (!f) return true
          if (escolaAtivaId) {
            if (f.is_superadmin) return false
            if (f.nome?.toLowerCase() === 'root' || f.email?.toLowerCase().startsWith('root@')) return false
            const acessos = f.acessos_usuarios ?? []
            if (acessos.some((a: any) => a.nivel === 1 && a.ativo)) return false
          }
          return true
        })
        setAtestados(filtrados)
      } else {
        setAtestados([])
      }
    } catch (err: any) {
      console.error('Erro ao carregar atestados:', err)
      toast.error('Erro ao carregar atestados: ' + (err.message || 'Erro de conexão'))
      if (isMounted.current) setAtestados([])
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }

  useEffect(() => {
    fetchAtestados()
  }, [escolaAtivaId])

  const atestadosFiltrados = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return atestados
    return atestados.filter((item) => {
      const nome = (item.funcionarios?.nome ?? '').toLowerCase()
      const cid = (item.cid ?? '').toLowerCase()
      return nome.includes(term) || cid.includes(term)
    })
  }, [atestados, searchTerm])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Atestados Médicos"
        description="Controle de faltas justificadas e afastamentos de saúde."
        icon={FilePlus}
        iconVariant="success"
        backHref="/funcionarios"
        actions={
          <Button 
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2"
            onClick={() => setIsModalOpen(true)}
          >
            <FilePlus className="w-4 h-4" />
            Registrar Atestado
          </Button>
        }
      />

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

      <StandardTable
        data={atestadosFiltrados}
        keyExtractor={(item) => item.id}
        loading={loading}
        loadingMessage="Carregando atestados médicos..."
        emptyMessage="Nenhum atestado registrado."
        columns={[
          {
            header: 'Data',
            accessor: (item: any) => new Date(item.data_inclusao).toLocaleDateString('pt-BR'),
            className: 'text-zinc-400',
          },
          {
            header: 'Servidor',
            accessor: (item: any) => item.funcionarios?.nome,
            className: 'text-white font-medium',
          },
          {
            header: 'Cargo',
            accessor: (item: any) => item.funcionarios?.cargo || '-',
            className: 'text-zinc-400',
          },
          {
            header: 'Dias',
            accessor: (item: any) => `${item.dias_afastamento} dias`,
            className: 'text-white font-bold',
          },
          {
            header: 'CID',
            accessor: (item: any) => (
              <Badge variant="outline" className="bg-[#18181b] text-[#ccc] border-[#3f3f46]">
                {item.cid}
              </Badge>
            ),
          },
          {
            header: 'Anexo',
            accessor: (item: any) => item.anexo_url ? (
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
            ),
            className: 'text-center',
            headClassName: 'text-center',
          },
          {
            header: 'Status',
            accessor: (item: any) => (
              <span className={`flex items-center gap-1.5 text-sm font-medium ${item.status === 'Aprovado' ? 'text-emerald-500' : 'text-amber-500'}`}>
                {item.status === 'Aprovado' ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                {item.status}
              </span>
            ),
          }
        ]}
      />

      <ModalAtestado 
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSuccess={fetchAtestados}
      />
    </div>
  )
}
