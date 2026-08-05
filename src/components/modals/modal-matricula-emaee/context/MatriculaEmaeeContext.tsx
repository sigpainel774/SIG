'use client'

import React, { createContext, useContext } from 'react'
import { ModalMatriculaEmaeeProps } from '../types'
import { useMatriculaEmaee } from '../hooks/useMatriculaEmaee'

type MatriculaEmaeeContextType = ReturnType<typeof useMatriculaEmaee>

const MatriculaEmaeeContext = createContext<MatriculaEmaeeContextType | undefined>(undefined)

export function MatriculaEmaeeProvider({ children, props, isOpen, setIsOpen }: { children: React.ReactNode, props: ModalMatriculaEmaeeProps, isOpen: boolean, setIsOpen: (v: boolean) => void }) {
  const value = useMatriculaEmaee({ props, isOpen, setIsOpen })

  return (
    <MatriculaEmaeeContext.Provider value={value}>
      {children}
    </MatriculaEmaeeContext.Provider>
  )
}

export function useMatriculaEmaeeContext() {
  const context = useContext(MatriculaEmaeeContext)
  if (context === undefined) {
    throw new Error('useMatriculaEmaeeContext deve ser usado dentro de um MatriculaEmaeeProvider')
  }
  return context
}
