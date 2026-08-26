import type { Metadata, Viewport } from 'next'
import { ReactNode } from 'react'

export const viewport: Viewport = {
  themeColor: '#f8f9fa',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export const metadata: Metadata = {
  title: 'Sistema Alpha | SIG Sapeaçu',
  description: 'Laboratório de Novas Funções e Prototipagem Operacional do SIG.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function AlphaRootLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f3f4f7] text-[#1a1a1a] font-sans selection:bg-[#0067c0]/20 selection:text-[#0067c0]">
      {children}
    </div>
  )
}
