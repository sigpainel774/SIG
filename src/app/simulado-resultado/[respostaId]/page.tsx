'use client'

import { useState, use } from 'react'
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Printer,
  GraduationCap,
  Trophy,
  Award,
  Globe,
  FileSpreadsheet,
  Lock,
  ArrowRight,
  RefreshCw,
  LogOut
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast, Toaster } from 'sonner'

interface SimuladoResultadoPageProps {
  params: Promise<{ respostaId: string }>
}

export default function SimuladoResultadoPage({ params }: SimuladoResultadoPageProps) {
  const resolvedParams = use(params)
  const respostaId = resolvedParams.respostaId

  // Estado de Autenticação
  const [cpfInput, setCpfInput] = useState('')
  const [dataNascInput, setDataNascInput] = useState('')
  const [autenticando, setAutenticando] = useState(false)
  const [erroAuth, setErroAuth] = useState<string | null>(null)

  // Dados do Resultado Desbloqueado
  const [dadosResultado, setDadosResultado] = useState<any | null>(null)

  // Máscara simples de CPF
  const handleCpfChange = (valor: string) => {
    const digitos = valor.replace(/\D/g, '').slice(0, 11)
    let formatado = digitos
    if (digitos.length > 9) {
      formatado = `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`
    } else if (digitos.length > 6) {
      formatado = `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6)}`
    } else if (digitos.length > 3) {
      formatado = `${digitos.slice(0, 3)}.${digitos.slice(3)}`
    }
    setCpfInput(formatado)
  }

  // Validação de acesso via API
  const handleAutenticar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErroAuth(null)

    if (!cpfInput.trim() || !dataNascInput.trim()) {
      setErroAuth('Por favor, preencha seu CPF e data de nascimento.')
      return
    }

    setAutenticando(true)
    try {
      const res = await fetch('/api/simulados/validar-acesso-aluno', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          respostaId,
          cpf: cpfInput,
          dataNascimento: dataNascInput
        })
      })

      const data = await res.json()

      if (!res.ok || !data.sucesso) {
        setErroAuth(data.error || 'Credenciais inválidas. Verifique os dados digitados.')
        return
      }

      setDadosResultado(data)
      toast.success('Acesso liberado com sucesso!')
    } catch (err) {
      console.error('Erro na autenticação:', err)
      setErroAuth('Falha ao conectar com o servidor. Tente novamente.')
    } finally {
      setAutenticando(false)
    }
  }

  const handleImprimir = () => {
    if (typeof window !== 'undefined') {
      window.print()
    }
  }

  const handleSair = () => {
    setDadosResultado(null)
    setCpfInput('')
    setDataNascInput('')
    setErroAuth(null)
  }

  // TELA 1: AUTENTICAÇÃO DO ALUNO VIA CPF E DATA DE NASCIMENTO
  if (!dadosResultado) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 sm:p-6">
        <Toaster position="top-center" richColors />

        <div className="w-full max-w-md space-y-6">
          {/* Logo / Cabeçalho */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-sm border border-emerald-500/20">
              <GraduationCap className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-extrabold text-foreground tracking-tight">
              Portal do Estudante • Cursinho
            </h1>
            <p className="text-xs text-muted-foreground">
              Consulta individual de espelho de prova e desempenho de simulado.
            </p>
          </div>

          {/* Card de Autenticação */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-md space-y-5">
            <div className="flex items-center gap-2.5 pb-2 border-b border-border">
              <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-sm font-bold text-foreground">
                Confirmação de Acesso Seguro
              </h2>
            </div>

            <p className="text-xs text-muted-foreground">
              Para proteger sua privacidade e acessar seu cartão de respostas, confirme seus dados:
            </p>

            {erroAuth && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-xs text-rose-600 dark:text-rose-400">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{erroAuth}</span>
              </div>
            )}

            <form onSubmit={handleAutenticar} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">CPF do Estudante</Label>
                <Input
                  value={cpfInput}
                  onChange={(e) => handleCpfChange(e.target.value)}
                  placeholder="000.000.000-00"
                  required
                  className="bg-background border-border text-xs font-mono h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Data de Nascimento</Label>
                <Input
                  type="date"
                  value={dataNascInput}
                  onChange={(e) => setDataNascInput(e.target.value)}
                  required
                  className="bg-background border-border text-xs h-10"
                />
              </div>

              <Button
                type="submit"
                disabled={autenticando}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 text-xs h-10 shadow-sm"
              >
                {autenticando ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Verificando Dados...
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4" /> Acessar Meu Resultado
                  </>
                )}
              </Button>
            </form>

            <div className="pt-2 text-center text-[11px] text-muted-foreground">
              Em caso de dúvidas sobre seu CPF ou data cadastrados, entre em contato com a coordenação pedagógica.
            </div>
          </div>
        </div>
      </div>
    )
  }

  // TELA 2: ESPELHO DA PROVA E DESEMPENHO LIBERADOS
  const { aluno, simulado, desempenho, detalhesQuestoes } = dadosResultado

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
      <Toaster position="top-center" richColors />

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Barra de Topo com Ações (oculta na impressão) */}
        <div className="flex items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {simulado.escolaNome}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleImprimir}
              className="text-xs font-bold gap-1.5 border-border shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 text-blue-500" /> Imprimir / Salvar PDF
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSair}
              className="text-xs font-bold gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-3.5 h-3.5" /> Sair
            </Button>
          </div>
        </div>

        {/* Card Principal de Identificação da Prova e do Aluno */}
        <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-border pb-4">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                Espelho Oficial de Correção
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                {simulado.titulo}
              </h1>
              <p className="text-xs text-muted-foreground">
                Ano Letivo {simulado.anoLetivo} • Aplicação: {simulado.dataAplicacao ? new Date(simulado.dataAplicacao + 'T00:00:00').toLocaleDateString('pt-BR') : 'Data não informada'}
              </p>
            </div>

            <div className="text-right sm:text-right">
              <span className="text-[11px] text-muted-foreground block">Desempenho Geral</span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                {desempenho.notaFinal.toFixed(1)}{' '}
                <span className="text-xs font-bold text-muted-foreground">/ 10.0</span>
              </div>
            </div>
          </div>

          {/* Dados do Estudante */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-muted/40 rounded-xl border border-border">
              <span className="text-[10px] text-muted-foreground block font-medium">Estudante</span>
              <span className="font-extrabold text-foreground text-sm block truncate">
                {aluno.nome}
              </span>
              {aluno.numeroMatricula && (
                <span className="text-[11px] text-muted-foreground">
                  Matrícula: {aluno.numeroMatricula}
                </span>
              )}
            </div>

            <div className="p-3 bg-muted/40 rounded-xl border border-border">
              <span className="text-[10px] text-muted-foreground block font-medium">Turma</span>
              <span className="font-extrabold text-foreground text-sm block">
                {aluno.turma || 'Cursinho Regular'}
              </span>
              <span className="text-[11px] text-muted-foreground">
                Total de {simulado.qtdQuestoes} Questões
              </span>
            </div>

            <div className="p-3 bg-muted/40 rounded-xl border border-border">
              <span className="text-[10px] text-muted-foreground block font-medium">Língua Estrangeira</span>
              {aluno.linguaEstrangeira ? (
                <span className="font-extrabold text-foreground text-sm flex items-center gap-1.5 pt-0.5">
                  <Globe className="w-3.5 h-3.5 text-blue-500" />
                  {aluno.linguaEstrangeira === 'espanhol' ? '🇪🇸 Espanhol' : '🇬🇧 Inglês'}
                </span>
              ) : (
                <span className="font-bold text-muted-foreground text-xs block pt-0.5">
                  Não aplicável
                </span>
              )}
              {simulado.possuiLinguaEstrangeira && (
                <span className="text-[11px] text-muted-foreground">
                  Questões {simulado.linguaInicio || 1} a {simulado.linguaFim || 5}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Cards de Métricas e KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 bg-card border border-border rounded-2xl text-center space-y-1">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
              Total de Acertos
            </span>
            <span className="text-2xl font-black text-foreground">
              {desempenho.totalAcertos}{' '}
              <span className="text-xs font-bold text-muted-foreground">/ {simulado.qtdQuestoes}</span>
            </span>
          </div>

          <div className="p-4 bg-card border border-border rounded-2xl text-center space-y-1">
            <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
              Total de Erros
            </span>
            <span className="text-2xl font-black text-foreground">
              {desempenho.totalErros}
            </span>
          </div>

          <div className="p-4 bg-card border border-border rounded-2xl text-center space-y-1">
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
              Aproveitamento
            </span>
            <span className="text-2xl font-black text-foreground">
              {desempenho.percentualAcerto}%
            </span>
          </div>

          <div className="p-4 bg-card border border-border rounded-2xl text-center space-y-1">
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
              Em Branco / Anuladas
            </span>
            <span className="text-2xl font-black text-foreground">
              {desempenho.totalEmBranco + desempenho.totalAnuladas}
            </span>
          </div>
        </div>

        {/* Espelho de Questões Detalhado */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Detalhamento Questão por Questão
            </h3>
            <div className="flex items-center gap-3 text-[11px] font-bold">
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> Acertou
              </span>
              <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                <XCircle className="w-3.5 h-3.5" /> Errou
              </span>
            </div>
          </div>

          {/* Tabela do Espelho */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-muted/60 border-b border-border text-[11px] font-black text-foreground uppercase">
                  <th className="py-2.5 px-3">Questão</th>
                  <th className="py-2.5 px-3">Tipo / Disciplina</th>
                  <th className="py-2.5 px-3 text-center">Sua Resposta</th>
                  <th className="py-2.5 px-3 text-center">Gabarito Oficial</th>
                  <th className="py-2.5 px-3 text-right">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {detalhesQuestoes.map((d: any) => {
                  const acertou = d.acertou
                  const isBranco = d.respostaAluno === 'BRANCO'
                  const isAnulada = d.isAnuladaOficial || d.respostaCorreta === 'ANULADA'

                  return (
                    <tr
                      key={d.questao}
                      className={`hover:bg-muted/30 transition-colors ${
                        acertou ? 'bg-emerald-500/5' : 'bg-rose-500/5'
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono font-black text-foreground">
                        Questão {d.questao < 10 ? `0${d.questao}` : d.questao}
                      </td>

                      <td className="py-2.5 px-3 text-muted-foreground">
                        {d.isLinguaEstrangeira ? (
                          <Badge variant="outline" className="text-[10px] font-bold border-blue-500/30 text-blue-600 dark:text-blue-400 gap-1 bg-blue-500/10">
                            <Globe className="w-3 h-3" />
                            {d.linguaAplicada === 'espanhol' ? 'Espanhol' : 'Inglês'}
                          </Badge>
                        ) : (
                          <span>Geral</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-center font-bold">
                        {isBranco ? (
                          <span className="text-muted-foreground italic text-[11px]">(Em branco)</span>
                        ) : (
                          <span
                            className={`inline-block w-6 h-6 rounded-full text-center leading-6 text-white font-extrabold text-[11px] ${
                              acertou ? 'bg-emerald-600' : 'bg-rose-600'
                            }`}
                          >
                            {d.respostaAluno}
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-center font-bold">
                        {isAnulada ? (
                          <Badge variant="secondary" className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30">
                            ANULADA
                          </Badge>
                        ) : (
                          <span className="inline-block w-6 h-6 rounded-full text-center leading-6 bg-muted text-foreground border border-border font-extrabold text-[11px]">
                            {d.respostaCorreta}
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        {isAnulada ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                            Pontuada (Anulada)
                          </span>
                        ) : acertou ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Correta (+1.0)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                            <XCircle className="w-3.5 h-3.5" /> Incorreta
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rodapé Informativo */}
        <div className="text-center text-xs text-muted-foreground py-4 border-t border-border">
          {simulado.escolaNome} • Sistema de Gestão Escolar e Pré-Vestibular SIG
        </div>
      </div>
    </div>
  )
}
