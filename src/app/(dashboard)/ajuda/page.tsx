'use client'

import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeftRight,
  BookOpen,
  CalendarCheck,
  ChevronDown,
  Edit3,
  HelpCircle,
  Map,
  MessageSquareWarning,
  ScanLine,
  Shield,
  ShieldCheck,
  UserCog,
  UserPlus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

const helpItems = [
  {
    title: 'Niveis de Acesso',
    tags: 'acesso permissao nivel hierarquia admin secretaria diretor professor chefe operacional',
    icon: Shield,
    body: [
      'Nivel 1: administrador global com acesso total a todas as escolas e modulos.',
      'Nivel 2: diretor escolar com gestao completa da escola onde esta vinculado.',
      'Nivel 3: secretario ou coordenador com permissoes especificas concedidas pela direcao.',
      'Nivel 4: professor com acesso restrito as turmas e disciplinas vinculadas.',
      'Nivel 5: chefe de equipe com visao ABAC focada nos cargos que gerencia.',
      'Nivel 6: operacional com acesso reduzido ao app mobile de ponto e ronda.',
    ],
  },
  {
    title: 'Fluxo de Alocacao de Diretores',
    tags: 'diretor gestor alocacao contratacao escola email lotacao permissao senha',
    icon: UserCog,
    body: [
      'Cadastre a escola antes de liberar o acesso do diretor.',
      'Cadastre o funcionario com e-mail institucional e vincule-o a escola correta.',
      'Atribua permissao de Nivel 2 usando a mesma escola da lotacao fisica.',
      'No primeiro acesso, o diretor deve trocar a senha temporaria por uma senha pessoal.',
    ],
  },
  {
    title: 'Cadastro e Acesso de Professores',
    tags: 'professor docente cadastro email permissao diario primeiro acesso',
    icon: UserPlus,
    body: [
      'O diretor cadastra os dados do professor e cria o vinculo com a escola.',
      'Depois concede Nivel 4 em Permissoes, usando a mesma escola da lotacao.',
      'Se a escola da permissao for diferente da lotacao, o painel de turmas pode ficar vazio.',
    ],
    warning: 'Confira sempre se Escola / Orgao e lotacao fisica apontam para a mesma unidade.',
  },
  {
    title: 'Modo de Edicao',
    tags: 'edicao visualizacao alterar senha interruptor salvar',
    icon: Edit3,
    body: [
      'Usuarios administrativos entram em modo visualizacao por padrao para evitar alteracoes acidentais.',
      'Para editar dados sensiveis, ative o modo edicao e confirme com sua senha.',
      'Professores nao precisam ativar esse modo para lancar notas e frequencia das suas turmas.',
    ],
  },
  {
    title: 'Lancamentos Diarios',
    tags: 'notas faltas frequencia diario salvar registros diarios',
    icon: CalendarCheck,
    body: [
      'Lancamentos de gestores e secretaria exigem modo edicao.',
      'Professores lancam apenas nas disciplinas e turmas vinculadas.',
      'Todo salvamento deve manter rastreabilidade de quem registrou a informacao.',
    ],
  },
  {
    title: 'Navegacao do Professor',
    tags: 'professor docente navegacao turmas menu lateral diario',
    icon: Map,
    body: [
      'O professor deve usar o menu Turmas para chegar diretamente ao diario.',
      'Modulos administrativos podem aparecer bloqueados, conforme o nivel de acesso.',
    ],
  },
  {
    title: 'Modulo ABAC: Gestao de Equipes',
    tags: 'chefe equipe abac vigia porteiro gari operacional lotacao',
    icon: ShieldCheck,
    body: [
      'Chefes de equipe gerenciam cargos especificos, como vigias ou porteiros.',
      'Os cargos gerenciados definem quais funcionarios aparecem no painel do chefe.',
      'A atribuicao e feita em Permissoes ao selecionar Nivel 5.',
    ],
  },
  {
    title: 'Ponto Eletronico e GPS',
    tags: 'ponto gps geolocation geolocalizacao qr code operacional mobile',
    icon: ScanLine,
    body: [
      'Usuarios operacionais acessam a tela de ponto mobile.',
      'A permissao de GPS e obrigatoria para validar o local.',
      'O registro deve conferir posicao e ponto de ronda antes de salvar.',
    ],
  },
  {
    title: 'Roteiro de Vigias e Rondas',
    tags: 'roteiro vigia ronda super painel chefe operacional qr code',
    icon: BookOpen,
    body: [
      'Crie pontos de ronda no painel administrativo com escola, raio e coordenadas.',
      'Cadastre o chefe com Nivel 5 e marque os cargos subordinados.',
      'Cadastre o operacional com Nivel 6 e vincule-o a escola correta.',
    ],
  },
  {
    title: 'Transferencia de Funcionarios',
    tags: 'transferencia lotacao funcionario movimentacao mover escola auxiliar secretario nivel 1',
    icon: ArrowLeftRight,
    body: [
      'Use a gestao de lotacoes para mover funcionarios entre escolas.',
      'Selecione origem e destino, confirme a transferencia e mantenha o historico da lotacao anterior.',
    ],
  },
]

export default function AjudaPage() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(helpItems[0].title)

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return helpItems
    return helpItems.filter((item) => `${item.title} ${item.tags}`.toLowerCase().includes(normalized))
  }, [query])

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-white">
          <HelpCircle className="h-7 w-7 text-highlight" />
          Central de Ajuda
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Guias rapidos para acesso, permissoes, professores, chefias e ponto mobile.</p>
      </div>

      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar conteudos de ajuda..."
        className="border-borderCustom bg-input"
      />

      <div className="space-y-3">
        {filteredItems.map((item) => {
          const Icon = item.icon
          const isOpen = open === item.title

          return (
            <Card key={item.title} className="overflow-hidden border-borderCustom bg-card">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? '' : item.title)}
                className="flex w-full items-center justify-between gap-4 p-4 text-left"
              >
                <span className="flex items-center gap-2 font-medium text-white">
                  <Icon className="h-5 w-5 text-highlight" />
                  {item.title}
                </span>
                <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              {isOpen && (
                <div className="border-t border-borderCustom px-5 pb-5 pt-4 text-sm leading-6 text-muted-foreground">
                  <ul className="space-y-2">
                    {item.body.map((line) => (
                      <li key={line} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-highlight" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                  {item.warning && (
                    <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive">
                      <div className="flex gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{item.warning}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )
        })}
      </div>

      <div className="border-t border-dashed border-borderCustom pt-6 text-center">
        <Button variant="outline" className="border-destructive/50 bg-destructive/10 text-destructive hover:bg-destructive/20">
          <MessageSquareWarning className="mr-2 h-4 w-4" />
          Reportar um Problema ou Bug
        </Button>
      </div>
    </div>
  )
}
