'use client'

import { useMemo, useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { Bell, CalendarDays, ChevronLeft, ChevronRight, Paperclip, Pin, Send, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/store/useAuthStore'
import { toast } from 'sonner'

export default function MuralPage() {
  const { funcionario } = useAuthStore()
  const [selectedDate, setSelectedDate] = useState('')
  const [showComposer, setShowComposer] = useState(false)
  const [notices, setNotices] = useState<any[]>([])
  const [birthdays, setBirthdays] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Form states
  const [titulo, setTitulo] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [alvo, setAlvo] = useState('Geral / Toda a Rede')
  const [salvando, setSalvando] = useState(false)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchNotices = async () => {
    const supabase = createClient()
    const { data } = await (supabase.from as any)('comunicados')
      .select('*')
      .order('date', { ascending: false })

    if (data) {
      setNotices(data)
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()
      setLoading(true)

      const [comunicadosRes, funcRes, alunosRes] = await Promise.all([
        (supabase.from as any)('comunicados').select('*').order('date', { ascending: false }),
        supabase.from('funcionarios').select('nome, cargo, data_nascimento').not('data_nascimento', 'is', null),
        supabase.from('alunos').select('nome, data_nascimento').not('data_nascimento', 'is', null)
      ])

      if (comunicadosRes.data) {
        setNotices(comunicadosRes.data)
      }

      const allBirthdays: any[] = []
      const currentMonth = new Date().getMonth()

      if (funcRes.data) {
        funcRes.data.forEach((f: any) => {
          if (!f.data_nascimento) return
          const date = new Date(f.data_nascimento + 'T00:00:00')
          if (date.getMonth() === currentMonth) {
            allBirthdays.push({ day: date.getDate(), name: f.nome, role: f.cargo || 'Funcionário' })
          }
        })
      }
      if (alunosRes.data) {
        alunosRes.data.forEach((a: any) => {
          if (!a.data_nascimento) return
          const date = new Date(a.data_nascimento + 'T00:00:00')
          if (date.getMonth() === currentMonth) {
            allBirthdays.push({ day: date.getDate(), name: a.nome, role: 'Aluno' })
          }
        })
      }

      setBirthdays(allBirthdays)
      setLoading(false)
    }

    fetchData()
  }, [])

  const filteredNotices = useMemo(() => {
    if (!selectedDate) return notices
    return notices.filter((notice) => notice.date === selectedDate)
  }, [selectedDate, notices])

  const handlePublicarComunicado = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titulo.trim()) {
      toast.error('Informe o título do comunicado.')
      return
    }
    if (!mensagem.trim()) {
      toast.error('Escreva o conteúdo do comunicado.')
      return
    }

    setSalvando(true)
    const supabase = createClient()
    const hojeStr = new Date().toISOString().split('T')[0]

    let anexoUrl = null
    let anexoNome = null

    if (arquivo) {
      try {
        const fileExt = arquivo.name.split('.').pop()
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
        const filePath = `comunicados/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('anexos')
          .upload(filePath, arquivo)

        if (uploadError) {
          toast.error('Erro ao fazer upload do arquivo: ' + uploadError.message)
          setSalvando(false)
          return
        }

        const { data: { publicUrl } } = supabase.storage
          .from('anexos')
          .getPublicUrl(filePath)

        anexoUrl = publicUrl
        anexoNome = arquivo.name
      } catch (err: any) {
        toast.error('Falha ao processar anexo: ' + err.message)
        setSalvando(false)
        return
      }
    }

    const { error } = await (supabase.from as any)('comunicados').insert({
      title: titulo.trim(),
      body: mensagem.trim(),
      date: hojeStr,
      target: alvo,
      criado_por: funcionario?.id ?? null,
      anexo_url: anexoUrl,
      anexo_nome: anexoNome
    })

    if (error) {
      toast.error('Erro ao publicar comunicado: ' + error.message)
    } else {
      toast.success('Comunicado publicado com sucesso!')
      setTitulo('')
      setMensagem('')
      setAlvo('Geral / Toda a Rede')
      setArquivo(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      setShowComposer(false)
      fetchNotices()
    }
    setSalvando(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Mural</h1>
          <p className="mt-1 text-sm text-muted-foreground">Comunicados, avisos e aniversariantes da rede.</p>
        </div>
        <Button onClick={() => setShowComposer((value) => !value)} className="bg-highlight text-background hover:bg-highlight/90 font-semibold cursor-pointer">
          <Pin className="mr-2 h-4 w-4" />
          {showComposer ? 'Cancelar' : 'Novo Comunicado'}
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {showComposer && (
            <Card className="border-borderCustom bg-card p-5 shadow-lg">
              <h2 className="mb-4 text-lg font-semibold text-white">Criar Novo Comunicado</h2>
              <form onSubmit={handlePublicarComunicado} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Título</label>
                  <Input
                    type="text"
                    placeholder="Título do comunicado (ex: Reunião Geral de Professores)"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    className="bg-input border-borderCustom text-white placeholder:text-zinc-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Público Alvo</label>
                  <select
                    value={alvo}
                    onChange={(e) => setAlvo(e.target.value)}
                    className="w-full bg-input border border-borderCustom text-white h-10 rounded-md px-3 text-sm focus:outline-none focus:ring-1 focus:ring-highlight cursor-pointer"
                  >
                    <option value="Geral / Toda a Rede">Geral / Toda a Rede</option>
                    <option value="Professores">Professores</option>
                    <option value="Alunos e Pais">Alunos e Pais</option>
                    <option value="Equipe Administrativa">Equipe Administrativa</option>
                    <option value="Equipe de Cozinha / Limpeza">Equipe de Cozinha / Limpeza</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Conteúdo</label>
                  <textarea
                    rows={4}
                    value={mensagem}
                    onChange={(e) => setMensagem(e.target.value)}
                    placeholder="Escreva a mensagem do comunicado aqui..."
                    className="w-full resize-none rounded-lg border border-borderCustom bg-input p-3 text-sm text-foregroundCustom outline-none focus:border-highlight placeholder:text-zinc-500"
                  />
                </div>

                 <div className="flex flex-col gap-3 pt-2 border-t border-borderCustom">
                  {/* Input de arquivo invisível */}
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
                        toast.success(`Arquivo "${file.name}" selecionado.`)
                      }
                    }}
                    className="hidden"
                  />

                  {arquivo && (
                    <div className="flex items-center gap-2 text-xs bg-highlight/10 text-highlight px-3 py-1.5 rounded-lg border border-highlight/20 max-w-xs truncate">
                      <Paperclip className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{arquivo.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setArquivo(null)
                          if (fileInputRef.current) {
                            fileInputRef.current.value = ''
                          }
                        }}
                        className="ml-auto p-0.5 rounded-full hover:bg-highlight/20 text-highlight cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => fileInputRef.current?.click()} 
                      className="border-borderCustom bg-hoverCustom text-foregroundCustom cursor-pointer"
                    >
                      <Paperclip className="mr-2 h-4 w-4" />
                      Anexar Arquivo
                    </Button>
                    <Button type="submit" disabled={salvando} className="bg-highlight text-background hover:bg-highlight/90 font-bold cursor-pointer disabled:opacity-60">
                      {salvando ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Publicando...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Send className="mr-1 h-4 w-4" />
                          Publicar Comunicado
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </Card>
          )}

          {loading ? (
            <Card className="border-borderCustom bg-card p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-highlight" />
              <span>Carregando comunicados do banco de dados...</span>
            </Card>
          ) : filteredNotices.length === 0 ? (
            <Card className="border-borderCustom bg-card p-8 text-center text-muted-foreground">
              Nenhum comunicado encontrado {selectedDate ? `para a data ${new Date(`${selectedDate}T00:00:00`).toLocaleDateString('pt-BR')}` : 'registrado no sistema'}.
            </Card>
          ) : (
            filteredNotices.map((notice) => (
              <Card key={notice.id} className="border-borderCustom bg-card p-5 hover:border-highlight/30 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-highlight/10 p-2 text-highlight shrink-0">
                    <Bell className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="font-semibold text-white text-base">{notice.title}</h2>
                      <span className="rounded-full border border-borderCustom bg-input px-2.5 py-1 text-xs text-muted-foreground">
                        {notice.date ? new Date(`${notice.date}T00:00:00`).toLocaleDateString('pt-BR') : 'Sem data'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground whitespace-pre-line">{notice.body}</p>
                    
                    {notice.anexo_url && (
                      <div className="mt-3">
                        <a
                          href={notice.anexo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-xs font-medium text-highlight hover:underline bg-highlight/5 border border-highlight/10 px-3 py-1.5 rounded-lg"
                        >
                          <Paperclip className="h-3.5 w-3.5" />
                          <span>Anexo: {notice.anexo_nome || 'Visualizar arquivo'}</span>
                        </a>
                      </div>
                    )}

                    {notice.target && (
                      <p className="mt-3 text-xs font-semibold text-highlight inline-block bg-highlight/10 px-2.5 py-0.5 rounded-full border border-highlight/20 mr-2">
                        {notice.target}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        <aside className="space-y-4">
          <Card className="border-borderCustom bg-card p-5">
            <h2 className="mb-4 text-lg font-semibold text-white">Filtrar por Data</h2>
            <div className="flex gap-2">
              <Input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="bg-input border-borderCustom text-white" />
              {selectedDate && (
                <Button variant="outline" size="icon" onClick={() => setSelectedDate('')} className="border-borderCustom bg-hoverCustom text-white shrink-0" title="Limpar filtro">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </Card>

          <Card className="border-borderCustom bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Aniversariantes do Mês</h2>
              <CalendarDays className="h-5 w-5 text-highlight" />
            </div>
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-muted-foreground">
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, idx) => (
                <span key={idx}>{day}</span>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-7 gap-2 text-center text-sm">
              {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => {
                const hasBirthday = birthdays.some((birthday) => birthday.day === day)
                return (
                  <span
                    key={day}
                    className={hasBirthday ? 'rounded-md bg-highlight py-1 font-semibold text-background shadow-sm' : 'rounded-md bg-input py-1 text-muted-foreground'}
                  >
                    {day}
                  </span>
                )
              })}
            </div>
            <div className="mt-5 space-y-2 border-t border-borderCustom pt-4">
              {loading ? (
                <p className="text-center text-xs text-muted-foreground">Carregando...</p>
              ) : birthdays.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground">Nenhum aniversariante neste mês.</p>
              ) : (
                birthdays.map((birthday, idx) => (
                  <div key={idx} className="rounded-lg bg-input p-3 text-sm border border-borderCustom/50">
                    <p className="font-semibold text-white">{birthday.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Dia {birthday.day} - {birthday.role}</p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  )
}
