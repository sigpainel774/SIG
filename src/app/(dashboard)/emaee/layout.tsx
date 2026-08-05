// src/app/(dashboard)/emaee/layout.tsx
import React from 'react'

export const metadata = {
  title: 'EMAEE - Atendimento Multidisciplinar',
  description: 'Espaço Municipal de Atendimento Educacional Especializado'
}

export default function EmaeeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full h-full flex flex-col space-y-6">
      {children}
    </div>
  )
}
