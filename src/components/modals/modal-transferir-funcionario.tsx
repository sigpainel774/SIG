'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowRightLeft, Building2, User, AlertCircle, Loader2, CheckCircle2, ShieldAlert } from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { useSchoolStore } from '@/store/useSchoolStore'
import { logAudit } from '@/lib/audit/audit-agent'
import { coletarAuthUserIds, coletarAuthUserIdsAdminsGlobais } from '@/lib/notifications/lotacaoNotifications'
import { buscarConfigBloqueioRede, verificarTravaEdicaoFuncionario } from '@/lib/verificarTravaBloqueio'
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
  const { funcionario: usuarioLogado, escolaAtivaId: authEscolaAtivaId, isAdminGlobalOrRoot, isSecretarioEducacao } = useAuthStore()
  const { selectedEscola } = useSchoolStore()

  // Determina se o usuário tem privilégio de gestão da rede (Secretário de Educação / Nível 1 / Superadmin)
  const isGestorRedeOuSecretario = useMemo(() => {
    return Boolean(
      isAdminGlobalOrRoot?.() || 
      isSecretarioEducacao?.() || 
      usuarioLogado?.is_superadmin === true
    )
  }, [isAdminGlobalOrRoot, isSecretarioEducacao, usuarioLogado])

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
  
  // Opção do Fluxo 2 (Transferência Direta da Secretaria)
  const [efetivarDiretoSecretaria, setEfetivarDiretoSecretaria] = useState(false)

  // Trava contra duplo clique / concorrência
  const isSubmitting = useRef(false)

  // Sincroniza estados quando o modal abre ou a escola selecionada muda
  useEffect(() => {
    if (open) {
      const activeId = authEscolaAtivaId || selectedEscola?.id || ''
      setEscolaOrigemId(activeId)
      setFuncionarioSelecionadoId('')
      setEscolaDestinoId('')
      setForaDaRede(false)
      setMotivo('')
      setEfetivarDiretoSecretaria(false)
      isSubmitting.current = false
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
          .select('id, nome, tipo, ativo, diretor_id')
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

  // Nome da escola de destino para exibição
  const nomeEscolaDestino = useMemo(() => {
    if (!escolaDestinoId) return ''
    const esc = escolas.find((e) => e.id === escolaDestinoId)
    return esc?.nome ?? 'Escola de Destino'
  }, [escolaDestinoId, escolas])

  // Funcionário selecionado completo
  const funcionarioObj = useMemo(() => {
    return funcionarios.find((f) => f.id === funcionarioSelecionadoId)
  }, [funcionarios, funcionarioSelecionadoId])

  const handleSubmeter = async () => {
    if (isSubmitting.current) return
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

    // Validação da trava global da rede (apenas para não-administradores)
    if (!isGestorRedeOuSecretario) {
      try {
        const configRede = await buscarConfigBloqueioRede(supabase)
        const travaAtiva = await verificarTravaEdicaoFuncionario(configRede, funcionarioSelecionadoId, supabase)
        if (travaAtiva) {
          toast.error('A movimentação e edição deste servidor foi bloqueada temporariamente pela Secretaria de Educação.')
          return
        }
      } catch (travaErr) {
        console.warn('Erro ao checar trava global:', travaErr)
      }
    }

    isSubmitting.current = true
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

        // Limpa automaticamente o diretor_id da escola de origem se ele for o diretor cadastrado
        await supabase
          .from('escolas')
          .update({ diretor_id: null })
          .eq('id', escolaOrigemId)
          .eq('diretor_id', funcionarioSelecionadoId)

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
      } else if (isGestorRedeOuSecretario && efetivarDiretoSecretaria) {
        // =========================================================================
        // FLUXO 2: Transferência Direta / Imediata pela Secretaria de Educação
        // =========================================================================
        
        // 1. Inativar vínculo na escola de origem
        if (lotacaoVinculoId) {
          const { error: deactError } = await supabase
            .from('vinculos_funcionarios')
            .update({ ativo: false, data_fim: new Date().toISOString().split('T')[0] })
            .eq('id', lotacaoVinculoId)
          if (deactError) throw deactError
        }

        // 2. Limpar diretor_id na escola de origem se o servidor for o diretor cadastrado
        await supabase
          .from('escolas')
          .update({ diretor_id: null })
          .eq('id', escolaOrigemId)
          .eq('diretor_id', funcionarioSelecionadoId)

        // 3. Criar novo vínculo ativo na escola de destino
        const cargoNovo = (funcionarioObj as any).cargo_vinculo || funcionarioObj.cargo || 'Funcionário'
        const { error: createVinculoError } = await supabase
          .from('vinculos_funcionarios')
          .insert({
            funcionario_id: funcionarioSelecionadoId,
            escola_id: escolaDestinoId,
            cargo: cargoNovo,
            ativo: true,
            data_inicio: new Date().toISOString().split('T')[0]
          })
        if (createVinculoError) throw createVinculoError

        // 4. Inserir registro na tabela de transferências já com status 'ACEITA'
        const { error: insTransfError } = await (supabase as any)
          .from('transferencias_funcionarios')
          .insert({
            funcionario_id: funcionarioSelecionadoId,
            escola_origem_id: escolaOrigemId,
            escola_destino_id: escolaDestinoId,
            solicitante_id: usuarioLogado.id,
            motivo: `TRANSFERENCIA DIRETA SECRETARIA: ${motivo.trim()}`,
            fora_da_rede: false,
            ficha_snapshot: funcionarioObj,
            lotacao_id: lotacaoVinculoId,
            status: 'ACEITA',
            respondido_por: usuarioLogado.id,
            respondido_em: new Date().toISOString(),
            resposta_texto: 'Transferência direta efetivada pela Secretaria de Educação / Sede'
          })
        if (insTransfError) throw insTransfError

        // 5. Arquivar snapshot histórico
        await supabase
          .from('arquivados')
          .insert({
            tipo: 'FUNCIONARIO_TRANSFERIDO',
            referencia_id: funcionarioSelecionadoId,
            tabela_origem: 'funcionarios',
            motivo: `TRANSFERENCIA DIRETA: Movimentado pela Secretaria de Educação de ${nomeEscolaOrigem} para ${nomeEscolaDestino}`,
            escola_origem_id: escolaOrigemId,
            arquivado_por: usuarioLogado.id,
            payload_completo: funcionarioObj,
            status: 'TRANSFERIDO'
          })

        // 6. Auditoria
        await logAudit({
          supabase,
          action: 'UPDATE',
          entity: 'funcionarios (TRANSFERENCIA DIRETA SECRETARIA)',
          entityId: funcionarioSelecionadoId,
          newData: { escola_origem_id: escolaOrigemId, escola_destino_id: escolaDestinoId },
          performedBy: { 
            id: usuarioLogado?.id ?? null, 
            name: usuarioLogado?.nome ?? '', 
            email: usuarioLogado?.email ?? '' 
          },
          tenantId: escolaOrigemId || undefined
        })

        // 7. Notificar Chefes da Origem, Chefes do Destino e o próprio Funcionário
        try {
          const chefesOrigem = await coletarAuthUserIds(supabase, [escolaOrigemId], [2])
          const chefesDestino = await coletarAuthUserIds(supabase, [escolaDestinoId], [2, 3])

          const destinatarios = new Set<string>([...chefesOrigem, ...chefesDestino])
          if (funcionarioObj.auth_user_id) destinatarios.add(funcionarioObj.auth_user_id)
          // Não precisa notificar o próprio usuário que realizou a ação
          if (usuarioLogado.auth_user_id) destinatarios.delete(usuarioLogado.auth_user_id)

          const listDest = Array.from(destinatarios)
          if (listDest.length > 0) {
            await (supabase as any).rpc('criar_notificacoes', {
              p_destinatarios: listDest,
              p_title: 'Transferência de Servidor Efetivada',
              p_message: `O servidor ${funcionarioObj.nome} foi transferido diretamente pela Secretaria de Educação de ${nomeEscolaOrigem} para ${nomeEscolaDestino}.`,
              p_type: 'INFO',
              p_link: '/transferencias?tab=funcionarios'
            })
          }
        } catch (notifErr) {
          console.warn('Erro não-crítico ao emitir notificações de transferência direta:', notifErr)
        }

        if (funcionarioObj.auth_user_id) {
          const { invalidarCachePerfil } = await import('@/lib/invalidarCachePerfil')
          await invalidarCachePerfil(funcionarioObj.auth_user_id)
        }

        toast.success(`Funcionário transferido diretamente para ${nomeEscolaDestino}!`)
      } else {
        // =========================================================================
        // FLUXO 1: Solicitação com Despacho (Diretor ou Gestor solicita)
        // =========================================================================
        
        // Verificar se a escola destino possui chefes/diretores cadastrados
        const chefesDestino = await coletarAuthUserIds(supabase, [escolaDestinoId], [2, 3])
        const aguardaDespachoSede = chefesDestino.length === 0

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
            status: 'PENDENTE',
            aguarda_despacho_sede: aguardaDespachoSede
          })
          .select('id')
          .single()

        if (insertError) throw insertError

        const transferId = insertData?.id

        // Disparo estruturado de notificações
        try {
          const chefesOrigem = await coletarAuthUserIds(supabase, [escolaOrigemId], [2])
          const adminsGlobaisSede = await coletarAuthUserIdsAdminsGlobais(supabase)

          const destinatariosDestino = Array.from(new Set<string>(chefesDestino))
          const destinatariosOrigem = Array.from(new Set<string>(chefesOrigem))
          // Admins da Sede (excluindo o próprio solicitante se for admin)
          const destinatariosSede = Array.from(new Set<string>(adminsGlobaisSede)).filter(
            (id) => id !== usuarioLogado.auth_user_id
          )

          // 1. Notificar Gestores do Destino (se houver)
          if (destinatariosDestino.length > 0) {
            await (supabase as any).rpc('criar_notificacoes', {
              p_destinatarios: destinatariosDestino,
              p_tenant_id: escolaDestinoId,
              p_title: 'Nova Solicitação de Transferência de Servidor',
              p_message: `A unidade ${nomeEscolaOrigem} solicitou a transferência do servidor ${funcionarioObj.nome} para sua escola.`,
              p_type: 'INFO',
              p_link: `/transferencias?tab=funcionarios&subtab=recebimentos${transferId ? `&id=${transferId}` : ''}`,
              p_grupo_id: null
            })
          }

          // 2. Notificar Gestores da Origem
          if (destinatariosOrigem.length > 0) {
            await (supabase as any).rpc('criar_notificacoes', {
              p_destinatarios: destinatariosOrigem,
              p_tenant_id: escolaOrigemId,
              p_title: 'Transferência de Servidor Solicitada',
              p_message: `Uma solicitação de transferência do servidor ${funcionarioObj.nome} para ${nomeEscolaDestino} foi registrada.`,
              p_type: 'INFO',
              p_link: `/transferencias?tab=funcionarios&subtab=submissoes`,
              p_grupo_id: null
            })
          }

          // 3. Notificar o Secretário de Educação & Administradores da Sede
          if (destinatariosSede.length > 0) {
            const tituloSede = aguardaDespachoSede
              ? '[Sede] Pedido de Transferência (Escola sem direção)'
              : 'Solicitação de Transferência de Servidor'
            const msgSede = aguardaDespachoSede
              ? `A unidade ${nomeEscolaOrigem} solicitou a transferência de ${funcionarioObj.nome} para ${nomeEscolaDestino} (escola sem direção cadastrada). Favor despachar o pedido na central da Sede.`
              : `A unidade ${nomeEscolaOrigem} solicitou a transferência do servidor ${funcionarioObj.nome} para ${nomeEscolaDestino}.`

            await (supabase as any).rpc('criar_notificacoes', {
              p_destinatarios: destinatariosSede,
              p_title: tituloSede,
              p_message: msgSede,
              p_type: 'INFO',
              p_link: `/transferencias?tab=funcionarios&subtab=recebimentos${transferId ? `&id=${transferId}` : ''}`,
              p_grupo_id: null
            })
          }
        } catch (notifErr) {
          console.warn('Alerta ao emitir notificações de transferência:', notifErr)
        }

        if (aguardaDespachoSede) {
          toast.success('Solicitação enviada! A escola destino não possui direção cadastrada, o pedido foi encaminhado diretamente para despacho da Secretaria de Educação.')
        } else {
          toast.success('Solicitação de transferência enviada com sucesso!')
        }
      }

      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (err: any) {
      console.error('Erro ao submeter transferência de funcionário:', err)
      toast.error(`Erro ao registrar transferência: ${err.message || 'Falha inesperada.'}`)
    } finally {
      isSubmitting.current = false
      setLoadingGeral(false)
    }
  }

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Transferência de Funcionário"
      maxWidth="sm:max-w-[540px]"
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
                {isGestorRedeOuSecretario && efetivarDiretoSecretaria && !foraDaRede
                  ? 'Efetivar Transferência Direta'
                  : 'Confirmar Transferência'}
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

        {/* Painel do Fluxo 2 exclusivo para Secretário de Educação / Gestão da Rede */}
        {isGestorRedeOuSecretario && !foraDaRede && (
          <div className="bg-sky-500/10 border border-sky-500/30 rounded-xl p-3 space-y-2">
            <div className="flex items-start gap-2.5">
              <input
                type="checkbox"
                id="efetivarDireto"
                checked={efetivarDiretoSecretaria}
                onChange={(e) => setEfetivarDiretoSecretaria(e.target.checked)}
                className="w-4 h-4 mt-0.5 accent-sky-600 rounded border-border cursor-pointer shrink-0"
              />
              <label htmlFor="efetivarDireto" className="text-xs text-foreground cursor-pointer select-none">
                <span className="font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Efetivar Imediatamente como Secretaria de Educação (Transferência Direta)
                </span>
                <span className="text-muted-foreground text-[11px] block mt-0.5 leading-snug">
                  Quando marcado, o servidor é movimentado imediatamente entre as unidades sem necessitar de aprovação pendente posterior.
                </span>
              </label>
            </div>
          </div>
        )}

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
          <label htmlFor="foraDaRedeFunc" className="text-xs text-sky-600 dark:text-sky-400 font-medium leading-tight cursor-pointer select-none">
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
