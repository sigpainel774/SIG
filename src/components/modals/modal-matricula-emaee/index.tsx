'use client'

import React, { useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { Save, Printer, RotateCcw, Sparkles, CheckCircle2 } from 'lucide-react'
import { ModalMatriculaEmaeeProps } from './types'
import { MatriculaEmaeeProvider, useMatriculaEmaeeContext } from './context/MatriculaEmaeeContext'

const ModalScannerFoto3x4 = dynamic(
  () => import('@/components/modals/scanner-foto-3x4/ModalScannerFoto3x4').then((mod) => mod.ModalScannerFoto3x4),
  { ssr: false }
)

import { ModalVincularProfissionalAlunoAEE } from './components/ModalVincularProfissionalAlunoAEE'

// Subseções
import { SecaoDadosAluno } from './components/SecaoDadosAluno'
import { SecaoEscolaRegular } from './components/SecaoEscolaRegular'
import { SecaoDadosClinicos } from './components/SecaoDadosClinicos'
import { SecaoAssinaturasComprovante } from './components/SecaoAssinaturasComprovante'

function ModalMatriculaEmaeeContent({ activeOpen, handleOpenChange }: { activeOpen: boolean, handleOpenChange: (open: boolean) => void }) {
  const { 
    loading, 
    handleSubmit, 
    handleResetForm,
    handleDiscardDraft,
    draftRestoredTime,
    lastSavedDraftAt,
    alunoSelecionado, 
    nomeCompleto, 
    isEditMode,
    scannerOpen,
    setScannerOpen,
    handleFotoCapturada,
    modalVincularAEEOpen,
    setModalVincularAEEOpen,
    vinculosAEE,
    adicionarVinculoAEE,
    escolaAtendimentoId
  } = useMatriculaEmaeeContext()
  const [activeStep, setActiveStep] = useState<number>(1)
  const formRef = useRef<HTMLFormElement>(null)

  const handlePrint = () => {
    window.print()
  }

  const steps = [
    { id: 1, title: 'Aluno e Endereço', anchor: 'aluno' },
    { id: 2, title: 'Escola regular', anchor: 'escola-regular' },
    { id: 3, title: 'Dados clínicos', anchor: 'deficiencia' },
    { id: 4, title: 'Assinaturas', anchor: 'assinaturas' },
  ]

  const scrollToSection = (stepId: number, anchor: string) => {
    setActiveStep(stepId)
    const el = document.getElementById(anchor)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <StandardDialog
      open={activeOpen}
      onOpenChange={handleOpenChange}
      title={isEditMode ? "Editar Ficha de Matrícula AEE 2026 — SIG" : "Ficha de Matrícula AEE 2026 — SIG"}
      maxWidth="max-w-[96vw] sm:max-w-[92vw] md:max-w-4xl lg:max-w-[1050px]"
      className="w-[96vw] sm:w-[92vw] md:w-full"
      footer={
        <div className="flex items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrint}
              className="border-border text-foreground hover:bg-muted gap-2 rounded-xl text-xs font-semibold"
            >
              <Printer className="w-4 h-4 text-primary" />
              Imprimir Ficha
            </Button>

            {!isEditMode && lastSavedDraftAt && (
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Rascunho salvo ({lastSavedDraftAt})</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isEditMode && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleResetForm(true)}
                className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-xl text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Limpar
              </Button>
            )}

            <Button
              type="submit"
              form="ficha-aee-form"
              disabled={loading || (!alunoSelecionado && !nomeCompleto.trim())}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 py-2.5 rounded-xl text-xs transition-all disabled:opacity-50"
            >
              {loading ? 'Salvando...' : (
                <span className="flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  {isEditMode ? 'Atualizar Matrícula AEE' : 'Salvar Matrícula AEE'}
                </span>
              )}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5 pb-4">
        {/* Cabeçalho da Página no Modal */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div>
            <p className="text-[11px] font-extrabold text-primary uppercase tracking-wider">EMAEE • Ano letivo 2026</p>
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              {isEditMode ? 'Editar ficha de matrícula para AEE' : 'Ficha de matrícula para AEE'}
            </h1>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {!isEditMode && lastSavedDraftAt && (
              <span className="sm:hidden flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                Rascunho {lastSavedDraftAt}
              </span>
            )}
            <span className={`px-3 py-1 border rounded-full text-xs font-bold ${
              isEditMode 
                ? 'border-blue-600/30 text-blue-600 bg-blue-500/10 dark:border-[#3ea6ff]/30 dark:text-[#3ea6ff] dark:bg-[#3ea6ff]/10' 
                : 'border-emerald-600/30 text-emerald-700 bg-emerald-500/10 dark:border-success/30 dark:text-success dark:bg-success/10'
            }`}>
              {isEditMode ? 'Edição de Matrícula' : 'Nova Matrícula'}
            </span>
          </div>
        </div>

        {/* Banner de Rascunho Recuperado Automaticamente */}
        {draftRestoredTime && !isEditMode && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-amber-500/10 border border-amber-500/30 dark:bg-amber-500/10 dark:border-amber-500/25 rounded-2xl text-xs text-amber-900 dark:text-amber-200 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              <div>
                <span className="font-bold">Rascunho recuperado automaticamente:</span>{' '}
                <span>As informações digitadas anteriormente foram restauradas ({draftRestoredTime}).</span>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDiscardDraft}
              className="self-end sm:self-auto h-7 text-xs font-bold text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 hover:text-amber-950 dark:hover:text-amber-100 rounded-xl px-2.5"
            >
              Descartar rascunho
            </Button>
          </div>
        )}

        {/* Stepper de 4 Passos */}
        <nav className="grid grid-cols-2 sm:grid-cols-4 gap-2 no-print" aria-label="Etapas da ficha AEE">
          {steps.map((step) => {
            const isActive = activeStep === step.id
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => scrollToSection(step.id, step.anchor)}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                  isActive
                    ? 'border-primary/40 bg-primary/10 text-foreground shadow-sm'
                    : 'border-border bg-muted/60 text-muted-foreground hover:border-primary/30 hover:bg-muted hover:text-foreground'
                }`}
              >
                <span className={`grid place-items-center w-6 h-6 rounded-lg text-xs font-extrabold flex-shrink-0 ${
                  isActive ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
                }`}>
                  {step.id}
                </span>
                <span className="truncate">{step.title}</span>
              </button>
            )
          })}
        </nav>

        {/* Formulário Principal com as 4 seções */}
        <form ref={formRef} id="ficha-aee-form" onSubmit={handleSubmit} className="space-y-6">
          <div id="aluno">
            <SecaoDadosAluno />
          </div>

          <div id="escola-regular">
            <SecaoEscolaRegular />
          </div>

          <div id="deficiencia">
            <SecaoDadosClinicos />
          </div>

          <div id="assinaturas">
            <SecaoAssinaturasComprovante />
          </div>
        </form>
      </div>

      {/* Sub-modal Scanner Foto 3x4 (Carregado Sob Demanda) */}
      {scannerOpen && (
        <ModalScannerFoto3x4
          open={scannerOpen}
          onOpenChange={setScannerOpen}
          onFotoCapturada={handleFotoCapturada}
          titulo="Escanear Foto 3x4 do Estudante (EMAEE)"
          subtitulo="Enquadre a foto 3x4 da ficha física do estudante para recortar e aplicar"
        />
      )}

      {/* Sub-modal de Seleção e Agendamento do Profissional AEE (Isolado fora do form) */}
      {modalVincularAEEOpen && (
        <ModalVincularProfissionalAlunoAEE
          open={modalVincularAEEOpen}
          onOpenChange={setModalVincularAEEOpen}
          vinculosExistentes={vinculosAEE}
          onAdicionarVinculo={adicionarVinculoAEE}
          escolaEmaeeId={escolaAtendimentoId}
        />
      )}
    </StandardDialog>
  )
}

export function ModalMatriculaEmaee(props: ModalMatriculaEmaeeProps) {
  const [isOpen, setIsOpen] = useState(false)
  const activeOpen = props.open !== undefined ? props.open : isOpen

  const handleOpenChange = (val: boolean) => {
    if (props.onOpenChange) props.onOpenChange(val)
    setIsOpen(val)
  }

  return (
    <>
      {props.trigger && (
        <div onClick={() => handleOpenChange(true)} className="inline-block cursor-pointer">
          {props.trigger}
        </div>
      )}
      {activeOpen && (
        <MatriculaEmaeeProvider props={props} isOpen={activeOpen} setIsOpen={handleOpenChange}>
          <ModalMatriculaEmaeeContent activeOpen={activeOpen} handleOpenChange={handleOpenChange} />
        </MatriculaEmaeeProvider>
      )}
    </>
  )
}
