'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { toast } from 'sonner'
import {
  Route,
  ArrowLeft,
  Plus,
  Trash2,
  Edit,
  ExternalLink,
  Car,
  User,
  School,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  RefreshCw,
  Search,
  Sliders,
  FileText,
  Navigation,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Layers,
  Sparkles,
} from 'lucide-react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { AlphaIcon, AlphaIconMap } from '@/components/alpha/AlphaIcon'
import { AlphaFuncao } from '@/components/alpha/AlphaSidebar'
import { cn } from '@/lib/utils'
import HistoricoPercursosTab from '@/components/map/HistoricoPercursosTab'
import { SEDE_SEMED_SAPEACU, parseCoordinate } from '@/lib/routeOptimizer'

interface MotoristaOpcao {
  id: string
  nome: string
  cargo: string | null
  is_alpha: boolean | null
}

interface VeiculoOpcao {
  id: string
  placa: string
  modelo: string
  capacidade: number | null
  status: string | null
}

interface EscolaOpcao {
  id: string
  nome: string
  latitude: number | null
  longitude: number | null
  inep?: string | null
  localizacao?: string | null
  endereco?: string | null
}

interface ParadaRotaItem {
  id: string
  nome: string
  latitude: number
  longitude: number
  inep?: string | null
  localizacao?: string | null
  ordem: number
}

interface AlphaRota {
  id: string
  nome: string
  descricao: string | null
  motorista_id: string | null
  veiculo_id: string | null
  escola_id: string | null
  turno: string
  pontos_parada: ParadaRotaItem[]
  ativo: boolean
  is_alpha: boolean
  created_at: string
  updated_at: string
  motorista?: { id: string; nome: string; cargo: string | null } | null
  veiculo?: { id: string; placa: string; modelo: string } | null
}

