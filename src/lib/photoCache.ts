import { getVersaoImagemUrl } from './imageUtils'

const CACHE_NAME = 'sig-photos-v1'

// Map em memória para evitar reconverter Blobs em URLs repetidamente na mesma sessão
const memoryBlobMap = new Map<string, string>()

/**
 * Obtém a foto do cache local (CacheStorage) do navegador.
 * Se a foto já estiver salva no cache, retorna a Blob URL instantaneamente (0ms).
 * Se não estiver, faz o download, salva no cache local para uso futuro e retorna a Blob URL.
 */
export async function obterFotoCache(
  url: string | null | undefined,
  updatedAt?: string | Date | number | null
): Promise<string | null> {
  if (!url) return null

  // Se já for data URI ou blob URL, retorna diretamente sem sanitizar query string
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    return url
  }

  // Sanitiza a URL removendo query params para chave única no cache
  const cleanUrl = url.split('?')[0]

  // Se já existe no map de memória da sessão ativa, retorna imediatamente
  if (memoryBlobMap.has(cleanUrl)) {
    return memoryBlobMap.get(cleanUrl)!
  }

  // Fallback seguro caso 'caches' não esteja disponível no ambiente (SSR / guias ultra privadas)
  if (typeof window === 'undefined' || !('caches' in window)) {
    return getVersaoImagemUrl(url, updatedAt) ?? url
  }

  try {
    const cache = await caches.open(CACHE_NAME)

    // Tenta encontrar a requisição no CacheStorage local
    const cachedResponse = await cache.match(cleanUrl)

    if (cachedResponse && cachedResponse.ok) {
      const blob = await cachedResponse.blob()
      const blobUrl = URL.createObjectURL(blob)
      memoryBlobMap.set(cleanUrl, blobUrl)
      return blobUrl
    }

    // Se não encontrou no cache, faz o fetch HTTP para salvar no cache local
    const response = await fetch(cleanUrl, { mode: 'cors' })

    if (response.ok) {
      // Salva uma cópia da resposta no CacheStorage
      await cache.put(cleanUrl, response.clone())
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      memoryBlobMap.set(cleanUrl, blobUrl)
      return blobUrl
    }
  } catch (err) {
    console.warn('[photoCache] Falha ao acessar cache local de imagem:', err)
  }

  // Fallback para URL original caso ocorra qualquer erro de rede/CORS
  return getVersaoImagemUrl(url, updatedAt) ?? url
}

/**
 * Invalida e limpa a foto do CacheStorage local.
 * Deve ser chamado sempre que uma nova foto for salva/enviada no Supabase Storage.
 */
export async function invalidarCacheFoto(url: string | null | undefined): Promise<void> {
  if (!url) return

  const cleanUrl = url.split('?')[0]

  // Revoga Blob URL da memória se existir
  if (memoryBlobMap.has(cleanUrl)) {
    const blobUrl = memoryBlobMap.get(cleanUrl)
    if (blobUrl && blobUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(blobUrl)
      } catch (err) {
        // Ignora erro ao revogar
      }
    }
    memoryBlobMap.delete(cleanUrl)
  }

  if (typeof window === 'undefined' || !('caches' in window)) return

  try {
    const cache = await caches.open(CACHE_NAME)
    await cache.delete(cleanUrl)
  } catch (err) {
    console.warn('[photoCache] Erro ao invalidar cache da foto:', err)
  }
}

/**
 * Pré-carrega uma lista de URLs de fotos no CacheStorage em segundo plano.
 * Útil para acelerar a exibição da Gestão de Lotações e grandes listagens.
 */
export async function precarregarFotosCache(urls: (string | null | undefined)[]): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) return

  const validUrls = Array.from(
    new Set(
      urls
        .filter((u): u is string => Boolean(u && !u.startsWith('data:') && !u.startsWith('blob:')))
        .map((u) => u.split('?')[0])
    )
  )

  if (validUrls.length === 0) return

  // Executa o pré-carregamento em lotes paralelos de 5 requisições por vez
  const batchSize = 5
  for (let i = 0; i < validUrls.length; i += batchSize) {
    const chunk = validUrls.slice(i, i + batchSize)
    await Promise.all(chunk.map((cleanUrl) => obterFotoCache(cleanUrl)))
  }
}
