'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, Search, CheckSquare, Printer, Camera, Trophy, Link as LinkIcon, Archive, Trash2, Edit3, ArrowLeft, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { useSchoolStore } from '@/store/useSchoolStore'
import { Simulado, StatusSimulado } from '@/types/simulado'
import { toast } from 'sonner'
import { ModalNovoSimulado } from '@/components/cursinho/ModalNovoSimulado'
import { ModalImprimirGabarito } from '@/components/cursinho/ModalImprimirGabarito'
import { ModalScannerCamera } from '@/components/cursinho/ModalScannerCamera'
import { ModalRankingSimulado } from '@/components/cursinho/ModalRankingSimulado'

export default function SimuladosPage() {
  const [simulados, setSimulados] = useState<Simulado[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [tabAtiva, setTabAtiva] = useState<'ativos' | 'arquivados'>('ativos')

  // Modais de controle
  const [isModalNovoOpen, setIsModalNovoOpen] = useState(false)
  const [isModalImprimirOpen, setIsModalImprimirOpen] = useState(false)
  const [isModalScannerOpen, setIsModalScannerOpen] = useState(false)
  const [isModalRankingOpen, setIsModalRankingOpen] = useState(false)
  const [simuladoSelecionado, setSimuladoSelecionado] = useState<Simulado | null>(null)
  const [simuladoParaEditar, setSimuladoParaEditar] = useState<Simulado | null>(null)

  const supabase = createClient()
  const { escolaAtivaId } = useAuthStore()
  const { selectedEscola } = useSchoolStore()

  const carregarSimulados = async () => {
    if (!escolaAtivaId) {
      setSimulados([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      // Busca simulados com contagem de respostas e média de nota
      const { data, error } = await (supabase as any)
        .from('simulados')
        .select('*, simulados_respostas(id, nota_final)')
        .eq('escola_id', escolaAtivaId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) throw error

      const formatados = (data || []).map((s: any) => {
        const respostas = s.simulados_respostas || []
        const total_respostas = respostas.length
        const somaNotas = respostas.reduce((acc: number, r: any) => acc + (Number(r.nota_final) || 0), 0)
        const media_nota = total_respostas > 0 ? somaNotas / total_respostas : 0

        return {
          ...s,
          total_respostas,
          media_nota: Number(media_nota.toFixed(1))
        }
      })

      setSimulados(formatados)
    } catch (err: any) {
      console.error('Erro ao carregar simulados:', err)
      toast.error('Erro ao carregar simulados da escola')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarSimulados()
  }, [escolaAtivaId])

  // Ação de Arquivar / Desarquivar
  const handleToggleArquivar = async (simulado: Simulado) => {
    const novoStatus: StatusSimulado = simulado.status === 'arquivado' ? 'ativo' : 'arquivado'
    const acaoTexto = novoStatus === 'arquivado' ? 'arquivado' : 'desarquivado'

    try {
      const { error } = await (supabase as any)
        .from('simulados')
        .update({ status: novoStatus, updated_at: new Date().toISOString() })
        .eq('id', simulado.id)

      if (error) throw error
      toast.success(`Simulado ${acaoTexto} com sucesso!`)
      carregarSimulados()
    } catch (err: any) {
      toast.error(`Erro ao ${acaoTexto} simulado`)
    }
  }

  // Ação de Excluir (Soft delete com deleted_at)
  const handleExcluirSimulado = async (simulado: Simulado) => {
    if (!confirm(`Tem certeza que deseja excluir o simulado "${simulado.titulo}"? Esta ação removerá o simulado e suas notas.`)) {
      return
    }

    try {
      const { error } = await (supabase as any)
        .from('simulados')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', simulado.id)

      if (error) throw error
      toast.success('Simulado excluído com sucesso!')
      carregarSimulados()
    } catch (err: any) {
      toast.error('Erro ao excluir simulado')
    }
  }

  // Copiar link público da rota externa do aluno
  const handleCopiarLinkExterno = (token: string) => {
    if (typeof window === 'undefined') return
    const url = `${window.location.origin}/simulado-externo/${token}`
    navigator.clipboard.writeText(url)
    toast.success('Link do aluno copiado para a área de transferência!')
  }

  // Filtragem
  const simuladosFiltrados = useMemo(() => {
    return simulados.filter((s) => {
      const matchesSearch = s.titulo.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesTab = tabAtiva === 'ativos' ? s.status !== 'arquivado' : s.status === 'arquivado'
      return matchesSearch && matchesTab
    })
  }, [simulados, searchTerm, tabAtiva])

  // Estatísticas do topo
  const statsGerais = useMemo(() => {
    const totalSimulados = simulados.filter((s) => s.status !== 'arquivado').length
    const totalRespostas = simulados.reduce((acc, curr) => acc + (curr.total_respostas || 0), 0)
    return { totalSimulados, totalRespostas }
  }, [simulados])

  if (!escolaAtivaId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 bg-[#141416] border border-[#26262a] rounded-2xl max-w-lg mx-auto my-12 space-y-4">
        <CheckSquare className="w-12 h-12 text-emerald-500" />
        <h2 className="text-xl font-bold text-foreground">Nenhuma Unidade Selecionada</h2>
        <p className="text-muted-foreground text-sm max-w-sm">
          Selecione a unidade do <strong>Cursinho Pré-Universitário</strong> no seletor de escolas para gerenciar os simulados.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/home"
              className="p-1.5 rounded-lg bg-[#141416] border border-[#26262a] text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2.5">
              <CheckSquare className="w-7 h-7 text-emerald-400" /> Simulados OMR • {selectedEscola?.nome || 'Cursinho'}
            </h1>
          </div>
          <p className="text-xs text-muted-foreground">
            Crie provas, imprima gabaritos nominais com marcadores óticos e corrija via câmera ou pelo celular dos alunos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={carregarSimulados}
            className="border-[#26262a] text-xs font-bold gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Atualizar
          </Button>

          <Button
            onClick={() => {
              setSimuladoParaEditar(null)
              setIsModalNovoOpen(true)
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-2 shadow-lg shadow-emerald-900/20"
          >
            <Plus className="w-4 h-4" /> Novo Simulado
          </Button>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-[#141416] border border-[#26262a] rounded-2xl flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground font-medium block">Simulados Ativos</span>
            <span className="text-2xl font-black text-foreground">{statsGerais.totalSimulados}</span>
          </div>
        </div>

        <div className="p-4 bg-[#141416] border border-[#26262a] rounded-2xl flex items-center gap-3">
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
            <Camera className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground font-medium block">Correções Processadas</span>
            <span className="text-2xl font-black text-foreground">{statsGerais.totalRespostas}</span>
          </div>
        </div>

        <div className="p-4 bg-[#141416] border border-[#26262a] rounded-2xl flex items-center gap-3">
          <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground font-medium block">Formato OMR</span>
            <span className="text-sm font-extrabold text-foreground block">Câmera Web & Mobile</span>
          </div>
        </div>
      </div>

      {/* Abas e Filtro */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant={tabAtiva === 'ativos' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTabAtiva('ativos')}
            className="text-xs font-bold"
          >
            Simulados Ativos
          </Button>
          <Button
            variant={tabAtiva === 'arquivados' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTabAtiva('arquivados')}
            className="text-xs font-bold gap-1.5"
          >
            <Archive className="w-3.5 h-3.5" /> Arquivados
          </Button>
        </div>

        <div className="relative w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por título..."
            className="pl-9 h-9 bg-[#141416] border-[#26262a] text-xs"
          />
        </div>
      </div>

      {/* Listagem de Simulados */}
      {loading ? (
        <div className="py-16 text-center text-muted-foreground text-sm">Carregando simulados do Cursinho...</div>
      ) : simuladosFiltrados.length === 0 ? (
        <div className="py-16 text-center bg-[#141416] border border-[#26262a] rounded-2xl space-y-3 p-6 max-w-lg mx-auto">
          <CheckSquare className="w-12 h-12 text-muted-foreground mx-auto opacity-40" />
          <h3 className="text-base font-bold text-foreground">
            {tabAtiva === 'ativos' ? 'Nenhum simulado ativo cadastrado' : 'Nenhum simulado arquivado'}
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {tabAtiva === 'ativos'
              ? 'Clique em "Novo Simulado" para criar o primeiro simulado do cursinho com folha de gabarito e correção ótica.'
              : 'Simulados arquivados aparecerão aqui.'}
          </p>
          {tabAtiva === 'ativos' && (
            <Button
              onClick={() => {
                setSimuladoParaEditar(null)
                setIsModalNovoOpen(true)
              }}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5"
            >
              <Plus className="w-4 h-4" /> Criar Primeiro Simulado
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {simuladosFiltrados.map((simulado) => (
            <div
              key={simulado.id}
              className="bg-[#141416] border border-[#26262a] hover:border-[#3a3a40] rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-sm transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-foreground text-base tracking-tight line-clamp-1">
                      {simulado.titulo}
                    </h3>
                    <span className="text-[11px] text-muted-foreground">
                      Ano {simulado.ano_letivo} • {simulado.data_aplicacao ? new Date(simulado.data_aplicacao + 'T00:00:00').toLocaleDateString('pt-BR') : 'Data a definir'}
                    </span>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      simulado.status === 'arquivado'
                        ? 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}
                  >
                    {simulado.status}
                  </span>
                </div>

                {/* Tags de Configuração */}
                <div className="flex flex-wrap gap-2 text-[11px]">
                  <span className="px-2.5 py-1 bg-background border border-[#26262a] rounded-lg font-bold text-foreground">
                    {simulado.qtd_questoes} Questões
                  </span>
                  <span className="px-2.5 py-1 bg-background border border-[#26262a] rounded-lg font-bold text-foreground">
                    {simulado.alternativas_por_questao} Alternativas (A-{simulado.alternativas_por_questao === 4 ? 'D' : 'E'})
                  </span>
                  <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg font-bold text-emerald-400">
                    {simulado.total_respostas || 0} Alunos Corrigidos
                  </span>
                </div>

                {/* Métricas Rápidas */}
                <div className="p-3 bg-background border border-[#26262a] rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Média da Turma</span>
                    <span className="font-black text-emerald-400 text-sm">{simulado.media_nota || '0.0'}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground block">Auto-Correção</span>
                    <span className="font-bold text-foreground text-xs">
                      {simulado.auto_correcao_ativa ? 'Habilitada (Link)' : 'Desativada'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Barra de Ações Rápidas */}
              <div className="space-y-2 pt-2 border-t border-[#26262a]">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSimuladoSelecionado(simulado)
                      setIsModalImprimirOpen(true)
                    }}
                    className="border-[#26262a] text-xs font-bold gap-1.5 hover:bg-hoverCustom"
                  >
                    <Printer className="w-3.5 h-3.5 text-blue-400" /> Imprimir Folhas
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSimuladoSelecionado(simulado)
                      setIsModalScannerOpen(true)
                    }}
                    className="border-[#26262a] text-xs font-bold gap-1.5 hover:bg-hoverCustom text-emerald-400 hover:text-emerald-300"
                  >
                    <Camera className="w-3.5 h-3.5" /> Ler Câmera
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setSimuladoSelecionado(simulado)
                      setIsModalRankingOpen(true)
                    }}
                    className="text-xs font-bold gap-1.5 bg-[#1f1f24] hover:bg-[#282830]"
                  >
                    <Trophy className="w-3.5 h-3.5 text-amber-400" /> Ranking & Notas
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCopiarLinkExterno(simulado.token_publico)}
                    className="text-xs font-bold gap-1.5 text-muted-foreground hover:text-foreground"
                    title="Copiar Link para o Aluno"
                  >
                    <LinkIcon className="w-3.5 h-3.5 text-blue-400" /> Link Aluno
                  </Button>
                </div>

                {/* Botões Secundários (Editar, Arquivar, Excluir) */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <button
                    onClick={() => {
                      setSimuladoParaEditar(simulado)
                      setIsModalNovoOpen(true)
                    }}
                    className="text-muted-foreground hover:text-foreground flex items-center gap-1 font-semibold"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Editar
                  </button>

                  <button
                    onClick={() => handleToggleArquivar(simulado)}
                    className="text-muted-foreground hover:text-foreground flex items-center gap-1 font-semibold"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    {simulado.status === 'arquivado' ? 'Desarquivar' : 'Arquivar'}
                  </button>

                  <button
                    onClick={() => handleExcluirSimulado(simulado)}
                    className="text-rose-400 hover:text-rose-300 flex items-center gap-1 font-semibold"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Excluir
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modais Integrados */}
      <ModalNovoSimulado
        open={isModalNovoOpen}
        onOpenChange={setIsModalNovoOpen}
        escolaId={escolaAtivaId}
        simuladoParaEditar={simuladoParaEditar}
        onSuccess={carregarSimulados}
      />

      <ModalImprimirGabarito
        open={isModalImprimirOpen}
        onOpenChange={setIsModalImprimirOpen}
        simulado={simuladoSelecionado}
        escolaNome={selectedEscola?.nome || 'Cursinho Pré-Universitário'}
      />

      <ModalScannerCamera
        open={isModalScannerOpen}
        onOpenChange={setIsModalScannerOpen}
        simulado={simuladoSelecionado}
        onCorrecaoSalva={carregarSimulados}
      />

      <ModalRankingSimulado
        open={isModalRankingOpen}
        onOpenChange={setIsModalRankingOpen}
        simulado={simuladoSelecionado}
        escolaNome={selectedEscola?.nome || 'Cursinho Pré-Universitário'}
      />
    </div>
  )
}
