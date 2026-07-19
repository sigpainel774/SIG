'use client'

import Link from 'next/link'
import { FileCheck, Network, ShieldCheck, Banknote } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FuncionariosQuickActionsProps {
  canManagePermissions: boolean
  viewMode: 'lista' | 'permissoes'
  setViewMode: (mode: 'lista' | 'permissoes') => void
  setModalLotacoesOpen: (open: boolean) => void
  setFuncLotacaoInicial: (val: any) => void
}

export function FuncionariosQuickActions({
  canManagePermissions,
  viewMode,
  setViewMode,
  setModalLotacoesOpen,
  setFuncLotacaoInicial
}: FuncionariosQuickActionsProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-4 mb-6',
        canManagePermissions
          ? 'sm:grid-cols-2 lg:grid-cols-4'
          : 'sm:grid-cols-3'
      )}
    >
      {/* Atestados Médicos */}
      <Link href="/atestados" className="group">
        <div className="bg-surface-1 hover:bg-hoverCustom border border-border hover:border-success/30 rounded-2xl p-5 flex items-center gap-4 transition-all duration-200 shadow-md cursor-pointer h-full">
          <div className="p-3 rounded-xl bg-success/10 text-success group-hover:scale-105 transition-transform duration-200">
            <FileCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm leading-tight">
              Atestados Médicos
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Registrar e gerenciar atestados e afastamentos
            </p>
          </div>
        </div>
      </Link>

      {/* Gestão de Lotações */}
      <div
        onClick={() => {
          setFuncLotacaoInicial(null)
          setModalLotacoesOpen(true)
        }}
        className="group bg-surface-1 hover:bg-hoverCustom border border-border hover:border-primary/30 rounded-2xl p-5 flex items-center gap-4 transition-all duration-200 shadow-md cursor-pointer"
      >
        <div className="p-3 rounded-xl bg-primary/10 text-primary group-hover:scale-105 transition-transform duration-200">
          <Network className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground text-sm leading-tight">
            Gestão de Lotações
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Alocar funcionários em turmas e escolas
          </p>
        </div>
      </div>

      {/* Controle de Acesso (ABAC) */}
      {canManagePermissions && (
        <div
          onClick={() => setViewMode(viewMode === 'lista' ? 'permissoes' : 'lista')}
          className={cn(
            'group border rounded-2xl p-5 flex items-center gap-4 transition-all duration-200 shadow-md cursor-pointer',
            viewMode === 'permissoes'
              ? 'bg-primary/5 border-primary text-primary'
              : 'bg-surface-1 border-border hover:bg-hoverCustom hover:border-primary/30 text-foreground'
          )}
        >
          <div
            className={cn(
              'p-3 rounded-xl group-hover:scale-105 transition-transform duration-200',
              viewMode === 'permissoes'
                ? 'bg-primary/20 text-primary'
                : 'bg-primary/10 text-primary'
            )}
          >
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-sm leading-tight">
              Permissões & Acessos
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {viewMode === 'permissoes'
                ? 'Voltar para a listagem principal de servidores'
                : 'Configurar permissões e cargos de acesso'}
            </p>
          </div>
        </div>
      )}

      {/* Folha de Pagamento */}
      <Link href="/financeiro" className="group">
        <div className="bg-surface-1 hover:bg-hoverCustom border border-border hover:border-purple-500/30 rounded-2xl p-5 flex items-center gap-4 transition-all duration-200 shadow-md cursor-pointer h-full">
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-500 group-hover:scale-105 transition-transform duration-200">
            <Banknote className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm leading-tight">
              Folha Financeira
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Visualizar folha de pagamento e proventos
            </p>
          </div>
        </div>
      </Link>
    </div>
  )
}
