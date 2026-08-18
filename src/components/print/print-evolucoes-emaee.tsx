'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { PrintHeader } from '@/components/print/print-header'

const sessionTimestamp = Date.now()

export interface EvolucaoPrintData {
  id: string
  especialidade: string
  data_atendimento: string
  tipo_atendimento?: string | null
  resumo_evolucao: string
  conduta_orientacoes?: string | null
  assinado_em?: string | null
  assinatura_profissional_url?: string | null
  profissional_nome?: string | null
  profissional_registro?: string | null
  funcionarios?: {
    nome: string
    assinatura_url?: string | null
  } | null
}

interface PrintEvolucoesEmaeeProps {
  aluno: {
    nome: string
    numero_matricula_emaee?: string | null
    localizacao_atendimento?: string | null
    ano_escolarizacao?: string | null
    escolas?: {
      nome: string
    } | null
  }
  evolucoes: EvolucaoPrintData[]
  escolaLogoUrl?: string | null
  onClose: () => void
  titulo?: string
}

export function PrintEvolucoesEmaee({ aluno, evolucoes, escolaLogoUrl, onClose, titulo }: PrintEvolucoesEmaeeProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  const handlePrint = () => {
    window.print()
  }

  if (!mounted) return null

  const isSingle = evolucoes.length === 1
  const docTitle = titulo || (isSingle ? 'REGISTRO DE EVOLUÇÃO CLÍNICA' : 'PRONTUÁRIO DE EVOLUÇÕES CLÍNICAS')
  
  // URL da logo do EMAEE recuperada do banco de dados como fallback seguro
  const defaultEmaeeLogo = 'https://nijjizpcodnjhvqwjuso.supabase.co/storage/v1/object/public/logos/escola_1785901172024.png'
  const resolvedLogo = escolaLogoUrl || defaultEmaeeLogo

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 overflow-y-auto print:static print:block print:p-0 print:bg-white print:overflow-visible print-portal-container">
      <style>{`
        @media print {
          body > *:not(.print-portal-container) {
            display: none !important;
          }
          .print-portal-container {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
      
      {/* Action Buttons (Hidden on Print) */}
      <div className="fixed top-4 right-4 z-[100] flex gap-2 print:hidden">
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-[#3ea6ff] hover:bg-[#3ea6ff]/90 text-black font-bold rounded-lg shadow flex items-center gap-2 text-sm cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Imprimir Documento
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-[#272727] hover:bg-[#333] text-white rounded-lg text-sm font-semibold cursor-pointer"
        >
          Fechar
        </button>
      </div>

      {/* A4 Printed Page Wrapper */}
      <div 
        className="bg-white text-black w-full max-w-[800px] p-8 shadow-2xl rounded-sm print:shadow-none print:p-0 print:w-full print:max-w-none text-[11px] leading-relaxed font-sans border border-gray-300 print:border-none flex flex-col justify-start my-auto"
        style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
      >
        <div>
          {/* Header */}
          <PrintHeader
            className="pb-3 border-b-2 border-black mb-4"
            escolaLogoUrl={resolvedLogo}
            escolaNome="EMAEE - Espaço Municipal de Atendimento Educacional Especializado"
            centerContent={
              <>
                <h1 className="text-sm font-extrabold tracking-wider text-gray-800 uppercase leading-none">
                  {docTitle}
                </h1>
                <p className="text-[10px] font-bold text-gray-500 mt-1">EMAEE - ATENDIMENTO MULTIDISCIPLINAR ESPECIALIZADO</p>
              </>
            }
          />

          {/* Patient / Prontuário General Data Table */}
          <div className="mb-4">
            <div className="bg-gray-100 border border-black px-2 py-1 font-bold text-[10px] uppercase mb-0 tracking-wide">
              DADOS CADASTRAIS DO PACIENTE
            </div>
            <table className="w-full border-collapse border border-black text-[10px]">
              <tbody>
                <tr>
                  <td className="border border-black p-2 w-1/2">
                    <span className="font-bold block text-[8px] uppercase text-gray-500">Nome do Paciente</span>
                    <span className="font-bold text-[11px] text-gray-900">{aluno.nome}</span>
                  </td>
                  <td className="border border-black p-2 w-1/4">
                    <span className="font-bold block text-[8px] uppercase text-gray-500">Nº Matrícula EMAEE</span>
                    <span className="font-semibold">{aluno.numero_matricula_emaee ?? 'Não gerada'}</span>
                  </td>
                  <td className="border border-black p-2 w-1/4">
                    <span className="font-bold block text-[8px] uppercase text-gray-500">Localização</span>
                    <span>{aluno.localizacao_atendimento ?? 'Não informada'}</span>
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-2 w-1/2">
                    <span className="font-bold block text-[8px] uppercase text-gray-500">Escola de Origem (Regular)</span>
                    <span>{aluno.escolas?.nome ?? 'Sem Escola Regular'}</span>
                  </td>
                  <td className="border border-black p-2 w-1/2" colSpan={2}>
                    <span className="font-bold block text-[8px] uppercase text-gray-500">Ano de Escolarização</span>
                    <span>{aluno.ano_escolarizacao ?? 'Não informado'}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Evolutions List */}
          <div className="space-y-6">
            <div className="bg-gray-100 border border-black px-2 py-1 font-bold text-[10px] uppercase mb-0 tracking-wide">
              HISTÓRICO DE ANOTAÇÕES DE EVOLUÇÃO
            </div>

            {evolucoes.length === 0 ? (
              <div className="text-center py-8 text-gray-500 border border-t-0 border-black text-xs italic">
                Nenhuma evolução clínica registrada para este prontuário.
              </div>
            ) : (
              <div className="space-y-6">
                {evolucoes.map((evo, index) => {
                  const sigUrl = evo.assinatura_profissional_url ?? evo.funcionarios?.assinatura_url
                  const dataFormatada = evo.data_atendimento 
                    ? new Date(`${evo.data_atendimento}T00:00:00`).toLocaleDateString('pt-BR')
                    : 'Sem data'
                  const assinadoEmFormatada = evo.assinado_em
                    ? new Date(evo.assinado_em).toLocaleString('pt-BR')
                    : null

                  return (
                    <div key={evo.id} className="border border-black rounded-md p-4 bg-white space-y-3 break-inside-avoid">
                      {/* Evolution Meta Info */}
                      <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                        <span className="font-bold text-xs text-blue-900">
                          Registro #{index + 1} - {evo.especialidade}
                        </span>
                        <span className="text-[10px] text-gray-600 font-semibold">
                          Data da Sessão: {dataFormatada} | Modalidade: {evo.tipo_atendimento ?? 'Presencial'}
                        </span>
                      </div>

                      {/* Resumo da Evolução */}
                      <div className="text-xs text-gray-900">
                        <div className="font-bold text-[9px] uppercase text-gray-500 mb-1">Evolução Clínica</div>
                        <p className="whitespace-pre-line leading-relaxed">{evo.resumo_evolucao}</p>
                      </div>

                      {/* Conduta/Orientações */}
                      {evo.conduta_orientacoes && (
                        <div className="text-xs text-gray-800 bg-gray-50 p-2 rounded border border-gray-100">
                          <div className="font-bold text-[9px] uppercase text-gray-500 mb-1">Conduta / Próximos Passos</div>
                          <p className="whitespace-pre-line">{evo.conduta_orientacoes}</p>
                        </div>
                      )}

                      {/* Professional Signature Block */}
                      <div className="flex justify-end pt-3">
                        <div className="flex flex-col items-center justify-end w-64 max-w-full text-center border-t border-gray-300 pt-2">
                          <div className="h-10 flex items-center justify-center mb-1">
                            {sigUrl ? (
                              <img
                                src={`${sigUrl}${sigUrl.includes('?') ? '&' : '?'}t=${sessionTimestamp}`}
                                alt={`Assinatura de ${evo.funcionarios?.nome}`}
                                className="max-h-10 object-contain mix-blend-multiply"
                              />
                            ) : (
                              <span className="text-[9px] text-gray-400 italic">Sem assinatura física cadastrada</span>
                            )}
                          </div>
                          <div className="text-[10px] font-bold text-gray-800 leading-none">
                            {evo.profissional_nome || evo.funcionarios?.nome || 'Profissional'}
                          </div>
                          <div className="text-[8px] text-gray-500 uppercase mt-0.5">
                            {evo.especialidade} {evo.profissional_registro ? ` - ${evo.profissional_registro}` : ''}
                          </div>
                          <div className="text-[7.5px] text-gray-400 mt-0.5">
                            Assinado digitalmente em: {assinadoEmFormatada ?? dataFormatada}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Oficial Footnote */}
        <div className="text-center text-[8px] text-gray-400 mt-12 border-t border-gray-200 pt-2">
          Este prontuário é um documento oficial emitido sob a chancela da Secretaria Municipal.
        </div>
      </div>
    </div>,
    document.body
  )
}
