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
import { cn } from '@/lib/utils'
import { ModalRedatorOficio, DadosOficio } from '@/components/modals/modal-redator-oficio'

import dynamic from 'next/dynamic'

// Import dinâmico de componentes de impressão sob demanda
const PrintComprovanteMatricula = dynamic(
  () => import('@/components/print/print-comprovante-matricula').then((m) => m.PrintComprovanteMatricula),
  { ssr: false }
)
const PrintFichaAluno = dynamic(
  () => import('@/components/print/print-ficha-aluno').then((m) => m.PrintFichaAluno),
  { ssr: false }
)
const PrintDocumentoEscolar = dynamic(
  () => import('@/components/print/print-documento-escolar').then((m) => m.PrintDocumentoEscolar),
  { ssr: false }
)
const PrintBoletimSapeacu = dynamic(
  () => import('@/components/print/print-boletim-sapeacu').then((m) => m.PrintBoletimSapeacu),
  { ssr: false }
)

import { useSchoolStore } from '@/store/useSchoolStore'

export default function DocumentosPage() {
  const { funcionario, vinculos, acessos, isAdminGlobalOrRoot, escolaAtivaId } = useAuthStore()
  const { isEditMode } = useEditModeStore()
  const { selectedEscola, selectedSecretaria } = useSchoolStore()

  const secNome = selectedSecretaria?.nome || selectedEscola?.secretariaNome || (selectedEscola?.secretarias as any)?.nome || ''
  const isEducacao = (!selectedEscola && !selectedSecretaria) || (!secNome || /educa/i.test(secNome))
  const isSaude = !isEducacao && (/sa[uú]de/i.test(secNome) || selectedEscola?.tipo === 'SAUDE' || selectedEscola?.tipo === 'UNIDADE_SAUDE')

  const [alunos, setAlunos] = useState<any[]>([])
  const [loadingAlunos, setLoadingAlunos] = useState(false)
  const [buscaAluno, setBuscaAluno] = useState('')
  const [alunoSelecionado, setAlunoSelecionado] = useState<any | null>(null)
  const [showSugestoes, setShowSugestoes] = useState(false)
  
  const [turmas, setTurmas] = useState<any[]>([])
  const [turmaFiltroId, setTurmaFiltroId] = useState<string>('all')
  
  const [docType, setDocType] = useState<string>(isSaude ? 'oficio' : 'atestado-matricula')

  useEffect(() => {
    if (isSaude && docType !== 'oficio') {
      setDocType('oficio')
    }
  }, [isSaude, docType])
  
  // Estados de gatilho para a impressão real
  const [alunoImprimirFicha, setAlunoImprimirFicha] = useState<any | null>(null)
  const [alunoImprimirComprovante, setAlunoImprimirComprovante] = useState<any | null>(null)
  const [alunoImprimirDocumentoEscolar, setAlunoImprimirDocumentoEscolar] = useState<any | null>(null)
  const [alunoImprimirBoletim, setAlunoImprimirBoletim] = useState<any | null>(null)
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

  const [isRedatorOficioOpen, setIsRedatorOficioOpen] = useState(false)
  const [dadosOficio, setDadosOficio] = useState<DadosOficio | null>(null)

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

  const [buscarNaRedeToda, setBuscarNaRedeToda] = useState(false)

  // Função centralizada para carregar/buscar alunos do Supabase
  const buscarAlunosServidor = useCallback(async (termo: string, naRedeToda: boolean = false) => {
    if (!escolaAtivaId && !naRedeToda && !isAdminGlobalOrRoot()) {
      setAlunos([])
      setLoadingAlunos(false)
      return
    }

    setLoadingAlunos(true)
    const supabase = createClient()
    const isAdmin = isAdminGlobalOrRoot()

    let query = supabase
      .from('alunos')
      .select('id, nome, numero_matricula, cpf, inep, data_nascimento, nome_mae, escola_id, turma_id, foto_url, foto_avatar_path, foto_visualizacao_path, foto_updated_at, escolas(nome), turmas(nome)')
      .is('deleted_at', null)

    // Aplicação de restrições de escola e cargo
    if (!naRedeToda && escolaAtivaId) {
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
          // Professor ou Coordenador: vê alunos das suas turmas
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
    }

    // Filtro por turma (se selecionada)
    if (turmaFiltroId !== 'all') {
      query = query.eq('turma_id', turmaFiltroId)
    }

    const termoLimpo = termo.trim()

    // A partir de 3 letras (ou 1 se houver menos), filtrar por nome, matrícula, cpf ou inep
    if (termoLimpo.length >= 1) {
      const termSanitizado = termoLimpo.replace(/[%_\(\)]/g, '')
      // Suporte a múltiplos termos separados por espaço (ex: "akira lucca")
      const tokens = termSanitizado.split(/\s+/).filter(Boolean)
      
      if (tokens.length === 1) {
        query = query.or(`nome.ilike.%${termSanitizado}%,numero_matricula.ilike.%${termSanitizado}%,cpf.ilike.%${termSanitizado}%,inep.ilike.%${termSanitizado}%`)
      } else {
        // Multi-word: cada token deve dar match no nome ou nos outros campos
        const conditions = tokens.map(tk => `nome.ilike.%${tk}%`).join(',')
        query = query.or(conditions)
      }
    }

    // Aumentar o limite para 50 quando houver termo de busca com 3+ letras para trazer todos os alunos correspondentes
    const limitMax = termoLimpo.length >= 3 ? 50 : 20
    const { data, error } = await query.order('nome', { ascending: true }).limit(limitMax)

    if (error) {
      console.error('Erro ao buscar alunos:', error)
      toast.error('Erro ao realizar busca de alunos.')
      setAlunos([])
    } else if (data) {
      setAlunos(data)
    }
    setLoadingAlunos(false)
  }, [escolaAtivaId, turmaFiltroId, vinculos, acessos, funcionario?.id, isAdminGlobalOrRoot])

  // Buscar alunos da escola ativa sob demanda com debounce
  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(() => {
      if (!cancelled) {
        buscarAlunosServidor(buscaAluno, buscarNaRedeToda)
      }
    }, 200) // 200ms debounce otimizado

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [buscaAluno, buscarNaRedeToda, buscarAlunosServidor])

  const sugestoesAlunos = alunos

  // Checar se já existe um documento emitido deste tipo para o aluno (Histórico)
  const checarHistoricoRapido = useCallback(async () => {
    if (!alunoSelecionado || !docType) {
      setTokenDocumentoExistente(null)
      return
    }

    // Apenas atestados e declaração de vaga que usam a tabela 'assinatura' genérica
    if (['atestado-matricula', 'atestado-frequencia', 'declaracao-vaga', 'atestado-transferencia'].indexOf(docType) === -1) {
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
    if (!isSaude && docType !== 'oficio' && !alunoSelecionado) {
      toast.error('Por favor, selecione um aluno.')
      return
    }

    setUsarHistorico(false)
    if (docType === 'ficha-aluno') {
      setAlunoImprimirFicha(alunoSelecionado)
    } else if (docType === 'comprovante-matricula') {
      setAlunoImprimirComprovante(alunoSelecionado)
    } else if (docType === 'boletim') {
      if (!alunoSelecionado?.turma_id) {
        toast.error('Este aluno não possui vínculo com nenhuma turma. Não é possível emitir o boletim.')
        return
      }
      setLoadingBoletim(true)
      try {
        const supabase = createClient()
        
        // 1. Obter snapshot completo do boletim via RPC única (M-2)
        const { data: rawData, error: rpcErr } = await (supabase as any).rpc('obter_dados_boletim', {
          p_aluno_id: alunoSelecionado.id,
          p_turma_id: alunoSelecionado.turma_id,
          p_escola_id: alunoSelecionado.escola_id
        })

        if (rpcErr) throw rpcErr
        if (!rawData || !rawData.turma?.id) {
          throw new Error('Turma ou dados do aluno não encontrados para emissão do boletim.')
        }

        // Formatar notas
        const formatadasNotas = (rawData.notas ?? []).map((n: any) => ({
          materia_id: n.materia_id,
          unidade: n.unidade,
          nota1: n.nota1 !== null && n.nota1 !== '' ? Number(n.nota1) : null,
          nota2: n.nota2 !== null && n.nota2 !== '' ? Number(n.nota2) : null,
          nota3: n.nota3 !== null && n.nota3 !== '' ? Number(n.nota3) : null
        }))

        // Formatar recuperações
        const formatadasRec = (rawData.recuperacoes ?? []).map((r: any) => ({
          materia_id: r.materia_id,
          nota: r.nota !== null && r.nota !== '' ? Number(r.nota) : null
        }))

        setBoletimData({
          turma: {
            id: rawData.turma.id,
            nome: rawData.turma.nome,
            turno: rawData.turma.turno,
            ano_letivo: rawData.turma.ano_letivo
          },
          escolaNome: rawData.escolaNome || 'Escola Não Identificada',
          escolaLogoUrl: rawData.escolaLogoUrl || null,
          materias: rawData.materias || [],
          notas: formatadasNotas,
          recuperacoes: formatadasRec
        })
        
        setAlunoImprimirBoletim(alunoSelecionado)
      } catch (err: any) {
        console.error('Erro ao carregar dados do boletim:', err)
        toast.error(`Erro ao obter dados do boletim: ${err.message}`)
      } finally {
        setLoadingBoletim(false)
      }
    } else if (docType === 'oficio') {
      setIsRedatorOficioOpen(true)
    } else {
      setAlunoImprimirDocumentoEscolar(alunoSelecionado || { id: 'oficio', nome: 'Documento Oficial' })
    }
  }

  const documentOptions = isSaude
    ? [
        { id: 'oficio', label: 'Ofício Oficial', icon: FileText, desc: 'Clique para redigir e emitir um ofício oficial formatado.' },
      ]
    : [
        { id: 'atestado-matricula', label: 'Atestado de Matrícula', icon: Award, desc: 'Atesta vínculo ativo do aluno no ano letivo corrente.' },
        { id: 'atestado-frequencia', label: 'Atestado de Frequência', icon: FileCheck, desc: 'Declara frequência escolar regular do estudante.' },
        { id: 'declaracao-vaga', label: 'Declaração de Vaga', icon: GraduationCap, desc: 'Reserva/indica vaga de transferência na unidade.' },
        { id: 'atestado-transferencia', label: 'Atestado de Transferência', icon: FileText, desc: 'Atestado oficial de pedido de transferência em curso.' },
        { id: 'comprovante-matricula', label: 'Comprovante de Matrícula', icon: FileSpreadsheet, desc: 'Recibo oficial detalhado da matrícula.' },
        { id: 'ficha-aluno', label: 'Ficha Completa do Aluno', icon: FileText, desc: 'Ficha cadastral completa com todos os dados do aluno.' },
        { id: 'boletim', label: 'Boletim Escolar', icon: FileText, desc: 'Boletim oficial de notas e frequência por unidades.' },
        { id: 'oficio', label: 'Ofício Oficial', icon: FileText, desc: 'Clique para redigir e emitir um ofício oficial formatado.' },
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

      {/* Modal Redator de Ofício da Saúde */}
      {isRedatorOficioOpen && (
        <ModalRedatorOficio
          isOpen={isRedatorOficioOpen}
          onClose={() => setIsRedatorOficioOpen(false)}
          onConfirm={(dados) => {
            setDadosOficio(dados)
            setIsRedatorOficioOpen(false)
            setAlunoImprimirDocumentoEscolar({ id: 'oficio', nome: 'Ofício Oficial' })
          }}
          funcionarioNome={funcionario?.nome}
          funcionarioCargo={funcionario?.cargo || 'Secretaria Municipal de Saúde'}
        />
      )}

      {/* Impressão overlay - Atestados escolares, ofícios e declaração de vaga */}
      {alunoImprimirDocumentoEscolar && (
        <PrintDocumentoEscolar 
          aluno={alunoImprimirDocumentoEscolar}
          docType={docType as any}
          dadosOficio={dadosOficio || undefined}
          tokenExistente={usarHistorico ? tokenDocumentoExistente : null}
          onClose={() => {
            setAlunoImprimirDocumentoEscolar(null)
            setDadosOficio(null)
            checarHistoricoRapido()
          }}
        />
      )}
      {/* Impressão overlay - Boletim Escolar Oficial */}
      {alunoImprimirBoletim && boletimData && (
        <PrintBoletimSapeacu
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
              {isSaude ? 'Documentos Oficiais' : 'Documentos & Atestados Escolares'}
            </h2>
          </div>
          <p className="text-muted-foreground text-xs mt-1 ml-14">
            {isSaude ? 'Emissão e geração de ofícios oficiais com validade jurídica.' : 'Emissão de comprovantes, certidões e atestados com validade oficial.'}
          </p>
        </div>
      </div>

      {!escolaAtivaId && !isSaude && !selectedSecretaria ? (
        <Card className="p-8 border-border bg-card flex flex-col items-center justify-center text-center space-y-4">
          <GraduationCap className="h-12 w-12 text-muted-foreground animate-pulse" />
          <h3 className="text-sm font-semibold text-foreground">Nenhuma Escola Ativa</h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            Selecione uma escola no painel inicial para liberar a busca e emissão de documentos oficiais.
          </p>
        </Card>
      ) : (
        <div className={cn("grid gap-6", isSaude ? "grid-cols-1" : "md:grid-cols-3")}>
          {/* Coluna Esquerda: Busca do Aluno (Removido na Saúde) */}
          {!isSaude && (
            <div className="md:col-span-1 space-y-4">
              <Card className="p-5 border-border bg-card space-y-4 overflow-visible">
                <div className="space-y-4">
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    1. Buscar Aluno(a)
                  </label>

                  {/* Filtro por Turma */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-muted-foreground block font-semibold uppercase">Filtrar por Turma</span>
                    <select
                      value={turmaFiltroId}
                      onChange={(e) => {
                        setTurmaFiltroId(e.target.value)
                        if (alunoSelecionado && e.target.value !== 'all' && alunoSelecionado.turma_id !== e.target.value) {
                          setAlunoSelecionado(null)
                          setBuscaAluno('')
                        }
                      }}
                      className="w-full h-10 px-3 bg-input border border-border text-foreground rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 hover:bg-muted/50 dark:hover:bg-[#1a1a1c] transition-all cursor-pointer"
                    >
                      <option value="all" className="bg-card text-foreground dark:bg-[#121214] dark:text-zinc-200">Todas as Turmas</option>
                      {turmas.map((t) => (
                        <option key={t.id} value={t.id} className="bg-card text-foreground dark:bg-[#121214] dark:text-zinc-200">
                          {t.nome} {t.turno ? `(${t.turno})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Campo de Busca por Aluno */}
                  <div ref={autocompleteRef} className="relative space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground block font-semibold uppercase">
                        Nome ou Matrícula {buscaAluno.trim().length >= 3 ? '(Buscando 3+ letras)' : ''}
                      </span>
                      <label className="flex items-center gap-1.5 text-[10px] text-primary cursor-pointer font-medium hover:underline">
                        <input
                          type="checkbox"
                          checked={buscarNaRedeToda}
                          onChange={(e) => setBuscarNaRedeToda(e.target.checked)}
                          className="rounded border-border text-primary focus:ring-primary h-3 w-3"
                        />
                        Buscar na rede toda
                      </label>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Digite ao menos 3 letras (ex: aki)..."
                        value={buscaAluno}
                        onChange={(e) => {
                          setBuscaAluno(e.target.value)
                          setShowSugestoes(true)
                          if (alunoSelecionado) setAlunoSelecionado(null)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            setShowSugestoes(true)
                            buscarAlunosServidor(buscaAluno, buscarNaRedeToda)
                            if (sugestoesAlunos.length > 0) {
                              setAlunoSelecionado(sugestoesAlunos[0])
                              setBuscaAluno(sugestoesAlunos[0].nome)
                              setShowSugestoes(false)
                            }
                          }
                        }}
                        onFocus={() => setShowSugestoes(true)}
                        onClick={() => setShowSugestoes(true)}
                        className="pl-9 pr-8 h-10 bg-input border border-border text-foreground rounded-xl text-xs placeholder:text-muted-foreground"
                      />
                      {buscaAluno && (
                        <button
                          type="button"
                          onClick={() => {
                            setBuscaAluno('')
                            setAlunoSelecionado(null)
                            setShowSugestoes(false)
                          }}
                          className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Sugestões do Autocomplete */}
                    {showSugestoes && (
                      <div className="absolute z-50 w-full mt-1.5 bg-popover text-popover-foreground border border-border rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                        {loadingAlunos ? (
                          <div className="p-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
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
                              className="w-full px-4 py-2.5 text-left text-xs hover:bg-accent hover:text-accent-foreground text-foreground transition-colors border-b border-border last:border-none cursor-pointer flex flex-col gap-0.5"
                            >
                              <span className="font-bold text-foreground uppercase">{aluno.nome}</span>
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono flex-wrap">
                                <span>Matrícula: {aluno.numero_matricula || aluno.id.slice(0, 8)}</span>
                                {aluno.turmas?.nome && (
                                  <>
                                    <span>•</span>
                                    <span className="text-primary font-sans font-semibold">Turma: {aluno.turmas.nome}</span>
                                  </>
                                )}
                                {aluno.escolas?.nome && (
                                  <>
                                    <span>•</span>
                                    <span className="text-muted-foreground font-sans truncate max-w-[180px]">Escola: {aluno.escolas.nome}</span>
                                  </>
                                )}
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="p-4 text-center text-xs text-muted-foreground space-y-2">
                            <p>Nenhum aluno encontrado para "{buscaAluno}".</p>
                            {!buscarNaRedeToda && (
                              <button
                                type="button"
                                onClick={() => {
                                  setBuscarNaRedeToda(true)
                                  buscarAlunosServidor(buscaAluno, true)
                                }}
                                className="text-xs text-primary font-semibold hover:underline cursor-pointer"
                              >
                                🔍 Buscar em todas as escolas da rede
                              </button>
                            )}
                          </div>
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
          )}

          {/* Coluna Direita: Seleção do Documento */}
          <div className={isSaude ? "w-full space-y-4" : "md:col-span-2 space-y-4"}>
            <Card className="p-5 border-border bg-card space-y-5">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                  {isSaude ? 'Documento Oficial Selecionado' : '2. Escolha o Documento'}
                </label>

                <div className={cn("grid gap-3", isSaude ? "grid-cols-1" : "sm:grid-cols-2")}>
                  {documentOptions.map((opt) => {
                    const Icon = opt.icon
                    const isSelected = docType === opt.id
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setDocType(opt.id)
                          if (opt.id === 'oficio') {
                            setIsRedatorOficioOpen(true)
                          }
                        }}
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
              <div className="flex justify-end pt-2 border-t border-border items-center gap-2">
                {tokenDocumentoExistente && (
                  <Button
                    onClick={() => {
                      setUsarHistorico(true)
                      setAlunoImprimirDocumentoEscolar(alunoSelecionado || { id: 'oficio', nome: 'Documento Oficial' })
                    }}
                    type="button"
                    variant="outline"
                    title="Visualizar documento arquivado (Histórico)"
                    className="border-primary text-primary hover:bg-primary/10 font-bold h-10 px-4 rounded-xl flex items-center justify-center transition-all cursor-pointer"
                  >
                    <span className="text-xs">Histórico</span>
                  </Button>
                )}
                <Button
                  onClick={handleEmitirDocumento}
                  disabled={(docType !== 'oficio' && !isSaude && !alunoSelecionado) || loadingBoletim}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:text-white dark:hover:bg-emerald-700 font-bold gap-2 h-10 px-5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loadingBoletim ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Carregando...
                    </>
                  ) : docType === 'oficio' ? (
                    <>
                      <FileText className="w-4 h-4" />
                      Redigir & Imprimir Ofício
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
