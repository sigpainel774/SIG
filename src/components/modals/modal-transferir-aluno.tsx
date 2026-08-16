'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowRightLeft, HeartHandshake } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { useAuthStore } from '@/store/useAuthStore'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'

interface ModalTransferirAlunoProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
  alunoNome?: string
  alunoId?: string
  escolaOrigemId?: string
  onSuccess?: () => void
}

export function ModalTransferirAluno({ 
  open, 
  onOpenChange, 
  trigger, 
  alunoNome = 'Aluno', 
  alunoId,
  escolaOrigemId,
  onSuccess
}: ModalTransferirAlunoProps) {
  const { funcionario, escolaAtivaId } = useAuthStore()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const [tipoMovimentacao, setTipoMovimentacao] = useState<'TRANSFERENCIA_REGULAR' | 'ENCAMINHAMENTO_EMMAE'>('TRANSFERENCIA_REGULAR')
  const [escolaDestino, setEscolaDestino] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [arquivos, setArquivos] = useState<FileList | null>(null)

  const activeOpen = open !== undefined ? open : isOpen
  const escolaOrigemEfetiva = escolaOrigemId || escolaAtivaId

  // Buscar escolas ativas reais do Supabase
  const { data: escolas = [] } = useSWR(
    activeOpen ? 'escolas_ativas_transferencia' : null,
    async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('escolas')
        .select('id, nome, tipo')
        .is('deleted_at', null)
        .eq('ativo', true)
        .order('nome', { ascending: true })
      if (error) throw error
      return data || []
    }
  )

  // Encontrar ID da unidade EMMAE automaticamente
  const escolaEmaee = escolas.find((e: any) => 
    e.tipo === 'EMMAE' || e.nome.toUpperCase().includes('EMMAE')
  )

  const handleOpenChange = (val: boolean) => {
    if (onOpenChange) onOpenChange(val)
    setIsOpen(val)
    if (!val) {
      setEscolaDestino('')
      setObservacoes('')
      setArquivos(null)
      setTipoMovimentacao('TRANSFERENCIA_REGULAR')
    }
  }

  const handleSalvarTransferencia = async () => {
    if (!alunoId) {
      toast.error('Aluno não identificado para movimentação.')
      return
    }

    const destinoFinalId = tipoMovimentacao === 'ENCAMINHAMENTO_EMMAE' 
      ? (escolaEmaee?.id || escolaDestino) 
      : escolaDestino

    if (!destinoFinalId) {
      toast.error(
        tipoMovimentacao === 'ENCAMINHAMENTO_EMMAE' 
          ? 'Unidade do EMMAE não localizada no sistema.' 
          : 'Selecione uma escola de destino.'
      )
      return
    }

    if (!observacoes.trim()) {
      toast.error('Informe o motivo ou a justificativa da solicitação.')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const arquivosPayload: any[] = []

      // Upload de Anexos caso informados
      if (arquivos && arquivos.length > 0) {
        for (let i = 0; i < arquivos.length; i++) {
          const file = arquivos[i]
          const fileExt = file.name.split('.').pop()
          const fileName = `requerimento_aee_${alunoId}_${Date.now()}_${i}.${fileExt}`
          const filePath = `${alunoId}/${fileName}`

          const { error: uploadError } = await supabase.storage
            .from('anexos-alunos')
            .upload(filePath, file)

          if (uploadError) {
            console.warn('Erro ao fazer upload do anexo:', uploadError)
          } else {
            const { data: publicUrlData } = supabase.storage
              .from('anexos-alunos')
              .getPublicUrl(filePath)
            
            arquivosPayload.push({
              nome: file.name,
              path: filePath,
              url: publicUrlData.publicUrl
            })
          }
        }
      }

      // Buscar snapshot cadastral do aluno
      const { data: alunoSnapshot } = await supabase
        .from('alunos')
        .select('*')
        .eq('id', alunoId)
        .single()

      if (tipoMovimentacao === 'ENCAMINHAMENTO_EMMAE') {
        // Chamada RPC segura para o EMMAE
        const { error: rpcError } = await (supabase as any).rpc('solicitar_encaminhamento_emaee', {
          p_aluno_id: alunoId,
          p_escola_origem_id: escolaOrigemEfetiva,
          p_escola_emaee_id: destinoFinalId,
          p_solicitante_id: funcionario?.id ?? null,
          p_motivo: observacoes,
          p_arquivos_anexos: arquivosPayload,
          p_ficha_snapshot: alunoSnapshot || {}
        })

        if (rpcError) throw rpcError

        toast.success('Requerimento de AEE enviado ao EMMAE com sucesso! A equipe Nível 2 do EMMAE foi notificada.')
      } else {
        // Transferência regular de escola
        const { error: insertError } = await (supabase.from('transferencias_alunos') as any)
          .insert({
            aluno_id: alunoId,
            escola_origem_id: escolaOrigemEfetiva,
            escola_destino_id: destinoFinalId,
            solicitante_id: funcionario?.id ?? null,
            motivo: observacoes,
            tipo_movimentacao: 'TRANSFERENCIA_REGULAR',
            arquivos_anexos: arquivosPayload,
            ficha_snapshot: alunoSnapshot || {},
            status: 'PENDENTE'
          })

        if (insertError) throw insertError

        toast.success('Solicitação de transferência registrada com sucesso!')
      }

      if (onSuccess) onSuccess()
      handleOpenChange(false)
    } catch (err: any) {
      console.error('Erro ao processar movimentação:', err)
      toast.error(`Erro ao salvar solicitação: ${err.message || 'Falha inesperada.'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {trigger && (
        <div onClick={() => handleOpenChange(true)} className="inline-block cursor-pointer">
          {trigger}
        </div>
      )}
      <StandardDialog
        open={activeOpen}
        onOpenChange={handleOpenChange}
        title="Solicitar Movimentação do Aluno"
        maxWidth="sm:max-w-[500px]"
        footer={
          <div className="flex justify-end gap-3 w-full">
            <Button 
              variant="ghost" 
              onClick={() => handleOpenChange(false)}
              className="text-muted-foreground hover:bg-muted hover:text-white"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSalvarTransferencia}
              disabled={loading}
              className="bg-highlight text-black hover:bg-highlight/90 font-bold"
            >
              {loading ? 'Processando...' : tipoMovimentacao === 'ENCAMINHAMENTO_EMMAE' ? 'Enviar para o EMMAE' : 'Solicitar Transferência'}
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          {/* Seletor de Tipo de Movimentação */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-[#121212] rounded-xl border border-border">
            <button
              type="button"
              onClick={() => setTipoMovimentacao('TRANSFERENCIA_REGULAR')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                tipoMovimentacao === 'TRANSFERENCIA_REGULAR' 
                  ? 'bg-[#27272a] text-white shadow' 
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              Transferência Regular
            </button>

            <button
              type="button"
              onClick={() => {
                setTipoMovimentacao('ENCAMINHAMENTO_EMMAE')
                if (escolaEmaee) setEscolaDestino(escolaEmaee.id)
              }}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                tipoMovimentacao === 'ENCAMINHAMENTO_EMMAE' 
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow' 
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <HeartHandshake className="w-3.5 h-3.5" />
              AEE / EMMAE
            </button>
          </div>

          <p className="text-muted-foreground text-xs leading-relaxed">
            {tipoMovimentacao === 'ENCAMINHAMENTO_EMMAE' ? (
              <span>
                Você está solicitando o acompanhamento especializado para <strong className="text-white">{alunoNome}</strong> no <strong className="text-amber-400">EMMAE</strong>. A pasta do aluno e o requerimento serão enviados para a fila de acolhimento Nível 2.
              </span>
            ) : (
              <span>
                Você está solicitando a transferência de <strong className="text-white">{alunoNome}</strong> para outra escola regular. A escola de destino precisará aprovar.
              </span>
            )}
          </p>

          <div className="space-y-4">
            {/* Campo de Escola de Destino (Caso não seja EMMAE ou EMMAE não fixado) */}
            {tipoMovimentacao === 'TRANSFERENCIA_REGULAR' && (
              <div className="space-y-2">
                <Label className="text-[#ccc] text-[13px]">Escola de Destino *</Label>
                <Select value={escolaDestino} onValueChange={(val) => val && setEscolaDestino(val)}>
                  <SelectTrigger className="w-full bg-[#121212] border-[#3f3f46] text-white">
                    <SelectValue placeholder="Selecione a escola de destino...">
                      {escolaDestino
                        ? (escolas.find((e: any) => e.id === escolaDestino)?.nome || (escolas.length === 0 ? 'Carregando...' : escolaDestino))
                        : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-background border-[#3f3f46] text-foreground">
                    {escolas
                      .filter((e: any) => e.id !== escolaOrigemEfetiva && e.tipo !== 'EMMAE')
                      .map((e: any) => (
                        <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {tipoMovimentacao === 'ENCAMINHAMENTO_EMMAE' && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center justify-between">
                <div>
                  <span className="block font-bold text-white">Destino Fixado: EMMAE</span>
                  <span className="text-[11px] text-amber-200/80">Espaço de Multiatendimento Pedagógico e Assistencial</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-[#ccc] text-[13px]">
                {tipoMovimentacao === 'ENCAMINHAMENTO_EMMAE' ? 'Principal Queixa / Justificativa AEE *' : 'Observações / Motivo *'}
              </Label>
              <Textarea 
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="w-full bg-[#121212] border-[#3f3f46] text-white" 
                rows={3} 
                placeholder={
                  tipoMovimentacao === 'ENCAMINHAMENTO_EMMAE'
                    ? 'Descreva os desafios de aprendizagem, suspeitas diagnósticas ou justificativas do AEE...'
                    : 'Motivo da transferência, histórico relevante...'
                }
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[#ccc] text-[13px]">
                {tipoMovimentacao === 'ENCAMINHAMENTO_EMMAE' ? 'Anexar Requerimento AEE / Laudo (Recomendado)' : 'Anexar Documentos (Opcional)'}
              </Label>
              <Input 
                type="file" 
                multiple 
                onChange={(e) => setArquivos(e.target.files)}
                className="w-full bg-[#121212] border-[#3f3f46] text-white file:text-white" 
              />
              <span className="text-[11px] text-[#666]">Formatos aceitos: PDF, JPG, PNG.</span>
            </div>
          </div>
        </div>
      </StandardDialog>
    </>
  )
}
