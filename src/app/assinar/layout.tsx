import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Coleta de Assinatura – SIG Escolar',
  description: 'Coleta eletrônica de assinatura de matrícula escolar.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function AssinarLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
