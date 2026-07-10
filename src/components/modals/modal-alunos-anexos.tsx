'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabaseClient'
import { useEditModeStore } from '@/store/useEditModeStore'
import { arquivarAnexo } from '@/lib/audit/archive-agent'
import { 
  Loader2, 
  Plus, 
  Trash2, 
  Eye, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  FileText 
} from 'lucide-react'

interface Anexo {
  id: string
  aluno_id: string
  nome: string
  arquivo_url: string
  created_at: string
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
  
  // Estados para novo anexo personalizado
  const [novoNome, setNovoNome] = useState('')
  const [novoArquivo, setNovoArquivo] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  // Estado para indicar qual anexo padrão está fazendo upload
  const [uploadingPadraoName, setUploadingPadraoName] = useState<string | null>(null)

  const supabase = createClient()

  const carregarAnexos = async () => {
    if (!aluno?.id) return
    setLoading(true)
    try {
      // 1. Carregar anexos existentes do aluno
      const { data: anexosData, error: anexosError } = await supabase
        .from('alunos_anexos')
        .select('*')
        .eq('aluno_id', aluno.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (anexosError) throw anexosError
      setAnexos(anexosData ?? [])

      // 2. Carregar anexos padrão da escola
      const escolaId = escolaAtivaId || aluno.escola_id
      if (escolaId) {
        const { data: escolaData, error: escolaError } = await supabase
          .from('escolas')
          .select('anexos_padrao')
          .eq('id', escolaId)
          .single()

        if (!escolaError && escolaData) {
          setAnexosPadrao(escolaData.anexos_padrao ?? [])
        }
      }
    } catch (error) {
      console.error('Erro ao carregar anexos:', error)
      toast.error('Erro ao carregar anexos do aluno.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && aluno?.id) {
      carregarAnexos()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, aluno?.id])

  // Upload de anexo personalizado
  const handleUpload = async () => {
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
      const sanitizedFileName = novoArquivo.name.replace(/[^\w.-]/g, '_')
      const filePath = `${aluno.id}/${Date.now()}_${sanitizedFileName}`

      const { error: uploadError } = await supabase.storage
        .from('alunos-anexos')
        .upload(filePath, novoArquivo)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('alunos-anexos')
        .getPublicUrl(filePath)

      const { error: dbError } = await supabase
        .from('alunos_anexos')
        .insert({
          aluno_id: aluno.id,
          nome: novoNome.trim(),
          arquivo_url: publicUrl
        })

      if (dbError) throw dbError

      toast.success('Anexo personalizado adicionado!')
      setNovoNome('')
      setNovoArquivo(null)
      const fileInput = document.getElementById('novo-anexo-file') as HTMLInputElement
      if (fileInput) fileInput.value = ''
      
      carregarAnexos()
    } catch (error) {
      console.error('Erro no upload de anexo:', error)
      toast.error('Erro ao enviar o anexo.')
    } finally {
      setUploading(false)
    }
  }

  // Upload rápido de anexo padrão
  const handleUploadPadrao = async (nomePadrao: string, file: File) => {
    setUploadingPadraoName(nomePadrao)
    try {
      const sanitizedFileName = file.name.replace(/[^\w.-]/g, '_')
      const filePath = `${aluno.id}/${Date.now()}_${sanitizedFileName}`

      const { error: uploadError } = await supabase.storage
        .from('alunos-anexos')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('alunos-anexos')
        .getPublicUrl(filePath)

      const { error: dbError } = await supabase
        .from('alunos_anexos')
        .insert({
          aluno_id: aluno.id,
          nome: nomePadrao,
          arquivo_url: publicUrl
        })

      if (dbError) throw dbError

      toast.success(`Documento "${nomePadrao}" anexado com sucesso!`)
      carregarAnexos()
    } catch (error) {
      console.error('Erro no upload de anexo padrão:', error)
      toast.error(`Erro ao anexar o documento "${nomePadrao}".`)
    } finally {
      setUploadingPadraoName(null)
    }
  }

  const handleAtualizarArquivo = async (anexoId: string, file: File, nomeAnexo: string) => {
    setLoading(true)
    try {
      const sanitizedFileName = file.name.replace(/[^\w.-]/g, '_')
      const filePath = `${aluno.id}/${Date.now()}_${sanitizedFileName}`

      const { error: uploadError } = await supabase.storage
        .from('alunos-anexos')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('alunos-anexos')
        .getPublicUrl(filePath)

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
      setLoading(false)
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
      setLoading(false)
    }
  }

  // Filtrar anexos personalizados (que não correspondem a nenhum padrão configurado)
  const anexosPersonalizados = anexos.filter(
    (a) => !anexosPadrao.some((p) => p.toLowerCase() === a.nome.toLowerCase())
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] bg-[#141416] border border-[#26262a] text-white">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
            Anexos de <span className="text-[#3ea6ff]">{aluno?.nome}</span>
          </DialogTitle>
          <DialogDescription className="text-zinc-400 text-xs mt-1">
            Gerencie e envie os documentos deste aluno.
          </DialogDescription>
        </DialogHeader>

        {/* Formulário de Novo Anexo Personalizado */}
        {isEditMode && (
          <div className="bg-black/30 border border-[#26262a] p-4 rounded-2xl space-y-3">
            <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-[#3ea6ff]" />
              Adicionar Anexo Personalizado
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                placeholder="Nome do documento (ex: Declaração...)"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                className="bg-black/50 border-[#26262a] text-white placeholder-zinc-500 rounded-xl h-10 text-sm focus:border-[#3ea6ff]/40"
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
                  className="flex-1 flex items-center justify-center gap-1.5 h-10 px-3 border border-dashed border-[#26262a] hover:border-[#3ea6ff]/40 rounded-xl text-xs font-medium text-zinc-400 hover:text-white cursor-pointer transition-colors"
                >
                  <Upload className="w-4 h-4 shrink-0" />
                  <span className="truncate max-w-[130px]">
                    {novoArquivo ? novoArquivo.name : 'Selecionar Arquivo'}
                  </span>
                </label>
                <Button
                  onClick={handleUpload}
                  disabled={uploading || !novoNome || !novoArquivo}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-10 text-xs font-semibold px-4 cursor-pointer"
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Adicionar</span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Scrollable Document Sections */}
        <div className="space-y-6 max-h-[380px] overflow-y-auto pr-1.5 py-2">
          {loading && (
            <div className="flex items-center justify-center py-12 text-zinc-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-[#3ea6ff]" />
              <span>Carregando anexos...</span>
            </div>
          )}

          {!loading && (
            <>
              {/* 1. SEÇÃO DOCUMENTOS OBRIGATÓRIOS (Checklist) */}
              {anexosPadrao.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider px-1">
                    Documentos Obrigatórios da Unidade
                  </h4>
                  <div className="space-y-2">
                    {anexosPadrao.map((padrao, i) => {
                      const anexoCorrespondente = anexos.find(
                        (a) => a.nome.toLowerCase() === padrao.toLowerCase()
                      )

                      return (
                        <div
                          key={`padrao-${i}`}
                          className="flex items-center justify-between p-3.5 bg-black/40 border border-[#26262a] hover:border-[#26262a]/80 rounded-xl transition-all"
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
                              <p className="text-sm font-bold text-white truncate">{padrao}</p>
                              <p className="text-[10px] text-zinc-500 mt-0.5">
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
                                  className="p-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
                                  title="Visualizar documento"
                                >
                                  <Eye className="w-4 h-4" />
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
                                      className="p-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-[#7c3aed] border border-[#7c3aed]/20 cursor-pointer transition-colors"
                                      title="Substituir arquivo"
                                    >
                                      <Upload className="w-4 h-4" />
                                    </label>

                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleArquivarAnexo(anexoCorrespondente)}
                                      className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 hover:text-rose-400 text-rose-500 border border-rose-500/20 h-8 w-8 cursor-pointer"
                                      title="Arquivar documento"
                                    >
                                      <Trash2 className="w-4 h-4" />
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
                                    className="flex items-center gap-1.5 h-8 px-3 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-600/30 text-indigo-400 hover:text-indigo-300 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                                  >
                                    {uploadingPadraoName === padrao ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Upload className="w-3.5 h-3.5" />
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
                </div>
              )}

              {/* 2. SEÇÃO DOCUMENTOS PERSONALIZADOS */}
              <div className="space-y-2">
                {anexosPadrao.length > 0 && (
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider px-1 mt-4">
                    Outros Documentos / Anexos Livres
                  </h4>
                )}
                
                <div className="space-y-2">
                  {anexosPersonalizados.map((anexo) => (
                    <div
                      key={anexo.id}
                      className="flex items-center justify-between p-3.5 bg-black/40 border border-[#26262a] hover:border-[#26262a]/80 rounded-xl transition-all"
                    >
                      <div className="min-w-0 flex-1 pr-4 flex items-start gap-3">
                        <FileText className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">{anexo.nome}</p>
                          <p className="text-[10px] text-zinc-500 mt-0.5">
                            Enviado em {new Date(anexo.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={anexo.arquivo_url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
                          title="Visualizar documento"
                        >
                          <Eye className="w-4 h-4" />
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
                              className="p-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-[#7c3aed] border border-[#7c3aed]/20 cursor-pointer transition-colors"
                              title="Substituir arquivo"
                            >
                              <Upload className="w-4 h-4" />
                            </label>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleArquivarAnexo(anexo)}
                              className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 hover:text-rose-400 text-rose-500 border border-rose-500/20 h-8 w-8 cursor-pointer"
                              title="Arquivar documento"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Empty state se não houver NENHUM anexo */}
                  {anexos.length === 0 && (
                    <div className="text-center py-10 border border-dashed border-[#26262a] rounded-2xl bg-black/10">
                      <p className="text-zinc-500 text-sm">Nenhum anexo disponível para este aluno.</p>
                    </div>
                  )}

                  {/* Empty state específico para customizados se houver padrão mas nenhum personalizado */}
                  {anexosPadrao.length > 0 && anexosPersonalizados.length === 0 && (
                    <div className="text-center py-4 border border-dashed border-[#26262a]/50 rounded-xl bg-black/5">
                      <p className="text-zinc-500 text-xs">Nenhum documento complementar enviado.</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
