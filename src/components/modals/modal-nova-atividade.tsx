'use client'

import { useState, useEffect } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Upload, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { useSchoolStore } from '@/store/useSchoolStore'

interface ModalNovaAtividadeProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function ModalNovaAtividade({ open, onOpenChange, onSuccess }: ModalNovaAtividadeProps) {
  const { funcionario, escolaAtivaId, acessos, isAdminGlobalOrRoot } = useAuthStore()
  const { selectedEscola } = useSchoolStore()

  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')

  const [turmas, setTurmas] = useState<any[]>([])
  const [materias, setMaterias] = useState<any[]>([])
  const [prazoMinimoDias, setPrazoMinimoDias] = useState<number>(5)

  const [turmaId, setTurmaId] = useState('')
  const [materiaId, setMateriaId] = useState('')
  const [titulo, setTitulo] = useState('')
  const [trimestre, setTrimestre] = useState('')
  const [dataAplicacao, setDataAplicacao] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [arquivo, setArquivo] = useState<File | null>(null)

  const isGlobalAdmin = isAdminGlobalOrRoot?.() ?? false
  const nivelNaEscola = escolaAtivaId
    ? acessos.find((a) => a.escola_id === escolaAtivaId)?.nivel ?? 99
    : 99
  const isDiretoria = nivelNaEscola === 2 || isGlobalAdmin

  // Carregar prazo mínimo configurado pela direção
  useEffect(() => {
    if (!open) return
    let active = true
    const loadPrazoConfig = async () => {
      const supabase = createClient()
      const { data } = await (supabase as any)
        .from('configuracoes_rede')
        .select('prazo_envio_atividades_dias')
        .limit(1)
        .maybeSingle()
      if (active && data) {
        setPrazoMinimoDias(data.prazo_envio_atividades_dias ?? 5)
      }
    }
    loadPrazoConfig()
    return () => {
      active = false
    }
  }, [open])

