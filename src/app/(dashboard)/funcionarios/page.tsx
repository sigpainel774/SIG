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

// Novos Componentes e Helpers
import { FuncionariosQuickActions } from '@/components/funcionarios/FuncionariosQuickActions'
import { FuncionariosFilters } from '@/components/funcionarios/FuncionariosFilters'
import { FuncionariosList } from '@/components/funcionarios/FuncionariosList'
import {
  gerarFichaFuncionarioHtml,
  gerarListaFuncionariosHtml
} from '@/lib/funcionariosPrint'

/* ─── Tipo Funcionário ─────────────────────────────────────── */

export interface Funcionario {
  id: string
  nome: string
  email: string
  cpf?: string | null
  cargo?: string | null
  status: string
  orgao?: string | null
  data_nascimento?: string | null
  formacao?: string | null
  foto_url?: string | null
  is_superadmin?: boolean | null
  endereco?: string | null
  latitude?: number | null
  longitude?: number | null
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
  const { isEditMode } = useEditModeStore()
  const isAdmin = isAdminGlobalOrRoot()
  const isDir = isDiretor()
  const canManagePermissions = isAdmin || isDir

  const [viewMode, setViewMode] = useState<'lista' | 'permissoes'>('lista')

  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [carregando, setCarregando] = useState(true)

  /* Filtros */
  const [busca, setBusca] = useState('')
  const [filtroCargo, setFiltroCargo] = useState('todos')
  const [filtroStatus, setFiltroStatus] = useState('todos')

  /* Filtros de Impressão */
  const [filtroImpEscola, setFiltroImpEscola] = useState('todas')
  const [filtroImpCargo, setFiltroImpCargo] = useState('todos')

  /* Modais */
  const [modalNovoOpen, setModalNovoOpen] = useState(false)
  const [modalEditando, setModalEditando] = useState<Funcionario | null>(null)
  const [modalLotacoesOpen, setModalLotacoesOpen] = useState(false)
  const [funcLotacaoInicial, setFuncLotacaoInicial] = useState<{
    id: string
  } | null>(null)

  /* ── Carregar funcionários ───────────────────────────────── */

