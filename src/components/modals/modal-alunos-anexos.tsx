'use client'

import { useState, useEffect, useRef } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabaseClient'
import { useEditModeStore } from '@/store/useEditModeStore'
import { arquivarAnexo } from '@/lib/audit/archive-agent'
import { compressImageBeforeUpload, formatBytes } from '@/lib/imageCompression'
import { 
  Loader2, 
  Plus, 
  Trash2, 
  Eye, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  FileText,
  User,
  Folder,
  ChevronDown,
  X
} from 'lucide-react'

interface Anexo {
  id: string
  aluno_id: string
  nome: string
  arquivo_url: string
  created_at: string
  tipo: string
}

interface ModalAlunosAnexosProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  aluno: any
  funcionario: any
  escolaAtivaId?: string | null
}

export function ModalAlunosAnexos({
  open,
  onOpenChange,
  aluno,
  funcionario,
  escolaAtivaId
}: ModalAlunosAnexosProps) {
  const { isEditMode } = useEditModeStore()
  const [anexos, setAnexos] = useState<Anexo[]>([])
  const [anexosPadrao, setAnexosPadrao] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  
  // Controle de abas
  const [activeTab, setActiveTab] = useState<'laudos' | 'pessoais' | 'outros' | 'checklist'>('laudos')

  // Controle do formulário de upload
  const [uploadFormOpen, setUploadFormOpen] = useState(false)
  const [tipoSelecionado, setTipoSelecionado] = useState<'Laudos' | 'Documentos Pessoais' | 'Outros' | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  // Estados para novo anexo personalizado
  const [novoNome, setNovoNome] = useState('')
  const [novoArquivo, setNovoArquivo] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  // Estado para indicar qual anexo padrão está fazendo upload
  const [uploadingPadraoName, setUploadingPadraoName] = useState<string | null>(null)

  const isMounted = useRef(true)
  const supabase = createClient()

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const carregarAnexos = async () => {
    if (!aluno?.id) return
    setLoading(true)
    try {
      // 1. Carregar anexos existentes do aluno
      const { data: anexosData, error: anexosError } = await supabase
        .from('alunos_anexos')
        .select('id, aluno_id, nome, arquivo_url, created_at, deleted_at, arquivado_por, motivo_arquivamento, tipo')
        .eq('aluno_id', aluno.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (anexosError) throw anexosError
      
      if (isMounted.current) {
        setAnexos(anexosData ?? [])
      }

      // 2. Carregar anexos padrão da escola
      const escolaId = escolaAtivaId || aluno.escola_id
      if (escolaId) {
        const { data: escolaData, error: escolaError } = await supabase
          .from('escolas')
          .select('anexos_padrao')
          .eq('id', escolaId)
          .single()

        if (!escolaError && escolaData && isMounted.current) {
          const listPadrao = escolaData.anexos_padrao ?? []
          setAnexosPadrao(listPadrao)
          
          // Se não houver anexos padrão configurados para a escola, ajusta a aba ativa caso estivesse nela
          if (listPadrao.length === 0 && activeTab === 'checklist') {
            setActiveTab('laudos')
          }
        }
      }
    } catch (error) {
      console.error('Erro ao carregar anexos:', error)
      toast.error('Erro ao carregar anexos do aluno.')
    } finally {
      if (isMounted.current) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    if (open && aluno?.id) {
      carregarAnexos()
    } else if (!open) {
      // Resetar estados de upload ao fechar para mitigar vazamentos e lixo de estados de UX
      setNovoNome('')
      setNovoArquivo(null)
      setUploadFormOpen(false)
      setTipoSelecionado(null)
      setDropdownOpen(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, aluno?.id])

  // Helper centralizado para upload de arquivo no Supabase Storage com compressão inteligente
  const uploadFileToStorage = async (file: File): Promise<string> => {
    const compResult = await compressImageBeforeUpload(file)
    const finalFile = compResult.file

    if (compResult.wasCompressed) {
      toast.info(`Imagem otimizada de ${formatBytes(compResult.originalSize)} para ${formatBytes(compResult.compressedSize)} (-${compResult.savingsPercent}%)`)
    }

    const sanitizedFileName = finalFile.name.replace(/[^\w.-]/g, '_')
    const filePath = `${aluno.id}/${Date.now()}_${sanitizedFileName}`

    const { error: uploadError } = await supabase.storage
      .from('alunos-anexos')
      .upload(filePath, finalFile)

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('alunos-anexos')
      .getPublicUrl(filePath)

    return publicUrl
  }

  // Upload de anexo personalizado
  const handleUpload = async () => {
    if (!tipoSelecionado) {
      toast.error('Por favor, selecione o tipo de anexo.')
      return
    }
    if (!novoNome.trim()) {
      toast.error('Por favor, digite um nome para o anexo.')
      return
    }
    if (!novoArquivo) {
      toast.error('Por favor, selecione um arquivo.')
      return
    }

    setUploading(true)
    try {
      const publicUrl = await uploadFileToStorage(novoArquivo)

      const { error: dbError } = await supabase
        .from('alunos_anexos')
        .insert({
          aluno_id: aluno.id,
          nome: novoNome.trim(),
          arquivo_url: publicUrl,
          tipo: tipoSelecionado
        })

      if (dbError) throw dbError

      toast.success('Anexo adicionado com sucesso!')
      
      if (isMounted.current) {
        setNovoNome('')
        setNovoArquivo(null)
        setUploadFormOpen(false)
        
        // Direcionar o usuário para a aba que acabou de receber o upload
        if (tipoSelecionado === 'Laudos') {
          setActiveTab('laudos')
        } else if (tipoSelecionado === 'Documentos Pessoais') {
          setActiveTab('pessoais')
        } else {
          setActiveTab('outros')
        }
        
        setTipoSelecionado(null)
        
        const fileInput = document.getElementById('novo-anexo-file') as HTMLInputElement
        if (fileInput) fileInput.value = ''
      }
      
      carregarAnexos()
    } catch (error) {
      console.error('Erro no upload de anexo:', error)
      toast.error('Erro ao enviar o anexo.')
    } finally {
      if (isMounted.current) {
        setUploading(false)
      }
    }
  }

  // Upload rápido de anexo padrão
  const handleUploadPadrao = async (nomePadrao: string, file: File) => {
    setUploadingPadraoName(nomePadrao)
    try {
      const publicUrl = await uploadFileToStorage(file)

      const { error: dbError } = await supabase
        .from('alunos_anexos')
        .insert({
          aluno_id: aluno.id,
          nome: nomePadrao,
          arquivo_url: publicUrl,
          tipo: 'Documentos Pessoais' // Salva como documentos pessoais por padrão
        })

      if (dbError) throw dbError

      toast.success(`Documento "${nomePadrao}" anexado com sucesso!`)
      if (isMounted.current) {
        setActiveTab('pessoais') // Direciona para aba onde o documento estará visível
      }
      carregarAnexos()
    } catch (error) {
      console.error('Erro no upload de anexo padrão:', error)
      toast.error(`Erro ao anexar o documento "${nomePadrao}".`)
    } finally {
      if (isMounted.current) {
        setUploadingPadraoName(null)
      }
    }
  }

  const handleAtualizarArquivo = async (anexoId: string, file: File, nomeAnexo: string) => {
    setLoading(true)
    try {
      const publicUrl = await uploadFileToStorage(file)

      const { error: dbError } = await supabase
        .from('alunos_anexos')
        .update({
          arquivo_url: publicUrl,
          created_at: new Date().toISOString()
        })
        .eq('id', anexoId)

      if (dbError) throw dbError

      toast.success(`Documento "${nomeAnexo}" atualizado!`)
      carregarAnexos()
    } catch (error) {
      console.error('Erro ao atualizar arquivo:', error)
      toast.error('Erro ao atualizar o arquivo do anexo.')
    } finally {
      if (isMounted.current) {
        setLoading(false)
      }
    }
  }

  const handleArquivarAnexo = async (anexo: Anexo) => {
    const confirm = window.confirm(`Deseja realmente arquivar o anexo "${anexo.nome}"? Ele sairá da lista ativa.`)
    if (!confirm) return

    setLoading(true)
    try {
      const performedBy = {
        id: funcionario?.id && funcionario.id !== '' ? funcionario.id : null,
        name: funcionario?.nome ?? 'Administrador Root',
        email: funcionario?.email ?? 'root@system.com'
      }

      const res = await arquivarAnexo({
        supabase,
        anexo,
        motivo: 'Arquivamento de anexo do aluno',
        escolaId: escolaAtivaId ?? aluno.escola_id ?? null,
        arquivadoPor: performedBy as any
      })

      if (res.success) {
        toast.success(`Anexo "${anexo.nome}" arquivado com sucesso!`)
        carregarAnexos()
      } else {
        toast.error('Erro ao arquivar anexo.')
      }
    } catch (error) {
      console.error('Erro ao arquivar anexo:', error)
      toast.error('Erro ao arquivar o anexo.')
    } finally {
      if (isMounted.current) {
        setLoading(false)
      }
    }
  }

  // Filtrar anexos por categoria com coalescência nula para fallbacks de registros antigos
  const anexosLaudos = anexos.filter((a) => (a.tipo ?? 'Outros') === 'Laudos')
  const anexosPessoais = anexos.filter((a) => (a.tipo ?? 'Outros') === 'Documentos Pessoais')
  const anexosOutros = anexos.filter((a) => (a.tipo ?? 'Outros') === 'Outros')

  const renderCardAnexo = (anexo: Anexo) => {
    const Icone = (anexo.tipo ?? 'Outros') === 'Laudos' 
      ? FileText 
      : (anexo.tipo ?? 'Outros') === 'Documentos Pessoais' 
      ? User 
      : Folder;
      
    const iconeCor = (anexo.tipo ?? 'Outros') === 'Laudos' 
      ? 'text-rose-400' 
      : (anexo.tipo ?? 'Outros') === 'Documentos Pessoais' 
      ? 'text-indigo-400' 
      : 'text-amber-400';

    return (
      <div
        key={anexo.id}
        className="flex items-center justify-between p-3 bg-card text-card-foreground border border-border hover:border-borderCustom/80 rounded-xl transition-all shadow-xs"
      >
        <div className="min-w-0 flex-1 pr-4 flex items-start gap-3">
          <Icone className={`w-5 h-5 ${iconeCor} mt-0.5 shrink-0`} />
          <div className="min-w-0">
            <p className="text-xs font-bold text-foreground truncate">{anexo.nome}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">
              Enviado em {new Date(anexo.created_at).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <a
            href={anexo.arquivo_url}
            target="_blank"
            rel="noreferrer"
            className="p-1.5 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
            title="Visualizar documento"
          >
            <Eye className="w-3.5 h-3.5" />
          </a>

          {isEditMode && (
            <>
              <input
                type="file"
                id={`update-custom-${anexo.id}`}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    handleAtualizarArquivo(anexo.id, file, anexo.nome)
                  }
                }}
              />
              <label
                htmlFor={`update-custom-${anexo.id}`}
                className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-[#7c3aed] border border-[#7c3aed]/20 cursor-pointer transition-colors"
                title="Substituir arquivo"
              >
                <Upload className="w-3.5 h-3.5" />
              </label>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleArquivarAnexo(anexo)}
                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 hover:text-rose-400 text-rose-500 border border-rose-500/20 h-7 w-7 cursor-pointer"
                title="Arquivar documento"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Anexos de ${aluno?.nome ?? ''}`}
      description="Gerencie e envie os documentos deste aluno."
      maxWidth="sm:max-w-[650px]"
    >
      {/* Botão de Upload com Dropdown de Seleção de Categoria */}
      {isEditMode && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="relative">
              <Button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs py-2 px-3.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow border-none h-9"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Laudo ou Anexo</span>
                <ChevronDown className="w-3 h-3 text-primary-foreground/80 shrink-0" />
              </Button>

              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                  
                  <div className="absolute left-0 mt-1.5 w-56 rounded-xl bg-popover text-popover-foreground border border-border shadow-xl z-20 py-1.5 overflow-hidden">
                    <button
                      onClick={() => {
                        setTipoSelecionado('Laudos')
                        setUploadFormOpen(true)
                        setDropdownOpen(false)
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-popover-foreground hover:bg-accent flex items-center gap-2 cursor-pointer transition-colors border-none bg-transparent"
                    >
                      <FileText className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                      <span>+ Novo Laudo</span>
                    </button>
                    <button
                      onClick={() => {
                        setTipoSelecionado('Documentos Pessoais')
                        setUploadFormOpen(true)
                        setDropdownOpen(false)
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-popover-foreground hover:bg-accent flex items-center gap-2 cursor-pointer transition-colors border-none bg-transparent"
                    >
                      <User className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>+ Novo Documento Pessoal</span>
                    </button>
                    <button
                      onClick={() => {
                        setTipoSelecionado('Outros')
                        setUploadFormOpen(true)
                        setDropdownOpen(false)
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-popover-foreground hover:bg-accent flex items-center gap-2 cursor-pointer transition-colors border-none bg-transparent"
                    >
                      <Folder className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>+ Outros Anexos</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Form de upload inline dinâmico */}
          {uploadFormOpen && tipoSelecionado && (
            <div className="bg-muted/40 border border-border p-4 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  {tipoSelecionado === 'Laudos' && <FileText className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />}
                  {tipoSelecionado === 'Documentos Pessoais' && <User className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                  {tipoSelecionado === 'Outros' && <Folder className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
                  Novo Upload: <span className="text-primary">{tipoSelecionado}</span>
                </h4>
                <button
                  onClick={() => {
                    setUploadFormOpen(false)
                    setTipoSelecionado(null)
                    setNovoNome('')
                    setNovoArquivo(null)
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors bg-transparent border-none cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  placeholder={
                    tipoSelecionado === 'Laudos'
                      ? "ex: Laudo Médico de AEE"
                      : tipoSelecionado === 'Documentos Pessoais'
                      ? "ex: RG do Aluno"
                      : "ex: Declaração de Matrícula..."
                  }
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  className="bg-background border-input text-foreground placeholder:text-muted-foreground rounded-xl h-10 text-sm focus:border-primary/40"
                  disabled={uploading}
                />
                <div className="flex gap-2">
                  <input
                    type="file"
                    id="novo-anexo-file"
                    onChange={(e) => setNovoArquivo(e.target.files?.[0] ?? null)}
                    className="hidden"
                    disabled={uploading}
                  />
                  <label
                    htmlFor="novo-anexo-file"
                    className="flex-1 flex items-center justify-center gap-1.5 h-10 px-3 border border-dashed border-border hover:border-primary/40 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                  >
                    <Upload className="w-4 h-4 shrink-0" />
                    <span className="truncate max-w-[130px]">
                      {novoArquivo ? novoArquivo.name : 'Selecionar Arquivo'}
                    </span>
                  </label>
                  <Button
                    onClick={handleUpload}
                    disabled={uploading || !novoNome || !novoArquivo}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-10 text-xs font-semibold px-4 cursor-pointer border-none shadow"
                  >
                    {uploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <span>Enviar</span>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navegação de Abas */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-muted/50 border border-border rounded-xl my-4">
        <button
          onClick={() => setActiveTab('laudos')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer border-none ${
            activeTab === 'laudos' 
              ? 'bg-primary text-primary-foreground shadow' 
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <FileText className="w-3.5 h-3.5 shrink-0 text-rose-500 dark:text-rose-400" />
          <span>Laudos ({anexosLaudos.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('pessoais')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer border-none ${
            activeTab === 'pessoais' 
              ? 'bg-primary text-primary-foreground shadow' 
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <User className="w-3.5 h-3.5 shrink-0 text-indigo-600 dark:text-indigo-400" />
          <span>Docs Pessoais ({anexosPessoais.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('outros')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer border-none ${
            activeTab === 'outros' 
              ? 'bg-primary text-primary-foreground shadow' 
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <Folder className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>Outros ({anexosOutros.length})</span>
        </button>
        {anexosPadrao.length > 0 && (
          <button
            onClick={() => setActiveTab('checklist')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer border-none ${
              activeTab === 'checklist' 
                ? 'bg-primary text-primary-foreground shadow' 
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>Checklist Unidade</span>
          </button>
        )}
      </div>

      {/* Conteúdo das Abas */}
      <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1 py-1">
        {loading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span>Carregando anexos...</span>
          </div>
        )}

        {!loading && (
          <>
            {/* Aba Laudos */}
            {activeTab === 'laudos' && (
              <div className="space-y-2">
                {anexosLaudos.map((anexo) => renderCardAnexo(anexo))}
                {anexosLaudos.length === 0 && (
                  <div className="text-center py-10 border border-dashed border-border rounded-2xl bg-muted/20">
                    <p className="text-muted-foreground text-xs">Nenhum laudo anexado a este aluno.</p>
                  </div>
                )}
              </div>
            )}

            {/* Aba Documentos Pessoais */}
            {activeTab === 'pessoais' && (
              <div className="space-y-2">
                {anexosPessoais.map((anexo) => renderCardAnexo(anexo))}
                {anexosPessoais.length === 0 && (
                  <div className="text-center py-10 border border-dashed border-border rounded-2xl bg-muted/20">
                    <p className="text-muted-foreground text-xs">Nenhum documento pessoal anexado.</p>
                  </div>
                )}
              </div>
            )}

            {/* Aba Outros */}
            {activeTab === 'outros' && (
              <div className="space-y-2">
                {anexosOutros.map((anexo) => renderCardAnexo(anexo))}
                {anexosOutros.length === 0 && (
                  <div className="text-center py-10 border border-dashed border-border rounded-2xl bg-muted/20">
                    <p className="text-muted-foreground text-xs">Nenhum anexo adicional disponível.</p>
                  </div>
                )}
              </div>
            )}

            {/* Aba Checklist Escolar */}
            {activeTab === 'checklist' && anexosPadrao.length > 0 && (
              <div className="space-y-2">
                {anexosPadrao.map((padrao, i) => {
                  const anexoCorrespondente = anexos.find(
                    (a) => a.nome.toLowerCase() === padrao.toLowerCase()
                  )

                  return (
                    <div
                      key={`padrao-${i}`}
                      className="flex items-center justify-between p-3.5 bg-card text-card-foreground border border-border hover:border-borderCustom/80 rounded-xl transition-all shadow-xs"
                    >
                      <div className="min-w-0 flex-1 pr-4 flex items-start gap-3">
                        <div className="mt-0.5 shrink-0">
                          {anexoCorrespondente ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-amber-500" />

                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{padrao}</p>
                          <p className="text-[9px] text-zinc-500 mt-0.5">
                            {anexoCorrespondente
                              ? `Enviado em ${new Date(anexoCorrespondente.created_at).toLocaleDateString('pt-BR')}`
                              : 'Pendente'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {anexoCorrespondente ? (
                          <>
                            <a
                              href={anexoCorrespondente.arquivo_url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                              title="Visualizar documento"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </a>

                            {isEditMode && (
                              <>
                                <input
                                  type="file"
                                  id={`update-padrao-${anexoCorrespondente.id}`}
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) {
                                      handleAtualizarArquivo(anexoCorrespondente.id, file, padrao)
                                    }
                                  }}
                                />
                                <label
                                  htmlFor={`update-padrao-${anexoCorrespondente.id}`}
                                  className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-[#7c3aed] border border-[#7c3aed]/20 cursor-pointer transition-colors"
                                  title="Substituir arquivo"
                                >
                                  <Upload className="w-3.5 h-3.5" />
                                </label>

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleArquivarAnexo(anexoCorrespondente)}
                                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 hover:text-rose-400 text-rose-500 border border-rose-500/20 h-7 w-7 cursor-pointer"
                                  title="Arquivar documento"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            )}
                          </>
                        ) : (
                          isEditMode && (
                            <>
                              <input
                                type="file"
                                id={`upload-padrao-input-${i}`}
                                className="hidden"
                                disabled={uploadingPadraoName === padrao}
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (file) {
                                    handleUploadPadrao(padrao, file)
                                  }
                                }}
                              />
                              <label
                                htmlFor={`upload-padrao-input-${i}`}
                                className="flex items-center gap-1 h-7 px-2.5 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-600/30 text-indigo-400 hover:text-indigo-300 rounded-lg text-[10px] font-semibold cursor-pointer transition-colors"
                              >
                                {uploadingPadraoName === padrao ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Upload className="w-3 h-3" />
                                )}
                                <span>Anexar</span>
                              </label>
                            </>
                          )
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </StandardDialog>
  )
}
