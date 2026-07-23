import mammoth from 'mammoth'

export interface ExtractedStudentData {
  fileName: string
  nome: string
  data_nascimento: string | null
  telefone: string | null
  rg: string | null
  cpf: string | null
  nis: string | null
  cartao_sus: string | null
  endereco: string | null
  nome_mae?: string | null
  nome_pai?: string | null
  confidenceScore: number
  rawText: string
}

const HEADER_LABELS = [
  'NOME', 'NOME DO ALUNO', 'ALUNO', 'ESTUDANTE',
  'DATA DE NASCIMENTO', 'DATA NASC', 'NASCIMENTO', 'DATA',
  'CONTATO', 'TELEFONE', 'CELULAR', 'WHATSAPP',
  'RG', 'REGISTRO GERAL', 'IDENTIDADE',
  'CPF', 'CADASTRO DE PESSOA FISICA',
  'NIS', 'NUMERO NIS',
  'SUS', 'CARTAO SUS', 'CARTÃO SUS', 'NUMERO DO CARTAO DO SUS', 'NÚMERO DO CARTÃO DO SUS',
  'ENDERECO', 'ENDEREÇO', 'ENDERECO POR EXTENSO', 'ENDEREÇO POR EXTENSO', 'RESIDENCIA'
]

function isHeaderLabel(val: string | null | undefined): boolean {
  if (!val) return true
  const upper = val.trim().toUpperCase().replace(/[:._\-\–]/g, '')
  return HEADER_LABELS.some((label) => upper === label || upper === label.replace(/\s+/g, ''))
}

/**
 * Converte qualquer formato de data (ex: '15/08/2012', '15-08-2012', '2012-08-15', '15 de Agosto de 2012')
 * para o formato ISO do PostgreSQL 'YYYY-MM-DD'. Retorna null se for inválida.
 */
export function parseDateToISO(dateStr: string | null | undefined): string | null {
  if (!dateStr || isHeaderLabel(dateStr)) return null
  const cleaned = dateStr.trim()
  if (!cleaned) return null

  // Já no formato YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned
  }

  // Formato DD/MM/YYYY ou DD-MM-YYYY
  const brMatch = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (brMatch) {
    const day = brMatch[1].padStart(2, '0')
    const month = brMatch[2].padStart(2, '0')
    const year = brMatch[3]
    return `${year}-${month}-${day}`
  }

  // Formato extenso (ex: 15 de agosto de 2012)
  const meses: Record<string, string> = {
    janeiro: '01', fev: '02', fevereiro: '02', marco: '03', março: '03',
    abril: '04', maio: '05', junho: '06', julho: '07', agosto: '08',
    setembro: '09', outubro: '10', novembro: '11', dezembro: '12'
  }
  const extensoMatch = cleaned.toLowerCase().match(/(\d{1,2})\s+de\s+([a-zç]+)\s+de\s+(\d{4})/)
  if (extensoMatch) {
    const day = extensoMatch[1].padStart(2, '0')
    const monthName = extensoMatch[2]
    const year = extensoMatch[3]
    const month = meses[monthName] || '01'
    return `${year}-${month}-${day}`
  }

  return null
}

/**
 * Remove sufixos e rótulos comuns (ex: "Nome: João" -> "João")
 */
function cleanFieldValue(val: string | undefined): string {
  if (!val) return ''
  const cleaned = val
    .replace(/^([A-Z0-9\s._\-–:]+):\s*/i, '') // Remove rótulo inicial como "NOME DO ALUNO:"
    .replace(/\s+/g, ' ')
    .trim()
  return isHeaderLabel(cleaned) ? '' : cleaned
}

/**
 * Processa o arquivo .docx lendo células do quadro (A1 a A8) e utilizando fallback por Regex.
 */
