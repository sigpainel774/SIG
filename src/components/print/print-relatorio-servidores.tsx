'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { X, Printer, Users, FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PrintHeader } from '@/components/print/print-header'

// Timestamp fixo de sessão para evitar flickering de avatares/logos
const sessionTimestamp = Date.now()

export interface ResumoServidoresPrint {
  total_servidores_unicos: number
  total_cargos_ocupados: number
  total_contratados: number
  total_concursados: number
  total_nomeados: number
  total_outros: number
  total_regular: number
  total_eja: number
}

export interface CargoBreakdownPrint {
  cargo: string
  ocupacoes: number
  regular: number
  eja: number
  concursados: number
  contratados: number
  nomeados: number
  outros: number
}

export interface ServidorNominalPrint {
  id: string
  nome: string
  cpf?: string | null
  registro_profissional?: string | null
  cargo?: string | null
  status: string
  orgao?: string | null
  modalidade_ensino?: string | null
  vinculo_tipo?: string | null
  vinculo_tipo_normalizado?: string | null
}

interface PrintRelatorioServidoresProps {
  modoView: 'sintetico' | 'nominal'
  escolaNome?: string | null
  filtroCargo?: string
  filtroModalidade?: string
  filtroVinculo?: string
  resumo: ResumoServidoresPrint
  cargos: CargoBreakdownPrint[]
  servidoresNominais?: ServidorNominalPrint[]
  onClose: () => void
}

