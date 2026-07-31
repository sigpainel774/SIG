import { getVersaoImagemUrl } from './imageUtils'

export interface FotoRegistro {
  foto_avatar_path?: string | null | undefined
  foto_visualizacao_path?: string | null | undefined
  foto_original_path?: string | null | undefined
  foto_url?: string | null | undefined
  foto_updated_at?: string | null | undefined
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

/**
 * Retorna a URL pública do avatar otimizado (bucket fotos-avatar).
 * Caso não exista, faz o fallback para o foto_url antigo (legado) ou null.
 */
export function getAvatarUrl(registro?: FotoRegistro | null): string | undefined {
  if (!registro) return undefined

  let url: string | undefined = undefined

  if (registro.foto_avatar_path && SUPABASE_URL) {
    url = `${SUPABASE_URL}/storage/v1/object/public/fotos-avatar/${registro.foto_avatar_path}`
  } else if (registro.foto_url) {
    url = registro.foto_url
  }

  return getVersaoImagemUrl(url ?? null, registro.foto_updated_at) ?? undefined
}

/**
 * Retorna a URL pública de visualização otimizada (bucket fotos-visualizacao).
 * Utilizada para modais, impressões e fichas de alunos/funcionários.
 * Caso não exista, faz o fallback para o foto_url antigo ou null.
 */
export function getVisualizacaoUrl(registro?: FotoRegistro | null): string | undefined {
  if (!registro) return undefined

  let url: string | undefined = undefined

  if (registro.foto_visualizacao_path && SUPABASE_URL) {
    url = `${SUPABASE_URL}/storage/v1/object/public/fotos-visualizacao/${registro.foto_visualizacao_path}`
  } else if (registro.foto_url) {
    url = registro.foto_url
  }

  return getVersaoImagemUrl(url ?? null, registro.foto_updated_at) ?? undefined
}
