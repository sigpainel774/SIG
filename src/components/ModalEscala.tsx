'use client'

import { useState } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/useAuthStore'

interface ModalEscalaProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  equipe: any[]
  onSuccess: () => void
}

export function ModalEscala({ open, onOpenChange, equipe, onSuccess }: ModalEscalaProps) {
  const [funcionarioId, setFuncionarioId] = useState('')
  const [data, setData] = useState('')
  const [turno, setTurno] = useState('')
  const [loading, setLoading] = useState(false)
  
  const supabase = createClient()
  const escolaAtivaId = useAuthStore((state) => state.escolaAtivaId)

  const handleSave = async () => {
    if (!funcionarioId || !data || !turno) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    if (!escolaAtivaId) {
      toast.error('Nenhuma escola ativa selecionada')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase
        .from('escalas_servico')
        .insert({
          funcionario_id: funcionarioId,
          data: data,
          turno: turno,
          escola_id: escolaAtivaId,
          status: 'Pendente'
        })

      if (error) throw error
      
      toast.success('Escala criada com sucesso (Status: Pendente)')
      onSuccess()
      
      // Reset form
      setFuncionarioId('')
      setData('')
      setTurno('')
      onOpenChange(false)
    } catch (error: any) {
      toast.error('Erro ao criar escala: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Criar Escala de Trabalho"
      description="Cadastre uma nova escala para um membro da sua equipe."
      maxWidth="sm:max-w-[425px]"
      footer={
        <>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
            disabled={loading}
          >
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">Funcionário</label>
          <Select value={funcionarioId} onValueChange={(val) => val && setFuncionarioId(val)}>
            <SelectTrigger className="w-full bg-background border-border text-foreground font-normal">
              <SelectValue placeholder="Selecione um membro da equipe">
                {funcionarioId 
                  ? (() => {
                      const f = equipe.find((x) => x.id === funcionarioId);
                      return f ? `${f.nome}${f.cargo ? ` (${f.cargo})` : ''}` : (equipe.length === 0 ? 'Carregando...' : funcionarioId);
                    })()
                  : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-popover text-popover-foreground border-border max-h-60">
              {equipe.map((membro) => (
                <SelectItem key={membro.id} value={membro.id}>
                  {membro.nome} {membro.cargo ? `(${membro.cargo})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">Data</label>
          <Input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="bg-background border-border text-foreground"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">Turno</label>
          <Select value={turno} onValueChange={(val) => val && setTurno(val)}>
            <SelectTrigger className="w-full bg-background border-border text-foreground font-normal">
              <SelectValue placeholder="Selecione o turno" />
            </SelectTrigger>
            <SelectContent className="bg-popover text-popover-foreground border-border">
              <SelectItem value="Matutino">Matutino</SelectItem>
              <SelectItem value="Vespertino">Vespertino</SelectItem>
              <SelectItem value="Noturno">Noturno</SelectItem>
              <SelectItem value="Integral">Integral</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </StandardDialog>
  )
}
