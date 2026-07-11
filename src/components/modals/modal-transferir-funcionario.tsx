'use client'

import { useState, useEffect } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowRightLeft, Search, FileUp, Building2, User } from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { logAudit } from '@/lib/audit/audit-agent'
import { toast } from 'sonner'

interface ModalTransferirFuncionarioProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function ModalTransferirFuncionario({ 
  open, 
  onOpenChange,
  onSuccess
}: ModalTransferirFuncionarioProps) {
  const supabase = createClient()
  const { funcionario: usuarioLogado, escolaAtivaId } = useAuthStore()

  const [loading, setLoading] = useState(false)
  const [funcionarios, setFuncionarios] = useState<any[]>([])
  const [escolas, setEscolas] = useState<any[]>([])

  // Formulário
  const [funcionarioSelecionadoId, setFuncionarioSelecionadoId] = useState('')
  const [escolaDestinoId, setEscolaDestinoId] = useState('')
  const [foraDaRede, setForaDaRede] = useState(false)
  const [motivo, setMotivo] = useState('')

  useEffect(() => {
    if (!open || !escolaAtivaId) return

    const carregarDados = async () => {
      setLoading(true)
      try {
        // 1. Carrega funcionários vinculados e ativos na escola atual
        const { data: vData } = await supabase
          .from('vinculos_funcionarios')
          .select('*, funcionarios(*)')
          .eq('escola_id', escolaAtivaId)
          .eq('ativo', true)

        if (vData) {
          const list = vData
            .map((v: any) => v.funcionarios)
            .filter((f: any) => f && !f.deleted_at)
          setFuncionarios(list)
        }

        // 2. Carrega escolas da rede exceto a atual
        const { data: eData } = await supabase
          .from('escolas')
          .select('id, nome')
          .is('deleted_at', null)
          .eq('ativo', true)
          .order('nome', { ascending: true })

        if (eData) {
          setEscolas(eData.filter((e: any) => e.id !== escolaAtivaId))
        }
      } catch (error) {
        console.error('Erro ao carregar dados do modal:', error)
      } finally {
        setLoading(false)
      }
    }

    carregarDados()
  }, [open, escolaAtivaId])

  const handleSubmeter = async () => {
    if (!escolaAtivaId) return toast.error('Escola ativa não configurada')
    if (!funcionarioSelecionadoId) return toast.error('Selecione um funcionário')
    if (!motivo) return toast.error('Descreva o motivo da transferência')
    if (!foraDaRede && !escolaDestinoId) return toast.error('Selecione a escola de destino ou marque "Fora da Rede"')
    if (!usuarioLogado) return toast.error('Usuário não autenticado')

    setLoading(true)

    try {
      const funcionarioObj = funcionarios.find(f => f.id === funcionarioSelecionadoId)
      if (!funcionarioObj) throw new Error('Funcionário não localizado localmente')

      if (foraDaRede) {
        // Fluxo Fora da Rede: Efetivação imediata e arquivamento
        
        // 1. Inativar vínculo na escola de origem
        const { error: deactivateError } = await supabase
          .from('vinculos_funcionarios')
          .update({ ativo: false, data_fim: new Date().toISOString() })
          .eq('funcionario_id', funcionarioSelecionadoId)
          .eq('escola_id', escolaAtivaId)
          .eq('ativo', true)

        if (deactivateError) throw deactivateError

        // 2. Soft-delete na tabela funcionarios
        const { error: staffDeleteError } = await supabase
          .from('funcionarios')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', funcionarioSelecionadoId)

        if (staffDeleteError) throw staffDeleteError

        // 3. Gravar backup em arquivados da escola de origem
        const { error: archiveError } = await supabase
          .from('arquivados')
          .insert({
            tipo: 'FUNCIONARIO_TRANSFERIDO',
            referencia_id: funcionarioSelecionadoId,
            tabela_origem: 'funcionarios',
            motivo: `TRANSFERENCIA_FORA_REDE: ${motivo}`,
            escola_origem_id: escolaAtivaId,
            arquivado_por: usuarioLogado.id,
            payload_completo: funcionarioObj,
            status: 'TRANSFERIDO'
          })

        if (archiveError) throw archiveError

        // 4. Auditoria
        await logAudit({
          supabase,
          action: 'DELETE',
          entity: 'funcionarios (ARQUIVAMENTO FORA REDE)',
          entityId: funcionarioSelecionadoId,
          oldData: funcionarioObj,
          performedBy: { id: usuarioLogado.id, name: usuarioLogado.nome, email: usuarioLogado.email },
          tenantId: escolaAtivaId || undefined
        })

        toast.success('Funcionário transferido para Fora da Rede e arquivado com sucesso!')
      } else {
        // Fluxo de solicitação interna pendente
        const { data: insertData, error: insertError } = await supabase
          .from('transferencias_funcionarios')
          .insert({
            funcionario_id: funcionarioSelecionadoId,
            escola_origem_id: escolaAtivaId,
            escola_destino_id: escolaDestinoId,
            solicitante_id: usuarioLogado.id,
            motivo,
            fora_da_rede: false,
            ficha_snapshot: funcionarioObj,
            status: 'PENDENTE'
          })
          .select('id')
          .single()

        if (insertError) throw insertError

        const transferId = insertData?.id

        // Notificar o diretor da escola destino
        const { data: escolaDest } = await supabase
          .from('escolas')
          .select('diretor_id')
          .eq('id', escolaDestinoId)
          .single()

        if (escolaDest && escolaDest.diretor_id) {
          await supabase.from('notifications').insert({
            user_id: escolaDest.diretor_id,
            title: 'Nova Solicitação de Transferência de Funcionário',
            message: `O funcionário ${funcionarioObj.nome} solicitou transferência para sua escola.`,
            type: 'INFO',
            link: `/transferencias?tab=funcionarios&subtab=recebimentos${transferId ? `&id=${transferId}` : ''}`
          })
        }

        toast.success('Solicitação de transferência enviada!')
      }

      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (err: any) {
      console.error(err)
      toast.error(`Erro ao salvar transferência: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-[#18181b] border-[#3f3f46] text-white">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2 m-0">
            <ArrowRightLeft className="w-5 h-5 text-sky-500" />
            Solicitar Transferência (Funcionário)
          </DialogTitle>
        </DialogHeader>

        <p className="text-[#aaa] text-xs mb-4">
          Transfira ou solicite a movimentação de um funcionário ativo desta unidade escolar para outra escola da rede ou para fora do município.
        </p>

        <div className="space-y-4">
          {/* Selecionar Funcionário */}
          <div className="space-y-2">
            <Label className="text-[#ccc] text-[13px]">Funcionário da Escola</Label>
            <select
              value={funcionarioSelecionadoId}
              onChange={(e) => setFuncionarioSelecionadoId(e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-[#121212] border border-[#3f3f46] text-white text-sm outline-none focus:border-sky-500"
            >
              <option value="">
                {funcionarios.length === 0 ? 'Carregando funcionários...' : 'Selecione o funcionário...'}
              </option>
              {funcionarios.map(f => (
                <option key={f.id} value={f.id}>{f.nome} ({f.cargo ?? 'Sem Cargo'})</option>
              ))}
            </select>
          </div>

          {/* Checkbox Fora da Rede */}
          <div className="flex items-center gap-3 p-3 bg-sky-500/10 border border-sky-500/20 rounded-lg">
            <input 
              type="checkbox" 
              id="foraDaRedeFunc" 
              checked={foraDaRede}
              onChange={(e) => setForaDaRede(e.target.checked)}
              className="w-4 h-4 accent-sky-500 rounded border-gray-600 bg-gray-700 cursor-pointer"
            />
            <label htmlFor="foraDaRedeFunc" className="text-xs text-sky-400 font-semibold cursor-pointer">
              Transferência para FORA DA REDE MUNICIPAL (Desvincula e Arquiva)
            </label>
          </div>

          {/* Selecionar Escola de Destino se não for Fora da Rede */}
          {!foraDaRede && (
            <div className="space-y-2">
              <Label className="text-[#ccc] text-[13px]">Escola de Destino</Label>
              <select
                value={escolaDestinoId}
                onChange={(e) => setEscolaDestinoId(e.target.value)}
                className="w-full h-10 px-3 rounded-md bg-[#121212] border border-[#3f3f46] text-white text-sm outline-none focus:border-sky-500"
              >
                <option value="">Selecione a escola destino...</option>
                {escolas.map(e => (
                  <option key={e.id} value={e.id}>{e.nome}</option>
                ))}
              </select>
            </div>
          )}

          {/* Motivo */}
          <div className="space-y-2">
            <Label className="text-[#ccc] text-[13px]">Motivo / Justificativa</Label>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full bg-[#121212] border-[#3f3f46] text-white resize-none text-sm"
              rows={3}
              placeholder="Digite o motivo da transferência ou portaria correspondente..."
            />
          </div>
        </div>

        <DialogFooter className="mt-6 flex justify-end gap-3">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="text-[#aaa] hover:bg-[#27272a] hover:text-white"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmeter}
            disabled={loading}
            className="bg-sky-600 text-white hover:bg-sky-700 font-medium"
          >
            {loading ? 'Processando...' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
