'use client'
import { Activity } from 'lucide-react'
export default function AdminLogsPage() {
  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-[#3f3f46]">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Activity className="w-6 h-6 text-purple-500" /> Logs & Auditoria
        </h2>
        <p className="text-[#aaa] text-sm mt-1">Rastreabilidade completa de ações no sistema.</p>
      </div>
      <div className="flex flex-col items-center justify-center p-12 border border-dashed border-[#3f3f46] rounded-xl bg-[#121212]/50">
        <Activity className="w-16 h-16 text-[#3f3f46] mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Em Construção</h3>
        <p className="text-[#aaa] text-center max-w-md">Os relatórios de auditoria e logs estão sendo migrados para a nova infraestrutura.</p>
      </div>
    </div>
  )
}
