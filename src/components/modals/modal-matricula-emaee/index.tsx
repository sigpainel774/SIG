'use client'

import React, { useState, useRef } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { Save, Printer, RotateCcw } from 'lucide-react'
import { ModalMatriculaEmaeeProps } from './types'
import { MatriculaEmaeeProvider, useMatriculaEmaeeContext } from './context/MatriculaEmaeeContext'

// Subseções
import { SecaoDadosAtendimento } from './components/SecaoDadosAtendimento'
import { SecaoDadosAluno } from './components/SecaoDadosAluno'
import { SecaoEscolaRegular } from './components/SecaoEscolaRegular'
import { SecaoDadosClinicos } from './components/SecaoDadosClinicos'
import { SecaoAssinaturasComprovante } from './components/SecaoAssinaturasComprovante'

function ModalMatriculaEmaeeContent({ activeOpen, handleOpenChange }: { activeOpen: boolean, handleOpenChange: (open: boolean) => void }) {
  const { loading, handleSubmit, alunoSelecionado } = useMatriculaEmaeeContext()
  const [activeStep, setActiveStep] = useState<number>(1)
  const formRef = useRef<HTMLFormElement>(null)

  const handlePrint = () => {
    window.print()
  }

  const steps = [
    { id: 1, title: 'Atendimento', anchor: 'atendimento' },
    { id: 2, title: 'Aluno', anchor: 'aluno' },
    { id: 3, title: 'Escola regular', anchor: 'escola-regular' },
    { id: 4, title: 'Dados clínicos', anchor: 'deficiencia' },
    { id: 5, title: 'Assinaturas', anchor: 'assinaturas' },
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
      title="Ficha de Matrícula AEE 2026 — SIG"
      maxWidth="sm:max-w-[1050px]"
      className="w-[95vw]"
      footer={
        <div className="flex items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrint}
              className="border-[#26262a] text-foreground hover:bg-[#1f2430] gap-2 rounded-xl text-xs font-semibold"
            >
              <Printer className="w-4 h-4 text-[#3ea6ff]" />
              Imprimir Ficha
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => formRef.current?.reset()}
              className="text-gray-400 hover:text-white rounded-xl text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Limpar
            </Button>

            <Button
              type="submit"
              form="ficha-aee-form"
              disabled={loading || !alunoSelecionado}
              className="bg-[#3ea6ff] hover:bg-[#3ea6ff]/90 text-[#050505] font-bold px-6 py-2.5 rounded-xl text-xs transition-all disabled:opacity-50"
            >
              {loading ? 'Salvando...' : (
                <span className="flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  Salvar Matrícula AEE
                </span>
              )}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5 pb-4">
        {/* Cabeçalho da Página no Modal */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#26262a]">
          <div>
            <p className="text-[11px] font-extrabold text-[#3ea6ff] uppercase tracking-wider">EMAEE • Ano letivo 2026</p>
            <h1 className="text-xl font-bold text-foreground tracking-tight">Ficha de matrícula para AEE</h1>
          </div>
          <span className="self-start sm:self-auto px-3 py-1 border border-emerald-500/30 rounded-full text-emerald-400 bg-emerald-500/10 text-xs font-bold">
            Nova Matrícula
          </span>
        </div>

        {/* Stepper de 5 Passos */}
        <nav className="grid grid-cols-2 sm:grid-cols-5 gap-2 no-print" aria-label="Etapas da ficha AEE">
          {steps.map((step) => {
            const isActive = activeStep === step.id
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => scrollToSection(step.id, step.anchor)}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                  isActive
                    ? 'border-[#3ea6ff]/40 bg-[#3ea6ff]/15 text-foreground shadow-sm'
                    : 'border-[#26262a] bg-[#121621]/80 text-muted-foreground hover:border-[#3ea6ff]/20 hover:text-foreground'
                }`}
              >
                <span className={`grid place-items-center w-6 h-6 rounded-lg text-xs font-extrabold flex-shrink-0 ${
                  isActive ? 'bg-[#3ea6ff] text-[#050505]' : 'bg-[#3ea6ff]/10 text-[#3ea6ff]'
                }`}>
                  {step.id}
                </span>
                <span className="truncate">{step.title}</span>
              </button>
            )
          })}
        </nav>

        {/* Formulário Principal com as 5 seções */}
        <form ref={formRef} id="ficha-aee-form" onSubmit={handleSubmit} className="space-y-6">
          <div id="atendimento">
            <SecaoDadosAtendimento />
          </div>

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
