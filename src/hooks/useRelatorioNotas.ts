'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
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
  
  const supabase = useMemo(() => createClient(), [])
  const fetchIdRef = useRef(0)

  // Carregar turmas e matérias da escola ativa para os filtros
  useEffect(() => {
    let active = true
    async function loadFiltrosData() {
      if (!escolaId) {
        setTurmas([])
        setMaterias([])
        return
      }
      try {
        const [turmasRes, materiasRes] = await Promise.all([
          supabase.from('turmas').select('id, nome, ano_letivo, escola_id, turno, capacidade, created_at, deleted_at').eq('escola_id', escolaId).is('deleted_at', null),
          supabase.from('materias').select('id, nome, base_curricular, turma_id, escola_id, professor_id, created_at').eq('escola_id', escolaId)
        ])

        if (turmasRes.error) throw turmasRes.error
        if (materiasRes.error) throw materiasRes.error

        if (active) {
          setTurmas(turmasRes.data || [])
          setMaterias(materiasRes.data || [])
        }
      } catch (err: any) {
        console.error('Erro ao carregar filtros de escola:', err)
      }
    }
    loadFiltrosData()
    return () => {
      active = false
    }
  }, [escolaId, supabase])

  // Função principal para carregar os dados pedagógicos
  const fetchPedagogicoData = useCallback(async (filters: {
    anoLetivo?: string
    turmaId?: string
    materiaId?: string
    periodo?: string
  } = {}) => {
    const currentFetchId = ++fetchIdRef.current

    setLoading(true)
    setError(null)
    
    const activePeriod = filters.periodo ?? '30d'
    const getStartDate = (p: string) => {
      const now = new Date()
      if (p === '7d') {
        now.setDate(now.getDate() - 7)
        return now.toISOString().split('T')[0]
      }
      if (p === '30d') {
        now.setDate(now.getDate() - 30)
        return now.toISOString().split('T')[0]
      }
      if (p === 'trimestre') {
        now.setDate(now.getDate() - 90)
        return now.toISOString().split('T')[0]
      }
      if (p === 'ano') {
        return `${now.getFullYear()}-01-01`
      }
      return null
    }
    const startDate = getStartDate(activePeriod)

    try {
      if (escolaId) {
        // --- VISÃO DA ESCOLA (DIRETOR) ---
        // 1. Buscar alunos da escola
        const { data: AlunosData, error: errAlunos } = await supabase
          .from('alunos')
          .select('id, nome, turma_id')
          .eq('escola_id', escolaId)
          .is('deleted_at', null)

        if (errAlunos) throw errAlunos
        if (currentFetchId !== fetchIdRef.current) return
        setAlunos(AlunosData || [])

        // 2. Buscar Notas (Sem join alunos!inner(nome) para evitar descartes por inconsistência de chave)
        const { data: NotasData, error: errNotas } = await supabase
          .from('notas')
          .select('id, aluno_id, materia_id, turma_id, escola_id, unidade, nota1, nota2, nota3, nota4')
          .eq('escola_id', escolaId)

        if (errNotas) throw errNotas
        if (currentFetchId !== fetchIdRef.current) return
        setNotas((NotasData as unknown as NotaRecord[]) || [])

        // 3. Buscar Frequências (Filtrado apenas pelo período de datas)
        let queryFreqs = supabase
          .from('frequencias')
          .select('id, aluno_id, turma_id, escola_id, materia_id, data, presenca')
          .eq('escola_id', escolaId)

        if (startDate) {
          queryFreqs = queryFreqs.gte('data', startDate)
        }

        const { data: FreqsData, error: errFreqs } = await queryFreqs
        if (errFreqs) throw errFreqs
        if (currentFetchId !== fetchIdRef.current) return
        setFrequencias((FreqsData as FrequenciaRecord[]) || [])

      } else {
        // --- VISÃO CONSOLIDADA (REDE) ---
        // Buscar todas as escolas, turmas, alunos, notas e frequências para agregarmos
        let queryFreqs = supabase
          .from('frequencias')
          .select('aluno_id, escola_id, presenca, data')
        if (startDate) {
          queryFreqs = queryFreqs.gte('data', startDate)
        }

        const [escolasRes, turmasRes, alunosRes, notasRes, freqsRes] = await Promise.all([
          supabase.from('escolas').select('id, nome, tipo, secretaria_id, secretarias:secretaria_id(id, nome)').is('deleted_at', null),
          supabase.from('turmas').select('id, escola_id').is('deleted_at', null),
          supabase.from('alunos').select('id, escola_id').is('deleted_at', null),
          supabase.from('notas').select('id, aluno_id, materia_id, escola_id, unidade, nota1, nota2, nota3, nota4'),
          queryFreqs
        ])

        if (escolasRes.error) throw escolasRes.error
        if (turmasRes.error) throw turmasRes.error
        if (alunosRes.error) throw alunosRes.error
        if (notasRes.error) throw notasRes.error
        if (freqsRes.error) throw freqsRes.error

        if (currentFetchId !== fetchIdRef.current) return

        const rawEscolas = escolasRes.data || []
        const allEscolas = rawEscolas.filter((esc: any) => {
          const secNome = esc.secretarias?.nome || ''
          const isSaude = /sa[uú]de/i.test(secNome) || esc.tipo === 'SAUDE' || esc.tipo === 'UNIDADE_SAUDE'
          return !isSaude
        })
        const eduEscolaIds = new Set(allEscolas.map((e: any) => e.id))

        const allTurmas = (turmasRes.data || []).filter((t) => eduEscolaIds.has(t.escola_id))
        const allAlunos = (alunosRes.data || []).filter((a) => eduEscolaIds.has(a.escola_id))
        const allNotas = (notasRes.data || []).filter((n) => eduEscolaIds.has(n.escola_id))
        const allFreqs = (freqsRes.data || []).filter((f) => eduEscolaIds.has(f.escola_id))

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
      if (currentFetchId !== fetchIdRef.current) return
      console.error('Erro ao buscar dados pedagógicos:', err)
      setError(err.message || 'Falha ao recuperar dados do banco de dados.')
    } finally {
      if (currentFetchId === fetchIdRef.current) {
        setLoading(false)
      }
    }
  }, [escolaId, supabase])

  // O carregamento inicial e atualizações são gerenciados pelo componente pai chamando refetch() com filtros.

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
