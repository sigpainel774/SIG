'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Printer, FileText, UserCheck, Activity } from 'lucide-react'

export default function RelatoriosPage() {
  const [activeReport, setActiveReport] = useState<string | null>(null)

  const handlePrint = () => {
    window.print()
  }

  // Se um relatório estiver ativo, renderiza em tela cheia (com css @media print aplicado via Tailwind/CSS nativo)
  if (activeReport) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between print:hidden">
          <Button variant="ghost" onClick={() => setActiveReport(null)} className="text-foregroundCustom hover:bg-hoverCustom gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Grid Principal
          </Button>
          <Button onClick={handlePrint} className="bg-highlight text-background hover:bg-highlight/90 gap-2">
            <Printer className="w-4 h-4" />
            Imprimir
          </Button>
        </div>
        
        <div className="bg-white text-black p-8 rounded-lg print:p-0 print:bg-transparent min-h-[500px]">
          <h1 className="text-2xl font-bold border-b pb-4 mb-4 text-black">
            {activeReport === 'boletim' && 'Boletim Escolar Oficial'}
            {activeReport === 'frequencia' && 'Frequência de Turma'}
            {activeReport === 'individual' && 'Ficha Individual do Aluno'}
          </h1>
          <p className="text-gray-600">
            [Conteúdo gerado dinamicamente para {activeReport}]
          </p>
        </div>
      </div>
    )
  }

  // Grid Principal (Sem abas horizontais)
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Relatórios</h1>
        <p className="text-muted-foreground mt-1">Selecione o relatório para gerar e imprimir.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card onClick={() => setActiveReport('boletim')} className="hover:bg-hoverCustom transition-colors cursor-pointer border-borderCustom bg-card group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-bold text-foregroundCustom">Boletim Escolar</CardTitle>
            <FileText className="h-5 w-5 text-muted-foreground group-hover:text-highlight transition-colors" />
          </CardHeader>
          <CardContent>
            <CardDescription className="text-muted-foreground">
              Gere o boletim completo com notas e faltas consolidadas para impressão em PDF.
            </CardDescription>
          </CardContent>
        </Card>

        <Card onClick={() => setActiveReport('frequencia')} className="hover:bg-hoverCustom transition-colors cursor-pointer border-borderCustom bg-card group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-bold text-foregroundCustom">Diário de Frequência</CardTitle>
            <UserCheck className="h-5 w-5 text-muted-foreground group-hover:text-highlight transition-colors" />
          </CardHeader>
          <CardContent>
            <CardDescription className="text-muted-foreground">
              Relatório consolidado de presenças por turma e por período letivo.
            </CardDescription>
          </CardContent>
        </Card>

        <Card onClick={() => setActiveReport('individual')} className="hover:bg-hoverCustom transition-colors cursor-pointer border-borderCustom bg-card group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-bold text-foregroundCustom">Ficha Individual</CardTitle>
            <Activity className="h-5 w-5 text-muted-foreground group-hover:text-highlight transition-colors" />
          </CardHeader>
          <CardContent>
            <CardDescription className="text-muted-foreground">
              Histórico detalhado do aluno, contendo ocorrências e atestados médicos.
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
