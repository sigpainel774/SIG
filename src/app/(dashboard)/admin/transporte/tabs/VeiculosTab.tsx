'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { Plus, Edit, RefreshCw, Bus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { VeiculoItem } from '@/components/modals/modal-veiculo'

interface VeiculosTabProps {
  onOpenNovo: () => void
  onOpenEditar: (v: VeiculoItem) => void
}

export function VeiculosTab({ onOpenNovo, onOpenEditar }: VeiculosTabProps) {
  const supabase = createClient()
  const [veiculos, setVeiculos] = useState<VeiculoItem[]>([])
  const [loading, setLoading] = useState(false)
  const isMounted = useRef(true)

  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  const loadVeiculos = useCallback(async () => {
    setLoading(true)
    const { data, error } = await (supabase as any)
      .from('veiculos')
      .select('id, placa, modelo, capacidade, status, motorista_id, created_at, funcionarios(nome)')
      .order('created_at', { ascending: false })

    if (isMounted.current) {
      if (error) {
        console.error('Erro ao carregar veículos:', error)
      } else if (data) {
        setVeiculos(
          data.map((v: any) => ({
            id: v.id,
            placa: v.placa ?? '',
            modelo: v.modelo ?? '',
            capacidade: v.capacidade ?? 40,
            status: v.status ?? 'ATIVO',
            motorista_id: v.motorista_id ?? null,
            funcionarios: v.funcionarios ?? null,
          }))
        )
      }
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadVeiculos()
  }, [loadVeiculos])

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      ATIVO: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      MANUTENCAO: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      INATIVO: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
    }
    return map[status] ?? 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm font-semibold text-zinc-400">Frota Cadastrada ({veiculos.length} veículos)</span>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={loadVeiculos}
            disabled={loading}
            className="text-zinc-400 hover:text-white border border-[#3f3f46]"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button onClick={onOpenNovo} className="bg-sky-600 text-white hover:bg-sky-700">
            <Plus className="w-4 h-4 mr-2" /> Novo Veículo
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-[#3f3f46] bg-[#121212] overflow-hidden">
        <Table>
          <TableHeader className="bg-[#181818] border-b border-[#3f3f46]">
            <TableRow className="border-none hover:bg-transparent">
              <TableHead className="text-[#ccc] font-semibold">Veículo</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Motorista Responsável</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Capacidade</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Status</TableHead>
              <TableHead className="text-right text-[#ccc] font-semibold">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-zinc-500">
                  Carregando veículos...
                </TableCell>
              </TableRow>
            ) : veiculos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-zinc-500">
                  <div className="flex flex-col items-center gap-2">
                    <Bus className="w-8 h-8 text-zinc-600" />
                    <span>Nenhum veículo cadastrado na frota.</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              veiculos.map((v) => (
                <TableRow key={v.id} className="border-b border-[#27272a] hover:bg-[#1a1a1d]">
                  <TableCell className="font-semibold text-white">
                    <div>
                      <div className="font-bold">{v.modelo}</div>
                      <div className="text-xs font-mono text-sky-400">{v.placa}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-zinc-300">
                    {v.funcionarios?.nome ?? <span className="text-zinc-500 italic">Não atribuído</span>}
                  </TableCell>
                  <TableCell className="text-zinc-300 font-mono">{v.capacidade} assentos</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusBadge(v.status)}>
                      {v.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onOpenEditar(v)}
                      className="text-sky-400 hover:text-sky-300 hover:bg-sky-500/10"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
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
