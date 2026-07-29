'use client'

import { useState, useEffect } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import {
  MapPin,
  X,
  Loader2,
  Building2,
  User,
  ArrowLeft,
} from 'lucide-react'
import { useGestaoLotacoes, FuncItem } from '@/hooks/useGestaoLotacoes'
import { TurmasCoordenadorSection } from '@/components/TurmasCoordenadorSection'
import { FuncionarioLotacaoList } from './lotacoes/FuncionarioLotacaoList'
import { NovaLotacaoForm } from './lotacoes/NovaLotacaoForm'
import { TransferenciaImediataForm } from './lotacoes/TransferenciaImediataForm'
import { SolicitarTransferenciaForm } from './lotacoes/SolicitarTransferenciaForm'
import { CachedImage } from '@/components/ui/cached-image'

interface ModalGestaoLotacoesProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  funcionarioInicial?: { id: string } | null
}

function getInitials(nome: string): string {
  const parts = nome.trim().split(' ').filter(Boolean)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const AVATAR_COLORS = [
  { bg: 'bg-[#1a3a5c]', text: 'text-[#60a5fa]' },
  { bg: 'bg-[#1a2e1a]', text: 'text-[#4ade80]' },
  { bg: 'bg-[#3a1a1a]', text: 'text-[#f87171]' },
  { bg: 'bg-[#2e1a3a]', text: 'text-[#c084fc]' },
  { bg: 'bg-[#3a2e1a]', text: 'text-[#fbbf24]' },
  { bg: 'bg-[#1a3a3a]', text: 'text-[#34d399]' },
]

function avatarColor(nome: string) {
  let hash = 0
  for (let i = 0; i < nome.length; i++) hash = nome.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export function ModalGestaoLotacoes({
  open,
  onOpenChange,
  funcionarioInicial,
}: ModalGestaoLotacoesProps) {
  const {
    escolas,
    cargos,
    loading,
    salvando,
    busca,
    setBusca,
    filtroCargo,
    setFiltroCargo,
    tab,
    setTab,
    selecionado,
    setSelecionado,
    funcsFiltrados,
    isGlobalAdmin,
    escolaAtivaId,
    handleAdicionarLotacao,
    handleMoverFuncionario,
    handleRemoverLotacao,
    handleSolicitarTransferencia,
    handleAtualizarCargoLotacao,
    handleAtualizarCargaHorariaLotacao,
    handleAtualizarModalidadeLotacao,
  } = useGestaoLotacoes({ open, funcionarioInicial })

  /* Controle de visualização responsiva para mobile/tablet (lista vs detalhe) */
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list')

  useEffect(() => {
    if (open) {
      if (funcionarioInicial) {
        setMobileView('detail')
      } else {
        setMobileView('list')
      }
    }
  }, [open, funcionarioInicial])

  useEffect(() => {
    if (!selecionado) {
      setMobileView('list')
    }
  }, [selecionado])

  const handleSelectFuncionario = (func: FuncItem) => {
    setSelecionado(func)
    setMobileView('detail')
  }

  const lotacaoNaMinhaEscola = selecionado?.lotacoes.find(
    (l) => l.escola_id === escolaAtivaId && l.ativo
  )

  const [timestamp] = useState(() => Date.now())

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Gestão de Lotações"
      maxWidth="sm:max-w-5xl w-[95vw]"
      className="p-0 gap-0 md:overflow-hidden md:flex md:flex-col sm:max-h-[90vh]"
    >
      {loading ? (
        <div className="flex-1 min-h-[350px] sm:min-h-[400px] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#3ea6ff]" />
        </div>
      ) : (
        <div className="flex flex-col md:flex-row flex-1 md:overflow-hidden min-h-0 md:min-h-[500px]">
          {/* Coluna Esquerda - Lista */}
          <div
            className={`w-full md:w-auto ${
              mobileView === 'list' ? 'flex flex-col flex-1' : 'hidden md:flex'
            }`}
          >
            <FuncionarioLotacaoList
              busca={busca}
              setBusca={setBusca}
              filtroCargo={filtroCargo}
              setFiltroCargo={setFiltroCargo}
              tab={tab}
              setTab={setTab}
              cargos={cargos}
              funcsFiltrados={funcsFiltrados}
              selecionado={selecionado}
              setSelecionado={handleSelectFuncionario}
            />
          </div>

          {/* Coluna Direita - Detalhes */}
          <div
            className={`w-full md:flex-1 md:overflow-y-auto ${
              mobileView === 'detail' ? 'block' : 'hidden md:block'
            }`}
          >
            {/* Header de Navegação Mobile (Exibido apenas em celulares/tablets na visão de detalhes) */}
            <div className="md:hidden sticky top-0 z-20 bg-[#141416] border-b border-[#26262a] p-3 flex items-center justify-between">
              <button
                onClick={() => setMobileView('list')}
                className="flex items-center gap-2 text-xs font-semibold text-[#3ea6ff] hover:text-[#60a5fa] px-3 py-1.5 rounded-lg bg-[#1a1a1e] border border-[#2e2e33] active:scale-95 transition-all cursor-pointer min-h-[38px]"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar à Lista
              </button>
              <span className="text-xs text-zinc-400 font-medium truncate max-w-[180px]">
                {selecionado?.nome ?? 'Detalhes'}
              </span>
            </div>

            {!selecionado ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-zinc-500 min-h-[350px] p-6 text-center">
                <User className="w-12 h-12 text-zinc-700" />
                <p className="text-sm">Selecione um funcionário na lista para gerenciar suas lotações.</p>
              </div>
            ) : (
              <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
                {/* Header do Funcionário */}
                <div className="flex items-center justify-between bg-[#1a1a1e] rounded-xl p-3.5 sm:p-4 border border-[#26262a]">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden ${avatarColor(selecionado.nome).bg} ${avatarColor(selecionado.nome).text}`}
                    >
                      <CachedImage
                        src={selecionado.foto_url}
                        alt={selecionado.nome}
                        className="w-full h-full"
                        fallback={getInitials(selecionado.nome)}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-white text-sm sm:text-base truncate">{selecionado.nome}</p>
                      <p className="text-xs text-zinc-400 truncate">CPF: {selecionado.cpf ?? 'Não informado'}</p>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wide shrink-0 ml-2 ${
                      selecionado.status === 'ativo'
                        ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-500/30'
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-600/30'
                    }`}
                  >
                    {selecionado.status}
                  </span>
                </div>

                {/* Lotações Ativas */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    <MapPin className="w-3.5 h-3.5" />
                    Lotações Atuais (Ativas)
                  </div>
                  {selecionado.lotacoes.length === 0 ? (
                    <div className="bg-[#1a1a1e] border border-dashed border-[#3f3f46] rounded-xl p-4 text-center text-zinc-500 text-sm">
                      Nenhuma lotação ativa.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {selecionado.lotacoes.map((lot) => {
                        const podeGerenciarLotacao = isGlobalAdmin || lot.escola_id === escolaAtivaId
                        const cargoExibido = lot.cargo ?? selecionado.cargo ?? ''
                        return (
                          <div
                            key={lot.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between bg-[#1a1a1e] border border-[#26262a] rounded-xl p-3.5 sm:px-4 sm:py-3 gap-3"
                          >
                            <div className="flex-1 min-w-0 space-y-2 sm:space-y-1.5">
                              <p className="text-sm font-semibold text-[#3ea6ff] truncate">
                                {lot.escolaNome ?? 'Escola não encontrada'}
                              </p>
                              {podeGerenciarLotacao ? (
                                <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 sm:gap-3">
                                  <div className="flex items-center gap-1.5 w-full sm:w-auto">
                                    <span className="text-xs text-zinc-400 font-medium shrink-0">Cargo:</span>
                                    <select
                                      value={cargoExibido}
                                      onChange={(e) => handleAtualizarCargoLotacao(lot.id, e.target.value)}
                                      disabled={salvando}
                                      className="bg-[#121216] border border-[#2e2e33] text-white text-xs rounded px-2 py-1.5 sm:py-1 outline-none focus:border-[#3ea6ff] cursor-pointer flex-1 sm:flex-none"
                                    >
                                      <option value="">Selecione o cargo...</option>
                                      {cargos.map((c) => (
                                        <option key={c.id} value={c.nome}>
                                          {c.nome}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-zinc-400 font-medium shrink-0">Carga Horária:</span>
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="number"
                                        min={1}
                                        max={80}
                                        defaultValue={lot.carga_horaria ?? ''}
                                        placeholder="Ex: 40"
                                        onBlur={(e) => {
                                          const val = e.target.value.trim()
                                          const num = val ? parseInt(val, 10) : null
                                          if (num !== (lot.carga_horaria ?? null)) {
                                            handleAtualizarCargaHorariaLotacao(lot.id, num)
                                          }
                                        }}
                                        disabled={salvando}
                                        className="bg-[#121216] border border-[#2e2e33] text-white text-xs rounded w-16 px-2 py-1.5 sm:py-1 outline-none focus:border-[#3ea6ff]"
                                      />
                                      <span className="text-[11px] text-zinc-400 font-medium">h/sem</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-zinc-400 font-medium shrink-0">Modalidade:</span>
                                    <select
                                      value={lot.modalidade_ensino ?? 'Regular'}
                                      onChange={(e) => handleAtualizarModalidadeLotacao(lot.id, e.target.value)}
                                      disabled={salvando}
                                      className="bg-[#121216] border border-[#2e2e33] text-white text-xs rounded px-2 py-1.5 sm:py-1 outline-none focus:border-[#3ea6ff] cursor-pointer font-medium"
                                    >
                                      <option value="Regular">Regular</option>
                                      <option value="EJA">EJA</option>
                                    </select>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                                  <span>{cargoExibido || 'Cargo não definido'}</span>
                                  {lot.carga_horaria && <span>• {lot.carga_horaria}h/semana</span>}
                                  <span>• Modalidade: {lot.modalidade_ensino ?? 'Regular'}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 border-t sm:border-t-0 border-[#26262a] pt-2.5 sm:pt-0 mt-1 sm:mt-0">
                              <span className="px-2.5 py-1 rounded-full bg-emerald-900/40 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                                Ativa
                              </span>
                              {isGlobalAdmin && (
                                <button
                                  onClick={() => handleRemoverLotacao(lot)}
                                  disabled={salvando}
                                  className="w-8 h-8 sm:w-7 sm:h-7 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/40 text-rose-400 flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
                                  title="Remover lotação"
                                >
                                  <X className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Formulários de Ação de Acordo com Permissões */}
                {isGlobalAdmin ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <NovaLotacaoForm
                      escolas={escolas}
                      cargos={cargos}
                      salvando={salvando}
                      onAdicionarLotacao={handleAdicionarLotacao}
                    />
                    <TransferenciaImediataForm
                      escolas={escolas}
                      lotacoes={selecionado.lotacoes}
                      salvando={salvando}
                      onTransferir={handleMoverFuncionario}
                    />
                  </div>
                ) : lotacaoNaMinhaEscola ? (
                  <SolicitarTransferenciaForm
                    escolas={escolas}
                    escolaAtivaId={escolaAtivaId}
                    lotacaoNaMinhaEscola={lotacaoNaMinhaEscola}
                    salvando={salvando}
                    onSolicitar={handleSolicitarTransferencia}
                  />
                ) : (
                  <div className="bg-[#1a1a1e]/50 border border-dashed border-[#3f3f46] rounded-xl p-4 text-center text-zinc-500 text-sm">
                    O funcionário não possui vínculo de lotação ativo nesta unidade escolar.
                  </div>
                )}

                {/* Nota de Auditoria */}
                <div className="flex items-start gap-2 bg-[#1a1a1e] border border-[#26262a] rounded-xl p-3">
                  <Building2 className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-zinc-500">
                    Todas as ações de lotação são registradas no histórico funcional e na auditoria do sistema.
                  </p>
                </div>

                {/* Turmas do Coordenador */}
                {(() => {
                  const lotacaoAtiva = selecionado.lotacoes.find((l) => l.ativo)
                  if (!selecionado.cargo?.toLowerCase().includes('coordenador') || !lotacaoAtiva) return null
                  return (
                    <TurmasCoordenadorSection 
                      funcionarioId={selecionado.id} 
                      escolaId={lotacaoAtiva.escola_id} 
                    />
                  )
                })()}
              </div>
            )}
          </div>
        </div>
      )}
    </StandardDialog>
  )
}
