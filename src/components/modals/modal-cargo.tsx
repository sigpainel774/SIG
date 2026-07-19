'use client'

import { useState, useEffect } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Briefcase, Save } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabaseClient'

interface CargoToEdit {
  id?: string
  nome: string
  nivel?: number | null
  descricao?: string | null
  salario_base?: number | null
  ativo?: boolean | null
}

interface ModalCargoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cargoToEdit?: CargoToEdit | null
  onSuccess?: () => void
}

export function ModalCargo({ open, onOpenChange, cargoToEdit, onSuccess }: ModalCargoProps) {
  const [loading, setLoading] = useState(false)
  const [nome, setNome] = useState('')
  const [nivel, setNivel] = useState('1')
  const [descricao, setDescricao] = useState('')
  const [salarioBase, setSalarioBase] = useState('')
  const [ativo, setAtivo] = useState(true)

  useEffect(() => {
    if (cargoToEdit) {
      setNome(cargoToEdit.nome || '')
      setNivel(String(cargoToEdit.nivel || 1))
      setDescricao(cargoToEdit.descricao || '')
      setSalarioBase(cargoToEdit.salario_base ? String(cargoToEdit.salario_base) : '')
      setAtivo(cargoToEdit.ativo !== false)
    } else {
      setNome('')
      setNivel('1')
      setDescricao('')
      setSalarioBase('')
      setAtivo(true)
    }
  }, [cargoToEdit, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) {
      toast.error('Preencha o Nome do Cargo.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      const payload = {
        nome: nome.trim(),
        nivel: parseInt(nivel) || 1,
        descricao: descricao.trim() || null,
        salario_base: salarioBase ? parseFloat(salarioBase.replace(',', '.')) : null,
        ativo
      }

      if (cargoToEdit?.id) {
        const { error } = await supabase
          .from('cargos')
          .update(payload)
          .eq('id', cargoToEdit.id)

        if (error) throw error
        toast.success('Cargo atualizado com sucesso!')
      } else {
        const { error } = await supabase
          .from('cargos')
          .insert(payload)

        if (error) throw error
        toast.success('Cargo criado com sucesso!')
      }

      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (err: any) {
      toast.error(`Erro ao salvar cargo: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title={cargoToEdit ? 'Editar Cargo' : 'Criar Novo Cargo'}
      maxWidth="sm:max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label className="text-xs text-[#aaa]">Nome do Cargo *</Label>
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Coordenador Pedagógico"
            className="bg-[#18181a] border-[#27272a] text-white mt-1"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-[#aaa]">Nível Hierárquico</Label>
            <select
              value={nivel}
              onChange={(e) => setNivel(e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-[#18181a] border border-[#27272a] text-white text-sm outline-none mt-1"
            >
              <option value="1">Nível 1 (Direção Geral)</option>
              <option value="2">Nível 2 (Gestão / Coordenação)</option>
              <option value="3">Nível 3 (Corpo Docente / Técnico)</option>
              <option value="4">Nível 4 (Apoio Operacional)</option>
            </select>
          </div>

          <div>
            <Label className="text-xs text-[#aaa]">Salário Base (R$)</Label>
            <Input
              value={salarioBase}
              onChange={(e) => setSalarioBase(e.target.value)}
              placeholder="Ex: 3500.00"
              className="bg-[#18181a] border-[#27272a] text-white mt-1"
            />
          </div>
        </div>

        <div>
          <Label className="text-xs text-[#aaa]">Descrição / Atribuições</Label>
          <Input
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Descrição sucinta das atribuições do cargo"
            className="bg-[#18181a] border-[#27272a] text-white mt-1"
          />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="cargoAtivo"
            checked={ativo}
            onChange={(e) => setAtivo(e.target.checked)}
            className="w-4 h-4 accent-amber-500 rounded border-gray-600 bg-gray-700 cursor-pointer"
          />
          <label htmlFor="cargoAtivo" className="text-sm text-slate-300 font-medium cursor-pointer">
            Cargo Ativo para Lotação
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-[#27272a] mt-4">
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
            className="bg-amber-600 text-white hover:bg-amber-700 font-semibold gap-2"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Salvando...' : cargoToEdit ? 'Atualizar' : 'Criar Cargo'}
          </Button>
        </div>
      </form>
    </StandardDialog>
  )
}
