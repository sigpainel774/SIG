'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { logAudit } from '@/lib/audit/audit-agent'
import { useAuthStore } from '@/store/useAuthStore'
import { toast } from 'sonner'

export interface Escola {
  id: string
  nome: string
}

export interface Cargo {
  id: string
  nome: string
}

export interface Lotacao {
  id: string
  funcionario_id: string
  escola_id: string
  cargo: string | null
  ativo: boolean
  data_inicio: string | null
  escolaNome?: string
}

export interface FuncItem {
  id: string
  nome: string
  email: string
  cpf: string | null
  cargo: string | null
  foto_url: string | null
  status: string
  lotacoes: Lotacao[]
  auth_user_id?: string | null
}

export type TabFiltro = 'todos' | 'sem_lotacao' | 'lotados'

interface UseGestaoLotacoesProps {
  open: boolean
  funcionarioInicial?: { id: string } | null
}

export function useGestaoLotacoes({ open, funcionarioInicial }: UseGestaoLotacoesProps) {
  const supabase = createClient()
  const { funcionario: authFuncionario, isDiretor, isAdminGlobalOrRoot, escolaAtivaId } = useAuthStore()
  const isDir = isDiretor()
  const isGlobalAdmin = isAdminGlobalOrRoot()
  const restringirNivel = isDir && !isGlobalAdmin

  const [funcionarios, setFuncionarios] = useState<FuncItem[]>([])
  const [escolas, setEscolas] = useState<Escola[]>([])
  const [cargos, setCargos] = useState<Cargo[]>([])
  const [loading, setLoading] = useState(false)
  const [salvando, setSalvando] = useState(false)

  /* filtros */
  const [busca, setBusca] = useState('')
  const [filtroCargo, setFiltroCargo] = useState('todos')
  const [tab, setTab] = useState<TabFiltro>('todos')

  /* seleção */
  const [selecionado, setSelecionado] = useState<FuncItem | null>(null)

  // Referência para controlar se o componente está montado (prevenção de memory leaks)
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const performer = {
    id: authFuncionario?.id ?? null,
    name: authFuncionario?.nome ?? 'Sistema',
    email: authFuncionario?.email ?? '',
    cargo: authFuncionario?.cargo ?? undefined,
  }

  const carregar = useCallback(async () => {
    if (!isMounted.current) return
    setLoading(true)
    try {
      const [funcsRes, escsRes, cargsRes, vincsRes] = await Promise.all([
        supabase
          .from('funcionarios')
          .select('id, nome, email, cpf, cargo, foto_url, status, is_superadmin, auth_user_id, acessos_usuarios(nivel, ativo)')
          .is('deleted_at', null)
          .order('nome'),
        supabase.from('escolas').select('id, nome').is('deleted_at', null).order('nome'),
        supabase.from('cargos').select('id, nome').order('nome'),
        supabase
          .from('vinculos_funcionarios')
          .select('id, funcionario_id, school_id:escola_id, cargo, ativo, data_inicio')
          .eq('ativo', true),
      ])

      if (!isMounted.current) return

      const funcsData = funcsRes.data ?? []
      const escsData = escsRes.data ?? []
      const cargsData = cargsRes.data ?? []
      const vincsData = vincsRes.data ?? []

      const escolaMap: Record<string, string> = {}
      escsData.forEach((e) => { escolaMap[e.id] = e.nome })

      const lista: FuncItem[] = funcsData
        .map((f: any) => ({
          id: f.id,
          nome: f.nome,
          email: f.email,
          cpf: f.cpf ?? null,
          cargo: f.cargo ?? null,
          foto_url: f.foto_url ?? null,
          status: f.status ?? 'ativo',
          auth_user_id: f.auth_user_id ?? null,
          lotacoes: vincsData
            .filter((v: any) => v.funcionario_id === f.id)
            .map((v: any) => ({
              id: v.id,
              funcionario_id: v.funcionario_id ?? '',
              escola_id: v.school_id ?? '',
              cargo: v.cargo ?? null,
              ativo: v.ativo,
              data_inicio: v.data_inicio ?? null,
              escolaNome: v.school_id ? (escolaMap[v.school_id] ?? 'Escola desconhecida') : undefined,
            })),
        }))
        .filter((f: FuncItem) => {
          const fRaw = funcsData.find((fd: any) => fd.id === f.id)

          if (escolaAtivaId) {
            if (fRaw?.is_superadmin) return false
            if (f.nome?.toLowerCase() === 'root' || f.email?.toLowerCase().startsWith('root@')) return false
            const acessosList = fRaw?.acessos_usuarios ?? []
            if (acessosList.some((a: any) => a.nivel === 1 && a.ativo)) return false
          }
          if (restringirNivel) {
            if (fRaw?.is_superadmin) return false
            if (f.nome?.toLowerCase() === 'root' || f.email?.toLowerCase().startsWith('root@')) return false
            const acessosList = fRaw?.acessos_usuarios ?? []
            if (acessosList.some((a: any) => (a.nivel === 1 || a.nivel === 2) && a.ativo)) return false
          }

          if (escolaAtivaId) {
            const temLotacaoNaEscolaAtiva = f.lotacoes.some((v) => v.escola_id === escolaAtivaId && v.ativo)
            const temQualquerLotacao = f.lotacoes.some((v) => v.ativo)

            if (temLotacaoNaEscolaAtiva) return true
            if (!temQualquerLotacao && isGlobalAdmin) return true
            return false
          }

          return true
        })

      setFuncionarios(lista)
      setEscolas(escsData)
      setCargos(cargsData)

      if (funcionarioInicial) {
        const found = lista.find((f) => f.id === funcionarioInicial.id)
        if (found) setSelecionado(found)
      }
    } catch (err) {
      console.error('Erro ao carregar dados de lotações:', err)
      toast.error('Erro ao carregar dados. Tente novamente.')
    } finally {
      if (isMounted.current) {
        setLoading(false)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [funcionarioInicial])

  useEffect(() => {
    if (open) {
      carregar()
      setBusca('')
      setFiltroCargo('todos')
      setTab('todos')
      if (!funcionarioInicial) setSelecionado(null)
    }
  }, [open, carregar, funcionarioInicial])

  useEffect(() => {
    if (selecionado) {
      const updated = funcionarios.find((f) => f.id === selecionado.id)
      if (updated) setSelecionado(updated)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [funcionarios])

  const funcsFiltrados = funcionarios.filter((f) => {
    const matchBusca =
      f.nome.toLowerCase().includes(busca.toLowerCase()) ||
      f.email.toLowerCase().includes(busca.toLowerCase()) ||
      (f.cpf ?? '').includes(busca)
    const matchCargo = filtroCargo === 'todos' || f.cargo === filtroCargo
    const matchTab =
      tab === 'todos' ||
      (tab === 'sem_lotacao' && f.lotacoes.length === 0) ||
      (tab === 'lotados' && f.lotacoes.length > 0)
    return matchBusca && matchCargo && matchTab
  })

  const invalidarCacheHelper = async (userId: string) => {
    try {
      const { invalidarCachePerfil } = await import('@/lib/invalidarCachePerfil')
      await invalidarCachePerfil(userId)
    } catch (err) {
      console.warn('Erro ao invalidar cache de perfil (não-crítico):', err)
    }
  }

  const handleAdicionarLotacao = async (escolaId: string, cargoNome: string) => {
    if (!selecionado || !escolaId) {
      toast.error('Selecione a escola de destino.')
      return
    }
    setSalvando(true)
    try {
      const escolaNome = escolas.find((e) => e.id === escolaId)?.nome ?? escolaId
      const { error } = await supabase.from('vinculos_funcionarios').insert({
        funcionario_id: selecionado.id,
        escola_id: escolaId,
        cargo: cargoNome || selecionado.cargo || null,
        ativo: true,
        data_inicio: new Date().toISOString().split('T')[0],
      })
      if (error) throw error

      await logAudit({
        supabase,
        action: 'CREATE',
        entity: 'vinculos_funcionarios',
        entityId: selecionado.id,
        newData: { escola: escolaNome, cargo: cargoNome || selecionado.cargo },
        performedBy: performer,
      })

      toast.success(`Lotação adicionada em ${escolaNome}`)

      if (selecionado?.auth_user_id) {
        await invalidarCacheHelper(selecionado.auth_user_id)
      }

      await carregar()
    } catch (err: unknown) {
      toast.error(`Erro ao adicionar lotação: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      if (isMounted.current) setSalvando(false)
    }
  }

  const handleMoverFuncionario = async (origemId: string, destinoEscolaId: string) => {
    if (!selecionado || !origemId || !destinoEscolaId) {
      toast.error('Selecione a lotação de origem e a escola de destino.')
      return
    }
    setSalvando(true)
    try {
      const lotacaoOrigem = selecionado.lotacoes.find((l) => l.id === origemId)
      const escolaDestinoNome = escolas.find((e) => e.id === destinoEscolaId)?.nome ?? destinoEscolaId

      const { error: deactivateError } = await supabase
         .from('vinculos_funcionarios')
         .update({ ativo: false, data_fim: new Date().toISOString().split('T')[0] })
         .eq('id', origemId)
      if (deactivateError) throw deactivateError

      // Limpa automaticamente o diretor_id da escola de origem se o funcionário for o diretor cadastrado
      if (selecionado?.id && lotacaoOrigem?.escola_id) {
        await supabase
          .from('escolas')
          .update({ diretor_id: null })
          .eq('id', lotacaoOrigem.escola_id)
          .eq('diretor_id', selecionado.id)
      }

      const { error: insertError } = await supabase.from('vinculos_funcionarios').insert({
        funcionario_id: selecionado.id,
        escola_id: destinoEscolaId,
        cargo: lotacaoOrigem?.cargo || selecionado.cargo || null,
        ativo: true,
        data_inicio: new Date().toISOString().split('T')[0],
      })
      if (insertError) throw insertError

      await logAudit({
        supabase,
        action: 'UPDATE',
        entity: 'vinculos_funcionarios',
        entityId: selecionado.id,
        oldData: { escola: lotacaoOrigem?.escolaNome, cargo: lotacaoOrigem?.cargo },
        newData: { escola: escolaDestinoNome, cargo: lotacaoOrigem?.cargo },
        performedBy: performer,
      })

      toast.success(`Funcionário transferido para ${escolaDestinoNome}`)

      if (selecionado?.auth_user_id) {
        await invalidarCacheHelper(selecionado.auth_user_id)
      }

      await carregar()
    } catch (err: unknown) {
      toast.error(`Erro ao transferir: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      if (isMounted.current) setSalvando(false)
    }
  }

  const handleRemoverLotacao = async (lotacao: Lotacao) => {
    setSalvando(true)
    try {
      const { error } = await supabase
        .from('vinculos_funcionarios')
        .update({ ativo: false, data_fim: new Date().toISOString().split('T')[0] })
        .eq('id', lotacao.id)
      if (error) throw error

      // Limpa automaticamente o diretor_id da escola se o funcionário for o diretor cadastrado
      if (selecionado?.id && lotacao.escola_id) {
        await supabase
          .from('escolas')
          .update({ diretor_id: null })
          .eq('id', lotacao.escola_id)
          .eq('diretor_id', selecionado.id)
      }

      await logAudit({
        supabase,
        action: 'DELETE',
        entity: 'vinculos_funcionarios',
        entityId: lotacao.id,
        oldData: { escola: lotacao.escolaNome, cargo: lotacao.cargo },
        performedBy: performer,
      })

      toast.success('Lotação removida.')

      if (selecionado?.auth_user_id) {
        await invalidarCacheHelper(selecionado.auth_user_id)
      }

      await carregar()
    } catch (err: unknown) {
      toast.error(`Erro ao remover lotação: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      if (isMounted.current) setSalvando(false)
    }
  }

  const handleSolicitarTransferencia = async (destinoEscolaId: string, motivoSolicitacao: string) => {
    const lotacaoNaMinhaEscola = selecionado?.lotacoes.find(
      (l) => l.escola_id === escolaAtivaId && l.ativo
    )
    if (!selecionado || !lotacaoNaMinhaEscola || !destinoEscolaId || !motivoSolicitacao) {
      toast.error('Preencha a escola de destino e a justificativa.')
      return
    }
    setSalvando(true)
    try {
      const escolaOrigemNome = escolas.find((e) => e.id === escolaAtivaId)?.nome ?? 'Escola Origem'
      const escolaDestinoNome = escolas.find((e) => e.id === destinoEscolaId)?.nome ?? 'Escola Destino'

      const { data: insertData, error: insertError } = await (supabase as any)
        .from('transferencias_funcionarios')
        .insert({
          funcionario_id: selecionado.id,
          escola_origem_id: escolaAtivaId,
          escola_destino_id: destinoEscolaId,
          solicitante_id: authFuncionario?.id ?? '',
          motivo: motivoSolicitacao,
          fora_da_rede: false,
          ficha_snapshot: selecionado as any,
          lotacao_id: lotacaoNaMinhaEscola.id,
          status: 'PENDENTE'
        })
        .select('id')
        .single()

      if (insertError) throw insertError

      const transferId = insertData?.id

      const { data: acessosDest } = await supabase
        .from('acessos_usuarios')
        .select('funcionarios(id)')
        .eq('escola_id', destinoEscolaId)
        .eq('nivel', 2)
        .eq('ativo', true)

      const userIds = new Set<string>()
      if (acessosDest) {
        acessosDest.forEach((acc: any) => {
          const funcId = acc.funcionarios?.id
          if (funcId) userIds.add(funcId)
        })
      }

      const { data: acessosGlobais } = await supabase
        .from('acessos_usuarios')
        .select('funcionarios(id)')
        .eq('nivel', 1)
        .eq('ativo', true)

      if (acessosGlobais) {
        acessosGlobais.forEach((acc: any) => {
          const funcId = acc.funcionarios?.id
          if (funcId) userIds.add(funcId)
        })
      }

      if (userIds.size > 0) {
        await (supabase as any).rpc('criar_notificacoes', {
          p_destinatarios: Array.from(userIds),
          p_title: 'Solicitação de Transferência de Lotação',
          p_message: `O Diretor da escola ${escolaOrigemNome} solicitou a transferência do funcionário ${selecionado.nome} para a escola ${escolaDestinoNome}.`,
          p_type: 'INFO',
          p_link: `/transferencias?tab=funcionarios&subtab=recebimentos${transferId ? `&id=${transferId}` : ''}`
        })
      }

      await logAudit({
        supabase,
        action: 'CREATE',
        entity: 'transferencias_funcionarios',
        entityId: selecionado.id,
        newData: { 
          escola_origem: escolaOrigemNome, 
          escola_destino: escolaDestinoNome, 
          motivo: motivoSolicitacao,
          lotacao_id: lotacaoNaMinhaEscola.id
        },
        performedBy: performer,
      })

      toast.success(`Solicitação de transferência enviada para ${escolaDestinoNome}`)
      await carregar()
    } catch (err: unknown) {
      toast.error(`Erro ao solicitar transferência: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      if (isMounted.current) setSalvando(false)
    }
  }

  return {
    funcionarios,
    escolas,
    cargos,
    loading,
    salvando,
    busca,
    setBusca,
    filtroCargo,
    setFiltroCargo,
    tab,
    setTab,
    selecionado,
    setSelecionado,
    funcsFiltrados,
    isGlobalAdmin,
    escolaAtivaId,
    handleAdicionarLotacao,
    handleMoverFuncionario,
    handleRemoverLotacao,
    handleSolicitarTransferencia,
    carregar,
  }
}
