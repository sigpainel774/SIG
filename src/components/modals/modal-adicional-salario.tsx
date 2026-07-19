'use client'

import { useState, useEffect } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Coins, Plus, Trash2, Check, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabaseClient'
import { useEditModeStore } from '@/store/useEditModeStore'

interface Adicional {
  id: string
  descricao: string
  valor: number
  tipo: 'fixo' | 'pontual'
  mes_referencia: number | null
  ano_referencia: number | null
  ativo: boolean
  created_at: string
}

interface ModalAdicionalSalarioProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  funcionarioId: string | null
  funcionarioNome?: string
}

export function ModalAdicionalSalario({ open, onOpenChange, funcionarioId, funcionarioNome }: ModalAdicionalSalarioProps) {
  const { isEditMode } = useEditModeStore()
  const supabase = createClient()
  
  const [adicionais, setAdicionais] = useState<Adicional[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // Novo adicional form state
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('') // Mantido como string no form local
  const [tipo, setTipo] = useState<'fixo' | 'pontual'>('fixo')
  const [mesReferencia, setMesReferencia] = useState(String(new Date().getMonth() + 1))
  const [anoReferencia, setAnoReferencia] = useState(String(new Date().getFullYear()))

  const fetchAdicionais = async () => {
    if (!funcionarioId) return
    setLoadingList(true)
    try {
      const { data, error } = await supabase
        .from('adicionais_salario')
        .select('*')
        .eq('funcionario_id', funcionarioId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAdicionais((data || []) as any[])
    } catch (err: any) {
      toast.error(`Erro ao carregar adicionais: ${err.message}`)
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    if (open && funcionarioId) {
      fetchAdicionais()
      // Reset form
      setDescricao('')
      setValor('')
      setTipo('fixo')
      setMesReferencia(String(new Date().getMonth() + 1))
      setAnoReferencia(String(new Date().getFullYear()))
    }
  }, [open, funcionarioId])

  const handleAddAdicional = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isEditMode) return
    if (!funcionarioId) return

    if (!descricao.trim()) {
      toast.error('Informe a descrição do adicional.')
      return
    }

    const valorFloat = parseFloat(valor.replace(',', '.'))
    if (isNaN(valorFloat) || valorFloat <= 0) {
      toast.error('Informe um valor válido maior que zero.')
      return
    }

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const payload = {
        funcionario_id: funcionarioId,
        descricao: descricao.trim(),
        valor: valorFloat,
        tipo,
        mes_referencia: tipo === 'pontual' ? parseInt(mesReferencia) : null,
        ano_referencia: tipo === 'pontual' ? parseInt(anoReferencia) : null,
        ativo: true,
        criado_por: user?.id || null
      }

      const { error } = await supabase
        .from('adicionais_salario')
        .insert(payload)

      if (error) throw error
      
      toast.success('Adicional adicionado com sucesso!')
      setDescricao('')
      setValor('')
      fetchAdicionais()
    } catch (err: any) {
      toast.error(`Erro ao salvar adicional: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleAtivo = async (id: string, currentAtivo: boolean) => {
    if (!isEditMode) return
    try {
      const { error } = await supabase
        .from('adicionais_salario')
        .update({ ativo: !currentAtivo })
        .eq('id', id)

      if (error) throw error
      toast.success(`Adicional ${!currentAtivo ? 'ativado' : 'inativado'} com sucesso!`)
      fetchAdicionais()
    } catch (err: any) {
      toast.error(`Erro ao alterar status: ${err.message}`)
    }
  }

  const handleDelete = async (id: string) => {
    if (!isEditMode) return
    try {
      const { error } = await supabase
        .from('adicionais_salario')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Adicional removido com sucesso!')
      fetchAdicionais()
    } catch (err: any) {
      toast.error(`Erro ao remover adicional: ${err.message}`)
    }
  }

  // Regex para permitir apenas números e até duas casas decimais com ponto ou vírgula
  const handleValorChange = (val: string) => {
    const cleanVal = val.replace(/[^0-9.,]/g, '')
    // Regex para validar se está no formato decimal aceitável (opcionalmente com até duas casas)
    if (/^\d*([.,]\d{0,2})?$/.test(cleanVal)) {
      setValor(cleanVal)
    }
  }

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Adicionais de Salário — ${funcionarioNome ?? 'Funcionário'}`}
      maxWidth="sm:max-w-[700px]"
      footer={
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          className="bg-[#1a1a1a] border-[#27272a] text-white hover:bg-[#27272a] h-9"
        >
          Fechar
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Formulário de Adição (Visível apenas em Modo de Edição) */}
        {isEditMode ? (
          <form onSubmit={handleAddAdicional} className="bg-[#18181a] border border-[#27272a] rounded-xl p-4 space-y-4">
            <h4 className="text-sm font-bold text-slate-300">Novo Adicional</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-[#aaa]">Descrição *</Label>
                <Input
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex: Hora Extra 50%, Adicional de Função"
                  className="bg-[#121214] border-[#27272a] text-white mt-1 h-9"
                  required
                />
              </div>

              <div>
                <Label className="text-xs text-[#aaa]">Valor (R$) *</Label>
                <Input
                  value={valor}
                  onChange={(e) => handleValorChange(e.target.value)}
                  placeholder="Ex: 350.00"
                  className="bg-[#121214] border-[#27272a] text-white mt-1 h-9"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-[#aaa]">Recorrência</Label>
                <select
                  value={tipo}
                  onChange={(e: any) => setTipo(e.target.value)}
                  className="w-full h-9 px-3 rounded-md bg-[#121214] border border-[#27272a] text-white text-sm outline-none mt-1"
                >
                  <option value="fixo">Recorrente (Fixo todo mês)</option>
                  <option value="pontual">Pontual (Mês/Ano específico)</option>
                </select>
              </div>

              {tipo === 'pontual' && (
                <>
                  <div>
                    <Label className="text-xs text-[#aaa]">Mês de Referência</Label>
                    <select
                      value={mesReferencia}
                      onChange={(e) => setMesReferencia(e.target.value)}
                      className="w-full h-9 px-3 rounded-md bg-[#121214] border border-[#27272a] text-white text-sm outline-none mt-1"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>
                          {new Date(2026, m - 1, 1).toLocaleString('pt-BR', { month: 'long' })}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs text-[#aaa]">Ano de Referência</Label>
                    <select
                      value={anoReferencia}
                      onChange={(e) => setAnoReferencia(e.target.value)}
                      className="w-full h-9 px-3 rounded-md bg-[#121214] border border-[#27272a] text-white text-sm outline-none mt-1"
                    >
                      {[-1, 0, 1].map((offset) => {
                        const year = new Date().getFullYear() + offset
                        return (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        )
                      })}
                    </select>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={saving}
                className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold h-9 gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Lançar Adicional
              </Button>
            </div>
          </form>
        ) : (
          <div className="bg-[#18181a]/50 border border-dashed border-[#27272a] rounded-xl p-3 text-center text-[#aaa] text-xs">
            Ative o Modo de Edição para lançar novos adicionais ou alterar registros.
          </div>
        )}

        {/* Listagem de Adicionais */}
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-slate-300">Histórico de Lançamentos</h4>
          {loadingList ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-yellow-500 animate-spin" />
            </div>
          ) : adicionais.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-[#27272a] rounded-xl text-muted-foreground">
              Nenhum adicional cadastrado para este funcionário.
            </div>
          ) : (
            <div className="border border-[#27272a] rounded-xl overflow-hidden bg-[#18181a]">
              <Table>
                <TableHeader className="bg-[#121214]">
                  <TableRow className="border-[#27272a] hover:bg-[#121214]">
                    <TableHead className="text-white text-xs font-bold">Descrição</TableHead>
                    <TableHead className="text-white text-xs font-bold">Tipo</TableHead>
                    <TableHead className="text-white text-xs font-bold">Competência</TableHead>
                    <TableHead className="text-white text-xs font-bold text-right">Valor</TableHead>
                    <TableHead className="text-white text-xs font-bold text-center">Status</TableHead>
                    {isEditMode && <TableHead className="text-white text-xs font-bold text-center w-24">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adicionais.map((ad) => (
                    <TableRow key={ad.id} className="border-[#27272a] hover:bg-[#1e1e21]">
                      <TableCell className="font-medium text-slate-200 text-xs">{ad.descricao}</TableCell>
                      <TableCell className="text-xs text-slate-400 capitalize">{ad.tipo}</TableCell>
                      <TableCell className="text-xs text-slate-400">
                        {ad.tipo === 'pontual' && ad.mes_referencia && ad.ano_referencia
                          ? `${String(ad.mes_referencia).padStart(2, '0')}/${ad.ano_referencia}`
                          : 'Recorrente'}
                      </TableCell>
                      <TableCell className="text-xs text-slate-200 text-right font-semibold">
                        {ad.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            ad.ativo
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {ad.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </TableCell>
                      {isEditMode && (
                        <TableCell className="flex items-center justify-center gap-1.5 h-full">
                          {ad.tipo === 'fixo' && (
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              onClick={() => handleToggleAtivo(ad.id, ad.ativo)}
                              title={ad.ativo ? 'Inativar adicional' : 'Ativar adicional'}
                              className="text-sky-400 hover:text-sky-300 hover:bg-sky-500/10"
                            >
                              {ad.ativo ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                            </Button>
                          )}
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={() => handleDelete(ad.id)}
                            title="Remover permanentemente"
                            className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </StandardDialog>
  )
}
