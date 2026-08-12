'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { CachedImage } from '@/components/ui/cached-image'
import { getAvatarUrl } from '@/lib/photoHelper'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  MessageSquare, 
  Send, 
  PenSquare, 
  Search, 
  Paperclip, 
  Check, 
  CheckCheck, 
  Trash2, 
  Calendar, 
  ArrowLeft,
  Mail,
  Loader2,
  FileText,
  User,
  Building2,
  Sparkles,
  Inbox,
  X
} from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { useSchoolStore } from '@/store/useSchoolStore'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { sendPushToUser } from '@/lib/push/sendPushToUser'

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
    foto_avatar_path?: string | null
    foto_visualizacao_path?: string | null
    foto_updated_at?: string | null
    email?: string | null
  }
  destinatario?: {
    id: string
    nome: string
    cargo?: string | null
    foto_url?: string | null
    foto_avatar_path?: string | null
    foto_visualizacao_path?: string | null
    foto_updated_at?: string | null
    email?: string | null
  }
}

export interface FuncionarioOption {
  id: string
  nome: string
  cargo?: string | null
  escola_id?: string | null
  foto_url?: string | null
  foto_avatar_path?: string | null
  foto_visualizacao_path?: string | null
  foto_updated_at?: string | null
}

interface ConversationGroup {
  contactId: string
  contactName: string
  contactCargo?: string | null
  contactFotoUrl?: string | null
  contactFotoUpdatedAt?: string | null
  lastMessage: MensagemInterna
  unreadCount: number
  messages: MensagemInterna[]
}

interface ModalCentralMensagensProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onUnreadCountChange?: (count: number) => void
}

