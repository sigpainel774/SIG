'use client'

import { useState, useEffect } from 'react'
import { useSchoolStore } from '@/store/useSchoolStore'
import { StandardTable, TableColumn } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  UserPlus, 
  Search, 
  RefreshCw, 
  Key, 
  Edit, 
  ShieldAlert, 
  GraduationCap, 
  Phone, 
  Mail,
  CheckCircle2,
  Clock
} from 'lucide-react'
import { toast } from 'sonner'
import dynamic from 'next/dynamic'

const ModalCadastroResponsavel = dynamic(
  () => import('@/components/modals/modal-cadastro-responsavel').then(m => m.ModalCadastroResponsavel),
  { ssr: false }
)

export default function GestaoResponsaveisPage() {
  const { selectedEscola } = useSchoolStore()

  const [responsaveis, setResponsaveis] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')

  const [modalCadastroOpen, setModalCadastroOpen] = useState(false)
  const [responsavelEmEdicao, setResponsavelEmEdicao] = useState<any | null>(null)

  const carregarResponsaveis = async () => {
    if (!selectedEscola?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/responsaveis?escola_id=${selectedEscola.id}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erro ao buscar responsáveis')
      setResponsaveis(json.responsaveis || [])
    } catch (err: any) {
      console.error('Erro ao carregar lista de responsáveis:', err)
      toast.error('Erro ao carregar responsáveis da escola.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarResponsaveis()
  }, [selectedEscola?.id])

  // Guarda de segurança (ES-10): Se a escola ativa estiver com o portal desativado
  if (selectedEscola && !selectedEscola.portal_pais_ativo) {
    return (
      <div className="space-y-6">
        <div className="p-8 text-center bg-[#141416] border border-[#27272a] rounded-2xl max-w-xl mx-auto my-12 space-y-4">
          <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-foreground">Portal dos Pais Desativado nesta Escola</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              O acesso ao Portal dos Pais está atualmente desabilitado para a escola <strong>{selectedEscola.nome}</strong>.
            </p>
          </div>
          <p className="text-xs text-zinc-500">
            Para gerenciar e criar contas de responsáveis para esta unidade, ative o recurso no Super Painel em <strong>Escolas &gt; Gerenciar Portal</strong>.
          </p>
        </div>
      </div>
    )
  }

  const responsaveisFiltrados = responsaveis.filter((r) => {
    const termo = busca.toLowerCase()
    const matchNome = r.nome.toLowerCase().includes(termo)
    const matchCpf = r.cpf.includes(termo)
    const matchEmail = r.email.toLowerCase().includes(termo)
    const matchFilhos = (r.alunos || []).some((a: any) => a.nome.toLowerCase().includes(termo))
    return matchNome || matchCpf || matchEmail || matchFilhos
  })

  // Estatísticas rápidas
  const totalPais = responsaveis.length
  const totalAlunosVinculados = responsaveis.reduce((acc, r) => acc + (r.alunos?.length || 0), 0)
  const pendentesTroca = responsaveis.filter((r) => r.must_change_password).length

  const columns: TableColumn<any>[] = [
    {
      header: 'Responsável',
      accessor: (r) => (
        <div className="space-y-0.5">
          <span className="font-semibold text-foreground block">{r.nome}</span>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="font-mono">CPF: {r.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</span>
            {r.telefone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3" /> {r.telefone}
              </span>
            )}
          </div>
        </div>
      )
    },
    {
      header: 'E-mail de Login',
      accessor: (r) => (
        <div className="flex items-center gap-1.5 text-xs text-zinc-300">
          <Mail className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          <span className="font-mono">{r.email}</span>
        </div>
      )
    },
    {
      header: 'Dependentes Vinculados',
      accessor: (r) => (
        <div className="flex flex-wrap gap-1.5">
          {(r.alunos || []).length === 0 ? (
            <span className="text-xs text-zinc-500 italic">Nenhum vinculado</span>
          ) : (
            r.alunos.map((a: any) => (
              <Badge
                key={a.id}
                variant="outline"
                className="text-xs bg-indigo-500/10 text-indigo-300 border-indigo-500/30 flex items-center gap-1"
              >
                <GraduationCap className="w-3 h-3 text-indigo-400" />
                {a.nome} <span className="text-[10px] text-zinc-400">({a.turma_nome})</span>
              </Badge>
            ))
          )}
        </div>
      )
    },
    {
      header: 'Status de Acesso',
      accessor: (r) => (
        <div className="flex items-center gap-2">
          {r.must_change_password ? (
            <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-400 border-amber-500/30 flex items-center gap-1">
              <Clock className="w-3 h-3" /> 1º Acesso Pendente
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Ativo
            </Badge>
          )}
        </div>
      )
    },
    {
      header: 'Ações',
      headClassName: 'text-right w-28',
      className: 'text-right',
      accessor: (r) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setResponsavelEmEdicao(r)
              setModalCadastroOpen(true)
            }}
            className="text-sky-400 hover:text-sky-300 hover:bg-sky-500/10"
            title="Editar dados e redefinir senha provisória"
          >
            <Edit className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#27272a]">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
            <Users className="w-6 h-6 text-indigo-400" />
            Portal dos Pais — Gestão de Responsáveis
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Unidade Escolar: <span className="text-foreground font-semibold">{selectedEscola?.nome || 'Todas as Escolas'}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={carregarResponsaveis}
            disabled={loading}
            className="border-[#3f3f46] text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button
            onClick={() => {
              setResponsavelEmEdicao(null)
              setModalCadastroOpen(true)
            }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2 font-semibold shadow-lg shadow-indigo-600/20"
          >
            <UserPlus className="w-4 h-4" />
            Novo Responsável
          </Button>
        </div>
      </div>

      {/* Cards de Métricas Rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#141416] border border-[#27272a] rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider block">Responsáveis Cadastrados</span>
            <span className="text-2xl font-bold text-foreground mt-1 block">{totalPais}</span>
          </div>
          <div className="w-10 h-10 bg-indigo-500/10 text-indigo-400 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#141416] border border-[#27272a] rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider block">Alunos Vinculados</span>
            <span className="text-2xl font-bold text-indigo-400 mt-1 block">{totalAlunosVinculados}</span>
          </div>
          <div className="w-10 h-10 bg-sky-500/10 text-sky-400 rounded-lg flex items-center justify-center">
            <GraduationCap className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#141416] border border-[#27272a] rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider block">Aguardando 1º Acesso</span>
            <span className="text-2xl font-bold text-amber-400 mt-1 block">{pendentesTroca}</span>
          </div>
          <div className="w-10 h-10 bg-amber-500/10 text-amber-400 rounded-lg flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Barra de Filtro */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome do responsável, CPF, e-mail ou nome do aluno..."
            className="pl-9 bg-[#141416] border-[#27272a]"
          />
        </div>
      </div>

      {/* Tabela de Responsáveis */}
      <StandardTable
        data={responsaveisFiltrados}
        columns={columns}
        keyExtractor={(r) => r.id}
        loading={loading}
        loadingMessage="Carregando responsáveis da escola..."
        emptyMessage="Nenhum responsável cadastrado nesta unidade escolar. Clique em 'Novo Responsável' para criar o primeiro acesso."
        className="border-[#27272a]"
      />

      {/* Modal de Cadastro / Edição */}
      {modalCadastroOpen && selectedEscola?.id && (
        <ModalCadastroResponsavel
          open={modalCadastroOpen}
          onClose={() => {
            setModalCadastroOpen(false)
            setResponsavelEmEdicao(null)
          }}
          onSuccess={carregarResponsaveis}
          escolaId={selectedEscola.id}
          responsavelEmEdicao={responsavelEmEdicao}
        />
      )}
    </div>
  )
}
