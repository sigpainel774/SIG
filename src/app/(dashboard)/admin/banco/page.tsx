'use client'
import { Database } from 'lucide-react'
export default function AdminBancoPage() {
  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-[#3f3f46]">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Database className="w-6 h-6 text-purple-500" /> Banco de Dados
        </h2>
        <p className="text-[#aaa] text-sm mt-1">Gerenciamento de dumps, backups e scripts manuais.</p>
      </div>
      <div className="flex flex-col items-center justify-center p-12 border border-dashed border-[#3f3f46] rounded-xl bg-[#121212]/50">
        <Database className="w-16 h-16 text-[#3f3f46] mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Supabase Integrado</h3>
        <p className="text-[#aaa] text-center max-w-md">Na nova arquitetura, o banco de dados é gerenciado diretamente pela dashboard do Supabase.</p>
      </div>
    </div>
  )
}
