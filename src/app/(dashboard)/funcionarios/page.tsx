'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Users } from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const ModalFuncionario = dynamic(
  () =>
    import('@/components/modals/modal-funcionario').then(
      (mod) => mod.ModalFuncionario
    ),
  { ssr: false }
)
const ModalGestaoLotacoes = dynamic(
  () =>
    import('@/components/modals/modal-gestao-lotacoes').then(
      (mod) => mod.ModalGestaoLotacoes
    ),
  { ssr: false }
)
const PermissoesView = dynamic(
  () => import('@/components/PermissoesView').then((mod) => mod.PermissoesView),
  { ssr: false }
)
import { createClient } from '@/lib/supabaseClient'
import { softDeleteToTrash } from '@/lib/audit/audit-agent'
import { useAuthStore } from '@/store/useAuthStore'
import { useSchoolStore } from '@/store/useSchoolStore'
import { useEditModeStore } from '@/store/useEditModeStore'
import { toast } from 'sonner'
import { IconTile } from '@/components/ui/icon-tile'
import { useLocalSearch } from '@/hooks/useLocalSearch'
import { executeWithToast } from '@/lib/action-handler'
import { cn } from '@/lib/utils'

// Novos Componentes e Helpers
import { FuncionariosQuickActions } from '@/components/funcionarios/FuncionariosQuickActions'
import { FuncionariosFilters } from '@/components/funcionarios/FuncionariosFilters'
import { FuncionariosList } from '@/components/funcionarios/FuncionariosList'
import {
  gerarFichaFuncionarioHtml,
  gerarListaFuncionariosHtml
} from '@/lib/funcionariosPrint'
import { verificarEAtualizarRetornosAfastamentos } from '@/lib/afastamentosHelper'

/* ─── Tipo Funcionário ─────────────────────────────────────── */

export interface Funcionario {
  id: string
  nome: string
  apelido?: string | null
  email: string
  cpf?: string | null
  cargo?: string | null
  status: string
  orgao?: string | null
  data_nascimento?: string | null
  formacao?: string | null
  foto_url?: string | null
  is_superadmin?: boolean | null
  is_conta_especial?: boolean | null
  endereco?: string | null
  latitude?: number | null
  longitude?: number | null
  telefone?: string | null
  modalidade_ensino?: string | null
  tipo_vinculo?: string | null
}

