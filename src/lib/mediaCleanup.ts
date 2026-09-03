/**
 * Utilitário de Despejo Ativo de Mídia e Câmera
 * 
 * Interrompe explicitamente todas as faixas (tracks) de vídeo/áudio de um MediaStream
 * e desconecta o stream do elemento <video>, liberando o hardware da câmera (desliga LED)
 * e os buffers de textura/decodificação da GPU no navegador.
 */

export function disposeMediaStream(
  stream?: MediaStream | null,
  videoElement?: HTMLVideoElement | null
): void {
  // 1. Interrompe todas as faixas do MediaStream fornecido
  if (stream) {
    try {
      const tracks = stream.getTracks()
      tracks.forEach((track) => {
        try {
          track.enabled = false
          track.stop()
        } catch (err) {
          console.warn('[disposeMediaStream] Erro ao parar faixa:', err)
        }
      })
    } catch (err) {
      console.warn('[disposeMediaStream] Erro ao ler faixas do stream:', err)
    }
  }

  // 2. Se um elemento <video> for informado, limpa decodificadores e buffers de GPU
  if (videoElement) {
    try {
      videoElement.pause()
    } catch {
      // Ignora erro caso já esteja pausado
    }

    // Inspeciona se o srcObject do elemento ainda possui tracks ativas não encerradas
    const currentSrcObject = videoElement.srcObject
    if (
      currentSrcObject &&
      typeof (currentSrcObject as any).getTracks === 'function' &&
      currentSrcObject !== stream
    ) {
      try {
        const tracks = (currentSrcObject as MediaStream).getTracks()
        tracks.forEach((track) => {
          try {
            track.enabled = false
            track.stop()
          } catch {
            // Ignora erro
          }
        })
      } catch {
        // Ignora erro
      }
    }

    // Desvincula o fluxo e instrui o motor do navegador a liberar recursos de textura e hardware
    videoElement.srcObject = null
    try {
      videoElement.removeAttribute('src')
      videoElement.load()
    } catch {
      // Ignora erro no load()
    }
  }
}
