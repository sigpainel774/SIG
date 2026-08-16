import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/useAuthStore'
import { useSchoolStore } from '@/store/useSchoolStore'
import { useLocalSearch } from '@/hooks/useLocalSearch'
import { executeWithToast } from '@/lib/action-handler'
import { Funcionario } from '@/types/funcionario'
import { verificarEAtualizarRetornosAfastamentos } from '@/lib/afastamentosHelper'
import { buscarConfigBloqueioRede, verificarTravaEdicaoFuncionario } from '@/lib/verificarTravaBloqueio'

export function useFuncionarios() {
  const supabase = createClient()
  
  const { funcionario: authFuncionario, acessos, isAdminGlobalOrRoot } = useAuthStore()
  const selectedEscola = useSchoolStore((state) => state.selectedEscola)
  const selectedSecretaria = useSchoolStore((state) => state.selectedSecretaria)
  const isSaude = selectedSecretaria?.nome?.toLowerCase().includes('saúde') || false
  const isEmaee = selectedEscola?.tipo === 'EMAEE' || false

  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [cargosCadastrados, setCargosCadastrados] = useState<string[]>([])
  const [carregando, setCarregando] = useState(true)

  /* Filtros */
  const [busca, setBusca] = useState('')
  const [filtroCargo, setFiltroCargo] = useState('todos')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [filtroModalidade, setFiltroModalidade] = useState<string>(isSaude || isEmaee ? 'todos' : 'regular')

  /* ── Carregar cargos cadastrados no Superpainel (public.cargos) ── */
  useEffect(() => {
    let isMounted = true
    const carregarCargosCadastrados = async () => {
      try {
        const { data, error } = await supabase
          .from('cargos')
          .select('nome')
          .is('deleted_at', null)
          .order('nome', { ascending: true })

        if (error) {
          console.error('Erro ao carregar cargos do superpainel:', error)
          return
        }

        if (isMounted && data) {
          const nomes = data
            .map((c: { nome: string }) => (c.nome ?? '').trim())
            .filter(Boolean)
          setCargosCadastrados(nomes)
        }
      } catch (err) {
        console.error('Erro inesperado ao carregar cargos do superpainel:', err)
      }
    }

    carregarCargosCadastrados()
    return () => {
      isMounted = false
    }
  }, [supabase])

  /* ── Resetar Filtros ────────────────────────────────────────── */
  const resetFiltros = useCallback(() => {
    setBusca('')
    setFiltroCargo('todos')
    setFiltroStatus('todos')
    setFiltroModalidade(isSaude || isEmaee ? 'todos' : 'regular')
  }, [isSaude, isEmaee])

  /* ── Carregar funcionários ───────────────────────────────── */
  const carregarFuncionarios = useCallback(async () => {
    setCarregando(true)
    try {
      await verificarEAtualizarRetornosAfastamentos(supabase)
      const isRhRedeOnly = useAuthStore.getState().isRhRedeExclusivo()
      const isAdminUser = useAuthStore.getState().isAdminGlobalOrRoot() || isRhRedeOnly
      const authEscolaId = useAuthStore.getState().escolaAtivaId
      const currentSelectedEscola = useSchoolStore.getState().selectedEscola
      const currentSelectedSecretaria = useSchoolStore.getState().selectedSecretaria
      const todasEscolas = useSchoolStore.getState().escolas

      let escolaIdsFiltradas: string[] | null = null
      
      // Priorizar a escola selecionada no header (para admins), a menos que seja usuário exclusivo de RH da Rede
      const escolaAtivaEfetiva = isRhRedeOnly ? null : (currentSelectedEscola?.id || authEscolaId)

      if (escolaAtivaEfetiva) {
        escolaIdsFiltradas = [escolaAtivaEfetiva]
      } else if (currentSelectedSecretaria && !isRhRedeOnly) {
        const secId = currentSelectedSecretaria.id
        const secNome = (currentSelectedSecretaria.nome || '').toLowerCase()
        const matching = todasEscolas.filter(e => {
          if (secId && e.secretaria_id === secId) return true
          if (secNome && (e.secretariaNome?.toLowerCase().includes(secNome) || (e.secretarias as any)?.nome?.toLowerCase().includes(secNome))) return true
          return false
        })
        escolaIdsFiltradas = matching.map(e => e.id)
      }

      const mustFilterVinculos = !isRhRedeOnly && (escolaIdsFiltradas !== null || !isAdminUser)

      const selectFields = `
        id, nome, apelido, email, cpf, cargo, status, formacao, foto_url, foto_avatar_path, foto_visualizacao_path, foto_updated_at, data_nascimento, is_superadmin, is_conta_especial,
        endereco, latitude, longitude, telefone, modalidade_ensino, tipo_vinculo,
        vinculos_funcionarios(escola_id, cargo, ativo, escolas(nome, secretaria_id)),
        acessos_usuarios(nivel, escola_id, ativo)
      `

      let query = supabase
        .from('funcionarios')
        .select(selectFields)
        .is('deleted_at', null)
        .order('nome')

      if (escolaIdsFiltradas !== null) {
        if (escolaIdsFiltradas.length === 0) {
          setFuncionarios([])
          return
        }
      }


      const { data, error } = await query
      if (error) throw error

      const isDirUser = useAuthStore.getState().isDiretor()
      const vistos = new Set()

      const formatados: Funcionario[] = (data ?? [])
        .filter((f: Record<string, any>) => {
          if (f.is_conta_especial) return false
          if (vistos.has(f.id)) return false

          // Se houver escolas filtradas, valida se o funcionário possui vínculo ou acesso a uma delas
          if (escolaIdsFiltradas && escolaIdsFiltradas.length > 0 && !isAdminUser) {
            const vincs = (f.vinculos_funcionarios as Array<{ escola_id: string; ativo: boolean }>) ?? []
            const acs = (f.acessos_usuarios as Array<{ escola_id?: string | null; ativo: boolean }>) ?? []
            const temVinc = vincs.some(v => v.ativo && escolaIdsFiltradas!.includes(v.escola_id))
            const temAc = acs.some(a => a.ativo && a.escola_id && escolaIdsFiltradas!.includes(a.escola_id))
            if (!temVinc && !temAc) return false
          }

          vistos.add(f.id)

          if (escolaAtivaEfetiva) {
            if (f.is_superadmin) return false
            if (
              f.nome?.toLowerCase() === 'root' ||
              f.email?.toLowerCase().startsWith('root@')
            )
              return false

            const acessosList =
              (f.acessos_usuarios as Array<{
                nivel: number | null
                ativo: boolean
              }>) ?? []
            if (acessosList.some((a) => a.nivel === 1 && a.ativo)) {
              return false
            }
          }
          if (isDirUser) {
            if (f.is_superadmin) return false
            if (
              f.nome?.toLowerCase() === 'root' ||
              f.email?.toLowerCase().startsWith('root@')
            )
              return false

            const acessosList =
              (f.acessos_usuarios as Array<{
                nivel: number | null
                escola_id?: string | null
                ativo: boolean
              }>) ?? []
            if (
              acessosList.some(
                (a) => a.ativo && (a.nivel === 1 || (a.nivel === 2 && a.escola_id !== escolaAtivaEfetiva))
              )
            ) {
              return false
            }
          }
          return true
        })
        .map((f: Record<string, any>) => {
          const vincs =
            (f.vinculos_funcionarios as Array<Record<string, unknown>>) ?? []
          const acs =
            (f.acessos_usuarios as Array<Record<string, unknown>>) ?? []
          const vinculoAtivo = vincs.find((v) => v.ativo)
          const acessoAtivo = acs.find((a) => a.ativo && a.escola_id)
          
          let nomeEscola: string | null = (vinculoAtivo?.escolas as { nome: string } | null)?.nome ?? null
          if (!nomeEscola && acessoAtivo?.escola_id) {
            const esc = todasEscolas.find(e => e.id === acessoAtivo.escola_id)
            if (esc) nomeEscola = esc.nome
          }

          return {
            id: f.id as string,
            nome: f.nome as string,
            apelido: f.apelido as string | null,
            email: f.email as string,
            cpf: f.cpf as string | null,
            cargo: f.cargo as string | null,
            status: (f.status as string) ?? 'ativo',
            formacao: f.formacao as string | null,
            foto_url: f.foto_url as string | null,
            foto_avatar_path: f.foto_avatar_path as string | null,
            foto_visualizacao_path: f.foto_visualizacao_path as string | null,
            foto_updated_at: f.foto_updated_at as string | null,
            data_nascimento: f.data_nascimento as string | null,
            is_superadmin: f.is_superadmin as boolean | null,
            orgao: nomeEscola,
            endereco: f.endereco as string | null,
            latitude: f.latitude ? Number(f.latitude) : null,
            longitude: f.longitude ? Number(f.longitude) : null,
            telefone: f.telefone as string | null,
            modalidade_ensino: f.modalidade_ensino as string | null,
            tipo_vinculo: f.tipo_vinculo as string | null
          }
        })

      setFuncionarios(formatados)
    } catch (err) {
      console.error('Erro ao carregar funcionários:', err)
      toast.error('Erro ao carregar lista de funcionários.')
    } finally {
      setCarregando(false)
    }
  }, [supabase])

  useEffect(() => {
    carregarFuncionarios()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEscola?.id, selectedSecretaria?.id, selectedSecretaria?.nome, carregarFuncionarios])

  /* ── Listas para dropdowns ─────────────────────────────────── */
  const cargosUnicos = useMemo(() => {
    const set = new Set<string>()

    // Cargos cadastrados no superpainel (tabela public.cargos)
    cargosCadastrados.forEach((nome) => {
      const trimmed = nome.trim()
      if (trimmed) set.add(trimmed)
    })

    // Cargos atribuídos aos funcionários atuais (fallback para vínculos antigos)
    funcionarios.forEach((f) => {
      const trimmed = (f.cargo ?? '').trim()
      if (trimmed) set.add(trimmed)
    })

    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [cargosCadastrados, funcionarios])

  const escolasUnicas = useMemo(() => {
    const set = new Set(
      funcionarios.map((f) => f.orgao).filter(Boolean) as string[]
    )
    return Array.from(set).sort()
  }, [funcionarios])

  /* ── Filtro ─────────────────────────────────────────────────── */
  const funcionariosBuscados = useLocalSearch(funcionarios, busca, ['nome', 'email', 'cpf', 'orgao', 'apelido', 'telefone'])

  const funcsFiltrados = useMemo(() => {
    return funcionariosBuscados.filter((f) => {
      const matchCargo = filtroCargo === 'todos' || f.cargo === filtroCargo

      const matchStatus =
        filtroStatus === 'todos' ||
        (f.status ?? '').toLowerCase() === filtroStatus.toLowerCase()

      let matchModalidade = false
      if (isSaude) {
        const vinc = (f.tipo_vinculo ?? '').trim().toLowerCase()
        matchModalidade =
          filtroModalidade === 'todos' ||
          vinc.includes(filtroModalidade) // ex: 'efetivo' vs 'Efetivo', 'nomeado' vs 'Nomeado'
      } else {
        const mod = (f.modalidade_ensino ?? '').trim().toUpperCase()
        matchModalidade =
          filtroModalidade === 'todos' ||
          (filtroModalidade === 'eja' ? mod === 'EJA' : mod !== 'EJA')
      }

      return matchCargo && matchStatus && matchModalidade
    })
  }, [funcionariosBuscados, filtroCargo, filtroStatus, filtroModalidade, isSaude])

  /* ── Ação de Desligar ────────────────────────────────────────── */
  const handleDesligar = async (func: Funcionario) => {
    // Validar trava global de edição da rede (< Nível 1)
    const isLevel1 = authFuncionario?.is_superadmin || (isAdminGlobalOrRoot && isAdminGlobalOrRoot()) || acessos?.some((a: any) => a.nivel === 1 && a.ativo)

    if (!isLevel1) {
      const configRede = await buscarConfigBloqueioRede(supabase)
      const travaAtiva = await verificarTravaEdicaoFuncionario(configRede, func.id, supabase)
      if (travaAtiva) {
        toast.error('A edição e desligamento de funcionários foram temporariamente bloqueados pela gestão da rede.')
        return
      }
    }

    if (
      !confirm(
        `Deseja desligar o funcionário "${func.nome}"? Ele será desvinculado de todas as turmas, matérias e acessos.`
      )
    )
      return

    await executeWithToast({
      action: async () => {
        const { error } = await supabase
          .from('funcionarios')
          .update({ status: 'desligado' })
          .eq('id', func.id)
        if (error) throw error
      },
      successMessage: `Funcionário "${func.nome}" desligado com sucesso.`,
      errorMessage: 'Erro ao desligar funcionário',
      onSuccess: carregarFuncionarios,
    })
  }

  return {
    funcionarios,
    carregando,
    funcsFiltrados,
    cargosUnicos,
    escolasUnicas,
    busca,
    setBusca,
    filtroCargo,
    setFiltroCargo,
    filtroStatus,
    setFiltroStatus,
    filtroModalidade,
    setFiltroModalidade,
    carregarFuncionarios,
    handleDesligar,
    resetFiltros,
    isSaude,
    isEmaee
  }
}
