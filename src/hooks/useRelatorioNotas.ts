'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabaseClient'

export interface NotaRecord {
  id: string
  aluno_id: string
  materia_id: string
  turma_id: string
  escola_id: string
  unidade: number
  nota1: number | null
  nota2: number | null
  nota3: number | null
  nota4: number | null
  alunos?: {
    nome: string
  }
}

export interface EscolaDesempenho {
  id: string
  nome: string
  totalAlunos: number
  mediaGeral: number | null
  alunosAprovados: number
  alunosRisco: number
  totalTurmas: number
  taxaAssiduidade: number | null
  alunosEvasao: number
}

export interface FrequenciaRecord {
  id: string
  aluno_id: string
  turma_id: string
  escola_id: string
  materia_id: string | null
  data: string
  presenca: boolean
}

export function useRelatorioNotas(escolaId: string | null) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Dados brutos buscados
  const [notas, setNotas] = useState<NotaRecord[]>([])
  const [turmas, setTurmas] = useState<any[]>([])
  const [materias, setMaterias] = useState<any[]>([])
  const [alunos, setAlunos] = useState<any[]>([])
  const [frequencias, setFrequencias] = useState<FrequenciaRecord[]>([])
  const [escolasDesempenho, setEscolasDesempenho] = useState<EscolaDesempenho[]>([])

  // Dados calculados / agregados
  const [mediaRede, setMediaRede] = useState<number | null>(null)
  const [taxaAprovados, setTaxaAprovados] = useState<number>(0)
  const [taxaRisco, setTaxaRisco] = useState<number>(0)
  
  const supabase = createClient()

  // Carregar turmas e matérias da escola ativa para os filtros
  useEffect(() => {
    async function loadFiltrosData() {
      if (!escolaId) {
        setTurmas([])
        setMaterias([])
        return
      }
      try {
        const [turmasRes, materiasRes] = await Promise.all([
          supabase.from('turmas').select('*').eq('escola_id', escolaId).is('deleted_at', null),
          supabase.from('materias').select('*').eq('escola_id', escolaId)
        ])

        if (turmasRes.error) throw turmasRes.error
        if (materiasRes.error) throw materiasRes.error

        setTurmas(turmasRes.data || [])
        setMaterias(materiasRes.data || [])
      } catch (err: any) {
        console.error('Erro ao carregar filtros de escola:', err)
      }
    }
    loadFiltrosData()
  }, [escolaId])

  // Função principal para carregar os dados pedagógicos
  const fetchPedagogicoData = useCallback(async (filters: {
    anoLetivo?: string
    turmaId?: string
    materiaId?: string
  } = {}) => {
    setLoading(true)
    setError(null)
    try {
      if (escolaId) {
        // --- VISÃO DA ESCOLA (DIRETOR) ---
        // 1. Buscar alunos da escola (e aplicar filtro de turma se houver)
        let queryAlunos = supabase
          .from('alunos')
          .select('id, nome, turma_id')
          .eq('escola_id', escolaId)
          .is('deleted_at', null)

        if (filters.turmaId && filters.turmaId !== 'todos') {
          queryAlunos = queryAlunos.eq('turma_id', filters.turmaId)
        }

        const { data: AlunosData, error: errAlunos } = await queryAlunos
        if (errAlunos) throw errAlunos
        setAlunos(AlunosData || [])

        // 2. Buscar Notas
        let queryNotas = supabase
          .from('notas')
          .select('id, aluno_id, materia_id, turma_id, escola_id, unidade, nota1, nota2, nota3, nota4, alunos!inner(nome)')
          .eq('escola_id', escolaId)
        
        if (filters.turmaId && filters.turmaId !== 'todos') {
          queryNotas = queryNotas.eq('turma_id', filters.turmaId)
        }
        if (filters.materiaId && filters.materiaId !== 'todos') {
          queryNotas = queryNotas.eq('materia_id', filters.materiaId)
        }

        const { data: NotasData, error: errNotas } = await queryNotas
        if (errNotas) throw errNotas
        setNotas((NotasData as unknown as NotaRecord[]) || [])

        // 3. Buscar Frequências (Lightweight)
        let queryFreqs = supabase
          .from('frequencias')
          .select('id, aluno_id, turma_id, escola_id, materia_id, data, presenca')
          .eq('escola_id', escolaId)

        if (filters.turmaId && filters.turmaId !== 'todos') {
          queryFreqs = queryFreqs.eq('turma_id', filters.turmaId)
        }

        const { data: FreqsData, error: errFreqs } = await queryFreqs
        if (errFreqs) throw errFreqs
        setFrequencias((FreqsData as FrequenciaRecord[]) || [])

      } else {
        // --- VISÃO CONSOLIDADA (REDE) ---
        // Buscar todas as escolas, turmas, alunos, notas e frequências para agregarmos
        const [escolasRes, turmasRes, alunosRes, notasRes, freqsRes] = await Promise.all([
          supabase.from('escolas').select('id, nome').is('deleted_at', null),
          supabase.from('turmas').select('id, escola_id').is('deleted_at', null),
          supabase.from('alunos').select('id, escola_id').is('deleted_at', null),
          supabase.from('notas').select('id, aluno_id, materia_id, escola_id, unidade, nota1, nota2, nota3, nota4'),
          supabase.from('frequencias').select('aluno_id, escola_id, presenca')
        ])

        if (escolasRes.error) throw escolasRes.error
        if (turmasRes.error) throw turmasRes.error
        if (alunosRes.error) throw alunosRes.error
        if (notasRes.error) throw notasRes.error
        if (freqsRes.error) throw freqsRes.error

        const allEscolas = escolasRes.data || []
        const allTurmas = turmasRes.data || []
        const allAlunos = alunosRes.data || []
        const allNotas = notasRes.data || []
        const allFreqs = freqsRes.data || []

        setFrequencias(allFreqs as FrequenciaRecord[])

        // Agrupar e calcular médias/frequência por escola
        const escolaMetrics = allEscolas.map((esc) => {
          const escAlunos = allAlunos.filter((a) => a.escola_id === esc.id)
          const escTurmas = allTurmas.filter((t) => t.escola_id === esc.id)
          const escNotas = allNotas.filter((n) => n.escola_id === esc.id)
          const escFreqs = allFreqs.filter((f) => f.escola_id === esc.id)

          // 1. Calcular médias de cada aluno
          const alunoMedias: Record<string, number[]> = {}
          
          escNotas.forEach((n) => {
            const validas = [n.nota1, n.nota2, n.nota3, n.nota4].filter((val): val is number => val !== null && !isNaN(Number(val)))
            if (validas.length > 0) {
              const soma = validas.reduce((a, b) => a + b, 0)
              const media = soma / validas.length
              
              if (!alunoMedias[n.aluno_id]) {
                alunoMedias[n.aluno_id] = []
              }
              alunoMedias[n.aluno_id].push(media)
            }
          })

          let totalEscolaSoma = 0
          let countMedias = 0
          let aprovados = 0
          let risco = 0

          escAlunos.forEach((aluno) => {
            const medias = alunoMedias[aluno.id] || []
            if (medias.length > 0) {
              const mediaFinal = medias.reduce((a, b) => a + b, 0) / medias.length
              totalEscolaSoma += mediaFinal
              countMedias++
              
              if (mediaFinal >= 5.0) {
                aprovados++
              } else {
                risco++
              }
            } else {
              // Sem notas
              risco++
            }
          })

          const mediaGeral = countMedias > 0 ? parseFloat((totalEscolaSoma / countMedias).toFixed(1)) : null

          // 2. Calcular Assiduidade (Frequência) e Evasão (Frequência < 75%) por aluno
          const alunoFreqsMap: Record<string, { presencas: number; total: number }> = {}
          escFreqs.forEach((f) => {
            if (!alunoFreqsMap[f.aluno_id]) {
              alunoFreqsMap[f.aluno_id] = { presencas: 0, total: 0 }
            }
            alunoFreqsMap[f.aluno_id].total++
            if (f.presenca) {
              alunoFreqsMap[f.aluno_id].presencas++
            }
          })

          let evasaoCount = 0
          escAlunos.forEach((aluno) => {
            const stats = alunoFreqsMap[aluno.id]
            if (stats && stats.total > 0) {
              const freqRate = (stats.presencas / stats.total) * 100
              if (freqRate < 75) {
                evasaoCount++
              }
            }
          })

          const totalFreqs = escFreqs.length
          const totalPresencas = escFreqs.filter((f) => f.presenca).length
          const taxaAssiduidade = totalFreqs > 0 ? parseFloat(((totalPresencas / totalFreqs) * 100).toFixed(1)) : null

          return {
            id: esc.id,
            nome: esc.nome,
            totalAlunos: escAlunos.length,
            mediaGeral,
            alunosAprovados: aprovados,
            alunosRisco: risco,
            totalTurmas: escTurmas.length,
            taxaAssiduidade,
            alunosEvasao: evasaoCount
          }
        })

        setEscolasDesempenho(escolaMetrics)

        // Calcular médias globais da rede
        const todasMedias = escolaMetrics
          .map((e) => e.mediaGeral)
          .filter((m): m is number => m !== null)
        
        const mediaGeralRede = todasMedias.length > 0 
          ? parseFloat((todasMedias.reduce((a, b) => a + b, 0) / todasMedias.length).toFixed(1))
          : null
        
        setMediaRede(mediaGeralRede)

        const totalAlunosRede = allAlunos.length
        if (totalAlunosRede > 0) {
          const totalAprovados = escolaMetrics.reduce((sum, e) => sum + e.alunosAprovados, 0)
          const totalRisco = escolaMetrics.reduce((sum, e) => sum + e.alunosRisco, 0)
          
          setTaxaAprovados(parseFloat(((totalAprovados / totalAlunosRede) * 100).toFixed(1)))
          setTaxaRisco(parseFloat(((totalRisco / totalAlunosRede) * 100).toFixed(1)))
        } else {
          setTaxaAprovados(0)
          setTaxaRisco(0)
        }
      }
    } catch (err: any) {
      console.error('Erro ao buscar dados pedagógicos:', err)
      setError(err.message || 'Falha ao recuperar dados do banco de dados.')
    } finally {
      setLoading(false)
    }
  }, [escolaId])

  // Atualizar sempre que mudar a escola selecionada
  useEffect(() => {
    fetchPedagogicoData()
  }, [escolaId, fetchPedagogicoData])

  return {
    loading,
    error,
    notas,
    turmas,
    materias,
    alunos,
    frequencias,
    escolasDesempenho,
    mediaRede,
    taxaAprovados,
    taxaRisco,
    refetch: fetchPedagogicoData
  }
}
