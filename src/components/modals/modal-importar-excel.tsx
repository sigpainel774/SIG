'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { logAudit } from '@/lib/audit/audit-agent'
import { useAuthStore } from '@/store/useAuthStore'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  FileSpreadsheet,
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
  FolderTree,
  UserCheck,
  Sparkles,
  Layers,
  Calendar,
  Clock
} from 'lucide-react'
import {
  parseExcelStudentWorkbook,
  ExcelSheetGroup,
  ExtractedExcelStudentData
} from '@/lib/excelStudentParser'

interface ModalImportarExcelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  escolaIdInicial?: string
  secretariaIdFilter?: string
  onSuccess?: () => void
}

interface StudentItemState extends ExtractedExcelStudentData {
  isSaved: boolean
  isSaving: boolean
  savedInSchoolId?: string
  errorMessage?: string
}

interface SheetGroupState {
  sheetName: string
  anoSerie: string // ex: '1º Ano', '2º Ano', '3º Ano'
  turno: string // ex: 'Matutino', 'Vespertino', 'Noturno', 'Integral'
  students: StudentItemState[]
}

export function ModalImportarExcel({
  open,
  onOpenChange,
  escolaIdInicial = '',
  secretariaIdFilter,
  onSuccess
}: ModalImportarExcelProps) {
  const supabase = createClient()
  const { funcionario } = useAuthStore()

  // Seleção de Destino
  const [escolas, setEscolas] = useState<any[]>([])
  const [turmas, setTurmas] = useState<any[]>([])
  const [selectedEscolaId, setSelectedEscolaId] = useState<string>(escolaIdInicial)
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>('')
  const [loadingCatalog, setLoadingCatalog] = useState(false)

  // Estado das Pastas/Abas e Alunos
  const [parsing, setParsing] = useState(false)
  const [sheets, setSheets] = useState<SheetGroupState[]>([])
  const [activeSheetIndex, setActiveSheetIndex] = useState<number>(0)
  const [currentIndex, setCurrentIndex] = useState<number>(0)
  const [isSavingAll, setIsSavingAll] = useState(false)

  const isMounted = useRef(true)

  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  // Carregar Lista de Escolas / Unidades
  useEffect(() => {
    if (!open) return
    const fetchEscolas = async () => {
      setLoadingCatalog(true)
      let query = supabase
        .from('escolas')
        .select('id, nome, inep, secretaria_id')
        .is('deleted_at', null)
        .eq('ativo', true)

      if (secretariaIdFilter) {
        query = query.eq('secretaria_id', secretariaIdFilter)
      }

      const { data, error } = await query.order('nome', { ascending: true })

      if (!isMounted.current) return
      if (error) {
        console.error('Erro ao carregar escolas:', error)
        toast.error('Erro ao buscar lista de unidades.')
      } else if (data) {
        setEscolas(data)
        if (!selectedEscolaId && data.length > 0) {
          setSelectedEscolaId(data[0].id)
        }
      }
      setLoadingCatalog(false)
    }
    fetchEscolas()
  }, [open, supabase, secretariaIdFilter])

  // Carregar Lista de Turmas da Escola Selecionada
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

  // Resetar índice do aluno ativo ao trocar a pasta/aba ativa
  useEffect(() => {
    setCurrentIndex(0)
  }, [activeSheetIndex])

  // Função auxiliar para autodetectar o ano/série a partir do nome da aba
  const detectAnoSerie = (sheetName: string): string => {
    const name = sheetName.toUpperCase()
    if (name.includes('1')) return '1º Ano'
    if (name.includes('2')) return '2º Ano'
    if (name.includes('3')) return '3º Ano'
    if (name.includes('4')) return '4º Ano'
    if (name.includes('5')) return '5º Ano'
    if (name.includes('6')) return '6º Ano'
    if (name.includes('7')) return '7º Ano'
    if (name.includes('8')) return '8º Ano'
    if (name.includes('9')) return '9º Ano'
    return '1º Ano'
  }

  // Função auxiliar para autodetectar o turno a partir do nome da aba
  const detectTurno = (sheetName: string): string => {
    const lower = sheetName.toLowerCase()
    if (lower.includes('vesp') || lower.includes('tarde')) return 'Vespertino'
    if (lower.includes('not') || lower.includes('noite')) return 'Noturno'
    if (lower.includes('integ')) return 'Integral'
    return 'Matutino'
  }

  // Função auxiliar para normalizar texto (remover acentos e maiúsculas)
  const normalizeStr = (str?: string) => {
    if (!str) return ''
    return str
      .toUpperCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
  }

  // Verificar alunos que já existem no banco de dados para a escola selecionada e marcarem como 'isSaved'
  const syncExistingStudentsWithDB = async (escolaId: string, currentSheets: SheetGroupState[]) => {
    if (!escolaId || currentSheets.length === 0) return currentSheets

    try {
      const { data: existingAlunos, error } = await supabase
        .from('alunos')
        .select('id, nome, cpf, inep')
        .eq('escola_id', escolaId)
        .is('deleted_at', null)

      if (error || !existingAlunos || existingAlunos.length === 0) {
        return currentSheets.map((group) => ({
          ...group,
          students: group.students.map((st) => ({
            ...st,
            isSaved: st.savedInSchoolId === escolaId
          }))
        }))
      }

      const existingNames = new Set(existingAlunos.map((a) => normalizeStr(a.nome)).filter((n) => n.length >= 3))
      const existingCPFs = new Set(existingAlunos.filter((a) => Boolean(a.cpf)).map((a) => (a.cpf as string).replace(/\D/g, '')))
      const existingINEPs = new Set(existingAlunos.filter((a) => Boolean(a.inep)).map((a) => (a.inep as string).trim()))

      let duplicateCount = 0

      const updatedSheets: SheetGroupState[] = currentSheets.map((group) => ({
        ...group,
        students: group.students.map((st) => {
          const normNome = normalizeStr(st.nome)
          const cleanCpf = st.cpf ? st.cpf.replace(/\D/g, '') : ''
          const cleanInep = st.inep ? st.inep.trim() : ''

          const isAlreadyInDB: boolean = Boolean(
            (normNome && normNome.length >= 3 && existingNames.has(normNome)) ||
            (cleanCpf && existingCPFs.has(cleanCpf)) ||
            (cleanInep && existingINEPs.has(cleanInep))
          )

          const finalSavedState = Boolean(st.savedInSchoolId === escolaId || isAlreadyInDB)

          if (isAlreadyInDB && !st.isSaved) {
            duplicateCount++
          }

          return {
            ...st,
            isSaved: finalSavedState
          }
        })
      }))

      if (duplicateCount > 0) {
        toast.info(`${duplicateCount} aluno(s) já cadastrado(s) na escola foram identificados e serão pulados.`)
      }

      return updatedSheets
    } catch (err) {
      console.error('Erro ao verificar alunos existentes no banco:', err)
      return currentSheets
    }
  }

  // Re-verificar duplicidade se a escola selecionada for alterada
  useEffect(() => {
    if (!selectedEscolaId || sheets.length === 0) return
    const updateCheck = async () => {
      const synced = await syncExistingStudentsWithDB(selectedEscolaId, sheets)
      if (isMounted.current && synced) {
        setSheets(synced)
      }
    }
    updateCheck()
  }, [selectedEscolaId])

  // Manipular Upload da Planilha Excel (.xlsx / .xls)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const lowerName = file.name.toLowerCase()
    if (!lowerName.endsWith('.xlsx') && !lowerName.endsWith('.xls')) {
      toast.error('Por favor, selecione um arquivo Excel válido (.xlsx ou .xls).')
      return
    }

    setParsing(true)
    const toastId = toast.loading(`Lendo planilha Excel "${file.name}"...`)

    try {
      const buffer = await file.arrayBuffer()
      const parsedGroups = parseExcelStudentWorkbook(buffer)

      if (!isMounted.current) return

      if (parsedGroups.length === 0) {
        toast.error('Nenhum dado de aluno foi encontrado a partir da linha 8 (B8) na planilha.', { id: toastId })
        setParsing(false)
        return
      }

      // Converter em estado gerenciável com selos de salvamento e seleção de ano/turno por pasta
      const rawSheetStates: SheetGroupState[] = parsedGroups.map((group) => ({
        sheetName: group.sheetName,
        anoSerie: detectAnoSerie(group.sheetName),
        turno: detectTurno(group.sheetName),
        students: group.students.map((st) => ({
          ...st,
          isSaved: false,
          isSaving: false
        }))
      }))

      // Cruzar dados com o banco de dados para identificar alunos já cadastrados
      const sheetStates = selectedEscolaId
        ? await syncExistingStudentsWithDB(selectedEscolaId, rawSheetStates)
        : rawSheetStates

      setSheets(sheetStates)
      setActiveSheetIndex(0)
      setCurrentIndex(0)

      const totalCount = sheetStates.reduce((acc, s) => acc + s.students.length, 0)
      toast.success(`${totalCount} aluno(s) extraído(s) de ${sheetStates.length} pasta(s)/aba(s)!`, { id: toastId })
    } catch (err: any) {
      console.error('Erro ao analisar arquivo Excel:', err)
      toast.error(`Falha ao ler planilha: ${err.message || 'Formato inválido'}`, { id: toastId })
    } finally {
      if (isMounted.current) setParsing(false)
    }
  }

  // Importar Aluno Individual (1 por 1)
  const handleSaveIndividual = async (sheetIdx: number, studentIdx: number) => {
    const targetSheet = sheets[sheetIdx]
    if (!targetSheet) return
    const student = targetSheet.students[studentIdx]
    if (!student || student.isSaved || student.isSaving) return

    if (!selectedEscolaId) {
      toast.error('Selecione uma Escola de Destino antes de salvar.')
      return
    }

    // Marca como salvando
    setSheets((prev) => {
      const next = [...prev]
      const targetGroup = { ...next[sheetIdx] }
      const nextStudents = [...targetGroup.students]
      nextStudents[studentIdx] = { ...nextStudents[studentIdx], isSaving: true, errorMessage: undefined }
      targetGroup.students = nextStudents
      next[sheetIdx] = targetGroup
      return next
    })

    try {
      // 1. Dados de Matrícula (JSONB)
      const dadosMatriculaObj: any = {
        escolaId: selectedEscolaId || null,
        turmaIdAluno: selectedTurmaId || null,
        nomeAluno: student.nome,
        nascimentoAluno: student.data_nascimento || null,
        inepAluno: student.inep || null,
        cpfAluno: student.cpf || null,
        corRaca: student.cor_raca || null,
        cidAluno: student.cid || null,
        nisAluno: student.nis || null,
        susAluno: student.cartao_sus || null,
        telefoneAluno: student.telefone || null,
        responsavelPais: student.nome_pais || null,
        enderecoAluno: student.endereco || null,
        anoSeriePasta: targetSheet.anoSerie || '1º Ano',
        turnoPasta: targetSheet.turno || 'Matutino',
        origemImportacao: `Excel 15 (Aba: ${student.sheetName}, Linha: #${student.rowIndex})`
      }

      // 2. Payload principal da tabela public.alunos
      const payload: any = {
        nome: student.nome.toUpperCase().trim(),
        cpf: student.cpf ? student.cpf.trim() : null,
        inep: student.inep ? student.inep.trim() : null,
        data_nascimento: student.data_nascimento || null,
        telefone: student.telefone ? student.telefone.trim() : null,
        nis: student.nis ? student.nis.trim() : null,
        cartao_sus: student.cartao_sus ? student.cartao_sus.trim() : null,
        endereco: student.endereco ? student.endereco.trim() : null,
        nome_mae: student.nome_pais ? student.nome_pais.trim() : null,
        serie: targetSheet.anoSerie || '1º Ano',
        escola_id: selectedEscolaId || null,
        turma_id: selectedTurmaId || null,
        dados_matricula: dadosMatriculaObj
      }

      // 3. Inserir no Supabase
      const { data: inserted, error: insertError } = await (supabase.from('alunos') as any)
        .insert(payload)
        .select('id')
        .single()

      if (insertError) throw insertError

      const newAlunoId = inserted.id

      // 4. Audit Log
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

      // Atualiza estado de salvamento
      setSheets((prev) => {
        const next = [...prev]
        const targetGroup = { ...next[sheetIdx] }
        const nextStudents = [...targetGroup.students]
        nextStudents[studentIdx] = {
          ...nextStudents[studentIdx],
          isSaving: false,
          isSaved: true,
          savedInSchoolId: selectedEscolaId
        }
        targetGroup.students = nextStudents
        next[sheetIdx] = targetGroup
        return next
      })

      toast.success(`Aluno "${student.nome}" cadastrado com sucesso!`)

      if (onSuccess) onSuccess()
    } catch (err: any) {
      console.error('Erro ao salvar aluno:', err)
      setSheets((prev) => {
        const next = [...prev]
        const targetGroup = { ...next[sheetIdx] }
        const nextStudents = [...targetGroup.students]
        nextStudents[studentIdx] = {
          ...nextStudents[studentIdx],
          isSaving: false,
          errorMessage: err.message || 'Erro ao gravar no banco de dados'
        }
        targetGroup.students = nextStudents
        next[sheetIdx] = targetGroup
        return next
      })
      toast.error(`Erro ao salvar ${student.nome}: ${err.message}`)
    }
  }

  // Importar Todos Alunos da Pasta Atual
  const handleSaveCurrentSheet = async () => {
    const currentSheet = sheets[activeSheetIndex]
    if (!currentSheet) return

    const unsavedIndices = currentSheet.students
      .map((st, idx) => (!st.isSaved ? idx : -1))
      .filter((i) => i !== -1)

    if (unsavedIndices.length === 0) {
      toast.info(`Todos os alunos da pasta "${currentSheet.sheetName}" já foram cadastrados!`)
      return
    }

    if (!selectedEscolaId) {
      toast.error('Selecione uma Escola de Destino antes de continuar.')
      return
    }

    setIsSavingAll(true)
    const toastId = toast.loading(`Importando ${unsavedIndices.length} aluno(s) da pasta "${currentSheet.sheetName}"...`)

    let count = 0
    for (const idx of unsavedIndices) {
      await handleSaveIndividual(activeSheetIndex, idx)
      count++
    }

    toast.dismiss(toastId)
    setIsSavingAll(false)
    toast.success(`${count} aluno(s) processado(s) na pasta "${currentSheet.sheetName}"!`)
  }

  // Importar TODAS as Pastas de Uma Vez
  const handleSaveAllSheets = async () => {
    if (sheets.length === 0) return

    if (!selectedEscolaId) {
      toast.error('Selecione uma Escola de Destino antes de importar todas as pastas.')
      return
    }

    setIsSavingAll(true)
    const toastId = toast.loading('Importando alunos de TODAS as pastas/abas da planilha...')

    let totalSavedCount = 0

    for (let sIdx = 0; sIdx < sheets.length; sIdx++) {
      const sheetGroup = sheets[sIdx]
      for (let stIdx = 0; stIdx < sheetGroup.students.length; stIdx++) {
        const student = sheetGroup.students[stIdx]
        if (!student.isSaved) {
          await handleSaveIndividual(sIdx, stIdx)
          totalSavedCount++
        }
      }
    }

    toast.dismiss(toastId)
    setIsSavingAll(false)
    toast.success(`Concluído! Total de ${totalSavedCount} aluno(s) importados de todas as pastas.`)
  }

  // Descartar Aluno da Lista
  const handleDiscardStudent = (sheetIdx: number, studentIdx: number) => {
    setSheets((prev) => {
      const next = [...prev]
      const targetGroup = { ...next[sheetIdx] }
      targetGroup.students = targetGroup.students.filter((_, i) => i !== studentIdx)
      next[sheetIdx] = targetGroup
      return next
    })

    if (currentIndex >= (sheets[sheetIdx]?.students.length || 1) - 1 && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }

    toast.info('Registro removido da lista de importação.')
  }

  // Estatísticas Globais
  const activeSheet = sheets[activeSheetIndex]
  const currentStudent = activeSheet?.students[currentIndex]
  const totalGlobalStudents = sheets.reduce((sum, s) => sum + s.students.length, 0)
  const savedGlobalStudents = sheets.reduce(
    (sum, s) => sum + s.students.filter((st) => st.isSaved).length,
    0
  )

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Importador 15 - Alunos via Excel (.xlsx / .xls)"
      description="Faça o upload da planilha Excel. O sistema lê os dados a partir da linha 8 (B8) e permite informar o ano e turno de cada pasta para importar 1 por 1 ou em lote."
      maxWidth="sm:max-w-6xl w-full"
    >
      <div className="space-y-5 text-sm select-none">
        {/* ── Painel 1: Seleção de Destino (Escola & Turma) ── */}
        <div className="bg-[#18181b] border border-[#27272a] p-4 rounded-2xl space-y-3">
          <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-wider">
            <Building2 className="w-4 h-4" /> 1. Destino da Importação (Escola e Turma Padrão)
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
                Turma Geral de Destino (Opcional para Enturmação)
              </label>
              <select
                value={selectedTurmaId}
                onChange={(e) => setSelectedTurmaId(e.target.value)}
                className="w-full bg-[#09090b] border border-[#3f3f46] rounded-xl px-3 py-2 text-white text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
              >
                <option value="">-- Sem Turma (Apenas Cadastro Geral com Série) --</option>
                {turmas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome} - {t.turno || 'Geral'} ({t.ano_letivo})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ── Painel 2: Upload da Planilha Excel ── */}
        <div className="bg-[#18181b] border border-[#27272a] p-4 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <Upload className="w-4 h-4" /> 2. Upload do Arquivo Excel (.xlsx / .xls)
            </div>
            {totalGlobalStudents > 0 && (
              <Badge variant="outline" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">
                {savedGlobalStudents} de {totalGlobalStudents} aluno(s) cadastrados
              </Badge>
            )}
          </div>

          <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#3f3f46] hover:border-emerald-500 bg-[#09090b] hover:bg-[#121214] rounded-2xl p-5 cursor-pointer transition-all duration-200 group text-center">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              disabled={parsing}
              className="hidden"
            />
            {parsing ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                <span className="text-xs font-semibold text-gray-300">
                  Lendo pastas e colunas a partir da linha B8...
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="bg-emerald-500/10 p-3 rounded-full group-hover:scale-110 transition-transform">
                  <FileSpreadsheet className="w-8 h-8 text-emerald-400" />
                </div>
                <div>
                  <p className="font-bold text-white text-sm">
                    Clique para selecionar a planilha de alunos (.xlsx / .xls)
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    O sistema lerá as colunas B8 (Nome), C8 (Data Nasc), D8 (INEP), E8 (CPF), F8 (Cor), G8 (CID), H8 (NIS), I8 (SUS), J8 (Telefone), K8 (Pais), L8 (Endereço).
                  </p>
                </div>
              </div>
            )}
          </label>
        </div>

        {/* ── Painel 3: Abas de Pastas da Planilha e Configuração de Ano/Turno ── */}
        {sheets.length > 0 && activeSheet && (
          <div className="space-y-4">
            {/* Seletor de Pastas/Abas */}
            <div className="bg-[#18181b] border border-[#27272a] p-4 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <FolderTree className="w-4 h-4 text-amber-400" /> Pastas / Abas da Planilha ({sheets.length}):
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSaveAllSheets}
                  disabled={isSavingAll}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white border-none h-7 text-xs font-bold"
                >
                  {isSavingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
                  Importar TODAS as Pastas
                </Button>
              </div>

              {/* Botões de Seleção da Pasta */}
              <div className="flex flex-wrap gap-2 pt-1">
                {sheets.map((grp, sIdx) => {
                  const isSelected = sIdx === activeSheetIndex
                  const savedInSheet = grp.students.filter((st) => st.isSaved).length
                  const totalInSheet = grp.students.length

                  return (
                    <button
                      key={sIdx}
                      onClick={() => setActiveSheetIndex(sIdx)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
                        isSelected
                          ? 'bg-purple-600 text-white border-purple-400 shadow-md scale-105'
                          : 'bg-[#09090b] text-gray-300 border-[#3f3f46] hover:bg-[#202024]'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>{grp.sheetName}</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 ${
                          savedInSheet === totalInSheet && totalInSheet > 0
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-black/30 text-gray-300 border-white/10'
                        }`}
                      >
                        {savedInSheet}/{totalInSheet}
                      </Badge>
                    </button>
                  )
                })}
              </div>

              {/* ── Selects de Ano e Turno da Pasta Ativa ── */}
              <div className="bg-[#09090b] border border-[#3f3f46] p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 mt-3">
                <div className="flex flex-wrap items-center gap-4">
                  {/* Select do Ano / Série */}
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-400" />
                    <label className="text-xs font-bold text-purple-300 whitespace-nowrap">
                      Ano da Pasta ({activeSheet.sheetName}):
                    </label>
                    <select
                      value={activeSheet.anoSerie || '1º Ano'}
                      onChange={(e) => {
                        const val = e.target.value
                        setSheets((prev) => {
                          const next = [...prev]
                          next[activeSheetIndex] = { ...next[activeSheetIndex], anoSerie: val }
                          return next
                        })
                      }}
                      className="bg-[#18181b] border border-[#52525b] text-white text-xs rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-purple-500 focus:outline-none font-bold"
                    >
                      <option value="1º Ano">1º Ano</option>
                      <option value="2º Ano">2º Ano</option>
                      <option value="3º Ano">3º Ano</option>
                      <option value="4º Ano">4º Ano</option>
                      <option value="5º Ano">5º Ano</option>
                      <option value="6º Ano">6º Ano</option>
                      <option value="7º Ano">7º Ano</option>
                      <option value="8º Ano">8º Ano</option>
                      <option value="9º Ano">9º Ano</option>
                      <option value="Educação Infantil">Educação Infantil</option>
                      <option value="Ensino Médio 1º Ano">Ensino Médio 1º Ano</option>
                      <option value="Ensino Médio 2º Ano">Ensino Médio 2º Ano</option>
                      <option value="Ensino Médio 3º Ano">Ensino Médio 3º Ano</option>
                      <option value="EJA">EJA</option>
                    </select>
                  </div>

                  {/* Select do Turno */}
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-sky-400" />
                    <label className="text-xs font-bold text-sky-300 whitespace-nowrap">
                      Turno da Pasta:
                    </label>
                    <select
                      value={activeSheet.turno || 'Matutino'}
                      onChange={(e) => {
                        const val = e.target.value
                        setSheets((prev) => {
                          const next = [...prev]
                          next[activeSheetIndex] = { ...next[activeSheetIndex], turno: val }
                          return next
                        })
                      }}
                      className="bg-[#18181b] border border-[#52525b] text-white text-xs rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-sky-500 focus:outline-none font-bold"
                    >
                      <option value="Matutino">Matutino (Manhã)</option>
                      <option value="Vespertino">Vespertino (Tarde)</option>
                      <option value="Noturno">Noturno (Noite)</option>
                      <option value="Integral">Integral</option>
                    </select>
                  </div>
                </div>

                <Badge variant="outline" className="bg-purple-500/10 text-purple-300 border-purple-500/20 text-[11px] px-2.5 py-1">
                  Ano: {activeSheet.anoSerie} | Turno: {activeSheet.turno}
                </Badge>
              </div>
            </div>

            {/* Ficha Individual Atual (1 por 1) */}
            {currentStudent ? (
              <div className="bg-[#18181b] border border-[#27272a] p-5 rounded-2xl space-y-4 shadow-lg">
                {/* Header da Ficha */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#27272a] pb-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="bg-purple-500/10 text-purple-300 border-purple-500/30 text-xs py-1">
                      Pasta: {activeSheet.sheetName} ({activeSheet.anoSerie} - {activeSheet.turno})
                    </Badge>
                    <span className="text-xs font-semibold text-gray-400">
                      Aluno {currentIndex + 1} de {activeSheet.students.length} (Linha Excel: #{currentStudent.rowIndex})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {currentStudent.isSaved ? (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 gap-1 text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Cadastrado
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 gap-1 text-xs">
                        <AlertTriangle className="w-3.5 h-3.5" /> Pendente
                      </Badge>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDiscardStudent(activeSheetIndex, currentIndex)}
                      className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 h-8 text-xs"
                      title="Descartar esta ficha"
                    >
                      <Trash2 className="w-4 h-4 mr-1" /> Descartar
                    </Button>
                  </div>
                </div>

                {/* Exibição dos Dados do Aluno em Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 bg-[#09090b] p-4 rounded-xl border border-[#27272a]">
                  <div className="col-span-1 sm:col-span-2 md:col-span-3 pb-1 border-b border-[#1f1f23] flex justify-between items-center">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400 block">Nome do Aluno (Coluna B)</span>
                      <span className="text-base font-bold text-white tracking-wide">{currentStudent.nome}</span>
                    </div>
                    <Badge variant="outline" className="bg-sky-500/10 text-sky-300 border-sky-500/30 text-xs">
                      {activeSheet.anoSerie} • {activeSheet.turno}
                    </Badge>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Data de Nascimento (Coluna C)</span>
                    <span className="text-xs text-gray-200 font-medium">
                      {currentStudent.data_nascimento
                        ? new Date(currentStudent.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR')
                        : <span className="text-gray-500 italic">Não informado</span>}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">ID Censo / INEP (Coluna D)</span>
                    <span className="text-xs text-purple-300 font-mono font-semibold">
                      {currentStudent.inep || <span className="text-gray-500 italic">Não informado</span>}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">CPF (Coluna E)</span>
                    <span className="text-xs text-emerald-300 font-mono font-semibold">
                      {currentStudent.cpf || <span className="text-gray-500 italic">Não informado</span>}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Cor / Raça (Coluna F)</span>
                    <span className="text-xs text-gray-200">
                      {currentStudent.cor_raca || <span className="text-gray-500 italic">Não informado</span>}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">CID / Laudo (Coluna G)</span>
                    <span className="text-xs text-amber-300 font-medium">
                      {currentStudent.cid || <span className="text-gray-500 italic">Sem laudo</span>}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">NIS (Coluna H)</span>
                    <span className="text-xs text-gray-200">
                      {currentStudent.nis || <span className="text-gray-500 italic">Não informado</span>}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Cartão SUS (Coluna I)</span>
                    <span className="text-xs text-gray-200">
                      {currentStudent.cartao_sus || <span className="text-gray-500 italic">Não informado</span>}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Telefone (Coluna J)</span>
                    <span className="text-xs text-gray-200">
                      {currentStudent.telefone || <span className="text-gray-500 italic">Não informado</span>}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Nomes dos Pais (Coluna K)</span>
                    <span className="text-xs text-gray-200">
                      {currentStudent.nome_pais || <span className="text-gray-500 italic">Não informado</span>}
                    </span>
                  </div>

                  <div className="col-span-1 sm:col-span-2 md:col-span-3">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Endereço Completo (Coluna L)</span>
                    <span className="text-xs text-gray-200">
                      {currentStudent.endereco || <span className="text-gray-500 italic">Não informado</span>}
                    </span>
                  </div>
                </div>

                {currentStudent.errorMessage && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{currentStudent.errorMessage}</span>
                  </div>
                )}

                {/* Barra de Ações e Navegação Ficha a Ficha */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentIndex === 0}
                      onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                      className="bg-[#09090b] border-[#3f3f46] text-gray-300 hover:text-white h-9"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentIndex >= activeSheet.students.length - 1}
                      onClick={() => setCurrentIndex((prev) => Math.min(activeSheet.students.length - 1, prev + 1))}
                      className="bg-[#09090b] border-[#3f3f46] text-gray-300 hover:text-white h-9"
                    >
                      Próximo <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSaveCurrentSheet}
                      disabled={isSavingAll}
                      className="bg-[#09090b] border-[#3f3f46] text-purple-300 hover:text-white hover:bg-purple-500/10 h-9 font-semibold"
                    >
                      Importar Todos Desta Pasta ({activeSheet.sheetName})
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => handleSaveIndividual(activeSheetIndex, currentIndex)}
                      disabled={currentStudent.isSaved || currentStudent.isSaving}
                      className={`h-9 font-bold ${
                        currentStudent.isSaved
                          ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 cursor-default'
                          : 'bg-purple-600 hover:bg-purple-700 text-white'
                      }`}
                    >
                      {currentStudent.isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Gravando...
                        </>
                      ) : currentStudent.isSaved ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-400" /> Já Cadastrado
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-1.5" /> Importar Este Aluno (1 por 1)
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-[#18181b] border border-[#27272a] rounded-2xl text-gray-400">
                Todos os alunos desta pasta foram processados ou descartados.
              </div>
            )}
          </div>
        )}
      </div>
    </StandardDialog>
  )
}