export function PrintRelatorioServidores({
  modoView,
  escolaNome,
  filtroCargo,
  filtroModalidade,
  filtroVinculo,
  resumo,
  cargos,
  servidoresNominais = [],
  onClose,
}: PrintRelatorioServidoresProps) {
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

  // Fallback inteligente para garantir que cargos e resumo nunca fiquem vazios
  const cargosEfetivos = useMemo<CargoBreakdownPrint[]>(() => {
    if (cargos && cargos.length > 0) return cargos
    if (!servidoresNominais || servidoresNominais.length === 0) return []

    const map = new Map<string, CargoBreakdownPrint>()
    for (const s of servidoresNominais) {
      const cName = (s.cargo || 'Cargo não informado').trim()
      const isEja = (s.modalidade_ensino || '').toUpperCase().includes('EJA')
      const vUpper = (s.vinculo_tipo_normalizado || s.vinculo_tipo || '').toUpperCase()

      let vKey: 'concursados' | 'contratados' | 'nomeados' | 'outros' = 'outros'
      if (vUpper.includes('CONCURSADO') || vUpper.includes('EFETIVO')) vKey = 'concursados'
      else if (vUpper.includes('CONTRATADO') || vUpper.includes('SUBSTITUTO') || vUpper.includes('PRESTADOR') || vUpper.includes('RESERVISTA')) vKey = 'contratados'
      else if (vUpper.includes('NOMEADO')) vKey = 'nomeados'

      const item = map.get(cName) || {
        cargo: cName,
        ocupacoes: 0,
        regular: 0,
        eja: 0,
        concursados: 0,
        contratados: 0,
        nomeados: 0,
        outros: 0,
      }
      item.ocupacoes++
      if (isEja) item.eja++
      else item.regular++
      item[vKey]++
      map.set(cName, item)
    }

    return Array.from(map.values()).sort(
      (a, b) => b.ocupacoes - a.ocupacoes || a.cargo.localeCompare(b.cargo, 'pt-BR')
    )
  }, [cargos, servidoresNominais])

  const resumoEfetivo = useMemo<ResumoServidoresPrint>(() => {
    if (resumo && resumo.total_cargos_ocupados > 0) return resumo
    if (!servidoresNominais || servidoresNominais.length === 0) return resumo

    const uniqueIds = new Set<string>()
    let reg = 0
    let eja = 0
    let conc = 0
    let cont = 0
    let nom = 0
    let out = 0

    for (const s of servidoresNominais) {
      uniqueIds.add(s.id)
      const isEja = (s.modalidade_ensino || '').toUpperCase().includes('EJA')
      if (isEja) eja++
      else reg++

      const vUpper = (s.vinculo_tipo_normalizado || s.vinculo_tipo || '').toUpperCase()
      if (vUpper.includes('CONCURSADO') || vUpper.includes('EFETIVO')) conc++
      else if (vUpper.includes('CONTRATADO') || vUpper.includes('SUBSTITUTO') || vUpper.includes('PRESTADOR') || vUpper.includes('RESERVISTA')) cont++
      else if (vUpper.includes('NOMEADO')) nom++
      else out++
    }

    return {
      total_servidores_unicos: uniqueIds.size,
      total_cargos_ocupados: servidoresNominais.length,
      total_contratados: cont,
      total_concursados: conc,
      total_nomeados: nom,
      total_outros: out,
      total_regular: reg,
      total_eja: eja,
    }
  }, [resumo, servidoresNominais])

  if (!mounted) return null

  const isSintetico = modoView === 'sintetico'
  const docSubtitulo = isSintetico
    ? 'Relatório Estatístico e Consolidado por Cargos e Vínculos'
    : 'Relação Nominal de Servidores e Lotações Escolares'

  const legendaEscola = escolaNome ?? 'Rede Municipal (Todas as Unidades)'
  const legendaCargo = filtroCargo && filtroCargo !== '' ? filtroCargo : 'Todos os Cargos'
  const legendaModalidade = filtroModalidade ?? 'Todas'
  const legendaVinculo = filtroVinculo ?? 'Todos'

  const totalCargosCalculado = resumoEfetivo.total_cargos_ocupados ?? 0

  return createPortal(
    <div className="print-portal-container">
      <style>{`
        @media screen {
          .print-portal-container {
            position: fixed;
            inset: 0;
            z-index: 9999;
            background-color: rgba(9,9,11,0.95);
            display: flex;
            align-items: flex-start;
            justify-content: center;
            padding: 1.5rem 1rem;
            overflow-y: auto;
          }
        }
        @media print {
          @page {
            size: ${isSintetico ? 'A4 portrait' : 'A4 landscape'};
            margin: 8mm 10mm;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body > *:not(.print-portal-container) {
            display: none !important;
            visibility: hidden !important;
          }
          .print-portal-container {
            display: block !important;
            visibility: visible !important;
            position: static !important;
            width: 100% !important;
            min-height: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            padding: 0 !important;
            margin: 0 !important;
            inset: auto !important;
            overflow: visible !important;
          }
          .print-portal-container * {
            visibility: visible !important;
          }
          .no-print {
            display: none !important;
          }
          .print-sheet {
            width: 100% !important;
            max-width: 100% !important;
            min-height: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .print-cargo-block {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Botões Flutuantes de Ação (Ocultos na Impressão) */}
      <div className="fixed top-4 right-4 flex gap-3 print:hidden no-print z-[10000]">
        <Button
          onClick={handlePrint}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl h-10 px-5 shadow-lg flex items-center gap-2 cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          Imprimir Relatório (A4)
        </Button>
        <Button
          onClick={onClose}
          variant="ghost"
          className="bg-secondary border border-border hover:bg-hoverCustom text-foreground font-bold rounded-xl h-10 px-5 shadow-lg flex items-center gap-2 cursor-pointer"
        >
          <X className="w-4 h-4" />
          Fechar
        </Button>
      </div>

      {/* Folha A4 de Visualização */}
      <div className={`bg-white text-black p-8 font-sans shadow-2xl rounded-lg print-sheet ${isSintetico ? 'w-[210mm]' : 'w-[297mm]'}`}>
        {/* Cabeçalho Oficial */}
        <PrintHeader
          docTitulo="RELATÓRIO OFICIAL DE SERVIDORES"
          docSubtitulo={docSubtitulo}
          escolaNome={escolaNome || undefined}
          timestamp={sessionTimestamp}
        />

        {/* Barra de Filtros Aplicados */}
        <div className="grid grid-cols-4 gap-2 mb-4 p-2.5 bg-gray-100 border border-gray-300 rounded-lg text-[9.5px]">
          <div>
            <span className="font-bold text-gray-500 uppercase block">Unidade Escolar:</span>
            <span className="font-extrabold text-gray-900 truncate block">{legendaEscola}</span>
          </div>
          <div>
            <span className="font-bold text-gray-500 uppercase block">Filtro Cargo:</span>
            <span className="font-extrabold text-gray-900 truncate block">{legendaCargo}</span>
          </div>
          <div>
            <span className="font-bold text-gray-500 uppercase block">Modalidade:</span>
            <span className="font-extrabold text-gray-900 truncate block">{legendaModalidade}</span>
          </div>
          <div>
            <span className="font-bold text-gray-500 uppercase block">Tipo de Vínculo:</span>
            <span className="font-extrabold text-gray-900 truncate block">{legendaVinculo}</span>
          </div>
        </div>

        {/* Resumo Executivo (KPIs Estatísticos) */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          <div className="border border-gray-300 rounded-lg p-2.5 bg-blue-50/50 text-center">
            <span className="text-[9px] font-bold text-blue-800 uppercase block">Servidores Únicos</span>
            <span className="text-xl font-black text-blue-900 block mt-0.5">
              {resumoEfetivo.total_servidores_unicos ?? 0}
            </span>
            <span className="text-[8px] text-blue-700 font-semibold block">Deduplicados</span>
          </div>

          <div className="border border-gray-300 rounded-lg p-2.5 bg-emerald-50/50 text-center">
            <span className="text-[9px] font-bold text-emerald-800 uppercase block">Total de Cargos Ocupados</span>
            <span className="text-xl font-black text-emerald-900 block mt-0.5">
              {resumoEfetivo.total_cargos_ocupados ?? 0}
            </span>
            <span className="text-[8px] text-emerald-700 font-semibold block">Postos ativos</span>
          </div>

          <div className="border border-gray-300 rounded-lg p-2.5 bg-purple-50/50 text-center">
            <span className="text-[9px] font-bold text-purple-800 uppercase block">Ensino Regular</span>
            <span className="text-xl font-black text-purple-900 block mt-0.5">
              {resumoEfetivo.total_regular ?? 0}
            </span>
            <span className="text-[8px] text-purple-700 font-semibold block">
              {totalCargosCalculado > 0 ? `${Math.round(((resumoEfetivo.total_regular ?? 0) / totalCargosCalculado) * 100)}% das ocupações` : '0%'}
            </span>
          </div>

          <div className="border border-gray-300 rounded-lg p-2.5 bg-amber-50/50 text-center">
            <span className="text-[9px] font-bold text-amber-800 uppercase block">Modalidade EJA</span>
            <span className="text-xl font-black text-amber-900 block mt-0.5">
              {resumoEfetivo.total_eja ?? 0}
            </span>
            <span className="text-[8px] text-amber-700 font-semibold block">
              {totalCargosCalculado > 0 ? `${Math.round(((resumoEfetivo.total_eja ?? 0) / totalCargosCalculado) * 100)}% das ocupações` : '0%'}
            </span>
          </div>
        </div>

        {/* Quadro de Distribuição por Vínculo */}
        <div className="mb-5 p-3 border border-gray-300 rounded-lg bg-gray-50">
          <span className="text-[9.5px] font-extrabold text-gray-800 uppercase block mb-1.5">
            Quadro de Distribuição por Vínculo Profissional
          </span>
          <div className="grid grid-cols-4 gap-3 text-center text-xs">
            <div className="p-2 bg-white border border-gray-200 rounded-md">
              <span className="text-[9px] text-gray-500 font-bold block">CONCURSADOS / EFETIVOS</span>
              <strong className="text-blue-900 text-sm">{resumoEfetivo.total_concursados ?? 0}</strong>
            </div>
            <div className="p-2 bg-white border border-gray-200 rounded-md">
              <span className="text-[9px] text-gray-500 font-bold block">CONTRATADOS / TEMPORÁRIOS</span>
              <strong className="text-emerald-900 text-sm">{resumoEfetivo.total_contratados ?? 0}</strong>
            </div>
            <div className="p-2 bg-white border border-gray-200 rounded-md">
              <span className="text-[9px] text-gray-500 font-bold block">NOMEADOS / COMISSIONADOS</span>
              <strong className="text-purple-900 text-sm">{resumoEfetivo.total_nomeados ?? 0}</strong>
            </div>
            <div className="p-2 bg-white border border-gray-200 rounded-md">
              <span className="text-[9px] text-gray-500 font-bold block">OUTROS VÍNCULOS</span>
              <strong className="text-amber-900 text-sm">{resumoEfetivo.total_outros ?? 0}</strong>
            </div>
          </div>
        </div>

        {/* Conteúdo Dinâmico: Modo Sintético vs Modo Nominal */}
        {isSintetico ? (
          /* Tabela Consolidada por Cargo e Sumário Hierárquico */
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2 text-[10px] font-bold uppercase text-gray-800 border-b border-gray-300 pb-1">
              <div className="flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-blue-900" />
                <span>Detalhamento Consolidado por Cargo e Função ({cargosEfetivos.length} cargos)</span>
              </div>
              <span className="text-gray-500">Valores em número de ocupações</span>
            </div>

            <table className="w-full text-left border-collapse text-[10px] mb-6">
              <thead>
                <tr className="border-y-2 border-black bg-gray-100 font-bold uppercase text-gray-900">
                  <th className="py-2 px-2">Cargo / Função</th>
                  <th className="py-2 px-2 text-center w-24">Total Ocupações</th>
                  <th className="py-2 px-2 text-center w-24">Ensino Regular</th>
                  <th className="py-2 px-2 text-center w-20">EJA</th>
                  <th className="py-2 px-2 text-center w-20">Concursados</th>
                  <th className="py-2 px-2 text-center w-20">Contratados</th>
                  <th className="py-2 px-2 text-center w-20">Nomeados</th>
                  <th className="py-2 px-2 text-center w-16">Outros</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {cargosEfetivos.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="py-1.5 px-2 font-bold text-gray-900">{item.cargo}</td>
                    <td className="py-1.5 px-2 text-center font-black text-blue-900">{item.ocupacoes}</td>
                    <td className="py-1.5 px-2 text-center text-gray-800">{item.regular}</td>
                    <td className="py-1.5 px-2 text-center text-amber-900 font-semibold">{item.eja}</td>
                    <td className="py-1.5 px-2 text-center text-blue-800 font-semibold">{item.concursados}</td>
                    <td className="py-1.5 px-2 text-center text-emerald-800 font-semibold">{item.contratados}</td>
                    <td className="py-1.5 px-2 text-center text-purple-800 font-semibold">{item.nomeados}</td>
                    <td className="py-1.5 px-2 text-center text-gray-500">{item.outros}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-black font-black bg-gray-100 text-gray-900 text-[10.5px]">
                <tr>
                  <td className="py-2 px-2 uppercase">TOTAL DA UNIDADE ADMINISTRATIVA</td>
                  <td className="py-2 px-2 text-center text-blue-900">{resumoEfetivo.total_cargos_ocupados ?? 0}</td>
                  <td className="py-2 px-2 text-center">{resumoEfetivo.total_regular ?? 0}</td>
                  <td className="py-2 px-2 text-center text-amber-900">{resumoEfetivo.total_eja ?? 0}</td>
                  <td className="py-2 px-2 text-center text-blue-900">{resumoEfetivo.total_concursados ?? 0}</td>
                  <td className="py-2 px-2 text-center text-emerald-900">{resumoEfetivo.total_contratados ?? 0}</td>
                  <td className="py-2 px-2 text-center text-purple-900">{resumoEfetivo.total_nomeados ?? 0}</td>
                  <td className="py-2 px-2 text-center text-gray-600">{resumoEfetivo.total_outros ?? 0}</td>
                </tr>
              </tfoot>
            </table>

            {/* Sumário Estruturado de Cargos e Relação de Servidores (Estilo 1 e 1.1) */}
            <div className="mt-6 pt-4 border-t-2 border-gray-300">
              <div className="flex items-center justify-between mb-3 text-[10.5px] font-black uppercase text-gray-900 border-b border-gray-300 pb-1">
                <span>Relação Sumarizada de Servidores por Cargo</span>
                <span className="text-gray-500 font-normal">Estrutura Oficial de Lotação</span>
              </div>

              <div className="space-y-4">
                {cargosEfetivos.map((cargoItem, cIdx) => {
                  const servidoresDoCargo = servidoresNominais.filter((s) => {
                    const c1 = (s.cargo || '').trim().toLowerCase()
                    const c2 = cargoItem.cargo.trim().toLowerCase()
                    return c1 === c2
                  })

                  return (
                    <div key={cIdx} className="print-cargo-block">
                      {/* Título do Cargo no estilo de Sumário "1", "2", etc. */}
                      <div className="flex items-center justify-between bg-gray-100 border-l-4 border-blue-900 px-3 py-1.5 rounded-r">
                        <span className="font-extrabold text-[11px] text-gray-900">
                          {cIdx + 1}. {cargoItem.cargo.toUpperCase()}
                        </span>
                        <span className="text-[9.5px] font-bold text-gray-700">
                          Total: {cargoItem.ocupacoes} {cargoItem.ocupacoes === 1 ? 'ocupação' : 'ocupações'}
                        </span>
                      </div>

                      {/* Lista de Servidores no estilo "1.1", "1.2", sem estar em negrito */}
                      <div className="pl-4 pt-1.5 space-y-1">
                        {servidoresDoCargo.map((serv, sIdx) => {
                          const matriculaDisplay = serv.registro_profissional?.trim()
                            ? serv.registro_profissional
                            : serv.cpf
                            ? `CPF: ${serv.cpf}`
                            : 'Não informada'

                          return (
                            <div
                              key={serv.id || sIdx}
                              className="flex items-baseline justify-between text-[10px] text-gray-800 font-normal py-1 border-b border-dotted border-gray-200"
                              style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
                            >
                              <div className="flex items-baseline gap-1.5">
                                <span className="font-mono text-gray-500 text-[9.5px] min-w-7">
                                  {cIdx + 1}.{sIdx + 1}
                                </span>
                                <span className="font-normal text-gray-900">{serv.nome}</span>
                                <span className="text-gray-500 font-normal text-[9px] ml-1">
                                  — Matrícula: {matriculaDisplay}
                                </span>
                              </div>
                              <div className="text-[9px] text-gray-500 flex items-center gap-2">
                                <span>{serv.modalidade_ensino ?? 'Regular'}</span>
                                <span>•</span>
                                <span>{serv.vinculo_tipo ?? 'Não inf.'}</span>
                              </div>
                            </div>
                          )
                        })}

                        {servidoresDoCargo.length === 0 && (
                          <div className="text-[9.5px] text-gray-400 italic py-1 pl-3">
                            Nenhum servidor vinculado a este cargo nos filtros atuais.
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Tabela Nominal de Servidores */
          <div className="mb-6 print-section">
            <div className="flex items-center justify-between mb-2 text-[10px] font-bold uppercase text-gray-800 border-b border-gray-300 pb-1">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-900" />
                <span>Relação Nominal de Servidores ({servidoresNominais.length} servidor(es))</span>
              </div>
              <span className="text-gray-500">Ordenado por Nome Completo</span>
            </div>

            <table className="w-full text-left border-collapse text-[9.5px]">
              <thead>
                <tr className="border-y-2 border-black bg-gray-100 font-bold uppercase text-gray-900">
                  <th className="py-2 px-1 text-center w-8">#</th>
                  <th className="py-2 px-2">Nome Completo</th>
                  <th className="py-2 px-2">Matrícula / CPF</th>
                  <th className="py-2 px-2">Cargo / Função</th>
                  <th className="py-2 px-2">Unidade / Órgão</th>
                  <th className="py-2 px-2 text-center w-20">Modalidade</th>
                  <th className="py-2 px-2 text-center w-24">Vínculo</th>
                  <th className="py-2 px-2 text-center w-16">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {servidoresNominais.map((serv, idx) => (
                  <tr key={serv.id || idx} className="hover:bg-gray-50">
                    <td className="py-1.5 px-1 text-center font-bold text-gray-500">{idx + 1}</td>
                    <td className="py-1.5 px-2 font-bold text-gray-900">{serv.nome}</td>
                    <td className="py-1.5 px-2 font-mono text-[9px] text-gray-700">
                      {serv.registro_profissional?.trim() || serv.cpf || '—'}
                    </td>
                    <td className="py-1.5 px-2 font-semibold text-gray-800">{serv.cargo ?? '—'}</td>
                    <td className="py-1.5 px-2 text-gray-700">{serv.orgao ?? '—'}</td>
                    <td className="py-1.5 px-2 text-center font-bold">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] uppercase ${serv.modalidade_ensino === 'EJA' ? 'bg-purple-100 text-purple-900 border border-purple-300' : 'bg-blue-100 text-blue-900 border border-blue-300'}`}>
                        {serv.modalidade_ensino ?? 'Regular'}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-center font-semibold text-gray-800">{serv.vinculo_tipo ?? 'Não Inf.'}</td>
                    <td className="py-1.5 px-2 text-center font-bold uppercase text-[8.5px]">
                      <span className={serv.status === 'ativo' ? 'text-emerald-800' : 'text-gray-500'}>
                        {serv.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {servidoresNominais.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-gray-400 italic">
                      Nenhum servidor encontrado para a seleção de filtros aplicada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Rodapé Oficial de Validação */}
        <div className="mt-8 pt-4 border-t border-gray-300 flex justify-between text-[9px] text-gray-500">
          <div>
            <p className="font-bold text-gray-700">SIG — Sistema Integrado de Gestão Escolar de Sapeaçu</p>
            <p className="mt-0.5">Emissão automatizada pelo módulo de Relatórios de Servidores de Recursos Humanos.</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-gray-900">Emissão: {new Date().toLocaleString('pt-BR')}</p>
            <p className="text-[8px] text-gray-500">Documento gerado oficialmente para fins administrativos</p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
