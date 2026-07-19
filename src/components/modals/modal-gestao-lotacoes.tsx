'use client'

import { StandardDialog } from '@/components/ui/standard-dialog'
import {
  MapPin,
  X,
  Loader2,
  Building2,
  User,
} from 'lucide-react'
import { useGestaoLotacoes } from '@/hooks/useGestaoLotacoes'
import { TurmasCoordenadorSection } from '@/components/TurmasCoordenadorSection'
import { FuncionarioLotacaoList } from './lotacoes/FuncionarioLotacaoList'
import { NovaLotacaoForm } from './lotacoes/NovaLotacaoForm'
import { TransferenciaImediataForm } from './lotacoes/TransferenciaImediataForm'
import { SolicitarTransferenciaForm } from './lotacoes/SolicitarTransferenciaForm'

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
  } = useGestaoLotacoes({ open, funcionarioInicial })

  const lotacaoNaMinhaEscola = selecionado?.lotacoes.find(
    (l) => l.escola_id === escolaAtivaId && l.ativo
  )

  const timestamp = Date.now()

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Gestão de Lotações"
      maxWidth="sm:max-w-5xl w-[95vw]"
      className="p-0 gap-0 overflow-hidden flex flex-col max-h-[90vh]"
    >
      {loading ? (
        <div className="flex-1 min-h-[400px] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#3ea6ff]" />
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden min-h-[500px]">
          {/* Coluna Esquerda - Lista */}
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
            setSelecionado={setSelecionado}
          />

          {/* Coluna Direita - Detalhes */}
          <div className="flex-1 overflow-y-auto">
            {!selecionado ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-zinc-500 min-h-[400px]">
                <User className="w-12 h-12 text-zinc-700" />
                <p className="text-sm">Selecione um funcionário na lista</p>
              </div>
            ) : (
              <div className="p-6 space-y-6">
                {/* Header do Funcionário */}
                <div className="flex items-center justify-between bg-[#1a1a1e] rounded-xl p-4 border border-[#26262a]">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden ${avatarColor(selecionado.nome).bg} ${avatarColor(selecionado.nome).text}`}
                    >
                      {selecionado.foto_url ? (
                        <img 
                          src={`${selecionado.foto_url.split('?')[0]}?t=${timestamp}`} 
                          alt={selecionado.nome} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        getInitials(selecionado.nome)
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-white">{selecionado.nome}</p>
                      <p className="text-xs text-zinc-400">CPF: {selecionado.cpf ?? 'Não informado'}</p>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${
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
                    <div className="space-y-2">
                      {selecionado.lotacoes.map((lot) => (
                        <div
                          key={lot.id}
                          className="flex items-center justify-between bg-[#1a1a1e] border border-[#26262a] rounded-xl px-4 py-3"
                        >
                          <div>
                            <p className="text-sm font-semibold text-[#3ea6ff]">
                              {lot.escolaNome ?? 'Escola não encontrada'}
                            </p>
                            <p className="text-xs text-zinc-400">{lot.cargo ?? 'Cargo não definido'}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                              Ativa
                            </span>
                            {isGlobalAdmin && (
                              <button
                                onClick={() => handleRemoverLotacao(lot)}
                                disabled={salvando}
                                className="w-7 h-7 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/40 text-rose-400 flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
                                title="Remover lotação"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
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
