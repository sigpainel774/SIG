'use client'

import { Lock, Check, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StandardTable } from '@/components/ui/table'
import { type SolicitacaoLiberacao } from '@/hooks/useAlunos'

interface SolicitacoesLiberacaoProps {
  solicitacoes: SolicitacaoLiberacao[]
  onResponder: (id: string, status: 'aprovado' | 'rejeitado') => void
}

export function SolicitacoesLiberacao({
  solicitacoes,
  onResponder,
}: SolicitacoesLiberacaoProps) {
  if (solicitacoes.length === 0) return null

  return (
    <div className="bg-[#121214] border border-[#26262a] rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl relative overflow-hidden print:hidden">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#818cf8]/40 to-transparent" />

      <div className="flex items-center justify-between border-b border-[#26262a] pb-3 mb-1">
        <div className="flex items-center gap-2 text-white">
          <Lock className="w-4 h-4 text-[#818cf8]" />
          <h2 className="text-sm font-bold uppercase tracking-wider">
            Solicitações de Liberação de Ficha ({solicitacoes.length})
          </h2>
        </div>
      </div>

      <StandardTable
        data={solicitacoes}
        keyExtractor={(sol) => sol.id}
        className="border-none bg-transparent shadow-none rounded-none"
        columns={[
          {
            header: 'Aluno',
            accessor: (sol) => sol.alunos?.nome,
            className: 'py-3 px-3 font-bold text-white',
            headClassName:
              'py-2 px-3 text-zinc-500 font-bold uppercase text-[10px] border-none bg-transparent',
          },
          {
            header: 'Escola',
            accessor: (sol) =>
              sol.alunos?.escolas?.nome ?? 'Escola Principal',
            className: 'py-3 px-3 text-zinc-400',
            headClassName:
              'py-2 px-3 text-zinc-500 font-bold uppercase text-[10px] border-none bg-transparent',
          },
          {
            header: 'Solicitante',
            accessor: (sol) => sol.solicitante?.nome ?? 'Funcionário',
            className: 'py-3 px-3 font-medium text-[#3ea6ff]',
            headClassName:
              'py-2 px-3 text-zinc-500 font-bold uppercase text-[10px] border-none bg-transparent',
          },
          {
            header: 'Justificativa',
            accessor: (sol) => (
              <span
                className="italic max-w-xs truncate block"
                title={sol.justificativa ?? ''}
              >
                &ldquo;{sol.justificativa}&rdquo;
              </span>
            ),
            className: 'py-3 px-3 text-zinc-300',
            headClassName:
              'py-2 px-3 text-zinc-500 font-bold uppercase text-[10px] border-none bg-transparent',
          },
          {
            header: 'Ações',
            accessor: (sol) => (
              <div className="inline-flex gap-1.5 justify-end w-full">
                <Button
                  onClick={() => onResponder(sol.id, 'aprovado')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-8 px-3 rounded-lg text-[10px] flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3 h-3" />
                  Liberar
                </Button>
                <Button
                  onClick={() => onResponder(sol.id, 'rejeitado')}
                  variant="ghost"
                  className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 h-8 px-3 rounded-lg text-[10px] flex items-center gap-1 cursor-pointer"
                >
                  <XCircle className="w-3 h-3" />
                  Recusar
                </Button>
              </div>
            ),
            className: 'py-3 px-3 text-right',
            headClassName:
              'py-2 px-3 text-zinc-500 font-bold uppercase text-[10px] text-right border-none bg-transparent',
          },
        ]}
        rowClassName="border-b border-[#26262a]/50 hover:bg-[#18181b]/50"
      />
    </div>
  )
}
