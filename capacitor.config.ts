import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.sapecau.sig',
  appName: 'SIG Sapeaçu',
  webDir: 'public',
  server: {
    url: 'https://sig-six-kappa.vercel.app',
    cleartext: true,
  },
  android: {
    backgroundColor: '#0a0a0a',
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: process.env.NODE_ENV !== 'production',
  },
}

export default config
