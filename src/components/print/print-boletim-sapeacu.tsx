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
          <div className="absolute right-0 top-0 w-[148.5mm] h-full flex flex-col justify-between items-center select-text font-sans pb-6">
            
            {/* Topo: Faixa Azul e Laranja com Cortes Slant (Igual ao boletim real) */}
            <div className="w-full relative select-none">
              {/* Faixa Azul Principal */}
              <div className="bg-[#0b4a8c] h-[34px] w-full flex items-center pl-6 text-white text-[15px] font-black tracking-wider uppercase">
                Boletim Escolar
              </div>
              {/* Faixa Laranja com o Design Inclinado */}
              <div className="h-[12px] bg-[#f07800] relative w-full overflow-hidden">
                {/* Slanted Cortes em Azul */}
                <div className="absolute right-12 top-0 bottom-0 w-3 bg-[#0b4a8c] transform -skew-x-[25deg]" />
                <div className="absolute right-4 top-0 bottom-0 w-5 bg-[#0b4a8c] transform -skew-x-[25deg]" />
              </div>
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

            {/* Painel de Identificação */}
            <div className="w-full px-8 text-left text-xs font-bold space-y-2 max-w-[370px]">
              <div className="flex flex-col gap-0.5">
                <span className="text-[8.5px] uppercase tracking-wider text-gray-500 block">Aluno(a)</span>
                <input
                  type="text"
                  value={alunoNome}
                  onChange={(e) => {
                    setAlunoNome(e.target.value)
                    setAlunoRodape(e.target.value)
                  }}
                  className="bg-transparent border-b border-black w-full focus:outline-none uppercase font-bold text-black py-0 px-1 text-[11px]"
                />
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-[8.5px] uppercase tracking-wider text-gray-500 block">Unidade Escolar</span>
                <input
                  type="text"
                  value={escolaEditada}
                  onChange={(e) => setEscolaEditada(e.target.value)}
                  className="bg-transparent border-b border-black w-full focus:outline-none uppercase font-bold text-black py-0 px-1 text-[11px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[8.5px] uppercase tracking-wider text-gray-500 block">Ano Letivo</span>
                  <input
                    type="text"
                    value={anoLetivo}
                    onChange={(e) => setAnoLetivo(e.target.value)}
                    className="bg-transparent border-b border-black w-full text-center focus:outline-none uppercase font-bold text-black py-0 px-1 text-[11px]"
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[8.5px] uppercase tracking-wider text-gray-500 block">Matrícula / Código</span>
                  <span className="border-b border-black w-full px-1 text-[11px] text-gray-800 py-0.5 truncate font-mono">
                    {aluno.id}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[8.5px] uppercase tracking-wider text-gray-500 block">Ano / Série</span>
                  <input
                    type="text"
                    value={anoEscolar}
                    onChange={(e) => setAnoEscolar(e.target.value)}
                    className="bg-transparent border-b border-black w-full text-center focus:outline-none uppercase font-bold text-black py-0 px-1 text-[11px]"
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[8.5px] uppercase tracking-wider text-gray-500 block">Turma / Turno</span>
                  <div className="flex gap-1 items-center">
                    <input
                      type="text"
                      value={turmaNome}
                      onChange={(e) => setTurmaNome(e.target.value)}
                      className="bg-transparent border-b border-black w-10 text-center focus:outline-none uppercase font-bold text-black py-0 px-0.5 text-[11px]"
                    />
                    <span className="text-gray-400 font-normal">/</span>
                    <input
                      type="text"
                      value={turno}
                      onChange={(e) => setTurno(e.target.value)}
                      className="bg-transparent border-b border-black w-full text-center focus:outline-none uppercase font-bold text-black py-0 px-0.5 text-[11px]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Base: Faixa Azul e Laranja Inclinada (Simétrica ao Topo) */}
            <div className="w-full relative select-none mt-2">
              {/* Faixa Laranja */}
              <div className="h-[12px] bg-[#f07800] relative w-full overflow-hidden">
                {/* Slanted Cortes em Azul */}
                <div className="absolute left-4 top-0 bottom-0 w-5 bg-[#0b4a8c] transform -skew-x-[25deg]" />
                <div className="absolute left-12 top-0 bottom-0 w-3 bg-[#0b4a8c] transform -skew-x-[25deg]" />
              </div>
              {/* Faixa Azul Principal */}
              <div className="bg-[#0b4a8c] h-[34px] w-full flex items-center justify-center text-white text-[8px] font-bold tracking-widest uppercase">
                Prefeitura Municipal de Sapeaçú • Secretaria de Educação
              </div>
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
              {/* Mini Cabeçalho da Tabela */}
              <div className="flex justify-between items-center text-[9.5px] font-bold text-black pb-1 border-b border-black mb-1.5 uppercase">
                <span className="truncate max-w-[240px]">Aluno: {alunoNome}</span>
                <span>Turma: {turmaNome} ({turno})</span>
              </div>

              {/* Tabela de Notas */}
              <table className="w-full border-collapse border border-black text-center font-bold text-[9px]">
                <thead>
                  {/* Linha 1: ANOS FINAIS */}
                  <tr style={{ backgroundColor: 'rgba(160, 190, 220, 1)' }}>
                    <th colSpan={8} className="border border-black py-0.5 text-center text-[11px] font-black uppercase tracking-wider text-black">
                      Anos Finais
                    </th>
                  </tr>
                  {/* Linha 2: Cabeçalhos principais (Corrigida: 8 colunas para alinhar com o rowSpan) */}
                  <tr style={{ backgroundColor: 'rgba(160, 190, 220, 1)' }} className="font-bold text-black text-[8.5px]">
                    <th className="border border-black w-6"></th> {/* Espaço alinhado com a barra lateral de base/diversas */}
                    <th className="border border-black px-1.5 py-0.5 text-left uppercase w-[38%]">
                      Componentes Curriculares
                    </th>
                    <th className="border border-black py-0.5 w-[8%]">TRI</th>
                    <th className="border border-black py-0.5 w-[8%]">TRI</th>
                    <th className="border border-black py-0.5 w-[8%]">TRI</th>
                    <th className="border border-black py-0.5 w-[10%]">TOTAL</th>
                    <th className="border border-black py-0.5 w-[11%]">Média Final</th>
                    <th className="border border-black py-0.5 w-[11%]">REC</th>
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
                            <td className="border border-black py-0.5 bg-slate-50">
                              {total !== null ? total.toFixed(1) : '-'}
                            </td>
                            {/* Média Final */}
                            <td className={`border border-black py-0.5 ${
                              mediaFinal !== null && mediaFinal < 5.0 ? 'text-red-600 bg-red-50/10' : 'text-slate-950'
                            }`}>
                              {mediaFinal !== null ? mediaFinal.toFixed(1) : '-'}
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
                            <td className="border border-black py-0.5 bg-slate-50">
                              {total !== null ? total.toFixed(1) : '-'}
                            </td>
                            {/* Média Final */}
                            <td className={`border border-black py-0.5 ${
                              mediaFinal !== null && mediaFinal < 5.0 ? 'text-red-600 bg-red-50/10' : 'text-slate-955'
                            }`}>
                              {mediaFinal !== null ? mediaFinal.toFixed(1) : '-'}
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
                          </tr>
                        )
                      })
                    )
                  })()}
                </tbody>
              </table>
            </div>

            {/* Rodapé: Legendas, Assinaturas e Resultado Final */}
            <div className="space-y-1.5 mt-2 text-black">
              {/* Legendas e Assinaturas Trimestrais */}
              <div className="grid grid-cols-12 gap-2 items-start">
                {/* Legenda */}
                <div className="col-span-5 text-[7.5px] leading-relaxed text-black border border-black p-1 font-bold rounded-sm">
                  <span className="block border-b border-black pb-0.5 mb-0.5 text-[8px] font-black uppercase text-center">
                    Parte Diversificada
                  </span>
                  <div className="space-y-0.5 uppercase text-left">
                    <p>ED: Em Desenvolvimento</p>
                    <p>AO: Adequado</p>
                    <p>AV: Avaliado</p>
                  </div>
                </div>

                {/* Assinatura dos pais ou responsáveis (Trimestres) */}
                <div className="col-span-7 border border-black p-1 rounded-sm flex flex-col justify-between min-h-[50px]">
                  <span className="block border-b border-black pb-0.5 mb-0.5 text-[8px] font-black uppercase text-center">
                    Assinatura dos Pais ou Responsáveis
                  </span>
                  <div className="grid grid-cols-3 gap-1 text-[7px]">
                    <div className="flex flex-col gap-0.5">
                      <input
                        type="text"
                        value={assinaturaTrimestre1}
                        onChange={(e) => setAssinaturaTrimestre1(e.target.value)}
                        placeholder="Assinatura"
                        className="w-full bg-transparent border-b border-black text-center focus:outline-none text-[8.5px] h-3 py-0 uppercase"
                      />
                      <span className="text-center font-bold text-[7px] uppercase">1º Trimestre</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <input
                        type="text"
                        value={assinaturaTrimestre2}
                        onChange={(e) => setAssinaturaTrimestre2(e.target.value)}
                        placeholder="Assinatura"
                        className="w-full bg-transparent border-b border-black text-center focus:outline-none text-[8.5px] h-3 py-0 uppercase"
                      />
                      <span className="text-center font-bold text-[7px] uppercase">2º Trimestre</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <input
                        type="text"
                        value={assinaturaTrimestre3}
                        onChange={(e) => setAssinaturaTrimestre3(e.target.value)}
                        placeholder="Assinatura"
                        className="w-full bg-transparent border-b border-black text-center focus:outline-none text-[8.5px] h-3 py-0 uppercase"
                      />
                      <span className="text-center font-bold text-[7px] uppercase">3º Trimestre</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Resultado Final (Bottom Section) */}
              <div className="border border-black p-1.5 rounded-sm space-y-1">
                <h3 className="text-center text-[8.5px] font-black uppercase tracking-wider text-black">
                  Resultado Final
                </h3>
                
                <div className="h-px bg-black w-full" />

                <div className="grid grid-cols-12 gap-y-1 gap-x-2 text-[8.5px] font-bold">
                  <div className="col-span-9 flex items-center gap-1">
                    <span className="uppercase text-[8px] shrink-0 text-slate-700">O(A) aluno (a):</span>
                    <input
                      type="text"
                      value={alunoRodape}
                      onChange={(e) => setAlunoRodape(e.target.value)}
                      className="flex-1 bg-transparent border-b border-black focus:outline-none uppercase font-bold text-black py-0 px-1 text-[8.5px]"
                    />
                  </div>

                  <div className="col-span-3 flex items-center gap-1">
                    <span className="uppercase text-[8px] shrink-0 text-slate-700">fol:</span>
                    <input
                      type="text"
                      value={fol}
                      onChange={(e) => setFol(e.target.value)}
                      className="flex-1 bg-transparent border-b border-black focus:outline-none text-center font-bold text-black py-0 px-0.5 text-[8.5px]"
                    />
                  </div>
                </div>

                {/* Linhas de Assinatura do Gestor e Data */}
                <div className="grid grid-cols-12 gap-2 items-end pt-0.5">
                  <div className="col-span-5 text-center flex flex-col justify-end min-h-[20px]">
                    <div className="border-b border-black w-full" />
                    <span className="text-[7px] uppercase font-bold text-slate-500 mt-0.5 block">Assinatura Secretário(a)</span>
                  </div>

                  <div className="col-span-4 text-center flex flex-col justify-end min-h-[20px]">
                    <input
                      type="text"
                      value={gestorAssinatura}
                      onChange={(e) => setGestorAssinatura(e.target.value)}
                      className="w-full bg-transparent border-b border-black text-center focus:outline-none text-[8.5px] font-bold py-0 h-3.5 uppercase"
                    />
                    <span className="text-[7px] uppercase font-bold text-slate-700 mt-0.5 block">Gestor(a)</span>
                  </div>

                  <div className="col-span-3 text-center flex flex-col justify-end min-h-[20px]">
                    <input
                      type="text"
                      value={dataEmissao}
                      onChange={(e) => setDataEmissao(e.target.value)}
                      placeholder="__/__/____"
                      className="w-full bg-transparent border-b border-black text-center focus:outline-none text-[8.5px] font-mono font-bold py-0 h-3.5"
                    />
                    <span className="text-[7px] uppercase font-bold text-slate-700 mt-0.5 block">Data</span>
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
