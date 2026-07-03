'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { DollarSign, Plus, Settings2, Download, TrendingUp, TrendingDown, Wallet } from 'lucide-react'

const mockTransacoes = [
  { id: 1, data: '15/10/2026', tipo: 'Receita', descricao: 'Repasse Municipal', categoria: 'Verba Pública', conta: 'Conta do Brasil', valor: 5400.00, comprovante: true },
  { id: 2, data: '16/10/2026', tipo: 'Despesa', descricao: 'Tintas e Cartolinas', categoria: 'Material Escolar', conta: 'Caixa Escolar', valor: 250.50, comprovante: true },
  { id: 3, data: '18/10/2026', tipo: 'Despesa', descricao: 'Manutenção do Ar Condicionado', categoria: 'Manutenção', conta: 'Conta do Brasil', valor: 450.00, comprovante: false },
]

export default function FinanceiroPage() {
  const [contaFiltro, setContaFiltro] = useState('todas')
  const [mesFiltro, setMesFiltro] = useState('2026-10')

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
          <Button variant="outline" className="bg-transparent border-[#3f3f46] text-[#aaa] hover:text-white">
            <Settings2 className="w-4 h-4 mr-2" /> Contas
          </Button>
          <Button variant="outline" className="bg-transparent border-[#3f3f46] text-[#aaa] hover:text-white">
            <Settings2 className="w-4 h-4 mr-2" /> Categorias
          </Button>
          <Button className="bg-highlight text-black hover:bg-highlight/90 font-bold">
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#181818] border border-[#2a2a2a] p-5 rounded-xl">
          <h3 className="text-[#aaa] text-sm mb-2 flex items-center gap-2">Saldo Acumulado</h3>
          <div className="text-2xl font-bold text-white">R$ 4.699,50</div>
        </div>
        
        <div className="bg-[#181818] border border-[#2a2a2a] p-5 rounded-xl border-t-2 border-t-green-500">
          <h3 className="text-[#aaa] text-sm mb-2 flex items-center gap-2">
            Receitas no Mês <TrendingUp className="w-4 h-4 text-green-500" />
          </h3>
          <div className="text-2xl font-bold text-green-400">R$ 5.400,00</div>
        </div>

        <div className="bg-[#181818] border border-[#2a2a2a] p-5 rounded-xl border-t-2 border-t-red-500">
          <h3 className="text-[#aaa] text-sm mb-2 flex items-center gap-2">
            Despesas no Mês <TrendingDown className="w-4 h-4 text-red-500" />
          </h3>
          <div className="text-2xl font-bold text-red-400">R$ 700,50</div>
        </div>
      </div>

      <div className="rounded-xl border border-[#3f3f46] bg-[#181818] overflow-hidden">
        <div className="p-4 border-b border-[#2a2a2a]">
          <h3 className="font-semibold text-white">Extrato de Movimentações</h3>
        </div>
        <Table>
          <TableHeader className="bg-[#1f1f1f]">
            <TableRow className="border-[#222] hover:bg-transparent">
              <TableHead className="text-[#ccc] font-medium">Data</TableHead>
              <TableHead className="text-[#ccc] font-medium">Tipo</TableHead>
              <TableHead className="text-[#ccc] font-medium">Descrição</TableHead>
              <TableHead className="text-[#ccc] font-medium">Categoria</TableHead>
              <TableHead className="text-[#ccc] font-medium">Conta / Verba</TableHead>
              <TableHead className="text-[#ccc] font-medium text-right">Valor</TableHead>
              <TableHead className="text-[#ccc] font-medium text-center">Comprovante</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockTransacoes.map((t) => (
              <TableRow key={t.id} className="border-[#222] hover:bg-[#1f1f1f]">
                <TableCell className="text-[#eee]">{t.data}</TableCell>
                <TableCell>
                  {t.tipo === 'Receita' ? (
                    <span className="bg-green-500/20 text-green-500 px-2 py-1 rounded-md text-[11px] font-bold">RECEITA</span>
                  ) : (
                    <span className="bg-red-500/20 text-red-500 px-2 py-1 rounded-md text-[11px] font-bold">DESPESA</span>
                  )}
                </TableCell>
                <TableCell className="text-[#eee] font-medium">{t.descricao}</TableCell>
                <TableCell className="text-[#aaa]">{t.categoria}</TableCell>
                <TableCell className="text-[#aaa]">{t.conta}</TableCell>
                <TableCell className={`text-right font-semibold ${t.tipo === 'Receita' ? 'text-green-400' : 'text-red-400'}`}>
                  {t.tipo === 'Receita' ? '+' : '-'} R$ {t.valor.toFixed(2).replace('.', ',')}
                </TableCell>
                <TableCell className="text-center">
                  {t.comprovante ? (
                    <Button variant="ghost" size="sm" className="h-7 border border-[#3ea6ff] text-[#3ea6ff] hover:bg-[#3ea6ff]/10 text-xs">
                      Ver Anexo
                    </Button>
                  ) : (
                    <span className="text-[#555] text-xs">Sem anexo</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-[#aaa] hover:text-white">
                    <Download className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
