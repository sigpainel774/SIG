'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Users } from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabaseClient'

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
const ModalImprimirFichaFuncionario = dynamic(
  () =>
    import('@/components/modals/modal-imprimir-ficha-funcionario').then(
      (mod) => mod.ModalImprimirFichaFuncionario
    ),
  { ssr: false }
)
const ModalMovimentacoes = dynamic(
  () =>
    import('@/components/modals/modal-movimentacoes').then(
      (mod) => mod.ModalMovimentacoes
    ),
  { ssr: false }
)

import { useAuthStore } from '@/store/useAuthStore'
import { useEditModeStore } from '@/store/useEditModeStore'
import { IconTile } from '@/components/ui/icon-tile'
import { cn } from '@/lib/utils'

// Novos Componentes e Helpers
import { FuncionariosQuickActions } from '@/components/funcionarios/FuncionariosQuickActions'
import { FuncionariosFilters } from '@/components/funcionarios/FuncionariosFilters'
import { FuncionariosList } from '@/components/funcionarios/FuncionariosList'

// Hooks Customizados
import { useFuncionarios } from '@/hooks/useFuncionarios'
import { useImprimirFuncionario } from '@/hooks/useImprimirFuncionario'
import { Funcionario } from '@/types/funcionario'

export default function FuncionariosPage() {
  const { isAdminGlobalOrRoot, isDiretor, getAcessosAtivos, escolaAtivaId } = useAuthStore()
  const { isEditMode } = useEditModeStore()
  const isAdmin = isAdminGlobalOrRoot()
  const isDir = isDiretor()
  const [podeSecretarioPermissoes, setPodeSecretarioPermissoes] = useState(false)
  const canManagePermissions = isAdmin || isDir || podeSecretarioPermissoes

  useEffect(() => {
    let isMounted = true
    if (isAdmin || isDir) {
      setPodeSecretarioPermissoes(true)
      return
    }

    const acessos = getAcessosAtivos()
    const acessosNivel3 = acessos.filter(a => a.nivel === 3 && a.ativo)
    
    if (acessosNivel3.length === 0) {
      setPodeSecretarioPermissoes(false)
      return
    }

    async function checarPermissaoSecretaria() {
      try {
        const supabase = createClient()
        const ids = acessosNivel3.map(a => a.id).filter(Boolean)
        if (ids.length === 0) return

        const { data, error } = await (supabase as any)
          .from('acessos_usuarios_permissoes')
          .select('permitido, acesso_usuario_id')
          .in('acesso_usuario_id', ids)
          .eq('permissao', 'servidores.gerenciar_permissoes')
          .eq('permitido', true)

        if (!error && data && data.length > 0 && isMounted) {
          setPodeSecretarioPermissoes(true)
        } else if (isMounted) {
          setPodeSecretarioPermissoes(false)
        }
      } catch {
        if (isMounted) setPodeSecretarioPermissoes(false)
      }
    }

    checarPermissaoSecretaria()
    return () => {
      isMounted = false
    }
  }, [isAdmin, isDir, getAcessosAtivos, escolaAtivaId])

  const [viewMode, setViewMode] = useState<'lista' | 'permissoes'>('lista')

  /* Modais */
  const [modalNovoOpen, setModalNovoOpen] = useState(false)
  const [modalEditando, setModalEditando] = useState<Funcionario | null>(null)
  const [modalLotacoesOpen, setModalLotacoesOpen] = useState(false)
  const [funcLotacaoInicial, setFuncLotacaoInicial] = useState<{ id: string } | null>(null)
  const [funcIdImprimir, setFuncIdImprimir] = useState<string | null>(null)
  const [funcMovimentacoes, setFuncMovimentacoes] = useState<Funcionario | null>(null)

  /* ── Hooks de Estado e Impressão ───────────────────────────── */
  const {
    carregando,
    funcsFiltrados,
    cargosUnicos,
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
  } = useFuncionarios()

  const { handleImprimirLista } = useImprimirFuncionario()

  /* ── Ações dos cards ────────────────────────────────────────── */
  const handleAbrirLotacoes = (func: Funcionario) => {
    setFuncLotacaoInicial({ id: func.id })
    setModalLotacoesOpen(true)
  }

  const handleAbrirMovimentacoes = (func: Funcionario) => {
    setFuncMovimentacoes(func)
  }

  const handleEditar = (func: Funcionario) => {
    setModalEditando(func)
  }

  const handlePrintLista = () => {
    handleImprimirLista(funcsFiltrados, filtroCargo)
  }

  const handleAbrirImprimirFicha = async (funcId: string) => {
    setFuncIdImprimir(funcId)
  }

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <div
      className={cn(
        "space-y-5 pb-12 transition-all duration-500 relative min-h-screen",
        filtroModalidade === 'eja' && "bg-eja-pattern"
      )}
    >
      {/* Modal Imprimir Ficha do Funcionário */}
      {!!funcIdImprimir && (
        <ModalImprimirFichaFuncionario
          open={!!funcIdImprimir}
          onOpenChange={(v) => {
            if (!v) setFuncIdImprimir(null)
          }}
          funcionarioId={funcIdImprimir}
        />
      )}

      {/* Modal Histórico de Movimentações */}
      {!!funcMovimentacoes && (
        <ModalMovimentacoes
          open={!!funcMovimentacoes}
          onOpenChange={(v) => {
            if (!v) setFuncMovimentacoes(null)
          }}
          funcionario={funcMovimentacoes as any}
        />
      )}

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
          funcionario={modalEditando as any}
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
            {isEmaee || isSaude ? 'Gestão de Servidores' : 'Gestão de Funcionários'}
          </h1>
        </div>

        {/* Toggle Triplo de Modalidade ou Vínculo */}
        {!isEmaee && (
          <div className="inline-flex items-center bg-slate-200/80 dark:bg-[#141416] p-1 rounded-xl border border-slate-300/70 dark:border-[#26262a] shadow-inner self-start sm:self-auto overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setFiltroModalidade('todos')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              filtroModalidade === 'todos'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-300 dark:border-zinc-700 shadow-sm'
                : 'text-zinc-600 dark:text-muted-foreground hover:text-zinc-900 dark:hover:text-foreground'
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
                    ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-[#3ea6ff] border border-blue-200 dark:border-blue-500/40 shadow-sm font-semibold'
                    : 'text-zinc-600 dark:text-muted-foreground hover:text-zinc-900 dark:hover:text-foreground'
                }`}
              >
                Regular
              </button>
              <button
                type="button"
                onClick={() => setFiltroModalidade('eja')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  filtroModalidade === 'eja'
                    ? 'bg-orange-500 dark:bg-[#c85a17] text-white shadow-md shadow-orange-500/20 dark:shadow-orange-500/30 border border-orange-400 font-bold'
                    : 'text-zinc-600 dark:text-muted-foreground hover:text-zinc-900 dark:hover:text-foreground'
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
                    ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-[#3ea6ff] border border-blue-200 dark:border-blue-500/40 shadow-sm font-semibold'
                    : 'text-zinc-600 dark:text-muted-foreground hover:text-zinc-900 dark:hover:text-foreground'
                }`}
              >
                Efetivos
              </button>
              <button
                type="button"
                onClick={() => setFiltroModalidade('contratado')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  filtroModalidade === 'contratado'
                    ? 'bg-orange-500 dark:bg-[#c85a17] text-white shadow-md shadow-orange-500/20 dark:shadow-orange-500/30 border border-orange-400 font-bold'
                    : 'text-zinc-600 dark:text-muted-foreground hover:text-zinc-900 dark:hover:text-foreground'
                }`}
              >
                Contratados
              </button>
              <button
                type="button"
                onClick={() => setFiltroModalidade('nomeado')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  filtroModalidade === 'nomeado'
                    ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/40 shadow-sm font-bold'
                    : 'text-zinc-600 dark:text-muted-foreground hover:text-zinc-900 dark:hover:text-foreground'
                }`}
              >
                Nomeados
              </button>
            </>
          )}
          </div>
        )}
      </div>

      {/* ── Painel de Ações Rápidas ─────────────────────────── */}
      <FuncionariosQuickActions
        canManagePermissions={canManagePermissions}
        viewMode={viewMode}
        setViewMode={setViewMode}
        setModalLotacoesOpen={setModalLotacoesOpen}
        setFuncLotacaoInicial={setFuncLotacaoInicial}
        isEmaee={isEmaee}
        isSaude={isSaude}
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
            handleImprimirLista={handlePrintLista}
            setModalNovoOpen={setModalNovoOpen}
            isEmaee={isEmaee}
            isSaude={isSaude}
          />

          {/* ── Grade de Cards / Listagem ───────────────────────────── */}
          <FuncionariosList
            carregando={carregando}
            funcsFiltrados={funcsFiltrados as any}
            isEditMode={isEditMode}
            handleAbrirLotacoes={handleAbrirLotacoes as any}
            handleAbrirMovimentacoes={handleAbrirMovimentacoes as any}
            handleImprimir={handleAbrirImprimirFicha}
            handleEditar={handleEditar as any}
            handleDesligar={handleDesligar as any}
            onResetFiltros={resetFiltros}
            isEmaee={isEmaee}
            isSaude={isSaude}
          />
        </>
      )}
    </div>
  )
}
