'use client'

import { useState, useRef, useEffect } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import {
  Paperclip,
  X,
  Loader2,
  Sparkles,
  Globe,
  School,
  Building,
  Search,
  CheckSquare,
  Square,
  Clock,
  Send,
  Bold,
  Italic,
  List,
  Link2,
  AlertCircle,
  Users,
  CalendarDays,
  ClipboardList,
  Megaphone,
  Timer,
} from 'lucide-react'
import { getHojeBrasilia } from '@/lib/dateUtils'

interface ModalEditarComunicadoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  comunicado: any
  listaEscolas: { id: string; nome: string }[]
  isNivel1OuSuperadmin: boolean
  selectedEscola: any
  onSuccess: () => void
}

export function ModalEditarComunicado({
  open,
  onOpenChange,
  comunicado,
  listaEscolas,
  isNivel1OuSuperadmin,
  selectedEscola,
  onSuccess,
}: ModalEditarComunicadoProps) {
  const [titulo, setTitulo] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [categoria, setCategoria] = useState('geral')
  const [alvo, setAlvo] = useState('Selecione o Público Alvo')
  const [isPopup, setIsPopup] = useState(false)
  const [leituraObrigatoria, setLeituraObrigatoria] = useState(false)
  const [duracaoOpcao, setDuracaoOpcao] = useState<
    '24h' | '48h' | '3d' | '7d' | '15d' | '30d' | 'fim_ano' | 'personalizado' | 'manter' | ''
  >('')
  const [dataExpiracaoPersonalizada, setDataExpiracaoPersonalizada] = useState('')
  const [expiraEmExistente, setExpiraEmExistente] = useState<string | null>(null)
  const [todaARede, setTodaARede] = useState(true)
  const [unidadesSelecionadas, setUnidadesSelecionadas] = useState<string[]>([])
  const [buscaUnidade, setBuscaUnidade] = useState('')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [anexoUrlExistente, setAnexoUrlExistente] = useState<string | null>(null)
  const [anexoNomeExistente, setAnexoNomeExistente] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  // Agendamento
  const [isAgendado, setIsAgendado] = useState(false)
  const [dataAgendamento, setDataAgendamento] = useState(() => getHojeBrasilia())
  const [horaAgendamento, setHoraAgendamento] = useState('07:00')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Helper de cálculo de expiração com base na duração escolhida
  const calcularExpiraEm = (
    baseDateIso: string,
    opcao: string,
    dataPersonalizada?: string
  ): string | null => {
    if (!opcao) return null
    if (opcao === 'manter' && expiraEmExistente) return expiraEmExistente

    const baseTime = new Date(baseDateIso).getTime()
    if (isNaN(baseTime)) return null

    switch (opcao) {
      case '24h':
        return new Date(baseTime + 24 * 60 * 60 * 1000).toISOString()
      case '48h':
        return new Date(baseTime + 48 * 60 * 60 * 1000).toISOString()
      case '3d':
        return new Date(baseTime + 3 * 24 * 60 * 60 * 1000).toISOString()
      case '7d':
        return new Date(baseTime + 7 * 24 * 60 * 60 * 1000).toISOString()
      case '15d':
        return new Date(baseTime + 15 * 24 * 60 * 60 * 1000).toISOString()
      case '30d':
        return new Date(baseTime + 30 * 24 * 60 * 60 * 1000).toISOString()
      case 'fim_ano': {
        const ano = new Date(baseTime).getFullYear()
        return new Date(Date.UTC(ano, 11, 31, 23, 59, 59)).toISOString()
      }
      case 'personalizado': {
        if (!dataPersonalizada) return null
        const customTime = new Date(`${dataPersonalizada}T23:59:59-03:00`).getTime()
        if (isNaN(customTime)) return null
        return new Date(customTime).toISOString()
      }
      default:
        return null
    }
  }

  useEffect(() => {
    if (open && comunicado) {
      setTitulo(comunicado.title || '')
      setMensagem(comunicado.body || '')
      setCategoria(comunicado.categoria || 'geral')
      setAlvo(comunicado.target || 'Selecione o Público Alvo')
      setIsPopup(Boolean(comunicado.is_popup))
      setLeituraObrigatoria(Boolean(comunicado.leitura_obrigatoria))
      setAnexoUrlExistente(comunicado.anexo_url || null)
      setAnexoNomeExistente(comunicado.anexo_nome || null)
      setArquivo(null)

      setExpiraEmExistente(comunicado.expira_em || null)
      if (comunicado.expira_em) {
        setDuracaoOpcao('manter')
        setDataExpiracaoPersonalizada(comunicado.expira_em.split('T')[0])
      } else {
        setDuracaoOpcao('')
        setDataExpiracaoPersonalizada('')
      }

      if (!comunicado.escola_ids || comunicado.escola_ids.length === 0) {
        setTodaARede(true)
        setUnidadesSelecionadas([])
      } else {
        setTodaARede(false)
        setUnidadesSelecionadas(comunicado.escola_ids)
      }

      if (comunicado.status === 'agendado') {
        setIsAgendado(true)
        if (comunicado.scheduled_for) {
          const d = new Date(comunicado.scheduled_for)
          setDataAgendamento(d.toISOString().split('T')[0])
          const hh = String(d.getHours()).padStart(2, '0')
          const mm = String(d.getMinutes()).padStart(2, '0')
          setHoraAgendamento(`${hh}:${mm}`)
        }
      } else {
        setIsAgendado(false)
      }
    }
  }, [open, comunicado])

  // Helper de formatação rápida no textarea
  const aplicarFormatacao = (tipo: 'bold' | 'italic' | 'list' | 'link') => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const textoSel = mensagem.substring(start, end)

    let novoTexto = ''
    let cursorOffset = 0

    switch (tipo) {
      case 'bold':
        novoTexto = `**${textoSel || 'texto em negrito'}**`
        cursorOffset = textoSel ? novoTexto.length : 2
        break
      case 'italic':
        novoTexto = `*${textoSel || 'texto em itálico'}*`
        cursorOffset = textoSel ? novoTexto.length : 1
        break
      case 'list':
        novoTexto = `\n• ${textoSel || 'item da lista'}`
        cursorOffset = novoTexto.length
        break
      case 'link':
        novoTexto = `[${textoSel || 'link'}](https://)`
        cursorOffset = novoTexto.length - 1
        break
    }

    const mensagemAtualizada = mensagem.substring(0, start) + novoTexto + mensagem.substring(end)
    setMensagem(mensagemAtualizada)

    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + cursorOffset, start + cursorOffset)
    }, 0)
  }

  const handleSalvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!comunicado) return

    if (!titulo.trim()) {
      toast.error('Informe o título do comunicado.')
      return
    }
    if (!mensagem.trim()) {
      toast.error('Escreva o conteúdo do comunicado.')
      return
    }

    // Validação de escolas
    let escolaIdsPayload: string[] | null = null
    if (isNivel1OuSuperadmin) {
      if (todaARede) {
        escolaIdsPayload = null
      } else {
        if (unidadesSelecionadas.length === 0) {
          toast.error('Selecione ao menos uma unidade escolar de destino ou marque "Toda a Rede".')
          return
        }
        escolaIdsPayload = unidadesSelecionadas
      }
    } else {
      if (!selectedEscola?.id) {
        toast.error('Nenhuma unidade escolar ativa selecionada.')
        return
      }
      escolaIdsPayload = [selectedEscola.id]
    }

    // Validação de Agendamento se aplicável
    let scheduledForIso: string | null = comunicado.scheduled_for
    let dataReferencia = comunicado.date || getHojeBrasilia()

    if (comunicado.status === 'agendado') {
      if (isAgendado) {
        const scheduledTimestamp = new Date(`${dataAgendamento}T${horaAgendamento}:00-03:00`).getTime()
        if (isNaN(scheduledTimestamp)) {
          toast.error('Data ou horário de agendamento inválidos.')
          return
        }
        if (scheduledTimestamp <= Date.now()) {
          toast.error('O horário de agendamento deve ser futuro.')
          return
        }
        scheduledForIso = new Date(scheduledTimestamp).toISOString()
        dataReferencia = dataAgendamento
      }
    }

    // Validação de Duração Obrigatória (Opção 2)
    if (!duracaoOpcao) {
      toast.error('É obrigatório selecionar o tempo de duração / validade do comunicado.')
      return
    }

    if (duracaoOpcao === 'personalizado' && !dataExpiracaoPersonalizada) {
      toast.error('Informe a data limite de expiração personalizada.')
      return
    }

    const baseParaCalculo = scheduledForIso || comunicado.created_at || new Date().toISOString()
    const expiraEmIso = calcularExpiraEm(baseParaCalculo, duracaoOpcao, dataExpiracaoPersonalizada)

    if (!expiraEmIso) {
      toast.error('Data de expiração inválida. Selecione um prazo válido.')
      return
    }

    setSalvando(true)
    const supabase = createClient()

    let anexoUrl = anexoUrlExistente
    let anexoNome = anexoNomeExistente

    if (arquivo) {
      try {
        const fileExt = arquivo.name.split('.').pop()
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
        const filePath = `comunicados/${fileName}`

        const { error: uploadError } = await supabase.storage.from('anexos').upload(filePath, arquivo)

        if (uploadError) {
          toast.error('Erro ao fazer upload do arquivo: ' + uploadError.message)
          setSalvando(false)
          return
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from('anexos').getPublicUrl(filePath)

        anexoUrl = publicUrl
        anexoNome = arquivo.name
      } catch (err: any) {
        toast.error('Falha ao processar anexo: ' + err.message)
        setSalvando(false)
        return
      }
    }

    const targetPayload = alvo === 'Selecione o Público Alvo' ? 'Geral / Toda a Rede' : alvo

    const updatePayload: any = {
      title: titulo.trim(),
      body: mensagem.trim(),
      categoria,
      target: targetPayload,
      is_popup: isPopup,
      leitura_obrigatoria: leituraObrigatoria,
      expira_em: expiraEmIso,
      escola_ids: escolaIdsPayload,
      anexo_url: anexoUrl,
      anexo_nome: anexoNome,
      date: dataReferencia,
    }

    if (comunicado.status === 'agendado') {
      updatePayload.scheduled_for = scheduledForIso
    }

    const { error } = await (supabase.from('comunicados') as any)
      .update(updatePayload)
      .eq('id', comunicado.id)

    if (error) {
      toast.error('Erro ao atualizar comunicado: ' + error.message)
    } else {
      toast.success('Comunicado atualizado com sucesso!')
      onOpenChange(false)
      onSuccess()
    }
    setSalvando(false)
  }

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Editar Comunicado"
      description="Atualize as informações, público-alvo ou programação do comunicado."
      maxWidth="sm:max-w-2xl"
    >
      <form onSubmit={handleSalvarEdicao} className="space-y-4 pt-2">
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Título</label>
          <Input
            type="text"
            placeholder="Título do comunicado"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className="bg-input border-borderCustom text-foreground"
          />
        </div>

        {/* Categoria */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">
              Categoria / Classificação
            </label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full bg-input border border-borderCustom text-foreground h-10 rounded-md px-3 text-xs focus:outline-none focus:ring-1 focus:ring-highlight cursor-pointer"
            >
              <option value="geral">📢 Geral</option>
              <option value="urgente">🔴 Urgente</option>
              <option value="reuniao">👥 Reunião</option>
              <option value="calendario">📅 Calendário</option>
              <option value="administrativo">📋 Administrativo</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Público Alvo</label>
            <select
              value={alvo}
              onChange={(e) => setAlvo(e.target.value)}
              className="w-full bg-input border border-borderCustom text-foreground h-10 rounded-md px-3 text-xs focus:outline-none focus:ring-1 focus:ring-highlight cursor-pointer"
            >
              <option value="Selecione o Público Alvo">Selecione o Público Alvo</option>
              <option value="Professores">Professores</option>
              <option value="Alunos e Pais">Alunos e Pais</option>
              <option value="Equipe Administrativa">Equipe Administrativa</option>
              <option value="Equipe de Cozinha / Limpeza">Equipe de Cozinha / Limpeza</option>
            </select>
          </div>
        </div>

        {/* Duração / Validade Obrigatória do Comunicado (Opção 2) */}
        <div className="space-y-3 p-3.5 bg-input/40 border border-amber-500/30 rounded-xl">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Timer className="w-3.5 h-3.5 text-amber-500" />
              <span>Tempo de Duração / Validade</span>
              <span className="text-amber-500 font-extrabold">*</span>
            </label>
            <span className="text-[10px] font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/25">
              Obrigatório
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Defina por quanto tempo este comunicado permanecerá ativo no sistema e na janela de pop-up:
          </p>

          {/* Grid de Opções Rápidas de Vigência */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              ...(expiraEmExistente
                ? [{ id: 'manter', label: 'Manter Atual', sub: new Date(expiraEmExistente).toLocaleDateString('pt-BR') }]
                : []),
              { id: '24h', label: '24 Horas', sub: '1 dia' },
              { id: '48h', label: '48 Horas', sub: '2 dias' },
              { id: '3d', label: '3 Dias', sub: '72 horas' },
              { id: '7d', label: '7 Dias', sub: '1 semana' },
              { id: '15d', label: '15 Dias', sub: '2 semanas' },
              { id: '30d', label: '30 Dias', sub: '1 mês' },
              { id: 'fim_ano', label: 'Fim do Ano', sub: 'Até 31/12' },
              { id: 'personalizado', label: 'Personalizado', sub: 'Data limite' },
            ].map((opt) => {
              const isSelected = duracaoOpcao === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDuracaoOpcao(opt.id as any)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-500 text-amber-600 dark:text-amber-300 font-bold ring-1 ring-amber-500/40 shadow-sm'
                      : 'bg-input/60 border-borderCustom text-muted-foreground hover:text-foreground hover:bg-hoverCustom'
                  }`}
                >
                  <span className="text-xs">{opt.label}</span>
                  <span className="text-[10px] opacity-75">{opt.sub}</span>
                </button>
              )
            })}
          </div>

          {duracaoOpcao === 'personalizado' && (
            <div className="mt-2.5 p-2.5 bg-background/60 border border-borderCustom rounded-lg animate-in fade-in duration-200">
              <label className="text-[11px] font-semibold text-foreground block mb-1">
                Data Limite de Expiração (Inclusive)
              </label>
              <Input
                type="date"
                min={getHojeBrasilia()}
                value={dataExpiracaoPersonalizada}
                onChange={(e) => setDataExpiracaoPersonalizada(e.target.value)}
                className="h-9 text-xs bg-input border-borderCustom text-foreground focus-visible:ring-amber-500/40"
              />
            </div>
          )}
        </div>

        {/* Modalidades Pop-up e Leitura Obrigatória */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setIsPopup((prev) => !prev)}
            className={`flex items-center justify-between p-3 rounded-xl border text-xs transition-all cursor-pointer ${
              isPopup
                ? 'border-amber-500/40 bg-amber-500/10 text-foreground ring-1 ring-amber-500/30'
                : 'border-borderCustom bg-input/40 text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sparkles className={`w-4 h-4 ${isPopup ? 'text-amber-400' : 'text-muted-foreground'}`} />
              <span className="font-semibold">Pop-up no Login</span>
            </div>
            <div
              className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] ${
                isPopup ? 'border-amber-500 bg-amber-500 text-black font-bold' : 'border-borderCustom'
              }`}
            >
              {isPopup ? '✓' : ''}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setLeituraObrigatoria((prev) => !prev)}
            className={`flex items-center justify-between p-3 rounded-xl border text-xs transition-all cursor-pointer ${
              leituraObrigatoria
                ? 'border-rose-500/40 bg-rose-500/10 text-foreground ring-1 ring-rose-500/30'
                : 'border-borderCustom bg-input/40 text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertCircle
                className={`w-4 h-4 ${leituraObrigatoria ? 'text-rose-400' : 'text-muted-foreground'}`}
              />
              <span className="font-semibold">Leitura Obrigatória</span>
            </div>
            <div
              className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] ${
                leituraObrigatoria ? 'border-rose-500 bg-rose-500 text-white font-bold' : 'border-borderCustom'
              }`}
            >
              {leituraObrigatoria ? '✓' : ''}
            </div>
          </button>
        </div>

        {/* Unidades Escolares */}
        {isNivel1OuSuperadmin && (
          <div className="space-y-2 p-3 bg-input/30 border border-borderCustom rounded-xl text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-highlight" />
                Destino
              </span>
              <span className="text-highlight font-medium">
                {todaARede ? 'Toda a rede municipal' : `${unidadesSelecionadas.length} unidade(s)`}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setTodaARede(true)
                  setUnidadesSelecionadas([])
                }}
                className={`p-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                  todaARede
                    ? 'bg-highlight/15 border-highlight text-highlight'
                    : 'bg-input/50 border-borderCustom text-muted-foreground'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Toda a Rede</span>
              </button>

              <button
                type="button"
                onClick={() => setTodaARede(false)}
                className={`p-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                  !todaARede
                    ? 'bg-highlight/15 border-highlight text-highlight'
                    : 'bg-input/50 border-borderCustom text-muted-foreground'
                }`}
              >
                <School className="w-3.5 h-3.5" />
                <span>Selecionar Unidades</span>
              </button>
            </div>

            {!todaARede && (
              <div className="space-y-2 pt-2 border-t border-borderCustom/60">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Buscar unidade..."
                    value={buscaUnidade}
                    onChange={(e) => setBuscaUnidade(e.target.value)}
                    className="h-8 pl-8 text-xs bg-input border-borderCustom text-foreground"
                  />
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1 p-1.5 bg-input/40 border border-borderCustom rounded-lg">
                  {listaEscolas
                    .filter((esc) => esc.nome.toLowerCase().includes(buscaUnidade.toLowerCase()))
                    .map((esc) => {
                      const isSelected = unidadesSelecionadas.includes(esc.id)
                      return (
                        <button
                          type="button"
                          key={esc.id}
                          onClick={() => {
                            if (isSelected) {
                              setUnidadesSelecionadas((prev) => prev.filter((id) => id !== esc.id))
                            } else {
                              setUnidadesSelecionadas((prev) => [...prev, esc.id])
                            }
                          }}
                          className={`w-full flex items-center justify-between p-1.5 rounded-md text-xs transition-colors text-left cursor-pointer ${
                            isSelected
                              ? 'bg-highlight/10 text-foreground font-medium'
                              : 'text-muted-foreground hover:bg-hoverCustom'
                          }`}
                        >
                          <span className="truncate pr-2">{esc.nome}</span>
                          {isSelected ? (
                            <CheckSquare className="w-3.5 h-3.5 text-highlight shrink-0" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                          )}
                        </button>
                      )
                    })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Conteúdo com Barra de Ferramentas de Formatação Rápida */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Conteúdo</label>
            <div className="flex items-center gap-1 bg-input/60 p-0.5 rounded-lg border border-borderCustom">
              <button
                type="button"
                onClick={() => aplicarFormatacao('bold')}
                className="p-1 hover:bg-hoverCustom text-muted-foreground hover:text-foreground rounded cursor-pointer"
                title="Negrito (**texto**)"
              >
                <Bold className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => aplicarFormatacao('italic')}
                className="p-1 hover:bg-hoverCustom text-muted-foreground hover:text-foreground rounded cursor-pointer"
                title="Itálico (*texto*)"
              >
                <Italic className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => aplicarFormatacao('list')}
                className="p-1 hover:bg-hoverCustom text-muted-foreground hover:text-foreground rounded cursor-pointer"
                title="Lista de itens"
              >
                <List className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => aplicarFormatacao('link')}
                className="p-1 hover:bg-hoverCustom text-muted-foreground hover:text-foreground rounded cursor-pointer"
                title="Link"
              >
                <Link2 className="w-3 h-3" />
              </button>
            </div>
          </div>
          <textarea
            ref={textareaRef}
            rows={4}
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            placeholder="Escreva a mensagem do comunicado aqui..."
            className="w-full resize-none rounded-lg border border-borderCustom bg-input p-3 text-sm text-foreground outline-none focus:border-highlight placeholder:text-muted-foreground"
          />
        </div>

        {/* Anexo */}
        <div className="space-y-2 pt-1">
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0]
                if (file.size > 10 * 1024 * 1024) {
                  toast.error('O arquivo deve ter no máximo 10MB.')
                  return
                }
                setArquivo(file)
                setAnexoUrlExistente(null)
                setAnexoNomeExistente(file.name)
              }
            }}
            className="hidden"
          />

          {(arquivo || anexoNomeExistente) && (
            <div className="flex items-center gap-2 text-xs bg-highlight/10 text-highlight px-3 py-1.5 rounded-lg border border-highlight/20 max-w-xs truncate">
              <Paperclip className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{arquivo ? arquivo.name : anexoNomeExistente}</span>
              <button
                type="button"
                onClick={() => {
                  setArquivo(null)
                  setAnexoUrlExistente(null)
                  setAnexoNomeExistente(null)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
                className="ml-auto p-0.5 rounded-full hover:bg-highlight/20 text-highlight cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="border-borderCustom bg-hoverCustom text-foreground cursor-pointer text-xs"
          >
            <Paperclip className="mr-1.5 h-3.5 w-3.5" />
            {arquivo || anexoNomeExistente ? 'Substituir Anexo' : 'Anexar Arquivo'}
          </Button>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-borderCustom">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-borderCustom text-muted-foreground hover:text-foreground cursor-pointer text-xs"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={salvando}
            className="bg-highlight text-background hover:bg-highlight/90 font-bold cursor-pointer text-xs gap-1.5"
          >
            {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>Salvar Alterações</span>
          </Button>
        </div>
      </form>
    </StandardDialog>
  )
}
