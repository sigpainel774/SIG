import { ReactNode } from 'react'
import { Sidebar } from '@/components/Sidebar'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background text-foregroundCustom">
      {/* Sidebar Component */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="h-16 border-b border-borderCustom bg-card flex items-center px-6 shadow-sm">
          <div className="flex-1"></div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Escola Ativa: <strong className="text-foregroundCustom font-bold">Escola Modelo</strong></span>
          </div>
        </header>
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
