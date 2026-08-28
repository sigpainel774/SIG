export interface ParsedUserAgent {
  browser: string
  os: string
  deviceType: 'mobile' | 'desktop' | 'tablet' | 'unknown'
  isApk: boolean
}

export function parseUserAgent(uaString: string | null | undefined): ParsedUserAgent {
  if (!uaString) {
    return {
      browser: 'Navegador Desconhecido',
      os: 'Sistema Desconhecido',
      deviceType: 'unknown',
      isApk: false,
    }
  }

  const ua = uaString.toLowerCase()

  // Detect APK / Capacitor / Android WebView
  // Capacitor Android WebView padrão inclui "capacitor", "wv" ou "version/4.0 chrome"
  const isApk =
    ua.includes('capacitor') ||
    ua.includes('wv') ||
    ua.includes('com.sapecau.sig') ||
    (ua.includes('android') && ua.includes('version/') && ua.includes('chrome/'))

  // Detect OS
  let os = 'Sistema Operacional'
  if (ua.includes('windows nt 10.0')) os = 'Windows 10/11'
  else if (ua.includes('windows nt 6.3')) os = 'Windows 8.1'
  else if (ua.includes('windows nt 6.1')) os = 'Windows 7'
  else if (ua.includes('windows')) os = 'Windows'
  else if (ua.includes('macintosh') || ua.includes('mac os x')) os = 'macOS'
  else if (ua.includes('android')) os = 'Android'
  else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) os = 'iOS (iPhone/iPad)'
  else if (ua.includes('linux')) os = 'Linux'

  // Detect Browser / App
  let browser = 'Navegador'
  if (isApk) browser = 'Aplicativo SIG (APK Android)'
  else if (ua.includes('edg/') || ua.includes('edge/')) browser = 'Microsoft Edge'
  else if (ua.includes('chrome/') && !ua.includes('edg/')) browser = 'Google Chrome'
  else if (ua.includes('safari/') && !ua.includes('chrome/')) browser = 'Apple Safari'
  else if (ua.includes('firefox/')) browser = 'Mozilla Firefox'
  else if (ua.includes('opr/') || ua.includes('opera/')) browser = 'Opera'
  else if (ua.includes('node')) browser = 'Sessão API/Servidor'

  // Detect Device Type
  let deviceType: 'mobile' | 'desktop' | 'tablet' | 'unknown' = 'desktop'
  if (ua.includes('ipad') || ua.includes('tablet')) {
    deviceType = 'tablet'
  } else if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone') || isApk) {
    deviceType = 'mobile'
  } else if (ua.includes('node')) {
    deviceType = 'unknown'
  }

  return { browser, os, deviceType, isApk }
}
