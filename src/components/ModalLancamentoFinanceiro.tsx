'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/useAuthStore'
import { Loader2 } from 'lucide-react'

interface ModalLancamentoFinanceiroProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function ModalLancamentoFinanceiro({ open, onOpenChange, onSuccess }: ModalLancamentoFinanceiroProps) {
  const [tipo, setTipo] = useState<'Receita' | 'Despesa'>('Despesa')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState<string>('')
  const [data, setData] = useState('')
  const [categoria, setCategoria] = useState('')
  const [conta, setConta] = useState('')
  const [arquivo, setArquivo] = useState<File | null>(null)
  
  const [loading, setLoading] = useState(false)
  
  const supabase = createClient()
  const escolaAtivaId = useAuthStore((state) => state.escolaAtivaId)

  const handleSave = async () => {
    if (!descricao || !valor || !data || !categoria || !conta) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    const valorNumber = parseFloat(valor.replace(',', '.'))
    if (isNaN(valorNumber) || valorNumber <= 0) {
      toast.error('O valor deve ser maior que zero')
      return
    }

    if (!escolaAtivaId) {
      toast.error('Nenhuma escola ativa selecionada')
      return
    }

    setLoading(true)

    try {
      let comprovanteUrl = null

      if (arquivo) {
        const fileExt = arquivo.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `financeiro/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('anexos')
          .upload(filePath, arquivo)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('anexos')
          .getPublicUrl(filePath)

        comprovanteUrl = publicUrl
      }

      const { error } = await supabase
        .from('transacoes_financeiras')
        .insert({
          tipo,
          descricao: descricao.trim(),
          valor: valorNumber,
          data,
          categoria,
          conta,
          escola_id: escolaAtivaId,
          comprovante_url: comprovanteUrl
        })

      if (error) throw error
      
      toast.success('Lançamento financeiro registrado com sucesso')
      onSuccess()
      
      // Reset form
      setTipo('Despesa')
      setDescricao('')
      setValor('')
      setData('')
      setCategoria('')
      setConta('')
      setArquivo(null)
      onOpenChange(false)
    } catch (error: any) {
      toast.error('Erro ao registrar lançamento: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-[#121212] border-[#27272a] text-white">
        <DialogHeader>
          <DialogTitle>Novo Lançamento</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Registre uma nova receita ou despesa no caixa escolar.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
          
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-zinc-300">Tipo</label>
            <div className="flex gap-2">
              <Button 
                type="button" 
                variant={tipo === 'Receita' ? 'default' : 'outline'}
                className={tipo === 'Receita' ? 'bg-green-600 hover:bg-green-700 flex-1' : 'bg-transparent border-[#3f3f46] text-[#aaa] hover:text-white flex-1'}
                onClick={() => setTipo('Receita')}
              >
                Receita
              </Button>
              <Button 
                type="button" 
                variant={tipo === 'Despesa' ? 'default' : 'outline'}
                className={tipo === 'Despesa' ? 'bg-red-600 hover:bg-red-700 flex-1' : 'bg-transparent border-[#3f3f46] text-[#aaa] hover:text-white flex-1'}
                onClick={() => setTipo('Despesa')}
              >
                Despesa
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-zinc-300">Descrição</label>
            <Input
              placeholder="Ex: Pagamento Fornecedor X"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="bg-[#18181b] border-[#3f3f46] text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-zinc-300">Valor (R$)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className="bg-[#18181b] border-[#3f3f46] text-white"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-zinc-300">Data</label>
              <Input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="bg-[#18181b] border-[#3f3f46] text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-zinc-300">Categoria</label>
              <Select value={categoria} onValueChange={(val) => val && setCategoria(val)}>
                <SelectTrigger className="bg-[#18181b] border-[#3f3f46] text-white">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-[#18181b] border-[#3f3f46] text-white">
                  {tipo === 'Receita' ? (
                    <>
                      <SelectItem value="Mensalidade">Mensalidade</SelectItem>
                      <SelectItem value="Doação">Doação</SelectItem>
                      <SelectItem value="Repasse">Repasse Governamental</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="Manutenção">Manutenção</SelectItem>
                      <SelectItem value="Alimentação">Alimentação</SelectItem>
                      <SelectItem value="Material">Material Escolar</SelectItem>
                      <SelectItem value="Serviços">Serviços Terceirizados</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-zinc-300">Conta / Verba</label>
              <Select value={conta} onValueChange={(val) => val && setConta(val)}>
                <SelectTrigger className="bg-[#18181b] border-[#3f3f46] text-white">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-[#18181b] border-[#3f3f46] text-white">
                  <SelectItem value="Caixa Escolar">Caixa Escolar</SelectItem>
                  <SelectItem value="Conta do Brasil">Conta do Brasil</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-zinc-300">Comprovante / Nota Fiscal (Opcional)</label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept=".pdf,image/*"
                onChange={(e) => setArquivo(e.target.files?.[0] || null)}
                className="bg-[#18181b] border-[#3f3f46] text-white file:text-white file:bg-[#27272a] file:border-none file:mr-4 file:px-4 file:py-1 file:rounded-md cursor-pointer"
              />
            </div>
            {arquivo && <p className="text-xs text-muted-foreground mt-1">Anexo: {arquivo.name}</p>}
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
            className="bg-highlight text-black hover:bg-highlight/90 font-bold gap-2"
            disabled={loading}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
