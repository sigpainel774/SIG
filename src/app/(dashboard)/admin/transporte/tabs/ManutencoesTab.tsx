'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { Plus, RefreshCw, Wrench, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export interface ManutencaoItem {
  id: string
  veiculo_id: string
  data: string
  tipo: string
  odometro_km: number
  descricao: string
  valor_total: number
  oficina_fornecedor: string | null
  proxima_revisao_km: number | null
  veiculos?: { modelo: string; placa: string } | null
}

interface ManutencoesTabProps {
  onOpenManutencao: () => void
}

export function ManutencoesTab({ onOpenManutencao }: ManutencoesTabProps) {
  const supabase = createClient()
  const [manutencoes, setManutencoes] = useState<ManutencaoItem[]>([])
  const [loading, setLoading] = useState(false)
  const isMounted = useRef(true)

  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  const loadManutencoes = useCallback(async () => {
    setLoading(true)
    const { data, error } = await (supabase as any)
      .from('manutencoes_veiculos')
      .select('id, veiculo_id, data, tipo, odometro_km, descricao, valor_total, oficina_fornecedor, proxima_revisao_km, created_at, veiculos(modelo, placa)')
      .order('data', { ascending: false })

    if (isMounted.current) {
      if (error) {
        console.error('Erro ao carregar manutenções:', error)
      } else if (data) {
        setManutencoes(data)
      }
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadManutencoes()
  }, [loadManutencoes])

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm font-semibold text-zinc-400">Histórico de Manutenções ({manutencoes.length} registros)</span>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={loadManutencoes}
            disabled={loading}
            className="text-zinc-400 hover:text-white border border-[#3f3f46]"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button onClick={onOpenManutencao} className="bg-amber-600 hover:bg-amber-700 text-white">
            <Wrench className="w-4 h-4 mr-2" /> Registrar Manutenção
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-[#3f3f46] bg-[#121212] overflow-hidden">
        <Table>
          <TableHeader className="bg-[#181818] border-b border-[#3f3f46]">
            <TableRow className="border-none hover:bg-transparent">
              <TableHead className="text-[#ccc] font-semibold">Veículo</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Data</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Tipo</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Odômetro (KM)</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Descrição do Serviço</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Oficina / Fornecedor</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Valor Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-zinc-500">
                  Carregando manutenções...
                </TableCell>
              </TableRow>
            ) : manutencoes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-zinc-500">
                  <div className="flex flex-col items-center gap-2">
                    <Wrench className="w-8 h-8 text-zinc-600" />
                    <span>Nenhuma manutenção registrada para a frota.</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              manutencoes.map((item) => (
                <TableRow key={item.id} className="border-b border-[#27272a] hover:bg-[#1a1a1d]">
                  <TableCell className="font-semibold text-white">
                    {item.veiculos ? (
                      <div>
                        <div className="font-bold">{item.veiculos.modelo}</div>
                        <div className="text-xs font-mono text-sky-400">{item.veiculos.placa}</div>
                      </div>
                    ) : (
                      <span className="text-zinc-500 italic">Veículo Removido</span>
                    )}
                  </TableCell>
                  <TableCell className="text-zinc-300 font-mono">
                    {new Date(item.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        item.tipo === 'CORRETIVA'
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      }
                    >
                      {item.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-zinc-300 font-mono">
                    {Number(item.odometro_km).toLocaleString('pt-BR')} km
                  </TableCell>
                  <TableCell className="text-zinc-300 text-xs max-w-xs truncate" title={item.descricao}>
                    {item.descricao}
                  </TableCell>
                  <TableCell className="text-zinc-400 text-xs">
                    {item.oficina_fornecedor ?? <span className="text-zinc-600">-</span>}
                  </TableCell>
                  <TableCell className="text-rose-400 font-bold font-mono">
                    R$ {Number(item.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
