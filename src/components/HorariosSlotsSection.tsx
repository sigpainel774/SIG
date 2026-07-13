'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Trash2, Clock, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useSchoolStore } from '@/store/useSchoolStore'

interface HorarioSlot {
  id: string
  escola_id: string
  turno: 'matutino' | 'vespertino' | 'noturno'
  ordem_aula: number
  horario_inicio: string
  horario_fim: string
}

export function HorariosSlotsSection() {
  const { selectedEscola } = useSchoolStore()
  const [slots, setSlots] = useState<HorarioSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)

  // Form State
  const [turno, setTurno] = useState<'matutino' | 'vespertino' | 'noturno'>('matutino')
  const [ordemAula, setOrdemAula] = useState<number>(1)
  const [horarioInicio, setHorarioInicio] = useState('')
  const [horarioFim, setHorarioFim] = useState('')

  const supabase = createClient()

  const fetchSlots = async () => {
    if (!selectedEscola?.id) return
    setLoading(true)
    try {
      const { data, error } = await (supabase as any)
        .from('horarios_aulas_slots')
        .select('*')
        .eq('escola_id', selectedEscola.id)
        .order('turno')
        .order('ordem_aula')

      if (error) throw error
      setSlots((data || []) as HorarioSlot[])
    } catch (err: any) {
      toast.error('Erro ao carregar slots: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSlots()
  }, [selectedEscola?.id])

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEscola?.id) {
      toast.error('Selecione uma escola primeiro.')
      return
    }

    if (!horarioInicio || !horarioFim) {
      toast.error('Preencha os horários de início e fim.')
      return
    }

    if (horarioFim <= horarioInicio) {
      toast.error('O horário de término deve ser após o horário de início.')
      return
    }

    setSalvando(true)
    try {
      const { error } = await (supabase as any)
        .from('horarios_aulas_slots')
        .insert({
          escola_id: selectedEscola.id,
          turno,
          ordem_aula: ordemAula,
          horario_inicio: horarioInicio,
          horario_fim: horarioFim
        })

      if (error) {
        if (error.code === '23505') {
          throw new Error(`O ${ordemAula}º horário para o turno ${turno} já está cadastrado nesta escola.`)
        }
        throw error
      }

      toast.success('Slot de horário adicionado com sucesso!')
      setHorarioInicio('')
      setHorarioFim('')
      setOrdemAula((prev) => prev + 1)
      fetchSlots()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao adicionar slot de horário.')
    } finally {
      setSalvando(false)
    }
  }

  const handleDeleteSlot = async (id: string) => {
    if (!confirm('Deseja realmente remover este slot de horário? Isso pode afetar a geração das agendas futuras.')) {
      return
    }

    try {
      const { error } = await (supabase as any)
        .from('horarios_aulas_slots')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Slot de horário removido!')
      fetchSlots()
    } catch (err: any) {
      toast.error('Erro ao remover slot: ' + err.message)
    }
  }

  const turnosMap = {
    matutino: 'Matutino (Manhã)',
    vespertino: 'Vespertino (Tarde)',
    noturno: 'Noturno (Noite)'
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Formulário de Criação */}
      <Card className="bg-[#121212] border-borderCustom p-5 h-fit shadow-md">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-highlight" />
          Configurar Novo Slot
        </h3>
        <form onSubmit={handleAddSlot} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">
              Turno
            </label>
            <select
              value={turno}
              onChange={(e) => setTurno(e.target.value as any)}
              className="w-full rounded-md border border-borderCustom bg-[#1c1c1e] text-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-highlight"
            >
              <option value="matutino">Matutino (Manhã)</option>
              <option value="vespertino">Vespertino (Tarde)</option>
              <option value="noturno">Noturno (Noite)</option>
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">
                Ordem
              </label>
              <Input
                type="number"
                min="1"
                max="10"
                value={ordemAula}
                onChange={(e) => setOrdemAula(parseInt(e.target.value) || 1)}
                className="bg-[#1c1c1e] border-borderCustom text-white text-center"
                required
              />
            </div>
            <div className="col-span-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">
                Início
              </label>
              <Input
                type="time"
                value={horarioInicio}
                onChange={(e) => setHorarioInicio(e.target.value)}
                className="bg-[#1c1c1e] border-borderCustom text-white"
                required
              />
            </div>
            <div className="col-span-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">
                Término
              </label>
              <Input
                type="time"
                value={horarioFim}
                onChange={(e) => setHorarioFim(e.target.value)}
                className="bg-[#1c1c1e] border-borderCustom text-white"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={salvando}
            className="w-full bg-highlight text-background hover:bg-highlight/90 font-bold gap-2 cursor-pointer mt-2"
          >
            {salvando ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Adicionar Horário
          </Button>
        </form>
      </Card>

      {/* Tabela de Visualização */}
      <Card className="bg-[#121212] border-borderCustom p-5 lg:col-span-2 shadow-md">
        <h3 className="text-lg font-bold text-white mb-4">Grade de Slots Cadastrados</h3>
        <div className="rounded-xl border border-borderCustom overflow-hidden bg-[#0d0d0d]">
          <Table>
            <TableHeader className="bg-[#080808]">
              <TableRow className="border-borderCustom">
                <TableHead className="text-white">Turno</TableHead>
                <TableHead className="text-white text-center">Horário de Aula</TableHead>
                <TableHead className="text-white text-center">Intervalo de Duração</TableHead>
                <TableHead className="text-white text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
                      <Loader2 className="w-4 h-4 animate-spin text-highlight" />
                      <span>Carregando slots...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : slots.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-sm">
                    Nenhum horário cadastrado para esta escola. Use o formulário ao lado para adicionar.
                  </TableCell>
                </TableRow>
              ) : (
                slots.map((slot) => {
                  // Calcular duração
                  const [hIni, mIni] = slot.horario_inicio.split(':').map(Number)
                  const [hFim, mFim] = slot.horario_fim.split(':').map(Number)
                  const duracao = (hFim * 60 + mFim) - (hIni * 60 + mIni)

                  return (
                    <TableRow key={slot.id} className="border-borderCustom hover:bg-[#1a1a1c] transition-colors">
                      <TableCell className="font-semibold text-white">
                        {turnosMap[slot.turno] || slot.turno}
                      </TableCell>
                      <TableCell className="text-center text-white font-medium">
                        <span className="px-2.5 py-1 bg-highlight/10 border border-highlight/20 text-highlight rounded-lg text-xs font-mono">
                          {slot.ordem_aula}º Horário: {slot.horario_inicio.slice(0, 5)} - {slot.horario_fim.slice(0, 5)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground text-sm font-medium">
                        {duracao} minutos
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          onClick={() => handleDeleteSlot(slot.id)}
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-rose-400 hover:bg-rose-950/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
