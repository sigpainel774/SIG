/**
 * Utilitários de manipulação, sanitização e formatação de strings do SIG.
 */

// Lista de conectivos, preposições e artigos do português que devem ficar em minúsculas
const CONECTIVOS_MINUSCULOS = new Set([
  'de', 'da', 'do', 'das', 'dos',
  'e', 'em', 'del', 'di', 'du',
  'van', 'von', "d'"
])

// Numerais romanos comuns em nomes próprios que devem permanecer em maiúsculas
const NUMERAIS_ROMANOS = new Set([
  'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x',
  'xi', 'xii', 'xiii', 'xiv', 'xv', 'xvi', 'xvii', 'xviii', 'xix', 'xx'
])

/**
 * Capitaliza uma única palavra ou fragmento respeitando acentuação UTF-8.
 * Ex: "gonçalves" -> "Gonçalves", "álvares" -> "Álvares"
 */
function capitalizeWord(word: string): string {
  if (!word) return ''
  const first = word.charAt(0).toUpperCase()
  const rest = word.slice(1).toLowerCase()
  return `${first}${rest}`
}

/**
 * Formata um nome próprio no padrão Title Case com conectivos em minúsculas.
 * Exemplo: "jesus de soto perreira gonçalvez da silva" -> "Jesus de Soto Perreira Gonçalvez da Silva"
 * Suporta:
 * - Conectivos ("de", "da", "dos", "das", "do", "e", etc.) em minúsculas, exceto na primeira palavra.
 * - Nomes compostos com hífen (ex: "Jean-Luc")
 * - Nomes com apóstrofo (ex: "D'Ávila", "Sant'Ana")
 * - Numerais romanos (ex: "Pedro II")
 * - Colapso de múltiplos espaços acidentais
 *
 * @param value Texto ou nome a ser formatado.
 * @returns Nome formatado no padrão oficial.
 */
export function formatNameTitleCase(value: string | null | undefined): string {
  if (!value || typeof value !== 'string') return ''

  // Normaliza espaços múltiplos para um único espaço e remove espaços nas pontas
  const trimmed = value.trim().replace(/\s+/g, ' ')
  if (!trimmed) return ''

  // Separa as palavras por espaço
  const words = trimmed.split(' ')

  const formattedWords = words.map((rawWord, index) => {
    if (!rawWord) return ''

    const lowerWord = rawWord.toLowerCase()

    // 1. Numerais romanos (ex: II, III, IV, etc.) devem ser mantidos em MAIÚSCULAS
    if (NUMERAIS_ROMANOS.has(lowerWord)) {
      return lowerWord.toUpperCase()
    }

    // 2. Conectivos ficam totalmente em minúsculo, EXCETO se for a primeiríssima palavra do nome
    if (index > 0 && CONECTIVOS_MINUSCULOS.has(lowerWord)) {
      return lowerWord
    }

    // 3. Tratamento de palavras com apóstrofo (ex: D'Ávila, d'Ávila, Sant'Ana)
    if (rawWord.includes("'")) {
      const parts = rawWord.split("'")
      return parts
        .map((part, pIdx) => {
          if (!part) return ''
          const lowerPart = part.toLowerCase()
          if (pIdx === 0 && (lowerPart === 'd' || lowerPart === 'sant')) {
            // Se for conectivo no meio "d'", mantém minúsculo se index > 0
            return index > 0 && lowerPart === 'd' ? 'd' : capitalizeWord(part)
          }
          return capitalizeWord(part)
        })
        .join("'")
    }

    // 4. Tratamento de palavras com hífen (ex: Jean-Luc, Souza-Carvalho)
    if (rawWord.includes('-')) {
      const parts = rawWord.split('-')
      return parts
        .map((part, pIdx) => {
          if (!part) return ''
          const lowerPart = part.toLowerCase()
          if (pIdx > 0 && CONECTIVOS_MINUSCULOS.has(lowerPart)) {
            return lowerPart
          }
          return capitalizeWord(part)
        })
        .join('-')
    }

    // 5. Palavra normal
    return capitalizeWord(rawWord)
  })

  return formattedWords.join(' ')
}

/**
 * Sanitiza e normaliza campos de e-mail:
 * - Converte para minúsculas
 * - Remove acentos gráficos (á, é, í, ó, ú, ã, õ, â, ê, ô, à, ü, etc.)
 * - Converte cedilha ('ç' / 'Ç') para 'c'
 * - Remove espaços em branco
 * - Remove caracteres proibidos para o padrão RFC (permite apenas [a-z0-9._%+-@])
 * - Garante no máximo um símbolo '@'
 *
 * @param value String de e-mail informada
 * @returns E-mail limpo e compatível com os padrões de autenticação e internet
 */
export function sanitizeEmail(value: string | null | undefined): string {
  if (!value || typeof value !== 'string') return ''

  let email = value.toLowerCase()

  // 1. Substituição explícita de cedilha
  email = email.replace(/ç/g, 'c').replace(/Ç/g, 'c')

  // 2. Remoção de diacríticos/acentos via decomposição Unicode NFD
  email = email.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  // 3. Remoção de espaços em branco
  email = email.replace(/\s+/g, '')

  // 4. Remove caracteres não permitidos em e-mails
  email = email.replace(/[^a-z0-9._%+\-@]/g, '')

  // 5. Prevenção de múltiplos '@'
  const atIndex = email.indexOf('@')
  if (atIndex !== -1) {
    const beforeAt = email.slice(0, atIndex)
    const afterAt = email.slice(atIndex + 1).replace(/@/g, '')
    email = `${beforeAt}@${afterAt}`
  }

  return email
}

/**
 * Sanitiza campos de texto genéricos removendo espaços excessivos.
 */
export function sanitizeText(value: string | null | undefined): string {
  if (!value || typeof value !== 'string') return ''
  return value.trim().replace(/\s+/g, ' ')
}
