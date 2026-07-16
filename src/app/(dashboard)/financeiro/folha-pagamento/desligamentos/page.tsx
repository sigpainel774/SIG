'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, UserMinus, Check, Trash2, Loader2, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useEditModeStore } from '@/store/useEditModeStore'
import { toast } from 'sonner'

export default function DesligamentosPage() {
  const supabase = createClient()
  const { isEditMode } = useEditModeStore()

  // State
  const [desligamentos, setDesligamentos] = useState<any[]>([])
  const [statusFiltro, setStatusFiltro] = useState<string>('todos')
  const [loading, setLoading] = useState(true)

  const fetchDesligamentos = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('desligamentos_programados')
        .select(`
          id,
          data_desligamento,
          motivo,
          status,
          created_at,
          vinculo_id,
          funcionarios (
            id,
            nome,
            cargo
          )
        `)
        .order('data_desligamento', { ascending: true })

      if (statusFiltro !== 'todos') {
        query = query.eq('status', statusFiltro)
      }

      const { data, error } = await query
      if (error) throw error
      setDesligamentos(data || [])
    } catch (err: any) {
      toast.error(`Erro ao buscar desligamentos: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDesligamentos()
  }, [statusFiltro])

  const handleEfetivar = async (desligamento: any) => {
    if (!isEditMode) return
    
    // Inicia uma transação simulada (executando sequencialmente)
    try {
      // 1. Atualizar o status do desligamento para efetivado
      const { error: errorDesl } = await supabase
        .from('desligamentos_programados')
        .update({ status: 'efetivado' })
        .eq('id', desligamento.id)

      if (errorDesl) throw errorDesl

      // 2. Atualizar o vínculo de funcionário para inativo
      if (desligamento.vinculo_id) {
        const { error: errorVinc } = await supabase
          .from('vinculos_funcionarios')
          .update({
            ativo: false,
            data_fim: desligamento.data_desligamento
          })
          .eq('id', desligamento.vinculo_id)

        if (errorVinc) throw errorVinc
      }

      toast.success('Desligamento efetivado com sucesso! Vínculo inativado.')
      fetchDesligamentos()
    } catch (err: any) {
      toast.error(`Erro ao efetivar desligamento: ${err.message}`)
    }
  }

  const handleCancelar = async (id: string) => {
    if (!isEditMode) return
    try {
      const { error } = await supabase
        .from('desligamentos_programados')
        .update({ status: 'cancelado' })
        .eq('id', id)

      if (error) throw error
      toast.success('Programação de desligamento cancelada.')
      fetchDesligamentos()
    } catch (err: any) {
      toast.error(`Erro ao cancelar desligamento: ${err.message}`)
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 pb-4 border-b border-[#26262a]">
        <Link href="/financeiro/folha-pagamento">
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white h-9 w-9 bg-surface-1">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <UserMinus className="w-6 h-6 text-rose-500" />
            Programação de Desligamentos
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Lista de encerramentos contratuais futuros programados pela liderança.
          </p>
        </div>
      </div>

      {/* Filtros e Ações */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#141416] border border-[#26262a] rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#aaa] font-semibold">Filtrar por Status</span>
          <Select value={statusFiltro} onValueChange={(val) => setStatusFiltro(val ?? 'todos')}>
            <SelectTrigger className="w-[200px] bg-[#121214] border-[#27272a] text-white h-9">
              <SelectValue placeholder="Selecione o Status" />
            </SelectTrigger>
            <SelectContent className="bg-[#18181b] border-[#27272a] text-white">
              <SelectItem value="todos">Todos os Status</SelectItem>
              <SelectItem value="programado">Programados</SelectItem>
              <SelectItem value="efetivado">Efetivados</SelectItem>
              <SelectItem value="cancelado">Cancelados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={fetchDesligamentos}
          disabled={loading}
          className="text-muted-foreground hover:text-white h-9 w-9 bg-surface-1"
        >
          <RefreshCw className={`w-4 h-4 ${loading && 'animate-spin'}`} />
        </Button>
      </div>

      {/* Tabela de Desligamentos */}
      <div className="bg-[#141416] border border-[#26262a] rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
          </div>
        ) : desligamentos.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-base font-semibold">Nenhum desligamento encontrado</p>
            <p className="text-xs mt-1 text-slate-500">Nenhum funcionário está agendado para desligamento no momento.</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-[#18181b] border-b border-[#26262a]">
              <TableRow className="border-[#26262a] hover:bg-[#18181b]">
                <TableHead className="text-white font-bold text-xs py-3.5">Funcionário</TableHead>
                <TableHead className="text-white font-bold text-xs">Cargo do Vínculo</TableHead>
                <TableHead className="text-white font-bold text-xs">Data de Desligamento</TableHead>
                <TableHead className="text-white font-bold text-xs">Motivo</TableHead>
                <TableHead className="text-white font-bold text-xs text-center">Status</TableHead>
                {isEditMode && <TableHead className="text-white font-bold text-xs text-right pr-6 w-52">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {desligamentos.map((d) => {
                const dataFormatada = d.data_desligamento
                  ? new Date(d.data_desligamento + 'T00:00:00').toLocaleDateString('pt-BR')
                  : '—'
                
                const statusBadgeStyle = 
                  d.status === 'programado'
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    : d.status === 'efetivado'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'

                return (
                  <TableRow key={d.id} className="border-b border-[#26262a] hover:bg-[#1b1b1d] transition-colors">
                    <TableCell className="font-semibold text-slate-200 py-3 text-xs">
                      {d.funcionarios?.nome ?? 'Funcionário Excluído'}
                    </TableCell>
                    <TableCell className="text-xs text-slate-400 capitalize">
                      {d.funcionarios?.cargo ?? 'Não disponível'}
                    </TableCell>
                    <TableCell className="text-xs text-slate-200 font-semibold">{dataFormatada}</TableCell>
                    <TableCell className="text-xs text-slate-400 max-w-xs truncate" title={d.motivo}>
                      {d.motivo ?? 'Sem motivo informado'}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${statusBadgeStyle}`}>
                        {d.status}
                      </span>
                    </TableCell>
                    {isEditMode && (
                      <TableCell className="text-right pr-4">
                        {d.status === 'programado' && (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEfetivar(d)}
                              className="h-8 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 gap-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Efetivar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCancelar(d.id)}
                              className="h-8 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 gap-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Cancelar
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
