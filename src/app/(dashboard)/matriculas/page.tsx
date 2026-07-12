'use client'

import { useState } from 'react'
import { FileText, ArrowLeft, Plus, AlertTriangle, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ModalAluno } from '@/components/modals/modal-aluno'
import { useEditModeStore } from '@/store/useEditModeStore'
import { toast } from 'sonner'

export default function MatriculasPage() {
  const { isEditMode } = useEditModeStore()
  const [modalOpen, setModalOpen] = useState(false)

  const handleNovaMatricula = () => {
    if (!isEditMode) {
      toast.warning('Para realizar novas matrículas com assinaturas, por favor ative o Modo de Edição no topo da página.')
    }
    setModalOpen(true)
  }

  return (
    <div className="space-y-6 flex flex-col h-[80vh]">
      {/* Modal de Cadastro */}
      <ModalAluno 
        open={modalOpen} 
        onOpenChange={setModalOpen}
        alunoEditar={null}
        onSuccess={() => {
          toast.success('Aluno matriculado com sucesso!')
          setModalOpen(false)
        }} 
      />

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

      <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-[#26262a] rounded-2xl bg-[#141416]/50 p-6">
        <div className="p-4 rounded-full bg-[#185FA5]/10 border border-[#185FA5]/20 text-[#185FA5] dark:text-[#3ea6ff] mb-4">
          <UserPlus className="w-12 h-12" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2 text-center">Matrícula de Novo Aluno</h3>
        <p className="text-[#aaa] max-w-md text-center text-sm mb-6 leading-relaxed">
          Inicie o processo de ingresso de um novo estudante no sistema. Ao preencher a ficha completa, você poderá colher assinaturas digitais na tela e gerar o comprovante de matrícula automaticamente.
        </p>

        <Button 
          onClick={handleNovaMatricula}
          className="bg-[#185FA5] hover:bg-[#185FA5]/90 text-white dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90 font-bold gap-2 px-6 py-5 rounded-2xl cursor-pointer shadow-lg hover:shadow-xl transition-all duration-200 border-none text-base"
        >
          <Plus className="w-5 h-5" />
          <span>Iniciar Nova Matrícula</span>
        </Button>

        {!isEditMode && (
          <div className="mt-6 p-4 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400 text-xs text-center max-w-sm flex flex-col items-center gap-1.5 font-medium">
            <AlertTriangle className="w-5 h-5 text-amber-500 animate-pulse shrink-0" />
            <span>
              Atenção: O **Modo de Edição** está desativado no painel. Ative-o no botão do topo da página para assinar digitalmente e salvar a ficha.
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
