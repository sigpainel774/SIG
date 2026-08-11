'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { FileSpreadsheet } from 'lucide-react'

// Imports dinâmicos sob demanda
const ModalImportarFichasDocx = dynamic(
  () => import('@/components/modals/modal-importar-fichas-docx').then((m) => m.ModalImportarFichasDocx),
  { ssr: false }
)
const ModalImportarExcel = dynamic(
  () => import('@/components/modals/modal-importar-excel').then((m) => m.ModalImportarExcel),
  { ssr: false }
)

interface ImportDataActionsProps {
  secretariaIdFilter?: string
  onSuccess?: () => void
  className?: string
}

export function ImportDataActions({
  secretariaIdFilter,
  onSuccess,
  className = ''
}: ImportDataActionsProps) {
  const [importDocxOpen, setImportDocxOpen] = useState(false)
  const [importExcelOpen, setImportExcelOpen] = useState(false)

  return (
    <>
      <div className={`flex items-center gap-2 ${className}`}>
        <Button
          type="button"
          variant="outline"
          onClick={() => setImportDocxOpen(true)}
          className="bg-[#121214] border-[#3f3f46] text-emerald-400 hover:text-emerald-300 hover:bg-[#202024] font-semibold text-xs rounded-xl h-9"
          title="Importar Fichas de Alunos / Pacientes via arquivos DOCX"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
          <span>Importar Fichas (DOCX)</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => setImportExcelOpen(true)}
          className="bg-[#121214] border-[#3f3f46] text-purple-400 hover:text-purple-300 hover:bg-[#202024] font-semibold text-xs rounded-xl h-9"
          title="Importador 15 via arquivos Excel (.xlsx / .xls)"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-purple-400" />
          <span>Importador 15 (Excel)</span>
        </Button>
      </div>

      {/* Modal de Importação de Fichas DOCX */}
      {importDocxOpen && (
        <ModalImportarFichasDocx
          open={importDocxOpen}
          onOpenChange={setImportDocxOpen}
          secretariaIdFilter={secretariaIdFilter}
          onSuccess={onSuccess}
        />
      )}

      {/* Modal do Importador 15 (Excel) */}
      {importExcelOpen && (
        <ModalImportarExcel
          open={importExcelOpen}
          onOpenChange={setImportExcelOpen}
          secretariaIdFilter={secretariaIdFilter}
          onSuccess={onSuccess}
        />
      )}
    </>
  )
}
