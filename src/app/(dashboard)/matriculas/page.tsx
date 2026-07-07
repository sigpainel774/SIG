'use client'

import { FileText, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function MatriculasPage() {
  return (
    <div className="space-y-6 flex flex-col h-[80vh]">
      <div className="pb-4 border-b border-[#3f3f46]">
        <div className="flex items-center gap-3">
          <Link href="/home">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-highlight" /> 
            Matrículas
          </h2>
        </div>
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