export default function AdminAlphaFuncaoPage() {
  const params = useParams()
  const router = useRouter()
  const codigo = params?.codigo as string
  const supabase = createClient()
  const { funcionario } = useAuthStore()

  const [activeTab, setActiveTab] = useState<'rotas' | 'auditoria' | 'parametros'>('rotas')
  const [funcao, setFuncao] = useState<AlphaFuncao | null>(null)
  const [loadingFuncao, setLoadingFuncao] = useState(true)

  // Estados de Rotas
  const [rotas, setRotas] = useState<AlphaRota[]>([])
  const [loadingRotas, setLoadingRotas] = useState(true)
  const [motoristas, setMotoristas] = useState<MotoristaOpcao[]>([])
  const [veiculos, setVeiculos] = useState<VeiculoOpcao[]>([])
  const [escolas, setEscolas] = useState<EscolaOpcao[]>([])

  // Modal de Criação / Edição de Rota
  const [isModalRotaOpen, setIsModalRotaOpen] = useState(false)
  const [editingRotaId, setEditingRotaId] = useState<string | null>(null)
  const [salvandoRota, setSalvandoRota] = useState(false)

  // Formulário da Rota
  const [rotaNome, setRotaNome] = useState('')
  const [rotaDescricao, setRotaDescricao] = useState('')
  const [rotaMotoristaId, setRotaMotoristaId] = useState('')
  const [rotaVeiculoId, setRotaVeiculoId] = useState('')
  const [rotaTurno, setRotaTurno] = useState('MANHA')
  const [rotaParadas, setRotaParadas] = useState<ParadaRotaItem[]>([])
  const [buscaEscola, setBuscaEscola] = useState('')

  // Exclusão de Rota
  const [rotaParaExcluir, setRotaParaExcluir] = useState<AlphaRota | null>(null)
  const [excluindoRota, setExcluindoRota] = useState(false)

  // Formulário de Parâmetros da Função
  const [formNomeFuncao, setFormNomeFuncao] = useState('')
  const [formDescricaoFuncao, setFormDescricaoFuncao] = useState('')
  const [formIconeFuncao, setFormIconeFuncao] = useState('Route')
  const [formRotaDestino, setFormRotaDestino] = useState('')
  const [formOrdemFuncao, setFormOrdemFuncao] = useState(1)
  const [formAtivoFuncao, setFormAtivoFuncao] = useState(true)
  const [salvandoParametros, setSalvandoParametros] = useState(false)

  const isMounted = useRef(true)

  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  // 1. Carrega dados da Função Alpha
  const carregarFuncao = async () => {
    if (!codigo) return
    setLoadingFuncao(true)
    try {
      const { data, error } = await supabase
        .from('alpha_funcoes')
        .select('*')
        .eq('codigo', codigo)
        .single()

      if (error) throw error
      if (isMounted.current && data) {
        setFuncao(data)
        setFormNomeFuncao(data.nome)
        setFormDescricaoFuncao(data.descricao || '')
        setFormIconeFuncao(data.icone || 'Route')
        setFormRotaDestino(data.rota)
        setFormOrdemFuncao(data.ordem || 1)
        setFormAtivoFuncao(data.ativo)
      }
    } catch (err: any) {
      console.error('Erro ao carregar função:', err)
      toast.error('Não foi possível carregar a função do Alpha.')
    } finally {
      if (isMounted.current) setLoadingFuncao(false)
    }
  }

  // 2. Carrega Rotas Cadastradas
  const carregarRotas = async () => {
    setLoadingRotas(true)
    try {
      const { data, error } = await supabase
        .from('alpha_rotas')
        .select(`
          id,
          nome,
          descricao,
          motorista_id,
          veiculo_id,
          escola_id,
          turno,
          pontos_parada,
          ativo,
          is_alpha,
          created_at,
          updated_at,
          motorista:motorista_id (
            id,
            nome,
            cargo
          ),
          veiculo:veiculo_id (
            id,
            placa,
            modelo
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      if (isMounted.current) {
        setRotas((data as any) || [])
      }
    } catch (err: any) {
      console.error('Erro ao carregar rotas do Alpha:', err)
      toast.error('Não foi possível carregar as rotas planejadas.')
    } finally {
      if (isMounted.current) setLoadingRotas(false)
    }
  }

  // 3. Carrega Opções Auxiliares (Motoristas, Veículos e Escolas)
  const carregarOpcoesAuxiliares = async () => {
    try {
      const [resMotoristas, resVeiculos, resEscolas] = await Promise.all([
        supabase
          .from('funcionarios')
          .select('id, nome, cargo, is_alpha')
          .is('deleted_at', null)
          .order('nome'),
        supabase
          .from('veiculos')
          .select('id, placa, modelo, capacidade, status')
          .order('modelo'),
        supabase
          .from('escolas')
          .select('id, nome, latitude, longitude, inep, localizacao, endereco')
          .is('deleted_at', null)
          .order('nome'),
      ])

      if (isMounted.current) {
        if (resMotoristas.data) setMotoristas(resMotoristas.data)
        if (resVeiculos.data) setVeiculos(resVeiculos.data)
        if (resEscolas.data) setEscolas(resEscolas.data)
      }
    } catch (err: any) {
      console.error('Erro ao carregar dados auxiliares:', err)
    }
  }

  useEffect(() => {
    carregarFuncao()
    carregarRotas()
    carregarOpcoesAuxiliares()
  }, [codigo])

  // Escolas filtradas no modal de paradas
  const escolasDisponiveisParaAdicionar = useMemo(() => {
    const termo = buscaEscola.toLowerCase().trim()
    return escolas.filter((esc) => {
      const jaAdicionada = rotaParadas.some((p) => p.id === esc.id)
      if (jaAdicionada) return false
      if (!termo) return true
      return (
        esc.nome.toLowerCase().includes(termo) ||
        (esc.endereco || '').toLowerCase().includes(termo) ||
        (esc.inep || '').toLowerCase().includes(termo)
      )
    })
  }, [escolas, rotaParadas, buscaEscola])

  // Abrir Modal de Nova Rota
  const handleAbrirNovaRota = () => {
    setEditingRotaId(null)
    setRotaNome('')
    setRotaDescricao('')
    setRotaMotoristaId('')
    setRotaVeiculoId('')
    setRotaTurno('MANHA')
    // Por padrão já inclui a SEMED como parada inicial
    setRotaParadas([
      {
        id: SEDE_SEMED_SAPEACU.id,
        nome: 'Secretaria Municipal de Educação (SEMED - INEP 01)',
        latitude: SEDE_SEMED_SAPEACU.latitude,
        longitude: SEDE_SEMED_SAPEACU.longitude,
        inep: '01',
        localizacao: 'SEDE',
        ordem: 1,
      },
    ])
    setBuscaEscola('')
    setIsModalRotaOpen(true)
  }

  // Abrir Modal para Edição de Rota
  const handleAbrirEdicaoRota = (r: AlphaRota) => {
    setEditingRotaId(r.id)
    setRotaNome(r.nome)
    setRotaDescricao(r.descricao || '')
    setRotaMotoristaId(r.motorista_id || '')
    setRotaVeiculoId(r.veiculo_id || '')
    setRotaTurno(r.turno || 'MANHA')
    setRotaParadas(Array.isArray(r.pontos_parada) ? r.pontos_parada : [])
    setBuscaEscola('')
    setIsModalRotaOpen(true)
  }

  // Adicionar Escola à Rota
  const handleAdicionarEscolaAoItinerario = (esc: EscolaOpcao) => {
    const lat = parseCoordinate(esc.latitude)
    const lng = parseCoordinate(esc.longitude)

    if (lat === null || lng === null) {
      toast.error(`A escola "${esc.nome}" não possui coordenadas válidas cadastradas.`)
      return
    }

    const novaParada: ParadaRotaItem = {
      id: esc.id,
      nome: esc.nome,
      latitude: lat,
      longitude: lng,
      inep: esc.inep || null,
      localizacao: esc.localizacao || 'URBANA',
      ordem: rotaParadas.length + 1,
    }

    setRotaParadas((prev) => [...prev, novaParada])
    toast.success(`"${esc.nome}" adicionada ao itinerário!`)
  }

  // Remover Parada da Rota
  const handleRemoverParada = (id: string) => {
    setRotaParadas((prev) => {
      const filtradas = prev.filter((p) => p.id !== id)
      return filtradas.map((p, idx) => ({ ...p, ordem: idx + 1 }))
    })
  }

  // Salvar Rota (Insert ou Update)
  const handleSalvarRota = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rotaNome.trim()) {
      toast.error('Informe o nome da rota.')
      return
    }

    if (rotaParadas.length === 0) {
      toast.error('Adicione ao menos uma parada no itinerário.')
      return
    }

    setSalvandoRota(true)
    try {
      const payload = {
        nome: rotaNome.trim(),
        descricao: rotaDescricao.trim() || null,
        motorista_id: rotaMotoristaId || null,
        veiculo_id: rotaVeiculoId || null,
        turno: rotaTurno,
        pontos_parada: rotaParadas,
        ativo: true,
        is_alpha: true,
        criado_por: funcionario?.id ?? null,
        updated_at: new Date().toISOString(),
      }

      if (editingRotaId) {
        const { error } = await supabase
          .from('alpha_rotas')
          .update(payload)
          .eq('id', editingRotaId)

        if (error) throw error
        toast.success(`Rota "${rotaNome}" atualizada com sucesso!`)
      } else {
        const { error } = await supabase.from('alpha_rotas').insert(payload)
        if (error) throw error
        toast.success(`Nova rota "${rotaNome}" criada com sucesso!`)
      }

      setIsModalRotaOpen(false)
      carregarRotas()
    } catch (err: any) {
      console.error('Erro ao salvar rota:', err)
      toast.error(err.message || 'Falha ao gravar dados da rota.')
    } finally {
      setSalvandoRota(false)
    }
  }

  // Alternar Status da Rota (Ativo/Inativo)
  const handleToggleStatusRota = async (rota: AlphaRota) => {
    const novoStatus = !rota.ativo
    try {
      const { error } = await supabase
        .from('alpha_rotas')
        .update({ ativo: novoStatus, updated_at: new Date().toISOString() })
        .eq('id', rota.id)

      if (error) throw error

      setRotas((prev) =>
        prev.map((r) => (r.id === rota.id ? { ...r, ativo: novoStatus } : r))
      )
      toast.success(
        `Rota "${rota.nome}" ${novoStatus ? 'ativada para o App' : 'desativada'}!`
      )
    } catch (err: any) {
      console.error('Erro ao alterar status da rota:', err)
      toast.error('Não foi possível atualizar o status da rota.')
    }
  }

  // Excluir Rota
  const handleConfirmarExcluirRota = async () => {
    if (!rotaParaExcluir) return
    setExcluindoRota(true)
    try {
      const { error } = await supabase
        .from('alpha_rotas')
        .delete()
        .eq('id', rotaParaExcluir.id)

      if (error) throw error

      toast.success(`Rota "${rotaParaExcluir.nome}" excluída com sucesso!`)
      setRotas((prev) => prev.filter((r) => r.id !== rotaParaExcluir.id))
      setRotaParaExcluir(null)
    } catch (err: any) {
      console.error('Erro ao excluir rota:', err)
      toast.error('Falha ao excluir a rota.')
    } finally {
      setExcluindoRota(false)
    }
  }

  // Salvar Parâmetros Gerais da Função Alpha
  const handleSalvarParametrosFuncao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!funcao) return

    setSalvandoParametros(true)
    try {
      const { error } = await supabase
        .from('alpha_funcoes')
        .update({
          nome: formNomeFuncao.trim(),
          descricao: formDescricaoFuncao.trim() || null,
          icone: formIconeFuncao,
          rota: formRotaDestino.trim(),
          ordem: Number(formOrdemFuncao) || 1,
          ativo: formAtivoFuncao,
          updated_at: new Date().toISOString(),
        })
        .eq('id', funcao.id)

      if (error) throw error

      toast.success('Parâmetros da função atualizados com sucesso!')
      carregarFuncao()
    } catch (err: any) {
      console.error('Erro ao salvar parâmetros da função:', err)
      toast.error('Erro ao salvar os parâmetros da função.')
    } finally {
      setSalvandoParametros(false)
    }
  }

  if (loadingFuncao) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        <span className="text-sm font-semibold">Carregando painel da função Alpha...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6 select-none -mt-3 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* ── Top Header Bar & Breadcrumb ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/alpha"
            className="p-2.5 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-hoverCustom transition-colors"
            title="Voltar ao Painel Alpha"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Link href="/admin" className="hover:text-foreground transition-colors">
                Administração
              </Link>
              <span>/</span>
              <Link href="/admin/alpha" className="hover:text-foreground transition-colors">
                Sistema Alpha
              </Link>
              <span>/</span>
              <span className="text-violet-600 dark:text-violet-400 font-semibold">
                {funcao?.nome || 'Geolocalização & Rondas'}
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight flex items-center gap-2.5">
              <AlphaIcon name={funcao?.icone || 'Route'} className="w-7 h-7 text-violet-500 stroke-[2.2]" />
              {funcao?.nome || 'Geolocalização e Rotas'}
              <span className="bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/25 px-2.5 py-0.5 rounded-md text-[11px] font-extrabold tracking-wider uppercase">
                {funcao?.codigo?.toUpperCase() || 'ALPHA'}
              </span>
            </h1>
          </div>
        </div>

        {/* Ações Rápidas */}
        <div className="flex items-center gap-2.5">
          <Link
            href={funcao?.rota || '/alpha/rotas-escolas'}
            target="_blank"
            className="bg-violet-600 hover:bg-violet-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-sm shadow-violet-600/30"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Abrir no App Alpha</span>
          </Link>
        </div>
      </div>

      {/* ── Navegação entre Abas ── */}
      <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('rotas')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap',
            activeTab === 'rotas'
              ? 'bg-violet-600 text-white shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-card border border-transparent'
          )}
        >
          <Route className="w-4 h-4" />
          <span>Rotas & Atribuição de Motoristas ({rotas.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('auditoria')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap',
            activeTab === 'auditoria'
              ? 'bg-violet-600 text-white shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-card border border-transparent'
          )}
        >
          <FileText className="w-4 h-4" />
          <span>Relatório de Rondas & Replay no Mapa</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('parametros')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap',
            activeTab === 'parametros'
              ? 'bg-violet-600 text-white shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-card border border-transparent'
          )}
        >
          <Sliders className="w-4 h-4" />
          <span>Configuração da Função</span>
        </button>
      </div>

      {/* ── ABA 1: ROTAS PLANEJADAS & ATRIBUIÇÃO ── */}
      {activeTab === 'rotas' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border p-5 rounded-2xl">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-500" />
                Rotas Cadastradas & Designação de Motoristas / Veículos
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Crie trajetos com paradas ordenadas e atribua a um motorista ou veículo. A rota aparecerá instantaneamente no App Alpha do operador.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAbrirNovaRota}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-sm shadow-violet-600/25 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Rota Planejada</span>
            </button>
          </div>

          {loadingRotas ? (
            <div className="flex items-center justify-center py-16 text-xs text-muted-foreground gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
              Carregando rotas cadastradas...
            </div>
          ) : rotas.length === 0 ? (
            <div className="p-10 text-center border border-dashed border-border rounded-2xl bg-card/60 space-y-3">
              <Route className="w-10 h-10 text-muted-foreground/60 mx-auto" />
              <p className="text-sm font-bold text-foreground">Nenhuma rota cadastrada no momento</p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Clique no botão &quot;Nova Rota Planejada&quot; para definir os itinerários e atribuir aos motoristas do transporte e rondas.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rotas.map((r) => {
                const qtdParadas = Array.isArray(r.pontos_parada) ? r.pontos_parada.length : 0
                return (
                  <div
                    key={r.id}
                    className={cn(
                      'bg-card border rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all duration-200 shadow-xs hover:shadow-md',
                      r.ativo ? 'border-border' : 'border-border/60 opacity-75 bg-card/60'
                    )}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-base text-foreground">{r.nome}</h3>
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
                              Turno: {r.turno}
                            </span>
                          </div>
                          {r.descricao && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {r.descricao}
                            </p>
                          )}
                        </div>

                        {/* Toggle de ativação */}
                        <button
                          type="button"
                          onClick={() => handleToggleStatusRota(r)}
                          className={cn(
                            'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                            r.ativo ? 'bg-emerald-500' : 'bg-zinc-600'
                          )}
                          title={r.ativo ? 'Desativar rota' : 'Ativar rota'}
                        >
                          <span
                            className={cn(
                              'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                              r.ativo ? 'translate-x-5' : 'translate-x-0'
                            )}
                          />
                        </button>
                      </div>

                      {/* Informações de Motorista e Veículo */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border text-xs">
                        <div className="bg-surface-2 dark:bg-secondary/40 p-2 rounded-xl border border-border flex items-center gap-2">
                          <User className="w-4 h-4 text-sky-500 shrink-0" />
                          <div className="min-w-0">
                            <span className="text-[10px] text-muted-foreground block">Motorista / Operador</span>
                            <span className="font-semibold text-foreground truncate block">
                              {r.motorista?.nome ?? 'Não atribuído'}
                            </span>
                          </div>
                        </div>

                        <div className="bg-surface-2 dark:bg-secondary/40 p-2 rounded-xl border border-border flex items-center gap-2">
                          <Car className="w-4 h-4 text-emerald-500 shrink-0" />
                          <div className="min-w-0">
                            <span className="text-[10px] text-muted-foreground block">Veículo / Frota</span>
                            <span className="font-semibold text-foreground truncate block">
                              {r.veiculo ? `${r.veiculo.modelo} (${r.veiculo.placa})` : 'Não atribuído'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Paradas no Itinerário */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-muted-foreground flex items-center justify-between">
                          <span>Itinerário de Paradas:</span>
                          <span className="text-violet-600 dark:text-violet-400 font-extrabold">
                            {qtdParadas} escola(s)
                          </span>
                        </span>
                        <div className="flex flex-wrap gap-1.5 max-h-[72px] overflow-y-auto">
                          {Array.isArray(r.pontos_parada) &&
                            r.pontos_parada.map((p, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium bg-muted border border-border text-foreground truncate max-w-[200px]"
                              >
                                <span className="font-bold text-violet-500">{idx + 1}.</span>
                                {p.nome}
                              </span>
                            ))}
                        </div>
                      </div>
                    </div>

                    {/* Ações da Rota */}
                    <div className="flex items-center justify-between pt-3 border-t border-border text-xs">
                      <span className="text-[11px] text-muted-foreground">
                        Criada em {new Date(r.created_at).toLocaleDateString('pt-BR')}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleAbrirEdicaoRota(r)}
                          className="px-3 py-1.5 rounded-lg bg-card border border-border text-foreground hover:bg-hoverCustom font-semibold transition-colors flex items-center gap-1.5 cursor-pointer text-xs"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setRotaParaExcluir(r)}
                          className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                          title="Excluir Rota"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── ABA 2: AUDITORIA, RELATÓRIO DE RONDAS & REPLAY ── */}
      {activeTab === 'auditoria' && (
        <div className="space-y-6">
          <HistoricoPercursosTab />
        </div>
      )}

      {/* ── ABA 3: CONFIGURAÇÃO DA FUNÇÃO ── */}
      {activeTab === 'parametros' && (
        <div className="bg-card border border-border p-6 rounded-2xl max-w-2xl mx-auto shadow-sm">
          <div className="border-b border-border pb-4 mb-5">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Sliders className="w-5 h-5 text-violet-500" />
              Parâmetros de Exibição no Menu Alpha
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Personalize o nome, ícone e visibilidade desta ferramenta na barra lateral dos operadores.
            </p>
          </div>

          <form onSubmit={handleSalvarParametrosFuncao} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Nome da Função</label>
              <input
                type="text"
                value={formNomeFuncao}
                onChange={(e) => setFormNomeFuncao(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-violet-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Descrição</label>
              <textarea
                value={formDescricaoFuncao}
                onChange={(e) => setFormDescricaoFuncao(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-violet-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Ícone Lucide</label>
                <select
                  value={formIconeFuncao}
                  onChange={(e) => setFormIconeFuncao(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-violet-500"
                >
                  {Object.keys(AlphaIconMap).map((iconName) => (
                    <option key={iconName} value={iconName}>
                      {iconName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Ordem no Menu</label>
                <input
                  type="number"
                  value={formOrdemFuncao}
                  onChange={(e) => setFormOrdemFuncao(Number(e.target.value))}
                  min={1}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Rota de Destino</label>
              <input
                type="text"
                value={formRotaDestino}
                onChange={(e) => setFormRotaDestino(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground font-mono focus:outline-none focus:border-violet-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="checkAtivo"
                checked={formAtivoFuncao}
                onChange={(e) => setFormAtivoFuncao(e.target.checked)}
                className="rounded border-border text-violet-600 focus:ring-violet-500 cursor-pointer"
              />
              <label htmlFor="checkAtivo" className="text-xs font-semibold text-foreground cursor-pointer">
                Exibir esta função ativada na Sidebar do Sistema Alpha
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <button
                type="submit"
                disabled={salvandoParametros}
                className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 shadow-sm shadow-violet-600/25 flex items-center gap-2"
              >
                {salvandoParametros && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Salvar Parâmetros</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── MODAL: CRIAR / EDITAR ROTA ── */}
      <StandardDialog
        open={isModalRotaOpen}
        onOpenChange={setIsModalRotaOpen}
        title={editingRotaId ? 'Editar Rota Planejada' : 'Nova Rota Planejada'}
        description="Defina o trajeto de atendimento, motorista e veículo para o Sistema Alpha."
        maxWidth="sm:max-w-3xl"
      >
        <form onSubmit={handleSalvarRota} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Nome da Rota *</label>
              <input
                type="text"
                value={rotaNome}
                onChange={(e) => setRotaNome(e.target.value)}
                placeholder="Ex: Linha 01 - Jacarezinho / Cruz"
                required
                className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-violet-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Turno de Atendimento</label>
              <select
                value={rotaTurno}
                onChange={(e) => setRotaTurno(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-violet-500"
              >
                <option value="MANHA">Manhã (Matutino)</option>
                <option value="TARDE">Tarde (Vespertino)</option>
                <option value="NOITE">Noite (Noturno)</option>
                <option value="INTEGRAL">Integral / Dia Todo</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">Descrição / Observações</label>
            <input
              type="text"
              value={rotaDescricao}
              onChange={(e) => setRotaDescricao(e.target.value)}
              placeholder="Ex: Rota prioritária com paradas em unidades rurais"
              className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-violet-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-sky-500" />
                Motorista / Operador Designado
              </label>
              <select
                value={rotaMotoristaId}
                onChange={(e) => setRotaMotoristaId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-violet-500"
              >
                <option value="">Nenhum (Disponível para qualquer operador)</option>
                {motoristas.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome} {m.cargo ? `(${m.cargo})` : ''} {m.is_alpha ? '⭐ ALPHA' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-emerald-500" />
                Veículo da Frota Municipal
              </label>
              <select
                value={rotaVeiculoId}
                onChange={(e) => setRotaVeiculoId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-violet-500"
              >
                <option value="">Nenhum (Veículo livre / Avulso)</option>
                {veiculos.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.modelo} - Placa: {v.placa} ({v.capacidade ?? 40} lugares)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Construtor de Itinerário de Paradas */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <School className="w-4 h-4 text-violet-500" />
                Sequência de Paradas ({rotaParadas.length})
              </span>
              <span className="text-[11px] text-muted-foreground">
                Arraste ou ordene as unidades que compõem este trajeto
              </span>
            </div>

            {/* Lista Atual de Paradas */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {rotaParadas.map((p, index) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between bg-surface-2 dark:bg-secondary/40 border border-border px-3 py-2 rounded-xl text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-violet-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <span className="font-semibold text-foreground truncate block">{p.nome}</span>
                      {p.inep && (
                        <span className="text-[10px] text-muted-foreground">INEP: {p.inep}</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoverParada(p.id)}
                    className="p-1 rounded-md text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Remover parada"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Adicionar Mais Paradas */}
            <div className="space-y-2 pt-2 bg-muted/40 p-3 rounded-xl border border-border">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-foreground">
                  Adicionar Paradas ao Trajeto:
                </span>
                <div className="relative w-48 sm:w-64">
                  <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={buscaEscola}
                    onChange={(e) => setBuscaEscola(e.target.value)}
                    placeholder="Buscar unidade..."
                    className="w-full pl-7 pr-2.5 py-1 text-xs rounded-lg bg-background border border-border text-foreground focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pt-1">
                {escolasDisponiveisParaAdicionar.slice(0, 10).map((esc) => (
                  <button
                    key={esc.id}
                    type="button"
                    onClick={() => handleAdicionarEscolaAoItinerario(esc)}
                    className="flex items-center justify-between p-2 rounded-lg bg-card border border-border hover:border-violet-500/50 hover:bg-hoverCustom transition-all text-left cursor-pointer group"
                  >
                    <div className="min-w-0 pr-1">
                      <span className="text-xs font-semibold text-foreground truncate block group-hover:text-violet-500 transition-colors">
                        {esc.nome}
                      </span>
                      <span className="text-[10px] text-muted-foreground truncate block">
                        {esc.localizacao || 'Urbana'}
                      </span>
                    </div>
                    <Plus className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setIsModalRotaOpen(false)}
              className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-hoverCustom transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvandoRota}
              className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 shadow-sm shadow-violet-600/25 flex items-center gap-2"
            >
              {salvandoRota && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{editingRotaId ? 'Atualizar Rota' : 'Gravar Rota'}</span>
            </button>
          </div>
        </form>
      </StandardDialog>

      {/* ── MODAL: CONFIRMAR EXCLUSÃO DE ROTA ── */}
      {rotaParaExcluir && (
        <StandardDialog
          open={Boolean(rotaParaExcluir)}
          onOpenChange={(open) => !open && !excluindoRota && setRotaParaExcluir(null)}
          title="Excluir Rota Planejada"
          description="Tem certeza que deseja remover esta rota do Sistema Alpha?"
          maxWidth="sm:max-w-[420px]"
        >
          <div className="space-y-4 pt-2">
            <div className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-xl flex items-start gap-2.5 text-xs text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                A rota <strong>&quot;{rotaParaExcluir.nome}&quot;</strong> será removida do catálogo e deixará de aparecer no App Alpha.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRotaParaExcluir(null)}
                disabled={excluindoRota}
                className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-hoverCustom transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarExcluirRota}
                disabled={excluindoRota}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {excluindoRota && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirmar Exclusão</span>
              </button>
            </div>
          </div>
        </StandardDialog>
      )}
    </div>
  )
}
