'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { PrintHeader } from '@/components/print/print-header'
import { Printer, X } from 'lucide-react'

const sessionTimestamp = Date.now()

interface PrintComprovanteMatriculaEmaeeProps {
  prontuario: any
  onClose: () => void
}

export function PrintComprovanteMatriculaEmaee({ prontuario, onClose }: PrintComprovanteMatriculaEmaeeProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  const handlePrint = () => {
    window.print()
  }

  if (!mounted) return null

  const aluno = prontuario?.alunos || {}
  const dm = aluno?.dados_matricula || {}
  const escolaRegularNome = prontuario?.escola_origem_fora_rede && prontuario?.escola_origem_nome
    ? `${prontuario.escola_origem_nome}${prontuario.escola_origem_municipio ? ` (${prontuario.escola_origem_municipio} - ${prontuario.escola_origem_uf ?? 'BA'})` : ''}`
    : (prontuario?.escolas?.nome ?? prontuario?.escola_regular_nome ?? dm?.escolaNome ?? 'Não informada / Encaminhamento externo')
  const defaultEmaeeLogo = 'https://nijjizpcodnjhvqwjuso.supabase.co/storage/v1/object/public/logos/escola_1785901172024.png'

  const assinaturaRespUrl = prontuario?.assinatura_responsavel_aluno_url || dm?.assinatura_responsavel_url || aluno?.assinatura_responsavel_url
  const assinaturaServidorUrl = prontuario?.assinatura_responsavel_matricula_url || prontuario?.funcionarios?.assinatura_url

  const formatarData = (val?: string | null) => {
    if (!val) return '-'
    const str = String(val).trim()
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      const [ano, mes, dia] = str.substring(0, 10).split('-')
      return `${dia}/${mes}/${ano}`
    }
    try {
      const d = new Date(str.includes('T') ? str : `${str}T00:00:00`)
      if (!isNaN(d.getTime())) {
        const dia = String(d.getDate()).padStart(2, '0')
        const mes = String(d.getMonth() + 1).padStart(2, '0')
        const ano = d.getFullYear()
        return `${dia}/${mes}/${ano}`
      }
      return str
    } catch {
      return str
    }
  }

  const renderVia = (isViaEscola: boolean) => {
    return (
      <div className="border border-black p-4 bg-white flex flex-col justify-between space-y-3">
        <div>
          {/* Header */}
          <PrintHeader
            className="pb-2 border-b-2 border-black mb-2"
            escolaLogoUrl={defaultEmaeeLogo}
            escolaNome="EMAEE - Espaço Municipal de Atendimento Educacional Especializado"
            centerContent={
              <>
                <h1 className="text-xs font-black tracking-wider text-gray-900 uppercase">
                  COMPROVANTE DE MATRÍCULA / REQUERIMENTO — EMAEE
                </h1>
                <p className="text-[9px] font-bold text-gray-600">
                  {isViaEscola ? '1ª VIA — UNIDADE DE ATENDIMENTO EMAEE' : '2ª VIA — RESPONSÁVEL LEGAL / ALUNO'}
                </p>
                <p className="text-[8px] font-semibold text-gray-500">
                  Ano Letivo {new Date().getFullYear()}
                </p>
              </>
            }
          />

          {/* Tabela de Dados */}
          <table className="w-full border-collapse border border-black mb-2 text-[9.5px]">
            <tbody>
              <tr>
                <td colSpan={2} className="border border-black p-1.5 bg-gray-50/50">
                  <span className="font-bold block text-[7.5px] uppercase text-gray-600">Nome do Estudante</span>
                  <span className="font-extrabold text-[11px] text-gray-900">{aluno?.nome || prontuario?.nome || '-'}</span>
                </td>
                <td className="border border-black p-1.5 bg-gray-50/50 w-1/4">
                  <span className="font-bold block text-[7.5px] uppercase text-gray-600">Nº Matrícula EMAEE</span>
                  <span className="font-bold text-[11px] font-mono text-purple-900">{prontuario?.numero_matricula_emaee ?? 'Não gerada'}</span>
                </td>
              </tr>
              <tr>
                <td className="border border-black p-1.5 w-1/3">
                  <span className="font-bold block text-[7.5px] uppercase text-gray-600">Data de Nascimento</span>
                  <span className="font-semibold">{formatarData(aluno?.data_nascimento || dm?.nascimentoAluno)}</span>
                </td>
                <td className="border border-black p-1.5 w-1/3">
                  <span className="font-bold block text-[7.5px] uppercase text-gray-600">CPF do Aluno</span>
                  <span>{aluno?.cpf || dm?.cpfAluno || '-'}</span>
                </td>
                <td className="border border-black p-1.5 w-1/3">
                  <span className="font-bold block text-[7.5px] uppercase text-gray-600">Identificação Censo (INEP)</span>
                  <span>{aluno?.identif_unica_censo || aluno?.inep || dm?.censoAluno || '-'}</span>
                </td>
              </tr>
              <tr>
                <td className="border border-black p-1.5">
                  <span className="font-bold block text-[7.5px] uppercase text-gray-600">Turno de Atendimento EMAEE</span>
                  <span className="font-semibold">{prontuario?.turno_atendimento ?? 'Matutino'}</span>
                </td>
                <td className="border border-black p-1.5">
                  <span className="font-bold block text-[7.5px] uppercase text-gray-600">Localização</span>
                  <span>{prontuario?.localizacao_atendimento ?? 'Urbana'}</span>
                </td>
                <td className="border border-black p-1.5">
                  <span className="font-bold block text-[7.5px] uppercase text-gray-600">Data da Matrícula</span>
                  <span className="font-semibold">{formatarData(prontuario?.data_matricula)}</span>
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="border border-black p-1.5">
                  <span className="font-bold block text-[7.5px] uppercase text-gray-600">Escola Regular de Origem</span>
                  <span>{escolaRegularNome}</span>
                </td>
                <td className="border border-black p-1.5">
                  <span className="font-bold block text-[7.5px] uppercase text-gray-600">Ano / Turma Regular</span>
                  <span>{prontuario?.ano_escolarizacao ?? '-'} {prontuario?.turma_regular ? `(${prontuario.turma_regular})` : ''}</span>
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="border border-black p-1.5">
                  <span className="font-bold block text-[7.5px] uppercase text-gray-600">Mãe / Pai / Responsável</span>
                  <span className="font-bold">{aluno?.nome_mae || aluno?.nome_pai || prontuario?.responsavel_assinatura_nome || 'Não informado'}</span>
                </td>
                <td className="border border-black p-1.5">
                  <span className="font-bold block text-[7.5px] uppercase text-gray-600">Telefone para Contato</span>
                  <span>{aluno?.telefone || aluno?.telefone_emergencia || dm?.telefoneAluno || '-'}</span>
                </td>
              </tr>
              {prontuario?.cid_codigo && (
                <tr>
                  <td colSpan={3} className="border border-black p-1.5 bg-rose-50/30">
                    <span className="font-bold block text-[7.5px] uppercase text-rose-700">Diagnóstico / CID Informado</span>
                    <span className="font-semibold text-rose-900">{prontuario.cid_codigo} {prontuario.principal_queixa ? `— ${prontuario.principal_queixa}` : ''}</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Assinaturas */}
        <div className="grid grid-cols-2 gap-8 pt-2 border-t border-gray-300">
          {/* Assinatura do Servidor */}
          <div className="flex flex-col items-center justify-end text-center">
            <div className="h-8 flex items-center justify-center mb-1">
              {assinaturaServidorUrl ? (
                <img
                  src={`${assinaturaServidorUrl}${assinaturaServidorUrl.includes('?') ? '&' : '?'}t=${sessionTimestamp}`}
                  alt="Assinatura do Servidor"
                  className="max-h-8 object-contain mix-blend-multiply"
                />
              ) : (
                <span className="text-[7.5px] text-gray-400 italic">Assinatura do Servidor</span>
              )}
            </div>
            <div className="border-t border-black w-full pt-1">
              <div className="font-bold text-[8.5px] uppercase text-gray-900">
                {prontuario?.responsavel_matricula_nome || prontuario?.funcionarios?.nome || 'Servidor Responsável pelo EMAEE'}
              </div>
              <div className="text-[7px] text-gray-500">
                Secretaria Municipal de Educação
              </div>
            </div>
          </div>

          {/* Assinatura do Responsável */}
          <div className="flex flex-col items-center justify-end text-center">
            <div className="h-8 flex items-center justify-center mb-1">
              {assinaturaRespUrl ? (
                <img
                  src={`${assinaturaRespUrl}${assinaturaRespUrl.includes('?') ? '&' : '?'}t=${sessionTimestamp}`}
                  alt="Assinatura do Responsável"
                  className="max-h-8 object-contain mix-blend-multiply"
                />
              ) : (
                <span className="text-[7.5px] text-gray-400 italic">Assinatura física à caneta</span>
              )}
            </div>
            <div className="border-t border-black w-full pt-1">
              <div className="font-bold text-[8.5px] uppercase text-gray-900">
                {prontuario?.responsavel_assinatura_nome || aluno?.nome_mae || aluno?.nome_pai || 'Assinatura do Responsável'}
              </div>
              <div className="text-[7px] text-gray-500">
                Pai / Mãe / Responsável Legal
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé da via */}
        <div className="text-center text-[7px] text-gray-400 pt-1">
          Emitido em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • SIG Municipal
        </div>
      </div>
    )
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-4 overflow-y-auto print:static print:block print:p-0 print:bg-white print:overflow-visible print-portal-container">
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
            margin: 8mm 10mm;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-hidden {
            display: none !important;
          }
        }
      `}</style>

      {/* Botões Flutuantes */}
      <div className="fixed top-4 right-4 z-[100] flex gap-2 print-hidden">
        <button
          type="button"
          onClick={handlePrint}
          className="px-4 py-2.5 bg-[#10b981] hover:bg-[#10b981]/90 text-white font-bold rounded-xl shadow-lg flex items-center gap-2 text-xs transition-all cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimir Comprovante</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2.5 bg-[#27272a] hover:bg-[#3f3f46] text-white rounded-xl text-xs font-semibold border border-[#3f3f46] transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <X className="w-4 h-4" />
          <span>Fechar</span>
        </button>
      </div>

      {/* Folha A4 com 2 vias */}
      <div 
        className="bg-white text-black w-full max-w-[800px] p-6 shadow-2xl rounded-sm print:shadow-none print:p-0 print:w-full print:max-w-none flex flex-col justify-between my-auto border border-gray-300 print:border-none print:m-0 space-y-4 print:space-y-6"
        style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
      >
        {/* 1ª Via: Escola */}
        {renderVia(true)}

        {/* Linha Tracejada de Corte */}
        <div className="relative py-1 print-hidden">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-dashed border-gray-400"></div>
          </div>
          <div className="relative flex justify-center text-[9px] font-bold text-gray-500 uppercase">
            <span className="bg-white px-3 border border-gray-300 rounded-full py-0.5">Destaque / Corte aqui</span>
          </div>
        </div>
        
        <div className="hidden print:block border-t-2 border-dashed border-black my-2"></div>

        {/* 2ª Via: Responsável */}
        {renderVia(false)}
      </div>
    </div>,
    document.body
  )
}
