'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { Plus, Edit, RefreshCw, Route } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { RotaItem } from '@/components/modals/modal-rota'

interface RotasTabProps {
  onOpenNovo: () => void
  onOpenEditar: (r: RotaItem) => void
}

export function RotasTab({ onOpenNovo, onOpenEditar }: RotasTabProps) {
  const supabase = createClient()
  const [rotas, setRotas] = useState<RotaItem[]>([])
  const [loading, setLoading] = useState(false)
  const isMounted = useRef(true)

  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  const loadRotas = useCallback(async () => {
    setLoading(true)
    const [{ data: rotasData, error: rotasErr }, { data: alunosData }] = await Promise.all([
      (supabase as any)
        .from('rotas_transporte')
        .select('id, nome, turno, ativo, veiculo_id, escola_id, motorista_id, horario_partida, horario_retorno, created_at, veiculos(modelo, placa, capacidade), escolas(nome), funcionarios(nome)')
        .order('created_at', { ascending: false }),
      (supabase as any)
        .from('alunos_transporte')
        .select('rota_id')
    ])

    if (isMounted.current) {
      if (rotasErr) {
        console.error('Erro ao carregar rotas:', rotasErr)
      } else if (rotasData) {
        const contagemAlunos: Record<string, number> = {}
        if (alunosData) {
          alunosData.forEach((a: any) => {
            if (a.rota_id) {
              contagemAlunos[a.rota_id] = (contagemAlunos[a.rota_id] || 0) + 1
            }
          })
        }

        setRotas(
          rotasData.map((r: any) => ({
            id: r.id,
            nome: r.nome ?? '',
            turno: r.turno ?? 'MANHA',
            ativo: r.ativo ?? true,
            veiculo_id: r.veiculo_id ?? null,
            escola_id: r.escola_id ?? null,
            motorista_id: r.motorista_id ?? null,
            horario_partida: r.horario_partida ?? null,
            horario_retorno: r.horario_retorno ?? null,
            veiculos: r.veiculos ?? null,
            escolas: r.escolas ?? null,
            motoristas: r.funcionarios ?? null,
            total_alunos: contagemAlunos[r.id] || 0,
          }))
        )
      }
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadRotas()
  }, [loadRotas])

  const getTurnoBadge = (turno: string) => {
    const map: Record<string, string> = {
      MANHA: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      TARDE: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
      INTEGRAL: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    }
    return map[turno] ?? 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
  }

  const getTurnoLabel = (turno: string) => {
    const map: Record<string, string> = { MANHA: 'Manhã', TARDE: 'Tarde', INTEGRAL: 'Integral' }
    return map[turno] ?? turno
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm font-semibold text-zinc-400">Rotas Cadastradas ({rotas.length} rotas)</span>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={loadRotas}
            disabled={loading}
            className="text-zinc-400 hover:text-white border border-[#3f3f46]"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button onClick={onOpenNovo} className="bg-sky-600 text-white hover:bg-sky-700">
            <Plus className="w-4 h-4 mr-2" /> Nova Rota
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-[#3f3f46] bg-[#121212] overflow-hidden">
        <Table>
          <TableHeader className="bg-[#181818] border-b border-[#3f3f46]">
            <TableRow className="border-none hover:bg-transparent">
              <TableHead className="text-[#ccc] font-semibold">Nome da Rota</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Turno</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Veículo / Motorista</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Escola Atendida</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Alunos Enturmados</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Horários</TableHead>
              <TableHead className="text-right text-[#ccc] font-semibold">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-zinc-500">
                  Carregando rotas de transporte...
                </TableCell>
              </TableRow>
            ) : rotas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-zinc-500">
                  <div className="flex flex-col items-center gap-2">
                    <Route className="w-8 h-8 text-zinc-600" />
                    <span>Nenhuma rota cadastrada.</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rotas.map((r) => (
                <TableRow key={r.id} className="border-b border-[#27272a] hover:bg-[#1a1a1d]">
                  <TableCell className="font-bold text-white">{r.nome}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getTurnoBadge(r.turno)}>
                      {getTurnoLabel(r.turno)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-zinc-300">
                    <div>
                      {r.veiculos ? (
                        <span className="font-semibold text-sky-400">{r.veiculos.modelo} ({r.veiculos.placa})</span>
                      ) : (
                        <span className="text-zinc-500 italic">Sem veículo</span>
                      )}
                      {r.motoristas?.nome && (
                        <div className="text-xs text-zinc-400">Motorista: {r.motoristas.nome}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-zinc-300">
                    {r.escolas?.nome ?? <span className="text-zinc-500 italic">Rede Geral</span>}
                  </TableCell>
                  <TableCell className="font-mono text-zinc-300">
                    <span className={r.total_alunos && r.veiculos?.capacidade && r.total_alunos > r.veiculos.capacidade ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                      {r.total_alunos ?? 0}
                    </span>
                    {r.veiculos?.capacidade ? ` / ${r.veiculos.capacidade}` : ''}
                  </TableCell>
                  <TableCell className="text-xs text-zinc-400 font-mono">
                    {r.horario_partida || r.horario_retorno ? (
                      <div>
                        {r.horario_partida ? `Saída: ${r.horario_partida}` : ''}
                        {r.horario_partida && r.horario_retorno ? ' | ' : ''}
                        {r.horario_retorno ? `Retorno: ${r.horario_retorno}` : ''}
                      </div>
                    ) : (
                      <span className="text-zinc-600">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onOpenEditar(r)}
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
