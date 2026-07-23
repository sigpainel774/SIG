'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabaseClient'
import {
  Bus,
  Plus,
  Edit,
  Trash2,
  Users,
  Loader2,
  RefreshCw,
  Route,
  Fuel,
  Wrench,
  UserPlus,
  AlertTriangle,
  Gauge,
  TrendingDown,
  ChevronRight,
} from 'lucide-react'
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

import { ModalAbastecimento } from '@/components/modals/modal-abastecimento'
import { ModalManutencao } from '@/components/modals/modal-manutencao'
import { ModalAlocarAlunoTransporte } from '@/components/modals/modal-alocar-aluno-transporte'

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
  motorista_id?: string | null
  horario_partida?: string | null
  horario_retorno?: string | null
  veiculos?: { modelo: string; placa: string; capacidade: number } | null
  escolas?: { nome: string } | null
  motoristas?: { nome: string } | null
  total_alunos?: number
}

interface Funcionario {
  id: string
  nome: string
}

interface Escola {
  id: string
  nome: string
}

interface Abastecimento {
  id: string
  veiculo_id: string
  data: string
  odometro_km: number
  litros: number
  valor_total: number
  tipo_combustivel: string
  posto_nota: string | null
  veiculos?: { modelo: string; placa: string } | null
  consumo_medio?: number | null
}

interface Manutencao {
  id: string
  veiculo_id: string
  data: string
  tipo: string
  odometro_km: number
  descricao: string
  valor_total: number
  oficina_fornecedor: string | null
  proxima_revisao_km: number | null
  veiculos?: { modelo: string; placa: string } | null
}

interface AlunoTransporte {
  id: string
  aluno_id: string
  rota_id: string
  ponto_embarque: string | null
  created_at: string
  alunos?: { id: string; nome: string; numero_matricula: string | null } | null
  rotas_transporte?: { id: string; nome: string; turno: string } | null
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
  motorista_id: string
  horario_partida: string
  horario_retorno: string
}

interface ModalRotaProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  veiculos: Veiculo[]
  escolas: Escola[]
  motoristas: Funcionario[]
  onSaved: () => void
  editando?: Rota | null
}

