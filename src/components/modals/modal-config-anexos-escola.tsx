'use client'

import { useState, useEffect } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Building2, Plus, Trash2, Save, Loader2, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabaseClient'

interface ModalConfigAnexosEscolaProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  escola: any
  onSuccess?: () => void
}

export function ModalConfigAnexosEscola({ 
  open, 
  onOpenChange, 
  escola, 
  onSuccess 
}: ModalConfigAnexosEscolaProps) {
  const [loading, setLoading] = useState(false)
  const [anexos, setAnexos] = useState<string[]>([])
  const [novoAnexo, setNovoAnexo] = useState('')

  useEffect(() => {
    if (escola) {
      setAnexos(escola.anexos_padrao ?? [])
    } else {
      setAnexos([])
    }
    setNovoAnexo('')
  }, [escola, open])

  const handleAddAnexo = (e: React.FormEvent) => {
    e.preventDefault()
    const name = novoAnexo.trim()
    if (!name) {
      toast.error('O nome do documento não pode ser vazio.')
      return
    }

    if (anexos.some(a => a.toLowerCase() === name.toLowerCase())) {
      toast.error('Este documento já está na lista.')
      return
    }

    setAnexos([...anexos, name])
    setNovoAnexo('')
  }

  const handleRemoveAnexo = (indexToRemove: number) => {
    setAnexos(anexos.filter((_, index) => index !== indexToRemove))
  }

  const handleSave = async () => {
    setLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('escolas')
        .update({
          anexos_padrao: anexos
        })
        .eq('id', escola.id)

      if (error) throw error
      
      toast.success('Configuração de anexos padrão atualizada!')
      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (err: any) {
      console.error('Erro ao salvar anexos padrão:', err)
      toast.error(`Erro ao salvar: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Configurar Anexos Padrão"
      description={`Defina a lista de documentos padrão exigidos para os alunos de ${escola?.nome ?? 'unidade escolar'}.`}
      maxWidth="sm:max-w-[480px]"
      footer={
        <div className="flex justify-end gap-2 w-full pt-4 border-t border-[#27272a]">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="bg-[#1a1a1a] border-[#27272a] text-white hover:bg-[#27272a] cursor-pointer"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="bg-purple-600 text-white hover:bg-purple-700 font-semibold gap-2 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {loading ? 'Salvando...' : 'Salvar Configuração'}
          </Button>
        </div>
      }
    >

        <div className="space-y-4 py-3">
          {/* Form para Adicionar */}
          <form onSubmit={handleAddAnexo} className="flex gap-2">
            <div className="flex-1">
              <Input
                value={novoAnexo}
                onChange={(e) => setNovoAnexo(e.target.value)}
                placeholder="Ex: RG, CPF, Ficha de Vacina..."
                className="bg-[#18181a] border-[#27272a] text-white text-sm"
              />
            </div>
            <Button 
              type="submit" 
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar</span>
            </Button>
          </form>

          {/* Lista de Documentos Cadastrados */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-[#aaa] uppercase tracking-wider">Documentos Configurados</Label>
            <div className="max-h-[220px] overflow-y-auto pr-1 space-y-1.5 border border-[#27272a] rounded-xl p-3 bg-black/20">
              {anexos.length === 0 ? (
                <div className="text-center py-6 text-zinc-500 text-xs">
                  Nenhum documento padrão configurado. Os alunos desta escola só poderão anexar arquivos personalizados livres.
                </div>
              ) : (
                anexos.map((anexo, i) => (
                  <div 
                    key={i} 
                    className="flex items-center justify-between p-2.5 bg-[#18181a] border border-[#27272a] rounded-lg text-sm"
                  >
                    <div className="flex items-center gap-2 text-zinc-300">
                      <FileText className="w-4 h-4 text-purple-400/80" />
                      <span className="font-medium text-white">{anexo}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveAnexo(i)}
                      className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 h-7 w-7 rounded-md cursor-pointer"
                      title="Remover documento"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
    </StandardDialog>
  )
}
