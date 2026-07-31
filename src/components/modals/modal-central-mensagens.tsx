'use client'

import { useState, useEffect } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Inbox, 
  Send, 
  PenSquare, 
  Search, 
  Reply, 
  Paperclip, 
  Check, 
  CheckCheck, 
  Trash2, 
  Calendar, 
  ArrowLeft,
  Mail,
  Loader2,
  FileText
} from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { useSchoolStore } from '@/store/useSchoolStore'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'

export interface MensagemInterna {
  id: string
  remetente_id: string
  destinatario_id: string
  escola_id?: string | null
  orgao_id?: string | null
  assunto: string
  conteudo: string
  anexo_url?: string | null
  anexo_nome?: string | null
  lida: boolean
  lida_em?: string | null
  deletado_remetente: boolean
  deletado_destinatario: boolean
  mensagem_resposta_id?: string | null
  created_at: string
  remetente?: {
    id: string
    nome: string
    cargo?: string | null
    foto_url?: string | null
    email?: string | null
  }
  destinatario?: {
    id: string
    nome: string
    cargo?: string | null
    foto_url?: string | null
    email?: string | null
  }
}

export interface FuncionarioOption {
  id: string
  nome: string
  cargo?: string | null
  escola_id?: string | null
}

interface ModalCentralMensagensProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onUnreadCountChange?: (count: number) => void
}

