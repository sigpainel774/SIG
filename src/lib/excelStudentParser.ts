import * as XLSX from 'xlsx'

export interface ExtractedExcelStudentData {
  id: string // ID temporário no cliente (ex: 'sheet_0_row_8')
  sheetName: string
  rowIndex: number // Linha no Excel (1-indexed, ex: 8)
  nome: string // Coluna B (B8...)
  data_nascimento?: string // Coluna C (C8...) - YYYY-MM-DD
  inep?: string // Coluna D (D8...) - ID Censo Escolar
  cpf?: string // Coluna E (E8...)
  cor_raca?: string // Coluna F (F8...)
  cid?: string // Coluna G (G8...)
  nis?: string // Coluna H (H8...)
  cartao_sus?: string // Coluna I (I8...)
  telefone?: string // Coluna J (J8...)
  nome_pais?: string // Coluna K (K8...)
  endereco?: string // Coluna L (L8...)
}

export interface ExcelSheetGroup {
  sheetName: string
  students: ExtractedExcelStudentData[]
}

/**
 * Converte valor de data vindo do Excel (serial numérico, objeto Date ou string DD/MM/YYYY) para ISO YYYY-MM-DD.
 */
export function convertExcelDateToISO(val: any): string | undefined {
  if (val === undefined || val === null || val === '') return undefined

  // Caso 1: Objeto Date nativo
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return undefined
    return val.toISOString().split('T')[0]
  }

  // Caso 2: Serial Numérico do Excel (ex: 40983)
  if (typeof val === 'number') {
    if (isNaN(val) || val <= 0) return undefined
    // Época do Excel começa em 1899-12-30 (25569 dias antes da época Unix)
    const dateObj = new Date(Math.round((val - 25569) * 86400 * 1000))
    if (isNaN(dateObj.getTime())) return undefined
    return dateObj.toISOString().split('T')[0]
  }

  const strVal = String(val).trim()
  if (!strVal) return undefined

  // Caso 3: String DD/MM/YYYY ou DD-MM-YYYY (com suporte a hora opcional)
  const brMatch = strVal.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+.*)?$/)
  if (brMatch) {
    const day = brMatch[1].padStart(2, '0')
    const month = brMatch[2].padStart(2, '0')
    const year = brMatch[3]
    return `${year}-${month}-${day}`
  }

  // Caso 4: String YYYY-MM-DD (com suporte a hora opcional)
  const isoMatch = strVal.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:\s+.*)?$/)
  if (isoMatch) {
    const year = isoMatch[1]
    const month = isoMatch[2].padStart(2, '0')
    const day = isoMatch[3].padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  return undefined
}

/**
 * Limpa e formata CPF preservando zeros à esquerda quando o Excel removeu o primeiro dígito.
 */
export function sanitizeCPF(val: any): string | undefined {
  if (val === undefined || val === null || val === '') return undefined
  let digits = String(val).replace(/\D/g, '')
  if (!digits) return undefined

  // Se tiver 10 dígitos, é muito provável que o Excel removeu o zero inicial (ex: 012.345.678-90 -> 1234567890)
  if (digits.length === 10) {
    digits = digits.padStart(11, '0')
  }

  return digits
}

/**
 * Converte valor textual para string limpa.
 */
function cleanString(val: any): string | undefined {
  if (val === undefined || val === null) return undefined
  const str = String(val).trim()
  return str.length > 0 ? str : undefined
}

/**
 * Palavras-chave de cabeçalho para ignorar se a linha 8 for o próprio título da coluna
 */
const HEADER_KEYWORDS = [
  'NOME',
  'NOME DO ALUNO',
  'NOME COMPLETO',
  'NOME DO ESTUDANTE',
  'ALUNO',
  'STUDENT NAME',
  'NOME DA CRIANÇA'
]

/**
 * Lê uma planilha Excel (ArrayBuffer) e extrai os alunos de todas as pastas/abas a partir da linha 8 (B8).
 */
export function parseExcelStudentWorkbook(fileBuffer: ArrayBuffer): ExcelSheetGroup[] {
  const workbook = XLSX.read(fileBuffer, { type: 'array', cellDates: true })
  const result: ExcelSheetGroup[] = []

  for (let sIdx = 0; sIdx < workbook.SheetNames.length; sIdx++) {
    const sheetName = workbook.SheetNames[sIdx]
    const sheet = workbook.Sheets[sheetName]
    if (!sheet) continue

    // Converte a aba em matriz de células (header: 1 = array de arrays)
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: true, defval: '' })
    const sheetStudents: ExtractedExcelStudentData[] = []

    // Começa na linha 8 (índice 7 da matriz 0-based)
    const START_ROW_INDEX = 7

    for (let r = START_ROW_INDEX; r < rows.length; r++) {
      const row = rows[r]
      if (!row || !Array.isArray(row)) continue

      // Coluna B = index 1
      const rawNome = row[1]
      const nomeClean = cleanString(rawNome)

      // Se o Nome do Aluno (Coluna B) estiver vazio, ignora esta linha
      if (!nomeClean) continue

      // Se o Nome for um título de cabeçalho (ex: "NOME DO ALUNO"), ignora esta linha
      if (HEADER_KEYWORDS.includes(nomeClean.toUpperCase())) continue

      // Coluna C = index 2 (Data Nasc)
      const dataNascISO = convertExcelDateToISO(row[2])

      // Coluna D = index 3 (ID Censo Escolar / INEP)
      const inep = cleanString(row[3])

      // Coluna E = index 4 (CPF)
      const cpf = sanitizeCPF(row[4])

      // Coluna F = index 5 (Cor/Raça)
      const corRaca = cleanString(row[5])

      // Coluna G = index 6 (CID / Laudo / Deficiência)
      const cid = cleanString(row[6])

      // Coluna H = index 7 (NIS)
      const nis = cleanString(row[7])

      // Coluna I = index 8 (Número Cartão SUS)
      const cartaoSus = cleanString(row[8])

      // Coluna J = index 9 (Telefone)
      const telefone = cleanString(row[9])

      // Coluna K = index 10 (Nomes dos Pais)
      const nomePais = cleanString(row[10])

      // Coluna L = index 11 (Endereço)
      const endereco = cleanString(row[11])

      sheetStudents.push({
        id: `sheet_${sIdx}_row_${r + 1}_${Math.random().toString(36).substr(2, 5)}`,
        sheetName,
        rowIndex: r + 1, // 1-based (ex: 8)
        nome: nomeClean,
        data_nascimento: dataNascISO,
        inep,
        cpf,
        cor_raca: corRaca,
        cid,
        nis,
        cartao_sus: cartaoSus,
        telefone,
        nome_pais: nomePais,
        endereco
      })
    }

    if (sheetStudents.length > 0) {
      result.push({
        sheetName,
        students: sheetStudents
      })
    }
  }

  return result
}
