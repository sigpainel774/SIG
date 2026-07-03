import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

const rows = [
  { date: '03/07/2026', student: 'Joao Silva', classroom: '1 Ano A', severity: 'Media', description: 'Registro pedagogico em acompanhamento.', author: 'Coordenacao', status: 'Pendente' },
  { date: '02/07/2026', student: 'Maria Santos', classroom: '1 Ano B', severity: 'Baixa', description: 'Orientacao registrada para ciencia da familia.', author: 'Secretaria', status: 'Comunicado' },
]

export default function OcorrenciasPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-white">
            <AlertTriangle className="h-7 w-7 text-amber-500" />
            Gestao de Ocorrencias
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Monitoramento disciplinar e pedagogico da escola.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Input type="date" className="w-auto bg-input" />
          <select className="rounded-md border border-borderCustom bg-input px-3 py-2 text-sm text-foregroundCustom outline-none">
            <option>Todas as Gravidades</option>
            <option>Baixa</option>
            <option>Media</option>
            <option>Alta</option>
          </select>
          <Button variant="outline" className="border-borderCustom bg-hoverCustom">
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden border-borderCustom bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-borderCustom bg-background/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="p-4">Data</th>
                <th className="p-4">Aluno</th>
                <th className="p-4">Turma</th>
                <th className="p-4">Tipo / Gravidade</th>
                <th className="p-4">Descricao</th>
                <th className="p-4">Registro por</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderCustom">
              {rows.map((row) => (
                <tr key={`${row.date}-${row.student}`} className="hover:bg-hoverCustom">
                  <td className="p-4 text-muted-foreground">{row.date}</td>
                  <td className="p-4 font-medium text-white">{row.student}</td>
                  <td className="p-4 text-muted-foreground">{row.classroom}</td>
                  <td className="p-4"><span className="rounded-full bg-amber-500/10 px-2 py-1 text-xs text-amber-400">{row.severity}</span></td>
                  <td className="p-4 text-muted-foreground">{row.description}</td>
                  <td className="p-4 text-muted-foreground">{row.author}</td>
                  <td className="p-4 text-muted-foreground">{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
