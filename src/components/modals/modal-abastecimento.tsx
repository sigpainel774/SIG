'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Fuel, Loader2, Save } from 'lucide-react'

interface VeiculoItem {
  id: string
  modelo: string
  placa: string
}

interface ModalAbastecimentoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  veiculos: VeiculoItem[]
  onSuccess: () => void
}

export function ModalAbastecimento({
  open,
  onOpenChange,
  veiculos,
  onSuccess,
}: ModalAbastecimentoProps) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)

  const [veiculoId, setVeiculoId] = useState('')
  const [data, setData] = useState(new Date().toISOString().split('T')[0])
  const [odometroKm, setOdometroKm] = useState('')
  const [litros, setLitros] = useState('')
  const [valorTotal, setValorTotal] = useState('')
  const [tipoCombustivel, setTipoCombustivel] = useState('DIESEL')
  const [postoNota, setPostoNota] = useState('')

  useEffect(() => {
    if (open) {
      setData(new Date().toISOString().split('T')[0])
      setOdometroKm('')
      setLitros('')
      setValorTotal('')
      setTipoCombustivel('DIESEL')
      setPostoNota('')
      if (veiculos.length > 0 && !veiculoId) {
        setVeiculoId(veiculos[0].id)
      }
    }
  }, [open, veiculos])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!veiculoId) {
      toast.error('Selecione um veículo.')
      return
    }
    if (!odometroKm || Number(odometroKm) <= 0) {
      toast.error('Informe a leitura atual do Odômetro (KM).')
      return
    }
    if (!litros || Number(litros) <= 0) {
      toast.error('Informe a quantidade de litros abastecida.')
      return
    }
    if (!valorTotal || Number(valorTotal) <= 0) {
      toast.error('Informe o valor total do abastecimento (R$).')
      return
    }

    setSaving(true)
    try {
      const { error } = await (supabase as any).from('abastecimentos_veiculos').insert({
        veiculo_id: veiculoId,
        data: data,
        odometro_km: Number(odometroKm),
        litros: Number(litros),
        valor_total: Number(valorTotal),
        tipo_combustivel: tipoCombustivel,
        posto_nota: postoNota.trim() || null,
      })

      if (error) throw error

      toast.success('Abastecimento registrado com sucesso!')
      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      console.error('Erro ao salvar abastecimento:', err)
      toast.error(`Falha ao registrar abastecimento: ${err.message || 'Erro desconhecido.'}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Registrar Abastecimento"
      description="Lance os dados do combustível e quilometragem do veículo para cálculo de consumo."
      maxWidth="sm:max-w-[500px]"
    >
      <form onSubmit={handleSave} className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
            <Fuel className="w-4 h-4 text-amber-400" />
            Veículo da Frota *
          </Label>
          <Select value={veiculoId} onValueChange={(v: string | null) => setVeiculoId(v ?? '')}>
            <SelectTrigger className="bg-[#17171a] border-[#27272a] text-white text-sm h-10">
              <SelectValue placeholder="Selecione o veículo" />
            </SelectTrigger>
            <SelectContent className="bg-[#17171a] border-[#27272a] text-white">
              {veiculos.map((v) => (
                <SelectItem key={v.id} value={v.id} className="text-white">
                  {v.modelo} — Placa: {v.placa}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-zinc-300">Data do Abastecimento *</Label>
            <Input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="bg-[#17171a] border-[#27272a] text-white text-xs h-9"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-zinc-300">Odômetro Atual (KM) *</Label>
            <Input
              type="number"
              value={odometroKm}
              onChange={(e) => setOdometroKm(e.target.value)}
              placeholder="Ex: 124500"
              className="bg-[#17171a] border-[#27272a] text-white text-xs h-9"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-zinc-300">Litros (L) *</Label>
            <Input
              type="number"
              step="0.01"
              value={litros}
              onChange={(e) => setLitros(e.target.value)}
              placeholder="Ex: 85.5"
              className="bg-[#17171a] border-[#27272a] text-white text-xs h-9"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-zinc-300">Valor Total (R$) *</Label>
            <Input
              type="number"
              step="0.01"
              value={valorTotal}
              onChange={(e) => setValorTotal(e.target.value)}
              placeholder="Ex: 480.00"
              className="bg-[#17171a] border-[#27272a] text-white text-xs h-9"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-zinc-300">Tipo de Combustível</Label>
            <Select value={tipoCombustivel} onValueChange={(v: string | null) => setTipoCombustivel(v ?? 'DIESEL')}>
              <SelectTrigger className="bg-[#17171a] border-[#27272a] text-white text-xs h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#17171a] border-[#27272a] text-white">
                <SelectItem value="DIESEL">Diesel S10</SelectItem>
                <SelectItem value="GASOLINA">Gasolina</SelectItem>
                <SelectItem value="ETANOL">Etanol</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-zinc-300">Posto / Nota Fiscal</Label>
            <Input
              type="text"
              value={postoNota}
              onChange={(e) => setPostoNota(e.target.value)}
              placeholder="Ex: Posto Central - NF #1042"
              className="bg-[#17171a] border-[#27272a] text-white text-xs h-9"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-[#26262a]">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar Abastecimento
          </Button>
        </div>
      </form>
    </StandardDialog>
  )
}
