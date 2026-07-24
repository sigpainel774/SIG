'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { Plus, Trash2, RefreshCw, Users, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

export interface AlunoTransporteItem {
  id: string
  aluno_id: string
  rota_id: string
  ponto_embarque: string | null
  created_at: string
  alunos?: { id: string; nome: string; numero_matricula: string | null } | null
  rotas_transporte?: { id: string; nome: string; turno: string } | null
}

interface AlunosTabProps {
  onOpenAlocar: () => void
}

export function AlunosTab({ onOpenAlocar }: AlunosTabProps) {
  const supabase = createClient()
  const [alunosTransporte, setAlunosTransporte] = useState<AlunoTransporteItem[]>([])
  const [loading, setLoading] = useState(false)
  const isMounted = useRef(true)

  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  const loadAlunosTransporte = useCallback(async () => {
    setLoading(true)
    const { data, error } = await (supabase as any)
      .from('alunos_transporte')
      .select('id, aluno_id, rota_id, ponto_embarque, created_at, alunos(id, nome, numero_matricula), rotas_transporte(id, nome, turno)')
      .order('created_at', { ascending: false })

    if (isMounted.current) {
      if (error) {
        console.error('Erro ao carregar alunos do transporte:', error)
      } else if (data) {
        setAlunosTransporte(data)
      }
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadAlunosTransporte()
  }, [loadAlunosTransporte])

  const handleDesvincular = async (id: string) => {
    const confirm = window.confirm('Deseja realmente desvincular o aluno desta rota de transporte?')
    if (!confirm) return

    try {
      const { error } = await (supabase as any).from('alunos_transporte').delete().eq('id', id)
      if (error) throw error
      toast.success('Aluno desvinculado da rota.')
      loadAlunosTransporte()
    } catch (err: any) {
      toast.error('Erro ao desvincular aluno: ' + err.message)
    }
  }

  const getTurnoLabel = (turno?: string) => {
    if (!turno) return ''
    const map: Record<string, string> = { MANHA: 'Manhã', TARDE: 'Tarde', INTEGRAL: 'Integral' }
    return map[turno] ?? turno
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm font-semibold text-zinc-400">Alunos Enturmados em Rotas ({alunosTransporte.length} alunos)</span>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={loadAlunosTransporte}
            disabled={loading}
            className="text-zinc-400 hover:text-white border border-[#3f3f46]"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button onClick={onOpenAlocar} className="bg-sky-600 text-white hover:bg-sky-700">
            <UserPlus className="w-4 h-4 mr-2" /> Vincular Aluno à Rota
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-[#3f3f46] bg-[#121212] overflow-hidden">
        <Table>
          <TableHeader className="bg-[#181818] border-b border-[#3f3f46]">
            <TableRow className="border-none hover:bg-transparent">
              <TableHead className="text-[#ccc] font-semibold">Aluno / Matrícula</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Rota de Transporte</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Ponto de Embarque / Parada</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Data do Vínculo</TableHead>
              <TableHead className="text-right text-[#ccc] font-semibold">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-zinc-500">
                  Carregando vínculos de transporte de alunos...
                </TableCell>
              </TableRow>
            ) : alunosTransporte.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-zinc-500">
                  <div className="flex flex-col items-center gap-2">
                    <Users className="w-8 h-8 text-zinc-600" />
                    <span>Nenhum aluno vinculado a rotas de transporte.</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              alunosTransporte.map((item) => (
                <TableRow key={item.id} className="border-b border-[#27272a] hover:bg-[#1a1a1d]">
                  <TableCell className="font-semibold text-white">
                    <div>
                      <div className="font-bold">{item.alunos?.nome ?? 'Aluno Desconhecido'}</div>
                      <div className="text-xs text-zinc-500 font-mono">
                        Matrícula: {item.alunos?.numero_matricula ?? item.aluno_id}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-zinc-300">
                    <div>
                      <span className="font-semibold text-sky-400">{item.rotas_transporte?.nome ?? 'Rota Desconhecida'}</span>
                      {item.rotas_transporte?.turno && (
                        <div className="text-xs text-zinc-500">Turno: {getTurnoLabel(item.rotas_transporte.turno)}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-zinc-300">
                    {item.ponto_embarque ? (
                      <span className="text-zinc-300">{item.ponto_embarque}</span>
                    ) : (
                      <span className="text-zinc-600 italic">Ponto padrão</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-zinc-400 font-mono">
                    {new Date(item.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDesvincular(item.id)}
                      className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                      title="Desvincular da Rota"
                    >
                      <Trash2 className="w-4 h-4" />
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
