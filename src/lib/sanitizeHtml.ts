import DOMPurify from 'isomorphic-dompurify'

/**
 * Configuração estrita de sanitização de HTML/Rich Text para prevenção de XSS.
 * Permite formatação segura de texto (parágrafos, listas, tabelas, negrito, itálico)
 * e purga qualquer elemento malicioso (<script>, <iframe>, eventos onload/onerror).
 */
const SANITIZE_CONFIG: Parameters<typeof DOMPurify.sanitize>[1] = {
  ALLOWED_TAGS: [
    'p', 'br', 'b', 'i', 'strong', 'em', 'u', 'span', 'hr',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'div', 'a', 'blockquote', 'code', 'pre'
  ],
  ALLOWED_ATTR: ['class', 'style', 'href', 'target', 'rel', 'title', 'align'],
  ALLOW_DATA_ATTR: false,
  ADD_ATTR: ['target'],
  FORCE_BODY: false,
}

/**
 * Higieniza uma string contendo HTML ou Rich Text.
 * Seguro para uso em Server Components (SSR) e Client Components.
 * 
 * @param dirty HTML ou texto potencialmente não confiável oriundo do usuário ou banco de dados
 * @returns HTML limpo e seguro para renderização
 */
export function sanitizeHtml(dirty?: string | null): string {
  if (!dirty) return ''

  try {
    const clean = DOMPurify.sanitize(dirty, SANITIZE_CONFIG)
    return typeof clean === 'string' ? clean : String(clean)
  } catch (err) {
    console.error('Erro durante sanitização de HTML:', err)
    // Fallback básico escapando caracteres de tag em caso de falha grave
    return dirty.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }
}
