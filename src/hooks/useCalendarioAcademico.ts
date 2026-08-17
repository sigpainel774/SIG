'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { toast } from 'sonner'
import {
  obterFeriadosPadraoAno,
  formatarDataBR,
  EventoCalendarioPadrao,
  toLocalDateString
} from '@/lib/feriadosNacionais'

export type TipoDiaCalendario =
  | 'letivo_regular'
  | 'fim_de_semana'
  | 'feriado_nacional'
  | 'feriado_estadual'
  | 'feriado_municipal'
  | 'ponto_facultativo'
  | 'recesso_escolar'
  | 'sabado_letivo'
  | 'dia_letivo_especial'
  | 'conselho_classe'
  | 'planejamento_pedagogico'

export interface EventoCalendario {
  id?: string
  data: string // YYYY-MM-DD
  tipo: TipoDiaCalendario
  descricao: string
  letivo: boolean
}

export interface CalendarioAcademicoDados {
  id?: string
  secretaria_id: string
  ano_letivo: number
  trimestre1_inicio: string | null
  trimestre1_fim: string | null
  trimestre2_inicio: string | null
  trimestre2_fim: string | null
  trimestre3_inicio: string | null
  trimestre3_fim: string | null
  recesso_junino_inicio: string | null
  recesso_junino_fim: string | null
  recesso_fim_ano_inicio: string | null
  recesso_fim_ano_fim: string | null
  meta_dias_letivos: number
  ativo: boolean
  publicado: boolean
}

export interface HistoricoItem {
  id: string
  ano_letivo: number
  acao: string
  descricao_alteracao: string
  detalhes_json: any
  alterado_por_nome: string | null
  created_at: string
}

interface UseCalendarioAcademicoProps {
  secretariaId?: string
  anoInicial?: number
}

