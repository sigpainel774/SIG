import type { Metadata, Viewport } from 'next'
import { ReactNode } from 'react'

export const viewport: Viewport = {
  themeColor: '#080d1b',
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
    <div className="min-h-screen bg-[#080d1b] text-slate-100 font-sans selection:bg-blue-600/30 selection:text-white">
      {children}
    </div>
  )
}
