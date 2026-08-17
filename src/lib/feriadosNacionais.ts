/**
 * Utilitário de Feriados Oficiais e Cálculo Astronômico/Computacional da Páscoa
 * Algoritmo de Meeus/Jones/Butcher (Anonimo Gregoriano)
 */

export interface EventoCalendarioPadrao {
  data: string // YYYY-MM-DD
  tipo: 'feriado_nacional' | 'feriado_estadual' | 'feriado_municipal' | 'ponto_facultativo' | 'recesso_escolar' | 'sabado_letivo' | 'dia_letivo_especial'
  descricao: string
  letivo: boolean
}

/**
 * Calcula a data da Páscoa para determinado ano no calendário Gregoriano
 */
export function calcularDataPascoa(ano: number): { mes: number; dia: number } {
  const a = ano % 19
  const b = Math.floor(ano / 100)
  const c = ano % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mes = Math.floor((h + l - 7 * m + 114) / 31)
  const dia = ((h + l - 7 * m + 114) % 31) + 1

  return { mes, dia }
}

/**
 * Formata um objeto de data em string YYYY-MM-DD segura (sem timezone)
 */
export function formatarDataISO(ano: number, mes: number, dia: number): string {
  const m = String(mes).padStart(2, '0')
  const d = String(dia).padStart(2, '0')
  return `${ano}-${m}-${d}`
}

/**
 * Adiciona ou subtrai dias a partir de uma data ano/mes/dia
 */
function adicionarDias(ano: number, mes: number, dia: number, diasOffset: number): string {
  // Usar UTC date para evitar shift de horário de verão
  const data = new Date(Date.UTC(ano, mes - 1, dia))
  data.setUTCDate(data.getUTCDate() + diasOffset)
  const anoFinal = data.getUTCFullYear()
  const mesFinal = data.getUTCMonth() + 1
  const diaFinal = data.getUTCDate()
  return formatarDataISO(anoFinal, mesFinal, diaFinal)
}

/**
 * Gera a lista padrão de feriados nacionais e pontos facultativos para um ano
 */
export function obterFeriadosPadraoAno(ano: number): EventoCalendarioPadrao[] {
  const pascoa = calcularDataPascoa(ano)

  const dataCarnavalSegunda = adicionarDias(ano, pascoa.mes, pascoa.dia, -48)
  const dataCarnavalTerca = adicionarDias(ano, pascoa.mes, pascoa.dia, -47)
  const dataCinzas = adicionarDias(ano, pascoa.mes, pascoa.dia, -46)
  const dataSextaSanta = adicionarDias(ano, pascoa.mes, pascoa.dia, -2)
  const dataCorpusChristi = adicionarDias(ano, pascoa.mes, pascoa.dia, 60)

  return [
    // Feriados Fixos Nacionais
    { data: `${ano}-01-01`, tipo: 'feriado_nacional', descricao: 'Confraternização Universal (Ano Novo)', letivo: false },
    { data: `${ano}-04-21`, tipo: 'feriado_nacional', descricao: 'Tiradentes', letivo: false },
    { data: `${ano}-05-01`, tipo: 'feriado_nacional', descricao: 'Dia do Trabalho', letivo: false },
    { data: `${ano}-09-07`, tipo: 'feriado_nacional', descricao: 'Independência do Brasil', letivo: false },
    { data: `${ano}-10-12`, tipo: 'feriado_nacional', descricao: 'Nossa Senhora Aparecida (Padroeira do Brasil)', letivo: false },
    { data: `${ano}-11-02`, tipo: 'feriado_nacional', descricao: 'Finados', letivo: false },
    { data: `${ano}-11-15`, tipo: 'feriado_nacional', descricao: 'Proclamação da República', letivo: false },
    { data: `${ano}-11-20`, tipo: 'feriado_nacional', descricao: 'Dia Nacional de Zumbi e da Consciência Negra', letivo: false },
    { data: `${ano}-12-25`, tipo: 'feriado_nacional', descricao: 'Natal', letivo: false },

    // Feriados Móveis Nacionais
    { data: dataSextaSanta, tipo: 'feriado_nacional', descricao: 'Sexta-feira Santa (Paixão de Cristo)', letivo: false },

    // Pontos Facultativos Tradicionais
    { data: dataCarnavalSegunda, tipo: 'ponto_facultativo', descricao: 'Carnaval (Segunda-feira)', letivo: false },
    { data: dataCarnavalTerca, tipo: 'ponto_facultativo', descricao: 'Carnaval (Terça-feira)', letivo: false },
    { data: dataCinzas, tipo: 'ponto_facultativo', descricao: 'Quarta-feira de Cinzas', letivo: false },
    { data: dataCorpusChristi, tipo: 'ponto_facultativo', descricao: 'Corpus Christi', letivo: false },
    { data: `${ano}-10-28`, tipo: 'ponto_facultativo', descricao: 'Dia do Servidor Público', letivo: false },

    // Feriado Estadual Padrão (Bahia)
    { data: `${ano}-07-02`, tipo: 'feriado_estadual', descricao: 'Independência da Bahia (2 de Julho)', letivo: false }
  ]
}

/**
 * Utilitário para formatar datas no padrão brasileiro DD/MM/AAAA sem sofrer distorção de fuso
 */
export function formatarDataBR(dataStr?: string | null): string {
  if (!dataStr) return '—'
  const partes = dataStr.split('T')[0].split('-')
  if (partes.length !== 3) return dataStr
  const [ano, mes, dia] = partes
  return `${dia}/${mes}/${ano}`
}

/**
 * Utilitário para converter objeto Date para string YYYY-MM-DD pura
 */
export function toLocalDateString(d: Date): string {
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}
