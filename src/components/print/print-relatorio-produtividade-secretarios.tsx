'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PrintHeader } from '@/components/print/print-header'

export interface SecretarioProdutividadeItem {
  id: string
  nome: string
  cpf?: string | null
  cargo?: string | null
  foto_url?: string | null
  escola_id?: string | null
  escola_nome: string
  novos_cadastros: number
  edicoes_fichas: number
  ocorrencias_lancadas: number
  transferencias_despachadas: number
  total_acoes: number
  ultima_atividade?: string | null
  ultimo_ip?: string | null
  status_atividade: 'ativo_hoje' | 'ativo_semana' | 'sem_atividade'
}

export interface ResumoProdutividadePrint {
  total_secretarios: number
  total_secretarios_ativos: number
  total_cadastros_novos: number
  total_edicoes_fichas: number
  total_ocorrencias: number
  total_transferencias: number
  total_acoes_geral: number
  escola_mais_produtiva: string
  secretario_destaque: string
  periodo_label: string
}

export interface EscolaProdutividadePrint {
  escola_nome: string
  secretarios_count: number
  novos_cadastros: number
  edicoes_fichas: number
  outras_atividades: number
  total_acoes: number
}

interface PrintRelatorioProdutividadeSecretariosProps {
  modoView: 'sintetico' | 'nominal'
  escolaNome?: string | null
  periodoLabel: string
  resumo: ResumoProdutividadePrint
  escolasBreakdown: EscolaProdutividadePrint[]
  secretariosLista: SecretarioProdutividadeItem[]
  onClose: () => void
}

