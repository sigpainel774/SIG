'use client'

import React, { useState, useEffect } from 'react'
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

export interface VeiculoItem {
  id: string
  placa: string
  modelo: string
  capacidade: number
  status: string
  motorista_id: string | null
  funcionarios?: { nome: string } | null
}

export interface FuncionarioItem {
  id: string
  nome: string
}

interface ModalVeiculoProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  motoristas: FuncionarioItem[]
  onSaved: () => void
  editando?: VeiculoItem | null
}

export function ModalVeiculo({ open, onOpenChange, motoristas, onSaved, editando }: ModalVeiculoProps) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    placa: '',
    modelo: '',
    capacidade: '40',
    status: 'ATIVO',
    motorista_id: '',
  })

  useEffect(() => {
    if (editando) {
      setForm({
        placa: editando.placa ?? '',
        modelo: editando.modelo ?? '',
        capacidade: String(editando.capacidade ?? 40),
        status: editando.status ?? 'ATIVO',
        motorista_id: editando.motorista_id ?? '',
      })
    } else {
      setForm({ placa: '', modelo: '', capacidade: '40', status: 'ATIVO', motorista_id: '' })
    }
  }, [editando, open])

  const handleSave = async () => {
    if (!form.placa.trim() || !form.modelo.trim()) {
      toast.error('Preencha placa e modelo do veículo.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        placa: form.placa.trim().toUpperCase(),
        modelo: form.modelo.trim(),
        capacidade: parseInt(form.capacidade, 10) || 40,
        status: form.status,
        motorista_id: form.motorista_id || null,
      }

      const { error } = editando
        ? await (supabase as any).from('veiculos').update(payload).eq('id', editando.id)
        : await (supabase as any).from('veiculos').insert(payload)

      if (error) throw error

      toast.success(editando ? 'Veículo atualizado!' : 'Veículo cadastrado com sucesso!')
      onSaved()
      onOpenChange(false)
    } catch (err: any) {
      console.error(err)
      toast.error('Erro ao salvar veículo: ' + (err?.message ?? 'Erro desconhecido'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title={editando ? 'Editar Veículo' : 'Novo Veículo'}
      description="Cadastre ou edite os dados de um veículo da frota escolar."
      maxWidth="sm:max-w-[520px]"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving} className="text-zinc-400">
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-sky-600 hover:bg-sky-700 text-white">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {saving ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Cadastrar Veículo'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-zinc-300 text-sm">Placa *</Label>
            <Input
              value={form.placa}
              onChange={(e) => setForm((p) => ({ ...p, placa: e.target.value }))}
              placeholder="Ex: ABC-1234"
              className="bg-[#1a1a1d] border-[#3f3f46] text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-300 text-sm">Modelo *</Label>
            <Input
              value={form.modelo}
              onChange={(e) => setForm((p) => ({ ...p, modelo: e.target.value }))}
              placeholder="Ex: Ônibus Marcopolo"
              className="bg-[#1a1a1d] border-[#3f3f46] text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-zinc-300 text-sm">Capacidade (lugares)</Label>
            <Input
              type="number"
              value={form.capacidade}
              onChange={(e) => setForm((p) => ({ ...p, capacidade: e.target.value }))}
              placeholder="40"
              className="bg-[#1a1a1d] border-[#3f3f46] text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-300 text-sm">Status</Label>
            <Select value={form.status} onValueChange={(v: string | null) => setForm((p) => ({ ...p, status: v ?? 'ATIVO' }))}>
              <SelectTrigger className="bg-[#1a1a1d] border-[#3f3f46] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1d] border-[#3f3f46]">
                <SelectItem value="ATIVO" className="text-white">Ativo</SelectItem>
                <SelectItem value="MANUTENCAO" className="text-white">Em Manutenção</SelectItem>
                <SelectItem value="INATIVO" className="text-white">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-zinc-300 text-sm">Motorista Responsável</Label>
          <Select
            value={form.motorista_id || '__none__'}
            onValueChange={(v: string | null) => setForm((p) => ({ ...p, motorista_id: (!v || v === '__none__') ? '' : v }))}
          >
            <SelectTrigger className="bg-[#1a1a1d] border-[#3f3f46] text-white">
              <SelectValue placeholder="Selecione um motorista (opcional)">
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
    </StandardDialog>
  )
}
