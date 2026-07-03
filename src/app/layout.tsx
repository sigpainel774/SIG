import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/theme-provider'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export const metadata: Metadata = {
  title: 'Sapeaçu Painel Escolar | SIG',
  description: 'Sistema Municipal de Gestão Educacional de Sapeaçu',
  manifest: '/manifest.json',
  icons: {
    icon: '/img/icon-192.png',
    apple: '/img/icon-512.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SIG Sapeaçu',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster theme="dark" />
        </ThemeProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.log('SW registration failed: ', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
