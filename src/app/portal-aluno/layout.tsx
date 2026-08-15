import type { Metadata, Viewport } from 'next'
import { Manrope, Source_Sans_3 } from 'next/font/google'

// Fontes do Gabinete Cívico Contemporâneo
const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
})

const sourceSans3 = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-source-sans',
  display: 'swap',
  weight: ['400', '600'],
})

export const viewport: Viewport = {
  themeColor: '#0B4FB3',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export const metadata: Metadata = {
  title: 'Portal dos Pais | Secretaria Municipal de Educação de Sapeaçu',
  description: 'Acompanhe o boletim, frequência e comunicados escolares dos seus filhos no Portal Oficial da Prefeitura de Sapeaçu.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function PortalAlunoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className={`${manrope.variable} ${sourceSans3.variable}`}
      style={{ fontFamily: 'var(--font-source-sans), sans-serif' }}
    >
      {children}
    </div>
  )
}
