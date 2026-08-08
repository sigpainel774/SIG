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
  const [secretariaId, setSecretariaId] = useState<string>('')
  const [secretarias, setSecretarias] = useState<{ id: string, nome: string }[]>([])

  useEffect(() => {
    const fetchSecretarias = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('secretarias')
        .select('id, nome')
        .eq('ativo', true)
        .order('created_at', { ascending: true })
      
      if (data) setSecretarias(data)
    }

    if (open) {
      fetchSecretarias()
    }
  }, [open])

  useEffect(() => {
    if (cargoToEdit) {
      setNome(cargoToEdit.nome || '')
      setNivel(String(cargoToEdit.nivel || 1))
      setDescricao(cargoToEdit.descricao || '')
      setSalarioBase(cargoToEdit.salario_base ? String(cargoToEdit.salario_base) : '')
      setAtivo(cargoToEdit.ativo !== false)
      setSecretariaId((cargoToEdit as any).secretaria_id || '')
    } else {
      setNome('')
      setNivel('1')
      setDescricao('')
      setSalarioBase('')
      setAtivo(true)
      setSecretariaId('')
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
        ativo,
        secretaria_id: secretariaId || null
      }

      if (cargoToEdit?.id) {
        const oldNome = cargoToEdit.nome
        const newNome = nome.trim()

        const { error } = await supabase
          .from('cargos')
          .update(payload)
          .eq('id', cargoToEdit.id)

        if (error) throw error

        // Se o nome do cargo foi alterado, atualiza os registros existentes em cascata nas tabelas dependentes
        if (oldNome && oldNome !== newNome) {
          const [funcRes, vincRes] = await Promise.all([
            supabase
              .from('funcionarios')
              .update({ cargo: newNome })
              .eq('cargo', oldNome),
            supabase
              .from('vinculos_funcionarios')
              .update({ cargo: newNome })
              .eq('cargo', oldNome)
          ])

          if (funcRes.error) {
            console.error('Erro ao propagar cargo em funcionarios:', funcRes.error)
          }
          if (vincRes.error) {
            console.error('Erro ao propagar cargo em vinculos_funcionarios:', vincRes.error)
          }
        }

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
          <Label className="text-xs text-muted-foreground">Secretaria *</Label>
          <select
            value={secretariaId}
            onChange={(e) => setSecretariaId(e.target.value)}
            className="w-full h-10 px-3 rounded-md bg-input border border-borderCustom text-foreground text-sm outline-none mt-1 focus:border-highlight focus:ring-2 focus:ring-highlight/20"
            required
          >
            <option value="">Selecione uma secretaria...</option>
            {secretarias.map((sec) => (
              <option key={sec.id} value={sec.id}>{sec.nome}</option>
            ))}
          </select>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Nome do Cargo *</Label>
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Coordenador Pedagógico"
            className="bg-input border-borderCustom text-foreground mt-1"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Nível Hierárquico</Label>
            <select
              value={nivel}
              onChange={(e) => setNivel(e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-input border border-borderCustom text-foreground text-sm outline-none mt-1 focus:border-highlight focus:ring-2 focus:ring-highlight/20"
            >
              <option value="1">Nível 1 (Direção Geral)</option>
              <option value="2">Nível 2 (Gestão / Coordenação)</option>
              <option value="3">Nível 3 (Corpo Docente / Técnico)</option>
              <option value="4">Nível 4 (Apoio Operacional)</option>
            </select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Salário Base (R$)</Label>
            <Input
              value={salarioBase}
              onChange={(e) => setSalarioBase(e.target.value)}
              placeholder="Ex: 3500.00"
              className="bg-input border-borderCustom text-foreground mt-1"
            />
          </div>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Descrição / Atribuições</Label>
          <Input
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Descrição sucinta das atribuições do cargo"
            className="bg-input border-borderCustom text-foreground mt-1"
          />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="cargoAtivo"
            checked={ativo}
            onChange={(e) => setAtivo(e.target.checked)}
            className="w-4 h-4 accent-amber-500 rounded border-borderCustom bg-input cursor-pointer"
          />
          <label htmlFor="cargoAtivo" className="text-sm text-foreground font-medium cursor-pointer">
            Cargo Ativo para Lotação
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-borderCustom mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="bg-card border-borderCustom text-foreground hover:bg-muted"
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
