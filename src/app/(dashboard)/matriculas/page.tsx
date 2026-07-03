'use client'

import { FileText } from 'lucide-react'

export default function MatriculasPage() {
  return (
    <div className="space-y-6 flex flex-col h-[80vh]">
      <div className="pb-4 border-b border-[#3f3f46]">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <FileText className="w-6 h-6 text-highlight" /> 
          Matrículas
        </h2>
        <p className="text-[#aaa] text-sm mt-1">Gestão de novas matrículas e renovações.</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-[#3f3f46] rounded-xl bg-[#121212]/50">
        <FileText className="w-16 h-16 text-[#3f3f46] mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Em Desenvolvimento</h3>
        <p className="text-[#aaa] max-w-md text-center">
          A área de matrículas está sendo estruturada e será desenvolvida nas próximas etapas do projeto, conforme o cronograma do sistema original.
        </p>
      </div>
    </div>
  )
}
