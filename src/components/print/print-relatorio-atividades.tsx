'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Printer, Activity, ShieldCheck, Clock, User, Calendar, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PrintHeader } from '@/components/print/print-header'

export interface AuditLogPrintItem {
  id: string
  created_at: string
  action: string
  entity: string
  entity_id: string
  tenant_id?: string | null
  user_id: string | null
  user_name: string | null
  user_email: string | null
  user_cargo: string | null
  ip_address?: string | null
  old_data: any
  new_data: any
}

export interface ResumoAtividadesPrint {
  total: number
  creates: number
  updates: number
  deletes: number
  reads: number
  outros: number
}

interface PrintRelatorioAtividadesProps {
  escolaNome?: string | null
  isSaude?: boolean
  periodoLabel: string
  acaoFiltroLabel: string
  entidadeFiltroLabel: string
  resumo: ResumoAtividadesPrint
  logs: AuditLogPrintItem[]
  onClose: () => void
}

export function PrintRelatorioAtividades({
  escolaNome,
  isSaude = false,
  periodoLabel,
  acaoFiltroLabel,
  entidadeFiltroLabel,
  resumo,
  logs,
  onClose,
}: PrintRelatorioAtividadesProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  const handlePrint = () => {
    window.dispatchEvent(new Event('beforeprint'))
    setTimeout(() => {
      window.print()
    }, 200)
  }

  if (!mounted) return null

  const legendaEscola = escolaNome ?? (isSaude ? 'Secretaria Municipal de Saúde (Visão Consolidada)' : 'Secretaria Municipal de Educação (Visão Consolidada da Rede)')
  const dataHoje = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'CADASTRO / INSERÇÃO'
      case 'UPDATE':
        return 'EDIÇÃO DE FICHA'
      case 'DELETE':
      case 'PURGE':
        return 'EXCLUSÃO / ARQUIVAMENTO'
      case 'READ':
        return 'VISUALIZAÇÃO DE FICHA'
      default:
        return action
    }
  }

  const getEntityLabel = (entity: string) => {
    if (entity.startsWith('alunos')) return 'Alunos'
    if (entity.startsWith('emaee_matriculas')) return 'Matrícula EMAEE'
    if (entity.startsWith('emaee_evolucoes')) return 'Evolução EMAEE'
    if (entity.startsWith('responsaveis')) return 'Portal da Família'
    if (entity.startsWith('funcionarios')) return 'Servidores'
    if (entity.startsWith('atestados')) return 'Atestados'
    if (entity.startsWith('comunicados')) return 'Mural'
    if (entity.startsWith('turmas')) return 'Turmas & Matérias'
    if (entity.startsWith('ocorrencias')) return 'Ocorrências'
    if (entity.startsWith('trash_bin')) return 'Lixeira'
    return entity
  }

  const getDetalhesTexto = (log: AuditLogPrintItem) => {
    if (log.entity.startsWith('responsaveis')) {
      const nomeResp = log.new_data?.responsavel_nome ?? log.new_data?.nome ?? log.entity_id ?? 'Responsável'
      const alunos = log.new_data?.alunos_vinculados || []
      const parentesco = log.new_data?.parentesco ? ` (${log.new_data.parentesco})` : ''
      const alunosStr = alunos.length > 0 ? ` | Alunos: ${alunos.map((a: any) => `${a.nome || a} ${a.turma ? `[${a.turma}]` : ''}`).join(', ')}` : ''
      const ipStr = log.ip_address ? ` [IP: ${log.ip_address}]` : ''
      return `${nomeResp}${parentesco}${alunosStr}${ipStr}`
    }

    if (log.entity.startsWith('emaee_matriculas')) {
      const nomeAluno = log.new_data?.aluno_nome || log.old_data?.aluno_nome || log.entity_id
      const status = log.new_data?.status || log.old_data?.status
      const turno = log.new_data?.turno_atendimento || log.old_data?.turno_atendimento
      return `${nomeAluno} ${status ? `• Status: ${status}` : ''} ${turno ? `• Turno: ${turno}` : ''}`
    }

    if (log.entity.startsWith('emaee_evolucoes')) {
      const prof = log.new_data?.profissional_nome || log.user_name || 'Profissional'
      const esp = log.new_data?.especialidade
      const dataAtend = log.new_data?.data_atendimento
      return `${esp || 'Evolução Clínica'} • Prof: ${prof} ${dataAtend ? `• Data: ${dataAtend}` : ''}`
    }

    const nomeAlvo = log.new_data?.nome ?? log.old_data?.nome ?? log.entity_id
    const obs = log.new_data?.observacao ? ` - ${log.new_data.observacao}` : ''
    const ipStr = log.ip_address ? ` [IP: ${log.ip_address}]` : ''
    return `${nomeAlvo}${obs}${ipStr}`
  }

  return createPortal(
    <div className="print-portal-container fixed inset-0 z-[9999] bg-[#09090b]/95 flex flex-col items-center p-4 overflow-y-auto print:static print:block print:p-0 print:bg-white print:overflow-visible">
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm 10mm 8mm 10mm;
          }
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .print-break-inside-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          th, td {
            border: 1px solid #d4d4d8 !important;
          }
        }
      `}</style>

      {/* Barra de Ações (Oculta na Impressão) */}
      <div className="w-full max-w-5xl bg-zinc-900 border border-zinc-800 text-zinc-100 px-6 py-3 rounded-2xl flex items-center justify-between mb-4 shadow-xl no-print">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-sky-400" />
          <span className="text-sm font-bold">Pré-visualização da Trilha de Auditoria & Atividades</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handlePrint}
            className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs gap-2 rounded-xl shadow-md cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Imprimir Relatório (A4 Paisagem)
          </Button>
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-zinc-400 hover:text-white text-xs gap-1.5 rounded-xl cursor-pointer"
          >
            <X className="w-4 h-4" />
            Fechar
          </Button>
        </div>
      </div>

      {/* Conteúdo Imprimível do Relatório A4 */}
      <div className="w-full max-w-5xl bg-white text-black p-8 rounded-xl shadow-2xl print:shadow-none print:p-0 print:max-w-none print:w-full">
        {/* Cabeçalho Oficial */}
        <PrintHeader
          docTitulo={isSaude ? "RELATÓRIO DE AUDITORIA — CENTRAL DE ATIVIDADES DA SAÚDE" : "RELATÓRIO DE AUDITORIA — CENTRAL DE ATIVIDADES DA ESCOLA"}
          docSubtitulo="Trilha de auditoria oficial de cadastros, edições, consultas e movimentações operacionais"
          secretaria={isSaude ? "SECRETARIA MUNICIPAL DE SAÚDE" : "SECRETARIA MUNICIPAL DE EDUCAÇÃO"}
          escolaNome={legendaEscola}
        />


        {/* Metadados e Filtros Aplicados */}
        <div className="my-4 p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-xs grid grid-cols-2 md:grid-cols-4 gap-3 print:grid-cols-4 print:my-3">
          <div>
            <span className="text-zinc-500 font-bold block text-[10px] uppercase">Período Selecionado:</span>
            <span className="font-semibold text-zinc-800">{periodoLabel}</span>
          </div>
          <div>
            <span className="text-zinc-500 font-bold block text-[10px] uppercase">Filtro de Ação:</span>
            <span className="font-semibold text-zinc-800">{acaoFiltroLabel}</span>
          </div>
          <div>
            <span className="text-zinc-500 font-bold block text-[10px] uppercase">Módulo/Entidade:</span>
            <span className="font-semibold text-zinc-800">{entidadeFiltroLabel}</span>
          </div>
          <div>
            <span className="text-zinc-500 font-bold block text-[10px] uppercase">Data de Emissão:</span>
            <span className="font-semibold text-zinc-800">{dataHoje}</span>
          </div>
        </div>

        {/* Resumo Estatístico em Cards */}
        <div className="grid grid-cols-5 gap-2.5 mb-5 print:mb-4 text-center">
          <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-lg">
            <span className="text-[10px] text-zinc-500 font-bold uppercase block">Total de Atividades</span>
            <span className="text-lg font-black text-zinc-900">{resumo.total}</span>
          </div>
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
            <span className="text-[10px] text-emerald-700 font-bold uppercase block">Cadastros (Create)</span>
            <span className="text-lg font-black text-emerald-800">{resumo.creates}</span>
          </div>
          <div className="p-2.5 bg-sky-50 border border-sky-200 rounded-lg">
            <span className="text-[10px] text-sky-700 font-bold uppercase block">Edições (Update)</span>
            <span className="text-lg font-black text-sky-800">{resumo.updates}</span>
          </div>
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg">
            <span className="text-[10px] text-rose-700 font-bold uppercase block">Exclusões (Delete)</span>
            <span className="text-lg font-black text-rose-800">{resumo.deletes}</span>
          </div>
          <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-lg">
            <span className="text-[10px] text-purple-700 font-bold uppercase block">Visualizações (Read)</span>
            <span className="text-lg font-black text-purple-800">{resumo.reads}</span>
          </div>
        </div>

        {/* Tabela de Registros de Auditoria */}
        <div className="mb-6">
          <table className="w-full text-left text-xs border border-zinc-300">
            <thead className="bg-zinc-100 text-zinc-700 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-2 w-28 text-center">Data / Hora</th>
                <th className="p-2 w-48">Operador (Executor)</th>
                <th className="p-2 w-40 text-center">Tipo de Ação</th>
                <th className="p-2 w-32">Módulo</th>
                <th className="p-2">Detalhes e Alvo da Atividade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-[11px]">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-zinc-500 font-semibold">
                    Nenhum registro de atividade localizado para o filtro selecionado.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const dt = new Date(log.created_at)
                  const dataFormatada = dt.toLocaleDateString('pt-BR')
                  const horaFormatada = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

                  return (
                    <tr key={log.id} className="hover:bg-zinc-50 print-break-inside-avoid">
                      <td className="p-2 text-center text-zinc-700 whitespace-nowrap font-mono text-[10px]">
                        <div className="font-semibold text-zinc-900">{dataFormatada}</div>
                        <div className="text-zinc-500">{horaFormatada}</div>
                      </td>
                      <td className="p-2 text-zinc-800">
                        <div className="font-bold text-zinc-900 leading-tight">{log.user_name || 'Sistema'}</div>
                        <div className="text-[10px] text-zinc-500">{log.user_cargo || log.user_email || 'Operador'}</div>
                      </td>
                      <td className="p-2 text-center font-bold">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] ${
                            log.action === 'CREATE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : log.action === 'UPDATE'
                              ? 'bg-sky-100 text-sky-800'
                              : log.action === 'DELETE' || log.action === 'PURGE'
                              ? 'bg-rose-100 text-rose-800'
                              : log.action === 'READ'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-zinc-100 text-zinc-800'
                          }`}
                        >
                          {getActionLabel(log.action)}
                        </span>
                      </td>
                      <td className="p-2 font-medium text-zinc-700">
                        {getEntityLabel(log.entity)}
                      </td>
                      <td className="p-2 text-zinc-800 leading-relaxed break-words">
                        {getDetalhesTexto(log)}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé e Bloco de Assinaturas Oficiais */}
        <div className="pt-8 mt-6 border-t border-zinc-300 grid grid-cols-2 gap-16 text-center text-xs text-zinc-800 print-break-inside-avoid">
          <div>
            <div className="border-t border-zinc-800 w-52 mx-auto mb-1" />
            <p className="font-bold">{isSaude ? 'Secretaria Municipal de Saúde' : 'Secretaria Escolar'}</p>
            <p className="text-[10px] text-zinc-500">Emissão e Auditoria de Registros</p>
          </div>
          <div>
            <div className="border-t border-zinc-800 w-52 mx-auto mb-1" />
            <p className="font-bold">{isSaude ? 'Coordenação de Vigilância e Gestão' : 'Direção Geral da Unidade'}</p>
            <p className="text-[10px] text-zinc-500">Homologação e Visto Administrativo</p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
