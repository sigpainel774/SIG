'use client'

import { useState } from 'react'
import { FileBadge, ArrowLeft, Plus, AlertTriangle, UserPlus, ShieldAlert } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ModalAluno } from '@/components/modals/modal-aluno'
import { useEditModeStore } from '@/store/useEditModeStore'
import { useCheckPermissao } from '@/hooks/useCheckPermissao'
import { useEjaGuard } from '@/hooks/useEjaGuard'
import { IconTile } from '@/components/ui/icon-tile'
import { toast } from 'sonner'

export default function EjaMatriculasPage() {
  const { authorized } = useEjaGuard()
  const { isEditMode } = useEditModeStore()
  const { temPermissao: podeRealizarMatricula } = useCheckPermissao('matriculas.realizar')
  const [modalOpen, setModalOpen] = useState(false)

  const handleNovaMatricula = () => {
    if (!podeRealizarMatricula) {
      toast.error('Você não possui permissão para realizar novas matrículas nesta escola.')
      return
    }
    if (!isEditMode) {
      toast.warning('Para realizar novas matrículas com assinaturas, por favor ative o Modo de Edição no topo da página.')
    }
    setModalOpen(true)
  }

  if (authorized === false) return null

  return (
    <div className="space-y-6 flex flex-col h-[80vh]">
      {/* Modal de Cadastro */}
      {modalOpen && (
        <ModalAluno 
          open={modalOpen} 
          onOpenChange={setModalOpen}
          alunoEditar={null}
          onSuccess={() => {
            toast.success('Aluno EJA matriculado com sucesso!')
            setModalOpen(false)
          }} 
        />
      )}

      <div className="pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Link href="/home">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <IconTile icon={FileBadge} variant="primary" className="h-10 w-10 shrink-0" />
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            Matrículas - EJA
          </h2>
        </div>
        <p className="text-muted-foreground text-sm mt-1">Gestão de novas matrículas e renovações da modalidade Educação de Jovens e Adultos.</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-border rounded-2xl bg-card/50 p-6">
        <div className="p-4 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 mb-4">
          <UserPlus className="w-12 h-12" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2 text-center">Matrícula de Aluno EJA</h3>
        <p className="text-muted-foreground max-w-md text-center text-sm mb-6 leading-relaxed">
          Inicie o processo de matrícula de um novo estudante da Educação de Jovens e Adultos. Ao preencher a ficha completa, você poderá colher assinaturas digitais na tela e gerar o comprovante oficial de matrícula.
        </p>

        <Button 
          onClick={handleNovaMatricula}
          disabled={!podeRealizarMatricula}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold gap-2 px-6 py-5 rounded-2xl cursor-pointer shadow-lg hover:shadow-xl transition-all duration-200 border-none text-base disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-5 h-5" />
          <span>Iniciar Nova Matrícula EJA</span>
        </Button>

        {!podeRealizarMatricula ? (
          <div className="mt-6 p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-xs text-center max-w-sm flex flex-col items-center gap-1.5 font-medium">
            <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
            <span>
              Acesso Restrito: Seu perfil de Secretário nesta escola não possui o toggle de permissão para <strong>Realizar / Renovar Matrículas</strong>. Solicite a liberação ao Diretor.
            </span>
          </div>
        ) : !isEditMode ? (
          <div className="mt-6 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-300 text-xs text-center max-w-sm flex flex-col items-center gap-2 font-medium shadow-xs">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400 shrink-0">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <span className="leading-relaxed">
              Atenção: O <strong className="font-bold text-amber-950 dark:text-amber-100">Modo de Edição</strong> está desativado no painel. Ative-o no botão do topo da página para assinar digitalmente e salvar a ficha.
            </span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
