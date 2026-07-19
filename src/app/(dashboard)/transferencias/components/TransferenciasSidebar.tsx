'use client'

import { User, Building2, Calendar, FileText } from 'lucide-react'

interface TransferenciasSidebarProps {
  activeTab: 'alunos' | 'funcionarios'
  setActiveTab: (t: 'alunos' | 'funcionarios') => void
  activeSubTab: 'recebimentos' | 'submissoes'
  setActiveSubTab: (st: 'recebimentos' | 'submissoes') => void
  historicoAberto: boolean
  setHistoricoAberto: (h: boolean) => void
}

export function TransferenciasSidebar({
  activeTab,
  setActiveTab,
  activeSubTab,
  setActiveSubTab,
  historicoAberto,
  setHistoricoAberto
}: TransferenciasSidebarProps) {
  return (
    <div className="bg-[#121212] border border-[#3f3f46] p-4 rounded-2xl space-y-4">
      <div className="space-y-1">
        <span className="text-[10px] font-bold text-[#666] uppercase tracking-wider px-2">Domínio</span>
        <button
          onClick={() => {
            setActiveTab('alunos')
            setHistoricoAberto(false)
          }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors text-left ${activeTab === 'alunos' && !historicoAberto ? 'bg-sky-600/10 text-sky-400 font-bold border border-sky-600/20' : 'text-[#aaa] hover:bg-[#1c1c1e] hover:text-white'}`}
        >
          <User className="w-4 h-4" />
          Alunos
        </button>
        <button
          onClick={() => {
            setActiveTab('funcionarios')
            setHistoricoAberto(false)
          }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors text-left ${activeTab === 'funcionarios' && !historicoAberto ? 'bg-sky-600/10 text-sky-400 font-bold border border-sky-600/20' : 'text-[#aaa] hover:bg-[#1c1c1e] hover:text-white'}`}
        >
          <Building2 className="w-4 h-4" />
          Funcionários
        </button>
      </div>

      <div className="pt-2 border-t border-[#26262a] space-y-1">
        <span className="text-[10px] font-bold text-[#666] uppercase tracking-wider px-2">Ações Locais</span>
        {!historicoAberto && (
          <>
            <button
              onClick={() => setActiveSubTab('recebimentos')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors text-left ${activeSubTab === 'recebimentos' ? 'bg-[#27272a] text-white' : 'text-[#aaa] hover:bg-[#1c1c1e] hover:text-white'}`}
            >
              <Calendar className="w-4 h-4 text-amber-500" />
              Recebimentos (Pendentes)
            </button>
            <button
              onClick={() => setActiveSubTab('submissoes')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors text-left ${activeSubTab === 'submissoes' ? 'bg-[#27272a] text-white' : 'text-[#aaa] hover:bg-[#1c1c1e] hover:text-white'}`}
            >
              <FileText className="w-4 h-4 text-emerald-500" />
              Submissões (Enviadas)
            </button>
          </>
        )}
        <button
          onClick={() => setHistoricoAberto(true)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors text-left ${historicoAberto ? 'bg-[#27272a] text-white' : 'text-[#aaa] hover:bg-[#1c1c1e] hover:text-white'}`}
        >
          <FileText className="w-4 h-4 text-indigo-500" />
          Histórico Geral
        </button>
      </div>
    </div>
  )
}
