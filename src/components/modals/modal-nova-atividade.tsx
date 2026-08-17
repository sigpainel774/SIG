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
  initialTurmaId?: string
  initialMateriaId?: string
  initialTrimestre?: string
}

export function ModalNovaAtividade({
  open,
  onOpenChange,
  onSuccess,
  initialTurmaId,
  initialMateriaId,
  initialTrimestre
}: ModalNovaAtividadeProps) {
  const { funcionario, escolaAtivaId, acessos, isAdminGlobalOrRoot } = useAuthStore()
  const { selectedEscola } = useSchoolStore()

  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')

  const [turmas, setTurmas] = useState<any[]>([])
  const [materias, setMaterias] = useState<any[]>([])
  const [prazoMinimoDias, setPrazoMinimoDias] = useState<number>(5)

  const [turmaId, setTurmaId] = useState(initialTurmaId ?? '')
  const [materiaId, setMateriaId] = useState(initialMateriaId ?? '')
  const [titulo, setTitulo] = useState('')
  const [trimestre, setTrimestre] = useState(initialTrimestre ?? '')
  const [pontosMaximos, setPontosMaximos] = useState('2.5')
  const [dataAplicacao, setDataAplicacao] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [pontosJaCadastrados, setPontosJaCadastrados] = useState<number>(0)
  const [atividadesCount, setAtividadesCount] = useState<number>(0)

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

  // Sincronizar initialProps quando o modal abre
  useEffect(() => {
    if (open) {
      if (initialTurmaId) setTurmaId(initialTurmaId)
      if (initialMateriaId) setMateriaId(initialMateriaId)
      if (initialTrimestre) setTrimestre(initialTrimestre)
    }
  }, [open, initialTurmaId, initialMateriaId, initialTrimestre])

  // Buscar total de pontos e contagem de atividades já cadastradas para a turma/materia/trimestre
  useEffect(() => {
    if (!open || !turmaId || !materiaId || !trimestre || !escolaAtivaId) {
      setPontosJaCadastrados(0)
      setAtividadesCount(0)
      return
    }

    let active = true
    const loadPontosAcumulados = async () => {
      const supabase = createClient()
      const { data, error } = await (supabase as any)
        .from('atividades_secretaria')
        .select('id, pontos_maximos')
        .eq('escola_id', escolaAtivaId)
        .eq('turma_id', turmaId)
        .eq('materia_id', materiaId)
        .eq('trimestre', Number(trimestre))

      if (!error && data && active) {
        const soma = data.reduce((acc: number, curr: any) => acc + (Number(curr.pontos_maximos) || 0), 0)
        setPontosJaCadastrados(parseFloat(soma.toFixed(2)))
        setAtividadesCount(data.length)
      }
    }
    loadPontosAcumulados()
    return () => {
      active = false
    }
  }, [open, turmaId, materiaId, trimestre, escolaAtivaId])

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
        toast.error('Erro ao carregar turmas vinculadas ao professor.')
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
        toast.error('Erro ao carregar disciplinas da turma.')
        return
      }
      setMaterias(data ?? [])
      if (initialMateriaId && data?.some((m: any) => m.id === initialMateriaId)) {
        setMateriaId(initialMateriaId)
      } else if (!materiaId && data && data.length > 0) {
        setMateriaId(data[0].id)
      }
    }
    loadMaterias()
  }, [turmaId, funcionario?.id, initialMateriaId])

  const resetForm = () => {
    setTurmaId(initialTurmaId ?? '')
    setMateriaId(initialMateriaId ?? '')
    setTitulo('')
    setTrimestre(initialTrimestre ?? '')
    setPontosMaximos('2.5')
    setDataAplicacao('')
    setObservacoes('')
    setArquivo(null)
    setMaterias([])
    setPontosJaCadastrados(0)
    setAtividadesCount(0)
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
    
    const ptsNum = Number(pontosMaximos.replace(',', '.'))
    if (isNaN(ptsNum) || ptsNum < 1.0 || ptsNum > 10.0) {
      toast.error('A pontuação mínima da atividade é 1.0 ponto (máximo de 10.0 pontos).')
      return
    }

    if (atividadesCount >= 10) {
      toast.error('Limite máximo de 10 atividades por trimestre atingido para esta disciplina.')
      return
    }

    if (!dataAplicacao) { toast.error('Informe a data de aplicação.'); return }
    if (!escolaAtivaId || !funcionario?.id) { toast.error('Sessão inválida. Recarregue a página.'); return }

    // Validar se soma ultrapassa 10 pontos
    if (pontosJaCadastrados + ptsNum > 10.0) {
      toast.error(`A soma dos pontos (${(pontosJaCadastrados + ptsNum).toFixed(1)} pts) ultrapassa o limite de 10.0 pontos do trimestre. Pontos restantes disponíveis: ${(10.0 - pontosJaCadastrados).toFixed(1)} pts.`)
      return
    }

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
    setLoadingMsg('Salvando atividade...')

    try {
      const supabase = createClient()

      let arquivo_url = null
      let arquivo_nome = null
      let arquivo_tipo = null

      // 1. Upload do arquivo (se houver)
      if (arquivo) {
        setLoadingMsg('Enviando arquivo anexo...')
        const cleanName = arquivo.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
        const path = `${escolaAtivaId}/${turmaId}/${Date.now()}_${cleanName}`
        const { error: uploadError } = await supabase.storage
          .from('atividades-secretaria')
          .upload(path, arquivo, { upsert: false })

        if (uploadError) throw new Error(`Erro no upload: ${uploadError.message}`)

        const { data: publicUrlData } = supabase.storage
          .from('atividades-secretaria')
          .getPublicUrl(path)
        arquivo_url = publicUrlData.publicUrl
        arquivo_nome = arquivo.name
        arquivo_tipo = arquivo.type || null
      }

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
          turma_id: turmaId || null,
          materia_id: materiaId || null,
          professor_id: funcionario.id,
          titulo: titulo.trim(),
          trimestre: Number(trimestre),
          pontos_maximos: ptsNum,
          ordem_atividade: atividadesCount + 1,
          data_aplicacao: dataAplicacao,
          observacoes: observacoes.trim() || null,
          arquivo_url,
          arquivo_nome,
          arquivo_tipo,
          ano_letivo: turmaData?.ano_letivo ?? null,
          status: 'recebida',
          enviado_impressao: Boolean(arquivo),
          enviado_impressao_em: arquivo ? new Date().toISOString() : null,
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
        <div className="flex justify-end gap-3 w-full pt-4 border-t border-borderCustom">
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={loading}
            className="text-muted-foreground hover:text-foreground hover:bg-muted"
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
              <Label className="text-muted-foreground text-sm">Escola</Label>
              <Input
                readOnly
                value={selectedEscola?.nome ?? escolaAtivaId ?? '—'}
                className="bg-muted border-borderCustom text-foreground/70 cursor-not-allowed"
              />
            </div>

            {/* Turma */}
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-sm">
                Turma <span className="text-red-400">*</span>
              </Label>
              <Select value={turmaId} onValueChange={(v) => setTurmaId(v ?? '')}>
                <SelectTrigger className="bg-input border-borderCustom text-foreground focus:ring-highlight">
                  <SelectValue placeholder="Selecione a turma">
                    {turmaId
                      ? (turmas.find((t) => t.id === turmaId)?.nome || (turmas.length === 0 ? 'Carregando...' : turmaId))
                      : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-popover border-borderCustom text-popover-foreground">
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
              <Label className="text-muted-foreground text-sm">
                Disciplina <span className="text-red-400">*</span>
              </Label>
              <Select
                value={materiaId}
                onValueChange={(v) => setMateriaId(v ?? '')}
                disabled={!turmaId}
              >
                <SelectTrigger className="bg-input border-borderCustom text-foreground focus:ring-highlight disabled:opacity-50">
                  <SelectValue
                    placeholder={!turmaId ? 'Selecione a turma primeiro' : 'Selecione a disciplina'}
                  >
                    {materiaId
                      ? (materias.find((m) => m.id === materiaId)?.nome || (materias.length === 0 ? 'Carregando...' : materiaId))
                      : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-popover border-borderCustom text-popover-foreground">
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
              <Label className="text-muted-foreground text-sm">
                Título <span className="text-red-400">*</span>
              </Label>
              <Input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex.: Prova de Matemática — 1º Trimestre"
                className="bg-input border-borderCustom text-foreground placeholder:text-muted-foreground focus-visible:ring-highlight"
              />
            </div>

            {/* Trimestre, Pontos e Data em linha */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-sm">
                  Trimestre <span className="text-red-400">*</span>
                </Label>
                <Select value={trimestre} onValueChange={(v) => setTrimestre(v ?? '')}>
                  <SelectTrigger className="bg-input border-borderCustom text-foreground focus:ring-highlight">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-borderCustom text-popover-foreground">
                    <SelectItem value="1">1º Trimestre</SelectItem>
                    <SelectItem value="2">2º Trimestre</SelectItem>
                    <SelectItem value="3">3º Trimestre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-sm flex items-center justify-between">
                  <span>Pontos Máx. <span className="text-red-400">*</span></span>
                  <span className="text-[11px] text-zinc-400 font-normal">Min: 1.0</span>
                </Label>
                <Input
                  type="number"
                  step="0.5"
                  min="1"
                  max="10"
                  value={pontosMaximos}
                  onChange={(e) => setPontosMaximos(e.target.value)}
                  placeholder="Ex: 2.5"
                  className="bg-input border-borderCustom text-foreground focus-visible:ring-highlight"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-sm">
                  Data de Aplicação <span className="text-red-400">*</span>
                </Label>
                <Input
                  type="date"
                  value={dataAplicacao}
                  min={!isDiretoria && prazoMinimoDias > 0 ? getMinDataAplicacaoStr(prazoMinimoDias) : undefined}
                  onChange={(e) => setDataAplicacao(e.target.value)}
                  className="bg-input border-borderCustom text-foreground focus-visible:ring-highlight"
                />
              </div>
            </div>

            {/* Resumo de Pontos do Trimestre */}
            {trimestre && (
              <div className="bg-muted/40 border border-borderCustom rounded-lg p-3 text-xs flex items-center justify-between">
                <div>
                  <span className="text-muted-foreground">Pontos já cadastrados neste trimestre: </span>
                  <strong className="text-foreground">{pontosJaCadastrados.toFixed(1)} / 10.0 pts</strong>
                  <span className="text-zinc-500 ml-2">({atividadesCount}/10 atividades)</span>
                </div>
                <div className="font-semibold text-[#3ea6ff]">
                  {pontosJaCadastrados + (Number(pontosMaximos) || 0) <= 10.0
                    ? `Ficará: ${(pontosJaCadastrados + (Number(pontosMaximos) || 0)).toFixed(1)} / 10.0 pts`
                    : <span className="text-red-400">Ultrapassa 10 pts</span>}
                </div>
              </div>
            )}

            {!isDiretoria && prazoMinimoDias > 0 && (
              <p className="text-[11px] text-amber-400/90 font-medium">
                Prazo mínimo para impressão: {prazoMinimoDias} dia(s) de antecedência.
              </p>
            )}

            {/* Observações */}
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-sm">Observações</Label>
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={2}
                placeholder="Instruções adicionais para a secretaria (opcional)"
                className="w-full rounded-md border border-borderCustom bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-highlight resize-none"
              />
            </div>

            {/* Arquivo */}
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-sm flex items-center justify-between">
                <span>Arquivo para Impressão</span>
                <span className="text-[11px] text-zinc-400 font-normal">Opcional para planejamento</span>
              </Label>
              <label className="flex items-center gap-3 cursor-pointer w-full rounded-md border border-dashed border-borderCustom bg-muted/60 px-4 py-3 hover:border-highlight/50 transition-colors group">
                <Upload className="w-4 h-4 text-zinc-500 group-hover:text-[#3ea6ff] shrink-0" />
                <span className="text-sm text-muted-foreground truncate">
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