export function ModalCentralMensagens({ open = false, onOpenChange, onUnreadCountChange }: ModalCentralMensagensProps) {
  const { funcionario, acessos, isAdminGlobalOrRoot } = useAuthStore()
  const { selectedEscola } = useSchoolStore()

  const [activeTab, setActiveTab] = useState<'inbox' | 'sent' | 'compose' | 'view'>('inbox')
  const [mensagens, setMensagens] = useState<MensagemInterna[]>([])
  const [mensagensEnviadas, setMensagensEnviadas] = useState<MensagemInterna[]>([])
  const [destinatarios, setDestinatarios] = useState<FuncionarioOption[]>([])
  const [selectedMensagem, setSelectedMensagem] = useState<MensagemInterna | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  // Form State
  const [formDestinatarioId, setFormDestinatarioId] = useState('')
  const [formAssunto, setFormAssunto] = useState('')
  const [formConteudo, setFormConteudo] = useState('')
  const [formAnexoUrl, setFormAnexoUrl] = useState<string | null>(null)
  const [formAnexoNome, setFormAnexoNome] = useState<string | null>(null)

  const isLevel1 = funcionario?.is_superadmin || (isAdminGlobalOrRoot && isAdminGlobalOrRoot()) || acessos?.some((a: any) => a.nivel === 1 && a.ativo)

  // Carregar lista de mensagens recebidas
  const loadInbox = async () => {
    if (!funcionario?.id) return
    const supabase = createClient()
    setIsLoading(true)
    try {
      const { data, error } = await (supabase as any)
        .from('mensagens_internas')
        .select(`
          *,
          remetente:funcionarios!remetente_id(id, nome, cargo, foto_url, email)
        `)
        .eq('destinatario_id', funcionario.id)
        .eq('deletado_destinatario', false)
        .order('created_at', { ascending: false })

      if (error) throw error
      const list = (data as MensagemInterna[]) ?? []
      setMensagens(list)

      const unread = list.filter((m) => !m.lida).length
      if (onUnreadCountChange) onUnreadCountChange(unread)
    } catch (error) {
      console.error('Erro ao carregar caixa de entrada:', error)
      toast.error('Não foi possível carregar as mensagens recebidas.')
    } finally {
      setIsLoading(false)
    }
  }

  // Carregar lista de mensagens enviadas
  const loadSent = async () => {
    if (!funcionario?.id) return
    const supabase = createClient()
    setIsLoading(true)
    try {
      const { data, error } = await (supabase as any)
        .from('mensagens_internas')
        .select(`
          *,
          destinatario:funcionarios!destinatario_id(id, nome, cargo, foto_url, email)
        `)
        .eq('remetente_id', funcionario.id)
        .eq('deletado_remetente', false)
        .order('created_at', { ascending: false })

      if (error) throw error
      setMensagensEnviadas((data as MensagemInterna[]) ?? [])
    } catch (error) {
      console.error('Erro ao carregar mensagens enviadas:', error)
      toast.error('Não foi possível carregar as mensagens enviadas.')
    } finally {
      setIsLoading(false)
    }
  }

  // Carregar lista de funcionários elegíveis para envio de mensagem
  const loadDestinatarios = async () => {
    if (!funcionario?.id) return
    const supabase = createClient()
    try {
      let list: FuncionarioOption[] = []

      if (isLevel1) {
        // Nível 1 pode enviar para QUALQUER funcionário ativo da rede municipal
        const { data, error } = await supabase
          .from('funcionarios')
          .select('id, nome, cargo')
          .eq('status', 'ativo')
          .neq('id', funcionario.id)
          .order('nome', { ascending: true })

        if (error) throw error
        list = (data as unknown as FuncionarioOption[]) ?? []
      } else {
        // Nível > 1: limita à mesma unidade (escola_id atual da sessão ou do vínculo)
        const targetEscolaId = selectedEscola?.id ?? (funcionario as any)?.escola_id

        if (targetEscolaId) {
          // Busca funcionários vinculados na tabela vinculos_funcionarios
          const { data: vinculos, error: errVinculos } = await supabase
            .from('vinculos_funcionarios')
            .select('funcionario:funcionarios!funcionario_id(id, nome, cargo)')
            .eq('escola_id', targetEscolaId)
            .eq('ativo', true)

          if (errVinculos) throw errVinculos

          const map = new Map<string, FuncionarioOption>()
          ;(vinculos ?? []).forEach((v: any) => {
            if (v.funcionario && v.funcionario.id !== funcionario.id) {
              map.set(v.funcionario.id, v.funcionario)
            }
          })

          list = Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome))
        }
      }

      setDestinatarios(list)
    } catch (error) {
      console.error('Erro ao carregar lista de destinatários:', error)
    }
  }

  useEffect(() => {
    if (open && funcionario?.id) {
      loadInbox()
      loadDestinatarios()
    }
  }, [open, funcionario?.id])

  useEffect(() => {
    if (activeTab === 'inbox') loadInbox()
    if (activeTab === 'sent') loadSent()
    if (activeTab === 'compose') loadDestinatarios()
  }, [activeTab])

  // Marcar mensagem como lida com atualização otimista
  const markAsRead = async (msg: MensagemInterna) => {
    if (msg.lida) return
    const supabase = createClient()
    try {
      // Atualização otimista
      setMensagens((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, lida: true, lida_em: new Date().toISOString() } : m))
      )
      const newUnread = Math.max(0, mensagens.filter((m) => !m.lida && m.id !== msg.id).length)
      if (onUnreadCountChange) onUnreadCountChange(newUnread)

      await (supabase as any)
        .from('mensagens_internas')
        .update({ lida: true, lida_em: new Date().toISOString() })
        .eq('id', msg.id)
    } catch (error) {
      console.error('Erro ao marcar mensagem como lida:', error)
    }
  }

  // Upload de Anexos
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      toast.error('O tamanho máximo permitido para o anexo é 10MB.')
      return
    }

    const supabase = createClient()
    setIsUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`
      const filePath = `anexos_mensagens/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('comunicados')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage
        .from('comunicados')
        .getPublicUrl(filePath)

      setFormAnexoUrl(publicUrlData.publicUrl)
      setFormAnexoNome(file.name)
      toast.success('Anexo anexado com sucesso!')
    } catch (error: any) {
      console.error('Erro ao fazer upload de anexo:', error)
      toast.error('Erro ao salvar o anexo. Tente novamente.')
    } finally {
      setIsUploading(false)
    }
  }

  // Envio da mensagem
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formDestinatarioId) {
      toast.error('Selecione o destinatário da mensagem.')
      return
    }
    if (!formAssunto.trim()) {
      toast.error('Preencha o assunto da mensagem.')
      return
    }
    if (!formConteudo.trim()) {
      toast.error('Digite a mensagem a ser enviada.')
      return
    }
    if (!funcionario?.id) {
      toast.error('Sessão expirada. Faça login novamente.')
      return
    }

    const supabase = createClient()
    setIsSubmitting(true)
    try {
      const payload = {
        remetente_id: funcionario.id,
        destinatario_id: formDestinatarioId,
        escola_id: selectedEscola?.id ?? (funcionario as any)?.escola_id ?? null,
        assunto: formAssunto.trim(),
        conteudo: formConteudo.trim(),
        anexo_url: formAnexoUrl ?? null,
        anexo_nome: formAnexoNome ?? null,
        mensagem_resposta_id: selectedMensagem?.id ?? null,
      }

      const { error } = await (supabase as any).from('mensagens_internas').insert(payload)

      if (error) throw error

      toast.success('Mensagem enviada com sucesso!')
      
      // Reset Form
      setFormDestinatarioId('')
      setFormAssunto('')
      setFormConteudo('')
      setFormAnexoUrl(null)
      setFormAnexoNome(null)
      setSelectedMensagem(null)

      setActiveTab('sent')
    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error)
      toast.error('Erro ao enviar a mensagem. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Ação de Responder Mensagem
  const handleReply = (msg: MensagemInterna) => {
    const remetente = msg.remetente
    if (!remetente) return

    // Se o remetente original não estiver na lista de destinatários (ex: Nível 1 de outra escola), adicionamos dinamicamente
    if (!destinatarios.some((d) => d.id === remetente.id)) {
      setDestinatarios((prev) => [
        { id: remetente.id, nome: remetente.nome, cargo: remetente.cargo },
        ...prev
      ])
    }

    setFormDestinatarioId(remetente.id)
    setFormAssunto(msg.assunto.startsWith('Re:') ? msg.assunto : `Re: ${msg.assunto}`)
    setFormConteudo(`\n\n--- Mensagem Anterior (${new Date(msg.created_at).toLocaleDateString('pt-BR')}) ---\n${msg.conteudo}`)
    setSelectedMensagem(msg)
    setActiveTab('compose')
  }

  // Excluir mensagem (Soft delete)
  const handleDelete = async (msgId: string, isInbox: boolean) => {
    const supabase = createClient()
    try {
      const field = isInbox ? 'deletado_destinatario' : 'deletado_remetente'
      const { error } = await (supabase as any)
        .from('mensagens_internas')
        .update({ [field]: true })
        .eq('id', msgId)

      if (error) throw error

      toast.success('Mensagem removida com sucesso.')

      if (isInbox) {
        setMensagens((prev) => prev.filter((m) => m.id !== msgId))
      } else {
        setMensagensEnviadas((prev) => prev.filter((m) => m.id !== msgId))
      }

      if (selectedMensagem?.id === msgId) {
        setSelectedMensagem(null)
        setActiveTab(isInbox ? 'inbox' : 'sent')
      }
    } catch (error) {
      console.error('Erro ao deletar mensagem:', error)
      toast.error('Erro ao remover mensagem.')
    }
  }

  const filteredInbox = mensagens.filter(
    (m) =>
      m.assunto.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.conteudo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.remetente?.nome ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredSent = mensagensEnviadas.filter(
    (m) =>
      m.assunto.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.conteudo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.destinatario?.nome ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <StandardDialog
      open={open}
      onOpenChange={(val) => {
        if (onOpenChange) onOpenChange(val)
        if (!val) {
          setSelectedMensagem(null)
          setActiveTab('inbox')
        }
      }}
      title="Central de Mensagens"
      description="Correio eletrônico e comunicados internos da rede municipal"
      maxWidth="sm:max-w-2xl"
    >
      <div className="flex flex-col h-[520px] max-h-[80vh]">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-borderCustom pb-3 gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-surface-2 p-1 rounded-xl border border-borderCustom">
            <button
              type="button"
              onClick={() => {
                setActiveTab('inbox')
                setSelectedMensagem(null)
              }}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'inbox' || (activeTab === 'view' && selectedMensagem?.destinatario_id === funcionario?.id)
                  ? 'bg-[#185FA5] text-white shadow-sm dark:bg-[#3ea6ff] dark:text-zinc-950'
                  : 'text-muted-foreground hover:text-foreground hover:bg-hoverCustom'
              }`}
            >
              <Inbox className="w-4 h-4" />
              <span>Entrada</span>
              {mensagens.filter((m) => !m.lida).length > 0 && (
                <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {mensagens.filter((m) => !m.lida).length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('sent')
                setSelectedMensagem(null)
              }}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'sent' || (activeTab === 'view' && selectedMensagem?.remetente_id === funcionario?.id)
                  ? 'bg-[#185FA5] text-white shadow-sm dark:bg-[#3ea6ff] dark:text-zinc-950'
                  : 'text-muted-foreground hover:text-foreground hover:bg-hoverCustom'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>Enviadas</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('compose')
                setSelectedMensagem(null)
              }}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'compose'
                  ? 'bg-[#185FA5] text-white shadow-sm dark:bg-[#3ea6ff] dark:text-zinc-950'
                  : 'text-muted-foreground hover:text-foreground hover:bg-hoverCustom'
              }`}
            >
              <PenSquare className="w-4 h-4" />
              <span>Escrever</span>
            </button>
          </div>

          {/* Search Box (For Inbox and Sent tabs) */}
          {(activeTab === 'inbox' || activeTab === 'sent') && (
            <div className="relative w-44 md:w-56">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar mensagens..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-input border-borderCustom rounded-lg"
              />
            </div>
          )}
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto pt-3 min-h-0">
          {/* TAB: INBOX */}
          {activeTab === 'inbox' && (
            <div className="space-y-2">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[#185FA5] dark:text-[#3ea6ff]" />
                  <span className="text-xs">Carregando caixa de entrada...</span>
                </div>
              ) : filteredInbox.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground gap-2">
                  <Mail className="w-10 h-10 stroke-1 opacity-40" />
                  <p className="text-sm font-medium">Nenhuma mensagem recebida</p>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    Sua caixa de entrada está limpa. As mensagens de colegas de sua unidade aparecerão aqui.
                  </p>
                </div>
              ) : (
                filteredInbox.map((msg) => (
                  <div
                    key={msg.id}
                    onClick={() => {
                      setSelectedMensagem(msg)
                      markAsRead(msg)
                      setActiveTab('view')
                    }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 group ${
                      !msg.lida
                        ? 'bg-[#185FA5]/10 border-[#185FA5]/30 dark:bg-[#3ea6ff]/10 dark:border-[#3ea6ff]/30 shadow-sm'
                        : 'bg-card border-borderCustom hover:bg-hoverCustom'
                    }`}
                  >
                    {/* Avatar / Status Dot */}
                    <div className="relative pt-0.5 shrink-0">
                      {msg.remetente?.foto_url ? (
                        <img
                          src={`${msg.remetente.foto_url}?t=${Date.now()}`}
                          alt={msg.remetente.nome}
                          className="w-9 h-9 rounded-full object-cover border border-borderCustom"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-surface-3 flex items-center justify-center text-foreground font-bold text-xs">
                          {(msg.remetente?.nome ?? 'S').charAt(0).toUpperCase()}
                        </div>
                      )}
                      {!msg.lida && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full border-2 border-card" />
                      )}
                    </div>

                    {/* Message Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className={`text-xs md:text-sm truncate ${!msg.lida ? 'font-bold text-foreground' : 'font-medium text-foregroundCustom'}`}>
                          {msg.remetente?.nome ?? 'Servidor Municipal'}
                        </h4>
                        <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(msg.created_at).toLocaleDateString('pt-BR')} {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <p className={`text-xs truncate mt-0.5 ${!msg.lida ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                        {msg.assunto}
                      </p>

                      <p className="text-xs text-muted-foreground line-clamp-1 mt-1 opacity-80">
                        {msg.conteudo}
                      </p>

                      {msg.anexo_nome && (
                        <div className="flex items-center gap-1 text-[11px] text-[#185FA5] dark:text-[#3ea6ff] mt-1.5 font-medium">
                          <Paperclip className="w-3 h-3" />
                          <span className="truncate">{msg.anexo_nome}</span>
                        </div>
                      )}
                    </div>

                    {/* Delete Action */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(msg.id, true)
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 cursor-pointer shrink-0"
                      title="Excluir mensagem"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB: SENT */}
          {activeTab === 'sent' && (
            <div className="space-y-2">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[#185FA5] dark:text-[#3ea6ff]" />
                  <span className="text-xs">Carregando mensagens enviadas...</span>
                </div>
              ) : filteredSent.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground gap-2">
                  <Send className="w-10 h-10 stroke-1 opacity-40" />
                  <p className="text-sm font-medium">Nenhuma mensagem enviada</p>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    As mensagens que você enviar para colegas de trabalho aparecerão aqui.
                  </p>
                </div>
              ) : (
                filteredSent.map((msg) => (
                  <div
                    key={msg.id}
                    onClick={() => {
                      setSelectedMensagem(msg)
                      setActiveTab('view')
                    }}
                    className="p-3.5 rounded-xl border border-borderCustom bg-card hover:bg-hoverCustom transition-all cursor-pointer flex items-start gap-3 group"
                  >
                    <div className="w-9 h-9 rounded-full bg-surface-3 flex items-center justify-center text-foreground font-bold text-xs shrink-0">
                      {(msg.destinatario?.nome ?? 'D').charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs md:text-sm font-medium text-foreground truncate">
                          Para: {msg.destinatario?.nome ?? 'Servidor Municipal'}
                        </h4>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(msg.created_at).toLocaleDateString('pt-BR')} {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {msg.lida ? (
                            <span title={`Lida em ${new Date(msg.lida_em!).toLocaleString('pt-BR')}`}>
                              <CheckCheck className="w-4 h-4 text-emerald-500" />
                            </span>
                          ) : (
                            <span title="Entregue (Não lida)">
                              <Check className="w-4 h-4 text-muted-foreground" />
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-xs font-semibold text-foregroundCustom truncate mt-0.5">
                        {msg.assunto}
                      </p>

                      <p className="text-xs text-muted-foreground line-clamp-1 mt-1 opacity-80">
                        {msg.conteudo}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(msg.id, false)
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 cursor-pointer shrink-0"
                      title="Excluir mensagem enviada"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB: COMPOSE */}
          {activeTab === 'compose' && (
            <form onSubmit={handleSendMessage} className="space-y-3.5">
              {/* Select Destinatário */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Destinatário <span className="text-red-500">*</span>
                </label>
                <select
                  value={formDestinatarioId}
                  onChange={(e) => setFormDestinatarioId(e.target.value)}
                  className="w-full bg-input border border-borderCustom rounded-lg p-2 text-xs text-foreground outline-none focus:border-[#185FA5] dark:focus:border-[#3ea6ff]"
                >
                  <option value="">-- Selecione o Servidor ou Colega --</option>
                  {destinatarios.map((dest) => (
                    <option key={dest.id} value={dest.id}>
                      {dest.nome} {dest.cargo ? `(${dest.cargo})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {isLevel1
                    ? '✨ Como Administrador (Nível 1), você pode enviar mensagens para qualquer funcionário da rede.'
                    : '🔒 Listando funcionários lotados na mesma unidade escolar / secretaria.'}
                </p>
              </div>

              {/* Assunto */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Assunto <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="Ex: Alinhamento de diário pedagógico / Reunião"
                  value={formAssunto}
                  onChange={(e) => setFormAssunto(e.target.value)}
                  className="w-full h-9 bg-input border-borderCustom rounded-lg text-xs"
                />
              </div>

              {/* Conteúdo */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Mensagem <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={6}
                  placeholder="Escreva sua mensagem interna..."
                  value={formConteudo}
                  onChange={(e) => setFormConteudo(e.target.value)}
                  className="w-full bg-input border border-borderCustom rounded-lg p-2.5 text-xs text-foreground outline-none focus:border-[#185FA5] dark:focus:border-[#3ea6ff] resize-none"
                />
              </div>

              {/* Anexo */}
              <div className="flex items-center justify-between gap-3 p-2.5 bg-surface-2 rounded-xl border border-borderCustom">
                <div className="flex items-center gap-2 min-w-0">
                  <Paperclip className="w-4 h-4 text-muted-foreground shrink-0" />
                  {formAnexoNome ? (
                    <span className="text-xs font-medium text-[#185FA5] dark:text-[#3ea6ff] truncate">
                      {formAnexoNome}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Anexar documento (PDF, imagem até 10MB)</span>
                  )}
                </div>

                <label className="px-3 py-1.5 rounded-lg bg-surface-3 hover:bg-hoverCustom text-foreground text-xs font-semibold cursor-pointer shrink-0 transition-colors">
                  {isUploading ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...
                    </span>
                  ) : formAnexoNome ? (
                    'Trocar Anexo'
                  ) : (
                    'Selecionar Arquivo'
                  )}
                  <input type="file" onChange={handleFileUpload} className="hidden" accept="image/*,.pdf,.doc,.docx" />
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-borderCustom">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setActiveTab('inbox')
                    setSelectedMensagem(null)
                  }}
                  className="text-xs h-9"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#185FA5] hover:bg-[#185FA5]/90 dark:bg-[#3ea6ff] dark:text-zinc-950 text-white font-semibold text-xs h-9 px-4 gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Enviar Mensagem
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* TAB: VIEW DETAIL */}
          {activeTab === 'view' && selectedMensagem && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setActiveTab(selectedMensagem.destinatario_id === funcionario?.id ? 'inbox' : 'sent')}
                className="flex items-center gap-1.5 text-xs text-[#185FA5] dark:text-[#3ea6ff] font-semibold hover:underline cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Voltar para a lista
              </button>

              <div className="p-4 rounded-2xl bg-card border border-borderCustom space-y-3">
                {/* Header info */}
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-borderCustom">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#185FA5]/20 text-[#185FA5] dark:bg-[#3ea6ff]/20 dark:text-[#3ea6ff] flex items-center justify-center font-bold text-sm">
                      {((selectedMensagem.destinatario_id === funcionario?.id ? selectedMensagem.remetente?.nome : selectedMensagem.destinatario?.nome) ?? 'S').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">
                        {selectedMensagem.destinatario_id === funcionario?.id
                          ? selectedMensagem.remetente?.nome ?? 'Servidor Municipal'
                          : `Para: ${selectedMensagem.destinatario?.nome ?? 'Servidor Municipal'}`}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {selectedMensagem.destinatario_id === funcionario?.id
                          ? selectedMensagem.remetente?.cargo ?? 'Servidor Publico'
                          : selectedMensagem.destinatario?.cargo ?? 'Servidor Publico'}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(selectedMensagem.created_at).toLocaleString('pt-BR')}
                  </span>
                </div>

                {/* Assunto */}
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Assunto</span>
                  <h2 className="text-sm font-bold text-foreground mt-0.5">{selectedMensagem.assunto}</h2>
                </div>

                {/* Conteúdo */}
                <div className="pt-2">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Mensagem</span>
                  <p className="text-xs text-foregroundCustom whitespace-pre-wrap leading-relaxed mt-1 p-3 rounded-xl bg-surface-2 border border-borderCustom">
                    {selectedMensagem.conteudo}
                  </p>
                </div>

                {/* Anexo se existir */}
                {selectedMensagem.anexo_url && (
                  <div className="pt-2">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Anexo</span>
                    <a
                      href={`${selectedMensagem.anexo_url}?t=${Date.now()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 flex items-center gap-2 p-2.5 rounded-xl border border-borderCustom bg-surface-2 hover:bg-hoverCustom text-xs font-semibold text-[#185FA5] dark:text-[#3ea6ff] transition-colors w-fit"
                    >
                      <FileText className="w-4 h-4" />
                      <span>{selectedMensagem.anexo_nome ?? 'Baixar Anexo'}</span>
                    </a>
                  </div>
                )}

                {/* Action Bar */}
                <div className="flex items-center justify-between pt-3 border-t border-borderCustom">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(selectedMensagem.id, selectedMensagem.destinatario_id === funcionario?.id)}
                    className="text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 gap-1.5 h-8"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Excluir Mensagem
                  </Button>

                  {selectedMensagem.destinatario_id === funcionario?.id && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleReply(selectedMensagem)}
                      className="bg-[#185FA5] hover:bg-[#185FA5]/90 dark:bg-[#3ea6ff] dark:text-zinc-950 text-white font-semibold text-xs h-8 px-3 gap-1.5 cursor-pointer"
                    >
                      <Reply className="w-3.5 h-3.5" /> Responder
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </StandardDialog>
  )
}
