'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import {
  Heart,
  ArrowLeft,
  Calendar,
  AlertTriangle,
  FolderOpen,
  MapPin,
  ClipboardList,
  UserPlus,
  Paperclip,
  FileSpreadsheet,
  Plus,
  Activity,
  CheckCircle,
  FileText
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { ModalEvolucaoEmaee } from '@/components/modals/modal-evolucao-emaee'

export default function PacienteDetalhesPage() {
  const params = useParams()
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id || '')
  const { funcionario } = useAuthStore()
  
  const [prontuario, setProntuario] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  const [activeTab, setActiveTab] = useState<'evolucao' | 'especialistas' | 'anexos' | 'relatorios'>('evolucao')
  
  // Estados de Evolução
  const [evolucoes, setEvolucoes] = useState<any[]>([])
  const [loadingEvolucoes, setLoadingEvolucoes] = useState(false)

  // Estados de Especialidades
  const [especialidades, setEspecialidades] = useState<any[]>([])
  const [loadingEspecialidades, setLoadingEspecialidades] = useState(false)

  // Estados de Relatórios Escolares
  const [solicitacoesRelatorios, setSolicitacoesRelatorios] = useState<any[]>([])
  const [modalNovaSolicitacao, setModalNovaSolicitacao] = useState(false)
  const [novaSolicitacao, setNovaSolicitacao] = useState({
    motivo_solicitacao: '',
    prazo_resposta: ''
  })

  const carregarProntuario = async () => {
    setLoading(true)
    const supabase = createClient()
    try {
      const { data, error } = await supabase
        .from('emaee_matriculas')
        .select(`
          *,
          alunos (
            nome,
            cpf,
            telefone,
            rg,
            identif_unica_censo,
            sexo,
            cor_raca,
            profissao_mae,
            profissao_pai,
            nome_contato_emergencia,
            dados_matricula
          ),
          escolas:escola_regular_id (
            nome
          )
        `)
        .eq('id', id)
        .maybeSingle()

      if (error) throw error
      if (data) {
        setProntuario(data)
      }
    } catch (err) {
      console.error('Erro ao carregar prontuário completo:', err)
      toast.error('Erro ao carregar prontuário')
    } finally {
      setLoading(false)
    }
  }

  const carregarEvolucoes = async () => {
    setLoadingEvolucoes(true)
    const supabase = createClient()
    try {
      const { data, error } = await supabase
        .from('emaee_evolucoes')
        .select(`
          *,
          funcionarios (
            nome
          )
        `)
        .eq('emaee_matricula_id', id)
        .order('data_atendimento', { ascending: false })

      if (error) throw error
      if (data) {
        setEvolucoes(data)
      }
    } catch (err) {
      console.error('Erro ao carregar evoluções:', err)
    } finally {
      setLoadingEvolucoes(false)
    }
  }

  const carregarEspecialidades = async () => {
    setLoadingEspecialidades(true)
    const supabase = createClient()
    try {
      const { data, error } = await supabase
        .from('emaee_especialidades_vinculadas')
        .select(`
          *,
          funcionarios (
            nome
          )
        `)
        .eq('emaee_matricula_id', id)
        .eq('ativo', true)

      if (error) throw error
      if (data) {
        setEspecialidades(data)
      }
    } catch (err) {
      console.error('Erro ao carregar especialidades:', err)
    } finally {
      setLoadingEspecialidades(false)
    }
  }

  const carregarSolicitacoesRelatorios = async () => {
    const supabase = createClient()
    try {
      const { data, error } = await supabase
        .from('emaee_solicitacoes_relatorios')
        .select(`
          *,
          escolas (
            nome
          )
        `)
        .eq('emaee_matricula_id', id)
        .order('created_at', { ascending: false })

      if (error) throw error
      if (data) {
        setSolicitacoesRelatorios(data)
      }
    } catch (err) {
      console.error('Erro ao carregar solicitações de relatórios:', err)
    }
  }

  useEffect(() => {
    if (id) {
      carregarProntuario()
    }
  }, [id])

  useEffect(() => {
    if (id) {
      if (activeTab === 'evolucao') carregarEvolucoes()
      if (activeTab === 'especialistas') carregarEspecialidades()
      if (activeTab === 'relatorios') carregarSolicitacoesRelatorios()
    }
  }, [id, activeTab])



  const solicitarRelatorioEscola = async () => {
    if (!novaSolicitacao.motivo_solicitacao.trim()) {
      toast.error('Preencha a justificativa/motivo do relatório')
      return
    }
    if (!funcionario?.id) {
      toast.error('Profissional de saúde não autenticado')
      return
    }
    const supabase = createClient()
    try {
      const { error } = await supabase.from('emaee_solicitacoes_relatorios').insert({
        emaee_matricula_id: id,
        escola_origem_id: prontuario.escola_regular_id,
        solicitante_id: funcionario.id,
        motivo_solicitacao: novaSolicitacao.motivo_solicitacao,
        prazo_resposta: novaSolicitacao.prazo_resposta || null
      })

      if (error) throw error
      toast.success('Solicitação de parecer pedagógico enviada para a Escola de Origem!')
      setModalNovaSolicitacao(false)
      setNovaSolicitacao({ motivo_solicitacao: '', prazo_resposta: '' })
      carregarSolicitacoesRelatorios()
    } catch (err) {
      console.error('Erro ao solicitar relatório:', err)
      toast.error('Erro ao enviar solicitação')
    }
  }

  if (loading) {
    return (
      <div className="text-center py-16 bg-surface-1 rounded-2xl border border-border text-muted-foreground animate-pulse">
        Carregando prontuário eletrônico completo...
      </div>
    )
  }

  if (!prontuario) {
    return (
      <div className="text-center py-16 bg-surface-1 rounded-2xl border border-border text-muted-foreground">
        Nenhum prontuário encontrado para este ID.
      </div>
    )
  }

  const aluno = prontuario.alunos
  const regularEscola = prontuario.escolas?.nome ?? 'Não matriculado em escola regular / Encaminhamento externo'

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="flex items-center gap-4">
          <Link href="/emaee/pacientes">
            <Button variant="ghost" className="text-muted-foreground hover:bg-hoverCustom p-2.5 rounded-xl">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">{aluno?.nome}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                prontuario.status === 'ATIVO' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                prontuario.status === 'EM_INVESTIGACAO' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
              }`}>
                {prontuario.status === 'ATIVO' ? 'Em Atendimento' :
                 prontuario.status === 'EM_INVESTIGACAO' ? 'Em Investigação' : 'Fila de Espera'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Matrícula EMAEE: {prontuario.numero_matricula_emaee ?? 'Investigando'} | regular: {regularEscola}
            </p>
          </div>
        </div>

        {prontuario.cid_codigo && (
          <div className="bg-rose-500/10 border border-rose-500/25 px-4 py-2 rounded-xl text-xs font-semibold text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>CID Principal: {prontuario.cid_codigo}</span>
          </div>
        )}
      </div>

      {/* Grid: Ficha Resumida na esquerda & Prontuário Clínico nas Abas da Direita */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Side: Ficha Cadastral AEE */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-foreground border-b border-border pb-2.5">Ficha de Identificação (AEE)</h2>
          
          <div className="space-y-3.5 text-xs">
            <div>
              <span className="text-muted-foreground block mb-0.5">Identificação Única (Censo)</span>
              <strong className="text-foreground">{aluno?.identif_unica_censo ?? '-'}</strong>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-muted-foreground block mb-0.5">Sexo</span>
                <strong className="text-foreground">{aluno?.sexo ?? '-'}</strong>
              </div>
              <div>
                <span className="text-muted-foreground block mb-0.5">Cor/Raça</span>
                <strong className="text-foreground">{aluno?.cor_raca ?? '-'}</strong>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-muted-foreground block mb-0.5">Turno AEE</span>
                <strong className="text-foreground">{prontuario.turno_atendimento ?? '-'}</strong>
              </div>
              <div>
                <span className="text-muted-foreground block mb-0.5">Localização</span>
                <strong className="text-foreground">{prontuario.localizacao_atendimento ?? '-'}</strong>
              </div>
            </div>
            <div className="border-t border-border/50 my-3" />
            <div>
              <span className="text-muted-foreground block mb-0.5">Profissão da Mãe</span>
              <strong className="text-foreground">{aluno?.profissao_mae ?? '-'}</strong>
            </div>
            <div>
              <span className="text-muted-foreground block mb-0.5">Profissão do Pai</span>
              <strong className="text-foreground">{aluno?.profissao_pai ?? '-'}</strong>
            </div>
            <div>
              <span className="text-muted-foreground block mb-0.5">Contato de Emergência</span>
              <strong className="text-foreground">{aluno?.nome_contato_emergencia ?? '-'} {aluno?.telefone_emergencia ? `(${aluno.telefone_emergencia})` : ''}</strong>
            </div>
          </div>
        </div>

        {/* Right Side: Abas e Histórico Clínico */}
        <div className="lg:col-span-2 space-y-6">
          {/* Abas */}
          <div className="flex items-center gap-1 bg-secondary border border-border p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('evolucao')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'evolucao' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" /> Ficha de Evolução
            </button>
            <button
              onClick={() => setActiveTab('especialistas')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'especialistas' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" /> Especialistas
            </button>
            <button
              onClick={() => setActiveTab('anexos')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'anexos' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Paperclip className="w-3.5 h-3.5" /> Laudos & Anexos
            </button>
            <button
              onClick={() => setActiveTab('relatorios')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'relatorios' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Relatórios de Origem
            </button>
          </div>

          {/* Conteúdo Aba 1: Evoluções */}
          {activeTab === 'evolucao' && (
            <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-border/50 pb-4">
                <div>
                  <h3 className="text-base font-bold text-foreground">Histórico de Atendimento e Evolução</h3>
                  <p className="text-xs text-muted-foreground">Evoluções clínicas chanceladas pelos especialistas</p>
                </div>
                <ModalEvolucaoEmaee
                  matriculaEmaeeId={id}
                  onSuccess={carregarEvolucoes}
                  trigger={
                    <Button className="bg-primary hover:bg-hoverCustom text-white rounded-xl gap-2 font-semibold text-xs py-2 shadow">
                      <Plus className="w-4 h-4" /> Evolução de Sessão
                    </Button>
                  }
                />
              </div>

              {loadingEvolucoes ? (
                <div className="text-center py-10 text-muted-foreground animate-pulse text-xs">
                  Carregando evolução clínica...
                </div>
              ) : evolucoes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-xs">
                  Nenhuma evolução registrada para este prontuário.
                </div>
              ) : (
                <div className="space-y-4">
                  {evolucoes.map((evo) => (
                    <div key={evo.id} className="border border-border/80 rounded-xl p-4 space-y-2 bg-secondary/30 relative">
                      <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-2 text-xs">
                        <div className="flex items-center gap-2 font-semibold text-primary">
                          <Activity className="w-4 h-4" />
                          <span>{evo.especialidade}</span>
                        </div>
                        <span className="text-muted-foreground">{new Date(evo.data_atendimento).toLocaleDateString('pt-BR')}</span>
                      </div>
                      <p className="text-xs text-foreground font-normal leading-relaxed">{evo.resumo_evolucao}</p>
                      {evo.conduta_orientacoes && (
                        <div className="pt-2 border-t border-dashed border-border text-xs text-muted-foreground">
                          <strong>Conduta: </strong>{evo.conduta_orientacoes}
                        </div>
                      )}
                      <div className="flex justify-end pt-2 text-[10px] text-emerald-400 font-semibold items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Assinado por: {evo.funcionarios?.nome || 'Profissional'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Conteúdo Aba 2: Especialistas */}
          {activeTab === 'especialistas' && (
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-foreground pb-2 border-b border-border/50">Profissionais Responsáveis pelo Acompanhamento</h3>
              {loadingEspecialidades ? (
                <div className="text-center py-6 text-muted-foreground text-xs animate-pulse">Carregando especialistas...</div>
              ) : especialidades.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-xs">Nenhum especialista vinculado a este paciente.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {especialidades.map((esp) => (
                    <div key={esp.id} className="border border-border p-4 rounded-xl space-y-1.5 bg-secondary/35">
                      <div className="text-xs text-primary font-bold">{esp.especialidade}</div>
                      <div className="text-xs font-semibold text-foreground">{esp.funcionarios?.nome}</div>
                      <div className="text-[10px] text-muted-foreground">Frequência: {esp.frequencia} | {esp.horario_inicio ? `Horário: ${esp.horario_inicio}` : ''}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Conteúdo Aba 3: Anexos */}
          {activeTab === 'anexos' && (
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-foreground pb-2 border-b border-border/50">Laudos Médicos, Exames e Requisições</h3>
              
              {prontuario.requisicao_medica_url ? (
                <div className="flex items-center justify-between border border-border p-3.5 rounded-xl bg-secondary/25 text-xs">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-rose-400" />
                    <div>
                      <strong className="text-foreground block">Encaminhamento Médico Inicial</strong>
                      <span className="text-muted-foreground text-[10px]">Documento PDF/Imagem</span>
                    </div>
                  </div>
                  <a href={prontuario.requisicao_medica_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="text-xs rounded-lg py-1 hover:bg-hoverCustom">Download</Button>
                  </a>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-xs">Nenhum documento médico anexado ao prontuário.</div>
              )}
            </div>
          )}

          {/* Conteúdo Aba 4: Relatórios Escolares */}
          {activeTab === 'relatorios' && (
            <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-border/50 pb-4">
                <div>
                  <h3 className="text-base font-bold text-foreground">Relatórios Pedagógicos das Escolas</h3>
                  <p className="text-xs text-muted-foreground">Solicitações enviadas à escola de escolarização regular</p>
                </div>
                <Button onClick={() => setModalNovaSolicitacao(true)} className="bg-primary hover:bg-hoverCustom text-white rounded-xl gap-2 font-semibold text-xs py-2 shadow">
                  <Plus className="w-4 h-4" /> Solicitar Relatório Pedagógico
                </Button>
              </div>

              {solicitacoesRelatorios.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-xs">
                  Nenhuma solicitação de relatório pedagógico enviada para a escola de origem.
                </div>
              ) : (
                <div className="space-y-4">
                  {solicitacoesRelatorios.map((sol) => (
                    <div key={sol.id} className="border border-border/80 rounded-xl p-4 text-xs space-y-2 bg-secondary/20">
                      <div className="flex justify-between items-center border-b border-border/40 pb-2 mb-2">
                        <strong className="text-foreground">{sol.escolas?.nome || 'Escola Regular'}</strong>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          sol.status === 'RESPONDIDO' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {sol.status}
                        </span>
                      </div>
                      <p className="text-muted-foreground"><strong>Solicitado: </strong>{sol.motivo_solicitacao}</p>
                      {sol.status === 'RESPONDIDO' && (
                        <div className="bg-secondary/40 p-3 rounded-lg border border-border/50 mt-2">
                          <strong className="text-foreground block mb-1">Parecer da Escola:</strong>
                          <p className="text-foreground text-xs leading-relaxed">{sol.relatorio_resposta_texto}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>


      {/* Modal Solicitar Relatório Escola */}
      <StandardDialog
        open={modalNovaSolicitacao}
        onOpenChange={setModalNovaSolicitacao}
        title="Solicitar Parecer Pedagógico"
      >
        <div className="space-y-4 text-xs">
          <div className="bg-secondary/45 border border-border p-3.5 rounded-xl">
            <strong className="text-foreground block mb-1">Destinatário:</strong>
            <span className="text-muted-foreground">{regularEscola}</span>
          </div>

          <div>
            <label className="text-muted-foreground block mb-1 font-bold">Justificativa da Solicitação</label>
            <textarea
              rows={3}
              placeholder="Descreva os pontos específicos que deseja saber sobre o aluno na sala regular (comportamento, rendimento, etc)..."
              value={novaSolicitacao.motivo_solicitacao}
              onChange={(e) => setNovaSolicitacao({ ...novaSolicitacao, motivo_solicitacao: e.target.value })}
              className="w-full bg-secondary border border-border text-foreground rounded-xl p-2.5 outline-none resize-none"
            />
          </div>

          <div>
            <label className="text-muted-foreground block mb-1 font-bold">Prazo para Resposta</label>
            <input
              type="date"
              value={novaSolicitacao.prazo_resposta}
              onChange={(e) => setNovaSolicitacao({ ...novaSolicitacao, prazo_resposta: e.target.value })}
              className="w-full bg-secondary border border-border text-foreground rounded-xl p-2.5 outline-none cursor-pointer"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalNovaSolicitacao(false)}>Cancelar</Button>
            <Button onClick={solicitarRelatorioEscola} className="bg-primary hover:bg-hoverCustom text-white">Enviar Solicitação</Button>
          </div>
        </div>
      </StandardDialog>
    </div>
  )
}
