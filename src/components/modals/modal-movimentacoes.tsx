'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { 
  Dialog, 
  DialogContent, 
  DialogTitle,
  DialogClose
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Printer, X, ArrowRightLeft, Calendar, Building, ShieldCheck } from 'lucide-react'

export interface Movimentacao {
  id: string
  data: string
  tipo: string
  descricao: string
  orgao_origem?: string
  orgao_destino?: string
  portaria?: string
}

interface ModalMovimentacoesProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  funcionario?: {
    id?: string | null
    nome?: string | null
    cargo?: string | null
    orgao?: string | null
    status?: string | null
    data_nascimento?: string | null
    formacao?: string | null
  } | null
  nomeServidor?: string
  movimentacoes?: Movimentacao[]
}

export function ModalMovimentacoes({ 
  open = false, 
  onOpenChange,
  funcionario,
  nomeServidor,
  movimentacoes
}: ModalMovimentacoesProps) {
  
  const handleOpenChange = (val: boolean) => {
    if (onOpenChange) onOpenChange(val)
  }

  const getIconForType = (tipo: string) => {
    switch(tipo) {
      case 'Lotação / Transferência': return <ArrowRightLeft className="w-5 h-5" />
      case 'Admissão / Posse': return <Building className="w-5 h-5" />
      case 'Progressão Funcional': return <ShieldCheck className="w-5 h-5" />
      default: return <Calendar className="w-5 h-5" />
    }
  }

  const nome = funcionario?.nome || nomeServidor || 'Servidor'

  const [listMovimentacoes, setListMovimentacoes] = useState<Movimentacao[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!open) return
    const fetchMovimentacoes = async () => {
      setLoading(true)
      if (movimentacoes && movimentacoes.length > 0) {
        setListMovimentacoes(movimentacoes)
        setLoading(false)
        return
      }

      if (funcionario?.id) {
        const supabase = createClient()
        const { data, error } = await (supabase.from as any)('movimentacoes_funcionarios')
          .select('*')
          .eq('funcionario_id', funcionario.id)
          .order('data', { ascending: false })

        if (data) {
          setListMovimentacoes(data as Movimentacao[])
        }
      }
      setLoading(false)
    }

    fetchMovimentacoes()
  }, [open, funcionario?.id, movimentacoes])

  const handlePrint = () => {
    window.print()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-[700px] bg-[#18181b] border-[#27272a] text-white p-0 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="sticky top-0 bg-[#141416] z-10 border-b border-[#27272a] px-6 py-4 flex justify-between items-center">
          <div>
            <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-[#38bdf8]" />
              Histórico de Movimentações
            </DialogTitle>
            <p className="mt-0.5 text-xs text-zinc-400">
              Servidor: <span className="text-white font-semibold">{nome}</span>
            </p>
          </div>
          
          <div className="flex gap-2 items-center">
            {/* Botão de impressora para imprimir */}
            <button
              type="button" 
              onClick={handlePrint}
              title="Imprimir histórico"
              className="w-9 h-9 rounded-full bg-white hover:bg-zinc-200 text-zinc-900 flex items-center justify-center transition-colors shadow-sm cursor-pointer"
            >
              <Printer className="w-4.5 h-4.5 text-zinc-900" />
            </button>

            {/* Botão de X para fechar */}
            <DialogClose render={
              <button
                type="button"
                className="w-9 h-9 rounded-full bg-[#27272a] hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center transition-colors shadow-sm cursor-pointer"
                title="Fechar"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            } />
          </div>
        </div>
        
        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Card Resumo do Funcionário */}
          {funcionario && (
            <div className="p-4 rounded-xl bg-[#141416] border border-[#27272a] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-zinc-400">Cargo: </span>
                <span className="text-white font-semibold">{funcionario.cargo || 'Professor'}</span>
              </div>
              <div>
                <span className="text-zinc-400">Órgão Atual: </span>
                <span className="text-white font-semibold">{funcionario.orgao || 'Não informado'}</span>
              </div>
              <div>
                <span className="text-zinc-400">Data de Nascimento: </span>
                <span className="text-white font-semibold">{funcionario.data_nascimento || 'Não informada'}</span>
              </div>
              <div>
                <span className="text-zinc-400">Formação: </span>
                <span className="text-white font-semibold">{funcionario.formacao || 'Não informada'}</span>
              </div>
            </div>
          )}

          {/* Timeline de Movimentações */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#38bdf8]" />
              Registros Funcionais
            </h4>

            {loading ? (
              <div className="p-8 text-center text-zinc-500">
                Carregando movimentações...
              </div>
            ) : listMovimentacoes.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 flex flex-col items-center">
                <ArrowRightLeft className="w-8 h-8 text-zinc-700 mb-3" />
                <p>Nenhuma movimentação funcional encontrada para este servidor.</p>
              </div>
            ) : (
              listMovimentacoes.map((mov, index) => (
                <div 
                  key={mov.id} 
                  className={`relative flex gap-6 ${index !== listMovimentacoes.length - 1 ? 'pb-10' : ''}`}
                >
                  {/* Linha do tempo */}
                  {index !== listMovimentacoes.length - 1 && (
                    <div className="absolute left-6 top-10 bottom-0 w-px bg-gradient-to-b from-[#3ea6ff]/40 to-transparent"></div>
                  )}
                  
                  {/* Ícone da timeline */}
                  <div className="relative z-10 flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-[#1e293b] border-2 border-[#3ea6ff]/50 flex items-center justify-center text-[#38bdf8] shadow-[0_0_15px_rgba(56,189,248,0.15)]">
                      {getIconForType(mov.tipo)}
                    </div>
                  </div>
                  
                  {/* Conteúdo da movimentação */}
                  <div className="flex-1 bg-[#1a1a1c] border border-[#27272a] rounded-xl p-5 hover:border-[#3f3f46] transition-colors shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
                      <h4 className="text-white font-bold text-base flex items-center gap-2">
                        {mov.tipo}
                      </h4>
                      <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-[#27272a] text-zinc-300 whitespace-nowrap">
                        {new Date(mov.data).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    
                    <p className="text-sm text-zinc-400 mb-4 leading-relaxed">
                      {mov.descricao}
                    </p>
                    
                    {/* Tags de detalhes extras */}
                    <div className="flex flex-wrap gap-2 mt-auto">
                      {mov.orgao_origem && (
                        <span className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <span className="font-semibold">Origem:</span> {mov.orgao_origem}
                        </span>
                      )}
                      
                      {mov.orgao_destino && (
                        <span className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <span className="font-semibold">Destino:</span> {mov.orgao_destino}
                        </span>
                      )}
                      
                      {mov.portaria && (
                        <span className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md bg-[#3ea6ff]/10 text-[#3ea6ff] border border-[#3ea6ff]/20">
                          <ShieldCheck className="w-3 h-3" />
                          {mov.portaria}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

