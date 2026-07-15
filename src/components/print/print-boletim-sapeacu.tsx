'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { useEditModeStore } from '@/store/useEditModeStore'
import { toast } from 'sonner'
import { Save, Printer, X, Loader2 } from 'lucide-react'

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

interface PrintBoletimSapeacuProps {
  aluno: {
    id: string
    nome: string
    turma_id?: string
    escola_id?: string
  }
  turma: {
    id: string
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

export function PrintBoletimSapeacu({
  aluno,
  turma,
  escolaNome,
  escolaLogoUrl,
  materias,
  notas,
  recuperacoes = [],
  onClose
}: PrintBoletimSapeacuProps) {
  const [mounted, setMounted] = useState(false)
  const { isEditMode } = useEditModeStore()
  const { escolaAtivaId } = useAuthStore()
  
  // Estados para dados editáveis do Cabeçalho
  const [alunoNome, setAlunoNome] = useState(aluno.nome)
  const [anoLetivo, setAnoLetivo] = useState(String(turma.ano_letivo))
  const [anoEscolar, setAnoEscolar] = useState('')
  const [turmaNome, setTurmaNome] = useState('')
  const [turno, setTurno] = useState(turma.turno)

  // Estados para assinaturas e rodapé
  const [fol, setFol] = useState('')
  const [alunoRodape, setAlunoRodape] = useState(aluno.nome)
  const [assinaturaTrimestre1, setAssinaturaTrimestre1] = useState('')
  const [assinaturaTrimestre2, setAssinaturaTrimestre2] = useState('')
  const [assinaturaTrimestre3, setAssinaturaTrimestre3] = useState('')
  const [gestorAssinatura, setGestorAssinatura] = useState('')
  const [dataEmissao, setDataEmissao] = useState('')

  // Estados locais para notas: chave = `${materia_id}_${unidade}`
  const [notasState, setNotasState] = useState<Record<string, string>>({})
  // Recuperações: chave = `${materia_id}`
  const [recsState, setRecsState] = useState<Record<string, string>>({})
  const [salvando, setSalvando] = useState(false)

  // Regex para validação de notas decimais de 0.0 a 10.0
  const notaRegex = /^(10(\.0?)?|[0-9](\.[0-9]?)?|\.)$/

  // Logos com Cache Busting
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const logoPrefeituraUrl = `${supabaseUrl}/storage/v1/object/public/logos/logo-prefeitura.png`
  const logoSecretariaUrl = `${supabaseUrl}/storage/v1/object/public/logos/logo-secretaria.jpg`

  const getCacheBustedUrl = (url: string) => {
    if (!url) return ''
    if (url.startsWith('data:image')) return url
    const cleanUrl = url.split('?')[0]
    return `${cleanUrl}?t=${Date.now()}`
  }

  // Parsing automático da turma (ex: "6 - A" -> Ano: "6º ANO", Turma: "A")
  useEffect(() => {
    const nomeTurma = turma.nome
    const match = nomeTurma.match(/^(\d+)(?:\s*[-°ºº]\s*)([A-Z])$/i)
    if (match) {
      setAnoEscolar(`${match[1]}º ANO`)
      setTurmaNome(match[2].toUpperCase())
    } else {
      const numMatch = nomeTurma.match(/^(\d+)/)
      const letterMatch = nomeTurma.match(/([A-Z])$/i)
      setAnoEscolar(numMatch ? `${numMatch[1]}º ANO` : nomeTurma)
      setTurmaNome(letterMatch ? letterMatch[1].toUpperCase() : '')
    }
  }, [turma.nome])

  // Data de Emissão inicial
  useEffect(() => {
    const hoje = new Date()
    const dia = String(hoje.getDate()).padStart(2, '0')
    const mes = String(hoje.getMonth() + 1).padStart(2, '0')
    const ano = hoje.getFullYear()
    setDataEmissao(`${dia}/${mes}/${ano}`)
  }, [])

  // Inicializar notasState e recsState a partir das props
  useEffect(() => {
    setMounted(true)

    const initialNotas: Record<string, string> = {}
    notas.forEach((n) => {
      // Média aritmética da unidade
      const validas = [n.nota1, n.nota2, n.nota3].filter((val): val is number => val !== null && !isNaN(Number(val)))
      if (validas.length > 0) {
        const soma = validas.reduce((a, b) => a + b, 0)
        const media = parseFloat((soma / validas.length).toFixed(1))
        initialNotas[`${n.materia_id}_${n.unidade}`] = String(media)
      } else {
        initialNotas[`${n.materia_id}_${n.unidade}`] = ''
      }
    })

    const initialRecs: Record<string, string> = {}
    recuperacoes.forEach((r) => {
      if (r.nota !== null) {
        initialRecs[r.materia_id] = String(r.nota)
      }
    })

    setNotasState(initialNotas)
    setRecsState(initialRecs)

    return () => setMounted(false)
  }, [notas, recuperacoes])

  // Separação de matérias
  const materiasComuns = materias.filter((m) => m.base_curricular === 'comum' || !m.base_curricular)
  const materiasDiversas = materias.filter((m) => m.base_curricular === 'diversificada')

  const handlePrint = () => {
    window.print()
  }

  // Tratamento da digitação de notas (String)
  const handleNotaChange = (materiaId: string, unidade: number, valor: string) => {
    const formatado = valor.replace(',', '.')
    if (formatado === '' || notaRegex.test(formatado)) {
      setNotasState((prev) => ({
        ...prev,
        [`${materiaId}_${unidade}`]: formatado
      }))
    }
  }

  const handleRecChange = (materiaId: string, valor: string) => {
    const formatado = valor.replace(',', '.')
    if (formatado === '' || notaRegex.test(formatado)) {
      setRecsState((prev) => ({
        ...prev,
        [materiaId]: formatado
      }))
    }
  }

  // Cálculos dinâmicos em tempo real
  const calcularTotal = (materiaId: string) => {
    const n1 = parseFloat(notasState[`${materiaId}_1`] || '0')
    const n2 = parseFloat(notasState[`${materiaId}_2`] || '0')
    const n3 = parseFloat(notasState[`${materiaId}_3`] || '0')
    const soma = n1 + n2 + n3
    return soma > 0 ? parseFloat(soma.toFixed(1)) : null
  }

  const calcularMediaFinal = (materiaId: string) => {
    const total = calcularTotal(materiaId)
    if (total === null) return null
    
    // Conta quantas unidades possuem notas preenchidas
    const u1Preenchido = notasState[`${materiaId}_1`] !== undefined && notasState[`${materiaId}_1`] !== ''
    const u2Preenchido = notasState[`${materiaId}_2`] !== undefined && notasState[`${materiaId}_2`] !== ''
    const u3Preenchido = notasState[`${materiaId}_3`] !== undefined && notasState[`${materiaId}_3`] !== ''
    
    const count = [u1Preenchido, u2Preenchido, u3Preenchido].filter(Boolean).length
    if (count === 0) return null
    
    return parseFloat((total / count).toFixed(1))
  }

  // Persistência das Notas no banco de dados (Supabase)
  const handleSaveNotas = async () => {
    setSalvando(true)
    try {
      const supabase = createClient()
      const escolaId = aluno.escola_id || escolaAtivaId

      if (!escolaId) {
        throw new Error('ID da Escola não identificado.')
      }

      // Prepara lista de upserts de notas para as 3 unidades
      const upsertsNotas: any[] = []

      materias.forEach((mat) => {
        for (let unidade = 1; unidade <= 3; unidade++) {
          const valorNotaStr = notasState[`${mat.id}_${unidade}`]
          if (valorNotaStr !== undefined) {
            const notaVal = valorNotaStr !== '' ? Number(valorNotaStr) : null
            
            // Para manter coerência matemática de média (n1+n2+n3)/3 no banco:
            // Salvamos o valor nos três campos nota1, nota2, nota3 igualmente se preenchido.
            upsertsNotas.push({
              aluno_id: aluno.id,
              turma_id: turma.id,
              materia_id: mat.id,
              escola_id: escolaId,
              unidade: unidade,
              nota1: notaVal,
              nota2: notaVal,
              nota3: notaVal
            })
          }
        }
      })

      if (upsertsNotas.length > 0) {
        const { error: nErr } = await supabase
          .from('notas')
          .upsert(upsertsNotas, { onConflict: 'aluno_id, materia_id, unidade' })
        if (nErr) throw nErr
      }

      // Prepara lista de upserts/deletes de recuperações finais
      const upsertsRecs: any[] = []
      const deletesRecs: string[] = []

      materias.forEach((mat) => {
        const valorRecStr = recsState[mat.id]
        if (valorRecStr !== undefined && valorRecStr !== '') {
          upsertsRecs.push({
            aluno_id: aluno.id,
            turma_id: turma.id,
            materia_id: mat.id,
            escola_id: escolaId,
            nota: Number(valorRecStr)
          })
        } else if (valorRecStr === '') {
          deletesRecs.push(mat.id)
        }
      })

      if (upsertsRecs.length > 0) {
        const { error: rErr } = await supabase
          .from('recuperacoes_finais')
          .upsert(upsertsRecs, { onConflict: 'aluno_id, materia_id' })
        if (rErr) throw rErr
      }

      if (deletesRecs.length > 0) {
        const { error: dErr } = await supabase
          .from('recuperacoes_finais')
          .delete()
          .eq('aluno_id', aluno.id)
          .eq('turma_id', turma.id)
          .in('materia_id', deletesRecs)
        if (dErr) throw dErr
      }

      toast.success('Notas do boletim salvas com sucesso no sistema!')
    } catch (err: any) {
      console.error('Erro ao salvar notas do boletim:', err)
      toast.error(`Falha ao salvar notas: ${err.message}`)
    } finally {
      setSalvando(false)
    }
  }

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
            margin: 8mm;
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

      {/* Botões de Ação flutuantes (escondidos na impressão) */}
      <div className="fixed top-4 right-4 z-[100] flex gap-2 print:hidden">
        {isEditMode && (
          <button
            onClick={handleSaveNotas}
            disabled={salvando}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow flex items-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
          >
            {salvando ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Salvar Notas
          </button>
        )}
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-[#185FA5] hover:bg-[#185FA5]/90 text-white font-bold rounded-lg shadow flex items-center gap-2 text-sm cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          Imprimir
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-[#272727] hover:bg-[#333] text-white rounded-lg text-sm font-semibold cursor-pointer"
        >
          Fechar
        </button>
      </div>

      {/* Conteúdo Impresso (Visual A4 Real Sapeaçú) */}
      <div
        className="bg-white text-black w-full max-w-[800px] min-h-[920px] p-8 shadow-2xl rounded-sm print:shadow-none print:p-0 print:w-full print:max-w-none text-[11px] leading-normal font-sans border border-gray-300 print:border-none flex flex-col justify-between"
        style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
      >
        <div>
          {/* Cabeçalho de Identificação */}
          <div className="flex items-start justify-between pb-3 border-b-2 border-black mb-4">
            {/* Seção esquerda com os inputs */}
            <div className="flex-1 grid grid-cols-12 gap-y-2.5 gap-x-2 text-xs font-bold mr-6">
              <div className="col-span-12 flex items-center gap-1.5">
                <span className="uppercase text-[11px] shrink-0 text-slate-700">Aluno (a):</span>
                <input
                  type="text"
                  value={alunoNome}
                  onChange={(e) => setAlunoNome(e.target.value)}
                  className="flex-1 bg-transparent border-b border-black focus:outline-none uppercase font-bold text-black py-0 px-1 text-xs"
                />
              </div>

              <div className="col-span-4 flex items-center gap-1.5">
                <span className="uppercase text-[11px] shrink-0 text-slate-700">Ano:</span>
                <input
                  type="text"
                  value={anoEscolar}
                  onChange={(e) => setAnoEscolar(e.target.value)}
                  className="flex-1 bg-transparent border-b border-black focus:outline-none uppercase text-center font-bold text-black py-0 px-1 text-xs"
                />
              </div>

              <div className="col-span-4 flex items-center gap-1.5">
                <span className="uppercase text-[11px] shrink-0 text-slate-700">Turma:</span>
                <input
                  type="text"
                  value={turmaNome}
                  onChange={(e) => setTurmaNome(e.target.value)}
                  className="flex-1 bg-transparent border-b border-black focus:outline-none uppercase text-center font-bold text-black py-0 px-1 text-xs"
                />
              </div>

              <div className="col-span-4 flex items-center gap-1">
                <span className="uppercase text-[11px] shrink-0 text-slate-700">Turno:</span>
                <input
                  type="text"
                  value={turno}
                  onChange={(e) => setTurno(e.target.value)}
                  className="w-16 bg-transparent border-b border-black focus:outline-none uppercase text-center font-bold text-black py-0 px-1 text-xs"
                />
                <span className="text-[11px] font-normal font-mono shrink-0">( )</span>
              </div>
            </div>

            {/* Seção direita com o brasão */}
            <div className="flex flex-col items-center justify-center shrink-0 w-36 text-center">
              <img
                src={getCacheBustedUrl(logoPrefeituraUrl)}
                alt="Brasão Sapeaçú"
                className="h-14 w-auto object-contain mb-1.5 doc-header-logo-prefeitura"
                onError={(e) => {
                  e.currentTarget.src = '/img/brasaoSapeaçu.png'
                }}
              />
              <span className="text-[9px] font-black uppercase text-black tracking-wide leading-tight">
                Prefeitura de Sapeaçú
              </span>
            </div>
          </div>

          {/* Tabela de Notas */}
          <table className="w-full border-collapse border border-black text-center font-bold">
            <thead>
              {/* Linha 1: ANOS FINAIS */}
              <tr style={{ backgroundColor: 'rgba(160, 190, 220, 1)' }}>
                <th colSpan={8} className="border border-black py-1.5 text-center text-sm font-black uppercase tracking-wider text-black">
                  Anos Finais
                </th>
              </tr>
              {/* Linha 2: Cabeçalhos principais */}
              <tr style={{ backgroundColor: 'rgba(160, 190, 220, 1)' }} className="text-[10px] font-bold text-black">
                <th className="border border-black px-2 py-2 text-left uppercase w-[35%]">
                  Componentes Curriculares
                </th>
                <th className="border border-black py-2 w-[9%]">TRI</th>
                <th className="border border-black py-2 w-[9%]">TRI</th>
                <th className="border border-black py-2 w-[9%]">TRI</th>
                <th className="border border-black py-2 w-[11%]">TOTAL</th>
                <th className="border border-black py-2 w-[12%]">Média Final</th>
                <th className="border border-black py-2 w-[12%]">REC</th>
              </tr>
            </thead>
            <tbody>
              {/* Seção BASE COMUM */}
              {(() => {
                const totalComum = materiasComuns.length
                return materiasComuns.length === 0 ? (
                  <tr>
                    <td
                      rowSpan={1}
                      style={{ backgroundColor: 'rgba(215, 230, 245, 1)' }}
                      className="border border-black p-2 font-black text-center text-[10px] uppercase w-6 leading-none shrink-0"
                    >
                      <div className="[writing-mode:vertical-lr] [transform:rotate(180deg)] mx-auto font-black select-none">
                        Base Comum
                      </div>
                    </td>
                    <td colSpan={7} className="border border-black p-3 text-center text-gray-500 italic font-normal">
                      Nenhuma disciplina de Base Comum vinculada a esta turma.
                    </td>
                  </tr>
                ) : (
                  materiasComuns.map((mat, index) => {
                    const total = calcularTotal(mat.id)
                    const mediaFinal = calcularMediaFinal(mat.id)
                    return (
                      <tr key={mat.id} className="text-[10.5px]">
                        {/* Renderiza a barra lateral vertical apenas na primeira linha da seção */}
                        {index === 0 && (
                          <td
                            rowSpan={totalComum}
                            style={{ backgroundColor: 'rgba(215, 230, 245, 1)' }}
                            className="border border-black font-black text-center text-[10px] uppercase w-6 leading-none select-none shrink-0"
                          >
                            <div className="[writing-mode:vertical-lr] [transform:rotate(180deg)] mx-auto font-black">
                              Base Comum
                            </div>
                          </td>
                        )}
                        <td className="border border-black px-2 py-1 text-left font-bold text-black uppercase">
                          {mat.nome}
                        </td>
                        
                        {/* Trimestre 1 */}
                        <td className="border border-black p-0.5">
                          <input
                            type="text"
                            value={notasState[`${mat.id}_1`] || ''}
                            onChange={(e) => handleNotaChange(mat.id, 1, e.target.value)}
                            disabled={!isEditMode}
                            className="w-full text-center bg-transparent focus:outline-none font-bold text-black text-[11px]"
                          />
                        </td>
                        {/* Trimestre 2 */}
                        <td className="border border-black p-0.5">
                          <input
                            type="text"
                            value={notasState[`${mat.id}_2`] || ''}
                            onChange={(e) => handleNotaChange(mat.id, 2, e.target.value)}
                            disabled={!isEditMode}
                            className="w-full text-center bg-transparent focus:outline-none font-bold text-black text-[11px]"
                          />
                        </td>
                        {/* Trimestre 3 */}
                        <td className="border border-black p-0.5">
                          <input
                            type="text"
                            value={notasState[`${mat.id}_3`] || ''}
                            onChange={(e) => handleNotaChange(mat.id, 3, e.target.value)}
                            disabled={!isEditMode}
                            className="w-full text-center bg-transparent focus:outline-none font-bold text-black text-[11px]"
                          />
                        </td>

                        {/* TOTAL */}
                        <td className="border border-black py-1 bg-slate-50">
                          {total !== null ? total.toFixed(1) : '-'}
                        </td>
                        {/* Média Final */}
                        <td className={`border border-black py-1 ${
                          mediaFinal !== null && mediaFinal < 5.0 ? 'text-red-600 bg-red-50/10' : 'text-slate-900'
                        }`}>
                          {mediaFinal !== null ? mediaFinal.toFixed(1) : '-'}
                        </td>
                        {/* Recuperação Final */}
                        <td className="border border-black p-0.5">
                          <input
                            type="text"
                            value={recsState[mat.id] || ''}
                            onChange={(e) => handleRecChange(mat.id, e.target.value)}
                            disabled={!isEditMode}
                            className="w-full text-center bg-transparent focus:outline-none font-bold text-black text-[11px]"
                          />
                        </td>
                      </tr>
                    )
                  })
                )
              })()}

              {/* Seção DIVERSAS */}
              {(() => {
                const totalDiversas = materiasDiversas.length
                return materiasDiversas.length === 0 ? (
                  <tr>
                    <td
                      rowSpan={1}
                      style={{ backgroundColor: 'rgba(215, 230, 245, 1)' }}
                      className="border border-black p-2 font-black text-center text-[10px] uppercase w-6 leading-none shrink-0"
                    >
                      <div className="[writing-mode:vertical-lr] [transform:rotate(180deg)] mx-auto font-black select-none">
                        Diversas
                      </div>
                    </td>
                    <td colSpan={7} className="border border-black p-3 text-center text-gray-500 italic font-normal">
                      Nenhuma disciplina de Parte Diversificada vinculada a esta turma.
                    </td>
                  </tr>
                ) : (
                  materiasDiversas.map((mat, index) => {
                    const total = calcularTotal(mat.id)
                    const mediaFinal = calcularMediaFinal(mat.id)
                    return (
                      <tr key={mat.id} className="text-[10.5px]">
                        {/* Renderiza a barra lateral vertical apenas na primeira linha da seção */}
                        {index === 0 && (
                          <td
                            rowSpan={totalDiversas}
                            style={{ backgroundColor: 'rgba(215, 230, 245, 1)' }}
                            className="border border-black font-black text-center text-[10px] uppercase w-6 leading-none select-none shrink-0"
                          >
                            <div className="[writing-mode:vertical-lr] [transform:rotate(180deg)] mx-auto font-black">
                              Diversas
                            </div>
                          </td>
                        )}
                        <td className="border border-black px-2 py-1 text-left font-bold text-black uppercase">
                          {mat.nome}
                        </td>
                        
                        {/* Trimestre 1 */}
                        <td className="border border-black p-0.5">
                          <input
                            type="text"
                            value={notasState[`${mat.id}_1`] || ''}
                            onChange={(e) => handleNotaChange(mat.id, 1, e.target.value)}
                            disabled={!isEditMode}
                            className="w-full text-center bg-transparent focus:outline-none font-bold text-black text-[11px]"
                          />
                        </td>
                        {/* Trimestre 2 */}
                        <td className="border border-black p-0.5">
                          <input
                            type="text"
                            value={notasState[`${mat.id}_2`] || ''}
                            onChange={(e) => handleNotaChange(mat.id, 2, e.target.value)}
                            disabled={!isEditMode}
                            className="w-full text-center bg-transparent focus:outline-none font-bold text-black text-[11px]"
                          />
                        </td>
                        {/* Trimestre 3 */}
                        <td className="border border-black p-0.5">
                          <input
                            type="text"
                            value={notasState[`${mat.id}_3`] || ''}
                            onChange={(e) => handleNotaChange(mat.id, 3, e.target.value)}
                            disabled={!isEditMode}
                            className="w-full text-center bg-transparent focus:outline-none font-bold text-black text-[11px]"
                          />
                        </td>

                        {/* TOTAL */}
                        <td className="border border-black py-1 bg-slate-50">
                          {total !== null ? total.toFixed(1) : '-'}
                        </td>
                        {/* Média Final */}
                        <td className={`border border-black py-1 ${
                          mediaFinal !== null && mediaFinal < 5.0 ? 'text-red-600 bg-red-50/10' : 'text-slate-900'
                        }`}>
                          {mediaFinal !== null ? mediaFinal.toFixed(1) : '-'}
                        </td>
                        {/* Recuperação Final */}
                        <td className="border border-black p-0.5">
                          <input
                            type="text"
                            value={recsState[mat.id] || ''}
                            onChange={(e) => handleRecChange(mat.id, e.target.value)}
                            disabled={!isEditMode}
                            className="w-full text-center bg-transparent focus:outline-none font-bold text-black text-[11px]"
                          />
                        </td>
                      </tr>
                    )
                  })
                )
              })()}
            </tbody>
          </table>
        </div>

        {/* Rodapé: Legendas, Assinaturas e Resultado Final */}
        <div className="space-y-4 mt-6">
          {/* Legendas e Assinaturas Trimestrais */}
          <div className="grid grid-cols-12 gap-4 items-start">
            {/* Legenda (Parte 1) */}
            <div className="col-span-5 text-[9px] leading-relaxed text-black border border-black p-2 font-bold bg-slate-55 rounded-sm">
              <span className="block border-b border-black pb-0.5 mb-1 text-[9.5px] font-black uppercase">
                Legenda da Parte Diversificada
              </span>
              <div className="space-y-0.5 uppercase">
                <p>ED: Em Desenvolvimento</p>
                <p>AO: Adequado</p>
                <p>AV: Avaliado</p>
              </div>
            </div>

            {/* Assinatura dos pais ou responsáveis (Trimestres) */}
            <div className="col-span-7 border border-black p-2 bg-slate-55 rounded-sm flex flex-col justify-between min-h-[72px]">
              <span className="block border-b border-black pb-0.5 mb-1.5 text-[9.5px] font-black uppercase text-center">
                Assinatura dos Pais ou Responsáveis
              </span>
              <div className="grid grid-cols-3 gap-2 text-[9px]">
                <div className="flex flex-col gap-0.5">
                  <input
                    type="text"
                    value={assinaturaTrimestre1}
                    onChange={(e) => setAssinaturaTrimestre1(e.target.value)}
                    placeholder="Assinatura"
                    className="w-full bg-transparent border-b border-black text-center focus:outline-none text-[8.5px] h-4 py-0"
                  />
                  <span className="text-center font-bold text-[8px] uppercase">1º Trimestre</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <input
                    type="text"
                    value={assinaturaTrimestre2}
                    onChange={(e) => setAssinaturaTrimestre2(e.target.value)}
                    placeholder="Assinatura"
                    className="w-full bg-transparent border-b border-black text-center focus:outline-none text-[8.5px] h-4 py-0"
                  />
                  <span className="text-center font-bold text-[8px] uppercase">2º Trimestre</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <input
                    type="text"
                    value={assinaturaTrimestre3}
                    onChange={(e) => setAssinaturaTrimestre3(e.target.value)}
                    placeholder="Assinatura"
                    className="w-full bg-transparent border-b border-black text-center focus:outline-none text-[8.5px] h-4 py-0"
                  />
                  <span className="text-center font-bold text-[8px] uppercase">3º Trimestre</span>
                </div>
              </div>
            </div>
          </div>

          {/* Resultado Final (Bottom Section) */}
          <div className="border border-black p-3 bg-slate-50/30 rounded-sm space-y-2">
            <h3 className="text-center text-xs font-black uppercase tracking-wider text-black">
              Resultado Final
            </h3>
            
            <div className="h-0.5 bg-black w-full my-1.5" />

            <div className="grid grid-cols-12 gap-y-2.5 gap-x-2 text-[10.5px] font-bold">
              <div className="col-span-9 flex items-center gap-1.5">
                <span className="uppercase text-[10px] shrink-0 text-slate-700">O(A) aluno (a):</span>
                <input
                  type="text"
                  value={alunoRodape}
                  onChange={(e) => setAlunoRodape(e.target.value)}
                  className="flex-1 bg-transparent border-b border-black focus:outline-none uppercase font-bold text-black py-0 px-1 text-xs"
                />
              </div>

              <div className="col-span-3 flex items-center gap-1">
                <span className="uppercase text-[10px] shrink-0 text-slate-700">fol:</span>
                <input
                  type="text"
                  value={fol}
                  onChange={(e) => setFol(e.target.value)}
                  className="flex-1 bg-transparent border-b border-black focus:outline-none text-center font-bold text-black py-0 px-1 text-xs"
                />
              </div>
            </div>

            {/* Linhas de Assinatura do Gestor e Data */}
            <div className="grid grid-cols-12 gap-4 items-end pt-4">
              {/* Espaço em branco para assinaturas mais formais */}
              <div className="col-span-5 text-center flex flex-col justify-end min-h-[36px]">
                <div className="border-b border-black w-full" />
                <span className="text-[9px] uppercase font-bold text-slate-500 mt-1 block">Assinatura Secretário(a)</span>
              </div>

              {/* Assinatura do Gestor */}
              <div className="col-span-4 text-center flex flex-col justify-end min-h-[36px]">
                <input
                  type="text"
                  value={gestorAssinatura}
                  onChange={(e) => setGestorAssinatura(e.target.value)}
                  className="w-full bg-transparent border-b border-black text-center focus:outline-none text-xs font-bold py-0 h-5"
                />
                <span className="text-[9px] uppercase font-bold text-slate-700 mt-1 block">Gestor(a)</span>
              </div>

              {/* Campo de Data */}
              <div className="col-span-3 text-center flex flex-col justify-end min-h-[36px]">
                <input
                  type="text"
                  value={dataEmissao}
                  onChange={(e) => setDataEmissao(e.target.value)}
                  placeholder="__/__/____"
                  className="w-full bg-transparent border-b border-black text-center focus:outline-none text-xs font-mono font-bold py-0 h-5"
                />
                <span className="text-[9px] uppercase font-bold text-slate-700 mt-1 block">Data</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
