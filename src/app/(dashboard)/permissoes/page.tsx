import { BookOpen, GraduationCap, KeyRound, Pin, School, Search, ShieldCheck, Users, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

const modules = [
  { label: 'Mural', icon: Pin, enabled: true },
  { label: 'Turmas', icon: BookOpen, enabled: true },
  { label: 'Funcionarios', icon: Users, enabled: false },
  { label: 'Matriculas', icon: KeyRound, enabled: true },
  { label: 'Alunos', icon: GraduationCap, enabled: true },
  { label: 'Ocorrencias', icon: ShieldCheck, enabled: true },
]

const permissions = [
  { name: 'Ana Souza', email: 'ana@escola.br', level: 'Nivel 2 - Diretor', school: 'Escola Modelo', status: 'Ativo' },
  { name: 'Carlos Lima', email: 'carlos@escola.br', level: 'Nivel 4 - Professor', school: 'Colegio Dr Eraldo Tinoco', status: 'Ativo' },
  { name: 'Marina Alves', email: 'marina@escola.br', level: 'Nivel 5 - Chefe de Equipe', school: 'Global', status: 'Ativo' },
]

export default function PermissoesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Permissoes</h1>
          <p className="mt-1 text-sm text-muted-foreground">Controle de niveis, escolas e modulos liberados por funcionario.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-borderCustom bg-hoverCustom text-foregroundCustom">
            <Users className="mr-2 h-4 w-4" />
            Por Funcionario
          </Button>
          <Button variant="outline" className="border-borderCustom bg-card text-muted-foreground">
            <School className="mr-2 h-4 w-4" />
            Por Escola
          </Button>
        </div>
      </div>

      <Card className="border-borderCustom bg-card p-5">
        <h2 className="mb-4 text-lg font-semibold text-white">Atribuir acesso</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm text-muted-foreground">Funcionario</label>
            <Input placeholder="Digite para pesquisar funcionario..." className="bg-input" />
          </div>
          <div>
            <label className="mb-2 block text-sm text-muted-foreground">Escola / Orgao</label>
            <select className="h-10 w-full rounded-md border border-borderCustom bg-input px-3 text-sm text-foregroundCustom outline-none">
              <option>Escola Modelo</option>
              <option>Colegio Dr Eraldo Tinoco</option>
              <option>Global</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm text-muted-foreground">Nivel de Acesso</label>
            <select className="h-10 w-full rounded-md border border-borderCustom bg-input px-3 text-sm text-foregroundCustom outline-none">
              <option>Nivel 2 - Diretor</option>
              <option>Nivel 3 - Coordenador</option>
              <option>Nivel 4 - Professor</option>
              <option>Nivel 5 - Chefe de Equipe</option>
              <option>Nivel 6 - Operacional</option>
            </select>
          </div>
        </div>

        <div className="mt-5">
          <p className="mb-3 text-sm font-medium text-foregroundCustom">Modulos liberados para coordenacao</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((module) => {
              const Icon = module.icon
              return (
                <div key={module.label} className="flex items-center justify-between rounded-lg border border-borderCustom bg-input p-3">
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-highlight" />
                    <span className="text-sm font-medium text-white">{module.label}</span>
                  </div>
                  <span className={`h-5 w-9 rounded-full p-0.5 ${module.enabled ? 'bg-highlight' : 'bg-muted'}`}>
                    <span className={`block h-4 w-4 rounded-full bg-white transition-transform ${module.enabled ? 'translate-x-4' : ''}`} />
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <Button className="bg-highlight text-background hover:bg-highlight/90">Salvar permissao</Button>
        </div>
      </Card>

      <Card className="border-borderCustom bg-card p-5">
        <div className="mb-5 flex flex-wrap gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar funcionario..." className="bg-input pl-9" />
          </div>
          <select className="h-10 rounded-md border border-borderCustom bg-input px-3 text-sm text-foregroundCustom outline-none">
            <option>Todos os Niveis</option>
            <option>Nivel 2 - Diretor</option>
            <option>Nivel 3 - Coordenador</option>
            <option>Nivel 4 - Professor</option>
          </select>
          <Button variant="outline" className="border-borderCustom bg-hoverCustom">
            <X className="mr-2 h-4 w-4" />
            Limpar
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-borderCustom text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="p-3">Funcionario</th>
                <th className="p-3">Nivel</th>
                <th className="p-3">Escola</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderCustom">
              {permissions.map((permission) => (
                <tr key={permission.email} className="hover:bg-hoverCustom">
                  <td className="p-3">
                    <p className="font-medium text-white">{permission.name}</p>
                    <p className="text-xs text-muted-foreground">{permission.email}</p>
                  </td>
                  <td className="p-3 text-muted-foreground">{permission.level}</td>
                  <td className="p-3 text-muted-foreground">{permission.school}</td>
                  <td className="p-3"><span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-400">{permission.status}</span></td>
                  <td className="p-3 text-right">
                    <Button variant="ghost" size="sm" className="text-highlight hover:bg-highlight/10 hover:text-highlight">
                      Gerenciar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