export function PrintRelatorioProdutividadeSecretarios({
  modoView,
  escolaNome,
  periodoLabel,
  resumo,
  escolasBreakdown,
  secretariosLista,
  onClose,
}: PrintRelatorioProdutividadeSecretariosProps) {
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

  const isSintetico = modoView === 'sintetico'
  const docSubtitulo = isSintetico
    ? `Relatório Estatístico de Produtividade dos Secretários Escolares (${periodoLabel})`
    : `Relação Nominal e Extrato Operacional dos Secretários Escolares (${periodoLabel})`

  const legendaEscola = escolaNome ?? 'Rede Municipal de Ensino (Todas as Unidades)'

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-[#09090b]/95 flex items-center justify-center p-4 overflow-y-auto print:static print:block print:p-0 print:bg-white print:overflow-visible print-portal-container">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 15mm 15mm 15mm;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .print-portal-container {
            position: static !important;
            padding: 0 !important;
            background: transparent !important;
          }
          .print-content {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .page-break {
            page-break-before: always;
          }
        }
      `}</style>

      {/* Floating Action Controls (Hidden when printing) */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-3 no-print bg-[#18181b] border border-zinc-800 p-2.5 rounded-2xl shadow-2xl">
        <Button
          onClick={handlePrint}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl px-4 py-2 flex items-center gap-2 cursor-pointer shadow-md"
        >
          <Printer className="w-4 h-4" />
          Imprimir Documento
        </Button>
        <Button
          variant="outline"
          onClick={onClose}
          className="bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300 hover:text-white text-xs rounded-xl px-3 py-2 cursor-pointer flex items-center gap-1.5"
        >
          <X className="w-4 h-4" />
          Fechar
        </Button>
      </div>

      {/* A4 Paper Document Preview Container */}
      <div className="print-content bg-white text-black w-full max-w-4xl p-8 sm:p-12 rounded-2xl shadow-2xl my-auto text-[11px] leading-relaxed border border-zinc-200">
        {/* Official Header */}
        <PrintHeader
          docTitulo="RELATÓRIO DE PRODUTIVIDADE DOS SECRETÁRIOS ESCOLARES"
          docSubtitulo={docSubtitulo}
        />

        {/* Metadados do Relatório */}
        <div className="bg-zinc-100/80 border border-zinc-300 rounded-lg p-3 my-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
          <div>
            <span className="font-bold text-zinc-700 block uppercase">Âmbito:</span>
            <span className="text-zinc-900 font-semibold">{legendaEscola}</span>
          </div>
          <div>
            <span className="font-bold text-zinc-700 block uppercase">Período Auditado:</span>
            <span className="text-zinc-900 font-semibold">{periodoLabel}</span>
          </div>
          <div>
            <span className="font-bold text-zinc-700 block uppercase">Nível de Acesso:</span>
            <span className="text-zinc-900 font-semibold">Nível 1 (Gestão Macro)</span>
          </div>
          <div>
            <span className="font-bold text-zinc-700 block uppercase">Emissão:</span>
            <span className="text-zinc-900 font-semibold">{new Date().toLocaleString('pt-BR')}</span>
          </div>
        </div>

        {/* Quadro de Resumo Executivo / KPIs */}
        <div className="grid grid-cols-4 gap-2.5 my-4">
          <div className="border border-zinc-300 rounded-lg p-2.5 bg-zinc-50/70 text-center">
            <span className="text-[9px] uppercase tracking-wider font-bold text-zinc-600 block">Cadastros Novos</span>
            <span className="text-lg font-black text-emerald-700">{resumo.total_cadastros_novos}</span>
            <span className="text-[8px] text-zinc-500 block">Alunos Inseridos</span>
          </div>

          <div className="border border-zinc-300 rounded-lg p-2.5 bg-zinc-50/70 text-center">
            <span className="text-[9px] uppercase tracking-wider font-bold text-zinc-600 block">Edições / Fichas</span>
            <span className="text-lg font-black text-sky-700">{resumo.total_edicoes_fichas}</span>
            <span className="text-[8px] text-zinc-500 block">Atualizações de Cadastro</span>
          </div>

          <div className="border border-zinc-300 rounded-lg p-2.5 bg-zinc-50/70 text-center">
            <span className="text-[9px] uppercase tracking-wider font-bold text-zinc-600 block">Secretários Ativos</span>
            <span className="text-lg font-black text-zinc-900">{resumo.total_secretarios_ativos} / {resumo.total_secretarios}</span>
            <span className="text-[8px] text-zinc-500 block">Em Atividade no Período</span>
          </div>

          <div className="border border-zinc-300 rounded-lg p-2.5 bg-zinc-50/70 text-center">
            <span className="text-[9px] uppercase tracking-wider font-bold text-zinc-600 block">Total de Ações</span>
            <span className="text-lg font-black text-purple-700">{resumo.total_acoes_geral}</span>
            <span className="text-[8px] text-zinc-500 block">Operações Registradas</span>
          </div>
        </div>

        {/* VISÃO SINTÉTICA: Tabela por Unidade Escolar */}
        {isSintetico ? (
          <div className="space-y-4 my-5">
            <div className="border-b border-zinc-300 pb-1.5 flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wide text-zinc-900">
                Consolidado de Produtividade por Unidade Escolar
              </h3>
              <span className="text-[10px] text-zinc-600 font-medium">
                {escolasBreakdown.length} Unidade(s) com Movimentação
              </span>
            </div>

            <table className="w-full text-left border-collapse border border-zinc-300 text-[10px]">
              <thead>
                <tr className="bg-zinc-200/80 text-zinc-900 border-b border-zinc-300">
                  <th className="p-2 border-r border-zinc-300 font-bold">Unidade Escolar</th>
                  <th className="p-2 border-r border-zinc-300 font-bold text-center w-24">Secretários</th>
                  <th className="p-2 border-r border-zinc-300 font-bold text-center w-28">Novos Cadastros</th>
                  <th className="p-2 border-r border-zinc-300 font-bold text-center w-28">Edições de Ficha</th>
                  <th className="p-2 border-r border-zinc-300 font-bold text-center w-28">Outras Ações</th>
                  <th className="p-2 font-bold text-center w-24 bg-zinc-300/60">Total de Ações</th>
                </tr>
              </thead>
              <tbody>
                {escolasBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-zinc-500 italic">
                      Nenhuma atividade registrada no período selecionado.
                    </td>
                  </tr>
                ) : (
                  escolasBreakdown.map((item, idx) => (
                    <tr key={idx} className={`border-b border-zinc-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50'}`}>
                      <td className="p-2 border-r border-zinc-200 font-semibold text-zinc-900">{item.escola_nome}</td>
                      <td className="p-2 border-r border-zinc-200 text-center font-medium">{item.secretarios_count}</td>
                      <td className="p-2 border-r border-zinc-200 text-center font-semibold text-emerald-800">{item.novos_cadastros}</td>
                      <td className="p-2 border-r border-zinc-200 text-center font-medium text-sky-800">{item.edicoes_fichas}</td>
                      <td className="p-2 border-r border-zinc-200 text-center font-medium text-zinc-700">{item.outras_atividades}</td>
                      <td className="p-2 text-center font-black text-zinc-900 bg-zinc-100/50">{item.total_acoes}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-zinc-200 text-zinc-900 font-bold border-t-2 border-zinc-400">
                  <td className="p-2 border-r border-zinc-300">TOTAL GERAL DA REDE</td>
                  <td className="p-2 border-r border-zinc-300 text-center">{resumo.total_secretarios}</td>
                  <td className="p-2 border-r border-zinc-300 text-center text-emerald-900">{resumo.total_cadastros_novos}</td>
                  <td className="p-2 border-r border-zinc-300 text-center text-sky-900">{resumo.total_edicoes_fichas}</td>
                  <td className="p-2 border-r border-zinc-300 text-center">{resumo.total_ocorrencias + resumo.total_transferencias}</td>
                  <td className="p-2 text-center font-black bg-zinc-300">{resumo.total_acoes_geral}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          /* VISÃO NOMINAL: Relação Individual de Secretários */
          <div className="space-y-4 my-5">
            <div className="border-b border-zinc-300 pb-1.5 flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wide text-zinc-900">
                Relação Nominal dos Secretários Escolares & Produtividade
              </h3>
              <span className="text-[10px] text-zinc-600 font-medium">
                {secretariosLista.length} Secretário(a)s Cadastrado(a)s
              </span>
            </div>

            <table className="w-full text-left border-collapse border border-zinc-300 text-[10px]">
              <thead>
                <tr className="bg-zinc-200/80 text-zinc-900 border-b border-zinc-300">
                  <th className="p-2 border-r border-zinc-300 font-bold">Secretário(a) Escolar</th>
                  <th className="p-2 border-r border-zinc-300 font-bold">Unidade de Lotação</th>
                  <th className="p-2 border-r border-zinc-300 font-bold text-center w-20">Novos Cad.</th>
                  <th className="p-2 border-r border-zinc-300 font-bold text-center w-20">Edições</th>
                  <th className="p-2 border-r border-zinc-300 font-bold text-center w-20">Outras</th>
                  <th className="p-2 border-r border-zinc-300 font-bold text-center w-20 bg-zinc-300/60">Total</th>
                  <th className="p-2 font-bold text-center w-28">Última Atividade</th>
                </tr>
              </thead>
              <tbody>
                {secretariosLista.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-zinc-500 italic">
                      Nenhum secretário escolar encontrado.
                    </td>
                  </tr>
                ) : (
                  secretariosLista.map((sec, idx) => (
                    <tr key={idx} className={`border-b border-zinc-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50'}`}>
                      <td className="p-2 border-r border-zinc-200 font-semibold text-zinc-900">
                        {sec.nome}
                      </td>
                      <td className="p-2 border-r border-zinc-200 text-zinc-700">{sec.escola_nome}</td>
                      <td className="p-2 border-r border-zinc-200 text-center font-bold text-emerald-800">{sec.novos_cadastros}</td>
                      <td className="p-2 border-r border-zinc-200 text-center font-medium text-sky-800">{sec.edicoes_fichas}</td>
                      <td className="p-2 border-r border-zinc-200 text-center font-medium text-zinc-700">
                        {sec.ocorrencias_lancadas + sec.transferencias_despachadas}
                      </td>
                      <td className="p-2 border-r border-zinc-200 text-center font-black text-zinc-900 bg-zinc-100/50">
                        {sec.total_acoes}
                      </td>
                      <td className="p-2 text-center text-[9px] text-zinc-600">
                        {sec.ultima_atividade ? new Date(sec.ultima_atividade).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Sem registros'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Rodapé e Assinaturas Oficiais */}
        <div className="mt-12 pt-6 border-t border-zinc-300 text-[10px] text-zinc-600 flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-12 text-center pt-8">
            <div className="border-t border-zinc-400 pt-2">
              <span className="font-bold text-zinc-900 block">Secretaria Municipal de Educação</span>
              <span>Gestão e Coordenação Pedagógica / Administrativa</span>
            </div>
            <div className="border-t border-zinc-400 pt-2">
              <span className="font-bold text-zinc-900 block">Auditoria do Sistema SIG</span>
              <span>Controle Interno e Registro de Atividades</span>
            </div>
          </div>

          <div className="text-center text-[9px] text-zinc-400 mt-2">
            SIG — Sistema Integrado de Gestão Escolar • Município de Sapeaçu - BA • Relatório reservado à Gestão Municipal de Nível 1
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
