import { FileCheck, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function AtestadosPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Atestados</h1>
          <p className="mt-1 text-sm text-muted-foreground">Registro e acompanhamento de atestados medicos e justificativas.</p>
        </div>
        <Button className="bg-highlight text-background hover:bg-highlight/90">
          <Plus className="mr-2 h-4 w-4" />
          Novo Atestado
        </Button>
      </div>

      <Card className="flex min-h-[320px] flex-col items-center justify-center border-borderCustom bg-card p-8 text-center">
        <FileCheck className="mb-3 h-12 w-12 text-highlight" />
        <h2 className="text-lg font-semibold text-white">Controle de atestados</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          Nao havia HTML especifico para esta rota. A tela foi criada para eliminar o 404 e receber o fluxo definitivo.
        </p>
      </Card>
    </div>
  )
}
