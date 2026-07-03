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
import { Label } from '@/components/ui/label'
import { Building2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabaseClient'

interface ModalEscolaProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
  onSuccess?: () => void
}

export function ModalEscola({ open, onOpenChange, trigger, onSuccess }: ModalEscolaProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [nome, setNome] = useState('')
  const [logoUrl, setLogoUrl] = useState('')

  const activeOpen = open !== undefined ? open : isOpen
  const handleOpenChange = (val: boolean) => {
    if (onOpenChange) onOpenChange(val)
    setIsOpen(val)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome) {
      toast.error('Preencha o Nome da Escola.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase.from('escolas').insert({
        nome,
        logo_url: logoUrl || null,
      })

      if (error) throw error

      toast.success('Escola cadastrada com sucesso!')
      setNome('')
      handleOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (err: any) {
      toast.error(`Erro ao cadastrar escola: ${err.message}`)
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
            <Building2 className="w-5 h-5 text-highlight" />
            Cadastrar Nova Unidade Escolar
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div>
            <Label>Nome Completo da Escola *</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Escola Municipal Eraldo Tinoco"
              className="bg-[#181818] border-borderCustom text-white mt-1"
              required
            />
          </div>

          <DialogFooter className="gap-2 pt-4 border-t border-borderCustom">
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
              <Save className="w-4 h-4" />
              {loading ? 'Salvando...' : 'Cadastrar Escola'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
