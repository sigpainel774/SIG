'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { Bus, Plus, Edit, Trash2, Map, Users, Loader2, RefreshCw, Route } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
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

/* ──────────────────────────── Types ──────────────────────────── */

interface Veiculo {
  id: string
  placa: string
  modelo: string
  capacidade: number
  status: string
  motorista_id: string | null
  funcionarios?: { nome: string } | null
}

interface Rota {
  id: string
  nome: string
  turno: string
  ativo: boolean
  veiculo_id: string | null
  escola_id: string | null
  veiculos?: { modelo: string; placa: string } | null
  escolas?: { nome: string } | null
}

interface Funcionario {
  id: string
  nome: string
}

interface Escola {
  id: string
  nome: string
}

interface FormVeiculoState {
  placa: string
  modelo: string
  capacidade: string
  status: string
  motorista_id: string
}

/* ──────────────────────── Modal Veículo ──────────────────────── */

interface ModalVeiculoProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  motoristas: Funcionario[]
  onSaved: () => void
  editando?: Veiculo | null
}

function ModalVeiculo({ open, onOpenChange, motoristas, onSaved, editando }: ModalVeiculoProps) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormVeiculoState>({
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
        capacidade: parseInt(form.capacidade) || 40,
        status: form.status,
        motorista_id: form.motorista_id || null,
      }

      const { error } = editando
        ? await supabase.from('veiculos').update(payload).eq('id', editando.id)
        : await supabase.from('veiculos').insert(payload)

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
              <SelectValue placeholder="Selecione um motorista (opcional)" />
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

/* ──────────────────────── Modal Rota ──────────────────────── */

interface FormRotaState {
  nome: string
  turno: string
  veiculo_id: string
  escola_id: string
}

interface ModalRotaProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  veiculos: Veiculo[]
  escolas: Escola[]
  onSaved: () => void
  editando?: Rota | null
}

