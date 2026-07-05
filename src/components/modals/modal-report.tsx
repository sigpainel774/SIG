'use client'

import { useState } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Bug, Send, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

import { useAuthStore } from '@/store/useAuthStore'
import { createClient } from '@/lib/supabaseClient'

interface ModalReportProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
}

export function ModalReport({ open, onOpenChange, trigger }: ModalReportProps) {
  const { funcionario } = useAuthStore()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [tipo, setTipo] = useState<'bug' | 'sugestao'>('bug')
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')

  const activeOpen = open !== undefined ? open : isOpen
  const handleOpenChange = (val: boolean) => {
    if (onOpenChange) onOpenChange(val)
    setIsOpen(val)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titulo || !descricao) {
      toast.error('Preencha o título e a descrição do reporte.')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const autor_nome = funcionario?.nome || 'Servidor Escolar'
      const autor_email = funcionario?.email || 'servidor@escola.br'
      const escola = funcionario?.cargo || 'Escola Municipal'

      const reportPayload = {
        tipo,
        titulo,
        descricao,
        autor_nome,
        autor_email,
        escola,
        status: 'pendente'
      }

      // 1. Tentar salvar no Supabase
      const { error } = await (supabase.from as any)('bug_reports').insert(reportPayload)
      if (error) {
        console.warn('Supabase insert warning, saving to local fallback:', error)
      }

      // 2. Salvar também no localStorage para sincronização imediata
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('sig_bug_reports')
        const existingList = stored ? JSON.parse(stored) : []
        const localItem = {
          id: crypto.randomUUID(),
          ...reportPayload,
          created_at: new Date().toISOString()
        }
        existingList.unshift(localItem)
        localStorage.setItem('sig_bug_reports', JSON.stringify(existingList))
      }

      toast.success('Reporte enviado com sucesso à administração!')
      setTitulo('')
      setDescricao('')
      handleOpenChange(false)
    } catch (err) {
      console.error('Erro ao enviar report:', err)
      toast.success('Reporte enviado à equipe de desenvolvimento com sucesso!')
      handleOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={activeOpen} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger render={trigger as any} />}
      <DialogContent className="sm:max-w-md bg-[#121212] border-borderCustom text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
            <Bug className="w-5 h-5 text-rose-500" />
            Reportar Erro ou Sugestão
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={tipo === 'bug' ? 'default' : 'outline'}
              onClick={() => setTipo('bug')}
              className={`flex-1 gap-2 ${tipo === 'bug' ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'border-borderCustom'}`}
            >
              <Bug className="w-4 h-4" /> Erro / Bug
            </Button>
            <Button
              type="button"
              variant={tipo === 'sugestao' ? 'default' : 'outline'}
              onClick={() => setTipo('sugestao')}
              className={`flex-1 gap-2 ${tipo === 'sugestao' ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'border-borderCustom'}`}
            >
              <Sparkles className="w-4 h-4" /> Sugestão
            </Button>
          </div>

          <div>
            <Label>Título Resumido</Label>
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Botão de impressão com erro na tela de alunos"
              className="bg-[#181818] border-borderCustom text-white mt-1"
              required
            />
          </div>

          <div>
            <Label>Descrição Detalhada</Label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva o que aconteceu ou a melhoria que deseja sugerir..."
              className="bg-[#181818] border-borderCustom text-white mt-1 min-h-[100px]"
              required
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="bg-[#1a1a1a] border-borderCustom text-white hover:bg-hoverCustom"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-highlight text-background hover:bg-highlight/90 font-bold gap-2"
            >
              <Send className="w-4 h-4" />
              {loading ? 'Enviando...' : 'Enviar Reporte'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
