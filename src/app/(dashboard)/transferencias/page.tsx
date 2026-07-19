'use client'

import { Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Eye
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StandardTable } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ModalTransferirFuncionario } from '@/components/modals/modal-transferir-funcionario'
import { useTransferencias } from '@/hooks/useTransferencias'

import { TransferenciasHeader } from './components/TransferenciasHeader'
import { TransferenciasSidebar } from './components/TransferenciasSidebar'
import { ModalAvaliarTransferencia } from './components/ModalAvaliarTransferencia'

function TransferenciasContent() {
  const router = useRouter()
  const {
    activeTab,
    setActiveTab,
    activeSubTab,
    setActiveSubTab,
    historicoAberto,
    setHistoricoAberto,
    modalFuncionarioOpen,
    setModalFuncionarioOpen,
    transferenciaSelecionada,
    setTransferenciaSelecionada,
    modalDecisaoOpen,
    setModalDecisaoOpen,
    justificativa,
    setJustificativa,
    processing,
    loading,
    isEditMode,
    isAdminGlobalOrRoot,
    items,
    loadTransferencias,
    handleDecidirTransferencia,
    handleReverterTransferencia
  } = useTransferencias()

  return (
    <div className="space-y-6 max-w-7xl mx-auto min-w-0 pb-12">
      {/* Modal de Nova Transferência de Funcionário */}
      {modalFuncionarioOpen && (
        <ModalTransferirFuncionario
          open={modalFuncionarioOpen}
          onOpenChange={setModalFuncionarioOpen}
          onSuccess={loadTransferencias}
        />
      )}

      {/* Modal de Avaliação de Pedido (Aprovar/Rejeitar) */}
      <ModalAvaliarTransferencia
        open={modalDecisaoOpen}
        onOpenChange={setModalDecisaoOpen}
        transferencia={transferenciaSelecionada}
        activeTab={activeTab}
        isEditMode={isEditMode}
        isAdminGlobalOrRoot={isAdminGlobalOrRoot}
        processing={processing}
        justificativa={justificativa}
        setJustificativa={setJustificativa}
        onDecidir={handleDecidirTransferencia}
        onReverter={handleReverterTransferencia}
      />

      {/* Topo / Header */}
      <TransferenciasHeader
        loading={loading}
        isEditMode={isEditMode}
        activeTab={activeTab}
        onRefresh={loadTransferencias}
        onOpenFuncionarioModal={() => setModalFuncionarioOpen(true)}
        routerPush={router.push}
      />

      {/* Grid Central */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Sidebar Local de Navegação */}
        <TransferenciasSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          activeSubTab={activeSubTab}
          setActiveSubTab={setActiveSubTab}
          historicoAberto={historicoAberto}
          setHistoricoAberto={setHistoricoAberto}
        />

        {/* Tabela Principal */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 m-0">
              {historicoAberto ? 'Histórico de Finalizados' : activeSubTab === 'recebimentos' ? 'Novos Pedidos Recebidos' : 'Pedidos Submetidos'}
              <span className="bg-[#27272a] text-zinc-400 text-xs px-2 py-0.5 rounded-full font-bold">{items.length}</span>
            </h3>
          </div>

          <StandardTable
            data={items}
            keyExtractor={(sol) => sol.id}
            loading={loading}
            loadingMessage="Buscando transferências..."
            emptyMessage="Nenhuma solicitação de transferência encontrada nesta categoria."
            columns={[
              {
                header: activeTab === 'alunos' ? 'Aluno' : 'Funcionário',
                accessor: (sol: any) => {
                  const nome = activeTab === 'alunos' 
                    ? (sol.alunos?.nome ?? sol.ficha_snapshot?.nome ?? 'Sem nome')
                    : (sol.funcionarios?.nome ?? sol.ficha_snapshot?.nome ?? 'Sem nome')
                  const subinfo = activeTab === 'alunos' 
                    ? (sol.alunos?.cpf ? `CPF: ${sol.alunos.cpf}` : `Série: ${sol.ficha_snapshot?.serie ?? '-'}`)
                    : (sol.funcionarios?.cargo ?? sol.ficha_snapshot?.cargo ?? 'Sem cargo')
                  return (
                    <>
                      <div className="font-bold text-white">{nome}</div>
                      <div className="text-xs text-[#888]">{subinfo}</div>
                    </>
                  )
                }
              },
              {
                header: 'Fluxo',
                accessor: (sol: any) => (
                  <div className="text-xs text-[#ccc] flex flex-col">
                    <span>Origem: {sol.origem?.nome ?? 'Rede'}</span>
                    <span className="text-[#888]">Destino: {sol.fora_da_rede ? 'Fora da Rede' : (sol.destino?.nome ?? 'Rede')}</span>
                    {activeTab === 'funcionarios' && (
                      <span className="text-[10px] text-sky-400 font-semibold mt-1">
                        {sol.lotacao_id ? 'Lotação Específica' : 'Transferência Completa'}
                      </span>
                    )}
                  </div>
                )
              },
              {
                header: 'Solicitante',
                accessor: (sol: any) => sol.solicitante?.nome?.split(' ')[0] ?? 'Sistema',
                className: 'text-xs text-[#aaa]',
              },
              {
                header: 'Data',
                accessor: (sol: any) => sol.created_at ? new Date(sol.created_at).toLocaleDateString('pt-BR') : '-',
                className: 'text-xs text-[#aaa]',
              },
              {
                header: 'Status',
                accessor: (sol: any) => (
                  <Badge 
                    className={
                      sol.status === 'PENDENTE' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                      sol.status === 'ACEITA' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                      'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                    }
                  >
                    {sol.status}
                  </Badge>
                )
              },
              {
                header: 'Ações',
                accessor: (sol: any) => (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setTransferenciaSelecionada(sol)
                      setModalDecisaoOpen(true)
                    }}
                    className="text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 h-8 px-2.5 rounded-lg"
                  >
                    <Eye className="w-4 h-4 mr-1.5" />
                    Visualizar
                  </Button>
                ),
                className: 'text-right',
                headClassName: 'text-right',
              }
            ]}
          />
        </div>
      </div>
    </div>
  )
}

export default function TransferenciasPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[#aaa]">Carregando central de transferências...</div>}>
      <TransferenciasContent />
    </Suspense>
  )
}
