import type { Metadata, Viewport } from 'next'
import { ReactNode } from 'react'

export const viewport: Viewport = {
  themeColor: '#7c3aed',
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
  return <div className="min-h-screen bg-background text-foreground font-sans">{children}</div>
}
