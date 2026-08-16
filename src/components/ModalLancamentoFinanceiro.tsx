'use client'

import { useState } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/useAuthStore'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { FileUpload } from '@/components/ui/file-upload'

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
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Novo Lançamento"
      description="Registre uma nova receita ou despesa no caixa escolar."
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
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-2"
            disabled={loading}
          >
            {loading && <LoadingSpinner size="sm" variant="muted" placement="inline" />}
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 max-h-[60vh] overflow-y-auto pr-2">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">Tipo</label>
          <div className="flex gap-2">
            <Button 
              type="button" 
              variant={tipo === 'Receita' ? 'default' : 'outline'}
              className={tipo === 'Receita' ? 'bg-emerald-600 hover:bg-emerald-700 text-white flex-1' : 'flex-1'}
              onClick={() => setTipo('Receita')}
            >
              Receita
            </Button>
            <Button 
              type="button" 
              variant={tipo === 'Despesa' ? 'default' : 'outline'}
              className={tipo === 'Despesa' ? 'bg-rose-600 hover:bg-rose-700 text-white flex-1' : 'flex-1'}
              onClick={() => setTipo('Despesa')}
            >
              Despesa
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">Descrição</label>
          <Input
            placeholder="Ex: Pagamento Fornecedor X"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className="bg-background border-border text-foreground"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">Valor (R$)</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="bg-background border-border text-foreground"
            />
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
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">Categoria</label>
            <Select value={categoria} onValueChange={(val) => val && setCategoria(val)}>
              <SelectTrigger className="w-full bg-background border-border text-foreground font-normal">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent className="bg-popover text-popover-foreground border-border">
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
            <label className="text-sm font-medium text-foreground">Conta / Verba</label>
            <Select value={conta} onValueChange={(val) => val && setConta(val)}>
              <SelectTrigger className="w-full bg-background border-border text-foreground font-normal">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent className="bg-popover text-popover-foreground border-border">
                <SelectItem value="Caixa Escolar">Caixa Escolar</SelectItem>
                <SelectItem value="Conta do Brasil">Conta do Brasil</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">Comprovante / Nota Fiscal (Opcional)</label>
          <FileUpload
            file={arquivo}
            onChange={setArquivo}
            accept=".pdf,image/*"
            label="Selecione ou arraste o comprovante (PDF/Imagem)"
          />
        </div>
      </div>
    </StandardDialog>
  )
}