function ModalRota({ open, onOpenChange, veiculos, escolas, motoristas, onSaved, editando }: ModalRotaProps) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormRotaState>({
    nome: '',
    turno: 'MANHA',
    veiculo_id: '',
    escola_id: '',
    motorista_id: '',
    horario_partida: '',
    horario_retorno: '',
  })

  useEffect(() => {
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
                <SelectValue placeholder="Selecione (opcional)" />
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

          <div className="space-y-2">
            <Label className="text-zinc-300 text-sm">Motorista da Rota</Label>
            <Select
              value={form.motorista_id || '__none__'}
              onValueChange={(v: string | null) => setForm((p) => ({ ...p, motorista_id: (!v || v === '__none__') ? '' : v }))}
            >
              <SelectTrigger className="bg-[#1a1a1d] border-[#3f3f46] text-white">
                <SelectValue placeholder="Selecione o motorista" />
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

/* ─────────────────────── Page Principal ─────────────────────── */

export default function AdminTransportePage() {
  const supabase = createClient()
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [rotas, setRotas] = useState<Rota[]>([])
  const [motoristas, setMotoristas] = useState<Funcionario[]>([])
  const [escolas, setEscolas] = useState<Escola[]>([])
  const [abastecimentos, setAbastecimentos] = useState<Abastecimento[]>([])
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([])
  const [alunosTransporte, setAlunosTransporte] = useState<AlunoTransporte[]>([])

  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'veiculos' | 'rotas' | 'alunos' | 'combustivel' | 'manutencoes'>('veiculos')

  // Modais
  const [modalVeiculo, setModalVeiculo] = useState(false)
  const [modalRota, setModalRota] = useState(false)
  const [modalAbastecimentoOpen, setModalAbastecimentoOpen] = useState(false)
  const [modalManutencaoOpen, setModalManutencaoOpen] = useState(false)
  const [modalAlocarAlunoOpen, setModalAlocarAlunoOpen] = useState(false)

  const [editandoVeiculo, setEditandoVeiculo] = useState<Veiculo | null>(null)
  const [editandoRota, setEditandoRota] = useState<Rota | null>(null)

  const isMounted = useRef(true)

  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  const loadVeiculos = useCallback(async () => {
    setLoading(true)
    const { data } = await (supabase as any)
      .from('veiculos')
      .select('*, funcionarios(nome)')
      .order('created_at', { ascending: false })
    if (isMounted.current && data) {
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
    if (isMounted.current) setLoading(false)
  }, [supabase])

  const loadRotas = useCallback(async () => {
    setLoading(true)
    const [{ data: rotasData }, { data: alunosData }] = await Promise.all([
      (supabase as any)
        .from('rotas_transporte')
        .select('*, veiculos(modelo, placa, capacidade), escolas(nome), funcionarios(nome)')
        .order('created_at', { ascending: false }),
      (supabase as any)
        .from('alunos_transporte')
        .select('rota_id')
    ])

    if (isMounted.current && rotasData) {
      const contagemAlunos: Record<string, number> = {}
      if (alunosData) {
        alunosData.forEach((a: any) => {
          if (a.rota_id) {
            contagemAlunos[a.rota_id] = (contagemAlunos[a.rota_id] || 0) + 1
          }
        })
      }

      setRotas(
        rotasData.map((r: any) => ({
          id: r.id,
          nome: r.nome ?? '',
          turno: r.turno ?? 'MANHA',
          ativo: r.ativo ?? true,
          veiculo_id: r.veiculo_id ?? null,
          escola_id: r.escola_id ?? null,
          motorista_id: r.motorista_id ?? null,
          horario_partida: r.horario_partida ?? null,
          horario_retorno: r.horario_retorno ?? null,
          veiculos: r.veiculos ?? null,
          escolas: r.escolas ?? null,
          motoristas: r.funcionarios ?? null,
          total_alunos: contagemAlunos[r.id] || 0,
        }))
      )
    }
    if (isMounted.current) setLoading(false)
  }, [supabase])

  const loadAlunosTransporte = useCallback(async () => {
    setLoading(true)
    const { data } = await (supabase as any)
      .from('alunos_transporte')
      .select('*, alunos(id, nome, numero_matricula), rotas_transporte(id, nome, turno)')
      .order('created_at', { ascending: false })

    if (isMounted.current && data) {
      setAlunosTransporte(data)
    }
    if (isMounted.current) setLoading(false)
  }, [supabase])

  const loadAbastecimentos = useCallback(async () => {
    setLoading(true)
    const { data } = await (supabase as any)
      .from('abastecimentos_veiculos')
      .select('*, veiculos(modelo, placa)')
      .order('odometro_km', { ascending: false })

    if (isMounted.current && data) {
      // Calcular consumo médio (km/L) ordenando cronologicamente por veículo
      const porVeiculo: Record<string, any[]> = {}
      data.forEach((item: any) => {
        if (!porVeiculo[item.veiculo_id]) porVeiculo[item.veiculo_id] = []
        porVeiculo[item.veiculo_id].push(item)
      })

      const calculados = data.map((item: any) => {
        const lista = porVeiculo[item.veiculo_id] || []
        // achar o item anterior no odômetro
        const anteriores = lista.filter((a) => a.odometro_km < item.odometro_km)
        if (anteriores.length > 0) {
          const ultimo = anteriores.reduce((prev, curr) => (curr.odometro_km > prev.odometro_km ? curr : prev), anteriores[0])
          const kmRodados = item.odometro_km - ultimo.odometro_km
          const media = item.litros > 0 ? parseFloat((kmRodados / item.litros).toFixed(2)) : null
          return { ...item, consumo_medio: media }
        }
        return { ...item, consumo_medio: null }
      })

      setAbastecimentos(calculados)
    }
    if (isMounted.current) setLoading(false)
  }, [supabase])

  const loadManutencoes = useCallback(async () => {
    setLoading(true)
    const { data } = await (supabase as any)
      .from('manutencoes_veiculos')
      .select('*, veiculos(modelo, placa)')
      .order('data', { ascending: false })

    if (isMounted.current && data) {
      setManutencoes(data)
    }
    if (isMounted.current) setLoading(false)
  }, [supabase])

  const loadAuxiliares = useCallback(async () => {
    const [{ data: funcs }, { data: esc }] = await Promise.all([
      supabase.from('funcionarios').select('id, nome').eq('status', 'ativo').order('nome'),
      supabase.from('escolas').select('id, nome').order('nome'),
    ])
    if (isMounted.current) {
      if (funcs) setMotoristas(funcs)
      if (esc) setEscolas(esc)
    }
  }, [supabase])

  useEffect(() => {
    loadAuxiliares()
  }, [loadAuxiliares])

  useEffect(() => {
    if (activeTab === 'veiculos') loadVeiculos()
    else if (activeTab === 'rotas') loadRotas()
    else if (activeTab === 'alunos') loadAlunosTransporte()
    else if (activeTab === 'combustivel') loadAbastecimentos()
    else if (activeTab === 'manutencoes') loadManutencoes()
  }, [activeTab, loadVeiculos, loadRotas, loadAlunosTransporte, loadAbastecimentos, loadManutencoes])

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

  const handleDesvincularAluno = async (id: string) => {
    const confirm = window.confirm('Deseja realmente desvincular o aluno desta rota de transporte?')
    if (!confirm) return

    try {
      const { error } = await (supabase as any).from('alunos_transporte').delete().eq('id', id)
      if (error) throw error
      toast.success('Aluno desvinculado da rota.')
      loadAlunosTransporte()
    } catch (err: any) {
      toast.error('Erro ao desvincular aluno: ' + err.message)
    }
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
    <div className="space-y-6 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#3f3f46]">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bus className="w-6 h-6 text-sky-500" /> Transporte Escolar
          </h2>
          <p className="text-[#aaa] text-sm mt-1">Gestão de frota, rotas, alunos transportados, combustível e manutenções.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-[#121212] p-1 rounded-lg border border-[#3f3f46] flex flex-wrap gap-1">
            {(
              [
                { id: 'veiculos', label: 'Veículos' },
                { id: 'rotas', label: 'Rotas' },
                { id: 'alunos', label: 'Alunos' },
                { id: 'combustivel', label: 'Combustível' },
                { id: 'manutencoes', label: 'Manutenções' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  activeTab === tab.id ? 'bg-[#3f3f46] text-white' : 'text-[#aaa] hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Aba Veículos ── */}
      {activeTab === 'veiculos' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-zinc-400">Frota Cadastrada ({veiculos.length} veículos)</span>
            <div className="flex gap-2">
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
          </div>

          <div className="rounded-xl border border-[#3f3f46] bg-[#121212] overflow-hidden">
            <Table>
              <TableHeader className="bg-[#181818] border-b border-[#3f3f46]">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="text-[#ccc] font-semibold">Veículo</TableHead>
                  <TableHead className="text-[#ccc] font-semibold">Motorista Responsável</TableHead>
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
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-zinc-400">Rotas e Lotação ({rotas.length} rotas)</span>
            <div className="flex gap-2">
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
          </div>

          <div className="rounded-xl border border-[#3f3f46] bg-[#121212] overflow-hidden">
            <Table>
              <TableHeader className="bg-[#181818] border-b border-[#3f3f46]">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="text-[#ccc] font-semibold">Rota</TableHead>
                  <TableHead className="text-[#ccc] font-semibold">Turno & Horário</TableHead>
                  <TableHead className="text-[#ccc] font-semibold">Veículo / Motorista</TableHead>
                  <TableHead className="text-[#ccc] font-semibold">Lotação (Alunos)</TableHead>
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
                {!loading && rotas.map((r) => {
                  const capTotal = r.veiculos?.capacidade || 40
                  const alunosAlocados = r.total_alunos || 0
                  const percentual = Math.round((alunosAlocados / capTotal) * 100)
                  const superlotado = percentual > 100

                  return (
                    <TableRow key={r.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                      <TableCell>
                        <div className="font-medium text-white">{r.nome}</div>
                        <div className="text-xs text-[#aaa]">{r.escolas?.nome ?? 'Sem escola vinculada'}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className={`text-xs ${getTurnoBadge(r.turno)}`}>
                            {getTurnoLabel(r.turno)}
                          </Badge>
                          {r.horario_partida && (
                            <span className="text-xs text-[#aaa]">({r.horario_partida})</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-[#aaa]">
                        <div className="text-white text-xs font-semibold">
                          {r.veiculos ? `${r.veiculos.modelo} (${r.veiculos.placa})` : 'Sem veículo'}
                        </div>
                        <div className="text-[11px] text-[#aaa]">
                          Motorista: {r.motoristas?.nome ?? 'Não atribuído'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold ${superlotado ? 'text-rose-400' : percentual >= 80 ? 'text-amber-400' : 'text-emerald-400'}`}>
                              {alunosAlocados} / {capTotal} lugares ({percentual}%)
                            </span>
                            {superlotado && (
                              <span title="Capacidade excedida!">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                              </span>
                            )}
                          </div>
                          {/* Barra de progresso visual */}
                          <div className="w-32 h-1.5 bg-zinc-800 rounded-full mt-1 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${superlotado ? 'bg-rose-500' : percentual >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min(percentual, 100)}%` }}
                            />
                          </div>
                        </div>
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
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ── Aba Alunos ── */}
      {activeTab === 'alunos' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-zinc-400">Estudantes Enturmados em Rotas ({alunosTransporte.length} alunos)</span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={loadAlunosTransporte}
                disabled={loading}
                className="text-zinc-400 hover:text-white border border-[#3f3f46]"
                size="sm"
              >
                <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              <Button onClick={() => setModalAlocarAlunoOpen(true)} className="bg-sky-600 text-white hover:bg-sky-700">
                <UserPlus className="w-4 h-4 mr-2" /> Alocar Aluno em Rota
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-[#3f3f46] bg-[#121212] overflow-hidden">
            <Table>
              <TableHeader className="bg-[#181818] border-b border-[#3f3f46]">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="text-[#ccc] font-semibold">Aluno(a)</TableHead>
                  <TableHead className="text-[#ccc] font-semibold">Rota Vinculada</TableHead>
                  <TableHead className="text-[#ccc] font-semibold">Ponto de Embarque / Parada</TableHead>
                  <TableHead className="text-right text-[#ccc] font-semibold">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-sky-500" />
                    </TableCell>
                  </TableRow>
                )}
                {!loading && alunosTransporte.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-[#aaa]">
                      <Users className="w-10 h-10 mx-auto mb-3 text-[#3f3f46]" />
                      <p className="font-medium">Nenhum aluno alocado em transporte escolar.</p>
                      <p className="text-xs mt-1">Clique em &quot;Alocar Aluno em Rota&quot; para vincular estudantes aos ônibus.</p>
                    </TableCell>
                  </TableRow>
                )}
                {!loading && alunosTransporte.map((item) => (
                  <TableRow key={item.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                    <TableCell>
                      <div className="font-bold text-white">{item.alunos?.nome ?? 'Aluno não identificado'}</div>
                      <div className="text-xs text-[#aaa]">
                        Matrícula: {item.alunos?.numero_matricula ?? '—'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-sky-400">{item.rotas_transporte?.nome ?? 'Sem rota'}</div>
                      <div className="text-xs text-[#aaa]">Turno: {item.rotas_transporte?.turno ?? 'MANHA'}</div>
                    </TableCell>
                    <TableCell className="text-[#aaa] text-xs">
                      {item.ponto_embarque ?? <span className="text-[#666]">Não informado</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                        onClick={() => handleDesvincularAluno(item.id)}
                        title="Desvincular Aluno da Rota"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ── Aba Combustível / Abastecimentos ── */}
      {activeTab === 'combustivel' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-zinc-400">Histórico de Abastecimentos & Consumo ({abastecimentos.length} lançamentos)</span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={loadAbastecimentos}
                disabled={loading}
                className="text-zinc-400 hover:text-white border border-[#3f3f46]"
                size="sm"
              >
                <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              <Button onClick={() => setModalAbastecimentoOpen(true)} className="bg-amber-600 text-white hover:bg-amber-700">
                <Fuel className="w-4 h-4 mr-2" /> Registrar Abastecimento
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-[#3f3f46] bg-[#121212] overflow-hidden">
            <Table>
              <TableHeader className="bg-[#181818] border-b border-[#3f3f46]">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="text-[#ccc] font-semibold">Veículo</TableHead>
                  <TableHead className="text-[#ccc] font-semibold">Data</TableHead>
                  <TableHead className="text-[#ccc] font-semibold">Odômetro (KM)</TableHead>
                  <TableHead className="text-[#ccc] font-semibold">Litros & Combustível</TableHead>
                  <TableHead className="text-[#ccc] font-semibold">Consumo Médio</TableHead>
                  <TableHead className="text-right text-[#ccc] font-semibold">Valor Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-amber-500" />
                    </TableCell>
                  </TableRow>
                )}
                {!loading && abastecimentos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-[#aaa]">
                      <Fuel className="w-10 h-10 mx-auto mb-3 text-[#3f3f46]" />
                      <p className="font-medium">Nenhum abastecimento registrado.</p>
                      <p className="text-xs mt-1">Clique em &quot;Registrar Abastecimento&quot; para iniciar o controle de consumo.</p>
                    </TableCell>
                  </TableRow>
                )}
                {!loading && abastecimentos.map((item) => (
                  <TableRow key={item.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                    <TableCell>
                      <div className="font-bold text-white">{item.veiculos?.modelo ?? 'Veículo'}</div>
                      <div className="text-xs text-[#aaa]">Placa: {item.veiculos?.placa ?? '—'}</div>
                    </TableCell>
                    <TableCell className="text-zinc-300 text-xs font-mono">
                      {new Date(item.data).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-zinc-300 text-xs font-mono font-bold">
                      {Number(item.odometro_km).toLocaleString('pt-BR')} KM
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="text-amber-400 font-bold">{item.litros} Litros</div>
                      <div className="text-[#aaa]">{item.tipo_combustivel} {item.posto_nota ? `· ${item.posto_nota}` : ''}</div>
                    </TableCell>
                    <TableCell>
                      {item.consumo_medio ? (
                        <div className="flex items-center gap-1">
                          <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-xs font-bold text-emerald-400">{item.consumo_medio} KM/L</span>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-500">— (Primeiro Registro)</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-emerald-400 font-bold text-xs font-mono">
                      R$ {Number(item.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ── Aba Manutenções ── */}
      {activeTab === 'manutencoes' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-zinc-400">Histórico de Manutenções da Frota ({manutencoes.length} registros)</span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={loadManutencoes}
                disabled={loading}
                className="text-zinc-400 hover:text-white border border-[#3f3f46]"
                size="sm"
              >
                <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              <Button onClick={() => setModalManutencaoOpen(true)} className="bg-orange-600 text-white hover:bg-orange-700">
                <Wrench className="w-4 h-4 mr-2" /> Registrar Manutenção
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-[#3f3f46] bg-[#121212] overflow-hidden">
            <Table>
              <TableHeader className="bg-[#181818] border-b border-[#3f3f46]">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="text-[#ccc] font-semibold">Veículo</TableHead>
                  <TableHead className="text-[#ccc] font-semibold">Tipo & Data</TableHead>
                  <TableHead className="text-[#ccc] font-semibold">Odômetro</TableHead>
                  <TableHead className="text-[#ccc] font-semibold">Descrição do Serviço</TableHead>
                  <TableHead className="text-[#ccc] font-semibold">Próxima Revisão</TableHead>
                  <TableHead className="text-right text-[#ccc] font-semibold">Custo Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-orange-500" />
                    </TableCell>
                  </TableRow>
                )}
                {!loading && manutencoes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-[#aaa]">
                      <Wrench className="w-10 h-10 mx-auto mb-3 text-[#3f3f46]" />
                      <p className="font-medium">Nenhuma manutenção registrada.</p>
                      <p className="text-xs mt-1">Clique em &quot;Registrar Manutenção&quot; para acompanhar reparos e revisões.</p>
                    </TableCell>
                  </TableRow>
                )}
                {!loading && manutencoes.map((item) => (
                  <TableRow key={item.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                    <TableCell>
                      <div className="font-bold text-white">{item.veiculos?.modelo ?? 'Veículo'}</div>
                      <div className="text-xs text-[#aaa]">Placa: {item.veiculos?.placa ?? '—'}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${item.tipo === 'PREVENTIVA' ? 'bg-sky-500/20 text-sky-400 border-sky-500/30' : 'bg-rose-500/20 text-rose-400 border-rose-500/30'}`}>
                        {item.tipo}
                      </Badge>
                      <div className="text-[11px] text-[#aaa] mt-1 font-mono">
                        {new Date(item.data).toLocaleDateString('pt-BR')}
                      </div>
                    </TableCell>
                    <TableCell className="text-zinc-300 text-xs font-mono">
                      {Number(item.odometro_km).toLocaleString('pt-BR')} KM
                    </TableCell>
                    <TableCell className="text-xs text-zinc-300 max-w-xs">
                      <div>{item.descricao}</div>
                      {item.oficina_fornecedor && (
                        <div className="text-[11px] text-[#aaa]">Oficina: {item.oficina_fornecedor}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {item.proxima_revisao_km ? (
                        <span className="font-bold text-amber-400">Em {Number(item.proxima_revisao_km).toLocaleString('pt-BR')} KM</span>
                      ) : (
                        <span className="text-zinc-500">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-rose-400 font-bold text-xs font-mono">
                      R$ {Number(item.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
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
        motoristas={motoristas}
        onSaved={loadRotas}
        editando={editandoRota}
      />

      <ModalAbastecimento
        open={modalAbastecimentoOpen}
        onOpenChange={setModalAbastecimentoOpen}
        veiculos={veiculos}
        onSuccess={loadAbastecimentos}
      />

      <ModalManutencao
        open={modalManutencaoOpen}
        onOpenChange={setModalManutencaoOpen}
        veiculos={veiculos}
        onSuccess={loadManutencoes}
      />

      <ModalAlocarAlunoTransporte
        open={modalAlocarAlunoOpen}
        onOpenChange={setModalAlocarAlunoOpen}
        rotas={rotas}
        onSuccess={loadAlunosTransporte}
      />
    </div>
  )
}
