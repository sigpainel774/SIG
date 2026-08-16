import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { logAudit } from '@/lib/audit/audit-agent'
import { coletarAuthUserIds, coletarAuthUserIdsAdminsGlobais } from '@/lib/notifications/lotacaoNotifications'
import { useAuthStore } from '@/store/useAuthStore'
import { useSchoolStore } from '@/store/useSchoolStore'
import { toast } from 'sonner'
import { buscarConfigBloqueioRede, verificarTravaEdicaoFuncionario } from '@/lib/verificarTravaBloqueio'

export interface Escola {
  id: string
  nome: string
  tipo?: string | null
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
  carga_horaria?: number | null
  modalidade_ensino?: string | null
  escolaNome?: string
}

export interface FuncItem {
  id: string
  nome: string
  email: string
  cpf: string | null
  cargo: string | null
  foto_url: string | null
  foto_avatar_path?: string | null
  foto_visualizacao_path?: string | null
  foto_updated_at?: string | null
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
  const { funcionario: authFuncionario, acessos, isDiretor, isAdminGlobalOrRoot, escolaAtivaId } = useAuthStore()
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

  const verificarTravaGlobal = async (funcionarioAlvoId?: string): Promise<boolean> => {
    const isLevel1 = authFuncionario?.is_superadmin || (isAdminGlobalOrRoot && isAdminGlobalOrRoot()) || acessos?.some((a: any) => a.nivel === 1 && a.ativo)
    if (isLevel1) return false

    const configRede = await buscarConfigBloqueioRede(supabase)
    return verificarTravaEdicaoFuncionario(configRede, funcionarioAlvoId ?? null, supabase)
  }

