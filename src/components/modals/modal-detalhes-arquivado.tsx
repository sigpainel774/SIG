'use client'

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, User, Building, FileText, Info, CheckCircle, XCircle } from 'lucide-react'

interface ModalDetalhesArquivadoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  arquivado: any
}

export function ModalDetalhesArquivado({
  open,
  onOpenChange,
  arquivado
}: ModalDetalhesArquivadoProps) {
  if (!arquivado) return null

  const payload = arquivado.payload_completo ?? {}
  const dataCriacao = arquivado.created_at ? new Date(arquivado.created_at).toLocaleString('pt-BR') : 'N/A'
  const dataReversao = arquivado.revertido_em ? new Date(arquivado.revertido_em).toLocaleString('pt-BR') : null
  const dataExclusao = arquivado.excluido_em ? new Date(arquivado.excluido_em).toLocaleString('pt-BR') : null

  // Mapear campos legíveis para exibir
  const getDetalhesPayload = () => {
    if (arquivado.tipo === 'ALUNO') {
      return [
        { label: 'Nome Completo', value: payload.nome },
        { label: 'CPF', value: payload.cpf ?? '-' },
        { label: 'RG', value: payload.rg ?? '-' },
        { label: 'INEP', value: payload.inep ?? '-' },
        { label: 'Data de Nascimento', value: payload.data_nascimento ? new Date(payload.data_nascimento).toLocaleDateString('pt-BR') : '-' },
        { label: 'Telefone', value: payload.telefone ?? '-' },
        { label: 'Nome da Mãe', value: payload.nome_mae ?? '-' },
        { label: 'Nome do Pai', value: payload.nome_pai ?? '-' },
        { label: 'Endereço', value: payload.endereco ?? '-' },
        { label: 'Série', value: payload.serie ?? '-' }
      ]
    } else if (arquivado.tipo === 'ANEXO_ALUNO') {
      return [
        { label: 'Nome do Documento', value: payload.nome },
        { label: 'Link do Arquivo', value: payload.arquivo_url, isLink: true },
        { label: 'ID do Aluno', value: payload.aluno_id }
      ]
    }
    return []
  }

  const detalhes = getDetalhesPayload()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-[#141416] border border-[#26262a] text-white overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-lg font-bold text-white">Detalhes do Arquivamento</DialogTitle>
            <Badge variant="outline" className="text-xs bg-indigo-500/20 text-indigo-300 border-indigo-500/30 font-semibold uppercase">
              {arquivado.tipo}
            </Badge>
          </div>
          <DialogDescription className="text-zinc-400 text-xs mt-1">
            Visualização completa do snapshot do registro e histórico de auditoria.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-3">
          {/* Seção 1: Dados do Snapshot */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#3ea6ff]" />
              <span>Snapshot dos Dados Originais</span>
            </h4>
            <div className="bg-black/40 border border-[#26262a] rounded-xl p-3.5 space-y-2.5 text-xs">
              {detalhes.map((d, index) => (
                <div key={index} className="grid grid-cols-3 border-b border-[#26262a]/50 pb-2 last:border-b-0 last:pb-0">
                  <span className="text-zinc-400 font-medium">{d.label}</span>
                  <span className="col-span-2 text-white font-semibold truncate">
                    {d.isLink ? (
                      <a href={d.value} target="_blank" rel="noreferrer" className="text-[#3ea6ff] hover:underline truncate block">
                        {d.value}
                      </a>
                    ) : (
                      d.value
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Seção 2: Justificativa */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Info className="w-4 h-4 text-amber-500" />
              <span>Justificativa do Arquivamento</span>
            </h4>
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-200 leading-relaxed italic">
              "{arquivado.motivo}"
            </div>
          </div>

          {/* Seção 3: Histórico e Auditoria */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span>Histórico de Auditoria (Logs)</span>
            </h4>
            <div className="space-y-2 text-xs">
              {/* Arquivado */}
              <div className="flex items-start gap-2.5 bg-black/20 border border-[#26262a] p-3 rounded-xl">
                <CheckCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-white">Registro Arquivado</p>
                  <p className="text-zinc-400 text-[10px] mt-0.5">
                    Data: <span className="text-white font-semibold">{dataCriacao}</span>
                  </p>
                  <p className="text-zinc-400 text-[10px]">
                    Escola de Origem: <span className="text-white font-semibold">{arquivado.escolas?.nome ?? 'N/A'}</span>
                  </p>
                  <p className="text-zinc-400 text-[10px]">
                    Responsável: <span className="text-white font-semibold">{arquivado.funcionarios?.nome ?? 'Sistema / Root'}</span>
                  </p>
                </div>
              </div>

              {/* Revertido */}
              {arquivado.status === 'REVERTIDO' && (
                <div className="flex items-start gap-2.5 bg-emerald-500/5 border border-emerald-500/20 p-3 rounded-xl animate-in fade-in duration-250">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-emerald-400">Arquivamento Revertido (Restaurado)</p>
                    <p className="text-zinc-400 text-[10px] mt-0.5">
                      Data: <span className="text-white font-semibold">{dataReversao}</span>
                    </p>
                    <p className="text-zinc-400 text-[10px]">
                      Responsável: <span className="text-white font-semibold">{arquivado.revertido_por?.nome ?? 'Administrador Root'}</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Excluído/Expurgado */}
              {arquivado.status === 'EXCLUIDO' && (
                <div className="flex items-start gap-2.5 bg-rose-500/5 border border-rose-500/20 p-3 rounded-xl animate-in fade-in duration-250">
                  <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-rose-400">Expurgado (Excluído Definitivamente)</p>
                    <p className="text-zinc-400 text-[10px] mt-0.5">
                      Data: <span className="text-white font-semibold">{dataExclusao}</span>
                    </p>
                    <p className="text-zinc-400 text-[10px]">
                      Responsável: <span className="text-white font-semibold">{arquivado.excluido_por?.nome ?? 'Administrador Root'}</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-[#26262a]">
          <Button
            onClick={() => onOpenChange(false)}
            className="bg-[#27272a] hover:bg-[#3f3f46] text-white rounded-xl text-xs font-semibold px-4 cursor-pointer"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
