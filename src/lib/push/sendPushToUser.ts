export interface SendPushParams {
  destinatarioId?: string | null     // funcionario.id
  destinatarioUserId?: string | null // auth.users.id
  title: string
  message: string
  link?: string
  tag?: string
  isBroadcast?: boolean
  escolaId?: string | null
}

/**
 * Funçao auxiliar para disparar notificações push em background (non-blocking / fire-and-forget).
 * Funciona tanto no lado cliente (URL relativa) quanto no servidor (URL absoluta via VERCEL_URL).
 * Trata erros graciosamente para nunca travar a requisição principal do usuário.
 */
export async function sendPushToUser(params: SendPushParams): Promise<void> {
  try {
    // No cliente (browser), usa URL relativa — no servidor usa URL absoluta
    const isServer = typeof window === 'undefined'

    let pushUrl: string
    if (isServer) {
      // Servidor: constrói URL absoluta corretamente (sem bug de precedência de operadores)
      const vercelUrl = process.env.VERCEL_URL
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
      const base = siteUrl
        ? siteUrl
        : vercelUrl
        ? `https://${vercelUrl}`
        : 'http://localhost:3000'
      pushUrl = `${base}/api/push/send`
    } else {
      // Cliente: URL relativa funciona diretamente no mesmo domínio
      pushUrl = '/api/push/send'
    }

    // Disparo assíncrono interno para a API Route de envio (fire-and-forget)
    fetch(pushUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    }).catch((err) => {
      console.warn('[sendPushToUser] Falha silenciosa no fetch assíncrono:', err?.message || err)
    })
  } catch (err) {
    console.warn('[sendPushToUser] Falha na preparação do disparo:', err)
  }
}
