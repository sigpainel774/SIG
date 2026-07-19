'use client'

import React, { createContext, useContext } from 'react'
import { AlunoFormContextType, ModalAlunoProps } from '../types'
import { useAlunoFormStates } from '../hooks/useAlunoFormStates'

const AlunoFormContext = createContext<AlunoFormContextType | undefined>(undefined)

interface AlunoFormProviderProps {
  children: React.ReactNode
  props: ModalAlunoProps
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

export function AlunoFormProvider({ children, props, isOpen, setIsOpen }: AlunoFormProviderProps) {
  const value = useAlunoFormStates({ props, isOpen, setIsOpen })

  return (
    <AlunoFormContext.Provider value={value}>
      {children}
    </AlunoFormContext.Provider>
  )
}

export function useAlunoForm() {
  const context = useContext(AlunoFormContext)
  if (context === undefined) {
    throw new Error('useAlunoForm deve ser usado dentro de um AlunoFormProvider')
  }
  return context
}
