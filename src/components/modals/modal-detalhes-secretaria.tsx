'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabaseClient'
import {
  Building2, Plus, Edit, RefreshCw, User, Search, School, Stethoscope,
  Calendar, UserCheck, Printer, Paperclip, LayoutGrid, Briefcase,
  ChevronDown, ChevronRight, Trash2, Loader2,
} from 'lucide-react'
import { ModalEscola } from '@/components/modals/modal-escola'
import { ModalCalendarioAcademico } from '@/components/modals/modal-calendario-academico'
import { ImportDataActions } from '@/components/admin/ImportDataActions'
import { useSchoolStore } from '@/store/useSchoolStore'
import { useAuthStore } from '@/store/useAuthStore'
import { toast } from 'sonner'
import { softDeleteToTrash } from '@/lib/audit/audit-agent'
import { executeWithToast } from '@/lib/action-handler'

// Dynamic imports — carregados sob demanda para não aumentar o bundle inicial
const ModalConfigSecretario = dynamic(
  () => import('@/components/modals/modal-config-secretario').then(m => m.ModalConfigSecretario),
  { ssr: false }
)
const ModalGerenciarFilaImpressao = dynamic(
  () => import('@/components/modals/modal-gerenciar-fila-impressao').then(m => m.ModalGerenciarFilaImpressao),
  { ssr: false }
)
const ModalConfigAnexosEscola = dynamic(
  () => import('@/components/modals/modal-config-anexos-escola').then(m => m.ModalConfigAnexosEscola),
  { ssr: false }
)
const ModalContasPaisEscola = dynamic(
  () => import('@/components/modals/modal-contas-pais-escola').then(m => m.ModalContasPaisEscola),
  { ssr: false }
)
const ModalCargo = dynamic(
  () => import('@/components/modals/modal-cargo').then(m => m.ModalCargo),
  { ssr: false }
)

/* ─────────────────────────── types ─────────────────────────── */

interface ModalDetalhesSecretariaProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  secretaria: {
    id: string
    nome: string
    logo_url?: string | null
    ativo?: boolean
  } | null
  onUpdate?: () => void
}

/* ─────────────────────────── component ─────────────────────── */

