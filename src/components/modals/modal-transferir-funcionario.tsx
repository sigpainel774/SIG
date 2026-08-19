'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowRightLeft, Building2, User, AlertCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { useSchoolStore } from '@/store/useSchoolStore'
import { logAudit } from '@/lib/audit/audit-agent'
import { coletarAuthUserIds } from '@/lib/notifications/lotacaoNotifications'
import { EscolaSearchSelect } from '@/components/modals/lotacoes/EscolaSearchSelect'
import { FuncionarioSearchSelect, FuncionarioOption } from '@/components/modals/lotacoes/FuncionarioSearchSelect'
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
  const { funcionario: usuarioLogado, escolaAtivaId: authEscolaAtivaId, isAdminGlobalOrRoot } = useAuthStore()
  const { selectedEscola } = useSchoolStore()

  // Escola de Origem inicial
  const escolaPadraoId = authEscolaAtivaId || selectedEscola?.id || ''
  const [escolaOrigemId, setEscolaOrigemId] = useState<string>(escolaPadraoId)

  const [loadingGeral, setLoadingGeral] = useState(false)
  const [loadingFuncionarios, setLoadingFuncionarios] = useState(false)
  const [loadingEscolas, setLoadingEscolas] = useState(false)

  const [funcionarios, setFuncionarios] = useState<FuncionarioOption[]>([])
  const [escolas, setEscolas] = useState<any[]>([])

  // Campos do Formulário
  const [funcionarioSelecionadoId, setFuncionarioSelecionadoId] = useState('')
  const [escolaDestinoId, setEscolaDestinoId] = useState('')
  const [foraDaRede, setForaDaRede] = useState(false)
  const [motivo, setMotivo] = useState('')

  // Sincroniza escolaOrigemId quando o modal abre ou a escola selecionada muda
  useEffect(() => {
    if (open) {
      const activeId = authEscolaAtivaId || selectedEscola?.id || ''
      setEscolaOrigemId(activeId)
      setFuncionarioSelecionadoId('')
      setEscolaDestinoId('')
      setForaDaRede(false)
      setMotivo('')
    }
  }, [open, authEscolaAtivaId, selectedEscola])

  // 1. Carrega a lista completa de escolas da rede
  useEffect(() => {
    if (!open) return

    let isMounted = true
    const carregarEscolas = async () => {
      setLoadingEscolas(true)
      try {
        const { data, error } = await supabase
          .from('escolas')
          .select('id, nome, tipo, ativo')
          .is('deleted_at', null)
          .eq('ativo', true)
          .order('nome', { ascending: true })

        if (error) throw error
        if (isMounted && data) {
          setEscolas(data)
        }
      } catch (err: any) {
        console.error('Erro ao carregar escolas no modal de transferência:', err)
        toast.error('Erro ao carregar lista de escolas.')
      } finally {
        if (isMounted) setLoadingEscolas(false)
      }
    }

    carregarEscolas()

    return () => {
      isMounted = false
    }
  }, [open, supabase])

  // 2. Carrega os funcionários vinculados à escola de origem selecionada
  const carregarFuncionariosDaEscola = useCallback(async (origemId: string) => {
    if (!origemId) {
      setFuncionarios([])
      return
    }

    setLoadingFuncionarios(true)
    try {
      const { data: vData, error: vError } = await supabase
        .from('vinculos_funcionarios')
        .select(`
          id,
          cargo,
          ativo,
          escola_id,
          funcionario_id,
          funcionarios (
            id,
            nome,
            cpf,
            cargo,
            email,
            foto_url,
            auth_user_id,
            is_superadmin,
            deleted_at,
            acessos_usuarios (
              id,
              nivel,
              ativo
            )
          )
        `)
        .eq('escola_id', origemId)
        .eq('ativo', true)

      if (vError) {
        console.error('Erro ao buscar vínculos de funcionários:', vError)
        // Fallback: se der erro no join avançado, buscar diretamente de funcionarios
        const { data: fData, error: fError } = await supabase
          .from('funcionarios')
          .select('id, nome, cpf, cargo, email, foto_url, auth_user_id, is_superadmin, deleted_at')
          .is('deleted_at', null)
          .order('nome', { ascending: true })

        if (fError) throw fError

        const list = (fData || []).filter((f: any) => {
          if (f.is_superadmin) return false
          if (f.nome?.toLowerCase() === 'root' || f.email?.toLowerCase().startsWith('root@')) return false
          return true
        })
        setFuncionarios(list)
        return
      }

      if (vData) {
        const list: FuncionarioOption[] = vData
          .filter((v: any) => v.funcionarios && !v.funcionarios.deleted_at)
          .map((v: any) => ({
            ...v.funcionarios,
            lotacao_id: v.id,
            cargo_vinculo: v.cargo || v.funcionarios.cargo
          }))
          .filter((f: any) => {
            if (f.is_superadmin) return false
            if (f.nome?.toLowerCase() === 'root' || f.email?.toLowerCase().startsWith('root@')) return false
            const acessos = f.acessos_usuarios ?? []
            if (acessos.some((a: any) => a.nivel === 1 && a.ativo)) return false
            return true
          })
          .sort((a, b) => (a.nome ?? '').localeCompare(b.nome ?? ''))

        setFuncionarios(list)
      }
    } catch (err: any) {
      console.error('Erro ao carregar funcionários:', err)
      toast.error('Erro ao carregar funcionários da escola selecionada.')
    } finally {
      setLoadingFuncionarios(false)
    }
  }, [supabase])

  // Recarrega funcionários sempre que a escolaOrigemId mudar
  useEffect(() => {
    if (open && escolaOrigemId) {
      carregarFuncionariosDaEscola(escolaOrigemId)
    } else {
      setFuncionarios([])
    }
  }, [open, escolaOrigemId, carregarFuncionariosDaEscola])

  // Escolas de destino disponíveis (excluindo a de origem)
  const escolasDestinoDisponiveis = useMemo(() => {
    return escolas.filter((e) => e.id !== escolaOrigemId)
  }, [escolas, escolaOrigemId])

  // Nome da escola de origem para exibição
  const nomeEscolaOrigem = useMemo(() => {
    if (!escolaOrigemId) return ''
    const esc = escolas.find((e) => e.id === escolaOrigemId)
    return esc?.nome ?? (selectedEscola?.id === escolaOrigemId ? selectedEscola.nome : 'Escola Selecionada')
  }, [escolaOrigemId, escolas, selectedEscola])

  // Funcionário selecionado completo
  const funcionarioObj = useMemo(() => {
    return funcionarios.find((f) => f.id === funcionarioSelecionadoId)
  }, [funcionarios, funcionarioSelecionadoId])

  const handleSubmeter = async () => {
    if (!escolaOrigemId) {
      toast.error('Selecione a Escola de Origem')
      return
    }
    if (!funcionarioSelecionadoId) {
      toast.error('Selecione um funcionário na lista com busca')
      return
    }
    if (!motivo.trim()) {
      toast.error('Descreva o motivo ou justificativa da transferência')
      return
    }
    if (!foraDaRede && !escolaDestinoId) {
      toast.error('Selecione a escola de destino ou marque "Fora da Rede"')
      return
    }
    if (!usuarioLogado) {
      toast.error('Usuário não autenticado')
      return
    }

    setLoadingGeral(true)

    try {
      if (!funcionarioObj) {
        throw new Error('Funcionário não localizado na lista de servidores ativos.')
      }

      // Buscar o vínculo ativo específico do funcionário nesta escola de origem
      let lotacaoVinculoId = (funcionarioObj as any).lotacao_id

      if (!lotacaoVinculoId) {
        const { data: vinculoAtivo, error: vinculoError } = await supabase
          .from('vinculos_funcionarios')
          .select('id')
          .eq('funcionario_id', funcionarioSelecionadoId)
          .eq('escola_id', escolaOrigemId)
          .eq('ativo', true)
          .limit(1)
          .maybeSingle()

        if (vinculoError) throw vinculoError
        lotacaoVinculoId = vinculoAtivo?.id ?? null
      }

      if (foraDaRede) {
        // Fluxo Fora da Rede: Efetivação imediata e arquivamento
        if (lotacaoVinculoId) {
          // 1. Inativar vínculo na escola de origem por id
          const { error: deactivateError } = await supabase
            .from('vinculos_funcionarios')
            .update({ ativo: false, data_fim: new Date().toISOString().split('T')[0] })
            .eq('id', lotacaoVinculoId)

          if (deactivateError) throw deactivateError
        }

        // Verificar se ele tem outros vínculos ativos na rede
        const { data: outrosVinculos, error: checkError } = await supabase
          .from('vinculos_funcionarios')
          .select('id')
          .eq('funcionario_id', funcionarioSelecionadoId)
          .eq('ativo', true)

        if (checkError) throw checkError

        // 2. Soft-delete na tabela funcionarios APENAS se ele não tiver outros vínculos ativos na rede
        if (!outrosVinculos || outrosVinculos.length === 0) {
          const { error: staffDeleteError } = await supabase
            .from('funcionarios')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', funcionarioSelecionadoId)

          if (staffDeleteError) throw staffDeleteError
        }

        // 3. Gravar backup em arquivados da escola de origem
        const { error: archiveError } = await supabase
          .from('arquivados')
          .insert({
            tipo: 'FUNCIONARIO_TRANSFERIDO',
            referencia_id: funcionarioSelecionadoId,
            tabela_origem: 'funcionarios',
            motivo: `TRANSFERENCIA_FORA_REDE: ${motivo.trim()}`,
            escola_origem_id: escolaOrigemId,
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
          performedBy: { 
            id: usuarioLogado?.id ?? null, 
            name: usuarioLogado?.nome ?? '', 
            email: usuarioLogado?.email ?? '' 
          },
          tenantId: escolaOrigemId || undefined
        })

        toast.success('Funcionário transferido para Fora da Rede e arquivado com sucesso!')

        if (funcionarioObj.auth_user_id) {
          const { invalidarCachePerfil } = await import('@/lib/invalidarCachePerfil')
          await invalidarCachePerfil(funcionarioObj.auth_user_id)
        }
      } else {
        // Fluxo de solicitação interna pendente
        const { data: insertData, error: insertError } = await (supabase as any)
          .from('transferencias_funcionarios')
          .insert({
            funcionario_id: funcionarioSelecionadoId,
            escola_origem_id: escolaOrigemId,
            escola_destino_id: escolaDestinoId,
            solicitante_id: usuarioLogado.id,
            motivo: motivo.trim(),
            fora_da_rede: false,
            ficha_snapshot: funcionarioObj,
            lotacao_id: lotacaoVinculoId,
            status: 'PENDENTE'
          })
          .select('id')
          .single()

        if (insertError) throw insertError

        const transferId = insertData?.id

        // Notificar chefes do DESTINO (nível 2 e 3) e chefes de ORIGEM (nível 2)
        try {
          const chefesDestino = await coletarAuthUserIds(supabase, [escolaDestinoId], [2, 3])
          const chefesOrigem = await coletarAuthUserIds(supabase, [escolaOrigemId], [2])

          const destinatariosDestino = Array.from(new Set<string>(chefesDestino))
          const destinatariosOrigem = Array.from(new Set<string>(chefesOrigem))

          if (destinatariosDestino.length > 0) {
            await (supabase as any).rpc('criar_notificacoes', {
              p_destinatarios: destinatariosDestino,
              p_tenant_id: escolaDestinoId,
              p_title: 'Nova Solicitação de Transferência de Funcionário',
              p_message: `O servidor ${funcionarioObj.nome} solicitou transferência para sua escola.`,
              p_type: 'INFO',
              p_link: `/transferencias?tab=funcionarios&subtab=recebimentos${transferId ? `&id=${transferId}` : ''}`,
              p_grupo_id: null
            })
          }

          if (destinatariosOrigem.length > 0) {
            await (supabase as any).rpc('criar_notificacoes', {
              p_destinatarios: destinatariosOrigem,
              p_tenant_id: escolaOrigemId,
              p_title: 'Transferência de Funcionário Solicitada',
              p_message: `Uma solicitação de transferência do servidor ${funcionarioObj.nome} para outra escola foi registrada.`,
              p_type: 'INFO',
              p_link: `/transferencias?tab=funcionarios&subtab=submissoes`,
              p_grupo_id: null
            })
          }
        } catch (notifErr) {
          console.warn('Alerta ao emitir notificações de transferência:', notifErr)
        }

        toast.success('Solicitação de transferência enviada com sucesso!')
      }

      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (err: any) {
      console.error('Erro ao submeter transferência de funcionário:', err)
      toast.error(`Erro ao registrar transferência: ${err.message || 'Falha inesperada.'}`)
    } finally {
      setLoadingGeral(false)
    }
  }

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Solicitar Transferência de Funcionário"
      maxWidth="sm:max-w-[520px]"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmeter}
            disabled={loadingGeral || loadingFuncionarios}
            className="bg-sky-600 text-white hover:bg-sky-700 font-semibold cursor-pointer gap-2"
          >
            {loadingGeral ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <ArrowRightLeft className="w-4 h-4" />
                Confirmar Transferência
              </>
            )}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 pt-1">
        <p className="text-muted-foreground text-xs leading-relaxed">
          Transfira ou solicite a movimentação de um servidor ativo desta unidade escolar para outra unidade da rede municipal ou para fora do município.
        </p>

        {/* Seleção/Exibição da Escola de Origem */}
        <div className="space-y-1.5">
          <Label className="text-foreground text-[13px] font-medium flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-sky-500" />
            Escola de Origem
          </Label>

          {escolaPadraoId && !isAdminGlobalOrRoot?.() ? (
            <div className="w-full bg-muted/40 border border-border px-3 py-2.5 rounded-md text-xs font-semibold text-foreground flex items-center justify-between">
              <span className="truncate">{nomeEscolaOrigem || 'Escola Atual'}</span>
              <span className="text-[10px] bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold px-2 py-0.5 rounded border border-sky-500/20">
                Origem Atual
              </span>
            </div>
          ) : (
            <EscolaSearchSelect
              escolas={escolas}
              value={escolaOrigemId}
              onChange={(newOrigemId) => {
                setEscolaOrigemId(newOrigemId)
                setFuncionarioSelecionadoId('')
                if (escolaDestinoId === newOrigemId) {
                  setEscolaDestinoId('')
                }
              }}
              placeholder="Selecione a escola de origem..."
              loading={loadingEscolas}
              disabled={loadingGeral}
            />
          )}
        </div>

        {/* Seleção do Funcionário com Busca Dinâmica */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-foreground text-[13px] font-medium flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-sky-500" />
              Funcionário da Unidade *
            </Label>
            {funcionarios.length > 0 && (
              <span className="text-[11px] text-muted-foreground">
                {funcionarios.length} {funcionarios.length === 1 ? 'servidor ativo' : 'servidores ativos'}
              </span>
            )}
          </div>

          <FuncionarioSearchSelect
            funcionarios={funcionarios}
            value={funcionarioSelecionadoId}
            onChange={setFuncionarioSelecionadoId}
            placeholder={
              !escolaOrigemId 
                ? 'Selecione primeiro a escola de origem...' 
                : 'Pesquise e selecione o funcionário...'
            }
            disabled={!escolaOrigemId || loadingGeral}
            loading={loadingFuncionarios}
          />
        </div>

        {/* Checkbox Fora da Rede */}
        <div className="flex items-start gap-3 p-3 bg-sky-500/10 border border-sky-500/20 rounded-lg">
          <input 
            type="checkbox" 
            id="foraDaRedeFunc" 
            checked={foraDaRede}
            onChange={(e) => setForaDaRede(e.target.checked)}
            className="w-4 h-4 mt-0.5 accent-sky-500 rounded border-border cursor-pointer shrink-0"
          />
          <label htmlFor="foraDaRedeFunc" className="text-xs text-sky-600 dark:text-sky-400 font-medium leading-tight cursor-pointer">
            <span className="font-semibold block">Transferência para FORA DA REDE MUNICIPAL</span>
            <span className="text-muted-foreground text-[11px]">
              Encerra o vínculo com a rede municipal e move o histórico para o arquivo morto da unidade.
            </span>
          </label>
        </div>

        {/* Selecionar Escola de Destino com Busca Dinâmica (se não for Fora da Rede) */}
        {!foraDaRede && (
          <div className="space-y-1.5">
            <Label className="text-foreground text-[13px] font-medium flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-sky-500" />
              Escola de Destino *
            </Label>
            <EscolaSearchSelect
              escolas={escolasDestinoDisponiveis}
              value={escolaDestinoId}
              onChange={setEscolaDestinoId}
              placeholder="Pesquise e selecione a escola destino..."
              loading={loadingEscolas}
              disabled={loadingGeral}
            />
          </div>
        )}

        {/* Motivo / Justificativa */}
        <div className="space-y-1.5">
          <Label className="text-foreground text-[13px] font-medium">
            Motivo / Portaria / Justificativa *
          </Label>
          <Textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="w-full bg-background border-border text-foreground placeholder:text-muted-foreground resize-none text-xs leading-relaxed min-h-[75px]"
            rows={3}
            placeholder="Digite o motivo da remoção/transferência, portaria ou ofício..."
            disabled={loadingGeral}
          />
        </div>
      </div>
    </StandardDialog>
  )
}
