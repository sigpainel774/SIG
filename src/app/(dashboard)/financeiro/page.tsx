'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StandardTable } from '@/components/ui/table'
import { Plus, Settings2, Download, TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { ModalLancamentoFinanceiro } from '@/components/ModalLancamentoFinanceiro'
import { useAuthStore } from '@/store/useAuthStore'
import { toast } from 'sonner'

export default function FinanceiroPage() {
  const [contaFiltro, setContaFiltro] = useState('todas')
  const [mesFiltro, setMesFiltro] = useState('')
  const [transacoes, setTransacoes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalLancamentoOpen, setIsModalLancamentoOpen] = useState(false)
  const supabase = createClient()
  const escolaAtivaId = useAuthStore((state) => state.escolaAtivaId)

  const fetchTransacoes = async () => {
    setLoading(true)
    try {
      let query = supabase.from('transacoes_financeiras').select('*')
      
      if (escolaAtivaId) {
        query = query.eq('escola_id', escolaAtivaId)
      }

      const { data, error } = await query.order('data', { ascending: false })
      
      if (error) throw error
      setTransacoes(data || [])
    } catch (err: any) {
      toast.error('Erro ao carregar transações financeiras: ' + err.message)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransacoes()
  }, [escolaAtivaId])

  // Filtragem local baseada nos filtros de conta e mês
  const transacoesFiltradas = useMemo(() => {
    return transacoes.filter((t) => {
      // Filtro de conta
      let matchConta = true
      if (contaFiltro === 'caixa') {
        matchConta = t.conta === 'Caixa Escolar'
      } else if (contaFiltro === 'brasil') {
        matchConta = t.conta === 'Conta do Brasil'
      }

      // Filtro de mês (formato YYYY-MM comparando com data YYYY-MM-DD)
      let matchMes = true
      if (mesFiltro) {
        matchMes = t.data && t.data.startsWith(mesFiltro)
      }

      return matchConta && matchMes
    })
  }, [transacoes, contaFiltro, mesFiltro])

  // Cálculo dinâmico dos totais a partir das transações filtradas
  const { totalReceitas, totalDespesas, saldoTotal } = useMemo(() => {
    let receitas = 0
    let despesas = 0

    transacoesFiltradas.forEach((t) => {
      const val = Number(t.valor) || 0
      if (t.tipo === 'Receita') {
        receitas += val
      } else if (t.tipo === 'Despesa') {
        despesas += val
      }
    })

    return {
      totalReceitas: receitas,
      totalDespesas: despesas,
      saldoTotal: receitas - despesas
    }
  }, [transacoesFiltradas])

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#3f3f46]">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Wallet className="w-6 h-6 text-green-500" /> 
            Caixa da Escola
          </h2>
          <p className="text-[#aaa] text-sm mt-1">Gestão financeira, extratos e prestação de contas.</p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" className="bg-transparent border-[#3f3f46] text-[#aaa] hover:text-white cursor-pointer">
            <Settings2 className="w-4 h-4 mr-2" /> Contas
          </Button>
          <Button variant="outline" className="bg-transparent border-[#3f3f46] text-[#aaa] hover:text-white cursor-pointer">
            <Settings2 className="w-4 h-4 mr-2" /> Categorias
          </Button>
          <Button 
            className="bg-highlight text-black hover:bg-highlight/90 font-bold cursor-pointer"
            onClick={() => setIsModalLancamentoOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" /> Lançamento
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Select value={contaFiltro} onValueChange={(val) => val && setContaFiltro(val)}>
          <SelectTrigger className="w-[300px] bg-[#121212] border-[#3f3f46] text-white">
            <SelectValue placeholder="Visão Geral (Todas as Contas)" />
          </SelectTrigger>
          <SelectContent className="bg-[#18181b] border-[#3f3f46] text-white">
            <SelectItem value="todas">Visão Geral (Todas as Contas)</SelectItem>
            <SelectItem value="brasil">Conta do Brasil</SelectItem>
            <SelectItem value="caixa">Caixa Escolar</SelectItem>
          </SelectContent>
        </Select>

        <Input 
          type="month"
          value={mesFiltro}
          onChange={(e) => setMesFiltro(e.target.value)}
          className="w-[200px] bg-[#121212] border-[#3f3f46] text-white"
        />
      </div>

      {/* Cartões de Resumo Calculados Dinamicamente */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#181818] border border-[#2a2a2a] p-5 rounded-xl shadow-md">
          <h3 className="text-[#aaa] text-sm mb-2 flex items-center gap-2 font-medium">Saldo Acumulado</h3>
          <div className={`text-2xl font-bold ${saldoTotal < 0 ? 'text-red-400' : 'text-white'}`}>
            {formatCurrency(saldoTotal)}
          </div>
        </div>
        
        <div className="bg-[#181818] border border-[#2a2a2a] p-5 rounded-xl border-t-2 border-t-green-500 shadow-md">
          <h3 className="text-[#aaa] text-sm mb-2 flex items-center gap-2 font-medium">
            Receitas no Mês <TrendingUp className="w-4 h-4 text-green-500" />
          </h3>
          <div className="text-2xl font-bold text-green-400">
            {formatCurrency(totalReceitas)}
          </div>
        </div>

        <div className="bg-[#181818] border border-[#2a2a2a] p-5 rounded-xl border-t-2 border-t-red-500 shadow-md">
          <h3 className="text-[#aaa] text-sm mb-2 flex items-center gap-2 font-medium">
            Despesas no Mês <TrendingDown className="w-4 h-4 text-red-500" />
          </h3>
          <div className="text-2xl font-bold text-red-400">
            {formatCurrency(totalDespesas)}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white text-lg">Extrato de Movimentações</h3>
        </div>
        <StandardTable
          data={transacoesFiltradas}
          keyExtractor={(t) => t.id}
          loading={loading}
          loadingMessage="Carregando extrato financeiro..."
          emptyMessage="Nenhuma transação financeira foi registrada para esta escola."
          columns={[
            {
              header: "Data",
              accessor: (t) => t.data ? new Date(t.data).toLocaleDateString('pt-BR') : '-',
            },
            {
              header: "Tipo",
              accessor: (t) => t.tipo === 'Receita' ? (
                <span className="bg-green-500/20 text-green-500 px-2 py-1 rounded-md text-[11px] font-bold">RECEITA</span>
              ) : (
                <span className="bg-red-500/20 text-red-500 px-2 py-1 rounded-md text-[11px] font-bold">DESPESA</span>
              ),
            },
            {
              header: "Descrição",
              accessor: (t) => t.descricao,
              className: "font-medium text-white",
            },
            {
              header: "Categoria",
              accessor: (t) => t.categoria || '-',
              className: "text-zinc-400",
            },
            {
              header: "Conta / Verba",
              accessor: (t) => t.conta || '-',
              className: "text-zinc-400",
            },
            {
              header: "Valor",
              accessor: (t) => (
                <span className={`font-semibold ${t.tipo === 'Receita' ? 'text-green-400' : 'text-red-400'}`}>
                  {t.tipo === 'Receita' ? '+' : '-'} {formatCurrency(Number(t.valor) || 0)}
                </span>
              ),
              className: "text-right",
              headClassName: "text-right",
            },
            {
              header: "Comprovante",
              accessor: (t) => t.comprovante_url ? (
                <a href={t.comprovante_url} target="_blank" rel="noreferrer">
                  <Button variant="ghost" size="sm" className="h-7 border border-[#3ea6ff] text-[#3ea6ff] hover:bg-[#3ea6ff]/10 text-xs cursor-pointer">
                    Ver Anexo
                  </Button>
                </a>
              ) : (
                <span className="text-[#555] text-xs">Sem anexo</span>
              ),
              className: "text-center",
              headClassName: "text-center",
            },
            {
              header: "",
              accessor: () => (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-[#aaa] hover:text-white cursor-pointer">
                  <Download className="w-4 h-4" />
                </Button>
              ),
              className: "text-right",
            }
          ]}
        />
      </div>

      <ModalLancamentoFinanceiro 
        open={isModalLancamentoOpen} 
        onOpenChange={setIsModalLancamentoOpen} 
        onSuccess={fetchTransacoes} 
      />
    </div>
  )
}