  // Função utilitária para calcular data mínima em formato YYYY-MM-DD (local timezone safe)
  const getMinDataAplicacaoStr = (dias: number) => {
    if (dias <= 0) return ''
    const d = new Date()
    d.setDate(d.getDate() + dias)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  // Carregar turmas vinculadas ao professor
  useEffect(() => {
    if (!open || !funcionario?.id || !escolaAtivaId) return
    const loadTurmas = async () => {
      const supabase = createClient()
      const { data, error } = await (supabase as any)
        .from('vinculos_turmas')
        .select('turma_id, turmas(id, nome)')
        .eq('funcionario_id', funcionario.id)
        .eq('escola_id', escolaAtivaId)
        .eq('tipo', 'professor')
      if (error) {
        console.error('Erro ao carregar turmas:', error)
        return
      }
      const lista = (data ?? [])
        .map((v: any) => v.turmas)
        .filter(Boolean)
      setTurmas(lista)
    }
    loadTurmas()
  }, [open, funcionario?.id, escolaAtivaId])

  // Carregar matérias da turma selecionada vinculadas ao professor
  useEffect(() => {
    if (!turmaId || !funcionario?.id) {
      setMaterias([])
      setMateriaId('')
      return
    }
    const loadMaterias = async () => {
      const supabase = createClient()
      const { data, error } = await (supabase as any)
        .from('materias')
        .select('id, nome')
        .eq('turma_id', turmaId)
        .eq('professor_id', funcionario.id)
      if (error) {
        console.error('Erro ao carregar matérias:', error)
        return
      }
      setMaterias(data ?? [])
      setMateriaId('')
    }
    loadMaterias()
  }, [turmaId, funcionario?.id])

  const resetForm = () => {
    setTurmaId('')
    setMateriaId('')
    setTitulo('')
    setTrimestre('')
    setDataAplicacao('')
    setObservacoes('')
    setArquivo(null)
    setMaterias([])
  }

  const handleOpenChange = (val: boolean) => {
    if (!val) resetForm()
    onOpenChange(val)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!turmaId) { toast.error('Selecione uma turma.'); return }
    if (!materiaId) { toast.error('Selecione uma disciplina.'); return }
    if (!titulo.trim()) { toast.error('Informe o título da atividade.'); return }
    if (!trimestre) { toast.error('Selecione o trimestre.'); return }
    if (!dataAplicacao) { toast.error('Informe a data de aplicação.'); return }
    if (!arquivo) { toast.error('Selecione um arquivo para envio.'); return }
    if (!escolaAtivaId || !funcionario?.id) { toast.error('Sessão inválida. Recarregue a página.'); return }

    // Validar antecedência mínima exigida pela direção (isenta diretores e admins)
    if (!isDiretoria && prazoMinimoDias > 0) {
      const minDateStr = getMinDataAplicacaoStr(prazoMinimoDias)
      if (minDateStr && dataAplicacao < minDateStr) {
        const [y, m, d] = minDateStr.split('-')
        toast.error(
          `A direção exige antecedência mínima de ${prazoMinimoDias} dia(s) para o envio de atividades. A data de aplicação deve ser a partir de ${d}/${m}/${y}.`
        )
        return
      }
    }

    setLoading(true)
    setLoadingMsg('Enviando arquivo...')

    try {
      const supabase = createClient()

      // 1. Upload do arquivo
      const cleanName = arquivo.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
      const path = `${escolaAtivaId}/${turmaId}/${Date.now()}_${cleanName}`
      const { error: uploadError } = await supabase.storage
        .from('atividades-secretaria')
        .upload(path, arquivo, { upsert: false })

      if (uploadError) throw new Error(`Erro no upload: ${uploadError.message}`)

      const { data: publicUrlData } = supabase.storage
        .from('atividades-secretaria')
        .getPublicUrl(path)
      const arquivo_url = publicUrlData.publicUrl

      setLoadingMsg('Salvando atividade...')

      // 2. Buscar dados da turma
      const { data: turmaData } = await (supabase as any)
        .from('turmas')
        .select('ano_letivo, nome')
        .eq('id', turmaId)
        .maybeSingle()

      // 3. Nome da matéria local
      const materia = materias.find((m) => m.id === materiaId)

      // 4. INSERT atividade
      const { data: atividade, error: insertError } = await (supabase as any)
        .from('atividades_secretaria')
        .insert({
          escola_id: escolaAtivaId,
          turma_id: turmaId,
          materia_id: materiaId,
          professor_id: funcionario.id,
          titulo: titulo.trim(),
          trimestre: Number(trimestre),
          data_aplicacao: dataAplicacao,
          observacoes: observacoes.trim() || null,
          arquivo_url,
          arquivo_nome: arquivo.name,
          arquivo_tipo: arquivo.type || null,
          ano_letivo: turmaData?.ano_letivo ?? null,
          status: 'recebida',
        })
        .select('id')
        .single()

      if (insertError) throw new Error(`Erro ao salvar atividade: ${insertError.message}`)

      const atividadeId = atividade.id

      setLoadingMsg('Notificando secretaria...')

      // 5. Buscar secretários (nivel=3) e diretores (nivel=2) como fallback
      const { data: acessosReceptores } = await (supabase as any)
        .from('acessos_usuarios')
        .select('nivel, funcionarios(id, nome, auth_user_id)')
        .eq('escola_id', escolaAtivaId)
        .eq('ativo', true)
        .in('nivel', [2, 3])

      const acessosValidos = (acessosReceptores ?? [])
        .filter((s: any) => s.funcionarios?.auth_user_id)

      // Preferir secretários; se não houver nenhum, notificar diretores
      const secretariosNivel3 = acessosValidos.filter((s: any) => s.nivel === 3)
      const receptores = secretariosNivel3.length > 0
        ? secretariosNivel3
        : acessosValidos.filter((s: any) => s.nivel === 2)

      if (receptores.length > 0) {
        const grupoId = crypto.randomUUID()
        const turmaNome = turmaData?.nome ?? 'turma'
        const materiaNome = materia?.nome ?? 'disciplina'
        const destinatarioLabel = secretariosNivel3.length > 0 ? 'secretaria' : 'direção'

        // Garantir que passamos UUIDs válidos e não nulos do auth.users
        const destinatariosIds = Array.from(new Set(
          receptores
            .map((s: any) => s.funcionarios.auth_user_id)
            .filter((id: string | null | undefined): id is string => !!id && id.trim() !== '')
        ))

        if (destinatariosIds.length > 0) {
          const { error: notifError } = await (supabase as any).rpc('criar_notificacoes', {
            p_destinatarios: destinatariosIds,
            p_title: 'Nova Atividade Recebida',
            p_message: `Professor ${funcionario.nome ?? 'Professor'} enviou uma atividade para ${turmaNome} — ${materiaNome}`,
            p_type: 'atividade_secretaria',
            p_link: `/avaliacoes?tab=central&id=${atividadeId}`,
            p_grupo_id: grupoId
          })

          if (notifError) {
            console.error(`Erro ao notificar ${destinatarioLabel}:`, notifError)
          }
        }
      } else {
        console.warn('Nenhum secretário ou diretor ativo encontrado para notificar nesta escola.')
      }

      toast.success('Atividade enviada com sucesso!')
      resetForm()
      onOpenChange(false)
      onSuccess()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message ?? 'Erro ao enviar atividade.')
    } finally {
      setLoading(false)
      setLoadingMsg('')
    }
  }

  return (
    <StandardDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Nova Atividade"
      maxWidth="sm:max-w-[560px]"
      footer={
        <div className="flex justify-end gap-3 w-full pt-4 border-t border-[#26262a]">
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={loading}
            className="text-zinc-400 hover:text-white hover:bg-[#26262a]"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="form-nova-atividade"
            disabled={loading}
            className="bg-[#3ea6ff] hover:bg-[#0090ff] text-black font-bold gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {loadingMsg || 'Enviando...'}
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Enviar Atividade
              </>
            )}
          </Button>
        </div>
      }
    >
      <form id="form-nova-atividade" onSubmit={handleSubmit}>
          <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
            {/* Escola (somente leitura) */}
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-sm">Escola</Label>
              <Input
                readOnly
                value={selectedEscola?.nome ?? escolaAtivaId ?? '—'}
                className="bg-[#1c1c1e] border-[#26262a] text-zinc-300 cursor-not-allowed"
              />
            </div>

            {/* Turma */}
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-sm">
                Turma <span className="text-red-400">*</span>
              </Label>
              <Select value={turmaId} onValueChange={(v) => setTurmaId(v ?? '')}>
                <SelectTrigger className="bg-[#1c1c1e] border-[#26262a] text-white focus:ring-[#3ea6ff]">
                  <SelectValue placeholder="Selecione a turma">
                    {turmaId
                      ? (turmas.find((t) => t.id === turmaId)?.nome || (turmas.length === 0 ? 'Carregando...' : turmaId))
                      : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-[#1c1c1e] border-[#26262a] text-white">
                  {turmas.length === 0 ? (
                    <SelectItem value="_empty" disabled>Nenhuma turma vinculada</SelectItem>
                  ) : (
                    turmas.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Disciplina */}
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-sm">
                Disciplina <span className="text-red-400">*</span>
              </Label>
              <Select
                value={materiaId}
                onValueChange={(v) => setMateriaId(v ?? '')}
                disabled={!turmaId}
              >
                <SelectTrigger className="bg-[#1c1c1e] border-[#26262a] text-white focus:ring-[#3ea6ff] disabled:opacity-50">
                  <SelectValue
                    placeholder={!turmaId ? 'Selecione a turma primeiro' : 'Selecione a disciplina'}
                  >
                    {materiaId
                      ? (materias.find((m) => m.id === materiaId)?.nome || (materias.length === 0 ? 'Carregando...' : materiaId))
                      : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-[#1c1c1e] border-[#26262a] text-white">
                  {materias.length === 0 ? (
                    <SelectItem value="_empty" disabled>Nenhuma disciplina encontrada</SelectItem>
                  ) : (
                    materias.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Título */}
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-sm">
                Título <span className="text-red-400">*</span>
              </Label>
              <Input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex.: Prova de Matemática — 1º Trimestre"
                className="bg-[#1c1c1e] border-[#26262a] text-white placeholder:text-zinc-600 focus-visible:ring-[#3ea6ff]"
              />
            </div>

            {/* Trimestre e Data em linha */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-sm">
                  Trimestre <span className="text-red-400">*</span>
                </Label>
                <Select value={trimestre} onValueChange={(v) => setTrimestre(v ?? '')}>
                  <SelectTrigger className="bg-[#1c1c1e] border-[#26262a] text-white focus:ring-[#3ea6ff]">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1c1c1e] border-[#26262a] text-white">
                    <SelectItem value="1">1º Trimestre</SelectItem>
                    <SelectItem value="2">2º Trimestre</SelectItem>
                    <SelectItem value="3">3º Trimestre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-sm">
                  Data de Aplicação <span className="text-red-400">*</span>
                </Label>
                <Input
                  type="date"
                  value={dataAplicacao}
                  min={!isDiretoria && prazoMinimoDias > 0 ? getMinDataAplicacaoStr(prazoMinimoDias) : undefined}
                  onChange={(e) => setDataAplicacao(e.target.value)}
                  className="bg-[#1c1c1e] border-[#26262a] text-white focus-visible:ring-[#3ea6ff]"
                />
                {!isDiretoria && prazoMinimoDias > 0 && (
                  <p className="text-[11px] text-amber-400/90 font-medium">
                    Prazo mínimo de envio: {prazoMinimoDias} dia(s) de antecedência.
                  </p>
                )}
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-sm">Observações</Label>
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={3}
                placeholder="Instruções adicionais para a secretaria (opcional)"
                className="w-full rounded-md border border-[#26262a] bg-[#1c1c1e] px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-[#3ea6ff] resize-none"
              />
            </div>

            {/* Arquivo */}
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-sm">
                Arquivo <span className="text-red-400">*</span>
              </Label>
              <label className="flex items-center gap-3 cursor-pointer w-full rounded-md border border-dashed border-[#26262a] bg-[#1c1c1e] px-4 py-3 hover:border-[#3ea6ff]/50 transition-colors group">
                <Upload className="w-4 h-4 text-zinc-500 group-hover:text-[#3ea6ff] shrink-0" />
                <span className="text-sm text-zinc-400 truncate">
                  {arquivo ? arquivo.name : 'Clique para selecionar (PDF, DOCX, DOC, imagens)'}
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx,.doc,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
                />
              </label>
              {arquivo && (
                <p className="text-xs text-zinc-500">
                  {(arquivo.size / 1024 / 1024).toFixed(2)} MB — {arquivo.type || 'tipo desconhecido'}
                </p>
              )}
            </div>
          </div>

        </form>
    </StandardDialog>
  )
}
