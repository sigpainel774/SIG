'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { useEditModeStore } from '@/store/useEditModeStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
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
  Loader2
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

// Import de componentes de impressão
import { PrintComprovanteMatricula } from '@/components/print/print-comprovante-matricula'
import { PrintFichaAluno } from '@/components/print/print-ficha-aluno'
import { PrintDocumentoEscolar } from '@/components/print/print-documento-escolar'

export default function DocumentosPage() {
  const { funcionario, vinculos, isAdminGlobalOrRoot, escolaAtivaId } = useAuthStore()
  const { isEditMode } = useEditModeStore()
  
  const [alunos, setAlunos] = useState<any[]>([])
  const [loadingAlunos, setLoadingAlunos] = useState(false)
  const [buscaAluno, setBuscaAluno] = useState('')
  const [alunoSelecionado, setAlunoSelecionado] = useState<any | null>(null)
  const [showSugestoes, setShowSugestoes] = useState(false)
  
  const [docType, setDocType] = useState<string>('atestado-matricula')
  
  // Estados de gatilho para a impressão real
  const [alunoImprimirFicha, setAlunoImprimirFicha] = useState<any | null>(null)
  const [alunoImprimirComprovante, setAlunoImprimirComprovante] = useState<any | null>(null)
  const [alunoImprimirDocumentoEscolar, setAlunoImprimirDocumentoEscolar] = useState<any | null>(null)

  const autocompleteRef = useRef<HTMLDivElement>(null)

  const dataNascimentoFormatada = alunoSelecionado?.data_nascimento
    ? new Date(alunoSelecionado.data_nascimento).toLocaleDateString('pt-BR')
    : 'Não informada'

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
        .select('*, escolas(nome)')
        .is('deleted_at', null)

      // Verificação de cargos e lotação
      if (!isAdmin) {
        const isDiretor = vinculos.some(
          v => v.escola_id === escolaAtivaId && (v.cargo?.toUpperCase() === 'DIRETOR' || v.cargo?.toUpperCase().includes('DIRETOR'))
        )
        const isSecretario = vinculos.some(
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
      if (data) {
        setAlunos(data)
      }
      setLoadingAlunos(false)
    }

    loadAlunos()
  }, [escolaAtivaId, vinculos, funcionario?.id, isAdminGlobalOrRoot])

  // Filtrar lista com base na digitação
  const sugestoesAlunos = alunos.filter((aluno) => {
    if (!buscaAluno) return false
    return (
      aluno.nome?.toLowerCase().includes(buscaAluno.toLowerCase()) ||
      aluno.id?.toLowerCase().includes(buscaAluno.toLowerCase())
    )
  }).slice(0, 5)

  const handleEmitirDocumento = () => {
    if (!alunoSelecionado) {
      toast.error('Por favor, selecione um aluno.')
      return
    }

    if (docType === 'ficha-aluno') {
      setAlunoImprimirFicha(alunoSelecionado)
    } else if (docType === 'comprovante-matricula') {
      setAlunoImprimirComprovante(alunoSelecionado)
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
          onClose={() => setAlunoImprimirDocumentoEscolar(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#26262a]">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/home">
              <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white rounded-xl">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <FileText className="w-6 h-6 text-[#3ea6ff]" /> 
              Documentos & Atestados Escolares
            </h2>
          </div>
          <p className="text-[#aaa] text-xs mt-1 ml-12">Emissão de comprovantes, certidões e atestados com validade oficial.</p>
        </div>
      </div>

      {!escolaAtivaId ? (
        <Card className="p-8 border-borderCustom bg-card flex flex-col items-center justify-center text-center space-y-4">
          <GraduationCap className="h-12 w-12 text-zinc-500 animate-pulse" />
          <h3 className="text-sm font-semibold text-white">Nenhuma Escola Ativa</h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            Selecione uma escola no painel inicial para liberar a busca e emissão de documentos oficiais.
          </p>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Coluna Esquerda: Busca do Aluno */}
          <div className="md:col-span-1 space-y-4">
            <Card className="p-5 border-borderCustom bg-card space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  1. Buscar Aluno(a)
                </label>
                <div ref={autocompleteRef} className="relative">
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
                      className="pl-9 h-10 bg-input border-borderCustom text-white rounded-xl"
                    />
                  </div>

                  {/* Sugestões do Autocomplete */}
                  {showSugestoes && buscaAluno && (
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
                            <span className="text-[10px] text-zinc-500 font-mono">{aluno.id}</span>
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
                <div className="p-4 bg-background border border-borderCustom rounded-xl space-y-3 animate-in fade-in duration-200">
                  <h3 className="text-xs uppercase font-bold text-zinc-400 border-b border-borderCustom pb-1">
                    Ficha de Emissão
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-zinc-500 block">Aluno(a)</span>
                      <span className="font-semibold text-white uppercase">{alunoSelecionado.nome}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Mãe / Responsável</span>
                      <span className="font-semibold text-white uppercase">{alunoSelecionado.nome_mae || 'Não informado'}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Nascimento</span>
                      <span className="font-semibold text-white">{dataNascimentoFormatada}</span>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Coluna Direita: Seleção do Documento */}
          <div className="md:col-span-2 space-y-4">
            <Card className="p-5 border-borderCustom bg-card space-y-5">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">
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
                            ? 'bg-[#185FA5]/10 border-[#185FA5] dark:bg-[#3ea6ff]/10 dark:border-[#3ea6ff] text-white'
                            : 'bg-background border-borderCustom text-zinc-300 hover:bg-[#1a1a1c]'
                        }`}
                      >
                        <div className={`p-2.5 rounded-xl shrink-0 ${isSelected ? 'bg-[#185FA5]/20 text-[#3ea6ff]' : 'bg-surface-1 text-zinc-400'}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-white">{opt.label}</h4>
                          <p className="text-[10px] text-zinc-500 mt-0.5 leading-snug">{opt.desc}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Botão de Emissão */}
              <div className="flex justify-end pt-2 border-t border-borderCustom">
                <Button
                  onClick={handleEmitirDocumento}
                  disabled={!alunoSelecionado}
                  className="bg-[#185FA5] hover:bg-[#185FA5]/90 text-white dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90 font-bold gap-2 h-10 px-5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Printer className="w-4 h-4" />
                  Emitir & Imprimir Documento
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
