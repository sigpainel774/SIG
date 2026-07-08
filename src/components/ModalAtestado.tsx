'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/useAuthStore'
import { Loader2, UploadCloud } from 'lucide-react'

interface ModalAtestadoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function ModalAtestado({ open, onOpenChange, onSuccess }: ModalAtestadoProps) {
  const [funcionarios, setFuncionarios] = useState<any[]>([])
  const [funcionarioId, setFuncionarioId] = useState('')
  const [cid, setCid] = useState('')
  const [dias, setDias] = useState<number>(1)
  const [arquivo, setArquivo] = useState<File | null>(null)
  
  const [loading, setLoading] = useState(false)
  const [loadingFuncs, setLoadingFuncs] = useState(false)
  
  const supabase = createClient()
  const escolaAtivaId = useAuthStore((state) => state.escolaAtivaId)

  useEffect(() => {
    if (open && funcionarios.length === 0) {
      const fetchFuncionarios = async () => {
        setLoadingFuncs(true)
        const { data } = await supabase.from('funcionarios').select('id, nome, cargo').order('nome')
        if (data) setFuncionarios(data)
        setLoadingFuncs(false)
      }
      fetchFuncionarios()
    }
  }, [open, funcionarios.length, supabase])

  const handleSave = async () => {
    if (!funcionarioId || !cid || dias <= 0) {
      toast.error('Preencha todos os campos obrigatórios e garanta que os dias sejam maiores que 0.')
      return
    }

    if (!escolaAtivaId) {
      toast.error('Nenhuma escola ativa selecionada')
      return
    }

    setLoading(true)

    try {
      let anexoUrl = null
      let anexoNome = null

      if (arquivo) {
        const fileExt = arquivo.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `atestados/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('anexos')
          .upload(filePath, arquivo)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('anexos')
          .getPublicUrl(filePath)

        anexoUrl = publicUrl
        anexoNome = arquivo.name
      }

      const { error } = await (supabase.from as any)('atestados')
        .insert({
          funcionario_id: funcionarioId,
          cid: cid.trim().toUpperCase(),
          dias_afastamento: dias,
          escola_id: escolaAtivaId,
          status: 'Pendente',
          anexo_url: anexoUrl,
          anexo_nome: anexoNome
        })

      if (error) throw error
      
      toast.success('Atestado registrado com sucesso (Status: Pendente)')
      onSuccess()
      
      // Reset form
      setFuncionarioId('')
      setCid('')
      setDias(1)
      setArquivo(null)
      onOpenChange(false)
    } catch (error: any) {
      toast.error('Erro ao registrar atestado: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-[#121212] border-[#27272a] text-white">
        <DialogHeader>
          <DialogTitle>Registrar Atestado</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Cadastre um novo atestado médico com o anexo do comprovante.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-zinc-300">Servidor</label>
            <Select value={funcionarioId} onValueChange={(val) => val && setFuncionarioId(val)} disabled={loadingFuncs}>
              <SelectTrigger className="bg-[#18181b] border-[#3f3f46] text-white">
                <SelectValue placeholder={loadingFuncs ? "Carregando..." : "Selecione o servidor"}>
                  {funcionarioId 
                    ? (() => {
                        const f = funcionarios.find((x) => x.id === funcionarioId);
                        return f ? `${f.nome}${f.cargo ? ` (${f.cargo})` : ''}` : (funcionarios.length === 0 ? 'Carregando...' : funcionarioId);
                      })()
                    : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-[#18181b] border-[#3f3f46] text-white max-h-60">
                {funcionarios.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.nome} {f.cargo ? `(${f.cargo})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-zinc-300">CID</label>
            <Input
              placeholder="Ex: J01"
              value={cid}
              onChange={(e) => setCid(e.target.value)}
              className="bg-[#18181b] border-[#3f3f46] text-white uppercase"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-zinc-300">Dias de Afastamento</label>
            <Input
              type="number"
              min={1}
              value={dias}
              onChange={(e) => setDias(parseInt(e.target.value) || 0)}
              className="bg-[#18181b] border-[#3f3f46] text-white"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-zinc-300">Anexo do Atestado (Opcional)</label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept=".pdf,image/*"
                onChange={(e) => setArquivo(e.target.files?.[0] || null)}
                className="bg-[#18181b] border-[#3f3f46] text-white file:text-white file:bg-[#27272a] file:border-none file:mr-4 file:px-4 file:py-1 file:rounded-md cursor-pointer"
              />
            </div>
            {arquivo && <p className="text-xs text-muted-foreground mt-1">Anexo selecionado: {arquivo.name}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="bg-transparent border-[#3f3f46] text-white hover:bg-[#27272a]"
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            disabled={loading}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Salvando...' : 'Salvar Atestado'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
