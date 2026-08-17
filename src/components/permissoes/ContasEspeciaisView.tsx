'use client'

import { useState, useMemo } from 'react'
import { Sparkles, Search, Star, ShieldAlert, AlertCircle, RefreshCw, UserCheck, XCircle, Briefcase, Plus, Check, Building2, GraduationCap, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ModalSecretariasConta } from '@/components/modals/modal-secretarias-conta'
import type { UsePermissoesReturn } from './usePermissoes'

interface ContasEspeciaisViewProps {
  hook: UsePermissoesReturn
}

export function ContasEspeciaisView({ hook }: ContasEspeciaisViewProps) {
  const {
    funcionariosAll,
    cargosLista = [],
    loading,
    isEditActive,
    handleToggleContaEspecial,
    handleToggleContaEja,
    handleUpdateCargo,
    handleAdicionarCargo,
    setModalSenhaOpen,
    fetchDadosContasEspeciais
  } = hook

  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<'todas' | 'especiais' | 'eja' | 'normais'>('todas')
  const [processandoId, setProcessandoId] = useState<string | null>(null)

  // Estado para cadastro de novo cargo no sistema
  const [mostrarNovoCargoForm, setMostrarNovoCargoForm] = useState(false)
  const [novoCargoNome, setNovoCargoNome] = useState('')
  const [salvandoNovoCargo, setSalvandoNovoCargo] = useState(false)

  // Estado para alteração rápida de cargo por conta
  const [editandoCargoId, setEditandoCargoId] = useState<string | null>(null)
  const [cargoSelecionadoIdMap, setCargoSelecionadoIdMap] = useState<Record<string, string>>({})
  const [cargoCustomInputMap, setCargoCustomInputMap] = useState<Record<string, string>>({})
  const [salvandoCargoFuncId, setSalvandoCargoFuncId] = useState<string | null>(null)

  // Estado para Modal Secretarias Conta
  const [modalSecretariasState, setModalSecretariasState] = useState<{ open: boolean; item: any | null }>({
    open: false,
    item: null
  })

  // Filtragem de funcionários em memória
  const contasFiltradas = useMemo(() => {
    return funcionariosAll.filter((f) => {
      const matchBusca =
        f.nome.toLowerCase().includes(busca.toLowerCase()) ||
        (f.email ?? '').toLowerCase().includes(busca.toLowerCase()) ||
        (f.cargo ?? '').toLowerCase().includes(busca.toLowerCase())

      const isEspecial = !!f.is_conta_especial
      const isEja = !!f.is_conta_eja

      let matchStatus = true
      if (filtroStatus === 'especiais') matchStatus = isEspecial
      if (filtroStatus === 'eja') matchStatus = isEja
      if (filtroStatus === 'normais') matchStatus = !isEspecial

      return matchBusca && matchStatus
    })
  }, [funcionariosAll, busca, filtroStatus])

  // Métricas do painel superior
  const totalEspeciais = useMemo(() => {
    return funcionariosAll.filter((f) => !!f.is_conta_especial).length
  }, [funcionariosAll])

  const totalEja = useMemo(() => {
    return funcionariosAll.filter((f) => !!f.is_conta_eja).length
  }, [funcionariosAll])

  const handleToggle = async (funcId: string, currentStatus: boolean, nome: string) => {
    if (!isEditActive) {
      setModalSenhaOpen(true)
      return
    }

    setProcessandoId(funcId)
    await handleToggleContaEspecial(funcId, !currentStatus, nome)
    setProcessandoId(null)
  }

  const handleToggleEja = async (funcId: string, currentStatus: boolean, nome: string) => {
    if (!isEditActive) {
      setModalSenhaOpen(true)
      return
    }

    setProcessandoId(funcId)
    await handleToggleContaEja(funcId, !currentStatus, nome)
    setProcessandoId(null)
  }

  // Submeter novo cargo ao catálogo
  const handleCadastrarNovoCargoSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoCargoNome.trim()) return

    setSalvandoNovoCargo(true)
    const ok = await handleAdicionarCargo(novoCargoNome)
    setSalvandoNovoCargo(false)

    if (ok) {
      setNovoCargoNome('')
      setMostrarNovoCargoForm(false)
    }
  }

  // Submeter alteração de cargo para uma conta
  const handleSalvarCargoConta = async (funcId: string, nomeFunc: string) => {
    if (!isEditActive) {
      setModalSenhaOpen(true)
      return
    }

    const selValue = cargoSelecionadoIdMap[funcId]
    const customValue = cargoCustomInputMap[funcId]

    let cargoFinal = selValue
    if (selValue === '__CUSTOM__') {
      cargoFinal = customValue
    }

    if (!cargoFinal || !cargoFinal.trim()) {
      return
    }

    setSalvandoCargoFuncId(funcId)
    await handleUpdateCargo(funcId, cargoFinal, nomeFunc)
    setSalvandoCargoFuncId(null)
    setEditandoCargoId(null)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Banner Informativo ────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-amber-500/5 dark:from-amber-500/10 dark:via-amber-500/5 dark:to-transparent border border-amber-500/40 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white tracking-tight">
                Gestão de Contas Especiais e Cargos Root
              </h2>
              <Badge variant="outline" className="border-amber-500/40 text-amber-800 dark:text-amber-300 bg-amber-500/15 dark:bg-amber-500/10 text-xs font-semibold">
                {totalEspeciais} {totalEspeciais === 1 ? 'Conta Especial' : 'Contas Especiais'}
              </Badge>
            </div>
            <p className="text-xs text-zinc-700 dark:text-zinc-300 mt-1 leading-relaxed max-w-3xl">
              Contas marcadas como <strong className="text-zinc-900 dark:text-white font-bold">Especiais</strong> (como Prefeito, Secretários ou contas de teste) 
              são <strong className="text-zinc-900 dark:text-white font-bold">omitidas das listas escolares padrão</strong>. Aqui você também pode atribuir e cadastrar cargos estratégicos da rede.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMostrarNovoCargoForm(!mostrarNovoCargoForm)}
            className="bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/40 text-amber-900 dark:text-amber-300 font-semibold text-xs gap-1.5 rounded-xl cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Novo Cargo</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchDadosContasEspeciais}
            disabled={loading}
            className="bg-card hover:bg-muted border-border text-zinc-700 dark:text-zinc-300 text-xs gap-2 rounded-xl cursor-pointer"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            <span>Atualizar</span>
          </Button>
        </div>
      </div>

      {/* ── Form Inline: Cadastrar Novo Cargo no Sistema ──────────────────── */}
      {mostrarNovoCargoForm && (
        <form
          onSubmit={handleCadastrarNovoCargoSubmit}
          className="bg-card border border-amber-500/40 rounded-2xl p-4 shadow-lg space-y-3 animate-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Briefcase className="w-4 h-4" />
            <span>Cadastrar Novo Cargo no Catálogo do Sistema</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Input
              type="text"
              placeholder="Ex: Prefeito(a) Municipal, Chefe de Gabinete..."
              value={novoCargoNome}
              onChange={(e) => setNovoCargoNome(e.target.value)}
              className="flex-1 bg-input border-border text-foreground text-sm rounded-xl focus:border-amber-500"
              autoFocus
            />

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                type="submit"
                disabled={salvandoNovoCargo || !novoCargoNome.trim()}
                className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs gap-1.5 rounded-xl h-10 px-4 w-full sm:w-auto cursor-pointer"
              >
                {salvandoNovoCargo ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Salvar Cargo</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => setMostrarNovoCargoForm(false)}
                className="bg-transparent border-border text-muted-foreground hover:text-foreground text-xs rounded-xl h-10 px-3 cursor-pointer"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* ── Painel de Filtros e Busca ───────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Busca por texto */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar conta por nome, e-mail ou cargo..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10 bg-input border-border text-foreground text-sm rounded-xl focus:border-[#0090ff] focus:ring-0"
            />
          </div>

          {/* Filtro por status */}
          <div className="inline-flex items-center bg-muted/80 p-1 rounded-xl border border-border shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setFiltroStatus('todas')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                filtroStatus === 'todas'
                  ? "bg-background text-foreground border border-border shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Todas ({funcionariosAll.length})
            </button>
            <button
              type="button"
              onClick={() => setFiltroStatus('especiais')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5",
                filtroStatus === 'especiais'
                  ? "bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/40 shadow-sm font-bold"
                  : "text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400"
              )}
            >
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 dark:fill-amber-400 dark:text-amber-400" />
              Especiais ({totalEspeciais})
            </button>
            <button
              type="button"
              onClick={() => setFiltroStatus('eja')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5",
                filtroStatus === 'eja'
                  ? "bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/40 shadow-sm font-bold"
                  : "text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400"
              )}
            >
              <GraduationCap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              EJA ({totalEja})
            </button>
            <button
              type="button"
              onClick={() => setFiltroStatus('normais')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                filtroStatus === 'normais'
                  ? "bg-blue-500/15 text-blue-700 dark:text-[#3ea6ff] border border-blue-500/40 shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Normais ({funcionariosAll.length - totalEspeciais})
            </button>
          </div>
        </div>

        {/* ── Lista / Grid de Contas ────────────────────────────────────────── */}
        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-sm animate-pulse space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-500" />
            <p>Carregando catálogo de contas do sistema...</p>
          </div>
        ) : contasFiltradas.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm flex flex-col items-center justify-center space-y-3 bg-muted/30 rounded-xl border border-dashed border-border">
            <AlertCircle className="w-8 h-8 text-amber-500" />
            <div>
              <p className="font-semibold text-foreground">Nenhuma conta encontrada</p>
              <p className="text-xs text-muted-foreground mt-1">Tente ajustar a busca ou os filtros de status acima.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {contasFiltradas.map((item) => {
              const isEspecial = !!item.is_conta_especial
              const isBusy = processandoId === item.id
              const isEditingCargo = editandoCargoId === item.id
              const isSavingCargo = salvandoCargoFuncId === item.id

              const cargoAtual = item.cargo ?? 'Cargo não informado'
              const selValue = cargoSelecionadoIdMap[item.id] ?? cargoAtual
              const isCustomSelected = selValue === '__CUSTOM__'

              return (
                <div
                  key={item.id}
                  className={cn(
                    "p-4 rounded-xl border transition-all flex flex-col justify-between gap-4 relative overflow-hidden",
                    isEspecial
                      ? "bg-amber-500/10 dark:bg-amber-950/20 border-amber-500/40 shadow-sm"
                      : "bg-card border-border hover:border-zinc-400 dark:hover:border-zinc-700"
                  )}
                >
                  {isEspecial && (
                    <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none overflow-hidden">
                      <div className="bg-amber-500 text-black font-extrabold text-[9px] py-0.5 text-center rotate-45 translate-x-4 translate-y-2 uppercase shadow-sm">
                        Especial
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2 wrap flex-wrap">
                          {item.nome}
                          {item.is_superadmin && (
                            <Badge variant="outline" className="border-red-500/40 text-red-600 dark:text-red-400 bg-red-500/10 text-[10px] uppercase font-bold py-0">
                              ROOT
                            </Badge>
                          )}
                          {item.is_conta_eja && (
                            <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-500/10 text-[10px] uppercase font-bold py-0">
                              ESPECIAL EJA
                            </Badge>
                          )}
                        </h4>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate max-w-[280px]">
                          {item.email ?? 'Sem e-mail cadastrado'}
                        </p>
                      </div>
                    </div>

                    {/* Exibição e Edição de Cargo */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-muted-foreground font-semibold flex items-center gap-1">
                          <Briefcase className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                          Cargo da Conta:
                        </span>
                        {!isEditingCargo && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditandoCargoId(item.id)
                              setCargoSelecionadoIdMap((prev) => ({ ...prev, [item.id]: cargoAtual }))
                            }}
                            className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-semibold cursor-pointer"
                          >
                            Alterar Cargo
                          </button>
                        )}
                      </div>

                      {isEditingCargo ? (
                        <div className="space-y-2 bg-muted/60 p-3 rounded-xl border border-amber-500/30 animate-in fade-in duration-150">
                          <select
                            value={selValue}
                            onChange={(e) => {
                              const v = e.target.value
                              setCargoSelecionadoIdMap((prev) => ({ ...prev, [item.id]: v }))
                            }}
                            className="w-full bg-card border border-border text-foreground text-xs rounded-lg p-2 focus:border-amber-500 cursor-pointer"
                          >
                            <optgroup label="Cargos Especiais & Cadastrados">
                              {cargosLista.map((cg) => (
                                <option key={cg} value={cg}>
                                  {cg}
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="Outro">
                              <option value="__CUSTOM__">+ Digitar outro cargo...</option>
                            </optgroup>
                          </select>

                          {isCustomSelected && (
                            <Input
                              type="text"
                              placeholder="Digite o cargo personalizado..."
                              value={cargoCustomInputMap[item.id] ?? ''}
                              onChange={(e) => {
                                const v = e.target.value
                                setCargoCustomInputMap((prev) => ({ ...prev, [item.id]: v }))
                              }}
                              className="bg-input border-border text-foreground text-xs rounded-lg h-9"
                              autoFocus
                            />
                          )}

                          <div className="flex items-center justify-end gap-2 pt-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setEditandoCargoId(null)}
                              className="h-7 text-[11px] bg-transparent border-border text-muted-foreground hover:text-foreground rounded-lg px-2 cursor-pointer"
                            >
                              Cancelar
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              disabled={isSavingCargo}
                              onClick={() => handleSalvarCargoConta(item.id, item.nome)}
                              className="h-7 text-[11px] bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-lg px-2.5 gap-1 cursor-pointer"
                            >
                              {isSavingCargo ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <Check className="w-3 h-3" />
                              )}
                              <span>Confirmar</span>
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="bg-amber-500/15 text-amber-900 dark:text-amber-300 px-3 py-1.5 rounded-lg border border-amber-500/30 text-xs font-bold tracking-wide">
                            {cargoAtual}
                          </span>

                          {((item.cargo ?? '').toLowerCase().includes('secretário') || (item.cargo ?? '').toLowerCase().includes('secretario')) && (item.cargo ?? '').toLowerCase().includes('educa') && (
                            <span className="text-[11px] bg-primary/15 text-primary border border-primary/30 px-2 py-1 rounded-md font-bold flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Calendário Acadêmico Liberado
                            </span>
                          )}
                          
                          {(item.is_superadmin || (item.acessos_usuarios ?? []).some((a: any) => a.nivel === 1)) && (
                            <button
                              type="button"
                              onClick={() => setModalSecretariasState({ open: true, item })}
                              className="ml-2 flex items-center gap-1 text-[11px] bg-[#0090ff]/10 hover:bg-[#0090ff]/20 text-[#0090ff] border border-[#0090ff]/30 px-2 py-1 rounded-md transition-colors cursor-pointer"
                              title="Gerenciar acesso às Secretarias"
                            >
                              <Building2 className="w-3 h-3" />
                              Secretarias
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {isEspecial ? (
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-800 dark:text-amber-300 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20 mt-2 font-medium">
                        <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-amber-500 dark:text-amber-400" />
                        <span>Oculto da listagem de funcionários e relatórios.</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-lg border border-border mt-2">
                        <UserCheck className="w-3.5 h-3.5 shrink-0 text-blue-500 dark:text-blue-400" />
                        <span>Conta normal (Visível em listagens e relatórios).</span>
                      </div>
                    )}
                  </div>

                  {/* Botão de Alternância e Checkbox Conta Especial EJA */}
                  <div className="pt-2 border-t border-border flex flex-wrap items-center justify-between gap-2">
                    <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white select-none">
                      <input
                        type="checkbox"
                        checked={!!item.is_conta_eja}
                        disabled={isBusy}
                        onChange={(e) => handleToggleEja(item.id, !!item.is_conta_eja, item.nome)}
                        className="w-4 h-4 rounded border-border bg-input text-amber-500 focus:ring-amber-500 cursor-pointer"
                      />
                      <span className="text-amber-600 dark:text-amber-400 font-medium">Conta especial EJA</span>
                    </label>

                    <Button
                      type="button"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => handleToggle(item.id, isEspecial, item.nome)}
                      className={cn(
                        "text-xs font-semibold rounded-xl gap-2 cursor-pointer transition-all",
                        isEspecial
                          ? "bg-muted hover:bg-muted/80 text-foreground border border-border"
                          : "bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20"
                      )}
                    >
                      {isBusy ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Atualizando...</span>
                        </>
                      ) : isEspecial ? (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>Remover Especial</span>
                        </>
                      ) : (
                        <>
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>Marcar como Especial</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal de Secretarias Conta */}
      <ModalSecretariasConta
        open={modalSecretariasState.open}
        onOpenChange={(open) => setModalSecretariasState(prev => ({ ...prev, open }))}
        funcionarioId={modalSecretariasState.item?.id}
        funcionarioNome={modalSecretariasState.item?.nome}
        isSuperAdmin={!!modalSecretariasState.item?.is_superadmin}
      />
    </div>
  )
}