export async function parseDocxStudentFile(file: File): Promise<ExtractedStudentData> {
  const arrayBuffer = await file.arrayBuffer()

  // 1. Extração do HTML da tabela do Word e Texto Bruto
  const htmlResult = await mammoth.convertToHtml({ arrayBuffer })
  const textResult = await mammoth.extractRawText({ arrayBuffer })

  const rawHtml = htmlResult.value || ''
  const rawText = textResult.value || ''

  let nome = ''
  let data_nascimento: string | null = null
  let telefone: string | null = null
  let rg: string | null = null
  let cpf: string | null = null
  let nis: string | null = null
  let cartao_sus: string | null = null
  let endereco: string | null = null
  let nome_mae: string | null = null
  let nome_pai: string | null = null

  // 2. Tentar extrair da estrutura da tabela HTML (td/tr)
  const cellMatches: string[] = []
  if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(rawHtml, 'text/html')
      const cells = doc.querySelectorAll('td')
      cells.forEach((cell) => {
        const text = (cell.textContent || '').trim()
        if (text) {
          cellMatches.push(text)
        }
      })
    } catch (e) {
      console.warn('Erro ao ler DOM da tabela do Word:', e)
    }
  }

  // Se não tiver DOMParser ou poucas células, faz parse por Regex
  if (cellMatches.length === 0) {
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi
    let match: RegExpExecArray | null
    while ((match = tdRegex.exec(rawHtml)) !== null) {
      const text = match[1].replace(/<[^>]+>/g, '').trim()
      if (text) {
        cellMatches.push(text)
      }
    }
  }

  // 3. Mapeamento A1-A8 na estrutura de tabela
  if (cellMatches.length > 0) {
    let startOffset = 0

    // Se a célula 0 for o rótulo "NOME" ou "NOME DO ALUNO" ou um cabeçalho genérico,
    // significa que a primeira linha/bloco contém os cabeçalhos. Os dados reais começam na célula seguinte ou linha de baixo.
    if (isHeaderLabel(cellMatches[0]) || cellMatches[0].toUpperCase().includes('FICHA')) {
      // Se houver 16 ou mais células (8 de cabeçalho + 8 de dados), a linha de dados começa no índice 8
      if (cellMatches.length >= 16 && isHeaderLabel(cellMatches[1])) {
        startOffset = 8
      } else {
        // Se a primeira célula for só um título genérico (ex: "FICHA DO ALUNO"), pula 1 célula
        startOffset = 1
      }
    }

    const getCell = (idx: number) => cellMatches[startOffset + idx] || ''

    // Mapeamento A1 a A8 (ou linha de dados)
    const rawA1 = cleanFieldValue(getCell(0)) // A1: Nome
    const rawA2 = cleanFieldValue(getCell(1)) // A2: Data de Nascimento
    const rawA3 = cleanFieldValue(getCell(2)) // A3: Contato
    const rawA4 = cleanFieldValue(getCell(3)) // A4: RG
    const rawA5 = cleanFieldValue(getCell(4)) // A5: CPF
    const rawA6 = cleanFieldValue(getCell(5)) // A6: NIS
    const rawA7 = cleanFieldValue(getCell(6)) // A7: SUS
    const rawA8 = cleanFieldValue(getCell(7)) // A8: Endereço

    if (rawA1 && !isHeaderLabel(rawA1)) nome = rawA1
    if (rawA2 && !isHeaderLabel(rawA2)) data_nascimento = parseDateToISO(rawA2)
    if (rawA3 && !isHeaderLabel(rawA3)) telefone = rawA3
    if (rawA4 && !isHeaderLabel(rawA4)) rg = rawA4
    if (rawA5 && !isHeaderLabel(rawA5)) cpf = rawA5
    if (rawA6 && !isHeaderLabel(rawA6)) nis = rawA6
    if (rawA7 && !isHeaderLabel(rawA7)) cartao_sus = rawA7
    if (rawA8 && !isHeaderLabel(rawA8)) endereco = rawA8
  }

  // 4. Fallback com Expressões Regulares caso algum campo esteja vazio ou fosse apenas rótulo
  if (!nome || isHeaderLabel(nome)) {
    const nomeMatch = rawText.match(/(?:Nome(?:\s+do\s+aluno)?|Aluno|Estudante):\s*([^\r\n]+)/i)
    if (nomeMatch && !isHeaderLabel(nomeMatch[1])) {
      nome = nomeMatch[1].trim()
    }
  }

  if (!data_nascimento) {
    const dtMatch = rawText.match(/(?:Data\s+de\s+nascimento|Nascimento|Data\s+Nasc\.?):\s*([^\r\n]+)/i)
    if (dtMatch && !isHeaderLabel(dtMatch[1])) {
      data_nascimento = parseDateToISO(dtMatch[1])
    }
  }

  if (!telefone || isHeaderLabel(telefone)) {
    const telMatch = rawText.match(/(?:Contato|Telefone|Celular|WhatsApp):\s*([^\r\n]+)/i)
    if (telMatch && !isHeaderLabel(telMatch[1])) {
      telefone = telMatch[1].trim()
    }
  }

  if (!rg || isHeaderLabel(rg)) {
    const rgMatch = rawText.match(/(?:RG|Identidade):\s*([^\r\n]+)/i)
    if (rgMatch && !isHeaderLabel(rgMatch[1])) {
      rg = rgMatch[1].trim()
    }
  }

  if (!cpf || isHeaderLabel(cpf)) {
    const cpfMatch = rawText.match(/(?:CPF):\s*([^\r\n]+)/i)
    if (cpfMatch && !isHeaderLabel(cpfMatch[1])) {
      cpf = cpfMatch[1].trim()
    }
  }

  if (!nis || isHeaderLabel(nis)) {
    const nisMatch = rawText.match(/(?:NIS):\s*([^\r\n]+)/i)
    if (nisMatch && !isHeaderLabel(nisMatch[1])) {
      nis = nisMatch[1].trim()
    }
  }

  if (!cartao_sus || isHeaderLabel(cartao_sus)) {
    const susMatch = rawText.match(/(?:SUS|Cartão\s+SUS):\s*([^\r\n]+)/i)
    if (susMatch && !isHeaderLabel(susMatch[1])) {
      cartao_sus = susMatch[1].trim()
    }
  }

  if (!endereco || isHeaderLabel(endereco)) {
    const endMatch = rawText.match(/(?:Endereço(?:\s+por\s+extenso)?|Residência):\s*([^\r\n]+)/i)
    if (endMatch && !isHeaderLabel(endMatch[1])) {
      endereco = endMatch[1].trim()
    }
  }

  // Busca adicional para filiação (se constar no documento Word)
  const maeMatch = rawText.match(/(?:Mãe|Nome\s+da\s+Mãe|Genitora):\s*([^\r\n]+)/i)
  if (maeMatch && !isHeaderLabel(maeMatch[1])) {
    nome_mae = maeMatch[1].trim()
  }

  const paiMatch = rawText.match(/(?:Pai|Nome\s+do\s+Pai|Genitor):\s*([^\r\n]+)/i)
  if (paiMatch && !isHeaderLabel(paiMatch[1])) {
    nome_pai = paiMatch[1].trim()
  }

  // Se o nome ainda não tiver sido capturado, procura a primeira linha que não seja rótulo de cabeçalho
  if (!nome || isHeaderLabel(nome)) {
    const lines = rawText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => Boolean(l) && !isHeaderLabel(l))
    if (lines.length > 0) {
      nome = lines[0]
    }
  }

  // Cálculo do grau de confiança de captura (0 a 100%)
  let score = 0
  if (nome && !isHeaderLabel(nome)) score += 30
  if (data_nascimento) score += 20
  if (cpf && !isHeaderLabel(cpf)) score += 15
  if (rg && !isHeaderLabel(rg)) score += 10
  if (telefone && !isHeaderLabel(telefone)) score += 10
  if (endereco && !isHeaderLabel(endereco)) score += 15

  return {
    fileName: file.name,
    nome: nome && !isHeaderLabel(nome) ? nome : 'ALUNO NÃO IDENTIFICADO',
    data_nascimento,
    telefone: telefone && !isHeaderLabel(telefone) ? telefone : null,
    rg: rg && !isHeaderLabel(rg) ? rg : null,
    cpf: cpf && !isHeaderLabel(cpf) ? cpf : null,
    nis: nis && !isHeaderLabel(nis) ? nis : null,
    cartao_sus: cartao_sus && !isHeaderLabel(cartao_sus) ? cartao_sus : null,
    endereco: endereco && !isHeaderLabel(endereco) ? endereco : null,
    nome_mae: nome_mae && !isHeaderLabel(nome_mae) ? nome_mae : null,
    nome_pai: nome_pai && !isHeaderLabel(nome_pai) ? nome_pai : null,
    confidenceScore: Math.min(score, 100),
    rawText
  }
}
