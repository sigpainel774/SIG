import { ReactNode } from 'react'
import Link from 'next/link'
import { Home, Users, BookOpen, UserCog, MapPin, FileBarChart, LogOut } from 'lucide-react'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background text-foregroundCustom">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col border-r border-borderCustom bg-card">
        <div className="p-6">
          <h2 className="text-xl font-bold text-white tracking-tight">SIG Educação</h2>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          <Link href="/home" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-hoverCustom transition-colors">
            <Home className="w-5 h-5 text-highlight" />
            <span>Início</span>
          </Link>
          <Link href="/alunos" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-hoverCustom transition-colors">
            <Users className="w-5 h-5 text-highlight" />
            <span>Alunos</span>
          </Link>
          <Link href="/turmas" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-hoverCustom transition-colors">
            <BookOpen className="w-5 h-5 text-highlight" />
            <span>Turmas</span>
          </Link>
          <Link href="/funcionarios" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-hoverCustom transition-colors">
            <UserCog className="w-5 h-5 text-highlight" />
            <span>Funcionários</span>
          </Link>
          <Link href="/ponto-mobile" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-hoverCustom transition-colors">
            <MapPin className="w-5 h-5 text-highlight" />
            <span>Bater Ponto</span>
          </Link>
          <Link href="/relatorios" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-hoverCustom transition-colors">
            <FileBarChart className="w-5 h-5 text-highlight" />
            <span>Relatórios</span>
          </Link>
        </nav>

        <div className="p-4 border-t border-borderCustom">
          <Link href="/login" className="flex items-center gap-3 px-3 py-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors">
            <LogOut className="w-5 h-5" />
            <span>Sair</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="h-16 border-b border-borderCustom bg-card flex items-center px-6 shadow-sm">
          <div className="flex-1"></div>
          <div className="flex items-center gap-4">
            <span className="text-sm">Escola Ativa: <strong className="text-white">Escola Modelo</strong></span>
          </div>
        </header>
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
