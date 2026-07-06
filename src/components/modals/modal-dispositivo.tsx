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
import { MonitorSmartphone, Save } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabaseClient'

interface DispositivoToEdit {
  id?: string
  nome: string
  tipo: string
  identificador?: string | null
  escola_id?: string | null
  funcionario_id?: string | null
  status?: string | null
}

interface ModalDispositivoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dispositivoToEdit?: DispositivoToEdit | null
  onSuccess?: () => void
}

export function ModalDispositivo({ open, onOpenChange, dispositivoToEdit, onSuccess }: ModalDispositivoProps) {
  const [loading, setLoading] = useState(false)
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState('SMARTPHONE')
  const [identificador, setIdentificador] = useState('')
  const [alocacao, setAlocacao] = useState<'NENHUMA' | 'ESCOLA' | 'FUNCIONARIO'>('NENHUMA')
  const [escolaId, setEscolaId] = useState('')
  const [funcionarioId, setFuncionarioId] = useState('')
  const [status, setStatus] = useState('ATIVO')

  const [escolas, setEscolas] = useState<any[]>([])
  const [funcionarios, setFuncionarios] = useState<any[]>([])

  const supabase = createClient()

  useEffect(() => {
    const fetchSelectData = async () => {
      const [{ data: escolasData }, { data: funcionariosData }] = await Promise.all([
        supabase.from('escolas').select('id, nome').is('deleted_at', null).eq('ativo', true).order('nome'),
        supabase.from('funcionarios').select('id, nome').is('deleted_at', null).order('nome')
      ])
      
      if (escolasData) setEscolas(escolasData)
      if (funcionariosData) setFuncionarios(funcionariosData)
    }

    if (open) {
      fetchSelectData()
    }
  }, [open, supabase])

  useEffect(() => {
    if (dispositivoToEdit) {
      setNome(dispositivoToEdit.nome || '')
      setTipo(dispositivoToEdit.tipo || 'SMARTPHONE')
      setIdentificador(dispositivoToEdit.identificador || '')
      
      if (dispositivoToEdit.escola_id) {
        setAlocacao('ESCOLA')
        setEscolaId(dispositivoToEdit.escola_id)
        setFuncionarioId('')
      } else if (dispositivoToEdit.funcionario_id) {
        setAlocacao('FUNCIONARIO')
        setFuncionarioId(dispositivoToEdit.funcionario_id)
        setEscolaId('')
      } else {
        setAlocacao('NENHUMA')
        setEscolaId('')
        setFuncionarioId('')
      }
      
      setStatus(dispositivoToEdit.status || 'ATIVO')
    } else {
      setNome('')
      setTipo('SMARTPHONE')
      setIdentificador('')
      setAlocacao('NENHUMA')
      setEscolaId('')
      setFuncionarioId('')
      setStatus('ATIVO')
    }
  }, [dispositivoToEdit, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) {
      toast.error('Preencha o Nome do Dispositivo.')
      return
    }

    if (alocacao === 'ESCOLA' && !escolaId) {
      toast.error('Selecione uma Escola.')
      return
    }

    if (alocacao === 'FUNCIONARIO' && !funcionarioId) {
      toast.error('Selecione um Funcionário.')
      return
    }

    setLoading(true)

    try {
      const payload = {
        nome: nome.trim(),
        tipo,
        identificador: identificador.trim() || null,
        escola_id: alocacao === 'ESCOLA' ? escolaId : null,
        funcionario_id: alocacao === 'FUNCIONARIO' ? funcionarioId : null,
        status
      }

      if (dispositivoToEdit?.id) {
        const { error } = await supabase
          .from('dispositivos')
          .update(payload)
          .eq('id', dispositivoToEdit.id)

        if (error) throw error
        toast.success('Dispositivo atualizado com sucesso!')
      } else {
        const { error } = await supabase
          .from('dispositivos')
          .insert(payload)

        if (error) throw error
        toast.success('Dispositivo cadastrado com sucesso!')
      }

      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (err: any) {
      toast.error(`Erro ao salvar dispositivo: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#121214] border-[#27272a] text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
            <MonitorSmartphone className="w-5 h-5 text-sky-500" />
            {dispositivoToEdit ? 'Editar Dispositivo' : 'Cadastrar Dispositivo'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div>
            <Label className="text-xs text-[#aaa]">Nome do Dispositivo *</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Totem Portaria Entrada"
              className="bg-[#18181a] border-[#27272a] text-white mt-1"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-[#aaa]">Tipo</Label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full h-10 px-3 rounded-md bg-[#18181a] border border-[#27272a] text-white text-sm outline-none mt-1"
              >
                <option value="SMARTPHONE">SMARTPHONE</option>
                <option value="TABLET">TABLET</option>
                <option value="TOTEM">TOTEM</option>
              </select>
            </div>
            <div>
              <Label className="text-xs text-[#aaa]">Identificador (IMEI/MAC)</Label>
              <Input
                value={identificador}
                onChange={(e) => setIdentificador(e.target.value)}
                placeholder="Opcional"
                className="bg-[#18181a] border-[#27272a] text-white mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-[#aaa]">Alocação</Label>
            <div className="flex gap-4 mt-2 mb-3">
              <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                <input 
                  type="radio" 
                  name="alocacao" 
                  checked={alocacao === 'NENHUMA'} 
                  onChange={() => setAlocacao('NENHUMA')}
                  className="accent-sky-500"
                />
                Nenhuma
              </label>
              <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                <input 
                  type="radio" 
                  name="alocacao" 
                  checked={alocacao === 'ESCOLA'} 
                  onChange={() => setAlocacao('ESCOLA')}
                  className="accent-sky-500"
                />
                Escola
              </label>
              <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                <input 
                  type="radio" 
                  name="alocacao" 
                  checked={alocacao === 'FUNCIONARIO'} 
                  onChange={() => setAlocacao('FUNCIONARIO')}
                  className="accent-sky-500"
                />
                Funcionário
              </label>
            </div>

            {alocacao === 'ESCOLA' && (
              <select
                value={escolaId}
                onChange={(e) => setEscolaId(e.target.value)}
                className="w-full h-10 px-3 rounded-md bg-[#18181a] border border-[#27272a] text-white text-sm outline-none"
                required
              >
                <option value="" disabled>Selecione uma Escola</option>
                {escolas.map((esc) => (
                  <option key={esc.id} value={esc.id}>{esc.nome}</option>
                ))}
              </select>
            )}

            {alocacao === 'FUNCIONARIO' && (
              <select
                value={funcionarioId}
                onChange={(e) => setFuncionarioId(e.target.value)}
                className="w-full h-10 px-3 rounded-md bg-[#18181a] border border-[#27272a] text-white text-sm outline-none"
                required
              >
                <option value="" disabled>Selecione um Funcionário</option>
                {funcionarios.map((func) => (
                  <option key={func.id} value={func.id}>{func.nome}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <Label className="text-xs text-[#aaa]">Status</Label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-[#18181a] border border-[#27272a] text-white text-sm outline-none mt-1"
            >
              <option value="ATIVO">ATIVO</option>
              <option value="MANUTENÇÃO">EM MANUTENÇÃO</option>
              <option value="BLOQUEADO">BLOQUEADO</option>
            </select>
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
              className="bg-sky-600 text-white hover:bg-sky-700 font-semibold gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Salvando...' : dispositivoToEdit ? 'Atualizar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
