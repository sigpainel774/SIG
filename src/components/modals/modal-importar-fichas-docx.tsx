'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { logAudit } from '@/lib/audit/audit-agent'
import { useAuthStore } from '@/store/useAuthStore'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  FileText,
  Upload,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Building2,
  GraduationCap,
  Save,
  Trash2,
  Loader2,
  RefreshCw,
  UserCheck,
  Sparkles,
  FileSpreadsheet
} from 'lucide-react'
import { parseDocxStudentFile, ExtractedStudentData } from '@/lib/docxStudentParser'

interface ModalImportarFichasDocxProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  escolaIdInicial?: string
  onSuccess?: () => void
}

interface StudentItem extends ExtractedStudentData {
  id: string
  isSaved: boolean
  isSaving: boolean
  errorMessage?: string
}

export function ModalImportarFichasDocx({
  open,
  onOpenChange,
  escolaIdInicial = '',
  onSuccess
}: ModalImportarFichasDocxProps) {
  const supabase = createClient()
  const { funcionario } = useAuthStore()

  // Seleção de Destino
  const [escolas, setEscolas] = useState<any[]>([])
  const [turmas, setTurmas] = useState<any[]>([])
  const [selectedEscolaId, setSelectedEscolaId] = useState<string>(escolaIdInicial)
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>('')
  const [loadingCatalog, setLoadingCatalog] = useState(false)

  // Estado de Processamento e Importação
  const [parsing, setParsing] = useState(false)
  const [students, setStudents] = useState<StudentItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isSavingAll, setIsSavingAll] = useState(false)

  const isMounted = useRef(true)

  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  // Carregar Escolas
  useEffect(() => {
    if (!open) return
    const fetchEscolas = async () => {
      setLoadingCatalog(true)
      const { data, error } = await supabase
        .from('escolas')
        .select('id, nome, inep')
        .is('deleted_at', null)
        .eq('ativo', true)
        .order('nome', { ascending: true })

      if (!isMounted.current) return
      if (error) {
        console.error('Erro ao carregar escolas:', error)
        toast.error('Erro ao buscar lista de escolas.')
      } else if (data) {
        setEscolas(data)
        if (!selectedEscolaId && data.length > 0) {
          setSelectedEscolaId(data[0].id)
        }
      }
      setLoadingCatalog(false)
    }
    fetchEscolas()
  }, [open, supabase])

  // Carregar Turmas da Escola Selecionada
  useEffect(() => {
    if (!open || !selectedEscolaId) {
      setTurmas([])
      setSelectedTurmaId('')
      return
    }

    const fetchTurmas = async () => {
      const { data, error } = await supabase
        .from('turmas')
        .select('id, nome, ano_letivo, turno')
        .eq('escola_id', selectedEscolaId)
        .is('deleted_at', null)
        .order('nome', { ascending: true })

      if (!isMounted.current) return
      if (error) {
        console.error('Erro ao carregar turmas:', error)
      } else if (data) {
        setTurmas(data)
        if (data.length > 0) {
          setSelectedTurmaId(data[0].id)
        } else {
          setSelectedTurmaId('')
        }
      }
    }
    fetchTurmas()
  }, [open, selectedEscolaId, supabase])

  // Manipular Upload de Arquivos .docx
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setParsing(true)
    const toastId = toast.loading(`Lendo ${files.length} arquivo(s) .docx...`)

    const newStudents: StudentItem[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!file.name.toLowerCase().endsWith('.docx')) {
        toast.error(`O arquivo "${file.name}" não é um documento .docx válido.`)
        continue
      }

      try {
        const extracted = await parseDocxStudentFile(file)
        newStudents.push({
          ...extracted,
          id: `doc_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 5)}`,
          isSaved: false,
          isSaving: false
        })
      } catch (err: any) {
        console.error(`Erro ao ler arquivo ${file.name}:`, err)
        toast.error(`Falha ao ler o quadro do arquivo ${file.name}`)
      }
    }

    toast.dismiss(toastId)
    setParsing(false)

    if (newStudents.length > 0) {
      setStudents((prev) => [...prev, ...newStudents])
      toast.success(`${newStudents.length} ficha(s) extraída(s) com sucesso!`)
    }

    // Resetar input
    e.target.value = ''
  }

  // Atualizar campo do aluno no formulário 1 por 1
  const handleFieldChange = (field: keyof StudentItem, value: any) => {
    setStudents((prev) => {
      const next = [...prev]
      if (next[currentIndex]) {
        next[currentIndex] = { ...next[currentIndex], [field]: value }
      }
      return next
    })
  }

  // Salvar Aluno Individual
  const handleSaveIndividual = async (indexToSave: number) => {
    const student = students[indexToSave]
    if (!student || student.isSaved || student.isSaving) return

    if (!selectedEscolaId) {
      toast.error('Selecione uma Escola de destino antes de salvar.')
      return
    }

    setStudents((prev) => {
      const next = [...prev]
      next[indexToSave] = { ...next[indexToSave], isSaving: true, errorMessage: undefined }
      return next
    })

    try {
      // 1. Dados de Matrícula espelho
      const dadosMatriculaObj: any = {
        escolaId: selectedEscolaId || null,
        turmaIdAluno: selectedTurmaId || null,
        nomeAluno: student.nome,
        nascimentoAluno: student.data_nascimento || null,
        cpfAluno: student.cpf || null,
        rgAluno: student.rg || null,
        nisAluno: student.nis || null,
        susAluno: student.cartao_sus || null,
        telefoneAluno: student.telefone || null,
        enderecoAluno: student.endereco || null,
        maeAluno: student.nome_mae || null,
        paiAluno: student.nome_pai || null,
        origemImportacao: `DOCX: ${student.fileName}`
      }

      const payload: any = {
        nome: student.nome.toUpperCase().trim(),
        cpf: student.cpf ? student.cpf.trim() : null,
        data_nascimento: student.data_nascimento || null,
        telefone: student.telefone ? student.telefone.trim() : null,
        rg: student.rg ? student.rg.trim() : null,
        nis: student.nis ? student.nis.trim() : null,
        cartao_sus: student.cartao_sus ? student.cartao_sus.trim() : null,
        endereco: student.endereco ? student.endereco.trim() : null,
        nome_mae: student.nome_mae ? student.nome_mae.trim() : null,
        nome_pai: student.nome_pai ? student.nome_pai.trim() : null,
        escola_id: selectedEscolaId || null,
        turma_id: selectedTurmaId || null,
        dados_matricula: dadosMatriculaObj
      }

      // Inserir no Supabase
      const { data: inserted, error: insertError } = await (supabase.from('alunos') as any)
        .insert(payload)
        .select('id')
        .single()

      if (insertError) throw insertError

      const newAlunoId = inserted.id

      // Audit Log
      await logAudit({
        supabase,
        action: 'CREATE',
        entity: 'alunos',
        entityId: newAlunoId,
        newData: payload,
        performedBy: {
          id: funcionario?.id ?? null,
          name: funcionario?.nome ?? 'Administrador',
          email: funcionario?.email ?? 'admin@super.com',
          cargo: funcionario?.cargo ?? undefined
        }
      })

      setStudents((prev) => {
        const next = [...prev]
        next[indexToSave] = { ...next[indexToSave], isSaving: false, isSaved: true }
        return next
      })

      toast.success(`Ficha de "${student.nome}" importada e cadastrada com sucesso!`)

      // Se for a última ficha e tiver concluído
      if (onSuccess) onSuccess()
    } catch (err: any) {
      console.error('Erro ao salvar ficha:', err)
      setStudents((prev) => {
        const next = [...prev]
        next[indexToSave] = {
          ...next[indexToSave],
          isSaving: false,
          errorMessage: err.message || 'Erro ao gravar no banco de dados'
        }
        return next
      })
      toast.error(`Erro ao salvar ficha de ${student.nome}: ${err.message}`)
    }
  }

  // Salvar Todos os Validados
  const handleSaveAll = async () => {
    const unsavedIndices = students
      .map((st, i) => (!st.isSaved ? i : -1))
      .filter((i) => i !== -1)

    if (unsavedIndices.length === 0) {
      toast.info('Todas as fichas já foram salvas!')
      return
    }

    if (!selectedEscolaId) {
      toast.error('Selecione uma Escola de destino antes de salvar em lote.')
      return
    }

    setIsSavingAll(true)
    const toastId = toast.loading(`Importando ${unsavedIndices.length} aluno(s)...`)

    let successCount = 0

    for (const idx of unsavedIndices) {
      await handleSaveIndividual(idx)
      if (students[idx]?.isSaved) {
        successCount++
      }
    }

    toast.dismiss(toastId)
    setIsSavingAll(false)

    if (successCount > 0) {
      toast.success(`${successCount} aluno(s) importado(s) e enturmado(s) com sucesso!`)
      if (onSuccess) onSuccess()
    }
  }

  // Descartar Ficha
  const handleDiscardCurrent = (indexToDiscard: number) => {
    setStudents((prev) => {
      const next = prev.filter((_, i) => i !== indexToDiscard)
      return next
    })
    if (currentIndex >= students.length - 1 && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
    toast.info('Ficha removida da lista de importação.')
  }

  const currentStudent = students[currentIndex]
  const totalStudents = students.length
  const savedCount = students.filter((s) => s.isSaved).length

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Importar Fichas de Alunos via DOCX"
      description="Faça o upload de documentos Word (.docx) contendo as fichas dos alunos para extração automatizada de dados e enturmação em lote."
      maxWidth="max-w-4xl"
    >
      <div className="space-y-5 text-sm select-none">
        {/* ── Painel 1: Seleção de Destino (Escola & Turma) ── */}
        <div className="bg-[#18181b] border border-[#27272a] p-4 rounded-2xl space-y-3">
          <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-wider">
            <Building2 className="w-4 h-4" /> 1. Destino da Importação (Escola e Turma)
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Seletor de Escola */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Escola de Destino <span className="text-rose-400">*</span>
              </label>
              <select
                value={selectedEscolaId}
                onChange={(e) => setSelectedEscolaId(e.target.value)}
                className="w-full bg-[#09090b] border border-[#3f3f46] rounded-xl px-3 py-2 text-white text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
              >
                <option value="">-- Selecione uma Escola --</option>
                {escolas.map((esc) => (
                  <option key={esc.id} value={esc.id}>
                    {esc.nome} {esc.inep ? `(INEP: ${esc.inep})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Seletor de Turma */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Turma de Destino (Enturmação)
              </label>
              <select
                value={selectedTurmaId}
                onChange={(e) => setSelectedTurmaId(e.target.value)}
                className="w-full bg-[#09090b] border border-[#3f3f46] rounded-xl px-3 py-2 text-white text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
              >
                <option value="">-- Sem Turma (Apenas Cadastro Geral) --</option>
                {turmas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome} - {t.turno || 'Geral'} ({t.ano_letivo})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ── Painel 2: Upload de Arquivos DOCX ── */}
        <div className="bg-[#18181b] border border-[#27272a] p-4 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sky-400 font-bold text-xs uppercase tracking-wider">
              <Upload className="w-4 h-4" /> 2. Upload dos Arquivos Word (.docx)
            </div>
            {totalStudents > 0 && (
              <Badge variant="outline" className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
                {savedCount} de {totalStudents} ficha(s) salvas
              </Badge>
            )}
          </div>

          <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#3f3f46] hover:border-purple-500 bg-[#09090b] hover:bg-[#121214] rounded-2xl p-6 cursor-pointer transition-all duration-200 group text-center">
            <input
              type="file"
              accept=".docx"
              multiple
              onChange={handleFileUpload}
              disabled={parsing}
              className="hidden"
            />
            {parsing ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                <span className="text-xs font-semibold text-gray-300">
                  Extraindo quadros dos documentos Word...
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="bg-purple-500/10 p-3 rounded-full group-hover:scale-110 transition-transform">
                  <FileSpreadsheet className="w-8 h-8 text-purple-400" />
                </div>
                <div>
                  <p className="font-bold text-white text-sm">
                    Clique aqui ou arraste os arquivos .docx das fichas
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    O sistema lerá os quadros A1 a A8 (Nome, Data Nasc, Contato, RG, CPF, NIS, SUS, Endereço).
                  </p>
                </div>
              </div>
            )}
          </label>
        </div>

        {/* ── Painel 3: Revisão Ficha a Ficha (1 por 1) ── */}
        {totalStudents > 0 && currentStudent && (
          <div className="bg-[#18181b] border border-[#27272a] p-5 rounded-2xl space-y-4 shadow-lg">
            {/* Header da Ficha Atual */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#27272a] pb-3">
              <div className="flex items-center gap-3">
                <Badge className="bg-purple-600 text-white font-extrabold px-2.5 py-1 text-xs">
                  Ficha {currentIndex + 1} de {totalStudents}
                </Badge>
                <span className="text-xs text-gray-400 truncate max-w-[200px]" title={currentStudent.fileName}>
                  {currentStudent.fileName}
                </span>
              </div>

              {/* Status de Confiança & Gravação */}
              <div className="flex items-center gap-2">
                {currentStudent.isSaved ? (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Salvo no Banco
                  </Badge>
                ) : (
                  <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs font-semibold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Confiança: {currentStudent.confidenceScore}%
                  </Badge>
                )}

                {/* Navegação Ficha a Ficha */}
                <div className="flex items-center gap-1 ml-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex((prev) => prev - 1)}
                    className="h-8 w-8 p-0 bg-[#09090b] border-[#3f3f46] text-white hover:bg-[#27272a]"
                    title="Ficha Anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentIndex === totalStudents - 1}
                    onClick={() => setCurrentIndex((prev) => prev + 1)}
                    className="h-8 w-8 p-0 bg-[#09090b] border-[#3f3f46] text-white hover:bg-[#27272a]"
                    title="Próxima Ficha"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Form de Edição da Ficha Atual (Campos A1 a A8) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {/* A1: Nome */}
              <div className="sm:col-span-2 md:col-span-2">
                <label className="block text-[11px] font-bold text-purple-300 uppercase tracking-wide mb-1">
                  A1 - Nome do Aluno <span className="text-rose-400">*</span>
                </label>
                <Input
                  value={currentStudent.nome}
                  onChange={(e) => handleFieldChange('nome', e.target.value)}
                  disabled={currentStudent.isSaved}
                  placeholder="Nome Completo do Aluno"
                  className="bg-[#09090b] border-[#3f3f46] text-white text-xs font-semibold"
                />
              </div>

              {/* A2: Data de Nascimento */}
              <div>
                <label className="block text-[11px] font-bold text-purple-300 uppercase tracking-wide mb-1">
                  A2 - Data de Nascimento
                </label>
                <Input
                  type="date"
                  value={currentStudent.data_nascimento || ''}
                  onChange={(e) => handleFieldChange('data_nascimento', e.target.value || null)}
                  disabled={currentStudent.isSaved}
                  className="bg-[#09090b] border-[#3f3f46] text-white text-xs"
                />
              </div>

              {/* A3: Contato */}
              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wide mb-1">
                  A3 - Contato / Telefone
                </label>
                <Input
                  value={currentStudent.telefone || ''}
                  onChange={(e) => handleFieldChange('telefone', e.target.value || null)}
                  disabled={currentStudent.isSaved}
                  placeholder="(00) 00000-0000"
                  className="bg-[#09090b] border-[#3f3f46] text-white text-xs"
                />
              </div>

              {/* A4: RG */}
              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wide mb-1">
                  A4 - RG
                </label>
                <Input
                  value={currentStudent.rg || ''}
                  onChange={(e) => handleFieldChange('rg', e.target.value || null)}
                  disabled={currentStudent.isSaved}
                  placeholder="Número do RG"
                  className="bg-[#09090b] border-[#3f3f46] text-white text-xs"
                />
              </div>

              {/* A5: CPF */}
              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wide mb-1">
                  A5 - CPF
                </label>
                <Input
                  value={currentStudent.cpf || ''}
                  onChange={(e) => handleFieldChange('cpf', e.target.value || null)}
                  disabled={currentStudent.isSaved}
                  placeholder="000.000.000-00"
                  className="bg-[#09090b] border-[#3f3f46] text-white text-xs"
                />
              </div>

              {/* A6: NIS */}
              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wide mb-1">
                  A6 - NIS
                </label>
                <Input
                  value={currentStudent.nis || ''}
                  onChange={(e) => handleFieldChange('nis', e.target.value || null)}
                  disabled={currentStudent.isSaved}
                  placeholder="Número NIS"
                  className="bg-[#09090b] border-[#3f3f46] text-white text-xs"
                />
              </div>

              {/* A7: Cartão SUS */}
              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wide mb-1">
                  A7 - Cartão do SUS
                </label>
                <Input
                  value={currentStudent.cartao_sus || ''}
                  onChange={(e) => handleFieldChange('cartao_sus', e.target.value || null)}
                  disabled={currentStudent.isSaved}
                  placeholder="Cartão SUS"
                  className="bg-[#09090b] border-[#3f3f46] text-white text-xs"
                />
              </div>

              {/* Filiação Mãe */}
              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wide mb-1">
                  Nome da Mãe
                </label>
                <Input
                  value={currentStudent.nome_mae || ''}
                  onChange={(e) => handleFieldChange('nome_mae', e.target.value || null)}
                  disabled={currentStudent.isSaved}
                  placeholder="Nome da Genitora"
                  className="bg-[#09090b] border-[#3f3f46] text-white text-xs"
                />
              </div>

              {/* A8: Endereço por extenso */}
              <div className="sm:col-span-2 md:col-span-3">
                <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wide mb-1">
                  A8 - Endereço por Extenso
                </label>
                <Input
                  value={currentStudent.endereco || ''}
                  onChange={(e) => handleFieldChange('endereco', e.target.value || null)}
                  disabled={currentStudent.isSaved}
                  placeholder="Rua, Número, Bairro, Cidade, CEP"
                  className="bg-[#09090b] border-[#3f3f46] text-white text-xs"
                />
              </div>
            </div>

            {/* Ações da Ficha Atual */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#27272a]">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDiscardCurrent(currentIndex)}
                className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-xs"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Descartar Ficha
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => handleSaveIndividual(currentIndex)}
                  disabled={currentStudent.isSaved || currentStudent.isSaving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                >
                  {currentStudent.isSaving ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : currentStudent.isSaved ? (
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  ) : (
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  {currentStudent.isSaved ? 'Ficha Salva' : 'Salvar Este Aluno'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Rodapé Global: Ação em Lote & Fechamento ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#27272a]">
          <span className="text-xs text-gray-400">
            {totalStudents > 0
              ? `${savedCount} de ${totalStudents} aluno(s) gravado(s) no sistema.`
              : 'Nenhum arquivo carregado.'}
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-[#121214] border-[#3f3f46] text-gray-300 hover:bg-[#202024] text-xs"
            >
              Fechar
            </Button>

            {totalStudents > 0 && (
              <Button
                onClick={handleSaveAll}
                disabled={isSavingAll || savedCount === totalStudents}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md"
              >
                {isSavingAll ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <UserCheck className="w-4 h-4 mr-2" />
                )}
                Salvar Todos os Validados ({totalStudents - savedCount})
              </Button>
            )}
          </div>
        </div>
      </div>
    </StandardDialog>
  )
}
