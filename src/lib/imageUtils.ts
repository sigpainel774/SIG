/**
 * Helper utilitário para gerar URLs de imagens com versão estática ou baseada em updatedAt.
 * Evita o uso de Date.now() aleatório, permitindo que o navegador utilize o cache HTTP
 * e atualize a imagem automaticamente APENAS quando o registro for verdadeiramente modificado.
 */
export function getVersaoImagemUrl(
  url: string | null | undefined,
  updatedAt?: string | Date | number | null
): string | null {
  if (!url) return null;
  if (url.startsWith('data:')) return url;

  const cleanUrl = url.split('?')[0];

  if (updatedAt) {
    const timestamp = new Date(updatedAt).getTime();
    if (!isNaN(timestamp) && timestamp > 0) {
      return `${cleanUrl}?v=${timestamp}`;
    }
  }

  // Fallback determinístico baseado no hash simples do caminho para manter cache consistente
  let hash = 0;
  for (let i = 0; i < cleanUrl.length; i++) {
    hash = (hash << 5) - hash + cleanUrl.charCodeAt(i);
    hash |= 0; // Converte para inteiro de 32 bits
  }
  const vHash = Math.abs(hash).toString(36);

  return `${cleanUrl}?v=${vHash}`;
}
