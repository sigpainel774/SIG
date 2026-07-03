import { FileText, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export default function MatriculasPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Matriculas</h1>
          <p className="mt-1 text-sm text-muted-foreground">Area para acompanhar solicitacoes, renovacoes e novas matriculas.</p>
        </div>
        <Button className="bg-highlight text-background hover:bg-highlight/90">
          <Plus className="mr-2 h-4 w-4" />
          Nova Matricula
        </Button>
      </div>

      <Card className="border-borderCustom bg-card p-5">
        <div className="mb-5 flex max-w-md items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar aluno ou responsavel..." className="bg-input" />
        </div>
        <div className="flex min-h-[260px] flex-col items-center justify-center rounded-lg border border-dashed border-borderCustom bg-input/40 p-8 text-center">
          <FileText className="mb-3 h-10 w-10 text-highlight" />
          <h2 className="text-lg font-semibold text-white">Modulo de matriculas em preparacao</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Esta tela ja esta pronta para receber o fluxo de cadastro, renovacao e acompanhamento das matriculas.
          </p>
        </div>
      </Card>
    </div>
  )
}
