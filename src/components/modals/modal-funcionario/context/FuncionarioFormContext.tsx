'use client'

import React, { createContext, useContext } from 'react'
import { FuncionarioFormContextType, ModalFuncionarioProps } from '../types'
import { useFuncionarioFormStates } from '../hooks/useFuncionarioFormStates'

const FuncionarioFormContext = createContext<FuncionarioFormContextType | undefined>(undefined)

interface FuncionarioFormProviderProps {
  children: React.ReactNode
  props: ModalFuncionarioProps
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  activeTab: string
  setActiveTab: (tab: any) => void
}

export function FuncionarioFormProvider({
  children,
  props,
  isOpen,
  setIsOpen,
  activeTab,
  setActiveTab,
}: FuncionarioFormProviderProps) {
  const value = useFuncionarioFormStates({
    props,
    isOpen,
    setIsOpen,
    activeTab,
    setActiveTab
  })

  return (
    <FuncionarioFormContext.Provider value={value}>
      {children}
    </FuncionarioFormContext.Provider>
  )
}

export function useFuncionarioForm() {
  const context = useContext(FuncionarioFormContext)
  if (context === undefined) {
    throw new Error('useFuncionarioForm deve ser utilizado dentro de um FuncionarioFormProvider')
  }
  return context
}
