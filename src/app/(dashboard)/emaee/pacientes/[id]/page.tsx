'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { getVisualizacaoUrl, getAvatarUrl } from '@/lib/photoHelper'
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
  FileText,
  Printer,
  Upload,
  Trash2,
  Eye,
  User,
  Folder,
  Loader2,
  ChevronRight,
  History,
  Sparkles
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { ModalEvolucaoEmaee } from '@/components/modals/modal-evolucao-emaee'
import { PrintEvolucoesEmaee, EvolucaoPrintData } from '@/components/print/print-evolucoes-emaee'
import { PrintFichaInscricaoEmaee } from '@/components/print/print-ficha-inscricao-emaee'
import { PrintComprovanteMatriculaEmaee } from '@/components/print/print-comprovante-matricula-emaee'
import { useSchoolStore } from '@/store/useSchoolStore'
import { compressImageBeforeUpload, formatBytes } from '@/lib/imageCompression'

const sessionTimestamp = Date.now()

export default function PacienteDetalhesPage() {
  const params = useParams()
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id || '')
  const { funcionario } = useAuthStore()
  const { selectedEscola } = useSchoolStore()

  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])
  
  const [prontuario, setProntuario] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  const [activeTab, setActiveTab] = useState<'evolucao' | 'especialistas' | 'anexos' | 'relatorios'>('evolucao')
  
  // Estados de Evolução
  const [evolucoes, setEvolucoes] = useState<any[]>([])
  const [loadingEvolucoes, setLoadingEvolucoes] = useState(false)
  const [printData, setPrintData] = useState<EvolucaoPrintData[] | null>(null)
  const [printFichaOpen, setPrintFichaOpen] = useState(false)
  const [printComprovanteOpen, setPrintComprovanteOpen] = useState(false)

  // Estados de Especialidades & Widget
  const [especialidades, setEspecialidades] = useState<any[]>([])
  const [loadingEspecialidades, setLoadingEspecialidades] = useState(false)
  const [especialistaSelecionado, setEspecialistaSelecionado] = useState<any | null>(null)
  const [modalHistoricoEspecialistaOpen, setModalHistoricoEspecialistaOpen] = useState(false)

  // Estados de Anexos
  const [anexos, setAnexos] = useState<any[]>([])
  const [loadingAnexos, setLoadingAnexos] = useState(false)
  const [modalAnexoOpen, setModalAnexoOpen] = useState(false)
  const [novoNomeAnexo, setNovoNomeAnexo] = useState('')
  const [novoTipoAnexo, setNovoTipoAnexo] = useState('Laudos')
  const [novoArquivoAnexo, setNovoArquivoAnexo] = useState<File | null>(null)
  const [uploadingAnexo, setUploadingAnexo] = useState(false)

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
            id,
            nome,
            foto_url,
            foto_avatar_path,
            foto_visualizacao_path,
            foto_updated_at,
            cpf,
            rg,
            nis,
            inep,
            identif_unica_censo,
            cartao_sus,
            certidao_nascimento,
            data_nascimento,
            sexo,
            cor_raca,
            nome_mae,
            profissao_mae,
            nome_pai,
            profissao_pai,
            telefone,
            endereco,
            latitude,
            longitude,
            zona_residencial,
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
      if (data && isMounted.current) {
        setProntuario(data)
      }
    } catch (err) {
      console.error('Erro ao carregar prontuário completo:', err)
      toast.error('Erro ao carregar prontuário')
    } finally {
      if (isMounted.current) setLoading(false)
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
            nome,
            assinatura_url
          )
        `)
        .eq('emaee_matricula_id', id)
        .order('data_atendimento', { ascending: false })

      if (error) throw error
      if (data && isMounted.current) {
        setEvolucoes(data)
      }
    } catch (err) {
      console.error('Erro ao carregar evoluções:', err)
    } finally {
      if (isMounted.current) setLoadingEvolucoes(false)
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
            nome,
            foto_url,
            foto_avatar_path,
            foto_visualizacao_path,
            foto_updated_at
          )
        `)
        .eq('emaee_matricula_id', id)
        .eq('ativo', true)

      if (error) throw error
      if (data && isMounted.current) {
        setEspecialidades(data)
      }
    } catch (err) {
      console.error('Erro ao carregar especialidades:', err)
    } finally {
      if (isMounted.current) setLoadingEspecialidades(false)
    }
  }

  const carregarAnexos = async () => {
    if (!prontuario?.aluno_id) return
    setLoadingAnexos(true)
    const supabase = createClient()
    try {
      const { data, error } = await supabase
        .from('alunos_anexos')
        .select('*')
        .eq('aluno_id', prontuario.aluno_id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      if (data && isMounted.current) {
        // Gerar URLs assinadas temporárias (60 min) para acesso seguro aos anexos médicos
        const anexosSeguros = await Promise.all(
          data.map(async (anexo) => {
            let rawPath = anexo.arquivo_url || ''
            if (rawPath.includes('/alunos-anexos/')) {
              rawPath = rawPath.split('/alunos-anexos/')[1].split('?')[0]
            }
            try {
              const { data: signedData } = await supabase.storage
                .from('alunos-anexos')
                .createSignedUrl(rawPath, 3600)
              return {
                ...anexo,
                signed_url: signedData?.signedUrl || anexo.arquivo_url
              }
            } catch (err) {
              return { ...anexo, signed_url: anexo.arquivo_url }
            }
          })
        )
        if (isMounted.current) {
          setAnexos(anexosSeguros)
        }
      }
    } catch (err) {
      console.error('Erro ao carregar anexos do aluno:', err)
    } finally {
      if (isMounted.current) setLoadingAnexos(false)
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
      if (data && isMounted.current) {
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
      if (activeTab === 'especialistas') {
        carregarEspecialidades()
        carregarEvolucoes()
      }
      if (activeTab === 'anexos') carregarAnexos()
      if (activeTab === 'relatorios') carregarSolicitacoesRelatorios()
    }
  }, [id, activeTab, prontuario?.aluno_id])

  const handleUploadAnexo = async () => {
    if (!novoNomeAnexo.trim()) {
      toast.error('Digite um nome para o documento ou laudo')
      return
    }
    if (!novoArquivoAnexo) {
      toast.error('Selecione um arquivo PDF ou imagem')
      return
    }
    if (!prontuario?.aluno_id) {
      toast.error('Aluno não vinculado ao prontuário')
      return
    }

    setUploadingAnexo(true)
    const supabase = createClient()
    try {
      // Compressão Híbrida Client-Side (Imagens -> WebP 82%, PDFs -> bypass intacto)
      const compResult = await compressImageBeforeUpload(novoArquivoAnexo)
      const finalFile = compResult.file

      const sanitizedName = finalFile.name.replace(/[^\w.-]/g, '_')
      const filePath = `${prontuario.aluno_id}/${Date.now()}_${sanitizedName}`

      const { error: uploadError } = await supabase.storage
        .from('alunos-anexos')
        .upload(filePath, finalFile)

      if (uploadError) throw uploadError

      const performedBy = funcionario?.id && funcionario.id !== '' ? funcionario.id : null

      const { error: dbError } = await supabase
        .from('alunos_anexos')
        .insert({
          aluno_id: prontuario.aluno_id,
          nome: novoNomeAnexo.trim(),
          arquivo_url: filePath,
          tipo: novoTipoAnexo,
          arquivado_por: performedBy
        })

      if (dbError) throw dbError

      if (compResult.wasCompressed) {
        toast.success(`Laudo anexado! Otimizado de ${formatBytes(compResult.originalSize)} para ${formatBytes(compResult.compressedSize)} (-${compResult.savingsPercent}% de espaço).`)
      } else {
        toast.success('Laudo/Documento anexado ao prontuário com sucesso!')
      }

      setModalAnexoOpen(false)
      setNovoNomeAnexo('')
      setNovoArquivoAnexo(null)
      carregarAnexos()
    } catch (err: any) {
      console.error('Erro no upload do anexo:', err)
      toast.error(err.message || 'Erro ao anexar arquivo ao prontuário')
    } finally {
      if (isMounted.current) setUploadingAnexo(false)
    }
  }

  const handleExcluirAnexo = async (anexoId: string, nome: string) => {
    const confirm = window.confirm(`Deseja realmente remover o anexo "${nome}" do prontuário?`)
    if (!confirm) return

    const supabase = createClient()
    try {
      const { error } = await supabase
        .from('alunos_anexos')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', anexoId)

      if (error) throw error

      toast.success(`Anexo "${nome}" removido do prontuário.`)
      carregarAnexos()
    } catch (err: any) {
      console.error('Erro ao excluir anexo:', err)
      toast.error('Erro ao remover anexo')
    }
  }

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

  const atualizarStatusProntuario = async (novoStatus: string) => {
    const supabase = createClient()
    try {
      const { error } = await supabase
        .from('emaee_matriculas')
        .update({ status: novoStatus })
        .eq('id', id)

      if (error) throw error

      setProntuario((prev: any) => ({ ...prev, status: novoStatus }))
      toast.success('Status do prontuário atualizado com sucesso!')
    } catch (err: any) {
      console.error(err)
      toast.error('Erro ao atualizar status do prontuário')
    }
  }

  // Filtragem de evoluções para o modal do Especialista selecionado
  const evolucoesDoEspecialista = especialidades && especialistaSelecionado
    ? evolucoes.filter(
        (evo) =>
          (evo.profissional_id && evo.profissional_id === especialistaSelecionado.profissional_id) ||
          (evo.especialidade && evo.especialidade.toLowerCase() === especialistaSelecionado.especialidade?.toLowerCase())
      )
    : []

  const foto3x4Url = getVisualizacaoUrl(aluno)

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
          
          <div className="flex items-center gap-3.5">
            {/* Thumbnail Foto 3x4 do Paciente */}
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-border/60 flex items-center justify-center text-primary font-bold overflow-hidden shrink-0">
              {foto3x4Url ? (
                <img src={foto3x4Url} alt={aluno?.nome || 'Foto 3x4'} className="w-full h-full object-cover" />
              ) : (
                aluno?.nome?.substring(0, 2).toUpperCase()
              )}
            </div>

            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-foreground">{aluno?.nome}</h1>

                {/* Select de Status */}
                <select
                  value={prontuario.status ?? 'FILA_ESPERA'}
                  onChange={(e) => atualizarStatusProntuario(e.target.value)}
                  className={`px-3 py-1 rounded-full text-xs font-bold outline-none border cursor-pointer transition-all ${
                    prontuario.status === 'ATIVO' ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30' :
                    prontuario.status === 'EM_INVESTIGACAO' ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30' :
                    prontuario.status === 'ALTA' ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30' :
                    prontuario.status === 'INATIVO' ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30' :
                    'bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-500/10 dark:text-zinc-300 dark:border-zinc-500/30'
                  }`}
                >
                  <option value="FILA_ESPERA" className="bg-popover text-zinc-700 dark:text-zinc-300">Fila de Espera</option>
                  <option value="EM_INVESTIGACAO" className="bg-popover text-amber-900 dark:text-amber-300">Em Investigação</option>
                  <option value="ATIVO" className="bg-popover text-emerald-800 dark:text-emerald-300">Em Atendimento</option>
                  <option value="ALTA" className="bg-popover text-blue-800 dark:text-blue-300">Alta Médica</option>
                  <option value="INATIVO" className="bg-popover text-rose-800 dark:text-rose-300">Inativo</option>
                </select>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Matrícula EMAEE: {prontuario.numero_matricula_emaee ?? 'Investigando'} | regular: {regularEscola}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {prontuario.cid_codigo && (
            <div className="bg-rose-500/10 border border-rose-500/25 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-300 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>CID: {prontuario.cid_codigo}</span>
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPrintFichaOpen(true)}
            className="text-xs rounded-xl font-bold border-[#3ea6ff]/40 text-[#3ea6ff] hover:bg-[#3ea6ff]/10 gap-1.5 shadow-sm"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Ficha de Inscrição</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPrintComprovanteOpen(true)}
            className="text-xs rounded-xl font-bold border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 gap-1.5 shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Comprovante</span>
          </Button>
        </div>
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
              <strong className="text-foreground">
                {aluno?.nome_contato_emergencia ?? '-'} {aluno?.telefone ? `(${aluno.telefone})` : ((aluno?.dados_matricula as any)?.telefone_emergencia ? `(${(aluno?.dados_matricula as any).telefone_emergencia})` : '')}
              </strong>
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
                <div className="flex items-center gap-2">
                  {evolucoes.length > 0 && (
                    <Button
                      onClick={() => setPrintData(evolucoes)}
                      variant="outline"
                      className="border-border text-foreground hover:bg-hoverCustom rounded-xl gap-2 font-semibold text-xs py-2 shadow-sm"
                    >
                      <Printer className="w-4 h-4" /> Imprimir Todas
                    </Button>
                  )}
                  <ModalEvolucaoEmaee
                    matriculaEmaeeId={id}
                    onSuccess={carregarEvolucoes}
                    trigger={
                      <Button className="bg-primary hover:bg-hoverCustom text-white rounded-xl gap-2 font-semibold text-xs py-2 shadow">
                        <Plus className="w-4 h-4" /> Evolução
                      </Button>
                    }
                  />
                </div>
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
                  {evolucoes.map((evo) => {
                    const sigUrl = evo.assinatura_profissional_url || evo.funcionarios?.assinatura_url
                    return (
                      <div key={evo.id} className="border border-border/80 rounded-xl p-4 space-y-2 bg-secondary/30 relative">
                        <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-2 text-xs">
                          <div className="flex items-center gap-2 font-semibold text-primary">
                            <Activity className="w-4 h-4" />
                            <span>{evo.especialidade}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-muted-foreground">{new Date(evo.data_atendimento).toLocaleDateString('pt-BR')}</span>
                            <button
                              onClick={() => setPrintData([evo])}
                              title="Imprimir esta evolução"
                              className="text-muted-foreground hover:text-primary transition-colors cursor-pointer p-0.5 rounded hover:bg-secondary"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-foreground font-normal leading-relaxed">{evo.resumo_evolucao}</p>
                        {evo.conduta_orientacoes && (
                          <div className="pt-2 border-t border-dashed border-border text-xs text-muted-foreground">
                            <strong>Conduta: </strong>{evo.conduta_orientacoes}
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-2.5 border-t border-dashed border-border mt-2">
                          <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold flex-wrap">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Assinado por: {evo.profissional_nome || evo.funcionarios?.nome || 'Profissional'}</span>
                            {evo.profissional_registro && (
                              <span className="text-zinc-400 font-normal ml-1">({evo.profissional_registro})</span>
                            )}
                          </div>
                          {sigUrl && (
                            <div className="flex items-center gap-1.5 bg-white px-2 py-0.5 rounded border border-gray-200">
                              <span className="text-[8px] text-gray-500 font-bold uppercase">Assinatura:</span>
                              <img
                                src={`${sigUrl}${sigUrl.includes('?') ? '&' : '?'}t=${sessionTimestamp}`}
                                alt="Assinatura"
                                className="h-5 object-contain max-w-[120px]"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Conteúdo Aba 2: Especialistas (Widget Interativo) */}
          {activeTab === 'especialistas' && (
            <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
              <div className="border-b border-border/50 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground">Profissionais Responsáveis pelo Acompanhamento</h3>
                  <p className="text-xs text-muted-foreground">Clique em um especialista para consultar o histórico de atualizações feito por ele para o aluno</p>
                </div>
              </div>

              {loadingEspecialidades ? (
                <div className="text-center py-8 text-muted-foreground text-xs animate-pulse">Carregando especialistas...</div>
              ) : especialidades.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-border/80 rounded-2xl bg-secondary/15 text-muted-foreground text-xs">
                  Nenhum especialista vinculado a este paciente.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {especialidades.map((esp) => {
                    const countEvolucoes = evolucoes.filter(
                      (evo) =>
                        (evo.profissional_id && evo.profissional_id === esp.profissional_id) ||
                        (evo.especialidade && evo.especialidade.toLowerCase() === esp.especialidade?.toLowerCase())
                    ).length

                    return (
                      <div
                        key={esp.id}
                        onClick={() => {
                          setEspecialistaSelecionado(esp)
                          setModalHistoricoEspecialistaOpen(true)
                        }}
                        className="group border border-border hover:border-primary p-4 rounded-xl space-y-3 bg-secondary/35 hover:bg-secondary/70 transition-all cursor-pointer shadow-sm relative overflow-hidden"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2.5">
                            {(() => {
                              const profAvatarUrl = getAvatarUrl(esp.funcionarios)
                              return (
                                <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary font-bold text-xs overflow-hidden shrink-0">
                                  {profAvatarUrl ? (
                                    <img src={profAvatarUrl} alt={esp.funcionarios?.nome || 'Foto'} className="w-full h-full object-cover" />
                                  ) : (
                                    esp.especialidade ? esp.especialidade.charAt(0).toUpperCase() : 'E'
                                  )}
                                </div>
                              )
                            })()}
                            <div>
                              <div className="text-xs text-primary font-bold">{esp.especialidade}</div>
                              <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                                {esp.funcionarios?.nome ?? 'Especialista não identificado'}
                              </div>
                            </div>
                          </div>

                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/15 text-primary border border-primary/20 flex items-center gap-1">
                            <History className="w-3 h-3" />
                            {countEvolucoes} {countEvolucoes === 1 ? 'Atualização' : 'Atualizações'}
                          </span>
                        </div>

                        <div className="text-[10px] text-muted-foreground flex items-center justify-between pt-2 border-t border-border/40">
                          <span>Frequência: <strong>{esp.frequencia ?? 'Conforme demanda'}</strong></span>
                          <span>{esp.horario_inicio ? `Horário: ${esp.horario_inicio}` : ''}</span>
                        </div>

                        <div className="flex items-center justify-end text-[11px] text-primary font-semibold pt-1 group-hover:translate-x-0.5 transition-transform">
                          <span>Ver histórico de atualizações</span>
                          <ChevronRight className="w-3.5 h-3.5 ml-1" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Conteúdo Aba 3: Laudos & Anexos */}
          {activeTab === 'anexos' && (
            <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-border/50 pb-4">
                <div>
                  <h3 className="text-base font-bold text-foreground">Laudos Médicos, Exames e Requisições</h3>
                  <p className="text-xs text-muted-foreground">Documentos comprobatórios e pareceres clínicos arquivados no prontuário</p>
                </div>
                <Button
                  onClick={() => setModalAnexoOpen(true)}
                  className="bg-primary hover:bg-hoverCustom text-white rounded-xl gap-2 font-semibold text-xs py-2 shadow"
                >
                  <Plus className="w-4 h-4" /> Anexar Arquivo / Laudo
                </Button>
              </div>

              {/* Requisição Médica de Entrada no Prontuário */}
              {prontuario.requisicao_medica_url && (
                <div className="flex items-center justify-between border border-emerald-500/30 p-4 rounded-xl bg-emerald-500/5 text-xs shadow-sm">
                  <div className="flex items-center gap-3">
                    <FileText className="w-6 h-6 text-emerald-400 shrink-0" />
                    <div>
                      <strong className="text-foreground block text-xs">Encaminhamento Médico Inicial (Triagem)</strong>
                      <span className="text-muted-foreground text-[10px]">Anexado no Requerimento de Entrada no EMAEE</span>
                    </div>
                  </div>
                  <a href={prontuario.requisicao_medica_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="text-xs rounded-lg py-1.5 hover:bg-hoverCustom gap-1.5">
                      <Eye className="w-3.5 h-3.5" /> Visualizar / Download
                    </Button>
                  </a>
                </div>
              )}

              {/* Lista de Anexos da tabela alunos_anexos */}
              {loadingAnexos ? (
                <div className="text-center py-8 text-muted-foreground text-xs animate-pulse">Carregando anexos...</div>
              ) : anexos.length === 0 && !prontuario.requisicao_medica_url ? (
                <div className="text-center py-10 border border-dashed border-border/80 rounded-2xl bg-secondary/15 text-muted-foreground text-xs space-y-2">
                  <FolderOpen className="w-8 h-8 mx-auto text-muted-foreground/60" />
                  <p>Nenhum laudo ou documento médico anexado ao prontuário.</p>
                  <Button onClick={() => setModalAnexoOpen(true)} variant="outline" className="text-xs rounded-xl mt-2">
                    Clique aqui para anexar o primeiro arquivo
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {anexos.map((anexo) => {
                    const isLaudo = (anexo.tipo ?? 'Laudos') === 'Laudos'
                    return (
                      <div
                        key={anexo.id}
                        className="flex items-center justify-between border border-border p-3.5 rounded-xl bg-secondary/25 text-xs hover:border-border/80 transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-3">
                          {isLaudo ? (
                            <FileText className="w-5 h-5 text-rose-400 shrink-0" />
                          ) : (
                            <Folder className="w-5 h-5 text-amber-400 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <strong className="text-foreground block truncate">{anexo.nome}</strong>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              <span className="px-1.5 py-0.2 rounded bg-secondary text-zinc-300 font-semibold border border-border">
                                {anexo.tipo ?? 'Laudo'}
                              </span>
                              <span>Enviado em {new Date(anexo.created_at).toLocaleDateString('pt-BR')}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <a href={anexo.signed_url || anexo.arquivo_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm" className="text-xs rounded-lg gap-1.5 h-8">
                              <Eye className="w-3.5 h-3.5" /> Download
                            </Button>
                          </a>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleExcluirAnexo(anexo.id, anexo.nome)}
                            className="h-8 w-8 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg"
                            title="Remover anexo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
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

      {/* Modal Upload Anexo (Laudos & Exames) */}
      <StandardDialog
        open={modalAnexoOpen}
        onOpenChange={setModalAnexoOpen}
        title="Anexar Laudo ou Documento Clínico"
        description={`Adicione um novo documento ao prontuário de ${aluno?.nome}`}
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="text-muted-foreground block mb-1 font-bold">Tipo de Documento</label>
            <select
              value={novoTipoAnexo}
              onChange={(e) => setNovoTipoAnexo(e.target.value)}
              className="w-full bg-secondary border border-border text-foreground rounded-xl p-2.5 outline-none cursor-pointer"
            >
              <option value="Laudos">Laudo Médico (AEE / Especializado)</option>
              <option value="Exame Clínico">Exame Clínico / Avaliação</option>
              <option value="Receita / Prescrição">Receita / Prescrição Médica</option>
              <option value="Encaminhamento">Encaminhamento Externo</option>
              <option value="Outros">Outros Documentos</option>
            </select>
          </div>

          <div>
            <label className="text-muted-foreground block mb-1 font-bold">Nome / Descrição do Anexo</label>
            <input
              type="text"
              placeholder="ex: Laudo Neurológico TEA 2026, Avaliação Fonoaudiológica..."
              value={novoNomeAnexo}
              onChange={(e) => setNovoNomeAnexo(e.target.value)}
              className="w-full bg-secondary border border-border text-foreground rounded-xl p-2.5 outline-none"
            />
          </div>

          <div>
            <label className="text-muted-foreground block mb-1 font-bold">Arquivo (PDF ou Imagem)</label>
            <input
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => setNovoArquivoAnexo(e.target.files?.[0] ?? null)}
              className="w-full bg-secondary border border-border text-foreground rounded-xl p-2 outline-none text-xs file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" onClick={() => setModalAnexoOpen(false)} disabled={uploadingAnexo}>
              Cancelar
            </Button>
            <Button onClick={handleUploadAnexo} disabled={uploadingAnexo || !novoNomeAnexo || !novoArquivoAnexo} className="bg-primary hover:bg-hoverCustom text-white gap-2">
              {uploadingAnexo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              <span>{uploadingAnexo ? 'Enviando...' : 'Salvar Anexo'}</span>
            </Button>
          </div>
        </div>
      </StandardDialog>

      {/* Modal Histórico de Atualizações por Especialista */}
      {especialistaSelecionado && (
        <StandardDialog
          open={modalHistoricoEspecialistaOpen}
          onOpenChange={setModalHistoricoEspecialistaOpen}
          title={`Histórico de Atualizações - ${especialistaSelecionado.funcionarios?.nome ?? especialistaSelecionado.especialidade}`}
          description={`Evoluções registradas em ${especialistaSelecionado.especialidade} para ${aluno?.nome}`}
          maxWidth="sm:max-w-[750px]"
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between bg-secondary/40 border border-border p-3 rounded-xl">
              <div>
                <strong className="text-foreground block text-sm">{especialistaSelecionado.especialidade}</strong>
                <span className="text-muted-foreground">Profissional: {especialistaSelecionado.funcionarios?.nome ?? 'Especialista'}</span>
              </div>
              {evolucoesDoEspecialista.length > 0 && (
                <Button
                  onClick={() => setPrintData(evolucoesDoEspecialista)}
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs rounded-lg"
                >
                  <Printer className="w-3.5 h-3.5" /> Imprimir Histórico do Especialista
                </Button>
              )}
            </div>

            {evolucoesDoEspecialista.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-border rounded-xl bg-secondary/10 text-muted-foreground text-xs space-y-3">
                <History className="w-8 h-8 mx-auto text-muted-foreground/50" />
                <p>Nenhuma atualização ou evolução registrada por este especialista para este aluno ainda.</p>
                <ModalEvolucaoEmaee
                  matriculaEmaeeId={id}
                  onSuccess={() => {
                    carregarEvolucoes()
                  }}
                  trigger={
                    <Button className="bg-primary hover:bg-hoverCustom text-white rounded-xl gap-2 font-semibold text-xs py-2 shadow mx-auto">
                      <Plus className="w-4 h-4" /> Registrar Nova Evolução
                    </Button>
                  }
                />
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[420px] overflow-y-auto pr-1">
                {evolucoesDoEspecialista.map((evo) => {
                  const sigUrl = evo.assinatura_profissional_url || evo.funcionarios?.assinatura_url
                  return (
                    <div key={evo.id} className="border border-border/80 rounded-xl p-4 space-y-2 bg-secondary/25 relative shadow-sm">
                      <div className="flex items-center justify-between border-b border-border/40 pb-2 text-xs">
                        <div className="flex items-center gap-2 font-bold text-primary">
                          <Activity className="w-4 h-4" />
                          <span>{evo.tipo_atendimento || evo.especialidade}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground font-semibold">
                            Data: {new Date(evo.data_atendimento).toLocaleDateString('pt-BR')}
                          </span>
                          <button
                            onClick={() => setPrintData([evo])}
                            title="Imprimir esta evolução"
                            className="text-muted-foreground hover:text-primary transition-colors cursor-pointer p-0.5 rounded hover:bg-secondary"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-foreground font-normal leading-relaxed">{evo.resumo_evolucao}</p>
                      {evo.conduta_orientacoes && (
                        <div className="pt-2 border-t border-dashed border-border text-xs text-muted-foreground">
                          <strong>Conduta e Orientações: </strong>{evo.conduta_orientacoes}
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-2 border-t border-dashed border-border mt-2">
                        <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Assinado por: {evo.profissional_nome || evo.funcionarios?.nome || 'Profissional'}</span>
                        </div>
                        {sigUrl && (
                          <div className="flex items-center gap-1.5 bg-white px-2 py-0.5 rounded border border-gray-200">
                            <span className="text-[8px] text-gray-500 font-bold uppercase">Assinatura:</span>
                            <img
                              src={`${sigUrl}${sigUrl.includes('?') ? '&' : '?'}t=${sessionTimestamp}`}
                              alt="Assinatura"
                              className="h-5 object-contain max-w-[120px]"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </StandardDialog>
      )}

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

      {printData && prontuario && (
        <PrintEvolucoesEmaee
          aluno={prontuario}
          evolucoes={printData}
          escolaLogoUrl={selectedEscola?.logo_url}
          onClose={() => setPrintData(null)}
        />
      )}

      {printFichaOpen && prontuario && (
        <PrintFichaInscricaoEmaee
          prontuario={prontuario}
          onClose={() => setPrintFichaOpen(false)}
        />
      )}

      {printComprovanteOpen && prontuario && (
        <PrintComprovanteMatriculaEmaee
          prontuario={prontuario}
          onClose={() => setPrintComprovanteOpen(false)}
        />
      )}
    </div>
  )
}