function ModalRota({ open, onOpenChange, veiculos, escolas, onSaved, editando }: ModalRotaProps) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormRotaState>({
    nome: '',
    turno: 'MANHA',
    veiculo_id: '',
    escola_id: '',
  })

  useEffect(() => {
    if (editando) {
      setForm({
        nome: editando.nome ?? '',
        turno: editando.turno ?? 'MANHA',
        veiculo_id: editando.veiculo_id ?? '',
        escola_id: editando.escola_id ?? '',
      })
    } else {
      setForm({ nome: '', turno: 'MANHA', veiculo_id: '', escola_id: '' })
    }
  }, [editando, open])

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
        ativo: true,
      }

      const { error } = editando
        ? await supabase.from('rotas_transporte').update(payload).eq('id', editando.id)
        : await supabase.from('rotas_transporte').insert(payload)

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
      maxWidth="sm:max-w-[520px]"
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
                <SelectValue placeholder="Selecione (opcional)" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1d] border-[#3f3f46] max-h-48 overflow-y-auto">
                <SelectItem value="__none__" className="text-zinc-400">Nenhum</SelectItem>
                {veiculos.map((v) => (
                  <SelectItem key={v.id} value={v.id} className="text-white">
                    {v.modelo} — {v.placa}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-zinc-300 text-sm">Escola Associada</Label>
          <Select
            value={form.escola_id || '__none__'}
            onValueChange={(v: string | null) => setForm((p) => ({ ...p, escola_id: (!v || v === '__none__') ? '' : v }))}
          >
            <SelectTrigger className="bg-[#1a1a1d] border-[#3f3f46] text-white">
              <SelectValue placeholder="Selecione a escola (opcional)" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1d] border-[#3f3f46] max-h-48 overflow-y-auto">
              <SelectItem value="__none__" className="text-zinc-400">Nenhuma</SelectItem>
              {escolas.map((e) => (
                <SelectItem key={e.id} value={e.id} className="text-white">{e.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </StandardDialog>
  )
}

/* ─────────────────────── Page Principal ─────────────────────── */

export default function AdminTransportePage() {
  const supabase = createClient()
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [rotas, setRotas] = useState<Rota[]>([])
  const [motoristas, setMotoristas] = useState<Funcionario[]>([])
  const [escolas, setEscolas] = useState<Escola[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'veiculos' | 'rotas' | 'alunos'>('veiculos')

  // Modais
  const [modalVeiculo, setModalVeiculo] = useState(false)
  const [modalRota, setModalRota] = useState(false)
  const [editandoVeiculo, setEditandoVeiculo] = useState<Veiculo | null>(null)
  const [editandoRota, setEditandoRota] = useState<Rota | null>(null)

  const loadVeiculos = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('veiculos')
      .select('*, funcionarios(nome)')
      .order('created_at', { ascending: false })
    if (data) {
      setVeiculos(
        data.map((v: any) => ({
          id: v.id,
          placa: v.placa ?? '',
          modelo: v.modelo ?? '',
          capacidade: v.capacidade ?? 40,
          status: v.status ?? 'ATIVO',
          motorista_id: v.motorista_id ?? null,
          funcionarios: v.funcionarios ?? null,
        }))
      )
    }
    setLoading(false)
  }, [supabase])

  const loadRotas = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('rotas_transporte')
      .select('*, veiculos(modelo, placa), escolas(nome)')
      .order('created_at', { ascending: false })
    if (data) {
      setRotas(
        data.map((r: any) => ({
          id: r.id,
          nome: r.nome ?? '',
          turno: r.turno ?? 'MANHA',
          ativo: r.ativo ?? true,
          veiculo_id: r.veiculo_id ?? null,
          escola_id: r.escola_id ?? null,
          veiculos: r.veiculos ?? null,
          escolas: r.escolas ?? null,
        }))
      )
    }
    setLoading(false)
  }, [supabase])

  const loadAuxiliares = useCallback(async () => {
    const [{ data: funcs }, { data: esc }] = await Promise.all([
      supabase.from('funcionarios').select('id, nome').eq('status', 'ativo').order('nome'),
      supabase.from('escolas').select('id, nome').order('nome'),
    ])
    if (funcs) setMotoristas(funcs)
    if (esc) setEscolas(esc)
  }, [supabase])

  useEffect(() => {
    loadAuxiliares()
  }, [loadAuxiliares])

  useEffect(() => {
    if (activeTab === 'veiculos') loadVeiculos()
    else if (activeTab === 'rotas') loadRotas()
  }, [activeTab, loadVeiculos, loadRotas])

  const openNovoVeiculo = () => {
    setEditandoVeiculo(null)
    setModalVeiculo(true)
  }

  const openEditarVeiculo = (v: Veiculo) => {
    setEditandoVeiculo(v)
    setModalVeiculo(true)
  }

  const openNovaRota = () => {
    setEditandoRota(null)
    setModalRota(true)
  }

  const openEditarRota = (r: Rota) => {
    setEditandoRota(r)
    setModalRota(true)
  }

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      ATIVO: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      MANUTENCAO: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      INATIVO: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
    }
    return map[status] ?? 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
  }

  const getTurnoBadge = (turno: string) => {
    const map: Record<string, string> = {
      MANHA: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      TARDE: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
      INTEGRAL: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    }
    return map[turno] ?? 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
  }

  const getTurnoLabel = (turno: string) => {
    const map: Record<string, string> = { MANHA: 'Manhã', TARDE: 'Tarde', INTEGRAL: 'Integral' }
    return map[turno] ?? turno
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#3f3f46]">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bus className="w-6 h-6 text-sky-500" /> Transporte Escolar
          </h2>
          <p className="text-[#aaa] text-sm mt-1">Gestão de frotas, motoristas, rotas e alocação.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-[#121212] p-1 rounded-lg border border-[#3f3f46] flex">
            {(['veiculos', 'rotas', 'alunos'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${
                  activeTab === tab ? 'bg-[#3f3f46] text-white' : 'text-[#aaa] hover:text-white'
                }`}
              >
                {tab === 'veiculos' ? 'Veículos' : tab === 'rotas' ? 'Rotas' : 'Alunos'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Aba Veículos ── */}
      {activeTab === 'veiculos' && (
        <div className="space-y-4">
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={loadVeiculos}
              disabled={loading}
              className="text-zinc-400 hover:text-white border border-[#3f3f46]"
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button onClick={openNovoVeiculo} className="bg-sky-600 text-white hover:bg-sky-700">
              <Plus className="w-4 h-4 mr-2" /> Novo Veículo
            </Button>
          </div>

          <div className="rounded-xl border border-[#3f3f46] bg-[#121212] overflow-hidden">
            <Table>
              <TableHeader className="bg-[#181818] border-b border-[#3f3f46]">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="text-[#ccc] font-semibold">Veículo</TableHead>
                  <TableHead className="text-[#ccc] font-semibold">Motorista</TableHead>
                  <TableHead className="text-[#ccc] font-semibold">Capacidade</TableHead>
                  <TableHead className="text-[#ccc] font-semibold">Status</TableHead>
                  <TableHead className="text-right text-[#ccc] font-semibold">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-sky-500" />
                    </TableCell>
                  </TableRow>
                )}
                {!loading && veiculos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-[#aaa]">
                      <Bus className="w-10 h-10 mx-auto mb-3 text-[#3f3f46]" />
                      <p className="font-medium">Nenhum veículo cadastrado.</p>
                      <p className="text-xs mt-1">Clique em &quot;Novo Veículo&quot; para começar.</p>
                    </TableCell>
                  </TableRow>
                )}
                {!loading && veiculos.map((v) => (
                  <TableRow key={v.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                    <TableCell>
                      <div className="font-medium text-white">{v.modelo}</div>
                      <div className="text-xs text-[#aaa]">Placa: {v.placa}</div>
                    </TableCell>
                    <TableCell className="text-white">
                      {v.funcionarios?.nome ?? <span className="text-[#666] text-sm">Não vinculado</span>}
                    </TableCell>
                    <TableCell className="text-[#aaa]">{v.capacidade} lugares</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${getStatusBadge(v.status)}`}>
                        {v.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[#aaa] hover:text-white"
                        onClick={() => openEditarVeiculo(v)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ── Aba Rotas ── */}
      {activeTab === 'rotas' && (
        <div className="space-y-4">
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={loadRotas}
              disabled={loading}
              className="text-zinc-400 hover:text-white border border-[#3f3f46]"
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button onClick={openNovaRota} className="bg-sky-600 text-white hover:bg-sky-700">
              <Plus className="w-4 h-4 mr-2" /> Adicionar Rota
            </Button>
          </div>

          <div className="rounded-xl border border-[#3f3f46] bg-[#121212] overflow-hidden">
            <Table>
              <TableHeader className="bg-[#181818] border-b border-[#3f3f46]">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="text-[#ccc] font-semibold">Rota</TableHead>
                  <TableHead className="text-[#ccc] font-semibold">Turno</TableHead>
                  <TableHead className="text-[#ccc] font-semibold">Veículo</TableHead>
                  <TableHead className="text-[#ccc] font-semibold">Escola</TableHead>
                  <TableHead className="text-[#ccc] font-semibold">Status</TableHead>
                  <TableHead className="text-right text-[#ccc] font-semibold">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-sky-500" />
                    </TableCell>
                  </TableRow>
                )}
                {!loading && rotas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-[#aaa]">
                      <Route className="w-10 h-10 mx-auto mb-3 text-[#3f3f46]" />
                      <p className="font-medium">Nenhuma rota cadastrada.</p>
                      <p className="text-xs mt-1">Clique em &quot;Adicionar Rota&quot; para começar.</p>
                    </TableCell>
                  </TableRow>
                )}
                {!loading && rotas.map((r) => (
                  <TableRow key={r.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                    <TableCell>
                      <div className="font-medium text-white">{r.nome}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${getTurnoBadge(r.turno)}`}>
                        {getTurnoLabel(r.turno)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[#aaa]">
                      {r.veiculos
                        ? `${r.veiculos.modelo} (${r.veiculos.placa})`
                        : <span className="text-[#666] text-sm">Sem veículo</span>}
                    </TableCell>
                    <TableCell className="text-[#aaa]">
                      {r.escolas?.nome ?? <span className="text-[#666] text-sm">Sem escola</span>}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${r.ativo ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'}`}
                      >
                        {r.ativo ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[#aaa] hover:text-white"
                        onClick={() => openEditarRota(r)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ── Aba Alunos ── */}
      {activeTab === 'alunos' && (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed border-[#3f3f46] rounded-xl bg-[#121212]/50">
          <Users className="w-16 h-16 text-[#3f3f46] mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Alunos Transportados</h3>
          <p className="text-[#aaa] text-center max-w-md">
            Vincule os alunos às rotas criadas para organizar as listas de embarque.
          </p>
          <p className="text-xs text-[#555] mt-2">Em desenvolvimento.</p>
        </div>
      )}

      {/* ── Modais ── */}
      <ModalVeiculo
        open={modalVeiculo}
        onOpenChange={setModalVeiculo}
        motoristas={motoristas}
        onSaved={loadVeiculos}
        editando={editandoVeiculo}
      />

      <ModalRota
        open={modalRota}
        onOpenChange={setModalRota}
        veiculos={veiculos}
        escolas={escolas}
        onSaved={loadRotas}
        editando={editandoRota}
      />
    </div>
  )
}
