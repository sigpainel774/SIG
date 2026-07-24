'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { Plus, RefreshCw, Fuel, TrendingDown, Gauge } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export interface AbastecimentoItem {
  id: string
  veiculo_id: string
  data: string
  odometro_km: number
  litros: number
  valor_total: number
  tipo_combustivel: string
  posto_nota: string | null
  veiculos?: { modelo: string; placa: string } | null
  consumo_medio?: number | null
}

interface CombustivelTabProps {
  onOpenAbastecimento: () => void
}

export function CombustivelTab({ onOpenAbastecimento }: CombustivelTabProps) {
  const supabase = createClient()
  const [abastecimentos, setAbastecimentos] = useState<AbastecimentoItem[]>([])
  const [loading, setLoading] = useState(false)
  const isMounted = useRef(true)

  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  const loadAbastecimentos = useCallback(async () => {
    setLoading(true)
    const { data, error } = await (supabase as any)
      .from('abastecimentos_veiculos')
      .select('id, veiculo_id, data, odometro_km, litros, valor_total, tipo_combustivel, posto_nota, created_at, veiculos(modelo, placa)')
      .order('odometro_km', { ascending: false })

    if (isMounted.current) {
      if (error) {
        console.error('Erro ao carregar abastecimentos:', error)
      } else if (data) {
        // Calcular consumo médio (km/L) ordenando cronologicamente por veículo
        const porVeiculo: Record<string, any[]> = {}
        data.forEach((item: any) => {
          if (!porVeiculo[item.veiculo_id]) porVeiculo[item.veiculo_id] = []
          porVeiculo[item.veiculo_id].push(item)
        })

        const calculados = data.map((item: any) => {
          const lista = porVeiculo[item.veiculo_id] || []
          const anteriores = lista.filter((a) => a.odometro_km < item.odometro_km)
          if (anteriores.length > 0) {
            const ultimo = anteriores.reduce((prev, curr) => (curr.odometro_km > prev.odometro_km ? curr : prev), anteriores[0])
            const kmRodados = item.odometro_km - ultimo.odometro_km
            const media = item.litros > 0 ? parseFloat((kmRodados / item.litros).toFixed(2)) : null
            return { ...item, consumo_medio: media }
          }
          return { ...item, consumo_medio: null }
        })

        setAbastecimentos(calculados)
      }
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadAbastecimentos()
  }, [loadAbastecimentos])

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm font-semibold text-zinc-400">Histórico de Abastecimentos ({abastecimentos.length} registros)</span>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={loadAbastecimentos}
            disabled={loading}
            className="text-zinc-400 hover:text-white border border-[#3f3f46]"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button onClick={onOpenAbastecimento} className="bg-[#0090ff] hover:bg-[#0570c9] text-white">
            <Fuel className="w-4 h-4 mr-2" /> Novo Abastecimento
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-[#3f3f46] bg-[#121212] overflow-hidden">
        <Table>
          <TableHeader className="bg-[#181818] border-b border-[#3f3f46]">
            <TableRow className="border-none hover:bg-transparent">
              <TableHead className="text-[#ccc] font-semibold">Veículo</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Data</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Odômetro (KM)</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Litros</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Valor Total</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Consumo Médio</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Posto / Nota Fiscal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-zinc-500">
                  Carregando abastecimentos...
                </TableCell>
              </TableRow>
            ) : abastecimentos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-zinc-500">
                  <div className="flex flex-col items-center gap-2">
                    <Fuel className="w-8 h-8 text-zinc-600" />
                    <span>Nenhum registro de abastecimento encontrado.</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              abastecimentos.map((item) => (
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
                  <TableCell className="text-zinc-300 font-mono">
                    <div className="flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{Number(item.odometro_km).toLocaleString('pt-BR')} km</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-amber-400 font-bold font-mono">
                    {Number(item.litros).toFixed(2)} L
                  </TableCell>
                  <TableCell className="text-emerald-400 font-bold font-mono">
                    R$ {Number(item.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    {item.consumo_medio ? (
                      <Badge variant="outline" className="bg-sky-500/10 text-sky-400 border-sky-500/20 font-mono">
                        <TrendingDown className="w-3 h-3 mr-1" />
                        {item.consumo_medio} km/L
                      </Badge>
                    ) : (
                      <span className="text-zinc-600 text-xs italic">1º Abastecimento</span>
                    )}
                  </TableCell>
                  <TableCell className="text-zinc-400 text-xs">
                    {item.posto_nota ?? <span className="text-zinc-600">-</span>}
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
