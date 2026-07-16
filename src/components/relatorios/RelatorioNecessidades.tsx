'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { useSchoolStore } from '@/store/useSchoolStore'
import { useAuthStore } from '@/store/useAuthStore'
import { 
  ShieldAlert, 
  Printer, 
  Search, 
  ArrowLeft, 
  Users, 
  FileText, 
  UserCheck, 
  Heart, 
  AlertTriangle,
  Building,
  GraduationCap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface RelatorioNecessidadesProps {
  selectedEscola: any
}

export default function RelatorioNecessidades({ selectedEscola }: RelatorioNecessidadesProps) {
  const { escolas } = useSchoolStore()
  const { funcionario, acessos } = useAuthStore()
  const supabase = createClient()

  // Permissão: Nível 1, Superadmin ou pode_alunos
  const isAuthorized = 
    funcionario?.is_superadmin || 
    acessos.some(a => a.nivel === 1) || 
    acessos.some(a => a.pode_alunos)

  // Estados
  const [alunos, setAlunos] = useState<any[]>([])
  const [turmas, setTurmas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>('todos')
  
  // Visualização de Ficha
  const [selectedAluno, setSelectedAluno] = useState<any | null>(null)
  const [cuidadorNome, setCuidadorNome] = useState('')

  // Efeito para carregar dados
  useEffect(() => {
    async function fetchData() {
      if (!isAuthorized) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)
      try {
        // Carrega as turmas se houver escola selecionada
        if (selectedEscola) {
          const { data: dataTurmas, error: errTurmas } = await supabase
            .from('turmas')
            .select('id, nome')
            .eq('escola_id', selectedEscola.id)
            .is('deleted_at', null)
          
          if (errTurmas) throw errTurmas
          setTurmas(dataTurmas || [])
        }

        // Carrega alunos
        let query = (supabase
          .from('alunos') as any)
          .select(`
            id,
            nome,
            escola_id,
            turma_id,
            numero_matricula,
            data_nascimento,
            dados_matricula,
            escolas (nome),
            turmas (nome)
          `)
          .is('deleted_at', null)

        if (selectedEscola) {
          query = query.eq('escola_id', selectedEscola.id)
        }

        const { data: dataAlunos, error: errAlunos } = await query
        if (errAlunos) throw errAlunos

        // Filtra alunos que possuem NEE ou Deficiências marcadas na anamnese
        const alunosFiltrados = (dataAlunos || []).filter((aluno: any) => {
          const dm = aluno.dados_matricula as any || {}
          return dm.neeAluno === 'Sim' || dm.deficienciaAluno === 'Sim'
        })

        setAlunos(alunosFiltrados)
      } catch (err: any) {
        console.error('Erro ao buscar dados de necessidades especiais:', err)
        setError('Ocorreu um erro ao carregar as informações do banco de dados.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [selectedEscola, isAuthorized])

  // Limpa o cuidador ao trocar de aluno
  useEffect(() => {
    setCuidadorNome('')
  }, [selectedAluno])

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center border border-destructive/20 rounded-2xl bg-destructive/5 py-12 px-6 text-center shadow-sm">
        <ShieldAlert className="w-12 h-12 text-destructive mb-4" />
        <h3 className="text-lg font-bold text-foreground mb-2">Acesso Restrito</h3>
        <p className="text-muted-foreground max-w-md text-sm">
          Este relatório contém informações sensíveis de saúde protegidas pela LGPD (Lei Geral de Proteção de Dados). Seu perfil não possui permissões necessárias para acessar estes dados.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-muted-foreground animate-pulse bg-card border border-border rounded-2xl">
        <span className="text-sm font-semibold">Carregando relatório de necessidades especiais...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 border border-rose-500/20 bg-rose-500/5 rounded-2xl text-center">
        <p className="text-rose-400 font-semibold text-sm">{error}</p>
      </div>
    )
  }

  // --- VISÃO INDIVIDUAL (FICHA DO ALUNO) ---
  if (selectedAluno) {
    const dm = selectedAluno.dados_matricula as any || {}
    const neeLista = dm.neeSelecionadas || []
    const defLista = dm.deficienciasSelecionadas || []

    return (
      <div className="space-y-6">
        {/* Barra de Ações (Ficha Individual) */}
        <div className="flex items-center justify-between no-print pb-2 border-b border-border">
          <Button 
            variant="ghost" 
            onClick={() => setSelectedAluno(null)} 
            className="text-muted-foreground hover:bg-hoverCustom gap-2 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para a Lista
          </Button>

          <Button
            onClick={() => window.print()}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl gap-2 shadow-sm cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Imprimir Ficha (A4)
          </Button>
        </div>

        {/* Ficha para Impressão */}
        <div className="print-portal-container bg-card border border-border rounded-2xl p-8 max-w-4xl mx-auto shadow-md space-y-8 text-foreground print:border-none print:shadow-none print:p-0">
          
          {/* Cabeçalho do Relatório */}
          <div className="flex justify-between items-start border-b border-border pb-6">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full no-print">
                Fase 1 - Homologação
              </span>
              <h2 className="text-2xl font-black mt-2">RELATÓRIO DE NECESSIDADES ESPECIAIS (AEE)</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Secretaria Municipal de Educação e Cultura • Unidade: {selectedAluno.escolas?.nome || 'Não informada'}
              </p>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p>Gerado em: {new Date().toLocaleDateString('pt-BR')}</p>
              <p>Perfil: {funcionario?.nome ?? 'Servidor'}</p>
            </div>
          </div>

          {/* Identificação do Aluno */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-surface-1/50 p-4 rounded-xl border border-border/50">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold">Aluno</p>
              <p className="font-bold text-base text-foreground">{selectedAluno.nome}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold">Turma</p>
              <p className="font-bold text-base text-foreground">{selectedAluno.turmas?.nome || 'Não Enturmado'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold">Data de Nascimento</p>
              <p className="font-semibold text-sm text-foreground">
                {selectedAluno.data_nascimento 
                  ? new Date(selectedAluno.data_nascimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) 
                  : 'Não cadastrada'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold">Matrícula</p>
              <p className="font-mono text-sm text-foreground">{selectedAluno.numero_matricula ?? 'N/D'}</p>
            </div>
          </div>

          {/* Diagnóstico / Condição */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary border-b border-border pb-1">
              1. Diagnóstico / Condição
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Possui Deficiência?</p>
                <p className="font-semibold text-sm text-foreground">{dm.deficienciaAluno || 'Não'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Necessidades Educacionais Especiais (NEE)?</p>
                <p className="font-semibold text-sm text-foreground">{dm.neeAluno || 'Não'}</p>
              </div>
            </div>
            {defLista.length > 0 && (
              <div className="mt-2 bg-surface-1 p-3 rounded-lg border border-border">
                <p className="text-xs text-muted-foreground font-semibold mb-1">Deficiências Informadas:</p>
                <div className="flex flex-wrap gap-1.5">
                  {defLista.map((def: string, i: number) => (
                    <span key={i} className="text-xs bg-card border border-border px-2 py-0.5 rounded-md text-foreground font-medium">
                      {def}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {neeLista.length > 0 && (
              <div className="mt-2 bg-surface-1 p-3 rounded-lg border border-border">
                <p className="text-xs text-muted-foreground font-semibold mb-1">Necessidades Especiais Selecionadas:</p>
                <div className="flex flex-wrap gap-1.5">
                  {neeLista.map((nee: string, i: number) => (
                    <span key={i} className="text-xs bg-card border border-border px-2 py-0.5 rounded-md text-foreground font-medium">
                      {nee}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Saúde e Cuidados */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary border-b border-border pb-1">
              2. Saúde e Cuidados
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Diabete?</p>
                <p className="font-semibold text-sm text-foreground">{dm.diabeteAluno || 'Não'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Convulsões?</p>
                <p className="font-semibold text-sm text-foreground">{dm.convulsoesAluno || 'Não'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Asma?</p>
                <p className="font-semibold text-sm text-foreground">{dm.asmaAluno || 'Não'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Restrição a Exercícios?</p>
                <p className="font-semibold text-sm text-foreground">{dm.restricaoExercicioAluno || 'Não'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div className="bg-surface-1 p-3 rounded-lg border border-border">
                <p className="text-xs text-muted-foreground font-bold">Alergias Alimentares / Restrições:</p>
                <p className="text-xs text-foreground mt-1 font-semibold">Restrição: {dm.restricaoAlimentarAluno || 'Não'}</p>
                {dm.restricaoAlimentarAluno === 'Sim' && dm.restricaoAlimentarQuaisAluno && (
                  <p className="text-xs text-muted-foreground mt-1 italic">Quais: {dm.restricaoAlimentarQuaisAluno}</p>
                )}
              </div>
              <div className="bg-surface-1 p-3 rounded-lg border border-border">
                <p className="text-xs text-muted-foreground font-bold">Alergias a Medicamentos:</p>
                <p className="text-xs text-foreground mt-1 font-semibold">Alergia: {dm.alergiaMedAluno || 'Não'}</p>
                {dm.alergiaMedAluno === 'Sim' && dm.alergiaMedQuaisAluno && (
                  <p className="text-xs text-muted-foreground mt-1 italic">Quais: {dm.alergiaMedQuaisAluno}</p>
                )}
              </div>
            </div>

            {dm.restricoesSaudeAluno && (
              <div className="bg-surface-1 p-3 rounded-lg border border-border">
                <p className="text-xs text-muted-foreground font-bold">Observações / Restrições de Saúde Gerais:</p>
                <p className="text-xs text-foreground mt-1 font-medium whitespace-pre-wrap">{dm.restricoesSaudeAluno}</p>
              </div>
            )}
          </div>

          {/* Contatos de Emergência */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary border-b border-border pb-1">
              3. Contatos de Emergência
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground font-bold">Mãe / Responsável</p>
                <p className="text-sm font-semibold">{dm.maeAluno ?? 'Não informado'}</p>
                {dm.telMaeAluno && <p className="text-xs text-muted-foreground font-mono">{dm.telMaeAluno}</p>}
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-bold">Pai / Responsável</p>
                <p className="text-sm font-semibold">{dm.paiAluno ?? 'Não informado'}</p>
                {dm.telPaiAluno && <p className="text-xs text-muted-foreground font-mono">{dm.telPaiAluno}</p>}
              </div>
            </div>
          </div>

          {/* AEE & Cuidador Escolar */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary border-b border-border pb-1">
              4. Acompanhamento Pedagógico / Cuidador Escolar
            </h3>
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 space-y-3">
              <div className="no-print flex items-center justify-between">
                <span className="text-[10px] text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Integração Futura (Fase 2)
                </span>
                <span className="text-xs text-muted-foreground">O dado inserido abaixo não será persistido no banco de dados</span>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground">Cuidador(a) Escolar Responsável:</label>
                <Input 
                  placeholder="Digite o nome do cuidador(a) escolar para constar na impressão"
                  value={cuidadorNome}
                  onChange={(e) => cuReport(e.target.value)}
                  className="bg-card border-border rounded-xl no-print text-sm"
                />
                
                {/* Exibição física para impressão */}
                <div className="hidden print:block border-b border-dashed border-foreground/50 pb-1 mt-2">
                  <p className="text-sm">
                    <strong>Cuidador(a) Escolar:</strong> {cuidadorNome || '__________________________________________________'}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1 italic">
                    (Vínculo manual temporário da Fase 1 - cadastro estruturado em desenvolvimento)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Rodapé da Ficha */}
          <div className="pt-8 border-t border-border flex justify-between items-center text-[10px] text-muted-foreground">
            <p><strong>LGPD:</strong> Este documento contém dados sensíveis. O manuseio deve ser restrito a profissionais autorizados.</p>
            <p>SIG - Sistema Integrado de Gestão Escolar</p>
          </div>
        </div>
      </div>
    )
  }

  // Auxiliar para tratar mudança de cuidador
  function cuReport(val: string) {
    setCuidadorNome(val)
  }

  // --- VISÃO ESCOLA SELECIONADA ---
  if (selectedEscola) {
    // Filtragem local
    const filteredAlunos = alunos.filter(aluno => {
      const matchesSearch = aluno.nome.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesTurma = selectedTurmaId === 'todos' || aluno.turma_id === selectedTurmaId
      return matchesSearch && matchesTurma
    })

    return (
      <div className="space-y-6">
        {/* Banner de Aviso de Desenvolvimento */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5 md:mt-0" />
            <div>
              <h4 className="font-bold text-foreground text-sm flex items-center gap-2">
                Módulo em Desenvolvimento (Fase 1)
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                Os dados de Necessidades Especiais abaixo são puxados automaticamente da <strong>Anamnese de Matrícula</strong> dos alunos.
                O cadastro e vínculo de Cuidadores Escolares (Fase 2) está em desenvolvimento.
              </p>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-card border border-border rounded-2xl p-4 md:p-6 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input 
              placeholder="Buscar aluno por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-surface-1 border-border rounded-xl text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-xs text-muted-foreground font-semibold whitespace-nowrap">Turma:</span>
              <select
                value={selectedTurmaId}
                onChange={(e) => setSelectedTurmaId(e.target.value)}
                className="bg-surface-1 border border-border rounded-xl text-xs px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-full md:w-40"
              >
                <option value="todos">Todas as Turmas</option>
                {turmas.map(t => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Listagem de Alunos */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 md:p-5 border-b border-border flex justify-between items-center">
            <h3 className="font-bold text-foreground text-sm uppercase tracking-wider">
              Alunos com Necessidades Especiais ({filteredAlunos.length})
            </h3>
          </div>

          {filteredAlunos.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <p className="text-sm font-semibold">Nenhum aluno com necessidades especiais encontrado nesta unidade.</p>
              <p className="text-xs text-muted-foreground mt-1">Verifique se os dados de anamnese na Ficha de Matrícula foram preenchidos corretamente.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-muted-foreground">
                <thead className="bg-surface-1 text-muted-foreground uppercase text-[10px] tracking-wider font-bold">
                  <tr>
                    <th className="p-4">Aluno</th>
                    <th className="p-4">Turma</th>
                    <th className="p-4">Deficiências Cadastradas</th>
                    <th className="p-4">Necessidades (NEE)</th>
                    <th className="p-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredAlunos.map((aluno) => {
                    const dm = aluno.dados_matricula as any || {}
                    const defs = dm.deficienciasSelecionadas || []
                    const nees = dm.neeSelecionadas || []

                    return (
                      <tr key={aluno.id} className="hover:bg-hoverCustom transition-colors">
                        <td className="p-4 font-bold text-foreground">{aluno.nome}</td>
                        <td className="p-4 font-semibold">{aluno.turmas?.nome || 'Sem turma'}</td>
                        <td className="p-4">
                          {defs.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {defs.map((d: string, i: number) => (
                                <span key={i} className="bg-amber-500/10 text-amber-300 border border-amber-500/20 px-1.5 py-0.5 rounded text-[10px]">
                                  {d}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">Nenhuma marcada</span>
                          )}
                        </td>
                        <td className="p-4">
                          {nees.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {nees.map((n: string, i: number) => (
                                <span key={i} className="bg-sky-500/10 text-sky-300 border border-sky-500/20 px-1.5 py-0.5 rounded text-[10px]">
                                  {n}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">Nenhuma marcada</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <Button
                            variant="outline"
                            onClick={() => setSelectedAluno(aluno)}
                            className="bg-secondary border-border hover:bg-hoverCustom text-foreground text-xs rounded-lg px-2.5 py-1 flex items-center gap-1.5"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Visualizar Ficha
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    )
  }

  // --- VISÃO CONSOLIDADA DA REDE (Macro / Sem Escola Selecionada) ---
  
  // Agrupa os alunos por escola
  const consolidadoEscolas = escolas.map((esc: any) => {
    const alunosDaEscola = alunos.filter(a => a.escola_id === esc.id)
    return {
      id: esc.id,
      nome: esc.nome,
      color: esc.color || 'bg-slate-500',
      totalNee: alunosDaEscola.length
    }
  })

  // Estatística de tipos de NEE/Deficiências mais comuns na rede
  const statDefs: { [key: string]: number } = {}
  const statNees: { [key: string]: number } = {}

  alunos.forEach(aluno => {
    const dm = aluno.dados_matricula as any || {}
    const defs = dm.deficienciasSelecionadas || []
    const nees = dm.neeSelecionadas || []
    
    defs.forEach((d: string) => { statDefs[d] = (statDefs[d] || 0) + 1 })
    nees.forEach((n: string) => { statNees[n] = (statNees[n] || 0) + 1 })
  })

  const topDefs = Object.entries(statDefs).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const topNees = Object.entries(statNees).sort((a, b) => b[1] - a[1]).slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Banner de Desenvolvimento / Modo Macro */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5 md:mt-0" />
          <div>
            <h4 className="font-bold text-foreground text-sm">
              Módulo de Necessidades Especiais — Consolidado da Rede (Fase 1)
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
              Esta é a visão macro da rede de ensino (Sapeaçu). Selecione uma escola específica no cabeçalho do sistema para acessar, filtrar e emitir a Ficha de AEE individual de cada estudante.
            </p>
          </div>
        </div>
      </div>

      {/* Métricas Consolidadas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-card border border-border p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold">Total com Necessidades Especiais</p>
            <p className="text-2xl font-black text-foreground mt-0.5">{alunos.length}</p>
          </div>
        </div>

        <div className="bg-card border border-border p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <Heart className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold">Casos com Deficiência</p>
            <p className="text-2xl font-black text-foreground mt-0.5">
              {alunos.filter(a => (a.dados_matricula as any)?.deficienciaAluno === 'Sim').length}
            </p>
          </div>
        </div>

        <div className="bg-card border border-border p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold">Casos com Apoio / NEE</p>
            <p className="text-2xl font-black text-foreground mt-0.5">
              {alunos.filter(a => (a.dados_matricula as any)?.neeAluno === 'Sim').length}
            </p>
          </div>
        </div>
      </div>

      {/* Grid de Tabelas Analíticas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Distribuição por Escolas */}
        <div className="bg-card border border-border rounded-2xl p-5 md:p-6 space-y-4">
          <h3 className="font-bold text-foreground text-sm uppercase tracking-wider flex items-center gap-2">
            <Building className="w-4 h-4 text-primary" /> Alunos por Unidade de Ensino
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-muted-foreground">
              <thead className="bg-surface-1 text-muted-foreground uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th className="p-3 rounded-l-lg">Escola</th>
                  <th className="p-3 text-right rounded-r-lg">Alunos com NEE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {consolidadoEscolas.map((esc) => (
                  <tr key={esc.id} className="hover:bg-hoverCustom transition-colors">
                    <td className="p-3 font-semibold text-foreground flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${esc.color}`} />
                      {esc.nome}
                    </td>
                    <td className="p-3 font-mono text-right font-bold text-foreground">{esc.totalNee}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Distribuição por Categorias */}
        <div className="bg-card border border-border rounded-2xl p-5 md:p-6 space-y-6">
          
          {/* Top Deficiências */}
          <div className="space-y-3">
            <h3 className="font-bold text-foreground text-sm uppercase tracking-wider flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-amber-500" /> Deficiências mais Comuns
            </h3>
            {topDefs.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Nenhum registro no censo local.</p>
            ) : (
              <div className="space-y-2">
                {topDefs.map(([def, count], i) => (
                  <div key={i} className="flex justify-between items-center bg-surface-1 p-2.5 rounded-xl border border-border">
                    <span className="text-xs font-semibold text-foreground">{def}</span>
                    <span className="text-xs font-mono font-bold bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-lg border border-amber-500/20">
                      {count} {count === 1 ? 'aluno' : 'alunos'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top NEEs */}
          <div className="space-y-3">
            <h3 className="font-bold text-foreground text-sm uppercase tracking-wider flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-sky-500" /> Necessidades Especiais mais Comuns
            </h3>
            {topNees.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Nenhum registro no censo local.</p>
            ) : (
              <div className="space-y-2">
                {topNees.map(([nee, count], i) => (
                  <div key={i} className="flex justify-between items-center bg-surface-1 p-2.5 rounded-xl border border-border">
                    <span className="text-xs font-semibold text-foreground">{nee}</span>
                    <span className="text-xs font-mono font-bold bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded-lg border border-sky-500/20">
                      {count} {count === 1 ? 'aluno' : 'alunos'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
