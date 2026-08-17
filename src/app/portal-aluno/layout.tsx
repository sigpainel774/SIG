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
  applicationName: 'Portal dos Pais',
  robots: {
    index: false,
    follow: false,
  },
  manifest: '/manifest-portal-pais.json?v=13',
  icons: {
    icon: [
      { url: '/portal-pais/icon.svg?v=13', type: 'image/svg+xml' },
      { url: '/portal-pais/icon-192.png?v=13', sizes: '192x192', type: 'image/png' },
      { url: '/portal-pais/icon-512.png?v=13', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/portal-pais/apple-touch-icon.png?v=13', sizes: '180x180', type: 'image/png' },
      { url: '/portal-pais/icon-192.png?v=13', sizes: '192x192', type: 'image/png' },
      { url: '/portal-pais/icon-512.png?v=13', sizes: '512x512', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Portal dos Pais',
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
