'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Wrench, Loader2, Save } from 'lucide-react'

interface VeiculoItem {
  id: string
  modelo: string
  placa: string
}

interface ModalManutencaoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  veiculos: VeiculoItem[]
  onSuccess: () => void
}

export function ModalManutencao({
  open,
  onOpenChange,
  veiculos,
  onSuccess,
}: ModalManutencaoProps) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)

  const [veiculoId, setVeiculoId] = useState('')
  const [data, setData] = useState(new Date().toISOString().split('T')[0])
  const [tipo, setTipo] = useState<'PREVENTIVA' | 'CORRETIVA'>('PREVENTIVA')
  const [odometroKm, setOdometroKm] = useState('')
  const [descricao, setDescricao] = useState('')
  const [valorTotal, setValorTotal] = useState('')
  const [oficinaFornecedor, setOficinaFornecedor] = useState('')
  const [proximaRevisaoKm, setProximaRevisaoKm] = useState('')

  useEffect(() => {
    if (open) {
      setData(new Date().toISOString().split('T')[0])
      setTipo('PREVENTIVA')
      setOdometroKm('')
      setDescricao('')
      setValorTotal('')
      setOficinaFornecedor('')
      setProximaRevisaoKm('')
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
    if (!descricao.trim()) {
      toast.error('Informe a descrição do serviço / peças efetuadas.')
      return
    }

    setSaving(true)
    try {
      const { error } = await (supabase as any).from('manutencoes_veiculos').insert({
        veiculo_id: veiculoId,
        data: data,
        tipo: tipo,
        odometro_km: Number(odometroKm),
        descricao: descricao.trim(),
        valor_total: valorTotal ? Number(valorTotal) : 0,
        oficina_fornecedor: oficinaFornecedor.trim() || null,
        proxima_revisao_km: proximaRevisaoKm ? Number(proximaRevisaoKm) : null,
      })

      if (error) throw error

      toast.success('Manutenção registrada com sucesso!')
      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      console.error('Erro ao salvar manutenção:', err)
      toast.error(`Falha ao registrar manutenção: ${err.message || 'Erro desconhecido.'}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Registrar Manutenção / Revisão"
      description="Cadastre serviços preventivos ou corretivos efetuados no veículo."
      maxWidth="sm:max-w-[540px]"
    >
      <form onSubmit={handleSave} className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
            <Wrench className="w-4 h-4 text-orange-400" />
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

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-zinc-300">Tipo *</Label>
            <Select value={tipo} onValueChange={(v: any) => setTipo(v ?? 'PREVENTIVA')}>
              <SelectTrigger className="bg-[#17171a] border-[#27272a] text-white text-xs h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#17171a] border-[#27272a] text-white">
                <SelectItem value="PREVENTIVA">Preventiva</SelectItem>
                <SelectItem value="CORRETIVA">Corretiva</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-zinc-300">Data *</Label>
            <Input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="bg-[#17171a] border-[#27272a] text-white text-xs h-9"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-zinc-300">Odômetro (KM) *</Label>
            <Input
              type="number"
              value={odometroKm}
              onChange={(e) => setOdometroKm(e.target.value)}
              placeholder="Ex: 125000"
              className="bg-[#17171a] border-[#27272a] text-white text-xs h-9"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold text-zinc-300">Descrição do Serviço / Peças Trocadas *</Label>
          <Textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Ex: Troca de óleo do motor, filtro de ar e revisão das pastilhas de freio dianteiras."
            className="bg-[#17171a] border-[#27272a] text-white text-xs min-h-[70px]"
            required
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-zinc-300">Custo Total (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={valorTotal}
              onChange={(e) => setValorTotal(e.target.value)}
              placeholder="Ex: 650.00"
              className="bg-[#17171a] border-[#27272a] text-white text-xs h-9"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-zinc-300">Oficina / Fornecedor</Label>
            <Input
              type="text"
              value={oficinaFornecedor}
              onChange={(e) => setOficinaFornecedor(e.target.value)}
              placeholder="Ex: Auto Mecânica Sapeaçu"
              className="bg-[#17171a] border-[#27272a] text-white text-xs h-9"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-zinc-300">Próx. Revisão (KM)</Label>
            <Input
              type="number"
              value={proximaRevisaoKm}
              onChange={(e) => setProximaRevisaoKm(e.target.value)}
              placeholder="Ex: 135000"
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
            className="bg-orange-600 hover:bg-orange-700 text-white font-semibold flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar Manutenção
          </Button>
        </div>
      </form>
    </StandardDialog>
  )
}
