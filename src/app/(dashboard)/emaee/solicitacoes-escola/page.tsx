'use client'

import React, { useEffect, useState, useMemo, useRef } from 'react'
import { FileSpreadsheet, ArrowLeft, Search, Filter, MessageSquare, CheckCircle2, Clock, Send, FileText, School, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { IconTile } from '@/components/ui/icon-tile'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { toast } from 'sonner'
import Link from 'next/link'

interface SolicitacaoRelatorio {
  id: string
  emaee_matricula_id: string
  escola_origem_id: string
  solicitante_id?: string | null
  motivo_solicitacao: string
  prazo_resposta?: string | null
  status: string
  relatorio_resposta_texto?: string | null
  relatorio_resposta_anexo_url?: string | null
  respondido_por?: string | null
  respondido_em?: string | null
  created_at: string
  escolas?: {
    nome: string
  } | null
  emaee_matriculas?: {
    id: string
    alunos?: {
      nome: string
      foto_url?: string | null
    } | null
  } | null
}

export default function SolicitacoesEscolaPage() {
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoRelatorio[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS')
  
  // Modal de Resposta
  const [modalRespostaOpen, setModalRespostaOpen] = useState(false)
  const [solicitacaoAtiva, setSolicitacaoAtiva] = useState<SolicitacaoRelatorio | null>(null)
  const [respostaTexto, setRespostaTexto] = useState('')
  const [salvandoResposta, setSalvandoResposta] = useState(false)

  const { funcionario } = useAuthStore()
  const isMounted = useRef(true)

  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const carregarSolicitacoes = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('emaee_solicitacoes_relatorios')
        .select(`
          *,
          escolas:escola_origem_id (
            nome
          ),
          emaee_matriculas:emaee_matricula_id (
            id,
            alunos:aluno_id (
              nome,
              foto_url
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      if (data && isMounted.current) {
        setSolicitacoes(data as any)
      }
    } catch (err: any) {
      console.error('Erro ao carregar solicitações de relatórios:', err)
      toast.error('Erro ao carregar solicitações das escolas.')
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }

  useEffect(() => {
    carregarSolicitacoes()
  }, [])

  const handleAbrirResposta = (sol: SolicitacaoRelatorio) => {
    setSolicitacaoAtiva(sol)
    setRespostaTexto(sol.relatorio_resposta_texto || '')
    setModalRespostaOpen(true)
  }

  const handleSalvarResposta = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!solicitacaoAtiva) return
    if (!respostaTexto.trim()) {
      toast.error('Preencha o parecer/relatório da resposta.')
      return
    }

    setSalvandoResposta(true)
    try {
      const { error } = await supabase
        .from('emaee_solicitacoes_relatorios')
        .update({
          relatorio_resposta_texto: respostaTexto.trim(),
          status: 'RESPONDIDO',
          respondido_por: funcionario?.id ?? null,
          respondido_em: new Date().toISOString()
        })
        .eq('id', solicitacaoAtiva.id)

      if (error) throw error

      toast.success('Parecer/Relatório enviado com sucesso!')
      setModalRespostaOpen(false)
      setSolicitacaoAtiva(null)
      setRespostaTexto('')
      carregarSolicitacoes()
    } catch (err: any) {
      console.error('Erro ao salvar resposta:', err)
      toast.error(err.message || 'Erro ao enviar relatório.')
    } finally {
      if (isMounted.current) setSalvandoResposta(false)
    }
  }

  const solicitacoesFiltradas = useMemo(() => {
    return solicitacoes.filter((sol) => {
      const matchStatus = filtroStatus === 'TODOS' || sol.status === filtroStatus
      const alunoNome = sol.emaee_matriculas?.alunos?.nome || ''
      const escolaNome = sol.escolas?.nome || ''
      const motivo = sol.motivo_solicitacao || ''
      const termo = busca.toLowerCase()
      const matchBusca = alunoNome.toLowerCase().includes(termo) ||
        escolaNome.toLowerCase().includes(termo) ||
        motivo.toLowerCase().includes(termo)

      return matchStatus && matchBusca
    })
  }, [solicitacoes, filtroStatus, busca])

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Link href="/emaee/pacientes">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <IconTile
            icon={FileSpreadsheet}
            variant="primary"
            className="h-10 w-10 shrink-0"
          />
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Solicitações & Relatórios das Escolas
            </h1>
            <p className="text-xs text-muted-foreground">
              Pareceres pedagógicos e acompanhamento clínico requisitado pelas unidades regulares
            </p>
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card border border-border p-4 rounded-2xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por aluno, escola ou motivo..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full bg-secondary border border-border text-foreground rounded-xl pl-9 pr-4 py-2 text-xs outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="bg-secondary border border-border text-foreground text-xs rounded-xl px-3 py-2 outline-none cursor-pointer"
          >
            <option value="TODOS">Todos os Status</option>
            <option value="PENDENTE">Pendentes</option>
            <option value="RESPONDIDO">Respondidos</option>
          </select>
        </div>
      </div>

      {/* Lista de Solicitações */}
      {loading ? (
        <div className="text-center py-16 text-muted-foreground text-xs animate-pulse">
          Carregando solicitações das escolas...
        </div>
      ) : solicitacoesFiltradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-card text-card-foreground border border-border rounded-2xl">
          <FileSpreadsheet className="w-12 h-12 text-muted-foreground/40 mb-3" />
          <h3 className="text-base font-semibold text-foreground mb-1">Nenhuma solicitação encontrada</h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            Não foram encontradas requisições de relatórios com os filtros selecionados.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {solicitacoesFiltradas.map((sol) => {
            const isRespondido = sol.status === 'RESPONDIDO'
            const alunoNome = sol.emaee_matriculas?.alunos?.nome ?? 'Aluno não identificado'
            const escolaNome = sol.escolas?.nome ?? 'Escola Regular'

            return (
              <div
                key={sol.id}
                className="bg-card border border-border rounded-2xl p-5 space-y-4 hover:border-border/80 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2 border-b border-border/50 pb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-foreground font-bold text-sm truncate">
                        <User className="w-4 h-4 text-primary shrink-0" />
                        <span className="truncate">{alunoNome}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground text-xs mt-0.5">
                        <School className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{escolaNome}</span>
                      </div>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      isRespondido
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {isRespondido ? 'Respondido' : 'Pendente'}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <span className="text-muted-foreground font-semibold block text-[11px]">Justificativa / Solicitação:</span>
                    <p className="text-foreground/90 bg-secondary/30 p-2.5 rounded-xl border border-border/40 text-xs leading-relaxed">
                      {sol.motivo_solicitacao}
                    </p>
                  </div>

                  {isRespondido && sol.relatorio_resposta_texto && (
                    <div className="space-y-1.5 text-xs">
                      <span className="text-emerald-400 font-semibold block text-[11px] flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Parecer EMAEE Emitido:
                      </span>
                      <p className="text-foreground/90 bg-emerald-500/5 p-2.5 rounded-xl border border-emerald-500/20 text-xs leading-relaxed">
                        {sol.relatorio_resposta_texto}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border/50 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(sol.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>

                  <Button
                    size="sm"
                    variant={isRespondido ? 'outline' : 'default'}
                    onClick={() => handleAbrirResposta(sol)}
                    className="text-xs rounded-xl gap-1.5 h-8 font-semibold"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    {isRespondido ? 'Editar Parecer' : 'Emitir Parecer'}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de Emissão / Edição de Parecer */}
      <StandardDialog
        open={modalRespostaOpen}
        onOpenChange={setModalRespostaOpen}
        title={solicitacaoAtiva?.status === 'RESPONDIDO' ? 'Editar Parecer Clínico/Pedagógico' : 'Emitir Parecer Clínico/Pedagógico'}
        description={`Aluno: ${solicitacaoAtiva?.emaee_matriculas?.alunos?.nome ?? 'Desconhecido'} | Unidade: ${solicitacaoAtiva?.escolas?.nome ?? 'Escola'}`}
        maxWidth="sm:max-w-[600px]"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setModalRespostaOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="form-resposta-relatorio"
              disabled={salvandoResposta}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 py-2.5 rounded-xl text-sm gap-2"
            >
              <Send className="w-4 h-4" />
              {salvandoResposta ? 'Enviando...' : 'Salvar e Enviar Parecer'}
            </Button>
          </div>
        }
      >
        <form id="form-resposta-relatorio" onSubmit={handleSalvarResposta} className="space-y-4 pb-2">
          <div className="bg-secondary/40 p-3 rounded-xl border border-border/50 text-xs space-y-1">
            <strong className="text-foreground block">Solicitação da Escola:</strong>
            <p className="text-muted-foreground">{solicitacaoAtiva?.motivo_solicitacao}</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-foreground font-bold">Parecer Clínico / Pedagógico do EMAEE *</Label>
            <Textarea
              required
              rows={6}
              value={respostaTexto}
              onChange={(e) => setRespostaTexto(e.target.value)}
              placeholder="Descreva a evolução do estudante, recomendações pedagógicas, condutas de acolhimento e adaptações curriculares..."
              className="bg-secondary border-border text-foreground rounded-xl text-xs"
            />
          </div>
        </form>
      </StandardDialog>
    </div>
  )
}

