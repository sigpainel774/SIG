/**
 * Utilitário Centralizado de Datas e Horários - Fuso Horário de Brasília (America/Sao_Paulo / UTC-3)
 * 
 * Garante consistência de timezone em todo o sistema SIG, evitando o "Bug das 21h"
 * (virada de dia prematura por conversão UTC ingênua) e o "Bug do Aniversário"
 * (retrocesso de 1 dia ao converter strings YYYY-MM-DD com new Date()).
 */

export const TIMEZONE_BRASILIA = 'America/Sao_Paulo'

/**
 * Retorna a data atual no fuso de Brasília no formato ISO 'YYYY-MM-DD'.
 * Seguro contra virada prematura de dia entre 21h00 e 23h59.
 */
export function getHojeBrasilia(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE_BRASILIA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/**
 * Retorna o ano atual no fuso de Brasília (como número).
 */
export function getAnoAtualBrasilia(): number {
  const dataStr = getHojeBrasilia()
  return parseInt(dataStr.split('-')[0], 10)
}

/**
 * Retorna a hora, minuto, dia da semana e total de minutos desde a meia-noite
 * calculados estritamente sob o fuso horário oficial de Brasília.
 * Ideal para Session Timeout Watcher e validação de turnos de aula.
 */
export function getHoraMinutoBrasilia(date: Date = new Date()): {
  horas: number
  minutos: number
  diaSemana: number
  totalMinutos: number
  horaFormatada: string
} {
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: TIMEZONE_BRASILIA,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(date)
  let horas = 0
  let minutos = 0

  for (const part of parts) {
    if (part.type === 'hour') horas = parseInt(part.value, 10)
    if (part.type === 'minute') minutos = parseInt(part.value, 10)
  }

  // Obter o dia da semana no fuso de Brasília
  const weekdayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE_BRASILIA,
    weekday: 'short',
  })
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }
  const weekdayStr = weekdayFormatter.format(date)
  const diaSemana = weekdayMap[weekdayStr] ?? date.getDay()

  const totalMinutos = horas * 60 + minutos
  const horaFormatada = `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`

  return {
    horas,
    minutos,
    diaSemana,
    totalMinutos,
    horaFormatada,
  }
}

/**
 * Retorna uma data relativa no fuso de Brasília no formato 'YYYY-MM-DD'.
 * Ex: getDataBrasiliaOffset(-7) -> data de 7 dias atrás.
 * Ex: getDataBrasiliaOffset(1) -> data de amanhã.
 */
export function getDataBrasiliaOffset(diasOffset: number, dataBaseStr?: string): string {
  let baseDate: Date
  if (dataBaseStr) {
    const [ano, mes, dia] = dataBaseStr.split('-').map((v) => parseInt(v, 10))
    baseDate = new Date(Date.UTC(ano, mes - 1, dia, 12, 0, 0))
  } else {
    baseDate = new Date()
  }

  // Desloca em milissegundos
  const targetDate = new Date(baseDate.getTime() + diasOffset * 24 * 60 * 60 * 1000)

  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE_BRASILIA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(targetDate)
}

/**
 * Retorna o primeiro dia do mês no fuso de Brasília ('YYYY-MM-01').
 * @param offsetMeses 0 = mês atual, -1 = mês anterior, 1 = próximo mês.
 */
export function getInicioMesBrasilia(offsetMeses: number = 0): string {
  const hoje = getHojeBrasilia()
  const [anoStr, mesStr] = hoje.split('-')
  let ano = parseInt(anoStr, 10)
  let mes = parseInt(mesStr, 10) + offsetMeses

  while (mes < 1) {
    mes += 12
    ano -= 1
  }
  while (mes > 12) {
    mes -= 12
    ano += 1
  }

  return `${ano}-${String(mes).padStart(2, '0')}-01`
}

/**
 * Retorna o último dia do mês no fuso de Brasília ('YYYY-MM-DD').
 */
export function getFimMesBrasilia(offsetMeses: number = 0): string {
  const inicio = getInicioMesBrasilia(offsetMeses)
  const [ano, mes] = inicio.split('-').map((v) => parseInt(v, 10))
  // Dia 0 do próximo mês pega o último dia do mês atual
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate()
  return `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`
}

/**
 * Formata uma data para exibição no padrão brasileiro ('DD/MM/AAAA').
 * Trata com segurança strings 'YYYY-MM-DD' puras sem causar retrocesso de 1 dia,
 * bem como ISO strings 'timestamptz'.
 */
export function formatarDataBrasilia(
  data: string | Date | null | undefined,
  fallback: string = '-'
): string {
  if (!data) return fallback

  try {
    // Se for string no formato YYYY-MM-DD (sem tempo)
    if (typeof data === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.trim())) {
      const [ano, mes, dia] = data.trim().split('-')
      return `${dia}/${mes}/${ano}`
    }

    // Se for Date ou ISO string completa
    const d = typeof data === 'string' ? new Date(data) : data
    if (isNaN(d.getTime())) return fallback

    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: TIMEZONE_BRASILIA,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d)
  } catch {
    return fallback
  }
}

/**
 * Formata um timestamp completo para exibição no padrão brasileiro com hora ('DD/MM/AAAA HH:mm').
 */
export function formatarDataHoraBrasilia(
  data: string | Date | null | undefined,
  fallback: string = '-'
): string {
  if (!data) return fallback

  try {
    const d = typeof data === 'string' ? new Date(data) : data
    if (isNaN(d.getTime())) return fallback

    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: TIMEZONE_BRASILIA,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d)
  } catch {
    return fallback
  }
}

/**
 * Formata para hora e minuto ('HH:mm') no fuso de Brasília.
 */
export function formatarHoraBrasilia(
  data: string | Date | null | undefined,
  fallback: string = '--:--'
): string {
  if (!data) return fallback

  try {
    const d = typeof data === 'string' ? new Date(data) : data
    if (isNaN(d.getTime())) return fallback

    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: TIMEZONE_BRASILIA,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d)
  } catch {
    return fallback
  }
}
