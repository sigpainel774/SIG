'use client'

import React, { useState } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { Save } from 'lucide-react'
import { ModalMatriculaEmaeeProps } from './types'
import { MatriculaEmaeeProvider, useMatriculaEmaeeContext } from './context/MatriculaEmaeeContext'

// Seções
import { SecaoBuscaAluno } from './components/SecaoBuscaAluno'
import { SecaoEscolaRegular } from './components/SecaoEscolaRegular'
import { SecaoDadosClinicos } from './components/SecaoDadosClinicos'

function ModalMatriculaEmaeeContent({ activeOpen, handleOpenChange }: { activeOpen: boolean, handleOpenChange: (open: boolean) => void }) {
  const { loading, handleSubmit, alunoSelecionado } = useMatriculaEmaeeContext()

  return (
    <StandardDialog
      open={activeOpen}
      onOpenChange={handleOpenChange}
      title="Nova Matrícula - EMAEE"
      maxWidth="sm:max-w-[900px]"
      className="w-[95vw]"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            className="text-gray-400 hover:text-white"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="matricula-emaee-form"
            disabled={loading || !alunoSelecionado}
            className="bg-[#3ea6ff] hover:bg-[#3ea6ff]/90 text-[#050505] font-bold px-6 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50"
          >
            {loading ? 'Salvando...' : (
              <span className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                Criar Prontuário
              </span>
            )}
          </Button>
        </div>
      }
    >
      <form id="matricula-emaee-form" onSubmit={handleSubmit} className="space-y-6 pb-6">
        <SecaoBuscaAluno />
        
        {alunoSelecionado && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SecaoEscolaRegular />
            <SecaoDadosClinicos />
          </div>
        )}
      </form>
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
