'use client'

import { ArrowLeft, Shield, Users, School } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ModalConfirmacaoSenha } from '@/components/modals/modal-confirmacao-senha'
import { usePermissoes } from './usePermissoes'
import { PermissoesForm } from './PermissoesForm'
import { PermissoesFilters } from './PermissoesFilters'
import { PermissoesList } from './PermissoesList'

interface PermissoesViewProps {
  onBack?: () => void
}

export function PermissoesView({ onBack }: PermissoesViewProps) {
  const hook = usePermissoes()

  const {
    modoAtribuicao,
    setModoAtribuicao,
    modalSenhaOpen,
    setModalSenhaOpen,
    escolas,
    loading,
    buscaLista,
    setBuscaLista,
    filtroNivel,
    setFiltroNivel,
    filtroEscola,
    setFiltroEscola,
    registrosFiltrados,
    registrosAgrupadosPorEscola,
    isEditActive,
    limparFiltros,
    handleClickEditCard,
    setEditMode,
  } = hook

  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              type="button"
              onClick={onBack}
              className="text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <Shield className="w-8 h-8 text-[#0090ff]" />
              Permissões
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Gerencie os níveis de acesso de cada funcionário por escola ou órgão.
            </p>
          </div>
        </div>

        {/* Botões de alternância */}
        <div className="flex items-center gap-2 bg-surface-2 border border-borderCustom rounded-xl p-1">
          <button
            type="button"
            onClick={() => setModoAtribuicao('funcionario')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all cursor-pointer ${
              modoAtribuicao === 'funcionario'
                ? 'bg-[#0090ff] text-white shadow-md'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Por Funcionário</span>
          </button>
          <button
            type="button"
            onClick={() => setModoAtribuicao('escola')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all cursor-pointer ${
              modoAtribuicao === 'escola'
                ? 'bg-[#0090ff] text-white shadow-md'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <School className="w-4 h-4" />
            <span>Por Escola</span>
          </button>
        </div>
      </div>

      {/* ── Card: Atribuir Acesso ─────────────────────────────────────────── */}
      <PermissoesForm hook={hook} />

      {/* ── Card: Lista de Permissões ─────────────────────────────────────── */}
      <div className="bg-card border border-borderCustom rounded-2xl p-6 shadow-md space-y-4">
        <PermissoesFilters
          buscaLista={buscaLista}
          setBuscaLista={setBuscaLista}
          filtroNivel={filtroNivel}
          setFiltroNivel={setFiltroNivel}
          filtroEscola={filtroEscola}
          setFiltroEscola={setFiltroEscola}
          escolas={escolas}
          totalFiltrados={registrosFiltrados.length}
          limparFiltros={limparFiltros}
        />

        <PermissoesList
          loading={loading}
          modoAtribuicao={modoAtribuicao}
          registrosFiltrados={registrosFiltrados}
          registrosAgrupadosPorEscola={registrosAgrupadosPorEscola}
          isEditActive={isEditActive}
          onClickEditCard={handleClickEditCard}
        />
      </div>

      {/* Modal de Senha */}
      <ModalConfirmacaoSenha
        open={modalSenhaOpen}
        onOpenChange={setModalSenhaOpen}
        onSuccess={() => setEditMode(true)}
      />
    </div>
  )
}
