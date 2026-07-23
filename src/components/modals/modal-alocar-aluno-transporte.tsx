'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { UserPlus, Loader2, Save, Search } from 'lucide-react'

interface RotaItem {
  id: string
  nome: string
  turno: string
}

interface ModalAlocarAlunoTransporteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rotas: RotaItem[]
  onSuccess: () => void
}

export function ModalAlocarAlunoTransporte({
  open,
  onOpenChange,
  rotas,
  onSuccess,
}: ModalAlocarAlunoTransporteProps) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [loadingAlunos, setLoadingAlunos] = useState(false)

  const [buscaAluno, setBuscaAluno] = useState('')
  const [alunosLista, setAlunosLista] = useState<any[]>([])
  const [alunoSelecionadoId, setAlunoSelecionadoId] = useState('')
  const [rotaId, setRotaId] = useState('')
  const [pontoEmbarque, setPontoEmbarque] = useState('')

  useEffect(() => {
    if (open) {
      setBuscaAluno('')
      setAlunoSelecionadoId('')
      setPontoEmbarque('')
      if (rotas.length > 0 && !rotaId) {
        setRotaId(rotas[0].id)
      }
    }
  }, [open, rotas])

  // Buscar alunos dinamicamente à medida que digita
  useEffect(() => {
    if (!open) return
    let active = true

    const buscarAlunos = async () => {
      setLoadingAlunos(true)
      try {
        let query = supabase
          .from('alunos')
          .select('id, nome, numero_matricula')
          .is('deleted_at', null)
          .order('nome')
          .limit(20)

        if (buscaAluno.trim().length >= 2) {
          query = query.ilike('nome', `%${buscaAluno.trim()}%`)
        }

        const { data, error } = await query
        if (!active) return

        if (!error && data) {
          setAlunosLista(data)
        }
      } catch (err) {
        console.error('Erro ao buscar alunos:', err)
      } finally {
        if (active) setLoadingAlunos(false)
      }
    }

    const timer = setTimeout(buscarAlunos, 300)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [buscaAluno, open])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!alunoSelecionadoId) {
      toast.error('Selecione um aluno para alocar.')
      return
    }
    if (!rotaId) {
      toast.error('Selecione a rota de transporte.')
      return
    }

    setSaving(true)
    try {
      const { error } = await (supabase as any).from('alunos_transporte').insert({
        aluno_id: alunoSelecionadoId,
        rota_id: rotaId,
        ponto_embarque: pontoEmbarque.trim() || null,
      })

      if (error) throw error

      toast.success('Aluno vinculado à rota de transporte!')
      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      console.error('Erro ao alocar aluno:', err)
      toast.error(`Falha ao alocar aluno: ${err.message || 'Erro desconhecido.'}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Alocar Aluno em Rota de Transporte"
      description="Selecione o estudante e a rota correspondente para controle da lista de passageiros."
      maxWidth="sm:max-w-[500px]"
    >
      <form onSubmit={handleSave} className="space-y-4">
        {/* Filtro/Busca de Aluno */}
        <div className="space-y-2">
          <Label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
            <Search className="w-4 h-4 text-sky-400" />
            Buscar Aluno pelo Nome *
          </Label>
          <Input
            type="text"
            value={buscaAluno}
            onChange={(e) => setBuscaAluno(e.target.value)}
            placeholder="Digite o nome do aluno para filtrar..."
            className="bg-[#17171a] border-[#27272a] text-white text-xs h-9"
          />
        </div>

        {/* Seleção do Aluno */}
        <div className="space-y-2">
          <Label className="text-xs font-bold text-zinc-300">Selecione o Estudante *</Label>
          <Select
            value={alunoSelecionadoId}
            onValueChange={(v: string | null) => setAlunoSelecionadoId(v ?? '')}
          >
            <SelectTrigger className="bg-[#17171a] border-[#27272a] text-white text-sm h-10">
              <SelectValue placeholder={loadingAlunos ? 'Carregando alunos...' : 'Selecione um aluno'} />
            </SelectTrigger>
            <SelectContent className="bg-[#17171a] border-[#27272a] text-white max-h-48 overflow-y-auto">
              {alunosLista.map((aluno) => (
                <SelectItem key={aluno.id} value={aluno.id} className="text-white">
                  {aluno.nome} {aluno.numero_matricula ? `(Matrícula: ${aluno.numero_matricula})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Rota */}
        <div className="space-y-2">
          <Label className="text-xs font-bold text-zinc-300">Rota de Transporte *</Label>
          <Select value={rotaId} onValueChange={(v: string | null) => setRotaId(v ?? '')}>
            <SelectTrigger className="bg-[#17171a] border-[#27272a] text-white text-sm h-10">
              <SelectValue placeholder="Selecione a rota" />
            </SelectTrigger>
            <SelectContent className="bg-[#17171a] border-[#27272a] text-white">
              {rotas.map((r) => (
                <SelectItem key={r.id} value={r.id} className="text-white">
                  {r.nome} ({r.turno})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Ponto de Embarque */}
        <div className="space-y-2">
          <Label className="text-xs font-bold text-zinc-300">Ponto de Embarque / Parada</Label>
          <Input
            type="text"
            value={pontoEmbarque}
            onChange={(e) => setPontoEmbarque(e.target.value)}
            placeholder="Ex: Entroncamento da BR-101 / Povoado Coqueiros"
            className="bg-[#17171a] border-[#27272a] text-white text-xs h-9"
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-[#26262a]">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="bg-sky-600 hover:bg-sky-700 text-white font-semibold flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Vincular Aluno
          </Button>
        </div>
      </form>
    </StandardDialog>
  )
}