export default function FuncionariosPage() {
  const supabase = createClient()
  const {
    funcionario: authFuncionario,
    acessos,
    isAdminGlobalOrRoot,
    isDiretor
  } = useAuthStore()
  const selectedEscola = useSchoolStore((state) => state.selectedEscola)
  const selectedSecretaria = useSchoolStore((state) => state.selectedSecretaria)
  const isSaude = selectedSecretaria?.nome?.toLowerCase().includes('saúde') || false
  const { isEditMode } = useEditModeStore()
  const isAdmin = isAdminGlobalOrRoot()
  const isDir = isDiretor()
  const canManagePermissions = isAdmin || isDir

  const [viewMode, setViewMode] = useState<'lista' | 'permissoes'>('lista')

  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [cargosCadastrados, setCargosCadastrados] = useState<string[]>([])
  const [carregando, setCarregando] = useState(true)

  /* Filtros */
  const [busca, setBusca] = useState('')
  const [filtroCargo, setFiltroCargo] = useState('todos')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [filtroModalidade, setFiltroModalidade] = useState<string>(isSaude ? 'todos' : 'regular')

  /* Modais */
  const [modalNovoOpen, setModalNovoOpen] = useState(false)
  const [modalEditando, setModalEditando] = useState<Funcionario | null>(null)
  const [modalLotacoesOpen, setModalLotacoesOpen] = useState(false)
  const [funcLotacaoInicial, setFuncLotacaoInicial] = useState<{
    id: string
  } | null>(null)

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

  /* ── Carregar funcionários ───────────────────────────────── */

  const carregarFuncionarios = async () => {
    setCarregando(true)
    try {
      await verificarEAtualizarRetornosAfastamentos(supabase)
      const isAdminUser = useAuthStore.getState().isAdminGlobalOrRoot()
      const escolaId = useAuthStore.getState().escolaAtivaId
      const currentSelectedSecretaria = useSchoolStore.getState().selectedSecretaria
      const todasEscolas = useSchoolStore.getState().escolas

      let escolaIdsFiltradas: string[] | null = null
      if (escolaId) {
        escolaIdsFiltradas = [escolaId]
      } else if (currentSelectedSecretaria) {
        const secId = currentSelectedSecretaria.id
        const secNome = (currentSelectedSecretaria.nome || '').toLowerCase()
        const matching = todasEscolas.filter(e => {
          if (secId && e.secretaria_id === secId) return true
          if (secNome && (e.secretariaNome?.toLowerCase().includes(secNome) || (e.secretarias as any)?.nome?.toLowerCase().includes(secNome))) return true
          return false
        })
        escolaIdsFiltradas = matching.map(e => e.id)
      }

      const mustFilterVinculos = escolaIdsFiltradas !== null || !isAdminUser

      const selectFields = mustFilterVinculos
        ? `
          id, nome, apelido, email, cpf, cargo, status, formacao, foto_url, foto_avatar_path, foto_visualizacao_path, foto_updated_at, data_nascimento, is_superadmin, is_conta_especial,
          endereco, latitude, longitude, telefone, modalidade_ensino, tipo_vinculo,
          vinculos_funcionarios!inner(escola_id, cargo, ativo, escolas(nome, secretaria_id)),
          acessos_usuarios(nivel, ativo)
        `
        : `
          id, nome, apelido, email, cpf, cargo, status, formacao, foto_url, foto_avatar_path, foto_visualizacao_path, foto_updated_at, data_nascimento, is_superadmin, is_conta_especial,
          endereco, latitude, longitude, telefone, modalidade_ensino, tipo_vinculo,
          vinculos_funcionarios(escola_id, cargo, ativo, escolas(nome, secretaria_id)),
          acessos_usuarios(nivel, ativo)
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
        query = query
          .in('vinculos_funcionarios.escola_id', escolaIdsFiltradas)
          .eq('vinculos_funcionarios.ativo', true)
      } else if (!isAdminUser) {
        if (!escolaId) {
          setFuncionarios([])
          return
        }
        query = query
          .eq('vinculos_funcionarios.escola_id', escolaId)
          .eq('vinculos_funcionarios.ativo', true)
      }

      const { data, error } = await query
      if (error) throw error

      const isDirUser = useAuthStore.getState().isDiretor()
      const vistos = new Set()

      const formatados: Funcionario[] = (data ?? [])
        .filter((f: Record<string, any>) => {
          if (f.is_conta_especial) return false
          if (vistos.has(f.id)) return false
          vistos.add(f.id)

          if (escolaId) {
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
                (a) => a.ativo && (a.nivel === 1 || (a.nivel === 2 && a.escola_id !== escolaId))
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
          const vinculoAtivo = vincs.find((v) => v.ativo)
          const escola = vinculoAtivo?.escolas as { nome: string } | null

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
            orgao: escola?.nome ?? null,
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
  }

  useEffect(() => {
    carregarFuncionarios()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEscola?.id, selectedSecretaria?.id, selectedSecretaria?.nome])

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

  /* ── Ações dos cards ────────────────────────────────────────── */

  const handleAbrirLotacoes = (func: Funcionario) => {
    setFuncLotacaoInicial({ id: func.id })
    setModalLotacoesOpen(true)
  }

  const handleEditar = (func: Funcionario) => {
    setModalEditando(func)
  }

  const handleDesligar = async (func: Funcionario) => {
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

  const handleImprimir = async (funcId: string) => {
    const loadingToast = toast.loading(
      'Buscando dados da ficha do funcionário...'
    )
    try {
      const { data: f, error } = await supabase
        .from('funcionarios')
        .select(
          `
          *,
          vinculos_funcionarios(
            escola_id,
            cargo,
            ativo,
            escolas(nome, inep, localizacao, logo_url)
          )
        `
        )
        .eq('id', funcId)
        .maybeSingle()

      toast.dismiss(loadingToast)
      if (error || !f) {
        toast.error('Erro ao buscar dados do funcionário.')
        return
      }

      const activeVinc = f.vinculos_funcionarios?.find((v: any) => v.ativo)
      const schoolLogoUrl = activeVinc?.escolas?.logo_url ?? null

      // Formatar Doenças
      const listDoencas = []
      if (f.doenca_diabetes) listDoencas.push('Diabetes')
      if (f.doenca_convulsoes) listDoencas.push('Convulsões')
      if (f.doenca_asma_bronquite) listDoencas.push('Asma / Bronquite')
      if (f.doenca_infeccoes) listDoencas.push('Infecções')
      if (f.doenca_cardiopatias) listDoencas.push('Cardiopatias')
      if (f.doenca_alergias) listDoencas.push('Alergias')
      if (f.doenca_covid19) listDoencas.push('Covid-19')
      if (f.doenca_articulares) listDoencas.push('Doenças Articulares')
      if (f.doenca_outra) listDoencas.push(`Outra: ${f.doenca_outra}`)
      const doencasStr =
        listDoencas.length > 0 ? listDoencas.join(', ') : 'Nenhuma'

      // Formatar Deficiências
      const defsList = []
      if (f.possui_deficiencia) {
        if (f.deficiencias && f.deficiencias.length > 0) {
          defsList.push(...f.deficiencias)
        }
        if (f.tea) defsList.push('TEA (Transtorno do Espectro Autista)')
        if (f.altas_habilidades)
          defsList.push('Altas habilidades / Superdotação')
      }
      const defsStr = defsList.length > 0 ? defsList.join(', ') : 'Nenhuma'

      // Formatar Pós-Graduações
      const posList = Array.isArray(f.pos_graduacoes) ? f.pos_graduacoes : []
      const posHtml =
        posList.length > 0
          ? posList
              .map(
                (p: any) => `
            <div class="pos-item">
              <strong>${p.tipo ?? ''}</strong> em ${p.area ?? ''} (${
                  p.situacao === 'Cursando' ? 'Cursando - Previsão:' : 'Conclusão:'
                } ${p.ano ?? ''})
            </div>
          `
              )
              .join('')
          : 'Nenhuma pós-graduação cadastrada'

      // Outros cursos
      const outrosCursosStr =
        f.outros_cursos && f.outros_cursos.length > 0
          ? f.outros_cursos.join(', ')
          : 'Nenhum'

      // Documentos anexados
      const docsAnexadosList = []
      if (f.doc_identidade_url) docsAnexadosList.push('Identidade (RG)')
      if (f.doc_cpf_url) docsAnexadosList.push('CPF')
      if (f.doc_comprovante_residencia_url)
        docsAnexadosList.push('Comprovante de Residência')
      if (f.doc_ensino_fundamental_url)
        docsAnexadosList.push('Comp. Escolaridade: Fundamental')
      if (f.doc_ensino_medio_url)
        docsAnexadosList.push('Comp. Escolaridade: Médio')
      if (f.doc_curso_superior_url)
        docsAnexadosList.push('Comp. Escolaridade: Superior')
      if (f.doc_pos_graduacao_url)
        docsAnexadosList.push('Comp. Escolaridade: Pós-Graduação')
      if (f.doc_mestrado_url) docsAnexadosList.push('Comp. Escolaridade: Mestrado')
      if (f.doc_doutorado_url) docsAnexadosList.push('Comp. Escolaridade: Doutorado')
      const docsAnexadosStr =
        docsAnexadosList.length > 0 ? docsAnexadosList.join(', ') : 'Nenhum'

      const supabaseUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL ||
        'https://nijjizpcodnjhvqwjuso.supabase.co'
      const isRootOrNivel1 =
        isAdminGlobalOrRoot() ||
        (acessos && acessos.some((a: any) => a.nivel === 1 && a.ativo))
      const defaultEducacaoLogoUrl = `${supabaseUrl}/storage/v1/object/public/alunos-anexos/logos/sec_1785727158753_educacao_final.png`
      const defaultSaudeLogoUrl = `${supabaseUrl}/storage/v1/object/public/alunos-anexos/logos/sec_1785815672933_saude_oficial.png`
      const logoSecretariaUrl = isSaude ? defaultSaudeLogoUrl : defaultEducacaoLogoUrl
      const logoDireitoUrl = isRootOrNivel1
        ? logoSecretariaUrl
        : schoolLogoUrl
        ? `${schoolLogoUrl}?t=${Date.now()}`
        : logoSecretariaUrl

      const win = window.open('', '_blank', 'width=900,height=900')
      if (!win) {
        toast.warning(
          'O bloqueador de pop-ups impediu a visualização da impressão. Por favor, autorize pop-ups para este site.'
        )
        return
      }

      const html = gerarFichaFuncionarioHtml(
        f,
        `${supabaseUrl}/storage/v1/object/public/logos/logo-prefeitura.png?t=${Date.now()}`,
        logoDireitoUrl,
        logoSecretariaUrl,
        doencasStr,
        defsStr,
        posHtml,
        outrosCursosStr,
        docsAnexadosStr
      )
      win.document.write(html)
      win.document.close()
    } catch (err: any) {
      toast.error('Erro ao gerar a ficha de impressão: ' + err.message)
      console.error(err)
    }
  }

  const handleImprimirLista = () => {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      'https://nijjizpcodnjhvqwjuso.supabase.co'
    const logoPrefeituraUrl = `${supabaseUrl}/storage/v1/object/public/logos/logo-prefeitura.png?t=${Date.now()}`
    const logoSecretariaUrl = `${supabaseUrl}/storage/v1/object/public/logos/logo-secretaria.jpg?t=${Date.now()}`
    const isRootOrNivel1 =
      isAdminGlobalOrRoot() ||
      (acessos && acessos.some((a: any) => a.nivel === 1 && a.ativo))
    const logoEscolaAtivaUrl = selectedEscola?.logo_url || null
    const logoDireitoUrl = isRootOrNivel1
      ? logoSecretariaUrl
      : logoEscolaAtivaUrl
      ? `${logoEscolaAtivaUrl}?t=${Date.now()}`
      : logoSecretariaUrl

    // Imprimir a lista filtrada exibida na tela
    const funcsParaImprimir = funcsFiltrados

    // Legenda dos filtros para o cabeçalho do documento
    const legendaEscola = selectedEscola?.nome ?? 'Todas as Escolas'
    const legendaCargo =
      filtroCargo === 'todos' ? 'Todos os Cargos' : filtroCargo

    const win = window.open('', '_blank', 'width=1000,height=800')
    if (!win) {
      toast.warning(
        'O bloqueador de pop-ups impediu a visualização da impressão. Por favor, autorize pop-ups para este site.'
      )
      return
    }

    const html = gerarListaFuncionariosHtml(
      funcsParaImprimir,
      logoPrefeituraUrl,
      logoDireitoUrl,
      logoSecretariaUrl,
      legendaEscola,
      legendaCargo
    )
    win.document.write(html)
    win.document.close()
  }

  /* ── Render ─────────────────────────────────────────────────── */

  return (
    <div
      className={cn(
        "space-y-5 pb-12 transition-all duration-500 relative min-h-screen",
        filtroModalidade === 'eja' && "bg-eja-pattern"
      )}
    >
      {/* Modal Novo Funcionário */}
      {modalNovoOpen && (
        <ModalFuncionario
          open={modalNovoOpen}
          onOpenChange={setModalNovoOpen}
          onSuccess={carregarFuncionarios}
        />
      )}

      {/* Modal Editar Funcionário */}
      {!!modalEditando && (
        <ModalFuncionario
          open={!!modalEditando}
          onOpenChange={(v) => {
            if (!v) setModalEditando(null)
          }}
          funcionario={modalEditando}
          onSuccess={carregarFuncionarios}
        />
      )}

      {/* Modal Gestão de Lotações */}
      {modalLotacoesOpen && (
        <ModalGestaoLotacoes
          open={modalLotacoesOpen}
          onOpenChange={(v) => {
            setModalLotacoesOpen(v)
            if (!v) carregarFuncionarios()
          }}
          funcionarioInicial={funcLotacaoInicial}
        />
      )}

      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Link href="/home">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <IconTile
            icon={Users}
            variant="primary"
            className="h-10 w-10 shrink-0"
          />
          <h1 className="text-2xl font-bold text-foreground">
            Gestão de Funcionários
          </h1>
        </div>

        {/* Toggle Triplo de Modalidade ou Vínculo */}
        <div className="inline-flex items-center bg-[#141416] p-1 rounded-xl border border-[#26262a] shadow-inner self-start sm:self-auto overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setFiltroModalidade('todos')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              filtroModalidade === 'todos'
                ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Todos
          </button>
          
          {!isSaude && (
            <>
              <button
                type="button"
                onClick={() => setFiltroModalidade('regular')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  filtroModalidade === 'regular'
                    ? 'bg-blue-500/20 text-[#3ea6ff] border border-blue-500/40 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Regular
              </button>
              <button
                type="button"
                onClick={() => setFiltroModalidade('eja')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  filtroModalidade === 'eja'
                    ? 'bg-[#c85a17] text-white shadow-md shadow-orange-500/30 border border-orange-400 font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                EJA
              </button>
            </>
          )}

          {isSaude && (
            <>
              <button
                type="button"
                onClick={() => setFiltroModalidade('efetivo')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  filtroModalidade === 'efetivo'
                    ? 'bg-blue-500/20 text-[#3ea6ff] border border-blue-500/40 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Efetivos
              </button>
              <button
                type="button"
                onClick={() => setFiltroModalidade('contratado')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  filtroModalidade === 'contratado'
                    ? 'bg-[#c85a17] text-white shadow-md shadow-orange-500/30 border border-orange-400 font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Contratados
              </button>
              <button
                type="button"
                onClick={() => setFiltroModalidade('nomeado')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  filtroModalidade === 'nomeado'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Nomeados
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Painel de Ações Rápidas ─────────────────────────── */}
      <FuncionariosQuickActions
        canManagePermissions={canManagePermissions}
        viewMode={viewMode}
        setViewMode={setViewMode}
        setModalLotacoesOpen={setModalLotacoesOpen}
        setFuncLotacaoInicial={setFuncLotacaoInicial}
      />

      {viewMode === 'permissoes' ? (
        <div className="animate-in fade-in duration-200">
          <PermissoesView onBack={() => setViewMode('lista')} />
        </div>
      ) : (
        <>
          {/* ── Barra de ferramentas / Filtros ─────────────────────── */}
          <FuncionariosFilters
            isEditMode={isEditMode}
            busca={busca}
            setBusca={setBusca}
            filtroCargo={filtroCargo}
            setFiltroCargo={setFiltroCargo}
            filtroStatus={filtroStatus}
            setFiltroStatus={setFiltroStatus}
            cargosUnicos={cargosUnicos}
            handleImprimirLista={handleImprimirLista}
            setModalNovoOpen={setModalNovoOpen}
          />

          {/* ── Grade de Cards / Listagem ───────────────────────────── */}
          <FuncionariosList
            carregando={carregando}
            funcsFiltrados={funcsFiltrados}
            isEditMode={isEditMode}
            handleAbrirLotacoes={handleAbrirLotacoes}
            handleImprimir={handleImprimir}
            handleEditar={handleEditar}
            handleDesligar={handleDesligar}
          />
        </>
      )}
    </div>
  )
}
