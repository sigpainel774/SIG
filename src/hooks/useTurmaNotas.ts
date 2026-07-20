'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'

interface UseTurmaNotasProps {
  open: boolean
  turma: any
  alunos: any[]
  materias: any[]
  escolaAtivaId: string | null
  supabase: any
  isMounted: React.RefObject<boolean>
}

export function useTurmaNotas({
  open,
  turma,
  alunos,
  materias,
  escolaAtivaId,
  supabase,
  isMounted
}: UseTurmaNotasProps) {
  const [notasState, setNotasState] = useState<Record<string, { nota1: string | number | null; nota2: string | number | null; nota3: string | number | null; nota4: string | number | null }>>({})
  const [recuperacoesState, setRecuperacoesState] = useState<Record<string, { nota: string | number | null }>>({})
  const [calculosServidorState, setCalculosServidorState] = useState<Record<string, { m1: number | null; m2: number | null; m3: number | null; mediaFinal: number | null; mediaPosRec: number | null; situacao: string; todasUnidades: boolean; isElegivelRec: boolean }>>({})
  const [unidadesAtivas, setUnidadesAtivas] = useState<Record<string, number>>({})
  const [savingNotas, setSavingNotas] = useState<Record<string, boolean>>({})

  // 6. Notas da Turma (SWR)
  const { data: notasServidor, error: errorNotas, mutate: mutateNotasServidor } = useSWR(
    open && turma?.id ? ['notas-turma', turma.id] : null,
    async () => {
      const [notasRes, recsRes, calculosRes] = await Promise.all([
        supabase.from('notas').select('aluno_id, materia_id, unidade, nota1, nota2, nota3, nota4').eq('turma_id', turma.id),
        supabase.from('recuperacoes_finais').select('aluno_id, materia_id, nota').eq('turma_id', turma.id),
        supabase.from('boletins_consolidados').select('*').eq('turma_id', turma.id)
      ])
      if (notasRes.error) throw notasRes.error
      if (recsRes.error) throw recsRes.error
      if (calculosRes.error) throw calculosRes.error

      const notasMap: typeof notasState = {}
      ;(notasRes.data || []).forEach((n: any) => {
        notasMap[`${n.aluno_id}_${n.materia_id}_${n.unidade}`] = {
          nota1: n.nota1 !== null ? String(n.nota1) : null,
          nota2: n.nota2 !== null ? String(n.nota2) : null,
          nota3: n.nota3 !== null ? String(n.nota3) : null,
          nota4: n.nota4 !== null ? String(n.nota4) : null
        }
      })

      const recMap: typeof recuperacoesState = {}
      ;(recsRes.data || []).forEach((r: any) => {
        recMap[`${r.aluno_id}_${r.materia_id}`] = { nota: r.nota !== null ? String(r.nota) : null }
      })

      const calculosMap: typeof calculosServidorState = {}
      ;(calculosRes.data || []).forEach((c: any) => {
        calculosMap[`${c.aluno_id}_${c.materia_id}`] = {
          m1: c.m1 !== null ? Number(c.m1) : null,
          m2: c.m2 !== null ? Number(c.m2) : null,
          m3: c.m3 !== null ? Number(c.m3) : null,
          mediaFinal: c.media_final !== null ? Number(c.media_final) : null,
          mediaPosRec: c.media_pos_rec !== null ? Number(c.media_pos_rec) : null,
          situacao: c.situacao ?? 'Sem Notas',
          todasUnidades: !!c.todas_unidades,
          isElegivelRec: !!c.is_elegivel_rec
        }
      })

      return { notasMap, recMap, calculosMap }
    },
    { 
      revalidateOnFocus: false, 
      revalidateOnReconnect: false, 
      revalidateIfStale: false 
    }
  )

  useEffect(() => {
    if (errorNotas) {
      toast.error('Erro ao buscar notas da turma: ' + errorNotas.message)
    }
  }, [errorNotas])

  useEffect(() => {
    if (notasServidor && isMounted.current) {
      setNotasState(notasServidor.notasMap)
      setRecuperacoesState(notasServidor.recMap)
      setCalculosServidorState(notasServidor.calculosMap || {})
    }
  }, [notasServidor])

  const handleNotaChange = useCallback((
    alunoId: string,
    materiaId: string,
    unidade: number,
    campo: 'nota1' | 'nota2' | 'nota3' | 'nota4',
    valor: string
  ) => {
    const rawVal = valor.replace(',', '.')
    if (rawVal === '') {
      const key = `${alunoId}_${materiaId}_${unidade}`
      if (isMounted.current) {
        setNotasState(prev => ({
          ...prev,
          [key]: {
            ...(prev[key] || { nota1: null, nota2: null, nota3: null, nota4: null }),
            [campo]: null
          }
        }))
      }
      return
    }

    if (!/^(10(\.0?)?|[0-9](\.[0-9]?)?|\.)$/.test(rawVal)) {
      return
    }
    
    const key = `${alunoId}_${materiaId}_${unidade}`
    if (isMounted.current) {
      setNotasState(prev => ({
        ...prev,
        [key]: {
          ...(prev[key] || { nota1: null, nota2: null, nota3: null, nota4: null }),
          [campo]: rawVal
        }
      }))
    }
  }, [])

  const handleRecuperacaoChange = useCallback((
    alunoId: string,
    materiaId: string,
    valor: string
  ) => {
    const rawVal = valor.replace(',', '.')
    const key = `${alunoId}_${materiaId}`
    if (rawVal === '') {
      if (isMounted.current) {
        setRecuperacoesState(prev => ({
          ...prev,
          [key]: { nota: null }
        }))
      }
      return
    }

    if (!/^(10(\.0?)?|[0-9](\.[0-9]?)?|\.)$/.test(rawVal)) {
      return
    }

    if (isMounted.current) {
      setRecuperacoesState(prev => ({
        ...prev,
        [key]: { nota: rawVal }
      }))
    }
  }, [])

  const defaultCalculos = useMemo(() => ({
    m1: null,
    m2: null,
    m3: null,
    mediaFinal: null,
    mediaPosRec: null,
    situacao: 'Sem Notas',
    todasUnidades: false,
    isElegivelRec: false
  }), [])

  const calculosNotas = useMemo(() => {
    const res: Record<string, {
      m1: number | null
      m2: number | null
      m3: number | null
      mediaFinal: number | null
      mediaPosRec: number | null
      situacao: string
      todasUnidades: boolean
      isElegivelRec: boolean
    }> = {}

    alunos.forEach(aluno => {
      materias.forEach(mat => {
        const keyPrefix = `${aluno.id}_${mat.id}`
        
        const nServidor = (notasServidor ?? { notasMap: {}, recMap: {} }) as any
        
        const keyU1 = `${keyPrefix}_1`
        const keyU2 = `${keyPrefix}_2`
        const keyU3 = `${keyPrefix}_3`
        const keyRec = keyPrefix

        const localN1 = notasState[keyU1] || { nota1: null, nota2: null, nota3: null, nota4: null }
        const localN2 = notasState[keyU2] || { nota1: null, nota2: null, nota3: null, nota4: null }
        const localN3 = notasState[keyU3] || { nota1: null, nota2: null, nota3: null, nota4: null }
        const localRec = recuperacoesState[keyRec] || { nota: null }

        const servN1 = nServidor.notasMap?.[keyU1] || { nota1: null, nota2: null, nota3: null, nota4: null }
        const servN2 = nServidor.notasMap?.[keyU2] || { nota1: null, nota2: null, nota3: null, nota4: null }
        const servN3 = nServidor.notasMap?.[keyU3] || { nota1: null, nota2: null, nota3: null, nota4: null }
        const servRec = nServidor.recMap?.[keyRec] || { nota: null }

        const isSujo = 
          JSON.stringify(localN1) !== JSON.stringify(servN1) ||
          JSON.stringify(localN2) !== JSON.stringify(servN2) ||
          JSON.stringify(localN3) !== JSON.stringify(servN3) ||
          JSON.stringify(localRec) !== JSON.stringify(servRec)

        // Se o registro não foi modificado localmente e os cálculos do banco existem, usamos a View (Back-end)
        if (!isSujo && calculosServidorState[keyPrefix]) {
          res[keyPrefix] = calculosServidorState[keyPrefix]
          return
        }

        // Caso contrário, roda a lógica híbrida local para feedback instantâneo de digitação (Front-end)
        const parseUnidade = (n: typeof localN1) => {
          const v1 = n.nota1 !== null && n.nota1 !== '' ? Number(n.nota1) : null
          const v2 = n.nota2 !== null && n.nota2 !== '' ? Number(n.nota2) : null
          const v3 = n.nota3 !== null && n.nota3 !== '' ? Number(n.nota3) : null
          const v4 = n.nota4 !== null && n.nota4 !== '' ? Number(n.nota4) : null
          
          const validas = [v1, v2, v3, v4].filter((v): v is number => v !== null && !isNaN(v))
          if (validas.length === 0) return null
          
          const val1 = v1 ?? 0
          const val2 = v2 ?? 0
          const val3 = v3 ?? 0
          const val4 = v4 ?? 0
          
          const divisor = (v4 !== null) ? 4 : 3
          const soma = val1 + val2 + val3 + (v4 !== null ? val4 : 0)
          return parseFloat((soma / divisor).toFixed(1))
        }

        const m1 = parseUnidade(localN1)
        const m2 = parseUnidade(localN2)
        const m3 = parseUnidade(localN3)

        const mediasValidas = [m1, m2, m3].filter((m): m is number => m !== null)
        const mediaFinal = mediasValidas.length === 0 
          ? null 
          : parseFloat((mediasValidas.reduce((a, b) => a + b, 0) / mediasValidas.length).toFixed(1))

        const todasUnidades = m1 !== null && m2 !== null && m3 !== null
        const isElegivelRec = todasUnidades && mediaFinal !== null && mediaFinal < 5.0

        const notaRec = localRec.nota !== null && localRec.nota !== '' ? Number(localRec.nota) : null

        let mediaPosRec = mediaFinal
        if (mediaFinal !== null && todasUnidades && mediaFinal < 5.0) {
          if (notaRec !== null) {
            mediaPosRec = notaRec
          }
        }

        let situacao = 'Cursando'
        if (mediaFinal === null) {
          situacao = 'Sem Notas'
        } else if (!todasUnidades) {
          situacao = 'Cursando'
        } else if (mediaFinal >= 5.0) {
          situacao = 'Aprovado'
        } else if (notaRec === null) {
          situacao = 'Em Recuperação'
        } else {
          situacao = notaRec >= 5.0 ? 'Aprovado (Rec)' : 'Reprovado'
        }

        res[keyPrefix] = {
          m1,
          m2,
          m3,
          mediaFinal,
          mediaPosRec,
          situacao,
          todasUnidades,
          isElegivelRec
        }
      })
    })

    return res
  }, [alunos, materias, notasState, recuperacoesState, notasServidor, calculosServidorState])

  const handleSalvarNotas = async (materiaId: string) => {
    if (!escolaAtivaId) return
    const unidade = unidadesAtivas[materiaId] || 1
    
    if (isMounted.current) {
      setSavingNotas(prev => ({ ...prev, [materiaId]: true }))
    }

    const oldData = notasServidor
    if (oldData) {
      const newNotasMap = { ...oldData.notasMap, ...notasState }
      const newRecMap = { ...oldData.recMap, ...recuperacoesState }
      mutateNotasServidor({ ...oldData, notasMap: newNotasMap, recMap: newRecMap }, false)
    }

    try {
      const upserts = alunos.map(aluno => {
        const key = `${aluno.id}_${materiaId}_${unidade}`
        const n = notasState[key] || { nota1: null, nota2: null, nota3: null, nota4: null }
        return {
          aluno_id: aluno.id,
          turma_id: turma.id,
          materia_id: materiaId,
          escola_id: escolaAtivaId ?? '',
          unidade: unidade,
          nota1: n.nota1 !== null && n.nota1 !== '' ? Number(n.nota1) : null,
          nota2: n.nota2 !== null && n.nota2 !== '' ? Number(n.nota2) : null,
          nota3: n.nota3 !== null && n.nota3 !== '' ? Number(n.nota3) : null,
          nota4: n.nota4 !== null && n.nota4 !== '' ? Number(n.nota4) : null
        }
      })

      const { error } = await supabase
        .from('notas')
        .upsert(upserts, { onConflict: 'aluno_id, materia_id, unidade' })

      if (error) throw error

      const recUpserts: any[] = []
      const recDeletes: string[] = []

      alunos.forEach(aluno => {
        const key = `${aluno.id}_${materiaId}`
        const rec = recuperacoesState[key]
        const calc = calculosNotas[key] ?? defaultCalculos
        const todasUnidades = calc.todasUnidades
        const mediaFinal = calc.mediaFinal

        // Salva recuperação se o aluno for de fato elegível.
        // Se a nota foi limpa ou o aluno não é mais elegível (ex: a média subiu), remove do banco.
        if (rec && rec.nota !== null && rec.nota !== '' && todasUnidades && mediaFinal !== null && mediaFinal < 5.0) {
          recUpserts.push({
            aluno_id: aluno.id,
            turma_id: turma.id,
            materia_id: materiaId,
            escola_id: escolaAtivaId ?? '',
            nota: Number(rec.nota)
          })
        } else {
          recDeletes.push(aluno.id)
        }
      })

      if (recUpserts.length > 0) {
        const { error: recError } = await supabase
          .from('recuperacoes_finais')
          .upsert(recUpserts, { onConflict: 'aluno_id, materia_id' })
        if (recError) throw recError
      }

      if (recDeletes.length > 0) {
        const { error: delError } = await supabase
          .from('recuperacoes_finais')
          .delete()
          .eq('turma_id', turma.id)
          .eq('materia_id', materiaId)
          .in('aluno_id', recDeletes)
        if (delError) throw delError
      }

      toast.success('Notas salvas com sucesso!')
      mutateNotasServidor()
    } catch (err: any) {
      console.error('Erro ao salvar notas/recuperações:', err)
      toast.error('Erro ao salvar notas: ' + err.message)
      if (oldData) mutateNotasServidor(oldData, false)
    } finally {
      if (isMounted.current) {
        setSavingNotas(prev => ({ ...prev, [materiaId]: false }))
      }
    }
  }

  return {
    notasState,
    recuperacoesState,
    unidadesAtivas,
    setUnidadesAtivas,
    savingNotas,
    calculosNotas,
    defaultCalculos,
    handleNotaChange,
    handleRecuperacaoChange,
    handleSalvarNotas,
    mutateNotasServidor
  }
}
