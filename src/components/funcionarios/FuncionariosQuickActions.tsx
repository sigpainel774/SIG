'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FileCheck, Network, ShieldCheck, Banknote, Construction } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'

interface FuncionariosQuickActionsProps {
  canManagePermissions: boolean
  viewMode: 'lista' | 'permissoes'
  setViewMode: (mode: 'lista' | 'permissoes') => void
  setModalLotacoesOpen: (open: boolean) => void
  setFuncLotacaoInicial: (val: any) => void
  isEmaee?: boolean
  isSaude?: boolean
}

export function FuncionariosQuickActions({
  canManagePermissions,
  viewMode,
  setViewMode,
  setModalLotacoesOpen,
  setFuncLotacaoInicial,
  isEmaee,
  isSaude
}: FuncionariosQuickActionsProps) {
  const [isEmDesenvolvimentoOpen, setIsEmDesenvolvimentoOpen] = useState(false)

  return (
    <>
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
              Alocar servidores
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

        {/* Folha Financeira (Módulo em Desenvolvimento) */}
        <div
          onClick={() => setIsEmDesenvolvimentoOpen(true)}
          className="group bg-surface-1 hover:bg-hoverCustom border border-border hover:border-purple-500/30 rounded-2xl p-5 flex items-center gap-4 transition-all duration-200 shadow-md cursor-pointer h-full"
        >
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
      </div>

      {/* Modal de Alerta: Módulo em Desenvolvimento */}
      <StandardDialog
        open={isEmDesenvolvimentoOpen}
        onOpenChange={setIsEmDesenvolvimentoOpen}
        title="Módulo em Desenvolvimento"
        description="A funcionalidade de Folha Financeira está atualmente em fase de desenvolvimento."
        maxWidth="sm:max-w-[450px]"
        footer={
          <div className="flex justify-center w-full pt-2">
            <Button
              type="button"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl h-10 px-6 cursor-pointer"
              onClick={() => setIsEmDesenvolvimentoOpen(false)}
            >
              Entendido
            </Button>
          </div>
        }
      >
        <div className="flex flex-col items-center text-center py-4 space-y-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Construction className="h-7 w-7" />
          </div>
          <p className="text-sm text-muted-foreground max-w-xs">
            Estamos finalizando o módulo de Folha Financeira. Em breve você poderá visualizar folhas de pagamento, proventos e lançamentos por aqui.
          </p>
        </div>
      </StandardDialog>
    </>
  )
}