export function useCalendarioAcademico({
  secretariaId,
  anoInicial = new Date().getFullYear()
}: UseCalendarioAcademicoProps) {
  const supabase = createClient() as any
  const { funcionario } = useAuthStore()

  const [anoLetivo, setAnoLetivo] = useState<number>(anoInicial)
  const [loading, setLoading] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false)

  const [dadosCalendario, setDadosCalendario] = useState<CalendarioAcademicoDados>({
    secretaria_id: secretariaId ?? '',
    ano_letivo: anoInicial,
    trimestre1_inicio: `${anoInicial}-02-05`,
    trimestre1_fim: `${anoInicial}-05-08`,
    trimestre2_inicio: `${anoInicial}-05-18`,
    trimestre2_fim: `${anoInicial}-08-28`,
    trimestre3_inicio: `${anoInicial}-09-08`,
    trimestre3_fim: `${anoInicial}-12-18`,
    recesso_junino_inicio: `${anoInicial}-06-20`,
    recesso_junino_fim: `${anoInicial}-07-05`,
    recesso_fim_ano_inicio: `${anoInicial}-12-22`,
    recesso_fim_ano_fim: `${anoInicial}-12-31`,
    meta_dias_letivos: 200,
    ativo: true,
    publicado: true
  })

  // Mapa de eventos indexado por data YYYY-MM-DD
  const [eventosMap, setEventosMap] = useState<Map<string, EventoCalendario>>(new Map())
  const [historico, setHistorico] = useState<HistoricoItem[]>([])
  const [loadingHistorico, setLoadingHistorico] = useState<boolean>(false)

  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  // Carrega os dados do ano selecionado
  const carregarCalendario = useCallback(async (ano: number, secId?: string) => {
    if (!secId) return
    setLoading(true)

    try {
      // 1. Busca registro do calendário anual
      const { data: calData, error: calError } = await supabase
        .from('calendarios_academicos')
        .select('*')
        .eq('secretaria_id', secId)
        .eq('ano_letivo', ano)
        .maybeSingle()

      if (calError && calError.code !== 'PGRST116') {
        console.error('Erro ao buscar calendário:', calError)
      }

      let calId = calData?.id

      if (calData) {
        setDadosCalendario({
          id: calData.id,
          secretaria_id: calData.secretaria_id,
          ano_letivo: calData.ano_letivo,
          trimestre1_inicio: calData.trimestre1_inicio,
          trimestre1_fim: calData.trimestre1_fim,
          trimestre2_inicio: calData.trimestre2_inicio,
          trimestre2_fim: calData.trimestre2_fim,
          trimestre3_inicio: calData.trimestre3_inicio,
          trimestre3_fim: calData.trimestre3_fim,
          recesso_junino_inicio: calData.recesso_junino_inicio,
          recesso_junino_fim: calData.recesso_junino_fim,
          recesso_fim_ano_inicio: calData.recesso_fim_ano_inicio,
          recesso_fim_ano_fim: calData.recesso_fim_ano_fim,
          meta_dias_letivos: calData.meta_dias_letivos ?? 200,
          ativo: calData.ativo ?? true,
          publicado: calData.publicado ?? true
        })
      } else {
        // Inicializa defaults para o ano
        setDadosCalendario({
          secretaria_id: secId,
          ano_letivo: ano,
          trimestre1_inicio: `${ano}-02-05`,
          trimestre1_fim: `${ano}-05-08`,
          trimestre2_inicio: `${ano}-05-18`,
          trimestre2_fim: `${ano}-08-28`,
          trimestre3_inicio: `${ano}-09-08`,
          trimestre3_fim: `${ano}-12-18`,
          recesso_junino_inicio: `${ano}-06-20`,
          recesso_junino_fim: `${ano}-07-05`,
          recesso_fim_ano_inicio: `${ano}-12-22`,
          recesso_fim_ano_fim: `${ano}-12-31`,
          meta_dias_letivos: 200,
          ativo: true,
          publicado: true
        })
      }

      // 2. Busca eventos cadastrados
      const novoMap = new Map<string, EventoCalendario>()

      if (calId) {
        const { data: eventosData } = await supabase
          .from('calendario_eventos')
          .select('*')
          .eq('calendario_id', calId)

        if (eventosData && eventosData.length > 0) {
          eventosData.forEach((ev: any) => {
            novoMap.set(ev.data, {
              id: ev.id,
              data: ev.data,
              tipo: ev.tipo,
              descricao: ev.descricao,
              letivo: ev.letivo
            })
          })
        } else {
          // Se não houver eventos cadastrados ainda no banco, pré-popula com feriados nacionais
          const feriadosPadrao = obterFeriadosPadraoAno(ano)
          feriadosPadrao.forEach((fp) => {
            novoMap.set(fp.data, {
              data: fp.data,
              tipo: fp.tipo,
              descricao: fp.descricao,
              letivo: fp.letivo
            })
          })
        }
      } else {
        // Ano novo: pré-popula automaticamente com feriados oficiais
        const feriadosPadrao = obterFeriadosPadraoAno(ano)
        feriadosPadrao.forEach((fp) => {
          novoMap.set(fp.data, {
            data: fp.data,
            tipo: fp.tipo,
            descricao: fp.descricao,
            letivo: fp.letivo
          })
        })
      }

      if (isMounted.current) {
        setEventosMap(novoMap)
        setHasUnsavedChanges(false)
      }
    } catch (err) {
      console.error('Erro ao carregar calendário acadêmico:', err)
      toast.error('Erro ao sincronizar dados do calendário.')
    } finally {
      if (isMounted.current) {
        setLoading(false)
      }
    }
  }, [supabase])

  // Carrega histórico de alterações
  const carregarHistorico = useCallback(async () => {
    if (!dadosCalendario.id) {
      setHistorico([])
      return
    }
    setLoadingHistorico(true)
    try {
      const { data, error } = await supabase
        .from('calendario_historico')
        .select('*')
        .eq('calendario_id', dadosCalendario.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Erro ao buscar histórico:', error)
      } else if (isMounted.current) {
        setHistorico(data || [])
      }
    } catch (e) {
      console.error('Falha ao obter histórico:', e)
    } finally {
      if (isMounted.current) {
        setLoadingHistorico(false)
      }
    }
  }, [supabase, dadosCalendario.id])

  useEffect(() => {
    if (secretariaId) {
      carregarCalendario(anoLetivo, secretariaId)
    }
  }, [anoLetivo, secretariaId, carregarCalendario])

  // Atualiza um campo de trimestre ou recesso
  const setCampoCalendario = (campo: keyof CalendarioAcademicoDados, valor: any) => {
    setDadosCalendario((prev) => ({
      ...prev,
      [campo]: valor
    }))
    setHasUnsavedChanges(true)
  }

  // Define ou altera o tipo de um dia específico
  const definirTipoDia = (data: string, tipo: TipoDiaCalendario, descricao: string, letivo: boolean) => {
    setEventosMap((prev) => {
      const next = new Map(prev)
      if (tipo === 'letivo_regular' || tipo === 'fim_de_semana') {
        // Remove evento customizado para voltar ao estado padrão
        next.delete(data)
      } else {
        next.set(data, {
          data,
          tipo,
          descricao,
          letivo
        })
      }
      return next
    })
    setHasUnsavedChanges(true)
  }

  // Remove evento de um dia
  const removerEventoDia = (data: string) => {
    setEventosMap((prev) => {
      const next = new Map(prev)
      next.delete(data)
      return next
    })
    setHasUnsavedChanges(true)
  }

  // Adiciona ponto facultativo rápido
  const adicionarPontoFacultativoRapido = (data: string, descricao: string) => {
    definirTipoDia(data, 'ponto_facultativo', descricao, false)
  }

  // Lógica de classificação de cada dia do ano
  const classificarDia = useCallback(
    (dataStr: string): { tipo: TipoDiaCalendario; descricao: string; letivo: boolean; emTrimestre: number | null } => {
      const eventoCustom = eventosMap.get(dataStr)

      // Identificar dia da semana (0 = Domingo, 6 = Sábado)
      const partes = dataStr.split('-')
      const d = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]))
      const diaSemana = d.getDay()
      const isFimDeSemana = diaSemana === 0 || diaSemana === 6

      // Verificar se a data está dentro de algum trimestre
      let emTrimestre: number | null = null
      const {
        trimestre1_inicio,
        trimestre1_fim,
        trimestre2_inicio,
        trimestre2_fim,
        trimestre3_inicio,
        trimestre3_fim,
        recesso_junino_inicio,
        recesso_junino_fim,
        recesso_fim_ano_inicio,
        recesso_fim_ano_fim
      } = dadosCalendario

      if (trimestre1_inicio && trimestre1_fim && dataStr >= trimestre1_inicio && dataStr <= trimestre1_fim) {
        emTrimestre = 1
      } else if (trimestre2_inicio && trimestre2_fim && dataStr >= trimestre2_inicio && dataStr <= trimestre2_fim) {
        emTrimestre = 2
      } else if (trimestre3_inicio && trimestre3_fim && dataStr >= trimestre3_inicio && dataStr <= trimestre3_fim) {
        emTrimestre = 3
      }

      // Verificar se cai em recesso junino ou fim de ano
      const isRecessoJunino = recesso_junino_inicio && recesso_junino_fim && dataStr >= recesso_junino_inicio && dataStr <= recesso_junino_fim
      const isRecessoFimAno = recesso_fim_ano_inicio && recesso_fim_ano_fim && dataStr >= recesso_fim_ano_inicio && dataStr <= recesso_fim_ano_fim

      if (eventoCustom) {
        return {
          tipo: eventoCustom.tipo,
          descricao: eventoCustom.descricao,
          letivo: eventoCustom.letivo,
          emTrimestre
        }
      }

      if (isRecessoJunino || isRecessoFimAno) {
        return {
          tipo: 'recesso_escolar',
          descricao: isRecessoJunino ? 'Recesso Escolar Junino' : 'Recesso de Fim de Ano / Férias',
          letivo: false,
          emTrimestre: null
        }
      }

      if (isFimDeSemana) {
        return {
          tipo: 'fim_de_semana',
          descricao: diaSemana === 0 ? 'Domingo' : 'Sábado',
          letivo: false,
          emTrimestre
        }
      }

      // Dia útil regular (segunda a sexta)
      const ehLetivo = emTrimestre !== null
      return {
        tipo: 'letivo_regular',
        descricao: ehLetivo ? `Dia Letivo Regular (${emTrimestre}º Trimestre)` : 'Dia Não Letivo (Fora do Período Letivo)',
        letivo: ehLetivo,
        emTrimestre
      }
    },
    [eventosMap, dadosCalendario]
  )

  // Cálculo cumulativo dos dias letivos
  const calculoDiasLetivos = useMemo(() => {
    let t1 = 0
    let t2 = 0
    let t3 = 0
    let totalSabadosLetivos = 0
    let totalFeriadosEmDiasUteis = 0
    let totalPontosFacultativos = 0

    // Itera por todos os dias do ano
    const inicioAno = new Date(anoLetivo, 0, 1)
    const fimAno = new Date(anoLetivo, 11, 31)
    const cur = new Date(inicioAno)

    while (cur <= fimAno) {
      const dataStr = toLocalDateString(cur)
      const info = classificarDia(dataStr)

      if (info.tipo === 'sabado_letivo' || (info.letivo && (cur.getDay() === 0 || cur.getDay() === 6))) {
        totalSabadosLetivos++
      }
      if (
        (info.tipo === 'feriado_nacional' || info.tipo === 'feriado_estadual' || info.tipo === 'feriado_municipal') &&
        cur.getDay() >= 1 &&
        cur.getDay() <= 5
      ) {
        totalFeriadosEmDiasUteis++
      }
      if (info.tipo === 'ponto_facultativo' && cur.getDay() >= 1 && cur.getDay() <= 5) {
        totalPontosFacultativos++
      }

      if (info.letivo && info.emTrimestre) {
        if (info.emTrimestre === 1) t1++
        else if (info.emTrimestre === 2) t2++
        else if (info.emTrimestre === 3) t3++
      }

      cur.setDate(cur.getDate() + 1)
    }

    const total = t1 + t2 + t3
    const meta = dadosCalendario.meta_dias_letivos || 200
    const atingiuMeta = total >= meta

    return {
      t1,
      t2,
      t3,
      total,
      meta,
      atingiuMeta,
      totalSabadosLetivos,
      totalFeriadosEmDiasUteis,
      totalPontosFacultativos
    }
  }, [anoLetivo, classificarDia, dadosCalendario.meta_dias_letivos])

  // Salvar calendário completo no Supabase com auditoria
  const salvarCalendario = async (justificativa?: string) => {
    if (!secretariaId) {
      toast.error('Secretaria de Educação não informada.')
      return false
    }

    setSaving(true)
    try {
      // 1. Upsert em calendarios_academicos
      const payloadCal = {
        secretaria_id: secretariaId,
        ano_letivo: anoLetivo,
        trimestre1_inicio: dadosCalendario.trimestre1_inicio,
        trimestre1_fim: dadosCalendario.trimestre1_fim,
        trimestre2_inicio: dadosCalendario.trimestre2_inicio,
        trimestre2_fim: dadosCalendario.trimestre2_fim,
        trimestre3_inicio: dadosCalendario.trimestre3_inicio,
        trimestre3_fim: dadosCalendario.trimestre3_fim,
        recesso_junino_inicio: dadosCalendario.recesso_junino_inicio,
        recesso_junino_fim: dadosCalendario.recesso_junino_fim,
        recesso_fim_ano_inicio: dadosCalendario.recesso_fim_ano_inicio,
        recesso_fim_ano_fim: dadosCalendario.recesso_fim_ano_fim,
        meta_dias_letivos: dadosCalendario.meta_dias_letivos ?? 200,
        ativo: dadosCalendario.ativo ?? true,
        publicado: dadosCalendario.publicado ?? true,
        updated_by: funcionario?.id ?? null,
        updated_at: new Date().toISOString()
      }

      const { data: savedCal, error: errCal } = await supabase
        .from('calendarios_academicos')
        .upsert(payloadCal, { onConflict: 'secretaria_id,ano_letivo' })
        .select()
        .single()

      if (errCal || !savedCal) {
        throw new Error(errCal?.message || 'Erro ao persistir calendário.')
      }

      const calId = savedCal.id

      // 2. Sincronizar eventos (Delete e Re-insert em batch para atomicidade)
      await supabase.from('calendario_eventos').delete().eq('calendario_id', calId)

      const eventosParaInserir: any[] = []
      eventosMap.forEach((ev) => {
        eventosParaInserir.push({
          calendario_id: calId,
          ano_letivo: anoLetivo,
          data: ev.data,
          tipo: ev.tipo,
          descricao: ev.descricao,
          letivo: ev.letivo,
          criado_por: funcionario?.id ?? null
        })
      })

      if (eventosParaInserir.length > 0) {
        const { error: errEv } = await supabase.from('calendario_eventos').insert(eventosParaInserir)
        if (errEv) throw new Error(errEv.message)
      }

      // 3. Registrar Histórico de Alteração (Audit Trail)
      const descHistorico = justificativa
        ? `Atualização do Calendário ${anoLetivo}: ${justificativa}`
        : `Atualização geral do Calendário ${anoLetivo} (${calculoDiasLetivos.total} dias letivos contabilizados).`

      await supabase.from('calendario_historico').insert({
        calendario_id: calId,
        ano_letivo: anoLetivo,
        acao: dadosCalendario.id ? 'edicao_geral' : 'criacao',
        descricao_alteracao: descHistorico,
        detalhes_json: {
          dias_letivos_total: calculoDiasLetivos.total,
          t1_dias: calculoDiasLetivos.t1,
          t2_dias: calculoDiasLetivos.t2,
          t3_dias: calculoDiasLetivos.t3,
          total_eventos: eventosParaInserir.length,
          trimestres: {
            t1: [dadosCalendario.trimestre1_inicio, dadosCalendario.trimestre1_fim],
            t2: [dadosCalendario.trimestre2_inicio, dadosCalendario.trimestre2_fim],
            t3: [dadosCalendario.trimestre3_inicio, dadosCalendario.trimestre3_fim]
          }
        },
        alterado_por_id: funcionario?.id ?? null,
        alterado_por_nome: funcionario?.nome ?? 'Administrador da Secretaria'
      })

      setDadosCalendario((prev) => ({ ...prev, id: calId }))
      setHasUnsavedChanges(false)
      toast.success(`Calendário Acadêmico ${anoLetivo} salvo com sucesso!`)
      carregarHistorico()
      return true
    } catch (err: any) {
      console.error('Falha ao salvar calendário:', err)
      toast.error(`Erro ao salvar calendário: ${err.message}`)
      return false
    } finally {
      setSaving(false)
    }
  }

  return {
    anoLetivo,
    setAnoLetivo,
    loading,
    saving,
    hasUnsavedChanges,
    dadosCalendario,
    setCampoCalendario,
    eventosMap,
    definirTipoDia,
    removerEventoDia,
    adicionarPontoFacultativoRapido,
    classificarDia,
    calculoDiasLetivos,
    salvarCalendario,
    historico,
    loadingHistorico,
    carregarHistorico,
    carregarCalendario
  }
}