export function ModalDetalhesSecretaria({
  open,
  onOpenChange,
  secretaria,
  onUpdate,
}: ModalDetalhesSecretariaProps) {
  const { funcionario } = useAuthStore()
  const supabase = createClient()

  /* ── Unidades ── */
  const [unidades, setUnidades] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [busca, setBusca] = useState('')
  const [modalNovaEscolaOpen, setModalNovaEscolaOpen] = useState(false)
  const [escolaToEdit, setEscolaToEdit] = useState<any | null>(null)

  /* ── Ações por Unidade ── */
  const [escolaParaAnexos, setEscolaParaAnexos] = useState<any | null>(null)
  const [configAnexosOpen, setConfigAnexosOpen] = useState(false)
  const [escolaParaPais, setEscolaParaPais] = useState<any | null>(null)
  const [contasPaisOpen, setContasPaisOpen] = useState(false)

  /* ── Modais de Educação ── */
  const [modalCalendarioOpen, setModalCalendarioOpen] = useState(false)
  const [modalTitularOpen, setModalTitularOpen] = useState(false)
  const [modalFilaImpressaoOpen, setModalFilaImpressaoOpen] = useState(false)

  /* ── Acordeon: Cargos ── */
  const [cargosOpen, setCargosOpen] = useState(false)
  const [cargos, setCargos] = useState<any[]>([])
  const [loadingCargos, setLoadingCargos] = useState(false)
  const [modalCargoOpen, setModalCargoOpen] = useState(false)
  const [cargoToEdit, setCargoToEdit] = useState<any | null>(null)

  /* ── Misc ── */
  const sessionTimestamp = useRef(Date.now()).current
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => { isMounted.current = false }
  }, [])

  /* ── Loaders ── */
  const loadUnidades = async () => {
    if (!secretaria?.id) return
    setLoading(true)

    const { data, error } = await supabase
      .from('escolas')
      .select(
        'id, nome, inep, tipo, ativo, logo_url, codigo, localizacao, latitude, longitude, diretor_id, secretaria_id, portal_pais_ativo, portal_comunicacoes_ativo, eja_ativo, anexos_padrao, funcionarios:diretor_id(nome, cargo)'
      )
      .eq('secretaria_id', secretaria.id)
      .is('deleted_at', null)
      .order('nome', { ascending: true })

    if (!isMounted.current) return

    if (error) {
      console.error('Erro ao carregar unidades da secretaria:', error)
      toast.error('Erro ao carregar unidades vinculadas.')
    } else {
      setUnidades(data || [])
    }
    setLoading(false)
  }

  const loadCargos = async () => {
    if (!secretaria?.id) return
    setLoadingCargos(true)

    const { data, error } = await supabase
      .from('cargos')
      .select('*')
      .eq('secretaria_id', secretaria.id)
      .is('deleted_at', null)
      .order('nivel', { ascending: true })

    if (!isMounted.current) return

    if (error) {
      console.error('Erro ao carregar cargos:', error)
      toast.error('Erro ao carregar os cargos desta secretaria.')
    } else {
      setCargos(data || [])
    }
    setLoadingCargos(false)
  }

  /* ── Effects ── */

  // Carrega unidades ao abrir; reseta TUDO ao fechar ou ao trocar de secretaria
  useEffect(() => {
    if (open && secretaria?.id) {
      // Limpa estado anterior ANTES de carregar o novo para evitar flash de dados
      setUnidades([])
      setCargos([])
      setCargosOpen(false)
      setBusca('')
      loadUnidades()
      useSchoolStore.getState().setSelectedSecretaria({ id: secretaria.id, nome: secretaria.nome })
    } else {
      // Modal fechado — limpa tudo
      setUnidades([])
      setCargosOpen(false)
      setCargos([])
      setBusca('')
    }
  }, [open, secretaria?.id])

  // Carrega cargos quando acordeon abre (lazy load)
  // Inclui secretaria?.id na dependência para forçar reload se a secretaria mudar
  useEffect(() => {
    if (cargosOpen && secretaria?.id) {
      // Sempre recarrega ao abrir o acordeon (dados podem ter mudado)
      loadCargos()
    }
  }, [cargosOpen, secretaria?.id])

  /* ── Handlers ── */
  const handleNovaUnidade = () => {
    setEscolaToEdit(null)
    setModalNovaEscolaOpen(true)
  }

  const handleEditarUnidade = (u: any) => {
    setEscolaToEdit(u)
    setModalNovaEscolaOpen(true)
  }

  const handleExcluirCargo = async (cargo: any) => {
    const confirm = window.confirm(
      `Deseja realmente mover o cargo "${cargo.nome}" para a Lixeira Global?`
    )
    if (!confirm) return

    await executeWithToast({
      action: () =>
        softDeleteToTrash({
          supabase,
          tableName: 'cargos',
          recordId: cargo.id,
          recordSummary: cargo.nome,
          recordPayload: cargo,
          performedBy: {
            id: funcionario?.id ?? null,
            name: funcionario?.nome || 'Administrador',
            email: funcionario?.email || 'admin@super.com',
          },
        }),
      setLoading: setLoadingCargos,
      successMessage: 'Cargo enviado para a Lixeira Global!',
      errorMessage: 'Erro ao excluir cargo',
      onSuccess: loadCargos,
    })
  }

  /* ── Early exit ── */
  if (!secretaria) return null

  const isEducacao = /educa/i.test(secretaria.nome)
  const isSaude = /sa[uú]de/i.test(secretaria.nome)

  const termoUnidade = isEducacao
    ? 'Unidades Escolares'
    : isSaude
    ? 'Unidades de Saúde da Rede'
    : 'Unidades Administrativas'

  const termoSingular = isEducacao
    ? 'Unidade Escolar'
    : isSaude
    ? 'Unidade de Saúde'
    : 'Unidade Administrativa'

  const unidadesFiltradas = unidades.filter(
    u =>
      u.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (u.inep || '').toLowerCase().includes(busca.toLowerCase()) ||
      (u.funcionarios?.nome || '').toLowerCase().includes(busca.toLowerCase())
  )

  /* ─────────────────────────── render ────────────────────────── */
  return (
    <>
      <StandardDialog
        open={open}
        onOpenChange={onOpenChange}
        title={secretaria.nome}
        description={`Gestão de ${termoUnidade.toLowerCase()} e cargos deste órgão.`}
        maxWidth="sm:max-w-4xl"
        footer={
          <div className="flex items-center justify-between w-full pt-3 border-t border-border">
            <span className="text-xs text-muted-foreground">
              <strong>{unidades.length}</strong>{' '}
              {unidades.length === 1 ? termoSingular : termoUnidade}
              {cargos.length > 0 && !loadingCargos && (
                <span className="ml-3">
                  · <strong>{cargos.length}</strong> cargo(s)
                </span>
              )}
            </span>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-border text-foreground hover:bg-muted"
            >
              Fechar
            </Button>
          </div>
        }
      >
        <div className="space-y-5 py-2">
          {/* ══ Header Card da Secretaria ══ */}
          <div className="bg-gradient-to-r from-sky-500/10 via-sky-500/5 to-transparent border border-sky-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Identidade */}
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-white border border-sky-500/30 flex items-center justify-center shrink-0 overflow-hidden">
                {secretaria.logo_url ? (
                  <img
                    src={`${secretaria.logo_url}?t=${sessionTimestamp}`}
                    alt={secretaria.nome}
                    className="w-full h-full object-contain p-1"
                  />
                ) : isSaude ? (
                  <Stethoscope className="w-6 h-6 text-rose-400" />
                ) : (
                  <Building2 className="w-6 h-6 text-sky-400" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground tracking-tight flex items-center gap-2">
                  {secretaria.nome}
                  <Badge
                    variant="outline"
                    className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30 text-[10px]"
                  >
                    Ativa
                  </Badge>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Órgão Mantenedor oficial da Rede Municipal
                </p>
              </div>
            </div>

            {/* Ações do Header */}
            <div className="flex flex-wrap items-center gap-2 shrink-0 self-end sm:self-auto">
              {/* Titular / Secretário (exclusivo Educação) */}
              {isEducacao && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalTitularOpen(true)}
                  className="bg-card border-border text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-muted font-semibold text-xs rounded-xl gap-1.5 h-9"
                  title="Configurar Titular da Secretaria de Educação"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Titular</span>
                </Button>
              )}

              {/* Fila de Impressão (exclusivo Educação) */}
              {isEducacao && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalFilaImpressaoOpen(true)}
                  className="bg-card border-border text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-muted font-semibold text-xs rounded-xl gap-1.5 h-9"
                  title="Gerenciar Fila de Impressão das Escolas"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Fila de Impressão</span>
                </Button>
              )}

              {/* Calendário Acadêmico (exclusivo Educação) */}
              {isEducacao && (
                <Button
                  type="button"
                  onClick={() => setModalCalendarioOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl gap-1.5 shrink-0 cursor-pointer h-9 shadow-sm"
                  title="Gerenciar Calendário Acadêmico e Trimestres da Rede"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Calendário Acadêmico</span>
                </Button>
              )}

              {/* Importação de Dados */}
              <ImportDataActions
                secretariaIdFilter={secretaria.id}
                onSuccess={loadUnidades}
              />

              {/* Nova Unidade */}
              <Button
                type="button"
                onClick={handleNovaUnidade}
                className="bg-[#0090ff] text-white hover:bg-[#0077d4] text-xs font-semibold rounded-xl gap-1.5 shrink-0 cursor-pointer h-9"
              >
                <Plus className="w-4 h-4" />
                <span>+ Nova Unidade</span>
              </Button>
            </div>
          </div>

          {/* ══ Barra de Busca e Atualização ══ */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 bg-background border border-border px-3 py-1.5 rounded-xl flex-1">
              <Search className="w-4 h-4 text-muted-foreground/60 shrink-0" />
              <input
                type="text"
                placeholder="Buscar por nome ou responsável..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="bg-transparent border-none text-foreground text-xs outline-none w-full placeholder:text-muted-foreground/50"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadUnidades}
              disabled={loading}
              className="border-border text-foreground hover:bg-muted rounded-xl text-xs gap-1.5 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </Button>
          </div>

          {/* ══ Lista de Unidades ══ */}
          {loading ? (
            <div className="py-12 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-primary" />
              <span>Carregando unidades filhas...</span>
            </div>
          ) : unidadesFiltradas.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground bg-muted/20 rounded-2xl border border-dashed border-border space-y-3">
              <Building2 className="w-8 h-8 text-muted-foreground/40 mx-auto" />
              <div>
                <p className="text-sm font-semibold text-foreground">Nenhuma unidade encontrada</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {unidades.length === 0
                    ? `Esta secretaria ainda não possui ${termoUnidade.toLowerCase()} vinculadas.`
                    : 'Tente ajustar os termos de busca.'}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={handleNovaUnidade}
                className="bg-[#0090ff]/20 text-[#0090ff] hover:bg-[#0090ff]/30 border border-[#0090ff]/30 text-xs font-semibold rounded-xl gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Cadastrar Primeira Unidade</span>
              </Button>
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {unidadesFiltradas.map(u => {
                const gestorNome = u.funcionarios?.nome ?? 'Sem gestor atribuído'
                const temModulosAtivos =
                  u.portal_pais_ativo || u.portal_comunicacoes_ativo || u.eja_ativo
                return (
                  <div
                    key={u.id}
                    className="p-3.5 bg-card border border-border hover:border-borderCustom/80 rounded-xl flex items-center justify-between gap-3 transition-colors shadow-sm"
                  >
                    {/* Info da unidade */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center overflow-hidden shrink-0">
                        {u.logo_url ? (
                          <img
                            src={`${u.logo_url}?t=${sessionTimestamp}`}
                            alt={u.nome}
                            className="w-full h-full object-contain p-0.5"
                          />
                        ) : isEducacao ? (
                          <School className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                        ) : (
                          <Building2 className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-foreground truncate flex items-center gap-2">
                          {u.nome}
                          {u.inep && isEducacao && (
                            <span className="text-[10px] text-muted-foreground/60 font-mono font-normal">
                              INEP: {u.inep}
                            </span>
                          )}
                        </h4>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                          <User className="w-3 h-3 text-muted-foreground/60 shrink-0" />
                          <span>{isEducacao ? 'Diretor' : 'Gestor'}: {gestorNome}</span>
                        </p>
                      </div>
                    </div>

                    {/* Ações da unidade */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge
                        variant="outline"
                        className={`text-[10px] mr-1 ${
                          u.ativo !== false
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30'
                            : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30'
                        }`}
                      >
                        {u.ativo !== false ? 'ATIVA' : 'INATIVA'}
                      </Badge>

                      {/* Módulos (Portal Pais, EJA, Comunicações) */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEscolaParaPais(u)
                          setContasPaisOpen(true)
                        }}
                        className={
                          temModulosAtivos
                            ? 'h-8 w-8 p-0 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg'
                            : 'h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg'
                        }
                        title="Módulos da Unidade (Portal Pais, EJA, Comunicações)"
                      >
                        <LayoutGrid className="w-4 h-4" />
                      </Button>

                      {/* Anexos Padrão */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEscolaParaAnexos(u)
                          setConfigAnexosOpen(true)
                        }}
                        className="h-8 w-8 p-0 text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg"
                        title="Configurar Anexos Padrão"
                      >
                        <Paperclip className="w-4 h-4" />
                      </Button>

                      {/* Editar */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditarUnidade(u)}
                        className="h-8 w-8 p-0 text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 rounded-lg cursor-pointer"
                        title="Editar Unidade"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ══ Acordeon: Cargos da Secretaria ══ */}
          <div className="border border-border rounded-2xl overflow-hidden">
            {/* Header do acordeon */}
            <button
              type="button"
              onClick={() => setCargosOpen(prev => !prev)}
              className="w-full flex items-center justify-between px-4 py-3 bg-card hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Briefcase className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="text-sm font-bold text-foreground">
                  Cargos da Secretaria
                </span>
                {cargos.length > 0 && !loadingCargos && (
                  <span className="text-[11px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25 px-2 py-0.5 rounded-full font-bold">
                    {cargos.length} cargo(s)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {cargosOpen && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={e => {
                      e.stopPropagation()
                      setCargoToEdit({ secretaria_id: secretaria.id })
                      setModalCargoOpen(true)
                    }}
                    className="h-7 px-2.5 text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Novo Cargo
                  </Button>
                )}
                {cargosOpen ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </button>

            {/* Conteúdo do acordeon */}
            {cargosOpen && (
              <div className="px-4 pb-4 pt-2 bg-card border-t border-border/50 space-y-2">
                {loadingCargos ? (
                  <div className="py-6 flex items-center justify-center text-xs text-muted-foreground gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                    Carregando cargos...
                  </div>
                ) : cargos.length === 0 ? (
                  <div className="py-6 text-center text-muted-foreground text-xs bg-muted/20 rounded-xl border border-dashed border-border space-y-2">
                    <Briefcase className="w-6 h-6 text-amber-500/40 mx-auto" />
                    <p>Nenhum cargo cadastrado para esta secretaria.</p>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setCargoToEdit({ secretaria_id: secretaria.id })
                        setModalCargoOpen(true)
                      }}
                      className="h-7 px-3 text-xs bg-amber-500/20 text-amber-700 dark:text-amber-400 hover:bg-amber-500/30 border border-amber-500/30 font-semibold rounded-lg gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Cadastrar Primeiro Cargo
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-[250px] overflow-y-auto pr-0.5">
                    {cargos.map(cargo => (
                      <div
                        key={cargo.id}
                        className="flex items-center justify-between p-3 rounded-xl border bg-background border-border hover:border-borderCustom gap-3"
                      >
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-foreground flex items-center gap-2 flex-wrap">
                            {cargo.nome}
                            <span className="px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-700 dark:text-purple-300 text-[10px] uppercase font-bold tracking-wider border border-purple-500/30">
                              Nível {cargo.nivel}
                            </span>
                          </h4>
                          {cargo.salario_base && (
                            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                              Salário Base: R${' '}
                              {Number(cargo.salario_base).toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                              })}
                            </p>
                          )}
                        </div>

                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setCargoToEdit(cargo)
                              setModalCargoOpen(true)
                            }}
                            className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-500/10 h-8 w-8 p-0 rounded-lg"
                            title="Editar Cargo"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleExcluirCargo(cargo)}
                            className="text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-500/10 h-8 w-8 p-0 rounded-lg"
                            title="Excluir Cargo (Lixeira)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </StandardDialog>

      {/* ── Sub-modais ── */}

      {/* Modal de Criação / Edição de Unidade */}
      {modalNovaEscolaOpen && (
        <ModalEscola
          open={modalNovaEscolaOpen}
          onOpenChange={setModalNovaEscolaOpen}
          escolaToEdit={escolaToEdit}
          secretariaIdPreSelected={secretaria.id}
          onSuccess={() => {
            loadUnidades()
            if (onUpdate) onUpdate()
          }}
        />
      )}

      {/* Modal de Calendário Acadêmico da Rede */}
      {modalCalendarioOpen && (
        <ModalCalendarioAcademico
          open={modalCalendarioOpen}
          onOpenChange={setModalCalendarioOpen}
          secretariaId={secretaria.id}
          secretariaNome={secretaria.nome}
        />
      )}

      {/* Modal Titular / Secretário de Educação */}
      {modalTitularOpen && (
        <ModalConfigSecretario
          open={modalTitularOpen}
          onOpenChange={setModalTitularOpen}
        />
      )}

      {/* Modal Fila de Impressão (Educação) */}
      {modalFilaImpressaoOpen && (
        <ModalGerenciarFilaImpressao
          open={modalFilaImpressaoOpen}
          onOpenChange={setModalFilaImpressaoOpen}
        />
      )}

      {/* Modal Configurar Anexos Padrão da Unidade */}
      {escolaParaAnexos && (
        <ModalConfigAnexosEscola
          open={configAnexosOpen}
          onOpenChange={setConfigAnexosOpen}
          escola={escolaParaAnexos}
          onSuccess={loadUnidades}
        />
      )}

      {/* Modal Módulos / Portal dos Pais por Unidade */}
      {contasPaisOpen && escolaParaPais && (
        <ModalContasPaisEscola
          escola={escolaParaPais}
          open={contasPaisOpen}
          onClose={() => {
            setContasPaisOpen(false)
            setEscolaParaPais(null)
          }}
          onTogglePortal={novoEstado => {
            setUnidades(prev =>
              prev.map(e =>
                e.id === escolaParaPais.id
                  ? { ...e, portal_pais_ativo: novoEstado, ...(!novoEstado ? { portal_comunicacoes_ativo: false } : {}) }
                  : e
              )
            )
          }}
          onToggleComunicacoes={novoEstado => {
            setUnidades(prev =>
              prev.map(e =>
                e.id === escolaParaPais.id ? { ...e, portal_comunicacoes_ativo: novoEstado } : e
              )
            )
          }}
          onToggleEja={novoEstado => {
            setUnidades(prev =>
              prev.map(e =>
                e.id === escolaParaPais.id ? { ...e, eja_ativo: novoEstado } : e
              )
            )
          }}
        />
      )}

      {/* Modal de Cargo (Criação / Edição) */}
      {modalCargoOpen && (
        <ModalCargo
          open={modalCargoOpen}
          onOpenChange={setModalCargoOpen}
          cargoToEdit={cargoToEdit}
          onSuccess={loadCargos}
        />
      )}
    </>
  )
}