  const carregar = useCallback(async () => {
    if (!isMounted.current) return
    setLoading(true)
    try {
      const [funcsRes, escsRes, cargsRes, vincsRes] = await Promise.all([
        supabase
          .from('funcionarios')
          .select('id, nome, email, cpf, cargo, foto_url, foto_avatar_path, foto_visualizacao_path, foto_updated_at, status, is_superadmin, auth_user_id, acessos_usuarios(nivel, ativo)')
          .is('deleted_at', null)
          .order('nome'),
        supabase.from('escolas').select('id, nome, tipo').is('deleted_at', null).or('is_teste.is.null,is_teste.eq.false').order('nome'),
        supabase.from('cargos').select('id, nome').order('nome'),
        supabase
          .from('vinculos_funcionarios')
          .select('id, funcionario_id, school_id:escola_id, cargo, ativo, data_inicio, carga_horaria, modalidade_ensino')
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
          foto_avatar_path: f.foto_avatar_path ?? null,
          foto_visualizacao_path: f.foto_visualizacao_path ?? null,
          foto_updated_at: f.foto_updated_at ?? null,
          status: f.status ?? 'ativo',
          auth_user_id: f.auth_user_id ?? null,
          lotacoes: vincsData
            .filter((v: any) => v.funcionario_id === f.id)
            .map((v: any) => ({
              id: v.id,
              funcionario_id: v.funcionario_id ?? '',
              escola_id: v.school_id ?? '',
              cargo: v.cargo ?? f.cargo ?? null,
              ativo: v.ativo,
              data_inicio: v.data_inicio ?? null,
              carga_horaria: v.carga_horaria ?? null,
              modalidade_ensino: v.modalidade_ensino ?? f.modalidade_ensino ?? 'Regular',
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
            // Ocultar nível 1 e nível 2 de OUTRAS escolas, permitindo nível 2 da escola atual
            if (acessosList.some((a: any) => a.ativo && (a.nivel === 1 || (a.nivel === 2 && a.escola_id !== escolaAtivaId)))) return false
          }

          const selectedSecretaria = useSchoolStore.getState().selectedSecretaria
          const todasEscolas = useSchoolStore.getState().escolas

          let escolaIdsFiltradas: Set<string> | null = null
          if (escolaAtivaId) {
            escolaIdsFiltradas = new Set([escolaAtivaId])
          } else if (selectedSecretaria) {
            const secId = selectedSecretaria.id
            const secNome = (selectedSecretaria.nome || '').toLowerCase()
            const matching = todasEscolas.filter((e: any) => {
              if (secId && e.secretaria_id === secId) return true
              if (secNome && (e.secretariaNome?.toLowerCase().includes(secNome) || (e.secretarias as any)?.nome?.toLowerCase().includes(secNome))) return true
              return false
            })
            escolaIdsFiltradas = new Set(matching.map((e: any) => e.id))
          }

          if (escolaIdsFiltradas !== null) {
            const temLotacaoNaFoco = f.lotacoes.some((v) => escolaIdsFiltradas!.has(v.escola_id) && v.ativo)
            const temQualquerLotacao = f.lotacoes.some((v) => v.ativo)

            if (temLotacaoNaFoco) return true
            if (!temQualquerLotacao && isGlobalAdmin) return true
            return false
          }

          return true
        })

      // Montar lista unificada de cargos (tabela de cargos + cargos presentes em funcionários e vínculos)
      const cargosMap = new Map<string, Cargo>()
      cargsData.forEach((c) => {
        if (c.nome?.trim()) {
          const key = c.nome.trim().toLowerCase()
          if (!cargosMap.has(key)) {
            cargosMap.set(key, { id: c.id, nome: c.nome.trim() })
          }
        }
      })
      funcsData.forEach((f: any) => {
        if (f.cargo?.trim()) {
          const key = f.cargo.trim().toLowerCase()
          if (!cargosMap.has(key)) {
            cargosMap.set(key, { id: `func-${key}`, nome: f.cargo.trim() })
          }
        }
      })
      vincsData.forEach((v: any) => {
        if (v.cargo?.trim()) {
          const key = v.cargo.trim().toLowerCase()
          if (!cargosMap.has(key)) {
            cargosMap.set(key, { id: `vinc-${key}`, nome: v.cargo.trim() })
          }
        }
      })
      const cargosOrdenados = Array.from(cargosMap.values()).sort((a, b) =>
        a.nome.localeCompare(b.nome, 'pt-BR')
      )

      setFuncionarios(lista)
      setEscolas(escsData)
      setCargos(cargosOrdenados)

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

  const funcsFiltrados = useMemo(() => {
    return funcionarios.filter((f) => {
      const buscaTrim = busca.trim().toLowerCase()
      const matchBusca =
        !buscaTrim ||
        f.nome.toLowerCase().includes(buscaTrim) ||
        f.email.toLowerCase().includes(buscaTrim) ||
        (f.cpf ?? '').includes(buscaTrim) ||
        (f.cargo ?? '').toLowerCase().includes(buscaTrim) ||
        f.lotacoes.some((l) => (l.cargo ?? '').toLowerCase().includes(buscaTrim))

      const matchCargo =
        filtroCargo === 'todos' ||
        (f.cargo ?? '').toLowerCase() === filtroCargo.toLowerCase() ||
        f.lotacoes.some((l) => (l.cargo ?? '').toLowerCase() === filtroCargo.toLowerCase())

      const matchTab =
        tab === 'todos' ||
        (tab === 'sem_lotacao' && f.lotacoes.length === 0) ||
        (tab === 'lotados' && f.lotacoes.length > 0)

      return matchBusca && matchCargo && matchTab
    })
  }, [funcionarios, busca, filtroCargo, tab])

  const invalidarCacheHelper = async (userId: string) => {
    try {
      const { invalidarCachePerfil } = await import('@/lib/invalidarCachePerfil')
      await invalidarCachePerfil(userId)
    } catch (err) {
      console.warn('Erro ao invalidar cache de perfil (não-crítico):', err)
    }
  }

  const handleAdicionarLotacao = async (
    escolaId: string,
    cargoNome: string,
    cargaHorariaInput?: number | string | null,
    modalidadeInput?: string | null
  ) => {
    if (salvando) return
    if (!selecionado || !escolaId) {
      toast.error('Selecione a escola de destino.')
      return
    }
    setSalvando(true)
    try {
      const travaAtiva = await verificarTravaGlobal(selecionado?.id)
      if (travaAtiva) {
        toast.error('A edição de ficha e lotações de funcionários foi temporariamente bloqueada pela gestão da rede.')
        setSalvando(false)
        return
      }

      const cargoFinal = cargoNome || selecionado.cargo || ''
      const isCargoDiretor = cargoFinal.toUpperCase().includes('DIRETOR')
      const escolaNome = escolas.find((e) => e.id === escolaId)?.nome ?? escolaId
      const parsedCarga = cargaHorariaInput !== null && cargaHorariaInput !== undefined && String(cargaHorariaInput).trim() !== ''
        ? parseInt(String(cargaHorariaInput).replace(/\D/g, ''), 10)
        : null
      const finalCarga = isNaN(parsedCarga as number) ? null : parsedCarga
      const modalidadeFinal = modalidadeInput || 'Regular'

      if (isCargoDiretor) {
        const { data: escolaData } = await supabase
          .from('escolas')
          .select('diretor_id, nome')
          .eq('id', escolaId)
          .single()

        if (escolaData?.diretor_id && escolaData.diretor_id !== selecionado.id) {
          toast.error(`A escola "${escolaData.nome}" já possui um diretor ativo cadastrado. Desvincule/inative o gestor atual antes de adicionar um novo diretor.`)
          if (isMounted.current) setSalvando(false)
          return
        }
      }

      const { error } = await supabase.from('vinculos_funcionarios').insert({
        funcionario_id: selecionado.id,
        escola_id: escolaId,
        cargo: cargoFinal || null,
        carga_horaria: finalCarga,
        modalidade_ensino: modalidadeFinal,
        ativo: true,
        data_inicio: new Date().toISOString().split('T')[0],
      })
      if (error) throw error

      // Atualiza também a modalidade_ensino no funcionário como fallback
      await supabase
        .from('funcionarios')
        .update({ modalidade_ensino: modalidadeFinal })
        .eq('id', selecionado.id)

      if (isCargoDiretor) {
        await supabase
          .from('escolas')
          .update({ diretor_id: selecionado.id })
          .eq('id', escolaId)
      }

      // Sincronizar acessos_usuarios caso exista registro com escola_id null
      await supabase
        .from('acessos_usuarios')
        .update({ escola_id: escolaId })
        .eq('funcionario_id', selecionado.id)
        .is('escola_id', null)

      await logAudit({
        supabase,
        action: 'CREATE',
        entity: 'vinculos_funcionarios',
        entityId: selecionado.id,
        newData: { escola: escolaNome, cargo: cargoFinal },
        performedBy: performer,
      })

      toast.success(`Lotação adicionada em ${escolaNome}`)

      // Notificar chefes da escola de destino e o próprio funcionário
      try {
        const chefesDestino = await coletarAuthUserIds(supabase, [escolaId], [2])
        const destinatarios = new Set<string>(chefesDestino)
        if (selecionado?.auth_user_id) destinatarios.add(selecionado.auth_user_id)
        if (destinatarios.size > 0) {
          await (supabase as any).rpc('criar_notificacoes', {
            p_destinatarios: Array.from(destinatarios),
            p_title: 'Nova Lotação Registrada',
            p_message: `O funcionário ${selecionado.nome} foi vinculado à escola ${escolaNome} pelo Administrador.`,
            p_type: 'INFO',
            p_link: '/funcionarios'
          })
        }
      } catch (notifErr) {
        console.warn('Erro não-crítico ao notificar lotação adicionada:', notifErr)
      }

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
    if (salvando) return
    if (!selecionado || !origemId || !destinoEscolaId) {
      toast.error('Selecione a lotação de origem e a escola de destino.')
      return
    }
    setSalvando(true)
    try {
      const travaAtiva = await verificarTravaGlobal(selecionado?.id)
      if (travaAtiva) {
        toast.error('A edição de ficha e lotações de funcionários foi temporariamente bloqueada pela gestão da rede.')
        setSalvando(false)
        return
      }

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

      // Notificar chefes de origem, chefes de destino e o próprio funcionário
      try {
        const escolasEnvolvidas: string[] = []
        if (lotacaoOrigem?.escola_id) escolasEnvolvidas.push(lotacaoOrigem.escola_id)
        if (destinoEscolaId) escolasEnvolvidas.push(destinoEscolaId)
        const chefes = await coletarAuthUserIds(supabase, escolasEnvolvidas, [2])
        const destinatarios = new Set<string>(chefes)
        if (selecionado?.auth_user_id) destinatarios.add(selecionado.auth_user_id)
        if (destinatarios.size > 0) {
          await (supabase as any).rpc('criar_notificacoes', {
            p_destinatarios: Array.from(destinatarios),
            p_title: 'Mudança de Lotação',
            p_message: `O funcionário ${selecionado.nome} foi transferido de ${lotacaoOrigem?.escolaNome ?? 'escola anterior'} para ${escolaDestinoNome} pelo Administrador.`,
            p_type: 'INFO',
            p_link: '/funcionarios'
          })
        }
      } catch (notifErr) {
        console.warn('Erro não-crítico ao notificar mudança de lotação:', notifErr)
      }

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
    if (salvando) return
    setSalvando(true)
    try {
      const travaAtiva = await verificarTravaGlobal(selecionado?.id)
      if (travaAtiva) {
        toast.error('A edição de ficha e lotações de funcionários foi temporariamente bloqueada pela gestão da rede.')
        setSalvando(false)
        return
      }

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

      // ES-6: Notificar chefes da unidade e o próprio funcionário desvinculado
      try {
        const escolaNomeRem = lotacao.escolaNome ?? lotacao.escola_id
        const destinatarios = new Set<string>()
        if (lotacao.escola_id) {
          const chefes = await coletarAuthUserIds(supabase, [lotacao.escola_id], [2])
          chefes.forEach((id) => destinatarios.add(id))
        }
        if (selecionado?.auth_user_id) destinatarios.add(selecionado.auth_user_id)
        if (destinatarios.size > 0) {
          await (supabase as any).rpc('criar_notificacoes', {
            p_destinatarios: Array.from(destinatarios),
            p_title: 'Lotação Encerrada',
            p_message: `A lotação do funcionário ${selecionado?.nome ?? 'Funcionário'} na escola ${escolaNomeRem} foi encerrada pelo Administrador.`,
            p_type: 'WARNING',
            p_link: '/funcionarios'
          })
        }
      } catch (notifErr) {
        console.warn('Erro não-crítico ao notificar remoção de lotação:', notifErr)
      }

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
    if (salvando) return
    const lotacaoNaMinhaEscola = selecionado?.lotacoes.find(
      (l) => l.escola_id === escolaAtivaId && l.ativo
    )
    if (!selecionado || !lotacaoNaMinhaEscola || !destinoEscolaId || !motivoSolicitacao) {
      toast.error('Preencha a escola de destino e a justificativa.')
      return
    }
    setSalvando(true)
    try {
      const travaAtiva = await verificarTravaGlobal(selecionado?.id)
      if (travaAtiva) {
        toast.error('A edição de ficha e lotações de funcionários foi temporariamente bloqueada pela gestão da rede.')
        setSalvando(false)
        return
      }

      const escolaOrigemNome = escolas.find((e) => e.id === escolaAtivaId)?.nome ?? 'Escola Origem'
      const escolaDestinoNome = escolas.find((e) => e.id === destinoEscolaId)?.nome ?? 'Escola Destino'

      const { data: insertData, error: insertError } = await (supabase as any)
        .from('transferencias_funcionarios')
        .insert({
          funcionario_id: selecionado.id,
          escola_origem_id: escolaAtivaId,
          escola_destino_id: destinoEscolaId,
          solicitante_id: authFuncionario?.id || null,
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

      // Correção 2d (ES): usar auth_user_id correto via helper centralizado
      const chefesDestino = await coletarAuthUserIds(supabase, [destinoEscolaId], [2])
      const chefesOrigem = await coletarAuthUserIds(supabase, [escolaAtivaId!], [2])
      const adminsGlobais = await coletarAuthUserIdsAdminsGlobais(supabase)

      const destinatarios = new Set<string>([
        ...chefesDestino,
        ...chefesOrigem,
        ...adminsGlobais,
      ])

      if (destinatarios.size > 0) {
        await (supabase as any).rpc('criar_notificacoes', {
          p_destinatarios: Array.from(destinatarios),
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

  const handleAtualizarCargoLotacao = async (lotacaoId: string, novoCargo: string) => {
    if (salvando) return
    if (!selecionado || !lotacaoId || !novoCargo) {
      toast.error('Selecione o novo cargo.')
      return
    }
    setSalvando(true)
    try {
      const travaAtiva = await verificarTravaGlobal(selecionado?.id)
      if (travaAtiva) {
        toast.error('A edição de ficha e lotações de funcionários foi temporariamente bloqueada pela gestão da rede.')
        setSalvando(false)
        return
      }

      const { error } = await supabase
        .from('vinculos_funcionarios')
        .update({ cargo: novoCargo })
        .eq('id', lotacaoId)
      if (error) throw error

      await supabase
        .from('funcionarios')
        .update({ cargo: novoCargo })
        .eq('id', selecionado.id)

      await logAudit({
        supabase,
        action: 'UPDATE',
        entity: 'vinculos_funcionarios',
        entityId: lotacaoId,
        newData: { cargo: novoCargo },
        performedBy: performer,
      })

      toast.success('Cargo da lotação atualizado com sucesso!')

      if (selecionado?.auth_user_id) {
        await invalidarCacheHelper(selecionado.auth_user_id)
      }

      await carregar()
    } catch (err: unknown) {
      toast.error(`Erro ao atualizar cargo da lotação: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      if (isMounted.current) setSalvando(false)
    }
  }

  const handleAtualizarCargaHorariaLotacao = async (lotacaoId: string, cargaInput: number | string | null) => {
    if (salvando) return
    if (!selecionado || !lotacaoId) return
    setSalvando(true)
    try {
      const travaAtiva = await verificarTravaGlobal(selecionado?.id)
      if (travaAtiva) {
        toast.error('A edição de ficha e lotações de funcionários foi temporariamente bloqueada pela gestão da rede.')
        setSalvando(false)
        return
      }

      const parsedCarga = cargaInput !== null && cargaInput !== undefined && String(cargaInput).trim() !== ''
        ? parseInt(String(cargaInput).replace(/\D/g, ''), 10)
        : null
      const finalCarga = isNaN(parsedCarga as number) ? null : parsedCarga

      const { error } = await supabase
        .from('vinculos_funcionarios')
        .update({ carga_horaria: finalCarga })
        .eq('id', lotacaoId)
      if (error) throw error

      await logAudit({
        supabase,
        action: 'UPDATE',
        entity: 'vinculos_funcionarios',
        entityId: lotacaoId,
        newData: { carga_horaria: finalCarga },
        performedBy: performer,
      })

      toast.success('Carga horária da lotação atualizada!')

      if (selecionado?.auth_user_id) {
        await invalidarCacheHelper(selecionado.auth_user_id)
      }

      await carregar()
    } catch (err: unknown) {
      toast.error(`Erro ao atualizar carga horária: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      if (isMounted.current) setSalvando(false)
    }
  }

  const handleAtualizarModalidadeLotacao = async (lotacaoId: string, novaModalidade: string) => {
    if (salvando) return
    if (!selecionado || !lotacaoId || !novaModalidade) return
    setSalvando(true)
    try {
      const travaAtiva = await verificarTravaGlobal(selecionado?.id)
      if (travaAtiva) {
        toast.error('A edição de ficha e lotações de funcionários foi temporariamente bloqueada pela gestão da rede.')
        setSalvando(false)
        return
      }

      const { error } = await supabase
        .from('vinculos_funcionarios')
        .update({ modalidade_ensino: novaModalidade })
        .eq('id', lotacaoId)
      if (error) throw error

      await supabase
        .from('funcionarios')
        .update({ modalidade_ensino: novaModalidade })
        .eq('id', selecionado.id)

      await logAudit({
        supabase,
        action: 'UPDATE',
        entity: 'vinculos_funcionarios',
        entityId: lotacaoId,
        newData: { modalidade_ensino: novaModalidade },
        performedBy: performer,
      })

      toast.success('Modalidade da lotação atualizada!')

      if (selecionado?.auth_user_id) {
        await invalidarCacheHelper(selecionado.auth_user_id)
      }

      await carregar()
    } catch (err: unknown) {
      toast.error(`Erro ao atualizar modalidade: ${err instanceof Error ? err.message : String(err)}`)
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
    handleAtualizarCargoLotacao,
    handleAtualizarCargaHorariaLotacao,
    handleAtualizarModalidadeLotacao,
    carregar,
  }
}
