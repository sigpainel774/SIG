'use client'

import { useState, useEffect } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Building2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabaseClient'

interface EscolaToEdit {
  id?: string
  nome: string
  inep?: string | null
  tipo?: string | null
  ativo?: boolean | null
}

interface ModalEscolaProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  escolaToEdit?: EscolaToEdit | null
  onSuccess?: () => void
}

export function ModalEscola({ open, onOpenChange, escolaToEdit, onSuccess }: ModalEscolaProps) {
  const [loading, setLoading] = useState(false)
  const [nome, setNome] = useState('')
  const [inep, setInep] = useState('')
  const [tipo, setTipo] = useState('MUNICIPAL')
  const [ativo, setAtivo] = useState(true)

  useEffect(() => {
    if (escolaToEdit) {
      setNome(escolaToEdit.nome || '')
      setInep(escolaToEdit.inep || '')
      setTipo(escolaToEdit.tipo || 'MUNICIPAL')
      setAtivo(escolaToEdit.ativo !== false)
    } else {
      setNome('')
      setInep('')
      setTipo('MUNICIPAL')
      setAtivo(true)
    }
  }, [escolaToEdit, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) {
      toast.error('Preencha o Nome da Escola.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      if (escolaToEdit?.id) {
        const { error } = await supabase
          .from('escolas')
          .update({
            nome: nome.trim(),
            inep: inep.trim() || null,
            tipo,
            ativo
          })
          .eq('id', escolaToEdit.id)

        if (error) throw error
        toast.success('Escola atualizada com sucesso!')
      } else {
        const { error } = await supabase
          .from('escolas')
          .insert({
            nome: nome.trim(),
            inep: inep.trim() || null,
            tipo,
            ativo
          })

        if (error) throw error
        toast.success('Escola cadastrada com sucesso!')
      }

      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (err: any) {
      toast.error(`Erro ao salvar escola: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#121214] border-[#27272a] text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
            <Building2 className="w-5 h-5 text-purple-400" />
            {escolaToEdit ? 'Editar Unidade Escolar' : 'Cadastrar Nova Unidade Escolar'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div>
            <Label className="text-xs text-[#aaa]">Nome Completo da Escola *</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Escola Municipal Eraldo Tinoco"
              className="bg-[#18181a] border-[#27272a] text-white mt-1"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-[#aaa]">Código INEP</Label>
              <Input
                value={inep}
                onChange={(e) => setInep(e.target.value)}
                placeholder="Ex: 29182001"
                className="bg-[#18181a] border-[#27272a] text-white mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-[#aaa]">Tipo de Unidade</Label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full h-10 px-3 rounded-md bg-[#18181a] border border-[#27272a] text-white text-sm outline-none mt-1"
              >
                <option value="MUNICIPAL">MUNICIPAL</option>
                <option value="ESTADUAL">ESTADUAL</option>
                <option value="PRIVADA">PRIVADA</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="escolaAtivo"
              checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
              className="w-4 h-4 accent-purple-500 rounded border-gray-600 bg-gray-700 cursor-pointer"
            />
            <label htmlFor="escolaAtivo" className="text-sm text-slate-300 font-medium cursor-pointer">
              Unidade Escolar Ativa na Rede
            </label>
          </div>

          <DialogFooter className="gap-2 pt-4 border-t border-[#27272a]">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-[#1a1a1a] border-[#27272a] text-white hover:bg-[#27272a]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-purple-600 text-white hover:bg-purple-700 font-semibold gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Salvando...' : escolaToEdit ? 'Atualizar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
