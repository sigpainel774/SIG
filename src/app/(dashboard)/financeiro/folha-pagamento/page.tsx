'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Banknote, Settings, CalendarRange, UserMinus, Coins, Eye, Loader2, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useFolhaPagamentoStore } from '@/store/useFolhaPagamentoStore'
import { useEditModeStore } from '@/store/useEditModeStore'
import { ModalAdicionalSalario } from '@/components/modals/modal-adicional-salario'
import { ModalProgramarDesligamento } from '@/components/modals/modal-programar-desligamento'
import { toast } from 'sonner'

export default function FolhaPagamentoPage() {
  const supabase = createClient()
  const { isEditMode } = useEditModeStore()
  
  // Zustand Store Filters
  const { tipoVinculo, escolaId, status, setTipoVinculo, setEscolaId, setStatus } = useFolhaPagamentoStore()

  // State
  const [funcionarios, setFuncionarios] = useState<any[]>([])
  const [escolas, setEscolas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Modal State
  const [selectedFunc, setSelectedFunc] = useState<{ id: string; nome: string } | null>(null)
  const [isAdicionalOpen, setIsAdicionalOpen] = useState(false)
  const [isDesligarOpen, setIsDesligarOpen] = useState(false)

  // Carrega escolas para lookup e filtro
  const fetchEscolas = async () => {
    try {
      const { data, error } = await supabase
        .from('escolas')
        .select('id, nome')
        .order('nome')
      if (error) throw error
      setEscolas(data || [])
    } catch (err: any) {
      console.error('Erro ao carregar escolas:', err)
    }
  }

  // Carrega funcionários baseado nos filtros
  const fetchFuncionarios = async () => {
    setLoading(true)
    try {
      // Começamos a query
      let query = supabase
        .from('funcionarios')
        .select(`
          id,
          nome,
          email,
          status,
          cargo,
          vinculos_funcionarios (
            id,
            escola_id,
            cargo,
            ativo,
            tipo_vinculo
          )
        `)
        .order('nome')

      const { data, error } = await query
      if (error) throw error

      // Filtragem client-side/in-memory para garantir exatidão do relacionamento aninhado
      let filtered: any[] = (data as any) || []

      filtered = filtered.map(f => {
        // Encontra o vínculo ativo ou o primeiro vínculo existente
        const vinculoAtivo = f.vinculos_funcionarios?.find((v: any) => v.ativo) || f.vinculos_funcionarios?.[0] || null
        return {
          ...f,
          vinculoAtivo
        }
      })

      // Aplica filtros se configurados
      if (tipoVinculo !== 'todos') {
        filtered = filtered.filter(f => f.vinculoAtivo?.tipo_vinculo === tipoVinculo)
      }

      if (escolaId !== 'todas') {
        filtered = filtered.filter(f => f.vinculoAtivo?.escola_id === escolaId)
      }

      if (status !== 'todos') {
        filtered = filtered.filter(f => {
          if (status === 'ativo') {
            return f.status === 'ativo' || f.vinculoAtivo?.ativo === true
          } else {
            return f.status === 'inativo' || f.vinculoAtivo?.ativo === false
          }
        })
      }

      setFuncionarios(filtered)
    } catch (err: any) {
      toast.error(`Erro ao carregar funcionários: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEscolas()
  }, [])

  useEffect(() => {
    fetchFuncionarios()
  }, [tipoVinculo, escolaId, status])

  const getEscolaNome = (id: string) => {
    if (!id) return 'Sem escola'
    return escolas.find((esc) => esc.id === id)?.nome ?? 'Carregando...'
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Módulo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#26262a]">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Banknote className="w-6 h-6 text-yellow-500" />
            Folha de Pagamento — Painel Administrativo
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Gestão contratual de funcionários, desligamentos programados e adicionais de salário.
          </p>
        </div>

        {/* Atalhos rápidos */}
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/financeiro/folha-pagamento/desligamentos">
            <Button variant="outline" className="bg-transparent border-[#27272a] text-slate-300 hover:text-white h-9">
              <CalendarRange className="w-4 h-4 mr-2 text-rose-400" />
              Desligamentos
            </Button>
          </Link>
          <Link href="/financeiro/folha-pagamento/configuracoes">
            <Button variant="outline" className="bg-transparent border-[#27272a] text-slate-300 hover:text-white h-9">
              <Settings className="w-4 h-4 mr-2 text-sky-400" />
              Configuração
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchFuncionarios}
            disabled={loading}
            className="text-muted-foreground hover:text-white h-9 w-9 bg-surface-1"
          >
            <RefreshCw className={`w-4 h-4 ${loading && 'animate-spin'}`} />
          </Button>
        </div>
      </div>

      {/* Painel de Filtros */}
      <div className="bg-[#141416] border border-[#26262a] rounded-2xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Filtro: Tipo de Vínculo */}
        <div className="space-y-1.5">
          <label className="text-xs text-[#aaa] font-semibold">Tipo de Vínculo</label>
          <Select value={tipoVinculo} onValueChange={(val: any) => setTipoVinculo(val)}>
            <SelectTrigger className="w-full bg-[#121214] border-[#27272a] text-white h-9">
              <SelectValue placeholder="Selecione o Vínculo" />
            </SelectTrigger>
            <SelectContent className="bg-[#18181b] border-[#27272a] text-white">
              <SelectItem value="todos">Todos os Vínculos</SelectItem>
              <SelectItem value="contratado">Contratado</SelectItem>
              <SelectItem value="nomeado">Nomeado</SelectItem>
              <SelectItem value="concursado">Concursado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Filtro: Escola */}
        <div className="space-y-1.5">
          <label className="text-xs text-[#aaa] font-semibold">Escola / Unidade</label>
          <Select value={escolaId} onValueChange={(val: any) => setEscolaId(val)}>
            <SelectTrigger className="w-full bg-[#121214] border-[#27272a] text-white h-9">
              <SelectValue>
                {escolaId === 'todas' ? 'Todas as Escolas' : (escolas.find((e) => e.id === escolaId)?.nome ?? (escolas.length === 0 ? 'Carregando...' : escolaId))}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-[#18181b] border-[#27272a] text-white">
              <SelectItem value="todas">Todas as Escolas</SelectItem>
              {escolas.map((esc) => (
                <SelectItem key={esc.id} value={esc.id}>
                  {esc.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filtro: Status */}
        <div className="space-y-1.5">
          <label className="text-xs text-[#aaa] font-semibold">Status do Vínculo</label>
          <Select value={status} onValueChange={(val: any) => setStatus(val)}>
            <SelectTrigger className="w-full bg-[#121214] border-[#27272a] text-white h-9">
              <SelectValue placeholder="Selecione o Status" />
            </SelectTrigger>
            <SelectContent className="bg-[#18181b] border-[#27272a] text-white">
              <SelectItem value="todos">Todos os Status</SelectItem>
              <SelectItem value="ativo">Ativos</SelectItem>
              <SelectItem value="inativo">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Listagem de Funcionários */}
      <div className="bg-[#141416] border border-[#26262a] rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
          </div>
        ) : funcionarios.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-base font-semibold">Nenhum funcionário encontrado</p>
            <p className="text-xs mt-1 text-slate-500">Tente ajustar seus filtros de busca para encontrar registros.</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-[#18181b] border-b border-[#26262a]">
              <TableRow className="border-[#26262a] hover:bg-[#18181b]">
                <TableHead className="text-white font-bold text-xs py-3.5">Nome</TableHead>
                <TableHead className="text-white font-bold text-xs">Vínculo (Cargo)</TableHead>
                <TableHead className="text-white font-bold text-xs">Escola</TableHead>
                <TableHead className="text-white font-bold text-xs">Tipo de Vínculo</TableHead>
                <TableHead className="text-white font-bold text-xs text-center">Status</TableHead>
                <TableHead className="text-white font-bold text-xs text-right pr-6 w-52">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {funcionarios.map((f) => {
                const cargoDisplay = f.vinculoAtivo?.cargo ?? f.cargo ?? 'Sem cargo cadastrado'
                const tipoDisplay = f.vinculoAtivo?.tipo_vinculo ?? 'Não definido'
                const vStatus = f.status === 'ativo' || f.vinculoAtivo?.ativo === true

                return (
                  <TableRow key={f.id} className="border-b border-[#26262a] hover:bg-[#1b1b1d] transition-colors">
                    <TableCell className="font-semibold text-slate-200 py-3 text-xs">{f.nome}</TableCell>
                    <TableCell className="text-xs text-slate-400 capitalize">{cargoDisplay}</TableCell>
                    <TableCell className="text-xs text-slate-400">
                      {f.vinculoAtivo?.escola_id ? getEscolaNome(f.vinculoAtivo.escola_id) : 'Sem lotação'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {tipoDisplay !== 'Não definido' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1e1e21] text-amber-400 border border-amber-500/20 capitalize">
                          {tipoDisplay}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          vStatus
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {vStatus ? 'Ativo' : 'Inativo'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedFunc(f)
                            setIsAdicionalOpen(true)
                          }}
                          className="h-8 text-xs text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10 gap-1"
                        >
                          <Coins className="w-3.5 h-3.5" />
                          Adicionais
                        </Button>
                        {vStatus && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedFunc(f)
                              setIsDesligarOpen(true)
                            }}
                            disabled={!isEditMode}
                            className="h-8 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                            Desligar
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Modais do Fluxo */}
      {selectedFunc && (
        <>
          <ModalAdicionalSalario
            open={isAdicionalOpen}
            onOpenChange={setIsAdicionalOpen}
            funcionarioId={selectedFunc.id}
            funcionarioNome={selectedFunc.nome}
          />
          <ModalProgramarDesligamento
            open={isDesligarOpen}
            onOpenChange={setIsDesligarOpen}
            funcionarioId={selectedFunc.id}
            funcionarioNome={selectedFunc.nome}
            onSuccess={fetchFuncionarios}
          />
        </>
      )}
    </div>
  )
}
