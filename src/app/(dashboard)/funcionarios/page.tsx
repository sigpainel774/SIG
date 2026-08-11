'use client'

import { useState } from 'react'
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
  const { isAdminGlobalOrRoot, isDiretor } = useAuthStore()
  const { isEditMode } = useEditModeStore()
  const isAdmin = isAdminGlobalOrRoot()
  const isDir = isDiretor()
  const canManagePermissions = isAdmin || isDir

  const [viewMode, setViewMode] = useState<'lista' | 'permissoes'>('lista')

  /* Modais */
  const [modalNovoOpen, setModalNovoOpen] = useState(false)
  const [modalEditando, setModalEditando] = useState<Funcionario | null>(null)
  const [modalLotacoesOpen, setModalLotacoesOpen] = useState(false)
  const [funcLotacaoInicial, setFuncLotacaoInicial] = useState<{ id: string } | null>(null)

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
    isSaude,
    isEmaee
  } = useFuncionarios()

  const { handleImprimir, handleImprimirLista } = useImprimirFuncionario()

  /* ── Ações dos cards ────────────────────────────────────────── */
  const handleAbrirLotacoes = (func: Funcionario) => {
    setFuncLotacaoInicial({ id: func.id })
    setModalLotacoesOpen(true)
  }

  const handleEditar = (func: Funcionario) => {
    setModalEditando(func)
  }

  const handlePrintLista = () => {
    handleImprimirLista(funcsFiltrados, filtroCargo)
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
            Gestão de Funcionários
          </h1>
        </div>

        {/* Toggle Triplo de Modalidade ou Vínculo */}
        {!isEmaee && (
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
        )}
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
            handleImprimirLista={handlePrintLista}
            setModalNovoOpen={setModalNovoOpen}
          />

          {/* ── Grade de Cards / Listagem ───────────────────────────── */}
          <FuncionariosList
            carregando={carregando}
            funcsFiltrados={funcsFiltrados as any}
            isEditMode={isEditMode}
            handleAbrirLotacoes={handleAbrirLotacoes as any}
            handleImprimir={handleImprimir}
            handleEditar={handleEditar as any}
            handleDesligar={handleDesligar as any}
          />
        </>
      )}
    </div>
  )
}
