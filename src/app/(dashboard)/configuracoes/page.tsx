import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { ConfiguracoesClient } from './ConfiguracoesClient'

export default function ConfiguracoesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ConfiguracoesClient />
    </Suspense>
  )
}
