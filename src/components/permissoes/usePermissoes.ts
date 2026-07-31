'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useEditModeStore } from '@/store/useEditModeStore'
import { useAuthStore } from '@/store/useAuthStore'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { nivelLabel } from './utils'
import type { Escola, FuncionarioSimples, RegistroPermissao } from './types'

// ─── Hook Principal do Módulo de Permissões ───────────────────────────────────

export function usePermissoes() {
  const { isEditMode, setEditMode } = useEditModeStore()
  const { funcionario, isAdminGlobalOrRoot, isDiretor, escolaAtivaId } = useAuthStore()
  const pathname = usePathname()
  const autocompleteRef = useRef<HTMLDivElement>(null)

  const isGlobalAdmin = isAdminGlobalOrRoot()
  const isDir = isDiretor()
  const restringirNivel = isDir && !isGlobalAdmin
  const schoolIdToUse = escolaAtivaId

  const isRootPanel =
    !!funcionario?.is_superadmin ||
    (typeof pathname === 'string' &&
      (pathname.startsWith('/admin') || pathname === '/root'))

  // ── Estado: autenticação e modais ───────────────────────────────────────────
  const [isSuperAdminUser, setIsSuperAdminUser] = useState(false)
  const [modalSenhaOpen, setModalSenhaOpen] = useState(false)
  const [modalConfigOpen, setModalConfigOpen] = useState(false)
  const [itemConfigurar, setItemConfigurar] = useState<RegistroPermissao | null>(null)

  // ── Estado: modo de visualização ────────────────────────────────────────────
  const [modoAtribuicao, setModoAtribuicao] = useState<'funcionario' | 'escola' | 'especiais'>('funcionario')
  const [salvando, setSalvando] = useState(false)

  // ── Estado: dados do banco ──────────────────────────────────────────────────
  const [escolas, setEscolas] = useState<Escola[]>([])
  const [funcionariosAll, setFuncionariosAll] = useState<FuncionarioSimples[]>([])
  const [cargosLista, setCargosLista] = useState<string[]>([
    'Prefeito(a) Municipal',
    'Vice-Prefeito(a) Municipal',
    'Secretário(a) Municipal de Educação',
    'Chefe de Gabinete',
    'Coordenador(a) Geral da Rede',
    'Supervisor(a) de Ensino',
    'Administrador(a) do Sistema / Root'
  ])
  const [registros, setRegistros] = useState<RegistroPermissao[]>([])
  const [loading, setLoading] = useState(true)

  // ── Estado: formulário de atribuição ───────────────────────────────────────
  const [inputFunc, setInputFunc] = useState('')
  const [funcSelecionado, setFuncSelecionado] = useState<FuncionarioSimples | null>(null)
  const [showSugestoes, setShowSugestoes] = useState(false)
  const [escolaSel, setEscolaSel] = useState('')
  const [nivelSel, setNivelSel] = useState('')

  // ── Estado: filtros da lista ────────────────────────────────────────────────
  const [buscaLista, setBuscaLista] = useState('')
  const [filtroNivel, setFiltroNivel] = useState('')
  const [filtroEscola, setFiltroEscola] = useState('')

  // Modo edição ativo quando: editMode store, superAdmin ou painel root
  const isEditActive = isEditMode || isSuperAdminUser || isRootPanel

  // ─── Buscar Registros de Permissão ──────────────────────────────────────────
  const fetchRegistros = async (escolasLista: Escola[]) => {
    const supabase = createClient()
    const { data: permData } = await supabase
      .from('funcionarios')
      .select('id, nome, email, status, is_superadmin, acessos_usuarios(id, nivel, escola_id, escolas(nome)), vinculos_funcionarios(escola_id, ativo, escolas(nome))')

    if (permData) {
      const formatados: RegistroPermissao[] = []

      permData.forEach((f: any) => {
        // Se uma escola estiver ativa (painel escolar), filtra apenas funcionários com vínculo ou acesso nela
        if (schoolIdToUse) {
          const temVincEscolaAtiva = (f.vinculos_funcionarios ?? []).some(
            (v: any) => v.escola_id === schoolIdToUse && v.ativo
          )
          const temAcessoEscolaAtiva = (f.acessos_usuarios ?? []).some(
            (a: any) => a.escola_id === schoolIdToUse
          )

          if (!temVincEscolaAtiva && !temAcessoEscolaAtiva) {
            return
          }
        }

        const nomeEscolaVinculo = (f.vinculos_funcionarios ?? []).find(
          (v: any) => v.ativo && v.escolas?.nome
        )?.escolas?.nome

        const acessos = f.acessos_usuarios ?? []
        if (acessos.length > 0) {
          acessos.forEach((ac: any) => {
            // Se for diretor, só exibe o acesso da escola dele
            if (restringirNivel && escolaAtivaId && ac.escola_id !== schoolIdToUse) {
              return
            }

            const nivelNum = ac.nivel ?? null
            let nomeNivel = nivelLabel(nivelNum)
            if (f.is_superadmin) nomeNivel = 'ROOT'

            formatados.push({
              id: f.id,
              acessoId: ac.id,
              nome: f.nome,
              email: f.email ?? f.nome,
              nivel: nomeNivel,
              nivelNum,
              escola: ac.escolas?.nome ?? nomeEscolaVinculo ?? 'Sem Lotação',
              escolaId: ac.escola_id ?? null,
              status: f.status || 'ativo',
            })
          })

          // Diretor: funcionário com vínculo na escola mas sem acesso cadastrado
          if (restringirNivel && escolaAtivaId) {
            const temAcessoAqui = acessos.some((ac: any) => ac.escola_id === schoolIdToUse)
            const temVincAqui = (f.vinculos_funcionarios ?? []).some(
              (v: any) => v.escola_id === schoolIdToUse && v.ativo
            )
            if (temVincAqui && !temAcessoAqui) {
              formatados.push({
                id: f.id,
                nome: f.nome,
                email: f.email ?? f.nome,
                nivel: nivelLabel(null),
                nivelNum: null,
                escola: escolasLista.find(e => e.id === schoolIdToUse)?.nome ?? nomeEscolaVinculo ?? 'Escola Atual',
                escolaId: schoolIdToUse,
                status: f.status || 'ativo',
              })
            }
          }
        } else {
          // Funcionário sem acessos cadastrados
          if (restringirNivel && escolaAtivaId) {
            const temVincAqui = (f.vinculos_funcionarios ?? []).some(
              (v: any) => v.escola_id === schoolIdToUse && v.ativo
            )
            if (temVincAqui) {
              formatados.push({
                id: f.id,
                nome: f.nome,
                email: f.email ?? f.nome,
                nivel: nivelLabel(null),
                nivelNum: null,
                escola: escolasLista.find(e => e.id === schoolIdToUse)?.nome ?? nomeEscolaVinculo ?? 'Escola Atual',
                escolaId: schoolIdToUse,
                status: f.status || 'ativo',
              })
            }
          } else {
            // Admin global vê como sem lotação
            let nomeNivel = nivelLabel(null)
            if (f.is_superadmin) nomeNivel = 'ROOT'

            formatados.push({
              id: f.id,
              nome: f.nome,
              email: f.email ?? f.nome,
              nivel: nomeNivel,
              nivelNum: null,
              escola: nomeEscolaVinculo ?? 'Sem Lotação',
              escolaId: null,
              status: f.status || 'ativo',
            })
          }
        }
      })

      // Filtrar por nível conforme a regra restringirNivel e se estiver no painel escolar
      const filtrados = formatados.filter((item) => {
        if (schoolIdToUse) {
          if (item.nivel === 'ROOT') return false
          if (item.nivelNum === 1) return false
        }
        if (restringirNivel) {
          if (item.nivel === 'ROOT') return false
          if (item.nivelNum !== null && item.nivelNum < 3) return false
        }
        return true
      })

      setRegistros(filtrados)
    }
  }

  // ─── Fetch inicial e sincronização ──────────────────────────────────────────
  useEffect(() => {
    const fetchAll = async () => {
      const supabase = createClient()
      setLoading(true)

      // 1. Escolas ativas (sem soft-delete)
      let escolasQuery = supabase
        .from('escolas')
        .select('id, nome')
        .is('deleted_at', null)
        .eq('ativo', true)

      if (restringirNivel && schoolIdToUse) {
        escolasQuery = escolasQuery.eq('id', schoolIdToUse)
      }

      const { data: escolasData } = await escolasQuery.order('nome')
      let escolasLista: Escola[] = []
      if (escolasData) {
        escolasLista = escolasData
        setEscolas(escolasData)
      }

      // 1.5. Carregar Catálogo de Cargos do Banco de Dados
      const { data: cargosDb } = await supabase
        .from('cargos')
        .select('nome')
        .eq('ativo', true)
        .order('nome')

      if (cargosDb && cargosDb.length > 0) {
        const nomesDb = cargosDb.map((c: any) => c.nome as string)
        setCargosLista((prev) => Array.from(new Set([...prev, ...nomesDb])))
      }

      // 2. Todos os funcionários (para o autocomplete e gestão de contas especiais)
      let funcsQuery = supabase
        .from('funcionarios')
        .select('id, nome, email, cargo, is_superadmin, is_conta_especial, auth_user_id, acessos_usuarios(nivel, ativo)')
        .eq('status', 'ativo')

      if (restringirNivel && schoolIdToUse) {
        const { data: vincs } = await supabase
          .from('vinculos_funcionarios')
          .select('funcionario_id')
          .eq('escola_id', schoolIdToUse)
          .eq('ativo', true)

        const ids = (vincs ?? []).map((v: any) => v.funcionario_id as string)
        if (ids.length > 0) {
          funcsQuery = funcsQuery.in('id', ids)
        } else {
          setFuncionariosAll([])
          funcsQuery = funcsQuery.eq('id', '00000000-0000-0000-0000-000000000000')
        }
      }

      const { data: funcsData } = await funcsQuery.order('nome')

      if (funcsData) {
        const filtered = funcsData.filter((f: any) => {
          if (schoolIdToUse) {
            if (f.is_superadmin) return false
            if (f.nome?.toLowerCase() === 'root' || f.email?.toLowerCase().startsWith('root@')) return false
            const acessosList = f.acessos_usuarios ?? []
            if (acessosList.some((a: any) => a.nivel === 1 && a.ativo)) return false
          }
          if (restringirNivel) {
            if (f.is_superadmin) return false
            if (f.nome?.toLowerCase() === 'root' || f.email?.toLowerCase().startsWith('root@')) return false
            const acessosList = f.acessos_usuarios ?? []
            if (acessosList.some((a: any) => (a.nivel === 1 || a.nivel === 2) && a.ativo)) return false
          }
          return true
        })
        setFuncionariosAll(filtered)
      }

      // 3. Registros de permissão
      await fetchRegistros(escolasLista)

      setLoading(false)
    }

    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restringirNivel, schoolIdToUse, isGlobalAdmin])

  // Auto-seleção de escola para usuários não-admins globais (ex: diretores)
  useEffect(() => {
    if (!isGlobalAdmin && escolas.length > 0 && !escolaSel) {
      setEscolaSel(escolas[0].id)
    }
  }, [escolas, isGlobalAdmin, escolaSel])

  // ─── SuperAdmin check ───────────────────────────────────────────────────────
  useEffect(() => {
    if (isRootPanel) {
      setIsSuperAdminUser(true)
      setEditMode(true)
      return
    }
    const checkSuperAdmin = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        const { data } = await supabase
          .from('funcionarios')
          .select('is_superadmin')
          .ilike('email', user.email)
          .maybeSingle()
        if (data?.is_superadmin) {
          setIsSuperAdminUser(true)
          setEditMode(true)
        }
      }
    }
    checkSuperAdmin()
  }, [funcionario, isRootPanel, setEditMode])

  // ─── Fechar autocomplete ao clicar fora ─────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) {
        setShowSugestoes(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ─── Sugestões filtradas ────────────────────────────────────────────────────
  const sugestoesFiltradas = inputFunc.trim().length > 0
    ? funcionariosAll.filter(
        (f) =>
          f.nome.toLowerCase().includes(inputFunc.toLowerCase()) ||
          (f.email ?? '').toLowerCase().includes(inputFunc.toLowerCase())
      ).slice(0, 8)
    : []

  // ─── Salvar Permissão (UPSERT) ──────────────────────────────────────────────
  const handleSalvarPermissao = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isEditActive) {
      toast.warning('Ative o Modo Edição para alterar permissões.')
      setModalSenhaOpen(true)
      return
    }
    if (!funcSelecionado) {
      toast.error('Selecione um funcionário na lista de sugestões.')
      return
    }
    if (!nivelSel) {
      toast.error('Selecione o nível de acesso.')
      return
    }

    setSalvando(true)
    const supabase = createClient()
    const nivelNum = parseInt(nivelSel, 10)
    const escolaIdToSave = escolaSel || null

    if (restringirNivel && (nivelNum === 1 || nivelNum === 2)) {
      toast.error('Você não tem permissão para conceder este nível de acesso.')
      setSalvando(false)
      return
    }

    // Verificar se já existe acesso para este funcionário + escola
    let checkQuery = supabase
      .from('acessos_usuarios')
      .select('id')
      .eq('funcionario_id', funcSelecionado.id)

    if (escolaIdToSave) {
      checkQuery = checkQuery.eq('escola_id', escolaIdToSave)
    } else {
      checkQuery = checkQuery.is('escola_id', null)
    }

    const { data: existente } = await checkQuery.maybeSingle()

    const isNivel1 = nivelNum === 1

    let error
    if (existente?.id) {
      // UPDATE — atualizar nível e reativar
      const updateData: any = { nivel: nivelNum, ativo: true }
      if (isNivel1) {
        updateData.pode_mural = true
        updateData.pode_turmas = true
        updateData.pode_funcionarios = true
        updateData.pode_matriculas = true
        updateData.pode_alunos = true
        updateData.pode_ocorrencias = true
        updateData.pode_atestados = true
      }
      const { error: updateError } = await supabase
        .from('acessos_usuarios')
        .update(updateData)
        .eq('id', existente.id)
      error = updateError
    } else {
      // INSERT — novo registro
      const insertData: any = {
        funcionario_id: funcSelecionado.id,
        escola_id: escolaIdToSave,
        nivel: nivelNum,
        ativo: true,
      }
      if (isNivel1) {
        insertData.pode_mural = true
        insertData.pode_turmas = true
        insertData.pode_funcionarios = true
        insertData.pode_matriculas = true
        insertData.pode_alunos = true
        insertData.pode_ocorrencias = true
        insertData.pode_atestados = true
      }
      const { error: insertError } = await supabase
        .from('acessos_usuarios')
        .insert(insertData)
      error = insertError
    }

    if (error) {
      toast.error('Erro ao salvar permissão: ' + error.message)
    } else {
      toast.success(`Permissão atribuída a ${funcSelecionado.nome}!`)
      setInputFunc('')
      setFuncSelecionado(null)
      setEscolaSel('')
      setNivelSel('')

      // Invalida o cache do perfil do funcionário no servidor
      if (funcSelecionado.auth_user_id) {
        const { invalidarCachePerfil } = await import('@/lib/invalidarCachePerfil')
        await invalidarCachePerfil(funcSelecionado.auth_user_id)
      }

      // Recarregar lista
      await fetchRegistros(escolas)
    }
    setSalvando(false)
  }

  // ─── Filtros da lista ────────────────────────────────────────────────────────
  const limparFiltros = () => {
    setBuscaLista('')
    setFiltroNivel('')
    setFiltroEscola('')
  }

  const registrosFiltrados = registros.filter((item) => {
    const matchBusca =
      item.nome.toLowerCase().includes(buscaLista.toLowerCase()) ||
      item.email.toLowerCase().includes(buscaLista.toLowerCase())
    const matchNivel = !filtroNivel || item.nivel.includes(filtroNivel)
    const matchEscola = !filtroEscola || item.escola === filtroEscola
    return matchBusca && matchNivel && matchEscola
  })

  // ─── Agrupar por escola (modo Por Escola) ────────────────────────────────────
  const registrosAgrupadosPorEscola = registrosFiltrados.reduce<Record<string, RegistroPermissao[]>>(
    (acc, item) => {
      const chave = item.escola
      if (!acc[chave]) acc[chave] = []
      acc[chave].push(item)
      return acc
    },
    {}
  )

  // ─── Handlers para edição rápida ─────────────────────────────────────────────
  const handleClickEditCard = (item: RegistroPermissao, overrideModo?: 'funcionario') => {
    if (!isEditActive) {
      toast.info('Ative o Modo Edição para gerenciar permissões.')
      setModalSenhaOpen(true)
      return
    }
    const func = funcionariosAll.find((f) => f.id === item.id)
    if (func) {
      setFuncSelecionado(func)
      setInputFunc(func.nome)
    }
    const escolaEncontrada = escolas.find((e) => e.nome === item.escola)
    setEscolaSel(escolaEncontrada?.id ?? '')
    setNivelSel(item.nivelNum !== null && item.nivelNum !== undefined ? item.nivelNum.toString() : '')
    if (overrideModo) setModoAtribuicao(overrideModo)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    toast.info(`Editando permissões de ${item.nome}`)
  }

  const handleAbrirConfiguracao = (item: RegistroPermissao) => {
    setItemConfigurar(item)
    setModalConfigOpen(true)
  }

  // ─── Alternar Status de Conta Especial ──────────────────────────────────────
  const handleToggleContaEspecial = async (funcionarioId: string, novoValor: boolean, nomeFuncionario: string) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('funcionarios')
        .update({ is_conta_especial: novoValor })
        .eq('id', funcionarioId)

      if (error) throw error

      toast.success(
        novoValor
          ? `Conta "${nomeFuncionario}" marcada como Especial!`
          : `Conta "${nomeFuncionario}" desmarcada como Especial!`
      )

      // Atualizar lista local de funcionários
      setFuncionariosAll((prev) =>
        prev.map((f) => (f.id === funcionarioId ? { ...f, is_conta_especial: novoValor } : f))
      )

      // Invalidação de cache de perfil se existir auth_user_id
      const func = funcionariosAll.find((f) => f.id === funcionarioId)
      if (func?.auth_user_id) {
        const { invalidarCachePerfil } = await import('@/lib/invalidarCachePerfil')
        await invalidarCachePerfil(func.auth_user_id)
      }
    } catch (err: any) {
      console.error('Erro ao alternar conta especial:', err)
      toast.error('Erro ao atualizar status de conta especial: ' + (err.message || 'Erro desconhecido'))
    }
  }

  // ─── Alterar Cargo de Funcionário / Conta Especial ───────────────────────────
  const handleUpdateCargo = async (funcionarioId: string, novoCargo: string, nomeFuncionario: string) => {
    if (!funcionarioId || funcionarioId.trim() === '') {
      toast.error('ID de usuário inválido.')
      return
    }

    try {
      const supabase = createClient()
      const cargoTratado = novoCargo.trim() ?? null

      const { error } = await supabase
        .from('funcionarios')
        .update({ cargo: cargoTratado })
        .eq('id', funcionarioId)

      if (error) throw error

      toast.success(`Cargo de "${nomeFuncionario}" atualizado para "${cargoTratado ?? 'Não informado'}"!`)

      // Atualizar no estado local de funcionários
      setFuncionariosAll((prev) =>
        prev.map((f) => (f.id === funcionarioId ? { ...f, cargo: cargoTratado } : f))
      )

      // Garantir que o novo cargo esteja no catálogo visual
      if (cargoTratado && !cargosLista.includes(cargoTratado)) {
        setCargosLista((prev) => Array.from(new Set([...prev, cargoTratado])))
      }

      // Invalidação de cache de perfil do servidor
      const func = funcionariosAll.find((f) => f.id === funcionarioId)
      if (func?.auth_user_id) {
        const { invalidarCachePerfil } = await import('@/lib/invalidarCachePerfil')
        await invalidarCachePerfil(func.auth_user_id)
      }
    } catch (err: any) {
      console.error('Erro ao atualizar cargo:', err)
      toast.error('Erro ao atualizar cargo: ' + (err.message || 'Erro desconhecido'))
    }
  }

  // ─── Adicionar Novo Cargo ao Catálogo de Cargos ──────────────────────────────
  const handleAdicionarCargo = async (nomeCargo: string) => {
    const nomeLimpo = nomeCargo.trim()
    if (!nomeLimpo) {
      toast.error('Informe o nome do novo cargo.')
      return false
    }

    try {
      const supabase = createClient()
      // Tentar inserir na tabela public.cargos
      const { error } = await supabase
        .from('cargos')
        .insert({
          nome: nomeLimpo,
          nivel: 1,
          ativo: true,
          descricao: 'Cargo especial cadastrado via Painel Root'
        })

      if (error && !error.message.includes('unique')) {
        // Se a tabela não tiver constraint unique, não lançar fatal
        console.warn('Nota ao cadastrar cargo em tabela public.cargos:', error.message)
      }

      setCargosLista((prev) => Array.from(new Set([...prev, nomeLimpo])))
      toast.success(`Novo cargo "${nomeLimpo}" registrado no catálogo!`)
      return true
    } catch (err: any) {
      console.error('Erro ao cadastrar novo cargo:', err)
      toast.error('Falha ao cadastrar novo cargo: ' + (err.message || 'Erro de conexão'))
      return false
    }
  }

  return {
    // refs
    autocompleteRef,
    // flags de contexto
    isGlobalAdmin,
    restringirNivel,
    isRootPanel,
    isEditActive,
    // modais
    modalSenhaOpen,
    setModalSenhaOpen,
    modalConfigOpen,
    setModalConfigOpen,
    itemConfigurar,
    setItemConfigurar,
    handleAbrirConfiguracao,
    // modo
    modoAtribuicao,
    setModoAtribuicao,
    salvando,
    // dados
    escolas,
    funcionariosAll,
    cargosLista,
    registros,
    loading,
    // formulário
    inputFunc,
    setInputFunc,
    funcSelecionado,
    setFuncSelecionado,
    showSugestoes,
    setShowSugestoes,
    escolaSel,
    setEscolaSel,
    nivelSel,
    setNivelSel,
    // filtros
    buscaLista,
    setBuscaLista,
    filtroNivel,
    setFiltroNivel,
    filtroEscola,
    setFiltroEscola,
    // computados
    sugestoesFiltradas,
    registrosFiltrados,
    registrosAgrupadosPorEscola,
    // handlers
    handleSalvarPermissao,
    limparFiltros,
    handleClickEditCard,
    handleToggleContaEspecial,
    handleUpdateCargo,
    handleAdicionarCargo,
    fetchDadosContasEspeciais: () => fetchRegistros(escolas),
    // edit mode store
    setEditMode,
  }
}

export type UsePermissoesReturn = ReturnType<typeof usePermissoes>
