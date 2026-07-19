'use client'

import { useState } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
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

const MAX_LOCAL_REPORTS = 30

export function ModalReport({ open, onOpenChange, trigger }: ModalReportProps) {
  const { funcionario, vinculos } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [tipo, setTipo] = useState<'bug' | 'sugestao'>('bug')
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')

  // Gargalo #7 corrigido: sem estado fantasma isOpen
  const activeOpen = open ?? false

  const resetForm = () => {
    setTitulo('')
    setDescricao('')
    setTipo('bug')
  }

  const handleOpenChange = (val: boolean) => {
    // ES-5 corrigido: sempre resetar formulario ao fechar
    if (!val) resetForm()
    onOpenChange?.(val)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titulo || !descricao) {
      toast.error('Preencha o titulo e a descricao do reporte.')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const autor_nome = funcionario?.nome ?? 'Servidor Escolar'
      // ES-3 corrigido: email null-safe, sem string ficticia
      const autor_email = funcionario?.email ?? null
      // ES-2 corrigido: escola via vinculos, nao via cargo
      const escolaNome = vinculos.find(v => v.ativo)?.escolaNome ?? vinculos[0]?.escolaNome ?? null

      const reportPayload = {
        tipo,
        titulo,
        descricao,
        autor_nome,
        autor_email,
        escola: escolaNome,
        status: 'pendente'
      }

      // 1. Salvar no Supabase
      const { error } = await (supabase.from as any)('bug_reports').insert(reportPayload)
      if (error) {
        console.warn('Supabase insert warning, saving to local fallback:', error)
      }

      // 2. Salvar no localStorage com limite maximo de itens (ES-4 corrigido)
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('sig_bug_reports')
        const existingList: unknown[] = stored ? JSON.parse(stored) : []
        const localItem = {
          id: crypto.randomUUID(),
          ...reportPayload,
          created_at: new Date().toISOString()
        }
        const updatedList = [localItem, ...existingList].slice(0, MAX_LOCAL_REPORTS)
        localStorage.setItem('sig_bug_reports', JSON.stringify(updatedList))
      }

      toast.success('Reporte enviado com sucesso a administracao!')
      handleOpenChange(false)
    } catch (err) {
      console.error('Erro ao enviar report:', err)
      // Gargalo #8 corrigido: toast.error no catch, nao toast.success
      toast.error('Falha ao enviar o reporte. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* ES-7 corrigido: Dialog e controlado via open/onOpenChange; trigger externo renderizado diretamente */}
      {trigger}
      <Dialog open={activeOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-borderCustom text-foreground rounded-[18px] shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
            <Bug className="w-5 h-5 text-rose-500" />
            Reportar Erro ou Sugestao
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={tipo === 'bug' ? 'default' : 'outline'}
              onClick={() => setTipo('bug')}
              className={`flex-1 gap-2 cursor-pointer ${tipo === 'bug' ? 'bg-rose-600 hover:bg-rose-700 text-white font-semibold' : 'border-borderCustom text-muted-foreground'}`}
            >
              <Bug className="w-4 h-4" /> Erro / Bug
            </Button>
            <Button
              type="button"
              variant={tipo === 'sugestao' ? 'default' : 'outline'}
              onClick={() => setTipo('sugestao')}
              className={`flex-1 gap-2 cursor-pointer ${tipo === 'sugestao' ? 'bg-amber-600 hover:bg-amber-700 text-white font-semibold' : 'border-borderCustom text-muted-foreground'}`}
            >
              <Sparkles className="w-4 h-4" /> Sugestao
            </Button>
          </div>

          <div>
            <Label className="text-foreground font-semibold text-xs">Titulo Resumido</Label>
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Botao de impressao com erro na tela de alunos"
              className="bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary mt-1"
              required
            />
          </div>

          <div>
            <Label className="text-foreground font-semibold text-xs">Descricao Detalhada</Label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva o que aconteceu ou a melhoria que deseja sugerir..."
              className="bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary mt-1 min-h-[100px]"
              required
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="bg-muted text-foreground border-border hover:bg-muted/80 rounded-lg cursor-pointer font-semibold"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              {loading ? 'Enviando...' : 'Enviar Reporte'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      </Dialog>
    </>
  )
}
