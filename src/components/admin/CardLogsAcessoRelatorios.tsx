'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabaseClient'
import {
  ShieldAlert,
  Search,
  RefreshCw,
  Printer,
  Eye,
  Calendar,
  FileSpreadsheet,
  Users,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  Clock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface LogAcessoItem {
  id: string
  usuario_nome: string
  nivel_acesso: string
  relatorio: string
  escopo: string
  acao: string
  criado_em: string
}

export function CardLogsAcessoRelatorios() {
  const [logs, setLogs] = useState<LogAcessoItem[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [page, setPage] = useState<number>(0)
  const [filtroAcao, setFiltroAcao] = useState<string>('todos')
  const [filtroDataInicio, setFiltroDataInicio] = useState<string>('')
  const [filtroDataFim, setFiltroDataFim] = useState<string>('')
  const [busca, setBusca] = useState<string>('')
  const pageSize = 15

  const carregarLogs = useCallback(async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await (supabase as any).rpc('obter_logs_acesso_relatorios', {
        p_limit: pageSize,
        p_offset: page * pageSize,
        p_relatorio: 'emaee_estrategico',
        p_data_inicio: filtroDataInicio || null,
        p_data_fim: filtroDataFim || null,
      })

      if (error) throw error
      setLogs((data as unknown as LogAcessoItem[]) || [])
    } catch (err: any) {
      console.error('Erro ao carregar logs de acesso:', err)
      toast.error('Erro ao carregar logs de acesso ao relatório')
    } finally {
      setIsLoading(false)
    }
  }, [page, filtroDataInicio, filtroDataFim])

  useEffect(() => {
    carregarLogs()
  }, [carregarLogs])

  const logsFiltrados = logs.filter((log) => {
    const matchesAcao = filtroAcao === 'todos' || log.acao === filtroAcao
    const matchesBusca =
      busca === '' ||
      log.usuario_nome.toLowerCase().includes(busca.toLowerCase()) ||
      log.escopo.toLowerCase().includes(busca.toLowerCase()) ||
      log.nivel_acesso.toLowerCase().includes(busca.toLowerCase())
    return matchesAcao && matchesBusca
  })

  const getAcaoBadge = (acao: string) => {
    switch (acao) {
      case 'impressao':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-md text-[11px] font-semibold">
            <Printer className="w-3 h-3" /> Impressão A4
          </span>
        )
      case 'exportacao':
        return (
          <span className="inline-flex items-center gap-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-md text-[11px] font-semibold">
            <FileSpreadsheet className="w-3 h-3" /> Exportação
          </span>
        )
      case 'visualizacao':
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-md text-[11px] font-semibold">
            <Eye className="w-3 h-3" /> Visualização
          </span>
        )
    }
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5">
      {/* Header do Card */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Auditoria de Acessos: Relatório Estratégico EMAEE</h3>
            <p className="text-xs text-muted-foreground">
              Rastreamento em conformidade LGPD de consultas e impressões de dados agregados de saúde
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => carregarLogs()}
          disabled={isLoading}
          className="bg-secondary hover:bg-hoverCustom border-border text-foreground text-xs rounded-xl gap-2 h-8"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin text-primary')} />
          Atualizar
        </Button>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Busca por Nome/Escopo */}
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por usuário ou escopo..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full bg-secondary/50 border border-border rounded-xl pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          {/* Filtro de Ação */}
          <div className="flex items-center bg-secondary/50 border border-border rounded-xl px-2.5 py-1 gap-1.5">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              aria-label="Filtrar por Ação"
              value={filtroAcao}
              onChange={(e) => setFiltroAcao(e.target.value)}
              className="bg-transparent text-foreground outline-none cursor-pointer"
            >
              <option value="todos" className="bg-popover text-popover-foreground">Todas as Ações</option>
              <option value="visualizacao" className="bg-popover text-popover-foreground">Apenas Visualizações</option>
              <option value="impressao" className="bg-popover text-popover-foreground">Apenas Impressões A4</option>
            </select>
          </div>
        </div>

        {/* Paginação */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-[11px]">Página {page + 1}</span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0 || isLoading}
            className="h-7 w-7 rounded-lg border-border"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage((p) => p + 1)}
            disabled={logs.length < pageSize || isLoading}
            className="h-7 w-7 rounded-lg border-border"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Tabela de Logs */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-border text-muted-foreground font-semibold">
              <th className="pb-2 pl-2">Usuário</th>
              <th className="pb-2">Nível de Acesso</th>
              <th className="pb-2">Escopo Consultado</th>
              <th className="pb-2 text-center">Ação</th>
              <th className="pb-2 text-right pr-2">Data / Hora</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-muted-foreground animate-pulse">
                  Carregando trilha de auditoria...
                </td>
              </tr>
            ) : logsFiltrados.length > 0 ? (
              logsFiltrados.map((item) => (
                <tr key={item.id} className="hover:bg-hoverCustom/40 transition-colors">
                  <td className="py-2.5 pl-2 font-medium text-foreground">{item.usuario_nome}</td>
                  <td className="py-2.5 text-muted-foreground">{item.nivel_acesso}</td>
                  <td className="py-2.5 font-medium text-foreground truncate max-w-[200px]">{item.escopo}</td>
                  <td className="py-2.5 text-center">{getAcaoBadge(item.acao)}</td>
                  <td className="py-2.5 text-right pr-2 text-muted-foreground">
                    {new Date(item.criado_em).toLocaleDateString('pt-BR')}{' '}
                    <span className="text-[10px]">
                      {new Date(item.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-8 text-center text-muted-foreground italic">
                  Nenhum registro de acesso encontrado para os filtros selecionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
