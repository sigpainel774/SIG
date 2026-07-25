import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const escolaId = searchParams.get('escolaId')
  let data = searchParams.get('data')

  if (!escolaId) {
    return NextResponse.json({ error: 'escolaId é obrigatório' }, { status: 400 })
  }

  // Se data não for informada, assume a data atual no fuso de Brasília
  if (!data) {
    data = new Intl.DateTimeFormat('fr-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
  }

  const supabase = await createClient()

  // Authenticate user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    // 1. Fetch active turmas in school
    const { data: turmas, error: turmasError } = await supabase
      .from('turmas')
      .select('id, nome, turno, ano_letivo')
      .eq('escola_id', escolaId)
      .is('deleted_at', null)
      .order('nome', { ascending: true })

    if (turmasError) throw turmasError

    const turmaIds = (turmas || []).map((t) => t.id)
    if (turmaIds.length === 0) {
      return NextResponse.json({
        data,
        escolaId,
        totalTurmas: 0,
        turmasComFrequencia: 0,
        totalPresencasGeral: 0,
        totalFaltasGeral: 0,
        percentualPresencaGeral: 0,
        turmas: [],
      })
    }

    // 2. Busca paralela otimizada de alunos (apenas turma_id), matérias e frequências escopadas
    const [alunosRes, materiasRes, freqRes] = await Promise.all([
      supabase
        .from('alunos')
        .select('turma_id')
        .eq('escola_id', escolaId)
        .in('turma_id', turmaIds)
        .is('deleted_at', null),

      supabase
        .from('materias')
        .select(`
          id,
          nome,
          turma_id,
          professor_id,
          funcionarios:professor_id (nome)
        `)
        .eq('escola_id', escolaId),

      supabase
        .from('frequencias')
        .select('id, turma_id, materia_id, aluno_id, presenca, created_at')
        .eq('escola_id', escolaId)
        .eq('data', data)
        .in('turma_id', turmaIds)
    ])

    if (alunosRes.error) throw alunosRes.error
    if (materiasRes.error) throw materiasRes.error
    if (freqRes.error) throw freqRes.error

    const alunosPorTurmaMap: Record<string, number> = {}
    alunosRes.data?.forEach((aluno) => {
      if (aluno.turma_id) {
        alunosPorTurmaMap[aluno.turma_id] = (alunosPorTurmaMap[aluno.turma_id] || 0) + 1
      }
    })

    const materias = materiasRes.data || []
    const materiasMap: Record<string, { id: string; nome: string; professorNome?: string | null; turma_id?: string | null }> = {}
    materiasRes.data?.forEach((m: any) => {
      const profNome = Array.isArray(m.funcionarios)
        ? m.funcionarios[0]?.nome
        : m.funcionarios?.nome
      materiasMap[m.id] = {
        id: m.id,
        nome: m.nome,
        professorNome: profNome ?? null,
        turma_id: m.turma_id ?? null,
      }
    })

    const frequencias = freqRes.data || []

    // Group frequency records by turma_id -> materia_id (or 'geral' if null)
    // Structure: { [turma_id]: { [materia_id || 'geral']: { presencas, faltas, presencaSet: Set<aluno_id>, created_at } } }
    const freqAgrupada: Record<
      string,
      Record<
        string,
        { presencas: number; faltas: number; alunosFreq: Set<string>; createdAt?: string }
      >
    > = {}

    frequencias?.forEach((f) => {
      const tId = f.turma_id
      const mKey = f.materia_id || 'geral'

      if (!freqAgrupada[tId]) {
        freqAgrupada[tId] = {}
      }
      if (!freqAgrupada[tId][mKey]) {
        freqAgrupada[tId][mKey] = { presencas: 0, faltas: 0, alunosFreq: new Set(), createdAt: f.created_at }
      }

      freqAgrupada[tId][mKey].alunosFreq.add(f.aluno_id)
      if (f.presenca) {
        freqAgrupada[tId][mKey].presencas += 1
      } else {
        freqAgrupada[tId][mKey].faltas += 1
      }
    })

    let totalPresencasGeral = 0
    let totalFaltasGeral = 0
    let turmasComFrequenciaCount = 0

    const turmasResultado = (turmas || []).map((turma) => {
      const totalAlunosTurma = alunosPorTurmaMap[turma.id] ?? 0
      const turmaFreqData = freqAgrupada[turma.id] || {}

      // Get materias linked to this turma specifically or from registered frequency
      const materiasDaTurma = (materias || []).filter((m) => m.turma_id === turma.id)
      const materiaIdsRegistradas = Object.keys(turmaFreqData)

      // Collect unique materia entries for this turma
      const materiaEntriesMap = new Map<string, { id: string | null; nome: string; professorNome?: string | null }>()

      // Add subjects assigned to turma
      materiasDaTurma.forEach((m: any) => {
        const profNome = Array.isArray(m.funcionarios)
          ? m.funcionarios[0]?.nome
          : m.funcionarios?.nome
        materiaEntriesMap.set(m.id, {
          id: m.id,
          nome: m.nome,
          professorNome: profNome ?? null,
        })
      })

      // Add subjects from frequency records that might not be directly tied to turma_id in materias table
      materiaIdsRegistradas.forEach((mId) => {
        if (mId === 'geral') {
          if (!materiaEntriesMap.has('geral')) {
            materiaEntriesMap.set('geral', {
              id: null,
              nome: 'Frequência Geral (Diária)',
              professorNome: null,
            })
          }
        } else if (materiasMap[mId] && !materiaEntriesMap.has(mId)) {
          materiaEntriesMap.set(mId, materiasMap[mId])
        }
      })

      // If no subjects found at all, but turma exists, provide default empty list
      const materiasList = Array.from(materiaEntriesMap.values())

      let materiasLancadasCount = 0
      const materiasDetalhes = materiasList.map((mat) => {
        const mKey = mat.id || 'geral'
        const freqInfo = turmaFreqData[mKey]

        if (freqInfo) {
          materiasLancadasCount++
          totalPresencasGeral += freqInfo.presencas
          totalFaltasGeral += freqInfo.faltas

          const totalAlunosFreq = freqInfo.alunosFreq.size || (freqInfo.presencas + freqInfo.faltas)
          const pctPres = totalAlunosFreq > 0 ? Math.round((freqInfo.presencas / totalAlunosFreq) * 100) : 0

          let horarioFormatado: string | null = null
          if (freqInfo.createdAt) {
            try {
              const d = new Date(freqInfo.createdAt)
              horarioFormatado = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            } catch {
              horarioFormatado = null
            }
          }

          return {
            materiaId: mat.id,
            materiaNome: mat.nome,
            professorNome: mat.professorNome ?? null,
            totalAlunosFrequencia: totalAlunosFreq,
            presencas: freqInfo.presencas,
            faltas: freqInfo.faltas,
            percentualPresenca: pctPres,
            status: 'lancada' as const,
            horarioLancamento: horarioFormatado,
          }
        } else {
          return {
            materiaId: mat.id,
            materiaNome: mat.nome,
            professorNome: mat.professorNome ?? null,
            totalAlunosFrequencia: totalAlunosTurma,
            presencas: 0,
            faltas: 0,
            percentualPresenca: 0,
            status: 'pendente' as const,
            horarioLancamento: null,
          }
        }
      })

      const temFrequenciaNaTurma = Object.keys(turmaFreqData).length > 0
      if (temFrequenciaNaTurma) {
        turmasComFrequenciaCount++
      }

      let statusTurma: 'completa' | 'parcial' | 'pendente' = 'pendente'
      if (materiasLancadasCount > 0) {
        if (materiasList.length > 0 && materiasLancadasCount >= materiasList.length) {
          statusTurma = 'completa'
        } else {
          statusTurma = 'parcial'
        }
      }

      return {
        turmaId: turma.id,
        turmaNome: turma.nome,
        turno: turma.turno ?? null,
        totalAlunos: totalAlunosTurma,
        statusTurma,
        materiasLancadasCount,
        materiasTotalCount: materiasList.length,
        materias: materiasDetalhes,
      }
    })

    const totalRegistros = totalPresencasGeral + totalFaltasGeral
    const percentualPresencaGeral = totalRegistros > 0 ? Math.round((totalPresencasGeral / totalRegistros) * 100) : 0

    return NextResponse.json({
      data,
      escolaId,
      totalTurmas: turmas.length,
      turmasComFrequencia: turmasComFrequenciaCount,
      totalPresencasGeral,
      totalFaltasGeral,
      percentualPresencaGeral,
      turmas: turmasResultado,
    })
  } catch (err) {
    console.error('[api/home/frequencia-detalhes] Erro ao buscar detalhamento de frequência:', err)
    return NextResponse.json(
      { error: 'Erro interno ao buscar detalhamento de frequência' },
      { status: 500 }
    )
  }
}
