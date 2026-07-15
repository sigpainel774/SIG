'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { useEditModeStore } from '@/store/useEditModeStore'
import { toast } from 'sonner'
import { Save, Printer, X, Loader2, BookOpen, Star } from 'lucide-react'

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
  nota4: number | null
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
  
  // Estados para dados editáveis
  const [alunoNome, setAlunoNome] = useState(aluno.nome)
  const [anoLetivo, setAnoLetivo] = useState(String(turma.ano_letivo))
  const [anoEscolar, setAnoEscolar] = useState('')
  const [turmaNome, setTurmaNome] = useState('')
  const [turno, setTurno] = useState(turma.turno)
  const [escolaEditada, setEscolaEditada] = useState(escolaNome)

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



  // Inicializar notasState e recsState a partir das props
  useEffect(() => {
    setMounted(true)

    const initialNotas: Record<string, string> = {}
    notas.forEach((n) => {
      const validas = [n.nota1, n.nota2, n.nota3, n.nota4].filter((val): val is number => val !== null && !isNaN(Number(val)))
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
      const schoolId = aluno.escola_id || escolaAtivaId

      if (!schoolId) {
        throw new Error('ID da Escola não identificado.')
      }

      const upsertsNotas: any[] = []

      materias.forEach((mat) => {
        for (let unidade = 1; unidade <= 3; unidade++) {
          const valorNotaStr = notasState[`${mat.id}_${unidade}`]
          if (valorNotaStr !== undefined) {
            const notaVal = valorNotaStr !== '' ? Number(valorNotaStr) : null
            upsertsNotas.push({
              aluno_id: aluno.id,
              turma_id: turma.id,
              materia_id: mat.id,
              escola_id: schoolId,
              unidade: unidade,
              nota1: notaVal,
              nota2: notaVal,
              nota3: notaVal,
              nota4: null
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

      const upsertsRecs: any[] = []
      const deletesRecs: string[] = []

      materias.forEach((mat) => {
        const valorRecStr = recsState[mat.id]
        if (valorRecStr !== undefined && valorRecStr !== '') {
          upsertsRecs.push({
            aluno_id: aluno.id,
            turma_id: turma.id,
            materia_id: mat.id,
            escola_id: schoolId,
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
    <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-start p-6 overflow-y-auto print:static print:block print:p-0 print:bg-white print:overflow-visible print-portal-container">
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
            size: A4 landscape;
            margin: 0 !important;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .page-break {
            page-break-after: always !important;
            break-after: page !important;
          }
        }
      `}</style>

      {/* Botões de Ação flutuantes */}
      <div className="fixed top-4 right-4 z-[100] flex gap-2 print:hidden">
        {isEditMode && (
          <button
            onClick={handleSaveNotas}
            disabled={salvando}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow flex items-center gap-2 text-sm disabled:opacity-50 cursor-pointer transition-all"
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
          className="px-4 py-2 bg-[#185FA5] hover:bg-[#185FA5]/90 text-white font-bold rounded-lg shadow flex items-center gap-2 text-sm cursor-pointer transition-all"
        >
          <Printer className="w-4 h-4" />
          Imprimir Boletim
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-[#272727] hover:bg-[#333] text-white rounded-lg text-sm font-semibold cursor-pointer transition-all"
        >
          Fechar
        </button>
      </div>

      {/* Visualizador de Páginas A4 Paisagem */}
      <div className="space-y-8 my-10 print:my-0 print:space-y-0 text-black flex flex-col items-center">
        
        {/* PÁGINA 1: CAPA (A4 Paisagem, Metade Direita) */}
        <div 
          className="w-[297mm] h-[210mm] bg-white relative shadow-2xl rounded-sm overflow-hidden print:shadow-none print:rounded-none page-break border border-gray-200 print:border-none"
          style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
        >
          {/* Linha tracejada indicando o meio para a dobra da folha (oculta na impressão) */}
          <div className="absolute left-[148.5mm] top-0 bottom-0 border-l border-dashed border-gray-300 print:hidden z-10" />

          {/* Metade Direita da Folha: A Capa */}
          <div className="absolute right-0 top-0 w-[148.5mm] h-full flex flex-col justify-between items-center select-text font-sans">
            
            {/* Topo: Imagem top_boletim.png */}
            <div className="w-full select-none">
              <img
                src={getCacheBustedUrl(`${supabaseUrl}/storage/v1/object/public/logos/top_boletim.png`)}
                alt="Capa Boletim Topo"
                className="w-full h-auto object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>

            {/* Centro: Logotipo / Selo Circular */}
            <div className="flex flex-col items-center justify-center my-2">
              {(() => {
                const isMoises = escolaEditada.toLowerCase().includes('moises') || escolaEditada.toLowerCase().includes('moisés');
                const hasLogo = isMoises || escolaLogoUrl;
                const logoSrc = isMoises 
                  ? '/img/logo-moises.png' 
                  : (escolaLogoUrl ? getCacheBustedUrl(escolaLogoUrl) : '');

                if (hasLogo) {
                  return (
                    <div className="w-52 h-52 rounded-full border-4 border-[#0b4a8c] flex items-center justify-center p-2 bg-white relative shadow-inner overflow-hidden">
                      <div className="absolute inset-1 rounded-full border border-[#0b4a8c] pointer-events-none z-10" />
                      <img
                        src={logoSrc}
                        alt="Logo Escola"
                        className="w-full h-full object-contain rounded-full"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  );
                }

                // Fallback: Selo Circular Estilizado em CSS se não houver imagem
                return (
                  <div className="w-52 h-52 rounded-full border-4 border-[#0b4a8c] flex flex-col items-center justify-center p-5 bg-white relative shadow-inner">
                    {/* Bordas internas finas circulares */}
                    <div className="absolute inset-1 rounded-full border border-[#0b4a8c] pointer-events-none" />
                    <div className="absolute inset-2.5 rounded-full border-2 border-double border-[#0b4a8c] pointer-events-none" />
                    
                    {/* Conteúdo do Selo */}
                    <div className="flex flex-col items-center text-center justify-between h-full py-2 z-10 max-w-[155px]">
                      <span className="text-[7.5px] font-extrabold uppercase text-[#0b4a8c] tracking-tight leading-none px-1">
                        {escolaEditada.length > 55 ? escolaEditada.substring(0, 52) + '...' : escolaEditada}
                      </span>
                      
                      <div className="flex flex-col items-center justify-center my-0.5">
                        <span className="text-[12px] font-black uppercase text-[#0b4a8c] leading-none mb-1">
                          {escolaEditada.split(' ').map(w => w[0]).filter(c => c === c.toUpperCase() && c.match(/[A-Z]/)).join('').substring(0, 7)}
                        </span>
                        <div className="w-10 h-[1.5px] bg-[#0b4a8c] mb-1.5" />
                        <div className="flex gap-0.5 text-[#0b4a8c] mb-0.5">
                          <Star className="w-2.5 h-2.5 fill-current" />
                          <Star className="w-2.5 h-2.5 fill-current transform -translate-y-0.5" />
                          <Star className="w-2.5 h-2.5 fill-current" />
                        </div>
                        <BookOpen className="w-9 h-9 text-[#185fa5] stroke-[2.5]" />
                      </div>

                      <span className="text-[7px] font-black uppercase text-[#0b4a8c] tracking-widest leading-none pt-0.5 border-t border-[#0b4a8c]/35 w-full">
                        Sapeaçú - BA
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Base: Imagem bottom_boletim.png */}
            <div className="w-full select-none">
              <img
                src={getCacheBustedUrl(`${supabaseUrl}/storage/v1/object/public/logos/bottom_boletim.png`)}
                alt="Capa Boletim Base"
                className="w-full h-auto object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          </div>
        </div>

        {/* PÁGINA 2: O BOLETIM COM A TABELA (A4 Paisagem, Metade Direita) */}
        <div 
          className="w-[297mm] h-[210mm] bg-white relative shadow-2xl rounded-sm overflow-hidden print:shadow-none print:rounded-none border border-gray-200 print:border-none"
          style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
        >
          {/* Linha tracejada indicando o meio para a dobra da folha (oculta na impressão) */}
          <div className="absolute left-[148.5mm] top-0 bottom-0 border-l border-dashed border-gray-300 print:hidden z-10" />

          {/* Metade Direita da Folha: A Tabela do Boletim */}
          <div className="absolute right-0 top-0 w-[148.5mm] h-full p-6 flex flex-col justify-between font-sans">
            <div>
              {/* Cabeçalho Oficial Sapeaçu */}
              <div className="flex items-center justify-center gap-4 relative pb-1 mb-2 min-h-10">
                <img 
                  src={getCacheBustedUrl(logoPrefeituraUrl)} 
                  alt="Brasão" 
                  className="w-10 h-10 object-contain absolute left-0"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
                <div className="text-center font-black text-[10px] uppercase tracking-wide text-black leading-tight mx-12">
                  <p>Estado da Bahia</p>
                  <p>Prefeitura Municipal de Sapeaçu</p>
                </div>
                <img 
                  src={getCacheBustedUrl(logoSecretariaUrl)} 
                  alt="Secretaria" 
                  className="w-10 h-10 object-contain absolute right-0"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
              <div className="border-b-2 border-double border-black mb-2" />

              {/* Caixa de Identificação do Aluno */}
              <div className="border border-black bg-white select-text w-full mb-2">
                {/* Linha do Aluno */}
                <div className="flex items-center text-[9px] font-bold border-b border-black h-6 px-2">
                  <span className="uppercase text-[8px] mr-1 shrink-0 text-black">Aluno (a):</span>
                  <input 
                    type="text" 
                    value={alunoNome} 
                    onChange={(e) => setAlunoNome(e.target.value)} 
                    disabled={!isEditMode} 
                    className="flex-1 bg-transparent focus:outline-none uppercase font-bold text-[9px] py-0 text-black" 
                  />
                </div>
                {/* Linha de Ano, Turma e Turno */}
                <div className="grid grid-cols-12 text-[9px] font-bold h-6">
                  {/* Lado Esquerdo: Ano e Turma */}
                  <div className="col-span-8 flex items-center px-2 border-r border-black gap-4">
                    <div className="flex items-center">
                      <span className="uppercase text-[8px] mr-1 shrink-0 text-black">Ano:</span>
                      <input 
                        type="text" 
                        value={anoEscolar} 
                        onChange={(e) => setAnoEscolar(e.target.value)} 
                        disabled={!isEditMode} 
                        className="w-20 bg-transparent focus:outline-none uppercase font-bold text-[9px] text-black" 
                      />
                    </div>
                    <div className="flex items-center">
                      <span className="uppercase text-[8px] mr-1 shrink-0 text-black">Turma:</span>
                      <input 
                        type="text" 
                        value={turmaNome} 
                        onChange={(e) => setTurmaNome(e.target.value)} 
                        disabled={!isEditMode} 
                        className="w-16 bg-transparent focus:outline-none uppercase font-bold text-[9px] text-black" 
                      />
                    </div>
                  </div>
                  {/* Lado Direito: Turno */}
                  <div className="col-span-4 flex items-center justify-center gap-1 px-1">
                    <span className="uppercase text-[8px] text-black shrink-0">Turno:</span>
                    <span className="uppercase font-bold text-[9px] text-black truncate">{turno}</span>
                  </div>
                </div>
              </div>

              {/* Título de seção */}
              <div className="text-center font-black text-[11px] uppercase tracking-wider my-1 text-black">
                Anos Finais
              </div>

              {/* Tabela de Notas */}
              <table className="w-full border-collapse border border-black text-center font-bold text-[9px]">
                <thead>

                  {/* Linha 2: Cabeçalhos principais */}
                  <tr style={{ backgroundColor: 'rgba(160, 190, 220, 1)' }} className="font-bold text-black text-[8.5px]">
                    <th className="border border-black w-6"></th>
                    <th className="border border-black px-1.5 py-0.5 text-left uppercase w-[38%]">
                      Componentes Curriculares
                    </th>
                    <th className="border border-black py-0.5 w-[8%]">1º TRI</th>
                    <th className="border border-black py-0.5 w-[8%]">2º TRI</th>
                    <th className="border border-black py-0.5 w-[8%]">3º TRI</th>
                    <th className="border border-black py-0.5 w-[10%]">TOTAL</th>
                    <th className="border border-black py-0.5 w-[11%]">REC</th>
                    <th className="border border-black py-0.5 w-[11%]">Média Final</th>
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
                          className="border border-black p-1 font-black text-center text-[8.5px] uppercase w-5 leading-none shrink-0"
                        >
                          <div className="[writing-mode:vertical-lr] [transform:rotate(180deg)] mx-auto font-black select-none">
                            Base Comum
                          </div>
                        </td>
                        <td colSpan={7} className="border border-black p-1.5 text-center text-gray-500 italic font-normal text-[9px]">
                          Nenhuma disciplina de Base Comum vinculada a esta turma.
                        </td>
                      </tr>
                    ) : (
                      materiasComuns.map((mat, index) => {
                        const total = calcularTotal(mat.id)
                        const mediaFinal = calcularMediaFinal(mat.id)
                        return (
                          <tr key={mat.id} className="text-[9px]">
                            {index === 0 && (
                              <td
                                rowSpan={totalComum}
                                style={{ backgroundColor: 'rgba(215, 230, 245, 1)' }}
                                className="border border-black font-black text-center text-[8.5px] uppercase w-5 leading-none select-none shrink-0"
                              >
                                <div className="[writing-mode:vertical-lr] [transform:rotate(180deg)] mx-auto font-black">
                                  Base Comum
                                </div>
                              </td>
                            )}
                            <td className="border border-black px-1.5 py-0.5 text-left font-bold text-black uppercase truncate max-w-[125px]">
                              {mat.nome}
                            </td>
                            
                            {/* Trimestre 1 */}
                            <td className="border border-black p-0">
                              <input
                                type="text"
                                value={notasState[`${mat.id}_1`] || ''}
                                onChange={(e) => handleNotaChange(mat.id, 1, e.target.value)}
                                disabled={!isEditMode}
                                className="w-full text-center bg-transparent focus:outline-none font-bold text-black text-[9px] py-0.5"
                              />
                            </td>
                            {/* Trimestre 2 */}
                            <td className="border border-black p-0">
                              <input
                                type="text"
                                value={notasState[`${mat.id}_2`] || ''}
                                onChange={(e) => handleNotaChange(mat.id, 2, e.target.value)}
                                disabled={!isEditMode}
                                className="w-full text-center bg-transparent focus:outline-none font-bold text-black text-[9px] py-0.5"
                              />
                            </td>
                            {/* Trimestre 3 */}
                            <td className="border border-black p-0">
                              <input
                                type="text"
                                value={notasState[`${mat.id}_3`] || ''}
                                onChange={(e) => handleNotaChange(mat.id, 3, e.target.value)}
                                disabled={!isEditMode}
                                className="w-full text-center bg-transparent focus:outline-none font-bold text-black text-[9px] py-0.5"
                              />
                            </td>

                            {/* TOTAL */}
                            <td className="border border-black py-0.5 bg-slate-50 text-black">
                              {total !== null ? total.toFixed(1) : '-'}
                            </td>
                            {/* Recuperação Final */}
                            <td className="border border-black p-0">
                              <input
                                type="text"
                                value={recsState[mat.id] || ''}
                                onChange={(e) => handleRecChange(mat.id, e.target.value)}
                                disabled={!isEditMode}
                                className="w-full text-center bg-transparent focus:outline-none font-bold text-black text-[9px] py-0.5"
                              />
                            </td>
                            {/* Média Final */}
                            <td className={`border border-black py-0.5 ${
                              mediaFinal !== null && mediaFinal < 5.0 ? 'text-red-600 bg-red-50/10' : 'text-slate-950'
                            }`}>
                              {mediaFinal !== null ? mediaFinal.toFixed(1) : '-'}
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
                          className="border border-black p-1 font-black text-center text-[8.5px] uppercase w-5 leading-none shrink-0"
                        >
                          <div className="[writing-mode:vertical-lr] [transform:rotate(180deg)] mx-auto font-black select-none">
                            Diversas
                          </div>
                        </td>
                        <td colSpan={7} className="border border-black p-1.5 text-center text-gray-500 italic font-normal text-[9px]">
                          Nenhuma disciplina de Parte Diversificada vinculada a esta turma.
                        </td>
                      </tr>
                    ) : (
                      materiasDiversas.map((mat, index) => {
                        const total = calcularTotal(mat.id)
                        const mediaFinal = calcularMediaFinal(mat.id)
                        return (
                          <tr key={mat.id} className="text-[9px]">
                            {index === 0 && (
                              <td
                                rowSpan={totalDiversas}
                                style={{ backgroundColor: 'rgba(215, 230, 245, 1)' }}
                                className="border border-black font-black text-center text-[8.5px] uppercase w-5 leading-none select-none shrink-0"
                              >
                                <div className="[writing-mode:vertical-lr] [transform:rotate(180deg)] mx-auto font-black">
                                  Diversas
                                </div>
                              </td>
                            )}
                            <td className="border border-black px-1.5 py-0.5 text-left font-bold text-black uppercase truncate max-w-[125px]">
                              {mat.nome}
                            </td>
                            
                            {/* Trimestre 1 */}
                            <td className="border border-black p-0">
                              <input
                                type="text"
                                value={notasState[`${mat.id}_1`] || ''}
                                onChange={(e) => handleNotaChange(mat.id, 1, e.target.value)}
                                disabled={!isEditMode}
                                className="w-full text-center bg-transparent focus:outline-none font-bold text-black text-[9px] py-0.5"
                              />
                            </td>
                            {/* Trimestre 2 */}
                            <td className="border border-black p-0">
                              <input
                                type="text"
                                value={notasState[`${mat.id}_2`] || ''}
                                onChange={(e) => handleNotaChange(mat.id, 2, e.target.value)}
                                disabled={!isEditMode}
                                className="w-full text-center bg-transparent focus:outline-none font-bold text-black text-[9px] py-0.5"
                              />
                            </td>
                            {/* Trimestre 3 */}
                            <td className="border border-black p-0">
                              <input
                                type="text"
                                value={notasState[`${mat.id}_3`] || ''}
                                onChange={(e) => handleNotaChange(mat.id, 3, e.target.value)}
                                disabled={!isEditMode}
                                className="w-full text-center bg-transparent focus:outline-none font-bold text-black text-[9px] py-0.5"
                              />
                            </td>

                            {/* TOTAL */}
                            <td className="border border-black py-0.5 bg-slate-50 text-black">
                              {total !== null ? total.toFixed(1) : '-'}
                            </td>
                            {/* Recuperação Final */}
                            <td className="border border-black p-0">
                              <input
                                type="text"
                                value={recsState[mat.id] || ''}
                                onChange={(e) => handleRecChange(mat.id, e.target.value)}
                                disabled={!isEditMode}
                                className="w-full text-center bg-transparent focus:outline-none font-bold text-black text-[9px] py-0.5"
                              />
                            </td>
                            {/* Média Final */}
                            <td className={`border border-black py-0.5 ${
                              mediaFinal !== null && mediaFinal < 5.0 ? 'text-red-600 bg-red-50/10' : 'text-slate-955'
                            }`}>
                              {mediaFinal !== null ? mediaFinal.toFixed(1) : '-'}
                            </td>
                          </tr>
                        )
                      })
                    )
                  })()}
                </tbody>
              </table>

              {/* Legenda da Parte Diversificada */}
              <div className="text-[7.5px] font-bold text-black uppercase mt-2 mb-1 text-left w-full">
                <span className="block font-black text-[8px] mb-0.5">Legenda da Parte Diversificada</span>
                <div className="flex gap-6 font-bold text-slate-800">
                  <span>ED: Em Desenvolvimento</span>
                  <span>AD: Adequado</span>
                  <span>AV: Avançado</span>
                </div>
              </div>

              {/* Seção de Assinatura dos Pais */}
              <div className="w-full mt-2.5">
                <div className="text-center font-black text-[8.5px] uppercase tracking-wider text-black mb-1">
                  Assinatura dos pais ou responsáveis
                </div>
                <div className="border border-black rounded-sm w-full bg-white select-text">
                  <div className="flex items-center text-[9px] font-bold border-b border-black h-7 px-2">
                    <span className="uppercase text-[8px] mr-2 shrink-0 text-black">1º Trimestre:</span>
                    <input
                      type="text"
                      value={assinaturaTrimestre1}
                      onChange={(e) => setAssinaturaTrimestre1(e.target.value)}
                      placeholder="Assinatura"
                      className="flex-1 bg-transparent focus:outline-none text-[8.5px] font-bold py-0 h-full uppercase text-black"
                    />
                  </div>
                  <div className="flex items-center text-[9px] font-bold border-b border-black h-7 px-2">
                    <span className="uppercase text-[8px] mr-2 shrink-0 text-black">2º Trimestre:</span>
                    <input
                      type="text"
                      value={assinaturaTrimestre2}
                      onChange={(e) => setAssinaturaTrimestre2(e.target.value)}
                      placeholder="Assinatura"
                      className="flex-1 bg-transparent focus:outline-none text-[8.5px] font-bold py-0 h-full uppercase text-black"
                    />
                  </div>
                  <div className="flex items-center text-[9px] font-bold h-7 px-2">
                    <span className="uppercase text-[8px] mr-2 shrink-0 text-black">3º Trimestre:</span>
                    <input
                      type="text"
                      value={assinaturaTrimestre3}
                      onChange={(e) => setAssinaturaTrimestre3(e.target.value)}
                      placeholder="Assinatura"
                      className="flex-1 bg-transparent focus:outline-none text-[8.5px] font-bold py-0 h-full uppercase text-black"
                    />
                  </div>
                </div>
              </div>

              {/* Resultado Final */}
              <div className="border border-black p-2 rounded-sm space-y-2 mt-2.5 bg-white select-text w-full">
                <h3 className="text-center text-[8.5px] font-black uppercase tracking-wider text-black">
                  Resultado Final
                </h3>
                
                <div className="h-px bg-black w-full" />

                <div className="space-y-2 text-[8.5px] font-bold text-black">
                  <div className="flex items-center gap-1">
                    <span className="uppercase text-[8px] shrink-0">O(A) aluno (a):</span>
                    <input
                      type="text"
                      value={alunoRodape}
                      onChange={(e) => setAlunoRodape(e.target.value)}
                      className="flex-1 bg-transparent border-b border-black focus:outline-none uppercase font-bold text-black py-0 px-1 text-[8.5px]"
                    />
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="uppercase text-[8px] shrink-0">foi</span>
                    <input
                      type="text"
                      value={fol}
                      onChange={(e) => setFol(e.target.value)}
                      className="w-48 bg-transparent border-b border-black focus:outline-none font-bold text-black py-0 px-1 text-[8.5px]"
                    />
                  </div>
                </div>

                {/* Linhas de Assinatura do Gestor e Data */}
                <div className="flex justify-between items-end pt-3 px-2">
                  <div className="text-center flex flex-col justify-end w-[45%]">
                    <input
                      type="text"
                      value={gestorAssinatura}
                      onChange={(e) => setGestorAssinatura(e.target.value)}
                      className="w-full bg-transparent border-b border-black text-center focus:outline-none text-[8.5px] font-bold py-0 h-4 uppercase text-black"
                    />
                    <span className="text-[7px] uppercase font-bold text-black mt-1 block">Gestor(a)</span>
                  </div>

                  <div className="text-center flex flex-col justify-end w-[35%]">
                    <input
                      type="text"
                      value={dataEmissao}
                      onChange={(e) => setDataEmissao(e.target.value)}
                      placeholder="__/__/____"
                      className="w-full bg-transparent border-b border-black text-center focus:outline-none text-[8.5px] font-mono font-bold py-0 h-4 text-black"
                    />
                    <span className="text-[7px] uppercase font-bold text-black mt-1 block">Data</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>,
    document.body
  )
}
