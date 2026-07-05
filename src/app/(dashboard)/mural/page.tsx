'use client'

import { useMemo, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { Bell, CalendarDays, ChevronLeft, ChevronRight, Paperclip, Pin, Send, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'



export default function MuralPage() {
  const [selectedDate, setSelectedDate] = useState('')
  const [showComposer, setShowComposer] = useState(false)
  const [notices, setNotices] = useState<any[]>([])
  const [birthdays, setBirthdays] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()
      
      const [comunicadosRes, funcRes, alunosRes] = await Promise.all([
        (supabase.from as any)('comunicados').select('*').order('date', { ascending: false }),
        supabase.from('funcionarios').select('nome, cargo, data_nascimento').not('data_nascimento', 'is', null),
        supabase.from('alunos').select('nome, data_nascimento').not('data_nascimento', 'is', null)
      ])

      if (comunicadosRes.data) {
        setNotices(comunicadosRes.data)
      }

      const allBirthdays: any[] = []
      if (funcRes.data) {
        funcRes.data.forEach(f => {
          const date = new Date(f.data_nascimento + 'T00:00:00')
          // Only current month
          if (date.getMonth() === new Date().getMonth()) {
            allBirthdays.push({ day: date.getDate(), name: f.nome, role: f.cargo || 'Funcionário' })
          }
        })
      }
      if (alunosRes.data) {
        alunosRes.data.forEach(a => {
          const date = new Date(a.data_nascimento + 'T00:00:00')
          if (date.getMonth() === new Date().getMonth()) {
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Mural</h1>
          <p className="mt-1 text-sm text-muted-foreground">Comunicados, avisos e aniversariantes da rede.</p>
        </div>
        <Button onClick={() => setShowComposer((value) => !value)} className="bg-highlight text-background hover:bg-highlight/90">
          <Pin className="mr-2 h-4 w-4" />
          Novo Comunicado
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {showComposer && (
            <Card className="border-borderCustom bg-card p-5">
              <h2 className="mb-4 text-lg font-semibold text-white">Criar Novo Comunicado</h2>
              <textarea
                rows={4}
                placeholder="Escreva o comunicado aqui..."
                className="mb-4 w-full resize-none rounded-lg border border-borderCustom bg-input p-3 text-sm text-foregroundCustom outline-none focus:border-highlight"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button variant="outline" className="border-borderCustom bg-hoverCustom text-foregroundCustom">
                  <Paperclip className="mr-2 h-4 w-4" />
                  Anexar Arquivo
                </Button>
                <Button className="bg-highlight text-background hover:bg-highlight/90">
                  <Send className="mr-2 h-4 w-4" />
                  Publicar
                </Button>
              </div>
            </Card>
          )}

          {loading ? (
            <Card className="border-borderCustom bg-card p-5 text-center text-muted-foreground">
              Carregando comunicados...
            </Card>
          ) : filteredNotices.length === 0 ? (
            <Card className="border-borderCustom bg-card p-5 text-center text-muted-foreground">
              Nenhum comunicado encontrado.
            </Card>
          ) : (
            filteredNotices.map((notice) => (
              <Card key={notice.id} className="border-borderCustom bg-card p-5">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-highlight/10 p-2 text-highlight">
                    <Bell className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="font-semibold text-white">{notice.title}</h2>
                      <span className="rounded-full border border-borderCustom bg-input px-2.5 py-1 text-xs text-muted-foreground">
                        {new Date(`${notice.date}T00:00:00`).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{notice.body}</p>
                    <p className="mt-3 text-xs font-medium text-highlight">{notice.target}</p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        <aside className="space-y-4">
          <Card className="border-borderCustom bg-card p-5">
            <h2 className="mb-4 text-lg font-semibold text-white">Filtrar Comunicados</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" className="border-borderCustom bg-hoverCustom">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="bg-input" />
              <Button variant="outline" size="icon" className="border-borderCustom bg-hoverCustom">
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setSelectedDate('')} className="border-borderCustom bg-hoverCustom">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </Card>

          <Card className="border-borderCustom bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Aniversarios</h2>
              <CalendarDays className="h-5 w-5 text-highlight" />
            </div>
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-muted-foreground">
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-7 gap-2 text-center text-sm">
              {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => {
                const hasBirthday = birthdays.some((birthday) => birthday.day === day)
                return (
                  <span
                    key={day}
                    className={hasBirthday ? 'rounded-md bg-highlight py-1 font-semibold text-background' : 'rounded-md bg-input py-1 text-muted-foreground'}
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
                <p className="text-center text-xs text-muted-foreground">Nenhum aniversariante neste mês ainda.</p>
              ) : (
                birthdays.map((birthday, idx) => (
                  <div key={idx} className="rounded-lg bg-input p-3 text-sm">
                    <p className="font-medium text-white">{birthday.name}</p>
                    <p className="text-xs text-muted-foreground">Dia {birthday.day} - {birthday.role}</p>
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
