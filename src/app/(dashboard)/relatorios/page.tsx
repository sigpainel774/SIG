'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Printer, FileText, UserCheck, Activity, GraduationCap } from 'lucide-react'
import { PrintBoletim } from '@/components/print/print-boletim'
import { PrintFicha } from '@/components/print/print-ficha'

export default function RelatoriosPage() {
  const [activeReport, setActiveReport] = useState<string | null>(null)

  if (activeReport) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between no-print pb-2 border-b border-borderCustom">
          <Button variant="ghost" onClick={() => setActiveReport(null)} className="text-foregroundCustom hover:bg-hoverCustom gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar aos Relatórios
          </Button>
        </div>

        {activeReport === 'boletim' && <PrintBoletim />}
        {activeReport === 'individual' && <PrintFicha />}
        {activeReport === 'frequencia' && (
          <div className="bg-white text-black p-8 rounded-xl max-w-4xl mx-auto space-y-4 font-sans">
            <div className="flex justify-between items-center no-print border-b pb-4">
              <h2 className="text-lg font-bold text-slate-800">Relatório de Frequência Escolar</h2>
              <Button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2">
                <Printer className="w-4 h-4" /> Imprimir (A4)
              </Button>
            </div>
            <div className="border border-black p-4 text-xs space-y-3">
              <h1 className="text-center font-bold text-sm uppercase">Prefeitura Municipal de Sapeaçu — Diário de Frequência</h1>
              <p className="text-center text-xs text-gray-600">Turma: 9º Ano A - Matutino | Mês: Julho/2026</p>
              <table className="w-full border-collapse border border-black text-center text-xs">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border border-black p-1">Aluno</th>
                    <th className="border border-black p-1">Dias Letivos</th>
                    <th className="border border-black p-1">Presenças</th>
                    <th className="border border-black p-1">Faltas</th>
                    <th className="border border-black p-1">% Frequência</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-black p-1 text-left font-bold">João Silva</td>
                    <td className="border border-black p-1">20</td>
                    <td className="border border-black p-1 font-mono text-emerald-700">18</td>
                    <td className="border border-black p-1 font-mono text-rose-700">2</td>
                    <td className="border border-black p-1 font-bold">90%</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1 text-left font-bold">Maria Santos</td>
                    <td className="border border-black p-1">20</td>
                    <td className="border border-black p-1 font-mono text-emerald-700">20</td>
                    <td className="border border-black p-1 font-mono text-rose-700">0</td>
                    <td className="border border-black p-1 font-bold">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
          <FileText className="w-8 h-8 text-highlight" />
          Central de Relatórios & Documentos Oficiais
        </h1>
        <p className="text-muted-foreground mt-1">
          Emissão de Boletins, Fichas Cadastrais e Diários de Frequência formatados para impressão A4.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card onClick={() => setActiveReport('boletim')} className="hover:bg-hoverCustom transition-colors cursor-pointer border-borderCustom bg-[#121212] group p-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-bold text-white group-hover:text-highlight transition-colors">
              Boletim Escolar Oficial
            </CardTitle>
            <GraduationCap className="h-6 w-6 text-muted-foreground group-hover:text-highlight transition-colors" />
          </CardHeader>
          <CardContent>
            <CardDescription className="text-muted-foreground">
              Boletim completo com notas bimestrais, médias e situação final formatado para impressão A4 Paisagem.
            </CardDescription>
          </CardContent>
        </Card>

        <Card onClick={() => setActiveReport('individual')} className="hover:bg-hoverCustom transition-colors cursor-pointer border-borderCustom bg-[#121212] group p-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-bold text-white group-hover:text-highlight transition-colors">
              Ficha Individual Cadastral
            </CardTitle>
            <Activity className="h-6 w-6 text-muted-foreground group-hover:text-highlight transition-colors" />
          </CardHeader>
          <CardContent>
            <CardDescription className="text-muted-foreground">
              Ficha oficial do aluno com foto 3x4, filiação, CPF, INEP e endereço formatada para impressão A4 Retrato.
            </CardDescription>
          </CardContent>
        </Card>

        <Card onClick={() => setActiveReport('frequencia')} className="hover:bg-hoverCustom transition-colors cursor-pointer border-borderCustom bg-[#121212] group p-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-bold text-white group-hover:text-highlight transition-colors">
              Diário de Frequência
            </CardTitle>
            <UserCheck className="h-6 w-6 text-muted-foreground group-hover:text-highlight transition-colors" />
          </CardHeader>
          <CardContent>
            <CardDescription className="text-muted-foreground">
              Relatório de presença e porcentagem de assiduidade mensal por turma.
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
