'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { toast } from 'sonner'
import { useLocalSearch } from '@/hooks/useLocalSearch'
import { executeWithToast } from '@/lib/action-handler'

export interface Aluno {
  id: string
  nome: string
  cpf?: string | null
  inep?: string | null
  telefone?: string | null
  data_nascimento?: string | null
  rg?: string | null
  nis?: string | null
  cartao_sus?: string | null
  certidao_nascimento?: string | null
  nome_mae?: string | null
  nome_pai?: string | null
  endereco?: string | null
  latitude?: number | null
  longitude?: number | null
  serie?: string | null
  escola_id?: string | null
  escola_nome?: string
  foto_url?: string | null
  historico?: string | null
  dados_matricula?: Record<string, any>
  numero_matricula?: string | null
  created_at: string
}

export interface SolicitacaoLiberacao {
  id: string
  justificativa?: string | null
  alunos?: {
    nome: string
    escola_id?: string
    escolas?: { nome: string } | null
  } | null
  solicitante?: { nome: string } | null
}

export interface UseAlunosOptions {
  onlyEja?: boolean
}

export function useAlunos(options?: UseAlunosOptions) {
  const {
    funcionario,
    escolaAtivaId,
    vinculos,
    acessos,
    isAdminGlobalOrRoot,
    isCoordenador: checkCoordenador,
    isContaEja,
  } = useAuthStore()

  const ejaMode = options?.onlyEja === true || isContaEja()

  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [totalCount, setTotalCount] = useState(0)

  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoLiberacao[]>([])
  const [carregandoSolicitacoes, setCarregandoSolicitacoes] = useState(false)

  const isMounted = useRef(true)
  useEffect(() => {
    isMounted.current = true
    return () => { isMounted.current = false }
  }, [])

  // ES-6: Resetar a página para 1 sempre que o termo de busca ou escola mudar
  useEffect(() => {
    setPage(1)
  }, [searchTerm, escolaAtivaId])

  /* ── Carregar Alunos (Paginação e Filtros no Servidor) ──────── */
  const carregarAlunos = useCallback(async () => {
    const supabase = createClient()
    if (isMounted.current) setLoading(true)

    try {
      const isAdmin = isAdminGlobalOrRoot()
      const isDiretor = acessos.some((a) => a.nivel === 2 && a.ativo)
      const isSecretario =
        acessos.some((a) => a.nivel === 3 && a.ativo) && !checkCoordenador()

      let targetEscolaId = escolaAtivaId
      if (!isAdmin && !targetEscolaId) {
        targetEscolaId =
          acessos.find((a) => a.escola_id && a.ativo)?.escola_id ||
          vinculos.find((v) => v.escola_id && v.ativo)?.escola_id ||
          null
      }

      let query = supabase
        .from('alunos')
        .select('*, escolas(nome), turmas(nome)', { count: 'exact' })
        .is('deleted_at', null)

      if (targetEscolaId) {
        if (isAdmin || isDiretor || isSecretario || ejaMode) {
          query = query.eq('escola_id', targetEscolaId)
        } else {
          // Professor ou Coordenador: só vê alunos das suas turmas
          if (!funcionario?.id) {
            if (isMounted.current) {
              setAlunos([])
              setTotalCount(0)
              setLoading(false)
            }
            return
          }

          const { data: vTurmas } = await supabase
            .from('vinculos_turmas')
            .select('turma_id')
            .eq('funcionario_id', funcionario.id)
            .eq('escola_id', targetEscolaId)

          const ids = (vTurmas ?? []).map((vt: any) => vt.turma_id)
          if (ids.length > 0) {
            query = query
              .eq('escola_id', targetEscolaId)
              .in('turma_id', ids) as typeof query
          } else {
            if (isMounted.current) {
              setAlunos([])
              setTotalCount(0)
              setLoading(false)
            }
            return
          }
        }
      }

      // ES-4: Sanitização de caracteres especiais antes de passar ao PostgREST
      const termLimpo = searchTerm.trim().replace(/[%_\(\)]/g, '')
      if (termLimpo) {
        const tokens = termLimpo.split(/\s+/).filter(Boolean)
        if (tokens.length === 1) {
          query = query.or(
            `nome.ilike.%${termLimpo}%,numero_matricula.ilike.%${termLimpo}%,cpf.ilike.%${termLimpo}%,inep.ilike.%${termLimpo}%`
          )
        } else {
          const conditions = tokens.map((tk) => `nome.ilike.%${tk}%`).join(',')
          query = query.or(conditions)
        }
      }

      const from = (page - 1) * pageSize
      const to = page * pageSize - 1

      const { data, count, error } = await query
        .order('nome', { ascending: true })
        .range(from, to)

      if (error) throw error

      if (isMounted.current) {
        if (data) {
          const isAlunoEja = (a: any) => {
            const tNome = String(a.turmas?.nome ?? '').toUpperCase()
            const sNome = String(a.serie ?? '').toUpperCase()
            const modMat = String(a.dados_matricula?.modalidade ?? a.dados_matricula?.etapa ?? '').toUpperCase()
            return tNome.includes('EJA') || sNome.includes('EJA') || modMat.includes('EJA')
          }

          const mapped = (data as any[]).map((aluno: any) => ({
            ...aluno,
            escola_nome:
              aluno.escolas?.nome ?? aluno.dados_matricula?.escolaNome ?? 'Sem Escola',
          }))

          // Isolamento Bidirecional Estrito:
          // Se ejaMode = true: Apenas alunos EJA
          // Se ejaMode = false: Apenas alunos Regulares (sem EJA)
          const filtrados = ejaMode
            ? mapped.filter(isAlunoEja)
            : mapped.filter((a) => !isAlunoEja(a))

          setAlunos(filtrados)
          setTotalCount(count ?? filtrados.length)
        } else {
          setAlunos([])
          setTotalCount(0)
        }
      }
    } catch (err: any) {
      console.error('Erro ao carregar alunos:', err)
      if (isMounted.current) {
        toast.error('Erro ao carregar lista de alunos. Verifique sua conexão.')
      }
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }, [page, pageSize, searchTerm, escolaAtivaId, vinculos, acessos, funcionario?.id, isAdminGlobalOrRoot, checkCoordenador, ejaMode])

  /* ── Carregar Solicitações de Liberação ──────────────────────── */
  const carregarSolicitacoes = useCallback(async () => {
    const isDiretor = acessos.some((a) => a.nivel === 2 && a.ativo)
    const isAdmin = isAdminGlobalOrRoot()

    if (!isDiretor && !isAdmin) return

    const supabase = createClient()
    if (isMounted.current) setCarregandoSolicitacoes(true)

    try {
      let query = (supabase.from('solicitacoes_edicao_aluno' as any) as any)
        .select(
          '*, alunos!inner(nome, escola_id, escolas(nome)), solicitante:funcionarios!solicitante_id(nome)'
        )
        .eq('status', 'pendente')

      if (!isAdmin && escolaAtivaId) {
        query = query.eq('alunos.escola_id', escolaAtivaId)
      }

      const { data, error } = await query.order('criado_em', { ascending: true })
      if (error) throw error

      if (isMounted.current) setSolicitacoes(data ?? [])
    } catch (err: any) {
      console.error('Erro ao carregar solicitações de liberação:', err)
      if (isMounted.current) {
        toast.error('Erro ao carregar solicitações de liberação de ficha.')
      }
    } finally {
      if (isMounted.current) setCarregandoSolicitacoes(false)
    }
  }, [escolaAtivaId, acessos, isAdminGlobalOrRoot])

  /* ── Responder Solicitação ───────────────────────────────────── */
  const handleResponderSolicitacao = async (
    id: string,
    status: 'aprovado' | 'rejeitado'
  ) => {
    const supabase = createClient()

    await executeWithToast({
      action: async () => {
        const { error } = await (supabase.from('solicitacoes_edicao_aluno' as any) as any)
          .update({
            status,
            aprovado_por: funcionario?.id ?? null,
            respondido_em: new Date().toISOString(),
          } as any)
          .eq('id', id)
        if (error) throw error
      },
      successMessage: `Solicitação ${status === 'aprovado' ? 'aprovada' : 'rejeitada'} com sucesso!`,
      errorMessage: 'Erro ao responder solicitação',
      onSuccess: () => {
        carregarSolicitacoes()
        carregarAlunos()
      }
    })
  }

  /* ── Salvar Histórico do Aluno ───────────────────────────────── */
  const salvarHistoricoAluno = async (id: string, historicoText: string) => {
    const supabase = createClient()
    const valorHistorico = historicoText.trim() || null

    await executeWithToast({
      action: async () => {
        const { error } = await supabase
          .from('alunos')
          .update({ historico: valorHistorico })
          .eq('id', id)
        if (error) throw error
      },
      successMessage: 'Histórico do aluno salvo com sucesso!',
      errorMessage: 'Erro ao salvar histórico do aluno',
      onSuccess: () => {
        carregarAlunos()
      }
    })
  }

  /* ── Carregar ao alterar dependências ────────────────────────── */
  useEffect(() => {
    carregarAlunos()
  }, [carregarAlunos])

  useEffect(() => {
    carregarSolicitacoes()
  }, [carregarSolicitacoes])

  return {
    alunos,
    alunosFiltrados: alunos, // O servidor já realiza a filtragem
    totalCount,
    page,
    setPage,
    pageSize,
    loading,
    searchTerm,
    setSearchTerm,
    carregarAlunos,
    solicitacoes,
    carregandoSolicitacoes,
    handleResponderSolicitacao,
    salvarHistoricoAluno,
  }
}

