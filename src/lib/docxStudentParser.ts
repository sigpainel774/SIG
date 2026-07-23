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

export function isHeaderLabel(val: string | null | undefined): boolean {
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

  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned
  }

  const brMatch = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (brMatch) {
    const day = brMatch[1].padStart(2, '0')
    const month = brMatch[2].padStart(2, '0')
    const year = brMatch[3]
    return `${year}-${month}-${day}`
  }

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

function cleanFieldValue(val: string | undefined): string {
  if (!val) return ''
  const cleaned = val
    .replace(/^([A-Z0-9\s._\-–:]+):\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim()
  return isHeaderLabel(cleaned) ? '' : cleaned
}

/**
 * Processa um documento Word (.docx) varrendo todas as linhas e colunas das tabelas.
 * Retorna uma lista de alunos extraídos (suporta tabelas com múltiplos alunos por linha ou tabelas chave-valor).
 */
export async function parseDocxStudentFile(file: File): Promise<ExtractedStudentData[]> {
  const arrayBuffer = await file.arrayBuffer()

  const htmlResult = await mammoth.convertToHtml({ arrayBuffer })
  const textResult = await mammoth.extractRawText({ arrayBuffer })

  const rawHtml = htmlResult.value || ''
  const rawText = textResult.value || ''

  const extractedStudents: ExtractedStudentData[] = []

  if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(rawHtml, 'text/html')
      const tables = doc.querySelectorAll('table')

      tables.forEach((table) => {
        const rows = Array.from(table.querySelectorAll('tr'))
        if (rows.length === 0) return

        // ── CASO A: Tabela Multilinhas com Colunas (Ex: Linha 0 = Cabeçalhos, Linhas 1..N = Alunos) ──
        const headerRow = rows[0]
        const headerCells = Array.from(headerRow.querySelectorAll('th, td')).map((c) =>
          (c.textContent || '').trim().toUpperCase()
        )

        // Verificar se a primeira linha define colunas
        const isMultiRowColumnTable =
          headerCells.length >= 2 && headerCells.some((h) => isHeaderLabel(h))

        if (isMultiRowColumnTable && rows.length > 1) {
          // Mapear índices das colunas
          let colNome = headerCells.findIndex((h) => h.includes('NOME') || h.includes('ALUNO'))
          let colNasc = headerCells.findIndex((h) => h.includes('NASC') || h.includes('DATA'))
          let colTel = headerCells.findIndex((h) => h.includes('TEL') || h.includes('CONTATO') || h.includes('CEL'))
          let colRg = headerCells.findIndex((h) => h.includes('RG') || h.includes('IDENT'))
          let colCpf = headerCells.findIndex((h) => h.includes('CPF'))
          let colNis = headerCells.findIndex((h) => h.includes('NIS'))
          let colSus = headerCells.findIndex((h) => h.includes('SUS'))
          let colEnd = headerCells.findIndex((h) => h.includes('END') || h.includes('RESID'))

          // Fallback por ordem de colunas A1 a A8 se não achou pelos nomes
          if (colNome === -1) colNome = 0
          if (colNasc === -1 && headerCells.length > 1) colNasc = 1
          if (colTel === -1 && headerCells.length > 2) colTel = 2
          if (colRg === -1 && headerCells.length > 3) colRg = 3
          if (colCpf === -1 && headerCells.length > 4) colCpf = 4
          if (colNis === -1 && headerCells.length > 5) colNis = 5
          if (colSus === -1 && headerCells.length > 6) colSus = 6
          if (colEnd === -1 && headerCells.length > 7) colEnd = 7

          // Varrer cada linha de dados (da linha 1 em diante)
          for (let r = 1; r < rows.length; r++) {
            const dataRowCells = Array.from(rows[r].querySelectorAll('td, th')).map((c) =>
              (c.textContent || '').trim()
            )
            if (dataRowCells.length === 0) continue

            const rawNome = cleanFieldValue(dataRowCells[colNome])
            if (!rawNome || isHeaderLabel(rawNome)) continue // Pula se não tiver nome ou for outro cabeçalho

            const rawNasc = cleanFieldValue(dataRowCells[colNasc])
            const rawTel = cleanFieldValue(dataRowCells[colTel])
            const rawRg = cleanFieldValue(dataRowCells[colRg])
            const rawCpf = cleanFieldValue(dataRowCells[colCpf])
            const rawNis = cleanFieldValue(dataRowCells[colNis])
            const rawSus = cleanFieldValue(dataRowCells[colSus])
            const rawEnd = cleanFieldValue(dataRowCells[colEnd])

            let score = 30
            if (rawNasc) score += 20
            if (rawCpf) score += 15
            if (rawRg) score += 10
            if (rawTel) score += 10
            if (rawEnd) score += 15

            extractedStudents.push({
              fileName: file.name,
              nome: rawNome,
              data_nascimento: parseDateToISO(rawNasc),
              telefone: rawTel || null,
              rg: rawRg || null,
              cpf: rawCpf || null,
              nis: rawNis || null,
              cartao_sus: rawSus || null,
              endereco: rawEnd || null,
              confidenceScore: Math.min(score, 100),
              rawText
            })
          }
          return
        }

        // ── CASO B: Tabela Chave-Valor de 2 Colunas (Linha a Linha) ──
        let singleNome = ''
        let singleNasc: string | null = null
        let singleTel: string | null = null
        let singleRg: string | null = null
        let singleCpf: string | null = null
        let singleNis: string | null = null
        let singleSus: string | null = null
        let singleEnd: string | null = null

        rows.forEach((row) => {
          const cells = Array.from(row.querySelectorAll('td')).map((c) => (c.textContent || '').trim())
          if (cells.length >= 2) {
            const label = cells[0].toUpperCase()
            const val = cleanFieldValue(cells[1])

            if (!val || isHeaderLabel(val)) return

            if (label.includes('NOME') || label.includes('ALUNO')) singleNome = val
            else if (label.includes('NASC')) singleNasc = parseDateToISO(val)
            else if (label.includes('TEL') || label.includes('CONTATO') || label.includes('CEL')) singleTel = val
            else if (label.includes('RG') || label.includes('IDENT')) singleRg = val
            else if (label.includes('CPF')) singleCpf = val
            else if (label.includes('NIS')) singleNis = val
            else if (label.includes('SUS')) singleSus = val
            else if (label.includes('END') || label.includes('RESID')) singleEnd = val
          }
        })

        if (singleNome && !isHeaderLabel(singleNome)) {
          let score = 30
          if (singleNasc) score += 20
          if (singleCpf) score += 15
          if (singleRg) score += 10
          if (singleTel) score += 10
          if (singleEnd) score += 15

          extractedStudents.push({
            fileName: file.name,
            nome: singleNome,
            data_nascimento: singleNasc,
            telefone: singleTel,
            rg: singleRg,
            cpf: singleCpf,
            nis: singleNis,
            cartao_sus: singleSus,
            endereco: singleEnd,
            confidenceScore: Math.min(score, 100),
            rawText
          })
        }
      })
    } catch (e) {
      console.warn('Erro ao processar estrutura DOM de tabelas:', e)
    }
  }

  // ── CASO C: Parse Sequencial ou Regex (Se não encontrou alunos em tabelas HTML estruturadas) ──
  if (extractedStudents.length === 0) {
    const cellMatches: string[] = []
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi
    let match: RegExpExecArray | null
    while ((match = tdRegex.exec(rawHtml)) !== null) {
      const text = match[1].replace(/<[^>]+>/g, '').trim()
      if (text) {
        cellMatches.push(text)
      }
    }

    if (cellMatches.length > 0) {
      let startOffset = 0
      if (isHeaderLabel(cellMatches[0]) || cellMatches[0].toUpperCase().includes('FICHA')) {
        if (cellMatches.length >= 16 && isHeaderLabel(cellMatches[1])) {
          startOffset = 8
        } else {
          startOffset = 1
        }
      }

      const getCell = (idx: number) => cellMatches[startOffset + idx] || ''

      const rawA1 = cleanFieldValue(getCell(0))
      const rawA2 = cleanFieldValue(getCell(1))
      const rawA3 = cleanFieldValue(getCell(2))
      const rawA4 = cleanFieldValue(getCell(3))
      const rawA5 = cleanFieldValue(getCell(4))
      const rawA6 = cleanFieldValue(getCell(5))
      const rawA7 = cleanFieldValue(getCell(6))
      const rawA8 = cleanFieldValue(getCell(7))

      let nome = rawA1 && !isHeaderLabel(rawA1) ? rawA1 : ''
      let data_nascimento = rawA2 && !isHeaderLabel(rawA2) ? parseDateToISO(rawA2) : null
      let telefone = rawA3 && !isHeaderLabel(rawA3) ? rawA3 : null
      let rg = rawA4 && !isHeaderLabel(rawA4) ? rawA4 : null
      let cpf = rawA5 && !isHeaderLabel(rawA5) ? rawA5 : null
      let nis = rawA6 && !isHeaderLabel(rawA6) ? rawA6 : null
      let cartao_sus = rawA7 && !isHeaderLabel(rawA7) ? rawA7 : null
      let endereco = rawA8 && !isHeaderLabel(rawA8) ? rawA8 : null

      // Regex fallback se nome faltou
      if (!nome || isHeaderLabel(nome)) {
        const nomeMatch = rawText.match(/(?:Nome(?:\s+do\s+aluno)?|Aluno|Estudante):\s*([^\r\n]+)/i)
        if (nomeMatch && !isHeaderLabel(nomeMatch[1])) {
          nome = nomeMatch[1].trim()
        }
      }

      if (nome && !isHeaderLabel(nome)) {
        let score = 30
        if (data_nascimento) score += 20
        if (cpf) score += 15
        if (rg) score += 10
        if (telefone) score += 10
        if (endereco) score += 15

        extractedStudents.push({
          fileName: file.name,
          nome,
          data_nascimento,
          telefone,
          rg,
          cpf,
          nis,
          cartao_sus,
          endereco,
          confidenceScore: Math.min(score, 100),
          rawText
        })
      }
    }
  }

  return extractedStudents
}
