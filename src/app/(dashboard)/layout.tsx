import { ReactNode } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background text-foregroundCustom">
      {/* Sidebar Component */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-auto flex flex-col min-w-0">
        <Header />
        <div className="p-8 flex-1">
          {children}
        </div>
      </main>
    </div>
  )
}