  const carregarFuncionarios = async () => {
    setCarregando(true)
    try {
      const isAdminUser = useAuthStore.getState().isAdminGlobalOrRoot()
      const escolaId = useAuthStore.getState().escolaAtivaId

      // Define os campos dinamicamente. Se houver escolaId, faz INNER JOIN imediato via PostgREST
      const selectFields =
        escolaId || !isAdminUser
          ? `
          id, nome, email, cpf, cargo, status, formacao, foto_url, data_nascimento, is_superadmin,
          endereco, latitude, longitude,
          vinculos_funcionarios!vinculos_funcionarios_funcionario_id_fkey!inner(escola_id, cargo, ativo, escolas(nome)),
          acessos_usuarios(nivel, ativo)
        `
          : `
          id, nome, email, cpf, cargo, status, formacao, foto_url, data_nascimento, is_superadmin,
          endereco, latitude, longitude,
          vinculos_funcionarios(escola_id, cargo, ativo, escolas(nome)),
          acessos_usuarios(nivel, ativo)
        `

      let query = supabase
        .from('funcionarios')
        .select(selectFields)
        .is('deleted_at', null)
        .order('nome')

      if (escolaId || !isAdminUser) {
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
          // Desduplicação defensiva caso o mesmo funcionário tenha mais de um vínculo ativo na mesma escola
          if (vistos.has(f.id)) return false
          vistos.add(f.id)

          // Se estiver visualizando o painel de uma escola ativa, oculta root e nível 1
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
            // Se for diretor (nível 2), só deve enxergar nível 3 para baixo, portanto oculta superadmin, root, nível 1 e nível 2
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
            if (
              acessosList.some(
                (a) => (a.nivel === 1 || a.nivel === 2) && a.ativo
              )
            ) {
              return false
            }
          }
          return true
        })
        .map((f: Record<string, any>) => {
          // Pegar o primeiro vínculo ativo como órgão principal
          const vincs =
            (f.vinculos_funcionarios as Array<Record<string, unknown>>) ?? []
          const vinculoAtivo = vincs.find((v) => v.ativo)
          const escola = vinculoAtivo?.escolas as { nome: string } | null

          return {
            id: f.id as string,
            nome: f.nome as string,
            email: f.email as string,
            cpf: f.cpf as string | null,
            cargo: f.cargo as string | null,
            status: (f.status as string) ?? 'ativo',
            formacao: f.formacao as string | null,
            foto_url: f.foto_url as string | null,
            data_nascimento: f.data_nascimento as string | null,
            is_superadmin: f.is_superadmin as boolean | null,
            orgao: escola?.nome ?? null,
            endereco: f.endereco as string | null,
            latitude: f.latitude ? Number(f.latitude) : null,
            longitude: f.longitude ? Number(f.longitude) : null
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
  }, [])

  /* ── Listas para dropdowns ─────────────────────────────────── */

  const cargosUnicos = useMemo(() => {
    const set = new Set(
      funcionarios.map((f) => f.cargo).filter(Boolean) as string[]
    )
    return Array.from(set).sort()
  }, [funcionarios])

  const escolasUnicas = useMemo(() => {
    const set = new Set(
      funcionarios.map((f) => f.orgao).filter(Boolean) as string[]
    )
    return Array.from(set).sort()
  }, [funcionarios])

  /* ── Filtro ─────────────────────────────────────────────────── */

  const funcsFiltrados = useMemo(() => {
    return funcionarios.filter((f) => {
      const matchBusca =
        f.nome.toLowerCase().includes(busca.toLowerCase()) ||
        f.email.toLowerCase().includes(busca.toLowerCase()) ||
        (f.cpf ?? '').includes(busca) ||
        (f.orgao ?? '').toLowerCase().includes(busca.toLowerCase())

      const matchCargo = filtroCargo === 'todos' || f.cargo === filtroCargo

      const matchStatus =
        filtroStatus === 'todos' ||
        (f.status ?? '').toLowerCase() === filtroStatus.toLowerCase()

      return matchBusca && matchCargo && matchStatus
    })
  }, [funcionarios, busca, filtroCargo, filtroStatus])

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

    try {
      const { error } = await supabase
        .from('funcionarios')
        .update({ status: 'desligado' })
        .eq('id', func.id)

      if (error) throw error

      toast.success(`Funcionário "${func.nome}" desligado com sucesso.`)
      await carregarFuncionarios()
    } catch (err) {
      toast.error('Erro ao desligar funcionário.')
      console.error(err)
    }
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
              <strong>${p.tipo ?? ''}</strong> em ${p.area ?? ''} (Conclusão: ${
                  p.ano ?? ''
                })
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
      const logoSecretariaUrl = `${supabaseUrl}/storage/v1/object/public/logos/logo-secretaria.jpg?t=${Date.now()}`
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

    // Aplicar filtros de impressão sobre a lista já filtrada pela tela
    const funcsParaImprimir = funcsFiltrados.filter((f) => {
      const matchEscola =
        filtroImpEscola === 'todas' || (f.orgao ?? '') === filtroImpEscola
      const matchCargo =
        filtroImpCargo === 'todos' || (f.cargo ?? '') === filtroImpCargo
      return matchEscola && matchCargo
    })

    // Legenda dos filtros para o cabeçalho do documento
    const legendaEscola =
      filtroImpEscola === 'todas' ? 'Todas as Escolas' : filtroImpEscola
    const legendaCargo =
      filtroImpCargo === 'todos' ? 'Todos os Cargos' : filtroImpCargo

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
    <div className="space-y-5 pb-12">
      {/* Modal Novo Funcionário */}
      <ModalFuncionario
        open={modalNovoOpen}
        onOpenChange={setModalNovoOpen}
        onSuccess={carregarFuncionarios}
      />

      {/* Modal Editar Funcionário */}
      <ModalFuncionario
        open={!!modalEditando}
        onOpenChange={(v) => {
          if (!v) setModalEditando(null)
        }}
        funcionario={modalEditando}
        onSuccess={carregarFuncionarios}
      />

      {/* Modal Gestão de Lotações */}
      <ModalGestaoLotacoes
        open={modalLotacoesOpen}
        onOpenChange={setModalLotacoesOpen}
        funcionarioInicial={funcLotacaoInicial}
      />

      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-2 pb-4 border-b border-border">
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
            filtroImpEscola={filtroImpEscola}
            setFiltroImpEscola={setFiltroImpEscola}
            filtroImpCargo={filtroImpCargo}
            setFiltroImpCargo={setFiltroImpCargo}
            cargosUnicos={cargosUnicos}
            escolasUnicas={escolasUnicas}
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
