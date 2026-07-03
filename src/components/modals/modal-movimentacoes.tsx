'use client'

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

  const nome = funcionario?.nome || nomeServidor || 'Servidor'

  // Standard mock movements if none provided
  const listMovimentacoes: Movimentacao[] = (movimentacoes && movimentacoes.length > 0) ? movimentacoes : [
    {
      id: '1',
      data: '15/01/2026',
      tipo: 'Lotação / Transferência',
      descricao: `Alocação efetuada para o ${funcionario?.orgao || 'Colégio Moisés Alves'} conforme Portaria nº 048/2026.`,
      orgao_origem: 'Secretaria Municipal de Educação',
      orgao_destino: funcionario?.orgao || 'Colégio Moisés Alves',
      portaria: 'Portaria 048/2026'
    },
    {
      id: '2',
      data: '10/08/2025',
      tipo: 'Progressão Funcional',
      descricao: `Enquadramento de nível na carreira: ${funcionario?.cargo || 'Professor Nível I'}. Processo aprovado.`,
      portaria: 'Portaria 112/2025'
    },
    {
      id: '3',
      data: '02/02/2024',
      tipo: 'Admissão / Posse',
      descricao: 'Posse no concurso público municipal da educação e início de exercício funcional.',
      portaria: 'Decreto 015/2024'
    }
  ]

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

            {listMovimentacoes.map((mov) => (
              <div key={mov.id} className="p-4 border border-[#27272a] rounded-xl bg-[#1c1c1e] hover:border-zinc-700 transition-colors">
                <div className="flex flex-wrap justify-between items-center gap-2 mb-2 pb-2 border-b border-[#27272a]">
                  <span className="text-[#38bdf8] text-sm font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#38bdf8]" />
                    {mov.tipo}
                  </span>
                  <span className="text-zinc-400 text-xs font-mono bg-[#141416] px-2 py-0.5 rounded border border-[#27272a]">
                    {mov.data}
                  </span>
                </div>
                
                <p className="text-sm text-zinc-200 leading-relaxed mb-2">{mov.descricao}</p>

                {(mov.orgao_origem || mov.portaria) && (
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-zinc-400 pt-2 border-t border-[#27272a]/60">
                    {mov.orgao_origem && (
                      <span className="flex items-center gap-1">
                        <Building className="w-3.5 h-3.5 text-zinc-500" />
                        De: <strong className="text-zinc-300">{mov.orgao_origem}</strong> → Para: <strong className="text-zinc-300">{mov.orgao_destino}</strong>
                      </span>
                    )}
                    {mov.portaria && (
                      <span className="font-mono text-zinc-400">
                        {mov.portaria}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

