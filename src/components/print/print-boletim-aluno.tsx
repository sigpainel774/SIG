'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

export interface BoletimMateriaData {
  id: string
  nome: string
  base_curricular?: string
}

export interface BoletimNotaData {
  materia_id: string
  unidade: number
  nota1: number | null
  nota2: number | null
  nota3: number | null
}

export interface BoletimRecuperacaoData {
  materia_id: string
  nota: number | null
}

interface PrintBoletimAlunoProps {
  aluno: {
    id: string
    nome: string
  }
  turma: {
    nome: string
    turno: string
    ano_letivo: number
  }
  escolaNome: string
  escolaLogoUrl?: string | null
  materias: BoletimMateriaData[]
  notas: BoletimNotaData[]
  recuperacoes?: BoletimRecuperacaoData[]
  onClose: () => void
}

export function PrintBoletimAluno({
  aluno,
  turma,
  escolaNome,
  escolaLogoUrl,
  materias,
  notas,
  recuperacoes = [],
  onClose
}: PrintBoletimAlunoProps) {
  const [mounted, setMounted] = useState(false)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const logoPrefeituraUrl = `${supabaseUrl}/storage/v1/object/public/logos/logo-prefeitura.png`
  const logoSecretariaUrl = `${supabaseUrl}/storage/v1/object/public/logos/logo-secretaria.jpg`

  const getCacheBustedUrl = (url: string) => {
    if (!url) return ''
    if (url.startsWith('data:image')) return url
    const cleanUrl = url.split('?')[0]
    const separator = cleanUrl.includes('?') ? '&' : '?'
    return `${cleanUrl}${separator}t=${Date.now()}`
  }

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  const handlePrint = () => {
    window.print()
  }

  // Helpers de cálculos de média
  const obterNotasUnidade = (materiaId: string, unidade: number) => {
    return notas.find(n => n.materia_id === materiaId && n.unidade === unidade) || {
      nota1: null,
      nota2: null,
      nota3: null
    }
  }

  const calcularMediaUnidade = (materiaId: string, unidade: number) => {
    const n = obterNotasUnidade(materiaId, unidade)
    const validas = [n.nota1, n.nota2, n.nota3].filter((val): val is number => val !== null && !isNaN(Number(val)))
    if (validas.length === 0) return null
    // Contamos notas não lançadas como 0 caso pelo menos uma tenha sido lançada
    const n1 = n.nota1 ?? 0
    const n2 = n.nota2 ?? 0
    const n3 = n.nota3 ?? 0
    return parseFloat(((Number(n1) + Number(n2) + Number(n3)) / 3).toFixed(1))
  }

  const calcularMediaFinalOriginal = (materiaId: string) => {
    const m1 = calcularMediaUnidade(materiaId, 1)
    const m2 = calcularMediaUnidade(materiaId, 2)
    const m3 = calcularMediaUnidade(materiaId, 3)

    const medias = [m1, m2, m3].filter((m): m is number => m !== null)
    if (medias.length === 0) return null
    
    // Média baseia-se apenas nas unidades já lançadas para não distorcer no meio do ano
    const soma = medias.reduce((a, b) => a + b, 0)
    return parseFloat((soma / medias.length).toFixed(1))
  }

  const obterRecuperacaoMateria = (materiaId: string) => {
    return recuperacoes.find(r => r.materia_id === materiaId) || { nota: null }
  }

  const calcularMediaFinalPosRecup = (materiaId: string) => {
    const m1 = calcularMediaUnidade(materiaId, 1)
    const m2 = calcularMediaUnidade(materiaId, 2)
    const m3 = calcularMediaUnidade(materiaId, 3)
    const todasUnidades = m1 !== null && m2 !== null && m3 !== null

    const mediaOriginal = calcularMediaFinalOriginal(materiaId)
    if (mediaOriginal === null) return null
    if (!todasUnidades || mediaOriginal >= 5.0) return mediaOriginal

    const rec = obterRecuperacaoMateria(materiaId)
    const notaRec = rec.nota !== null && !isNaN(Number(rec.nota)) ? Number(rec.nota) : null
    if (notaRec === null) return mediaOriginal

    return notaRec
  }

  const alunoTemRecuperacao = materias.some(mat => {
    const m1 = calcularMediaUnidade(mat.id, 1)
    const m2 = calcularMediaUnidade(mat.id, 2)
    const m3 = calcularMediaUnidade(mat.id, 3)
    const todasUnidades = m1 !== null && m2 !== null && m3 !== null

    const mediaOriginal = calcularMediaFinalOriginal(mat.id)
    return todasUnidades && mediaOriginal !== null && mediaOriginal < 5.0
  })

  if (!mounted) return null

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
            margin: 10mm;
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

      {/* Botões de Ação na tela (escondidos na impressão) */}
      <div className="fixed top-4 right-4 z-[100] flex gap-2 print:hidden">
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-[#3ea6ff] hover:bg-[#3ea6ff]/90 text-black font-bold rounded-lg shadow flex items-center gap-2 text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Imprimir Boletim
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-[#272727] hover:bg-[#333] text-white rounded-lg text-sm font-semibold"
        >
          Fechar
        </button>
      </div>

      {/* Conteúdo Impresso (A4) */}
      <div
        className="bg-white text-black w-full max-w-[800px] min-h-[900px] p-8 shadow-2xl rounded-sm print:shadow-none print:p-0 print:w-full print:max-w-none text-[12px] leading-normal font-sans border border-gray-300 print:border-none flex flex-col justify-between"
        style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
      >
        <div>
          {/* Cabeçalho */}
          <div className="flex items-center justify-between pb-4 border-b-2 border-black mb-6">
            <div className="flex items-center gap-2 max-w-[180px] shrink-0">
              <img
                src={getCacheBustedUrl(logoPrefeituraUrl)}
                alt="Logo Prefeitura"
                className="doc-header-logo-prefeitura"
                onError={(e) => {
                  e.currentTarget.src = '/img/brasaoSapeaçu.png'
                }}
              />
            </div>
            <div className="text-center flex-1 px-4">
              <h1 className="text-sm font-bold text-gray-800 uppercase tracking-wider">{escolaNome}</h1>
              <p className="text-xs font-bold text-gray-600">BOLETIM ESCOLAR INDIVIDUAL</p>
              <p className="text-[10px] text-gray-500">Ano Letivo {turma.ano_letivo}</p>
            </div>
            <div className="text-right max-w-[180px] flex items-center justify-end shrink-0">
              <img
                src={escolaLogoUrl ? getCacheBustedUrl(escolaLogoUrl) : getCacheBustedUrl(logoSecretariaUrl)}
                alt="Logo Escola"
                className="doc-header-logo-prefeitura"
                onError={(e) => {
                  e.currentTarget.src = '/img/logo-secretaria.png'
                }}
              />
            </div>
          </div>

          {/* Dados do Aluno */}
          <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-55 p-3 rounded border border-gray-200">
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase">Aluno(a)</p>
              <p className="font-bold text-gray-900 text-[13px]">{aluno.nome}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase">Turma</p>
                <p className="font-bold text-gray-900">{turma.nome}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase">Turno</p>
                <p className="font-bold text-gray-900">{turma.turno}</p>
              </div>
            </div>
          </div>

          {/* Tabela de Notas */}
          <table className="w-full text-left border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100 text-[11px] font-bold text-gray-700">
                <th className="border border-gray-300 p-2" rowSpan={2}>Disciplina</th>
                <th className="border border-gray-300 p-2 text-center" colSpan={4}>1ª Unidade</th>
                <th className="border border-gray-300 p-2 text-center" colSpan={4}>2ª Unidade</th>
                <th className="border border-gray-300 p-2 text-center" colSpan={4}>3ª Unidade</th>
                {alunoTemRecuperacao ? (
                  <th className="border border-gray-300 p-2 text-center" colSpan={3}>Resultado Final</th>
                ) : (
                  <th className="border border-gray-300 p-2 text-center" rowSpan={2}>Média Final</th>
                )}
              </tr>
              <tr className="bg-gray-55 text-[10px] text-gray-600 text-center">
                {/* 1ª */}
                <th className="border border-gray-300 p-1 w-8">N1</th>
                <th className="border border-gray-300 p-1 w-8">N2</th>
                <th className="border border-gray-300 p-1 w-8">N3</th>
                <th className="border border-gray-300 p-1 w-10 font-bold bg-gray-100">MÉD</th>
                {/* 2ª */}
                <th className="border border-gray-300 p-1 w-8">N1</th>
                <th className="border border-gray-300 p-1 w-8">N2</th>
                <th className="border border-gray-300 p-1 w-8">N3</th>
                <th className="border border-gray-300 p-1 w-10 font-bold bg-gray-100">MÉD</th>
                {/* 3ª */}
                <th className="border border-gray-300 p-1 w-8">N1</th>
                <th className="border border-gray-300 p-1 w-8">N2</th>
                <th className="border border-gray-300 p-1 w-8">N3</th>
                <th className="border border-gray-300 p-1 w-10 font-bold bg-gray-100">MÉD</th>
                {/* Recuperação sub-headers */}
                {alunoTemRecuperacao && (
                  <>
                    <th className="border border-gray-300 p-1 w-10 font-bold bg-gray-55">MÉD Anual</th>
                    <th className="border border-gray-300 p-1 w-10 font-bold bg-yellow-50/50">REC Final</th>
                    <th className="border border-gray-300 p-1 w-10 font-bold bg-gray-100">MÉD Final</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {/* Seção 1: BASE NACIONAL COMUM */}
              <tr className="bg-gray-100 font-bold text-gray-700 text-[10px] uppercase">
                <td className="border border-gray-300 p-2" colSpan={alunoTemRecuperacao ? 16 : 14}>
                  Base Nacional Comum
                </td>
              </tr>
              {(() => {
                const materiasComuns = materias.filter(mat => mat.base_curricular === 'comum' || !mat.base_curricular);
                if (materiasComuns.length === 0) {
                  return (
                    <tr>
                      <td className="border border-gray-300 p-2 text-center text-gray-500 italic text-[11px]" colSpan={alunoTemRecuperacao ? 16 : 14}>
                        Nenhuma disciplina cadastrada na Base Comum.
                      </td>
                    </tr>
                  );
                }
                return materiasComuns.map((mat) => {
                  const u1 = obterNotasUnidade(mat.id, 1)
                  const u2 = obterNotasUnidade(mat.id, 2)
                  const u3 = obterNotasUnidade(mat.id, 3)

                  const m1 = calcularMediaUnidade(mat.id, 1)
                  const m2 = calcularMediaUnidade(mat.id, 2)
                  const m3 = calcularMediaUnidade(mat.id, 3)
                  
                  const mfOriginal = calcularMediaFinalOriginal(mat.id)
                  const mfPosRec = calcularMediaFinalPosRecup(mat.id)
                  const rec = obterRecuperacaoMateria(mat.id)

                  return (
                    <tr key={mat.id} className="hover:bg-gray-50 text-gray-800 text-[10px]">
                      <td className="border border-gray-300 p-1.5 font-semibold text-gray-900">{mat.nome}</td>
                      
                      {/* 1ª Unidade */}
                      <td className="border border-gray-300 p-0.5 text-center">{u1.nota1 ?? '-'}</td>
                      <td className="border border-gray-300 p-0.5 text-center">{u1.nota2 ?? '-'}</td>
                      <td className="border border-gray-300 p-0.5 text-center">{u1.nota3 ?? '-'}</td>
                      <td className="border border-gray-300 p-0.5 text-center font-bold bg-gray-55">{m1 ?? '-'}</td>

                      {/* 2ª Unidade */}
                      <td className="border border-gray-300 p-0.5 text-center">{u2.nota1 ?? '-'}</td>
                      <td className="border border-gray-300 p-0.5 text-center">{u2.nota2 ?? '-'}</td>
                      <td className="border border-gray-300 p-0.5 text-center">{u2.nota3 ?? '-'}</td>
                      <td className="border border-gray-300 p-0.5 text-center font-bold bg-gray-55">{m2 ?? '-'}</td>

                      {/* 3ª Unidade */}
                      <td className="border border-gray-300 p-0.5 text-center">{u3.nota1 ?? '-'}</td>
                      <td className="border border-gray-300 p-0.5 text-center">{u3.nota2 ?? '-'}</td>
                      <td className="border border-gray-300 p-0.5 text-center">{u3.nota3 ?? '-'}</td>
                      <td className="border border-gray-300 p-0.5 text-center font-bold bg-gray-55">{m3 ?? '-'}</td>

                      {/* Média Final condicional */}
                      {alunoTemRecuperacao ? (
                        <>
                          <td className="border border-gray-300 p-0.5 text-center font-bold bg-gray-55">{mfOriginal ?? '-'}</td>
                          <td className="border border-gray-300 p-0.5 text-center font-semibold bg-yellow-50/20">{rec.nota ?? '-'}</td>
                          <td className={`border border-gray-300 p-0.5 text-center font-bold text-[11px] ${
                            mfPosRec !== null && mfPosRec < 5.0 ? 'text-red-600 bg-red-50/20' : 'text-green-700 bg-green-50/20'
                          }`}>
                            {mfPosRec ?? '-'}
                          </td>
                        </>
                      ) : (
                        <td className={`border border-gray-300 p-1 text-center font-bold text-[11px] ${
                          mfOriginal !== null && mfOriginal < 5.0 ? 'text-red-600 bg-red-50/20' : 'text-green-700 bg-green-50/20'
                        }`}>
                          {mfOriginal ?? '-'}
                        </td>
                      )}
                    </tr>
                  )
                });
              })()}

              {/* Seção 2: PARTE DIVERSIFICADA */}
              <tr className="bg-gray-100 font-bold text-gray-700 text-[10px] uppercase">
                <td className="border border-gray-300 p-2 border-t-2 border-t-gray-400" colSpan={alunoTemRecuperacao ? 16 : 14}>
                  Parte Diversificada
                </td>
              </tr>
              {(() => {
                const materiasDiversificadas = materias.filter(mat => mat.base_curricular === 'diversificada');
                if (materiasDiversificadas.length === 0) {
                  return (
                    <tr>
                      <td className="border border-gray-300 p-2 text-center text-gray-500 italic text-[11px]" colSpan={alunoTemRecuperacao ? 16 : 14}>
                        Nenhuma disciplina cadastrada na Parte Diversificada.
                      </td>
                    </tr>
                  );
                }
                return materiasDiversificadas.map((mat) => {
                  const u1 = obterNotasUnidade(mat.id, 1)
                  const u2 = obterNotasUnidade(mat.id, 2)
                  const u3 = obterNotasUnidade(mat.id, 3)

                  const m1 = calcularMediaUnidade(mat.id, 1)
                  const m2 = calcularMediaUnidade(mat.id, 2)
                  const m3 = calcularMediaUnidade(mat.id, 3)
                  
                  const mfOriginal = calcularMediaFinalOriginal(mat.id)
                  const mfPosRec = calcularMediaFinalPosRecup(mat.id)
                  const rec = obterRecuperacaoMateria(mat.id)

                  return (
                    <tr key={mat.id} className="hover:bg-gray-50 text-gray-800 text-[10px]">
                      <td className="border border-gray-300 p-1.5 font-semibold text-gray-900">{mat.nome}</td>
                      
                      {/* 1ª Unidade */}
                      <td className="border border-gray-300 p-0.5 text-center">{u1.nota1 ?? '-'}</td>
                      <td className="border border-gray-300 p-0.5 text-center">{u1.nota2 ?? '-'}</td>
                      <td className="border border-gray-300 p-0.5 text-center">{u1.nota3 ?? '-'}</td>
                      <td className="border border-gray-300 p-0.5 text-center font-bold bg-gray-55">{m1 ?? '-'}</td>

                      {/* 2ª Unidade */}
                      <td className="border border-gray-300 p-0.5 text-center">{u2.nota1 ?? '-'}</td>
                      <td className="border border-gray-300 p-0.5 text-center">{u2.nota2 ?? '-'}</td>
                      <td className="border border-gray-300 p-0.5 text-center">{u2.nota3 ?? '-'}</td>
                      <td className="border border-gray-300 p-0.5 text-center font-bold bg-gray-55">{m2 ?? '-'}</td>

                      {/* 3ª Unidade */}
                      <td className="border border-gray-300 p-0.5 text-center">{u3.nota1 ?? '-'}</td>
                      <td className="border border-gray-300 p-0.5 text-center">{u3.nota2 ?? '-'}</td>
                      <td className="border border-gray-300 p-0.5 text-center">{u3.nota3 ?? '-'}</td>
                      <td className="border border-gray-300 p-0.5 text-center font-bold bg-gray-55">{m3 ?? '-'}</td>

                      {/* Média Final condicional */}
                      {alunoTemRecuperacao ? (
                        <>
                          <td className="border border-gray-300 p-0.5 text-center font-bold bg-gray-55">{mfOriginal ?? '-'}</td>
                          <td className="border border-gray-300 p-0.5 text-center font-semibold bg-yellow-50/20">{rec.nota ?? '-'}</td>
                          <td className={`border border-gray-300 p-0.5 text-center font-bold text-[11px] ${
                            mfPosRec !== null && mfPosRec < 5.0 ? 'text-red-600 bg-red-50/20' : 'text-green-700 bg-green-50/20'
                          }`}>
                            {mfPosRec ?? '-'}
                          </td>
                        </>
                      ) : (
                        <td className={`border border-gray-300 p-1 text-center font-bold text-[11px] ${
                          mfOriginal !== null && mfOriginal < 5.0 ? 'text-red-600 bg-red-50/20' : 'text-green-700 bg-green-50/20'
                        }`}>
                          {mfOriginal ?? '-'}
                        </td>
                      )}
                    </tr>
                  )
                });
              })()}
            </tbody>
          </table>
        </div>

        {/* Rodapé de assinaturas */}
        <div className="mt-12 grid grid-cols-2 gap-12 text-center pt-8 border-t border-dashed border-gray-200">
          <div>
            <div className="w-48 border-b border-black mx-auto mb-2" />
            <p className="text-[10px] text-gray-500 font-semibold uppercase">Assinatura da Coordenação / Direção</p>
          </div>
          <div>
            <div className="w-48 border-b border-black mx-auto mb-2" />
            <p className="text-[10px] text-gray-500 font-semibold uppercase">Assinatura do Responsável</p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