export function ModalCentralMensagens({ open = false, onOpenChange, onUnreadCountChange }: ModalCentralMensagensProps) {
  const { funcionario, acessos, isAdminGlobalOrRoot } = useAuthStore()
  const { selectedEscola } = useSchoolStore()

  const [activeTab, setActiveTab] = useState<'chat' | 'compose' | 'inbox' | 'sent'>('chat')
  const [allMessages, setAllMessages] = useState<MensagemInterna[]>([])
  const [destinatarios, setDestinatarios] = useState<FuncionarioOption[]>([])
  const [activeContactId, setActiveContactId] = useState<string | null>(null)

  // Filters & Loading
  const [contactSearchQuery, setContactSearchQuery] = useState('')
  const [composeSearchQuery, setComposeSearchQuery] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  // Quick Reply / Chat Form State
  const [chatInputText, setChatInputText] = useState('')
  const [chatAnexoUrl, setChatAnexoUrl] = useState<string | null>(null)
  const [chatAnexoNome, setChatAnexoNome] = useState<string | null>(null)

  // Compose Form State
  const [formDestinatarioId, setFormDestinatarioId] = useState('')
  const [formAssunto, setFormAssunto] = useState('')
  const [formConteudo, setFormConteudo] = useState('')
  const [formAnexoUrl, setFormAnexoUrl] = useState<string | null>(null)
  const [formAnexoNome, setFormAnexoNome] = useState<string | null>(null)

  const chatEndRef = useRef<HTMLDivElement | null>(null)
  const isMounted = useRef(true)

  const isLevel1 = funcionario?.is_superadmin || (isAdminGlobalOrRoot && isAdminGlobalOrRoot()) || acessos?.some((a: any) => a.nivel === 1 && a.ativo)
  const isLevel2 = !isLevel1 && (acessos?.some((a: any) => a.nivel === 2 && a.ativo) || funcionario?.cargo?.toLowerCase()?.includes('diretor'))

  // Carregar todas as mensagens (recebidas e enviadas) para o usuário logado
  const loadAllMessages = async () => {
    if (!funcionario?.id) return
    const supabase = createClient()
    if (isMounted.current) setIsLoading(true)

    try {
      const { data, error } = await (supabase as any)
        .from('mensagens_internas')
        .select(`
          *,
          remetente:funcionarios!remetente_id(id, nome, cargo, foto_url, foto_avatar_path, foto_visualizacao_path, foto_updated_at, email),
          destinatario:funcionarios!destinatario_id(id, nome, cargo, foto_url, foto_avatar_path, foto_visualizacao_path, foto_updated_at, email)
        `)
        .or(`destinatario_id.eq.${funcionario.id},remetente_id.eq.${funcionario.id}`)
        .order('created_at', { ascending: true })

      if (error) throw error

      const list = ((data as MensagemInterna[]) ?? []).filter(m => {
        if (m.destinatario_id === funcionario.id && m.deletado_destinatario) return false
        if (m.remetente_id === funcionario.id && m.deletado_remetente) return false
        return true
      })

      if (isMounted.current) {
        setAllMessages(list)
        const unread = list.filter((m) => m.destinatario_id === funcionario.id && !m.lida).length
        if (onUnreadCountChange) onUnreadCountChange(unread)
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error)
      toast.error('Erro ao carregar central de mensagens.')
    } finally {
      if (isMounted.current) setIsLoading(false)
    }
  }

  // Carregar funcionários elegíveis para o autocomplete de envio
  const loadDestinatarios = async () => {
    if (!funcionario?.id) return
    const supabase = createClient()
    try {
      let list: (FuncionarioOption & { permitir_mensagens_globais?: boolean; email?: string })[] = []
      const map = new Map<string, FuncionarioOption & { permitir_mensagens_globais?: boolean; email?: string }>()

      if (isLevel1) {
        const { data, error } = await supabase
          .from('funcionarios')
          .select('id, nome, cargo, foto_url, foto_avatar_path, foto_visualizacao_path, foto_updated_at, permitir_mensagens_globais, email')
          .eq('status', 'ativo')
          .neq('id', funcionario.id)
          .order('nome', { ascending: true })

        if (error) throw error
        list = (data as unknown as any[]) ?? []
      } else {
        const targetEscolaId = selectedEscola?.id ?? (funcionario as any)?.escola_id

        if (targetEscolaId) {
          const { data: vinculos, error: errVinculos } = await supabase
            .from('vinculos_funcionarios')
            .select('funcionario:funcionarios!funcionario_id(id, nome, cargo, foto_url, foto_avatar_path, foto_visualizacao_path, foto_updated_at, permitir_mensagens_globais, email)')
            .eq('escola_id', targetEscolaId)
            .eq('ativo', true)

          if (!errVinculos && vinculos) {
            vinculos.forEach((v: any) => {
              if (v.funcionario && v.funcionario.id !== funcionario.id) {
                map.set(v.funcionario.id, v.funcionario)
              }
            })
          }
        }

        if (isLevel2) {
          const { data: acessosNivel1 } = await supabase
            .from('acessos_usuarios')
            .select('funcionario:funcionarios!funcionario_id(id, nome, cargo, foto_url, foto_avatar_path, foto_visualizacao_path, foto_updated_at, permitir_mensagens_globais, email)')
            .eq('nivel', 1)
            .eq('ativo', true)

          if (acessosNivel1) {
            acessosNivel1.forEach((a: any) => {
              if (a.funcionario && a.funcionario.id !== funcionario.id) {
                map.set(a.funcionario.id, a.funcionario)
              }
            })
          }

          const { data: superadmins } = await supabase
            .from('funcionarios')
            .select('id, nome, cargo, foto_url, foto_avatar_path, foto_visualizacao_path, foto_updated_at, permitir_mensagens_globais, email')
            .eq('is_superadmin', true)
            .eq('status', 'ativo')

          if (superadmins) {
            superadmins.forEach((sa: any) => {
              if (sa.id !== funcionario.id) {
                map.set(sa.id, sa)
              }
            })
          }
        }

        // Buscar sempre a conta master adm@sig.com (ou superadmin master) para permitir envio global
        const { data: masterAccount } = await supabase
          .from('funcionarios')
          .select('id, nome, cargo, foto_url, foto_avatar_path, foto_visualizacao_path, foto_updated_at, permitir_mensagens_globais, email')
          .or('email.ilike.adm@sig.com,email.ilike.adm@super.com,is_superadmin.eq.true')
          .eq('status', 'ativo')

        if (masterAccount) {
          masterAccount.forEach((m: any) => {
            if (m.id !== funcionario.id) {
              map.set(m.id, m)
            }
          })
        }

        list = Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome))
      }

      // Filtrar contatos com base na preferência permitir_mensagens_globais
      // Se permitir_mensagens_globais === false, mantém na lista APENAS se o usuário logado já possuir um chat/conversa com esse contato ou se for adm@sig.com
      const openChatContactIds = new Set<string>()
      allMessages.forEach((msg) => {
        const contactId = msg.remetente_id === funcionario.id ? msg.destinatario_id : msg.remetente_id
        if (contactId) openChatContactIds.add(contactId)
      })

      const filteredList = list.filter((item) => {
        const isMaster = item.email?.toLowerCase().includes('adm@sig.com') || item.email?.toLowerCase().includes('adm@super.com')
        if (isMaster) return true
        if (item.permitir_mensagens_globais !== false) return true
        return openChatContactIds.has(item.id)
      })

      if (isMounted.current) {
        setDestinatarios(filteredList)
      }
    } catch (error) {
      console.error('Erro ao carregar lista de destinatários:', error)
    }
  }

  useEffect(() => {
    isMounted.current = true
    if (open && funcionario?.id) {
      loadAllMessages()
      loadDestinatarios()
    }
    return () => {
      isMounted.current = false
    }
  }, [open, funcionario?.id])

  // Realtime subscription para mensagens novas instantâneas
  useEffect(() => {
    if (!open || !funcionario?.id) return

    const supabase = createClient()
    const channel = supabase
      .channel('mensagens_internas_chat_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensagens_internas' },
        async (payload: any) => {
          if (!isMounted.current) return
          const newMsg = payload.new
          if (!newMsg) return

          // Verifica se a mensagem pertence ao usuário logado (remetente ou destinatário)
          if (newMsg.destinatario_id === funcionario.id || newMsg.remetente_id === funcionario.id) {
            // Busca dados do remetente/destinatario para renderizar no balão
            const { data: fullMsg } = await (supabase as any)
              .from('mensagens_internas')
              .select(`
                *,
                remetente:funcionarios!remetente_id(id, nome, cargo, foto_url, foto_avatar_path, foto_visualizacao_path, foto_updated_at, email),
                destinatario:funcionarios!destinatario_id(id, nome, cargo, foto_url, foto_avatar_path, foto_visualizacao_path, foto_updated_at, email)
              `)
              .eq('id', newMsg.id)
              .single()

            if (fullMsg && isMounted.current) {
              setAllMessages((prev) => {
                if (prev.some((m) => m.id === fullMsg.id)) return prev
                return [...prev, fullMsg]
              })

              // Se for pro usuário logado e estiver com chat aberto, marca como lida automaticamente
              if (newMsg.destinatario_id === funcionario.id) {
                if (activeContactId === newMsg.remetente_id) {
                  markAsRead(fullMsg)
                } else {
                  toast.info(`💬 Nova mensagem de ${fullMsg.remetente?.nome || 'Servidor'}`)
                }
              }
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [open, funcionario?.id, activeContactId])

  // Agrupamento por Conversas (Estilo WhatsApp)
  const conversationsMap = useMemo(() => {
    if (!funcionario?.id) return []

    const groups = new Map<string, ConversationGroup>()

    allMessages.forEach((msg) => {
      const isSentByMe = msg.remetente_id === funcionario.id
      const contact = isSentByMe ? msg.destinatario : msg.remetente
      const contactId = isSentByMe ? msg.destinatario_id : msg.remetente_id

      if (!contactId) return

      const contactName = contact?.nome || 'Servidor Municipal'
      const contactCargo = contact?.cargo || null
      const contactFotoUrl = getAvatarUrl(contact as any) || null
      const contactFotoUpdatedAt = contact?.foto_updated_at || null

      if (!groups.has(contactId)) {
        groups.set(contactId, {
          contactId,
          contactName,
          contactCargo,
          contactFotoUrl,
          contactFotoUpdatedAt,
          lastMessage: msg,
          unreadCount: 0,
          messages: [],
        })
      }

      const grp = groups.get(contactId)!
      grp.messages.push(msg)
      grp.lastMessage = msg
      if (!isSentByMe && !msg.lida) {
        grp.unreadCount += 1
      }
    })

    const result = Array.from(groups.values()).sort((a, b) => {
      return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime()
    })

    return result
  }, [allMessages, funcionario?.id])

  // Conversa ativa selecionada
  const activeConversation = useMemo(() => {
    if (!activeContactId) {
      return conversationsMap[0] || null
    }
    return conversationsMap.find((c) => c.contactId === activeContactId) || null
  }, [conversationsMap, activeContactId])

  // Auto Scroll para o final do Chat
  useEffect(() => {
    if (activeTab === 'chat' && activeConversation) {
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }, [activeConversation?.messages.length, activeTab])

  // Marcar mensagens da conversa ativa como lidas
  useEffect(() => {
    if (activeTab === 'chat' && activeConversation) {
      const unreadMsgs = activeConversation.messages.filter(
        (m) => m.destinatario_id === funcionario?.id && !m.lida
      )
      if (unreadMsgs.length > 0) {
        unreadMsgs.forEach((m) => markAsRead(m))
      }
    }
  }, [activeContactId, activeTab])

  const markAsRead = async (msg: MensagemInterna) => {
    if (msg.lida) return
    const supabase = createClient()
    try {
      setAllMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, lida: true, lida_em: new Date().toISOString() } : m))
      )
      await (supabase as any)
        .from('mensagens_internas')
        .update({ lida: true, lida_em: new Date().toISOString() })
        .eq('id', msg.id)
    } catch (error) {
      console.error('Erro ao marcar mensagem como lida:', error)
    }
  }

  // Upload de Anexos
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isChat = false) => {
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
        .from('anexos')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage
        .from('anexos')
        .getPublicUrl(filePath)

      if (isChat) {
        setChatAnexoUrl(publicUrlData.publicUrl)
        setChatAnexoNome(file.name)
      } else {
        setFormAnexoUrl(publicUrlData.publicUrl)
        setFormAnexoNome(file.name)
      }
      toast.success('Anexo enviado com sucesso!')
    } catch (error: any) {
      console.error('Erro ao fazer upload de anexo:', error)
      toast.error('Erro ao salvar anexo.')
    } finally {
      setIsUploading(false)
    }
  }

  // Envio Rápido no Chat estilo WhatsApp
  const handleSendChatQuick = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    if (!activeContactId && !activeConversation?.contactId) {
      toast.error('Selecione uma conversa.')
      return
    }
    const targetContactId = activeContactId || activeConversation?.contactId
    if (!targetContactId) return

    if (!chatInputText.trim() && !chatAnexoUrl) {
      return
    }

    if (!funcionario?.id) {
      toast.error('Sessão expirada.')
      return
    }

    const textToSend = chatInputText.trim() || (chatAnexoNome ? `[Anexo: ${chatAnexoNome}]` : 'Mensagem sem texto')
    setChatInputText('')
    const currentAnexoUrl = chatAnexoUrl
    const currentAnexoNome = chatAnexoNome
    setChatAnexoUrl(null)
    setChatAnexoNome(null)

    const supabase = createClient()
    setIsSubmitting(true)
    try {
      const payload = {
        remetente_id: funcionario.id,
        destinatario_id: targetContactId,
        escola_id: selectedEscola?.id ?? (funcionario as any)?.escola_id ?? null,
        assunto: 'Chat Direto',
        conteudo: textToSend,
        anexo_url: currentAnexoUrl ?? null,
        anexo_nome: currentAnexoNome ?? null,
      }

      const { data: inserted, error } = await (supabase as any)
        .from('mensagens_internas')
        .insert(payload)
        .select(`
          *,
          remetente:funcionarios!remetente_id(id, nome, cargo, foto_url, foto_avatar_path, foto_visualizacao_path, foto_updated_at, email),
          destinatario:funcionarios!destinatario_id(id, nome, cargo, foto_url, foto_avatar_path, foto_visualizacao_path, foto_updated_at, email)
        `)
        .single()

      if (error) throw error

      if (inserted && isMounted.current) {
        setAllMessages((prev) => [...prev, inserted])
      }

      // Disparo de notificação Push
      sendPushToUser({
        destinatarioId: targetContactId,
        title: `💬 Mensagem de ${funcionario.nome || 'Servidor'}`,
        message: textToSend,
        link: '/home',
        tag: 'mensagem-interna',
      }).catch(() => {})

    } catch (error: any) {
      console.error('Erro ao enviar mensagem no chat:', error)
      toast.error('Falha ao enviar mensagem.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Envio de nova mensagem via formulário tradicional
  const handleSendMessageForm = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formDestinatarioId) {
      toast.error('Selecione o destinatário da mensagem.')
      return
    }
    if (!formConteudo.trim()) {
      toast.error('Digite o conteúdo da mensagem.')
      return
    }
    if (!funcionario?.id) return

    const supabase = createClient()
    setIsSubmitting(true)
    try {
      const payload = {
        remetente_id: funcionario.id,
        destinatario_id: formDestinatarioId,
        escola_id: selectedEscola?.id ?? (funcionario as any)?.escola_id ?? null,
        assunto: formAssunto.trim() || 'Comunicado Interno',
        conteudo: formConteudo.trim(),
        anexo_url: formAnexoUrl ?? null,
        anexo_nome: formAnexoNome ?? null,
      }

      const { data: inserted, error } = await (supabase as any)
        .from('mensagens_internas')
        .insert(payload)
        .select(`
          *,
          remetente:funcionarios!remetente_id(id, nome, cargo, foto_url, foto_avatar_path, foto_visualizacao_path, foto_updated_at, email),
          destinatario:funcionarios!destinatario_id(id, nome, cargo, foto_url, foto_avatar_path, foto_visualizacao_path, foto_updated_at, email)
        `)
        .single()

      if (error) throw error

      toast.success('Mensagem enviada!')

      if (inserted && isMounted.current) {
        setAllMessages((prev) => [...prev, inserted])
      }

      setActiveContactId(formDestinatarioId)
      setFormDestinatarioId('')
      setFormAssunto('')
      setFormConteudo('')
      setFormAnexoUrl(null)
      setFormAnexoNome(null)
      setActiveTab('chat')
    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error)
      toast.error('Erro ao enviar mensagem.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Destinatários filtrados na busca do autocomplete ao escrever
  const filteredDestinatarios = useMemo(() => {
    if (!composeSearchQuery.trim()) return destinatarios
    const term = composeSearchQuery.toLowerCase()
    return destinatarios.filter(
      (d) =>
        d.nome.toLowerCase().includes(term) ||
        (d.cargo || '').toLowerCase().includes(term)
    )
  }, [destinatarios, composeSearchQuery])

  // Filtragem da lista de conversas estilo WhatsApp
  const filteredConversations = useMemo(() => {
    if (!contactSearchQuery.trim()) return conversationsMap
    const term = contactSearchQuery.toLowerCase()
    return conversationsMap.filter(
      (c) =>
        c.contactName.toLowerCase().includes(term) ||
        (c.contactCargo || '').toLowerCase().includes(term) ||
        c.lastMessage.conteudo.toLowerCase().includes(term)
    )
  }, [conversationsMap, contactSearchQuery])

  const totalUnreadAll = allMessages.filter((m) => m.destinatario_id === funcionario?.id && !m.lida).length

  return (
    <StandardDialog
      open={open}
      onOpenChange={(val) => {
        if (onOpenChange) onOpenChange(val)
      }}
      title="Central de Mensagens & Chat"
      description="Comunicação interna em tempo real entre servidores e unidades da rede municipal"
      maxWidth="sm:max-w-4xl"
    >
      <div className="flex flex-col h-[580px] max-h-[82vh] text-foreground">
        {/* Navigation Header Tabs */}
        <div className="flex items-center justify-between border-b border-borderCustom pb-3 gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-surface-2 p-1 rounded-xl border border-borderCustom">
            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'chat'
                  ? 'bg-[#0067c0] dark:bg-sky-600 text-white shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-hoverCustom'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Chat</span>
              {totalUnreadAll > 0 && (
                <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {totalUnreadAll}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('compose')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'compose'
                  ? 'bg-[#0067c0] dark:bg-sky-600 text-white shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-hoverCustom'
              }`}
            >
              <PenSquare className="w-4 h-4" />
              <span>Nova Mensagem</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('inbox')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'inbox'
                  ? 'bg-[#0067c0] dark:bg-sky-600 text-white shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-hoverCustom'
              }`}
            >
              <Inbox className="w-4 h-4" />
              <span>Recebidas</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('sent')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'sent'
                  ? 'bg-[#0067c0] dark:bg-sky-600 text-white shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-hoverCustom'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>Enviadas</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground font-medium">
            <Sparkles className="w-3.5 h-3.5 text-[#0067c0] dark:text-sky-400" />
            <span>Tempo Real Ativo</span>
          </div>
        </div>

        {/* ── TAB 1: CHAT ESTILO WHATSAPP ── */}
        {activeTab === 'chat' && (
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-0 border border-borderCustom rounded-2xl overflow-hidden mt-3 bg-surface-2">
            {/* Esquerda: Lista de Conversas / Contatos */}
            <div className="md:col-span-1 border-r border-borderCustom flex flex-col bg-surface-1 overflow-hidden">
              {/* Search Bar */}
              <div className="p-3 border-b border-borderCustom">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Buscar conversa ou contato..."
                    value={contactSearchQuery}
                    onChange={(e) => setContactSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-xs bg-input border-borderCustom text-foreground rounded-xl placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              {/* Lista de Contatos com Conversas */}
              <div className="flex-1 overflow-y-auto divide-y divide-borderCustom">
                {isLoading ? (
                  <div className="flex items-center justify-center py-10 text-xs text-muted-foreground gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#0067c0] dark:text-sky-400" />
                    <span>Carregando conversas...</span>
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground space-y-2">
                    <MessageSquare className="w-8 h-8 mx-auto opacity-40 text-[#0067c0] dark:text-sky-400" />
                    <p>Nenhuma conversa iniciada ainda.</p>
                    <Button
                      size="sm"
                      onClick={() => setActiveTab('compose')}
                      className="bg-[#0067c0]/10 text-[#0067c0] dark:bg-sky-600/20 dark:text-sky-400 border border-[#0067c0]/30 dark:border-sky-500/30 hover:bg-[#0067c0]/20 text-xs h-7 mt-1 font-semibold cursor-pointer"
                    >
                      <PenSquare className="w-3 h-3 mr-1" /> Iniciar Conversa
                    </Button>
                  </div>
                ) : (
                  filteredConversations.map((conv) => {
                    const isSelected = (activeContactId || conversationsMap[0]?.contactId) === conv.contactId
                    const isLastSentByMe = conv.lastMessage.remetente_id === funcionario?.id

                    return (
                      <div
                        key={conv.contactId}
                        onClick={() => setActiveContactId(conv.contactId)}
                        className={`p-3 flex items-center gap-3 cursor-pointer transition-all duration-150 relative ${
                          isSelected ? 'bg-sky-50 dark:bg-sky-950/30 border-l-4 border-l-[#0067c0] dark:border-l-sky-500' : 'hover:bg-surface-2'
                        }`}
                      >
                        {/* Avatar */}
                        <div className="relative shrink-0">
                          {conv.contactFotoUrl ? (
                            <div className="w-10 h-10 rounded-full shrink-0 overflow-hidden shadow-sm border border-[#333]">
                              <CachedImage
                                src={conv.contactFotoUrl}
                                alt={conv.contactName}
                                className="w-full h-full"
                                updatedAt={conv.contactFotoUpdatedAt}
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-600 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
                              {conv.contactName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          {conv.unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center border border-[#141416]">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <h4 className="text-xs font-bold text-white truncate">{conv.contactName}</h4>
                            <span className="text-[10px] text-muted-foreground shrink-0 ml-1">
                              {new Date(conv.lastMessage.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 mt-0.5">
                            {isLastSentByMe && (
                              <span className="shrink-0">
                                {conv.lastMessage.lida ? (
                                  <CheckCheck className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Check className="w-3 h-3 text-muted-foreground" />
                                )}
                              </span>
                            )}
                            <p className="text-[11px] text-muted-foreground truncate leading-tight">
                              {conv.lastMessage.conteudo}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Direita: Janela de Chat Ativo (WhatsApp Style) */}
            <div className="md:col-span-2 flex flex-col h-full bg-background relative overflow-hidden">
              {activeConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="p-3 bg-background border-b border-border flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                      {activeConversation.contactFotoUrl ? (
                        <div className="w-9 h-9 rounded-full overflow-hidden shadow-sm border border-[#333]">
                          <CachedImage
                            src={activeConversation.contactFotoUrl}
                            alt={activeConversation.contactName}
                            className="w-full h-full"
                            updatedAt={activeConversation.contactFotoUpdatedAt}
                          />
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-600 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
                          {activeConversation.contactName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h3 className="text-xs font-bold text-white leading-tight">{activeConversation.contactName}</h3>
                        <p className="text-[10px] text-sky-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-mutedmerald-400 animate-ping inline-block" />
                          <span>{activeConversation.contactCargo || 'Servidor Municipal'}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Chat Stream (Bolhas de Mensagem) */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[radial-gradient(#18181c_1px,transparent_1px)] [background-size:16px_16px]">
                    {activeConversation.messages.map((msg) => {
                      const isMe = msg.remetente_id === funcionario?.id

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
                        >
                          <div
                            className={`max-w-[80%] rounded-2xl px-4 py-2.5 shadow-md relative text-xs leading-relaxed ${
                              isMe
                                ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white rounded-tr-none'
                                : 'bg-background border border-[#2c2c32] text-slate-100 rounded-tl-none'
                            }`}
                          >
                            {msg.assunto && msg.assunto !== 'Chat Direto' && (
                              <div className="text-[10px] font-extrabold tracking-wider uppercase mb-1 opacity-70 border-b border-white/10 pb-0.5">
                                {msg.assunto}
                              </div>
                            )}

                            <p className="whitespace-pre-wrap break-words">{msg.conteudo}</p>

                            {msg.anexo_url && (
                              <a
                                href={msg.anexo_url}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-2 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/20 hover:bg-black/40 text-[11px] font-medium underline text-white transition-colors"
                              >
                                <Paperclip className="w-3 h-3 shrink-0" />
                                <span className="truncate">{msg.anexo_nome || 'Anexo'}</span>
                              </a>
                            )}

                            <div className={`flex items-center justify-end gap-1 text-[9px] mt-1 ${isMe ? 'text-sky-100/70' : 'text-muted-foreground'}`}>
                              <span>
                                {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {isMe && (
                                <span>
                                  {msg.lida ? (
                                    <span title={`Lida em ${new Date(msg.lida_em!).toLocaleString('pt-BR')}`}>
                                      <CheckCheck className="w-3 h-3 text-emerald-300" />
                                    </span>
                                  ) : (
                                    <span title="Entregue">
                                      <Check className="w-3 h-3 text-white/60" />
                                    </span>
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Attachment Preview (if selected) */}
                  {chatAnexoNome && (
                    <div className="px-4 py-1.5 bg-background border-t border-border flex items-center justify-between text-xs text-sky-400">
                      <div className="flex items-center gap-1.5 truncate">
                        <Paperclip className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate font-medium">{chatAnexoNome}</span>
                      </div>
                      <button
                        onClick={() => { setChatAnexoUrl(null); setChatAnexoNome(null); }}
                        className="text-rose-400 hover:text-rose-300 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Chat Quick Input (Rodapé de Envio Imediato) */}
                  <form onSubmit={handleSendChatQuick} className="p-3 bg-background border-t border-border flex items-center gap-2 shrink-0">
                    <label className="p-2 rounded-xl bg-[#1f1f23] hover:bg-muted text-muted-foreground hover:text-white cursor-pointer transition-colors shrink-0">
                      <Paperclip className="w-4 h-4" />
                      <input
                        type="file"
                        onChange={(e) => handleFileUpload(e, true)}
                        className="hidden"
                        accept="image/*,.pdf,.doc,.docx"
                      />
                    </label>

                    <Input
                      type="text"
                      placeholder="Digite uma mensagem..."
                      value={chatInputText}
                      onChange={(e) => setChatInputText(e.target.value)}
                      className="flex-1 h-10 bg-background border-border text-foreground text-xs rounded-xl focus-visible:ring-sky-500 placeholder:text-[#666]"
                    />

                    <Button
                      type="submit"
                      disabled={isSubmitting || (!chatInputText.trim() && !chatAnexoUrl)}
                      className="h-10 px-4 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer shrink-0"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Enviar</span>
                        </>
                      )}
                    </Button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground space-y-3">
                  <MessageSquare className="w-12 h-12 text-sky-500/30" />
                  <h3 className="text-sm font-bold text-white">Nenhuma Conversa Selecionada</h3>
                  <p className="text-xs max-w-xs text-muted-foreground">
                    Selecione um contato na barra lateral ou inicie uma nova mensagem para conversar.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => setActiveTab('compose')}
                    className="bg-sky-600 text-white text-xs rounded-xl h-9 px-4"
                  >
                    <PenSquare className="w-3.5 h-3.5 mr-1.5" /> Nova Mensagem
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 2: COMPOSE (NOVA MENSAGEM COM BUSCA INTELIGENTE DE CONTATOS) ── */}
        {activeTab === 'compose' && (
          <form onSubmit={handleSendMessageForm} className="flex-1 overflow-y-auto space-y-4 pt-3 pr-1">
            {/* Campo de Busca / Seleção do Destinatário */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#ccc] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-sky-400" />
                <span>Destinatário</span>
                <span className="text-rose-400">*</span>
              </label>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Digite o nome ou cargo para buscar destinatário..."
                  value={composeSearchQuery}
                  onChange={(e) => setComposeSearchQuery(e.target.value)}
                  className="pl-9 h-10 bg-background border-border text-foreground text-xs rounded-xl focus-visible:ring-sky-500"
                />
              </div>

              {/* Lista filtrada de contatos */}
              <div className="max-h-40 overflow-y-auto bg-background border border-border rounded-xl divide-y divide-[#202024] shadow-inner">
                {filteredDestinatarios.length === 0 ? (
                  <div className="p-3 text-center text-xs text-muted-foreground">Nenhum servidor encontrado.</div>
                ) : (
                  filteredDestinatarios.map((dest) => {
                    const isSelected = formDestinatarioId === dest.id
                    return (
                      <div
                        key={dest.id}
                        onClick={() => {
                          setFormDestinatarioId(dest.id)
                          setComposeSearchQuery(dest.nome)
                        }}
                        className={`p-2.5 flex items-center justify-between cursor-pointer text-xs transition-colors ${
                          isSelected ? 'bg-sky-500/20 text-white font-bold' : 'hover:bg-background text-[#ccc]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {getAvatarUrl(dest as any) ? (
                            <div className="w-7 h-7 rounded-full overflow-hidden shrink-0">
                              <CachedImage
                                src={getAvatarUrl(dest as any)}
                                alt={dest.nome}
                                className="w-full h-full"
                                updatedAt={dest.foto_updated_at}
                              />
                            </div>
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-sky-600/30 text-sky-400 flex items-center justify-center font-bold text-[11px] shrink-0">
                              {dest.nome.charAt(0)}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-white">{dest.nome}</div>
                            {dest.cargo && <div className="text-[10px] text-muted-foreground">{dest.cargo}</div>}
                          </div>
                        </div>

                        {isSelected && <Check className="w-4 h-4 text-sky-400" />}
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Assunto */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#ccc]">Assunto</label>
              <Input
                type="text"
                placeholder="Ex: Alinhamento de diário pedagógico / Comunicado"
                value={formAssunto}
                onChange={(e) => setFormAssunto(e.target.value)}
                className="h-10 bg-background border-border text-foreground text-xs rounded-xl"
              />
            </div>

            {/* Mensagem */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#ccc]">
                Mensagem <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={5}
                placeholder="Escreva o conteúdo da mensagem..."
                value={formConteudo}
                onChange={(e) => setFormConteudo(e.target.value)}
                className="w-full bg-background border border-border rounded-xl p-3 text-xs text-foreground outline-none focus:border-sky-500 resize-none leading-relaxed"
              />
            </div>

            {/* Anexo */}
            <div className="flex items-center justify-between gap-3 p-3 bg-background rounded-xl border border-border">
              <div className="flex items-center gap-2 min-w-0">
                <Paperclip className="w-4 h-4 text-muted-foreground shrink-0" />
                {formAnexoNome ? (
                  <span className="text-xs font-medium text-sky-400 truncate">{formAnexoNome}</span>
                ) : (
                  <span className="text-xs text-muted-foreground">Anexar documento (PDF ou imagem até 10MB)</span>
                )}
              </div>

              <label className="px-3 py-1.5 rounded-lg bg-[#1f1f23] hover:bg-muted text-white text-xs font-semibold cursor-pointer shrink-0 transition-colors">
                {isUploading ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...
                  </span>
                ) : formAnexoNome ? (
                  'Trocar Arquivo'
                ) : (
                  'Selecionar Arquivo'
                )}
                <input type="file" onChange={(e) => handleFileUpload(e, false)} className="hidden" accept="image/*,.pdf,.doc,.docx" />
              </label>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setActiveTab('chat')}
                className="text-xs h-9 text-muted-foreground hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !formDestinatarioId || !formConteudo.trim()}
                className="bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs h-9 px-5 gap-1.5 rounded-xl cursor-pointer"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Enviar Mensagem</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        )}

        {/* ── TAB 3: RECEBIDAS (LISTA TABULAR DE ENTRADA) ── */}
        {activeTab === 'inbox' && (
          <div className="flex-1 overflow-y-auto space-y-2 pt-3">
            {allMessages.filter(m => m.destinatario_id === funcionario?.id).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-2">
                <Mail className="w-10 h-10 opacity-30 text-sky-400" />
                <p className="text-sm font-semibold text-white">Nenhuma mensagem recebida</p>
                <p className="text-xs max-w-xs text-muted-foreground">Sua caixa de entrada está limpa.</p>
              </div>
            ) : (
              allMessages
                .filter(m => m.destinatario_id === funcionario?.id)
                .reverse()
                .map((msg) => (
                  <div
                    key={msg.id}
                    onClick={() => {
                      setActiveContactId(msg.remetente_id)
                      setActiveTab('chat')
                    }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                      !msg.lida ? 'bg-sky-500/10 border-sky-500/30' : 'bg-background border-border hover:bg-background'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-sky-600/30 text-sky-400 flex items-center justify-center font-bold text-xs shrink-0">
                      {(msg.remetente?.nome || 'S').charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h4 className="text-xs font-bold text-white truncate">{msg.remetente?.nome || 'Servidor'}</h4>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(msg.created_at).toLocaleDateString('pt-BR')} {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-sky-400 truncate">{msg.assunto}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{msg.conteudo}</p>
                    </div>
                  </div>
                ))
            )}
          </div>
        )}

        {/* ── TAB 4: ENVIADAS (LISTA TABULAR DE ENVIADAS) ── */}
        {activeTab === 'sent' && (
          <div className="flex-1 overflow-y-auto space-y-2 pt-3">
            {allMessages.filter(m => m.remetente_id === funcionario?.id).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-2">
                <Send className="w-10 h-10 opacity-30 text-sky-400" />
                <p className="text-sm font-semibold text-white">Nenhuma mensagem enviada</p>
              </div>
            ) : (
              allMessages
                .filter(m => m.remetente_id === funcionario?.id)
                .reverse()
                .map((msg) => (
                  <div
                    key={msg.id}
                    onClick={() => {
                      setActiveContactId(msg.destinatario_id)
                      setActiveTab('chat')
                    }}
                    className="p-3.5 rounded-xl border border-border bg-background hover:bg-background transition-all cursor-pointer flex items-start gap-3"
                  >
                    <div className="w-9 h-9 rounded-full bg-purple-600/30 text-purple-400 flex items-center justify-center font-bold text-xs shrink-0">
                      {(msg.destinatario?.nome || 'D').charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h4 className="text-xs font-bold text-white truncate">Para: {msg.destinatario?.nome || 'Servidor'}</h4>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(msg.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{msg.conteudo}</p>
                    </div>
                  </div>
                ))
            )}
          </div>
        )}
      </div>
    </StandardDialog>
  )
}
