'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

export interface RotaItem {
  id: string
  nome: string
  turno: string
  ativo: boolean
  veiculo_id: string | null
  escola_id: string | null
  motorista_id?: string | null
  horario_partida?: string | null
  horario_retorno?: string | null
  veiculos?: { modelo: string; placa: string; capacidade: number } | null
  escolas?: { nome: string } | null
  motoristas?: { nome: string } | null
  total_alunos?: number
}

interface ModalRotaProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  veiculos: Array<{ id: string; modelo: string; placa: string; capacidade: number }>
  escolas: Array<{ id: string; nome: string }>
  motoristas: Array<{ id: string; nome: string }>
  onSaved: () => void
  editando?: RotaItem | null
}

export function ModalRota({ open, onOpenChange, veiculos, escolas, motoristas, onSaved, editando }: ModalRotaProps) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    nome: '',
    turno: 'MANHA',
    veiculo_id: '',
    escola_id: '',
    motorista_id: '',
    horario_partida: '',
    horario_retorno: '',
  })

  const prevOpenRef = useRef(false)
  const prevRotaIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!open) {
      prevOpenRef.current = false
      return
    }

    const wasClosed = !prevOpenRef.current
    const currentRotaId = editando?.id ?? null
    const rotaChanged = currentRotaId !== prevRotaIdRef.current

    // Se o modal já estava aberto e não mudou o ID da rota, não reseta
    if (!wasClosed && !rotaChanged) {
      return
    }

    prevOpenRef.current = true
    prevRotaIdRef.current = currentRotaId

    if (editando) {
      setForm({
        nome: editando.nome ?? '',
        turno: editando.turno ?? 'MANHA',
        veiculo_id: editando.veiculo_id ?? '',
        escola_id: editando.escola_id ?? '',
        motorista_id: editando.motorista_id ?? '',
        horario_partida: editando.horario_partida ?? '',
        horario_retorno: editando.horario_retorno ?? '',
      })
    } else {
      setForm({ nome: '', turno: 'MANHA', veiculo_id: '', escola_id: '', motorista_id: '', horario_partida: '', horario_retorno: '' })
    }
  }, [editando?.id, open])

  const handleSave = async () => {
    if (!form.nome.trim()) {
      toast.error('Informe o nome da rota.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        nome: form.nome.trim(),
        turno: form.turno,
        veiculo_id: form.veiculo_id || null,
        escola_id: form.escola_id || null,
        motorista_id: form.motorista_id || null,
        horario_partida: form.horario_partida || null,
        horario_retorno: form.horario_retorno || null,
        ativo: true,
      }

      const { error } = editando
        ? await (supabase as any).from('rotas_transporte').update(payload).eq('id', editando.id)
        : await (supabase as any).from('rotas_transporte').insert(payload)

      if (error) throw error

      toast.success(editando ? 'Rota atualizada!' : 'Rota cadastrada com sucesso!')
      onSaved()
      onOpenChange(false)
    } catch (err: any) {
      console.error(err)
      toast.error('Erro ao salvar rota: ' + (err?.message ?? 'Erro desconhecido'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title={editando ? 'Editar Rota' : 'Nova Rota de Transporte'}
      description="Cadastre ou edite uma rota de transporte escolar."
      maxWidth="sm:max-w-[540px]"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving} className="text-zinc-400">
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-sky-600 hover:bg-sky-700 text-white">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {saving ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Cadastrar Rota'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-zinc-300 text-sm">Nome da Rota *</Label>
          <Input
            value={form.nome}
            onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
            placeholder="Ex: Rota Rural Zona Norte"
            className="bg-[#1a1a1d] border-[#3f3f46] text-white"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-zinc-300 text-sm">Turno</Label>
            <Select value={form.turno} onValueChange={(v: string | null) => setForm((p) => ({ ...p, turno: v ?? 'MANHA' }))}>
              <SelectTrigger className="bg-[#1a1a1d] border-[#3f3f46] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1d] border-[#3f3f46]">
                <SelectItem value="MANHA" className="text-white">Manhã</SelectItem>
                <SelectItem value="TARDE" className="text-white">Tarde</SelectItem>
                <SelectItem value="INTEGRAL" className="text-white">Integral</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-300 text-sm">Veículo Vinculado</Label>
            <Select
              value={form.veiculo_id || '__none__'}
              onValueChange={(v: string | null) => setForm((p) => ({ ...p, veiculo_id: (!v || v === '__none__') ? '' : v }))}
            >
              <SelectTrigger className="bg-[#1a1a1d] border-[#3f3f46] text-white">
                <SelectValue placeholder="Selecione (opcional)">
                  {form.veiculo_id
                    ? (veiculos.find((v) => v.id === form.veiculo_id)?.modelo ?? form.veiculo_id)
                    : 'Nenhum'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1d] border-[#3f3f46] max-h-48 overflow-y-auto">
                <SelectItem value="__none__" className="text-zinc-400">Nenhum</SelectItem>
                {veiculos.map((v) => (
                  <SelectItem key={v.id} value={v.id} className="text-white">
                    {v.modelo} ({v.placa}) — Cap: {v.capacidade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-zinc-300 text-sm">Escola Atendida</Label>
            <Select
              value={form.escola_id || '__none__'}
              onValueChange={(v: string | null) => setForm((p) => ({ ...p, escola_id: (!v || v === '__none__') ? '' : v }))}
            >
              <SelectTrigger className="bg-[#1a1a1d] border-[#3f3f46] text-white">
                <SelectValue placeholder="Selecione a escola (opcional)">
                  {form.escola_id
                    ? (escolas.find((e) => e.id === form.escola_id)?.nome ?? form.escola_id)
                    : 'Nenhuma'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1d] border-[#3f3f46] max-h-48 overflow-y-auto">
                <SelectItem value="__none__" className="text-zinc-400">Nenhuma</SelectItem>
                {escolas.map((e) => (
                  <SelectItem key={e.id} value={e.id} className="text-white">{e.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-300 text-sm">Motorista da Rota</Label>
            <Select
              value={form.motorista_id || '__none__'}
              onValueChange={(v: string | null) => setForm((p) => ({ ...p, motorista_id: (!v || v === '__none__') ? '' : v }))}
            >
              <SelectTrigger className="bg-[#1a1a1d] border-[#3f3f46] text-white">
                <SelectValue placeholder="Selecione o motorista">
                  {form.motorista_id
                    ? (motoristas.find((m) => m.id === form.motorista_id)?.nome ?? form.motorista_id)
                    : 'Nenhum'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1d] border-[#3f3f46] max-h-48 overflow-y-auto">
                <SelectItem value="__none__" className="text-zinc-400">Nenhum</SelectItem>
                {motoristas.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="text-white">{m.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-zinc-300 text-sm">Horário de Saída</Label>
            <Input
              type="time"
              value={form.horario_partida}
              onChange={(e) => setForm((p) => ({ ...p, horario_partida: e.target.value }))}
              className="bg-[#1a1a1d] border-[#3f3f46] text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-300 text-sm">Horário de Retorno</Label>
            <Input
              type="time"
              value={form.horario_retorno}
              onChange={(e) => setForm((p) => ({ ...p, horario_retorno: e.target.value }))}
              className="bg-[#1a1a1d] border-[#3f3f46] text-white"
            />
          </div>
        </div>
      </div>
    </StandardDialog>
  )
}
