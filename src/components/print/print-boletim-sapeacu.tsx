'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { PrintHeader } from '@/components/print/print-header'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { useEditModeStore } from '@/store/useEditModeStore'
import { toast } from 'sonner'
import { Save, Printer, Loader2 } from 'lucide-react'

// Subcomponentes importados
import { BoletimCapa } from './boletim/BoletimCapa'
import { BoletimTabelaNotas } from './boletim/BoletimTabelaNotas'
import { BoletimAssinaturas } from './boletim/BoletimAssinaturas'

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
  const [secretarioNome, setSecretarioNome] = useState('MARCUS ALANO CORREIA OLIVEIRA')
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

  const getCacheBustedUrl = (url: string) => {
    if (!url) return ''
    if (url.startsWith('data:image')) return url
    const cleanUrl = url.split('?')[0]
    return `${cleanUrl}?t=${Date.now()}`
  }

  // Parsing automático da turma (ex: "6 - A" -> Ano: "6º ANO", Turma: "A")
  useEffect(() => {
    const nomeTurma = turma.nome
    try {
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
    } catch {
      setAnoEscolar(nomeTurma)
      setTurmaNome('')
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
    setDataEmissao(new Date().toLocaleDateString('pt-BR'))

    return () => setMounted(false)
  }, [notas, recuperacoes])

  // Buscar nome oficial do Secretário de Educação no Supabase
  useEffect(() => {
    let active = true
    const fetchSecretario = async () => {
      try {
        const supabase = createClient()
        const { data } = await (supabase as any)
          .from('configuracoes_rede')
          .select('secretario_educacao')
          .eq('id', '00000000-0000-0000-0000-000000000001')
          .maybeSingle()
        if (active && data?.secretario_educacao) {
          setSecretarioNome(data.secretario_educacao)
        }
      } catch (err) {
        console.error('Erro ao carregar nome do Secretário de Educação:', err)
      }
    }
    fetchSecretario()
    return () => {
      active = false
    }
  }, [])

  // Separação de matérias
  const materiasComuns = materias.filter((m) => m.base_curricular === 'comum' || !m.base_curricular)
  const materiasDiversas = materias.filter((m) => m.base_curricular === 'diversificada')

  const handlePrint = () => {
    const originalTitle = document.title
    const anoAtual = new Date().getFullYear()
    const nomeFormatado = (alunoNome || aluno?.nome || 'aluno')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')

    document.title = `${nomeFormatado}_boletim_${anoAtual}`
    window.print()
    document.title = originalTitle
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
    <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-start p-6 overflow-y-auto print:static print:block print:p-0 print:bg-white print:overflow-visible print-portal-container animate-in fade-in duration-200">
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
        <BoletimCapa
          escolaEditada={escolaEditada}
          escolaLogoUrl={escolaLogoUrl}
          supabaseUrl={supabaseUrl}
          getCacheBustedUrl={getCacheBustedUrl}
        />

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
              <PrintHeader
                className="pb-1 mb-2 border-none text-black items-center"
                logoClassName="w-10 h-10 object-contain"
                centerClassName="text-center font-black text-[10px] uppercase tracking-wide text-black leading-tight"
                centerContent={
                  <>
                    <p>Estado da Bahia</p>
                    <p>Prefeitura Municipal de Sapeaçu</p>
                  </>
                }
              />
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
              <BoletimTabelaNotas
                isEditMode={isEditMode}
                materiasComuns={materiasComuns}
                materiasDiversas={materiasDiversas}
                notasState={notasState}
                recsState={recsState}
                handleNotaChange={handleNotaChange}
                handleRecChange={handleRecChange}
                calcularTotal={calcularTotal}
                calcularMediaFinal={calcularMediaFinal}
              />
            </div>

            {/* Rodapé e Canhoto */}
            <BoletimAssinaturas
              secretarioNome={secretarioNome}
              isEditMode={isEditMode}
              dataEmissao={dataEmissao}
              setDataEmissao={setDataEmissao}
              gestorAssinatura={gestorAssinatura}
              setGestorAssinatura={setGestorAssinatura}
              fol={fol}
              setFol={setFol}
              alunoRodape={alunoRodape}
              setAlunoRodape={setAlunoRodape}
              assinaturaTrimestre1={assinaturaTrimestre1}
              setAssinaturaTrimestre1={setAssinaturaTrimestre1}
              assinaturaTrimestre2={assinaturaTrimestre2}
              setAssinaturaTrimestre2={setAssinaturaTrimestre2}
              assinaturaTrimestre3={assinaturaTrimestre3}
              setAssinaturaTrimestre3={setAssinaturaTrimestre3}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
