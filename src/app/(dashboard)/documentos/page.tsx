'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { useEditModeStore } from '@/store/useEditModeStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { IconTile } from '@/components/ui/icon-tile'
import { 
  FileText, 
  Search, 
  ArrowLeft, 
  Printer, 
  UserCheck, 
  GraduationCap, 
  Award,
  FileCheck,
  FileSpreadsheet,
  Loader2,
  X
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

// Import de componentes de impressão
import { PrintComprovanteMatricula } from '@/components/print/print-comprovante-matricula'
import { PrintFichaAluno } from '@/components/print/print-ficha-aluno'
import { PrintDocumentoEscolar } from '@/components/print/print-documento-escolar'
import { PrintBoletimAluno } from '@/components/print/print-boletim-aluno'
import { PrintBoletimSapeacu } from '@/components/print/print-boletim-sapeacu'

export default function DocumentosPage() {
  const { funcionario, vinculos, acessos, isAdminGlobalOrRoot, escolaAtivaId } = useAuthStore()
  const { isEditMode } = useEditModeStore()
  
  const [alunos, setAlunos] = useState<any[]>([])
  const [loadingAlunos, setLoadingAlunos] = useState(false)
  const [buscaAluno, setBuscaAluno] = useState('')
  const [alunoSelecionado, setAlunoSelecionado] = useState<any | null>(null)
  const [showSugestoes, setShowSugestoes] = useState(false)
  
  const [turmas, setTurmas] = useState<any[]>([])
  const [turmaFiltroId, setTurmaFiltroId] = useState<string>('all')
  
  const [docType, setDocType] = useState<string>('atestado-matricula')
  
  // Estados de gatilho para a impressão real
  const [alunoImprimirFicha, setAlunoImprimirFicha] = useState<any | null>(null)
  const [alunoImprimirComprovante, setAlunoImprimirComprovante] = useState<any | null>(null)
  const [alunoImprimirDocumentoEscolar, setAlunoImprimirDocumentoEscolar] = useState<any | null>(null)
  const [alunoImprimirBoletim, setAlunoImprimirBoletim] = useState<any | null>(null)
  const [alunoImprimirBoletimSapeacu, setAlunoImprimirBoletimSapeacu] = useState<any | null>(null)
  const [boletimData, setBoletimData] = useState<{
    turma: any
    escolaNome: string
    escolaLogoUrl?: string | null
    materias: any[]
    notas: any[]
    recuperacoes: any[]
  } | null>(null)
  const [loadingBoletim, setLoadingBoletim] = useState(false)
  const [tokenDocumentoExistente, setTokenDocumentoExistente] = useState<string | null>(null)
  const [verificandoHistorico, setVerificandoHistorico] = useState(false)
  const [usarHistorico, setUsarHistorico] = useState(false)

  const autocompleteRef = useRef<HTMLDivElement>(null)

  // Função para normalizar strings para busca sem acentos
  const normalizeString = (str: string) => {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
  }

  const dataNascimentoFormatada = (() => {
    if (!alunoSelecionado?.data_nascimento) return 'Não informada'
    const parts = alunoSelecionado.data_nascimento.split('-')
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    return new Date(alunoSelecionado.data_nascimento).toLocaleDateString('pt-BR')
  })()

  // Clique fora do autocomplete fecha as sugestões
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
        setShowSugestoes(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Carregar turmas da escola ativa para o filtro
  useEffect(() => {
    if (!escolaAtivaId) {
      setTurmas([])
      return
    }

    const loadTurmas = async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('turmas')
        .select('id, nome, turno')
        .eq('escola_id', escolaAtivaId)
        .is('deleted_at', null)
        .order('nome', { ascending: true })

      if (error) {
        console.error('Erro ao carregar turmas:', error)
      } else if (data) {
        setTurmas(data)
      }
    }

    loadTurmas()
  }, [escolaAtivaId])

  // Buscar alunos da escola ativa
  useEffect(() => {
    if (!escolaAtivaId) {
      setAlunos([])
      return
    }

    const loadAlunos = async () => {
      setLoadingAlunos(true)
      const supabase = createClient()
      const isAdmin = isAdminGlobalOrRoot()

      let query = supabase
        .from('alunos')
        .select('*, escolas(nome), turmas(nome)')
        .is('deleted_at', null)

      // Verificação de cargos e lotação
      if (!isAdmin) {
        const isDiretor = (acessos || []).some(a => a.nivel === 2 && a.escola_id === escolaAtivaId && a.ativo) ||
          (vinculos || []).some(
            v => v.escola_id === escolaAtivaId && (v.cargo?.toUpperCase() === 'DIRETOR' || v.cargo?.toUpperCase().includes('DIRETOR'))
          )
        const isSecretario = (acessos || []).some(a => a.nivel === 3 && a.escola_id === escolaAtivaId && a.ativo) ||
          (vinculos || []).some(
            v => v.escola_id === escolaAtivaId && (v.cargo?.toUpperCase() === 'SECRETÁRIO' || v.cargo?.toUpperCase().includes('SECRET'))
          )

        if (isDiretor || isSecretario) {
          query = query.eq('escola_id', escolaAtivaId)
        } else {
          // Professor ou Coordenador: só vê alunos das suas turmas
          const { data: vTurmas } = await supabase
            .from('vinculos_turmas')
            .select('turma_id')
            .eq('funcionario_id', funcionario?.id || '')
            .eq('escola_id', escolaAtivaId)

          const ids = (vTurmas ?? []).map((vt: any) => vt.turma_id)
          if (ids.length > 0) {
            query = query.eq('escola_id', escolaAtivaId).in('turma_id', ids) as typeof query
          } else {
            setAlunos([])
            setLoadingAlunos(false)
            return
          }
        }
      } else {
        query = query.eq('escola_id', escolaAtivaId)
      }

      const { data, error } = await query.order('nome', { ascending: true })
      if (error) {
        console.error('Erro ao carregar alunos:', error)
        toast.error('Erro ao carregar lista de alunos.')
      } else if (data) {
        setAlunos(data)
      }
      setLoadingAlunos(false)
    }

    loadAlunos()
  }, [escolaAtivaId, vinculos, acessos, funcionario?.id, isAdminGlobalOrRoot])

  // Filtrar lista com base na digitação e/ou turma
  const sugestoesAlunos = alunos.filter((aluno) => {
    // Filtro por turma
    if (turmaFiltroId !== 'all' && aluno.turma_id !== turmaFiltroId) {
      return false
    }

    // Se buscaAluno estiver vazio, só mostramos se a turma estiver selecionada (como lista rápida da turma)
    if (!buscaAluno) {
      return turmaFiltroId !== 'all'
    }

    const buscaNormalizada = normalizeString(buscaAluno)
    const nomeNormalizado = normalizeString(aluno.nome || '')
    const idNormalizado = normalizeString(aluno.id || '')

    return nomeNormalizado.includes(buscaNormalizada) || idNormalizado.includes(buscaNormalizada)
  }).slice(0, 10)

  // Checar se já existe um documento emitido deste tipo para o aluno (Histórico)
  const checarHistoricoRapido = useCallback(async () => {
    if (!alunoSelecionado || !docType) {
      setTokenDocumentoExistente(null)
      return
    }

    // Apenas atestados e declaração de vaga que usam a tabela 'assinatura' genérica
    if (['atestado-matricula', 'atestado-frequencia', 'declaracao-vaga'].indexOf(docType) === -1) {
      setTokenDocumentoExistente(null)
      return
    }

    setVerificandoHistorico(true)
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('assinatura')
        .select('token_verificacao')
        .eq('aluno_id', alunoSelecionado.id)
        .eq('tipo_documento', docType)
        .order('criado_em', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (data?.token_verificacao) {
        setTokenDocumentoExistente(data.token_verificacao)
      } else {
        setTokenDocumentoExistente(null)
      }
    } catch (e) {
      console.error('Erro ao verificar histórico:', e)
    } finally {
      setVerificandoHistorico(false)
    }
  }, [alunoSelecionado, docType])

  useEffect(() => {
    checarHistoricoRapido()
  }, [checarHistoricoRapido])

  const handleEmitirDocumento = async () => {
    if (!alunoSelecionado) {
      toast.error('Por favor, selecione um aluno.')
      return
    }

    setUsarHistorico(false)
    if (docType === 'ficha-aluno') {
      setAlunoImprimirFicha(alunoSelecionado)
    } else if (docType === 'comprovante-matricula') {
      setAlunoImprimirComprovante(alunoSelecionado)
    } else if (docType === 'boletim' || docType === 'boletim-sapeacu') {
      if (!alunoSelecionado?.turma_id) {
        toast.error('Este aluno não possui vínculo com nenhuma turma. Não é possível emitir o boletim.')
        return
      }
      setLoadingBoletim(true)
      try {
        const supabase = createClient()
        
        // 1. Buscar a turma do aluno com turno e ano_letivo
        const { data: turmaData, error: tErr } = await supabase
          .from('turmas')
          .select('id, nome, turno, ano_letivo')
          .eq('id', alunoSelecionado.turma_id)
          .maybeSingle()

        if (tErr) throw tErr
        if (!turmaData) throw new Error('Turma não encontrada para o aluno.')

        // 2. Buscar escola do aluno
        const { data: escolaData, error: eErr } = await supabase
          .from('escolas')
          .select('nome, logo_url')
          .eq('id', alunoSelecionado.escola_id)
          .maybeSingle()
        if (eErr) throw eErr
        
        // 3. Buscar as matérias vinculadas a essa turma
        const { data: materiasData, error: mErr } = await supabase
          .from('materias')
          .select('id, nome, base_curricular')
          .eq('turma_id', alunoSelecionado.turma_id)

        if (mErr) throw mErr

        // 4. Buscar notas do aluno nessa turma
        const { data: notasData, error: nErr } = await supabase
          .from('notas')
          .select('materia_id, unidade, nota1, nota2, nota3')
          .eq('aluno_id', alunoSelecionado.id)
          .eq('turma_id', alunoSelecionado.turma_id)

        if (nErr) throw nErr

        // 5. Buscar recuperacoes finais do aluno
        const { data: recData, error: rErr } = await supabase
          .from('recuperacoes_finais')
          .select('materia_id, nota')
          .eq('aluno_id', alunoSelecionado.id)
          .eq('turma_id', alunoSelecionado.turma_id)

        if (rErr) throw rErr

        // Formatar notas
        const formatadasNotas = (notasData ?? []).map((n: any) => ({
          materia_id: n.materia_id,
          unidade: n.unidade,
          nota1: n.nota1 !== null && n.nota1 !== '' ? Number(n.nota1) : null,
          nota2: n.nota2 !== null && n.nota2 !== '' ? Number(n.nota2) : null,
          nota3: n.nota3 !== null && n.nota3 !== '' ? Number(n.nota3) : null
        }))

        // Formatar recuperações
        const formatadasRec = (recData ?? []).map((r: any) => ({
          materia_id: r.materia_id,
          nota: r.nota !== null && r.nota !== '' ? Number(r.nota) : null
        }))

        setBoletimData({
          turma: {
            id: turmaData.id,
            nome: turmaData.nome,
            turno: turmaData.turno,
            ano_letivo: turmaData.ano_letivo
          },
          escolaNome: escolaData?.nome || 'Escola Não Identificada',
          escolaLogoUrl: escolaData?.logo_url || null,
          materias: materiasData || [],
          notas: formatadasNotas,
          recuperacoes: formatadasRec
        })
        
        if (docType === 'boletim-sapeacu') {
          setAlunoImprimirBoletimSapeacu(alunoSelecionado)
        } else {
          setAlunoImprimirBoletim(alunoSelecionado)
        }
      } catch (err: any) {
        console.error('Erro ao carregar dados do boletim:', err)
        toast.error(`Erro ao obter dados do boletim: ${err.message}`)
      } finally {
        setLoadingBoletim(false)
      }
    } else {
      setAlunoImprimirDocumentoEscolar(alunoSelecionado)
    }
  }

  const documentOptions = [
    { id: 'atestado-matricula', label: 'Atestado de Matrícula', icon: Award, desc: 'Atesta vínculo ativo do aluno no ano letivo corrente.' },
    { id: 'atestado-frequencia', label: 'Atestado de Frequência', icon: FileCheck, desc: 'Declara frequência escolar regular do estudante.' },
    { id: 'declaracao-vaga', label: 'Declaração de Vaga', icon: GraduationCap, desc: 'Reserva/indica vaga de transferência na unidade.' },
    { id: 'comprovante-matricula', label: 'Comprovante de Matrícula', icon: FileSpreadsheet, desc: 'Recibo oficial detalhado da matrícula.' },
    { id: 'ficha-aluno', label: 'Ficha Completa do Aluno', icon: FileText, desc: 'Ficha cadastral completa com todos os dados do aluno.' },
    { id: 'boletim', label: 'Boletim Escolar', icon: FileText, desc: 'Boletim oficial de notas e frequência por unidades.' },
    { id: 'boletim-sapeacu', label: 'Boletim Sapeaçú (Anos Finais)', icon: FileText, desc: 'Boletim oficial de Anos Finais da Prefeitura de Sapeaçú editável e imprimível.' },
  ]

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Impressão overlay - Ficha do Aluno */}
      {alunoImprimirFicha && (
        <PrintFichaAluno 
          aluno={alunoImprimirFicha}
          onClose={() => setAlunoImprimirFicha(null)}
        />
      )}

      {/* Impressão overlay - Comprovante de Matrícula */}
      {alunoImprimirComprovante && (
        <PrintComprovanteMatricula 
          aluno={alunoImprimirComprovante}
          onClose={() => setAlunoImprimirComprovante(null)}
        />
      )}

      {/* Impressão overlay - Atestados escolares e declaração de vaga */}
      {alunoImprimirDocumentoEscolar && (
        <PrintDocumentoEscolar 
          aluno={alunoImprimirDocumentoEscolar}
          docType={docType as any}
          tokenExistente={usarHistorico ? tokenDocumentoExistente : null}
          onClose={() => {
            setAlunoImprimirDocumentoEscolar(null)
            checarHistoricoRapido()
          }}
        />
      )}
      {/* Impressão overlay - Boletim Escolar */}
      {alunoImprimirBoletim && boletimData && (
        <PrintBoletimAluno
          aluno={alunoImprimirBoletim}
          turma={boletimData.turma}
          escolaNome={boletimData.escolaNome}
          escolaLogoUrl={boletimData.escolaLogoUrl}
          materias={boletimData.materias}
          notas={boletimData.notas}
          recuperacoes={boletimData.recuperacoes}
          onClose={() => {
            setAlunoImprimirBoletim(null)
            setBoletimData(null)
          }}
        />
      )}

      {/* Impressão overlay - Boletim Escolar Sapeaçú */}
      {alunoImprimirBoletimSapeacu && boletimData && (
        <PrintBoletimSapeacu
          aluno={alunoImprimirBoletimSapeacu}
          turma={boletimData.turma}
          escolaNome={boletimData.escolaNome}
          escolaLogoUrl={boletimData.escolaLogoUrl}
          materias={boletimData.materias}
          notas={boletimData.notas}
          recuperacoes={boletimData.recuperacoes}
          onClose={() => {
            setAlunoImprimirBoletimSapeacu(null)
            setBoletimData(null)
          }}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/home">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground rounded-xl">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <IconTile icon={FileText} variant="primary" className="h-10 w-10" /> 
              Documentos & Atestados Escolares
            </h2>
          </div>
          <p className="text-muted-foreground text-xs mt-1 ml-14">Emissão de comprovantes, certidões e atestados com validade oficial.</p>
        </div>
      </div>

      {!escolaAtivaId ? (
        <Card className="p-8 border-border bg-card flex flex-col items-center justify-center text-center space-y-4">
          <GraduationCap className="h-12 w-12 text-muted-foreground animate-pulse" />
          <h3 className="text-sm font-semibold text-foreground">Nenhuma Escola Ativa</h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            Selecione uma escola no painel inicial para liberar a busca e emissão de documentos oficiais.
          </p>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Coluna Esquerda: Busca do Aluno */}
          <div className="md:col-span-1 space-y-4">
            <Card className="p-5 border-borderCustom bg-card space-y-4 overflow-visible">
              <div className="space-y-4">
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  1. Buscar Aluno(a)
                </label>

                {/* Filtro por Turma */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-zinc-400 block font-semibold uppercase">Filtrar por Turma</span>
                  <select
                    value={turmaFiltroId}
                    onChange={(e) => {
                      setTurmaFiltroId(e.target.value)
                      // Limpar seleção anterior se o aluno selecionado não for da nova turma
                      if (alunoSelecionado && e.target.value !== 'all' && alunoSelecionado.turma_id !== e.target.value) {
                        setAlunoSelecionado(null)
                        setBuscaAluno('')
                      }
                    }}
                    className="w-full h-10 px-3 bg-input border border-borderCustom text-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#185FA5]/50 hover:bg-[#1a1a1c] transition-all cursor-pointer"
                  >
                    <option value="all">Todas as Turmas</option>
                    {turmas.map((t) => (
                      <option key={t.id} value={t.id} className="bg-[#121214]">
                        {t.nome} {t.turno ? `(${t.turno})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Campo de Busca por Aluno */}
                <div ref={autocompleteRef} className="relative space-y-1.5">
                  <span className="text-[10px] text-zinc-400 block font-semibold uppercase">Nome ou Matrícula</span>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                    <Input
                      type="text"
                      placeholder="Nome ou matrícula..."
                      value={buscaAluno}
                      onChange={(e) => {
                        setBuscaAluno(e.target.value)
                        setShowSugestoes(true)
                        if (alunoSelecionado) setAlunoSelecionado(null)
                      }}
                      onFocus={() => setShowSugestoes(true)}
                      onClick={() => setShowSugestoes(true)}
                      className="pl-9 pr-8 h-10 bg-input border-borderCustom text-white rounded-xl text-xs"
                    />
                    {buscaAluno && (
                      <button
                        type="button"
                        onClick={() => {
                          setBuscaAluno('')
                          setAlunoSelecionado(null)
                          setShowSugestoes(false)
                        }}
                        className="absolute right-3 top-3 text-zinc-500 hover:text-white transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Sugestões do Autocomplete */}
                  {showSugestoes && (buscaAluno || turmaFiltroId !== 'all') && (
                    <div className="absolute z-50 w-full mt-1.5 bg-[#121214] border border-borderCustom rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                      {loadingAlunos ? (
                        <div className="p-4 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Buscando...
                        </div>
                      ) : sugestoesAlunos.length > 0 ? (
                        sugestoesAlunos.map((aluno) => (
                          <button
                            key={aluno.id}
                            type="button"
                            onClick={() => {
                              setAlunoSelecionado(aluno)
                              setBuscaAluno(aluno.nome)
                              setShowSugestoes(false)
                            }}
                            className="w-full px-4 py-2.5 text-left text-xs hover:bg-[#185FA5]/10 hover:text-[#3ea6ff] text-zinc-300 transition-colors border-b border-borderCustom last:border-none cursor-pointer flex flex-col gap-0.5"
                          >
                            <span className="font-bold text-white uppercase">{aluno.nome}</span>
                            <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono">
                              <span>Matrícula: {aluno.id}</span>
                              {aluno.turmas?.nome && (
                                <>
                                  <span>•</span>
                                  <span className="text-[#3ea6ff] font-sans font-semibold">Turma: {aluno.turmas.nome}</span>
                                </>
                              )}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="p-4 text-center text-xs text-zinc-500">Nenhum aluno encontrado.</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Ficha Rápida do Aluno Selecionado */}
              {alunoSelecionado && (
                <div className="p-4 bg-background border border-border rounded-xl space-y-3 animate-in fade-in duration-200">
                  <h3 className="text-xs uppercase tracking-wide text-muted-foreground border-b border-border pb-1">
                    Ficha de Emissão
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-xs uppercase tracking-wide text-muted-foreground block mb-0.5">Aluno(a)</span>
                      <span className="text-sm font-semibold text-foreground uppercase">{alunoSelecionado.nome}</span>
                    </div>
                    {alunoSelecionado.turmas?.nome && (
                      <div>
                        <span className="text-xs uppercase tracking-wide text-muted-foreground block mb-0.5">Turma</span>
                        <span className="text-sm font-normal text-muted-foreground uppercase">{alunoSelecionado.turmas.nome}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-xs uppercase tracking-wide text-muted-foreground block mb-0.5">Mãe / Responsável</span>
                      <span className="text-sm font-normal text-muted-foreground uppercase">{alunoSelecionado.nome_mae ?? 'Não informado'}</span>
                    </div>
                    <div>
                      <span className="text-xs uppercase tracking-wide text-muted-foreground block mb-0.5">Nascimento</span>
                      <span className="text-sm font-normal text-muted-foreground">{dataNascimentoFormatada}</span>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Coluna Direita: Seleção do Documento */}
          <div className="md:col-span-2 space-y-4">
            <Card className="p-5 border-border bg-card space-y-5">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                  2. Escolha o Documento
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  {documentOptions.map((opt) => {
                    const Icon = opt.icon
                    const isSelected = docType === opt.id
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setDocType(opt.id)}
                        className={`p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer flex gap-3.5 shadow-sm hover:scale-[1.01] ${
                          isSelected
                            ? 'bg-primary/10 border-primary text-foreground'
                            : 'bg-background border-border text-muted-foreground hover:bg-hoverCustom'
                        }`}
                      >
                        <IconTile icon={Icon} variant="primary" className="h-10 w-10 shrink-0" />
                        <div>
                          <h4 className="font-semibold text-sm text-foreground">{opt.label}</h4>
                          <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{opt.desc}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Botão de Emissão */}
              <div className="flex justify-end pt-2 border-t border-borderCustom items-center gap-2">
                {tokenDocumentoExistente && (
                  <Button
                    onClick={() => {
                      setUsarHistorico(true)
                      setAlunoImprimirDocumentoEscolar(alunoSelecionado)
                    }}
                    type="button"
                    variant="outline"
                    title="Visualizar documento arquivado (Histórico)"
                    className="border-[#0090ff] text-[#0090ff] hover:bg-[#0090ff]/10 font-bold h-10 px-4 rounded-xl flex items-center justify-center transition-all cursor-pointer"
                  >
                    <span className="text-xs">Histórico</span>
                  </Button>
                )}
                <Button
                  onClick={handleEmitirDocumento}
                  disabled={!alunoSelecionado || loadingBoletim}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:text-white dark:hover:bg-emerald-700 font-bold gap-2 h-10 px-5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loadingBoletim ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Carregando...
                    </>
                  ) : (
                    <>
                      <Printer className="w-4 h-4" />
                      {tokenDocumentoExistente ? 'Emitir Novo & Assinar' : 'Emitir & Imprimir Documento'}
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
