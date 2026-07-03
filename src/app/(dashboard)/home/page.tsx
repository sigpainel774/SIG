'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, BookOpen, UserCog, MapPin, FileBarChart } from 'lucide-react'
import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Painel de Controle</h1>
        <p className="text-muted-foreground mt-2">Bem-vindo ao Sistema Municipal de Gestão Educacional.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/alunos">
          <Card className="hover:bg-hoverCustom transition-colors cursor-pointer border-borderCustom bg-card group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-foregroundCustom">Alunos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground group-hover:text-highlight transition-colors" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">Gestão</div>
              <p className="text-xs text-muted-foreground mt-1">Gerencie os alunos matriculados.</p>
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/turmas">
          <Card className="hover:bg-hoverCustom transition-colors cursor-pointer border-borderCustom bg-card group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-foregroundCustom">Turmas</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground group-hover:text-highlight transition-colors" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">Turmas</div>
              <p className="text-xs text-muted-foreground mt-1">Controle acadêmico e anos letivos.</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/funcionarios">
          <Card className="hover:bg-hoverCustom transition-colors cursor-pointer border-borderCustom bg-card group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-foregroundCustom">Funcionários</CardTitle>
              <UserCog className="h-4 w-4 text-muted-foreground group-hover:text-highlight transition-colors" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">Equipe</div>
              <p className="text-xs text-muted-foreground mt-1">Lotações e permissões de acesso.</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/ponto-mobile">
          <Card className="hover:bg-hoverCustom transition-colors cursor-pointer border-borderCustom bg-card group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-foregroundCustom">Ponto</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground group-hover:text-highlight transition-colors" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">Bater Ponto</div>
              <p className="text-xs text-muted-foreground mt-1">Registro de jornada com GPS.</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/relatorios">
          <Card className="hover:bg-hoverCustom transition-colors cursor-pointer border-borderCustom bg-card group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-foregroundCustom">Relatórios</CardTitle>
              <FileBarChart className="h-4 w-4 text-muted-foreground group-hover:text-highlight transition-colors" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">Analytics</div>
              <p className="text-xs text-muted-foreground mt-1">Boletins, Fichas e Frequência.</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
