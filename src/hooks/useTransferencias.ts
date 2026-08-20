'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { useEditModeStore } from '@/store/useEditModeStore'
import { logAudit } from '@/lib/audit/audit-agent'
import { coletarAuthUserIds, coletarAuthUserIdsAdminsGlobais } from '@/lib/notifications/lotacaoNotifications'
import { toast } from 'sonner'

export function useTransferencias() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  const { funcionario, escolaAtivaId, isAdminGlobalOrRoot, isSecretarioEducacao } = useAuthStore()
  const { isEditMode } = useEditModeStore()

  const isGestorRede = useMemo(() => {
    return Boolean(
      isAdminGlobalOrRoot?.() || 
      isSecretarioEducacao?.() || 
      funcionario?.is_superadmin === true
    )
  }, [isAdminGlobalOrRoot, isSecretarioEducacao, funcionario])

  // Abas de estado
  const [activeTab, setActiveTab] = useState<'alunos' | 'funcionarios'>('alunos')
  const [activeSubTab, setActiveSubTab] = useState<'recebimentos' | 'submissoes'>('recebimentos')
  const [historicoAberto, setHistoricoAberto] = useState(false)

  // Estados dos Modais e Fluxo
  const [modalFuncionarioOpen, setModalFuncionarioOpen] = useState(false)
  const [transferenciaSelecionada, setTransferenciaSelecionada] = useState<any>(null)
  const [modalDecisaoOpen, setModalDecisaoOpen] = useState(false)
  const [justificativa, setJustificativa] = useState('')
  const [processing, setProcessing] = useState(false)

  // Listagem de dados
  const [transferenciasAlunos, setTransferenciasAlunos] = useState<any[]>([])
  const [transferenciasFuncionarios, setTransferenciasFuncionarios] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const loadTransferencias = useCallback(async () => {
    if (isMounted.current) setLoading(true)
    
    try {
      // 1. Alunos Query
      let queryAl = supabase
        .from('transferencias_alunos')
        .select(`
          *,
          alunos(nome, cpf),
          origem:escola_origem_id(nome),
          destino:escola_destino_id(nome),
          solicitante:solicitante_id(id, nome, auth_user_id)
        `)
        .order('created_at', { ascending: false })

      // Se for diretor de unidade escolar específica, filtra pelas escolas de origem ou destino
      if (!isGestorRede && escolaAtivaId) {
        queryAl = queryAl.or(`escola_origem_id.eq.${escolaAtivaId},escola_destino_id.eq.${escolaAtivaId}`)
      } else if (!isGestorRede && !escolaAtivaId) {
        // Diretor sem escola ativa não tem dados a exibir
        if (isMounted.current) {
          setTransferenciasAlunos([])
          setTransferenciasFuncionarios([])
          setLoading(false)
        }
        return { al: [], func: [] }
      }

      const { data: alData, error: alError } = await queryAl
      if (alError) console.error('Erro ao buscar transferências de alunos:', alError)

      // 2. Funcionários Query
      let queryFunc = supabase
        .from('transferencias_funcionarios')
        .select(`
          *,
          funcionarios(nome, cpf, cargo, auth_user_id),
          origem:escola_origem_id(nome),
          destino:escola_destino_id(nome),
          solicitante:solicitante_id(id, nome, auth_user_id)
        `)
        .order('created_at', { ascending: false })

      if (!isGestorRede && escolaAtivaId) {
        queryFunc = queryFunc.or(`escola_origem_id.eq.${escolaAtivaId},escola_destino_id.eq.${escolaAtivaId}`)
      }

      const { data: funcData, error: funcError } = await queryFunc
      if (funcError) console.error('Erro ao buscar transferências de funcionários:', funcError)

      if (!isMounted.current) return

      const alList = alData ?? []
      const funcList = funcData ?? []

      setTransferenciasAlunos(alList)
      setTransferenciasFuncionarios(funcList)
      
      return { al: alList, func: funcList }
    } catch (err) {
      console.error('Erro ao carregar transferências:', err)
      toast.error('Erro ao atualizar dados.')
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }, [escolaAtivaId, isGestorRede, supabase])

  // URL Params parsing com busca direta de segurança por ID
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    const subtabParam = searchParams.get('subtab')
    const idParam = searchParams.get('id')

    if (tabParam === 'alunos' || tabParam === 'funcionarios') {
      setActiveTab(tabParam)
    }
    if (subtabParam === 'recebimentos' || subtabParam === 'submissoes') {
      setActiveSubTab(subtabParam)
    }
    
    if (idParam) {
      loadTransferencias().then(async (data) => {
        if (!isMounted.current) return
        const { al = [], func = [] } = data || {}
        let found = null
        if (tabParam === 'funcionarios') {
          found = func.find((f: any) => f.id === idParam)
        } else {
          found = al.find((a: any) => a.id === idParam)
        }

        // Se não encontrou na lista padrão, faz lookup direto por ID
        if (!found) {
          try {
            const table = tabParam === 'funcionarios' ? 'transferencias_funcionarios' : 'transferencias_alunos'
            const relation = tabParam === 'funcionarios' 
              ? 'funcionarios(nome, cpf, cargo, auth_user_id)' 
              : 'alunos(nome, cpf)'

            const { data: singleData } = await supabase
              .from(table)
              .select(`
                *,
                ${relation},
                origem:escola_origem_id(nome),
                destino:escola_destino_id(nome),
                solicitante:solicitante_id(id, nome, auth_user_id)
              `)
              .eq('id', idParam)
              .maybeSingle()

            if (singleData && isMounted.current) {
              found = singleData
            }
          } catch (fetchSingleErr) {
            console.warn('Erro ao buscar transferência específica por ID:', fetchSingleErr)
          }
        }

        if (found && isMounted.current) {
          setTransferenciaSelecionada(found)
          setModalDecisaoOpen(true)
        }
      })
    }
  }, [searchParams, loadTransferencias, supabase])

  useEffect(() => {
    loadTransferencias()
  }, [escolaAtivaId, loadTransferencias])

  const getTransferenciasFiltradas = () => {
    const list = activeTab === 'alunos' ? transferenciasAlunos : transferenciasFuncionarios
    
    if (historicoAberto) {
      if (isGestorRede) {
        if (!escolaAtivaId) return list.filter((t: any) => t.status !== 'PENDENTE')
        return list.filter((t: any) => 
          (t.escola_origem_id === escolaAtivaId || t.escola_destino_id === escolaAtivaId || t.aguarda_despacho_sede) &&
          t.status !== 'PENDENTE'
        )
      }
      return list.filter((t: any) => 
        (t.escola_origem_id === escolaAtivaId || t.escola_destino_id === escolaAtivaId) && 
        t.status !== 'PENDENTE'
      )
    }

    if (activeSubTab === 'recebimentos') {
      if (isGestorRede) {
        // Se for gestor da rede na Sede (sem escola ativa) ou com escola selecionada:
        // Exibe pedidos destinados à escola ativa E pedidos da rede inteira que aguardam despacho da Sede
        if (!escolaAtivaId) {
          return list.filter((t: any) => t.status === 'PENDENTE')
        }
        return list.filter((t: any) => 
          (t.escola_destino_id === escolaAtivaId || t.aguarda_despacho_sede === true) && 
          t.status === 'PENDENTE'
        )
      }
      return list.filter((t: any) => t.escola_destino_id === escolaAtivaId && t.status === 'PENDENTE')
    } else {
      if (isGestorRede && !escolaAtivaId) {
        return list
      }
      return list.filter((t: any) => t.escola_origem_id === escolaAtivaId)
    }
  }

  const handleDecidirTransferencia = async (aceitar: boolean) => {
    if (!funcionario) return toast.error('Usuário não autenticado')
    if (!transferenciaSelecionada) return
    if (!aceitar && !justificativa) {
      toast.error('Informe a justificativa de rejeição.')
      return
    }

    setProcessing(true)
    const statusDestino = aceitar ? 'ACEITA' : 'REJEITADA'

    try {
      if (activeTab === 'alunos') {
        const { error: updateError } = await supabase
          .from('transferencias_alunos')
          .update({
            status: statusDestino,
            resposta_texto: justificativa,
            respondido_por: funcionario.id,
            respondido_em: new Date().toISOString()
          })
          .eq('id', transferenciaSelecionada.id)

        if (updateError) throw updateError

        if (aceitar) {
          const { data: currentStudent } = await supabase
            .from('alunos')
            .select('dados_matricula')
            .eq('id', transferenciaSelecionada.aluno_id)
            .single()

          const updatedDm = {
            ...((currentStudent?.dados_matricula as Record<string, any>) || {}),
            escolaId: transferenciaSelecionada.escola_destino_id,
            turmaIdAluno: null,
            turmaAluno: ''
          }

          const { error: studentUpdateError } = await supabase
            .from('alunos')
            .update({
              escola_id: transferenciaSelecionada.escola_destino_id,
              turma_id: null,
              dados_matricula: updatedDm
            })
            .eq('id', transferenciaSelecionada.aluno_id)

          if (studentUpdateError) throw studentUpdateError

          const { data: alunoCompleto } = await supabase
            .from('alunos')
            .select('id, nome, escola_id, turma_id, numero_matricula, foto_url, foto_avatar_path, foto_visualizacao_path, foto_updated_at, data_nascimento, cpf, rg, nis, inep, cartao_sus, certidao_nascimento, nome_mae, nome_pai, telefone, endereco, serie, latitude, longitude, dados_matricula, codigo_temp_resp, created_at, deleted_at')
            .eq('id', transferenciaSelecionada.aluno_id)
            .single()

          const { data: anexosAtivos } = await supabase
            .from('alunos_anexos')
            .select('id, aluno_id, nome, arquivo_url, created_at, deleted_at, arquivado_por, motivo_arquivamento')
            .eq('aluno_id', transferenciaSelecionada.aluno_id)
            .is('deleted_at', null)

          const payloadCadastral = alunoCompleto
            ? { ...alunoCompleto, escola_id: transferenciaSelecionada.escola_origem_id }
            : { ...transferenciaSelecionada.ficha_snapshot, escola_id: transferenciaSelecionada.escola_origem_id }

          const { error: archiveError } = await supabase
            .from('arquivados')
            .insert({
              tipo: 'ALUNO_TRANSFERIDO',
              referencia_id: transferenciaSelecionada.aluno_id,
              tabela_origem: 'alunos',
              motivo: `TRANSFERENCIA: Transferido para a escola ${transferenciaSelecionada.destino?.nome ?? 'Destino'}`,
              escola_origem_id: transferenciaSelecionada.escola_origem_id,
              arquivado_por: funcionario.id,
              payload_completo: payloadCadastral,
              arquivos_anexos: anexosAtivos || [],
              status: 'TRANSFERIDO'
            })

          if (archiveError) throw archiveError

          try {
            await supabase
              .from('alunos_anexos')
              .update({ 
                deleted_at: new Date().toISOString(),
                motivo_arquivamento: 'TRANSFERENCIA: Comprovante de residência antigo removido na transferência'
              })
              .eq('aluno_id', transferenciaSelecionada.aluno_id)
              .is('deleted_at', null)
              .ilike('nome', '%residencia%')
          } catch (deleteDocError: any) {
            console.warn('Erro ao inativar comprovante de residência antigo (verifique políticas de RLS):', deleteDocError)
          }

          await logAudit({
            supabase,
            action: 'UPDATE',
            entity: 'alunos (TRANSFERENCIA)',
            entityId: transferenciaSelecionada.aluno_id,
            newData: { escola_id: transferenciaSelecionada.escola_destino_id },
            performedBy: { id: funcionario?.id ?? null, name: funcionario?.nome ?? '', email: funcionario?.email ?? '' },
            tenantId: transferenciaSelecionada.escola_origem_id
          })
        }

        const solicitanteAuthId = transferenciaSelecionada.solicitante?.auth_user_id
        if (solicitanteAuthId) {
          await (supabase as any).rpc('criar_notificacoes', {
            p_destinatarios: [solicitanteAuthId],
            p_title: `Transferência de Aluno ${statusDestino}`,
            p_message: `O pedido de transferência do aluno ${transferenciaSelecionada.alunos?.nome ?? 'Aluno'} foi ${statusDestino.toLowerCase()} pela escola de destino.`,
            p_type: aceitar ? 'SUCCESS' : 'ERROR',
            p_link: '/transferencias?tab=alunos&subtab=submissoes'
          })
        }

      } else {
        // =========================================================================
        // Decisão em Transferência de Funcionários
        // =========================================================================
        if (transferenciaSelecionada.lotacao_id) {
          const { error: rpcError } = await (supabase as any).rpc('processar_decisao_transferencia_lotacao', {
            p_transferencia_id: transferenciaSelecionada.id,
            p_aceitar: aceitar,
            p_resposta_texto: justificativa,
            p_respondido_por_id: funcionario.id
          })

          if (rpcError) throw rpcError
        } else {
          const { error: updateError } = await supabase
            .from('transferencias_funcionarios')
            .update({
              status: statusDestino,
              resposta_texto: justificativa,
              respondido_por: funcionario.id,
              respondido_em: new Date().toISOString()
            })
            .eq('id', transferenciaSelecionada.id)

          if (updateError) throw updateError

          if (aceitar) {
            const { error: deactivateError } = await supabase
              .from('vinculos_funcionarios')
              .update({ ativo: false, data_fim: new Date().toISOString().split('T')[0] })
              .eq('funcionario_id', transferenciaSelecionada.funcionario_id)
              .eq('escola_id', transferenciaSelecionada.escola_origem_id)
              .eq('ativo', true)

            if (deactivateError) throw deactivateError

            // Limpa diretor_id na escola de origem se o servidor for o diretor cadastrado
            await supabase
              .from('escolas')
              .update({ diretor_id: null })
              .eq('id', transferenciaSelecionada.escola_origem_id)
              .eq('diretor_id', transferenciaSelecionada.funcionario_id)

            const cargoAnterior = transferenciaSelecionada.funcionarios?.cargo || 'Funcionário'
            const { error: activateError } = await supabase
              .from('vinculos_funcionarios')
              .insert({
                funcionario_id: transferenciaSelecionada.funcionario_id,
                escola_id: transferenciaSelecionada.escola_destino_id,
                cargo: cargoAnterior,
                ativo: true,
                data_inicio: new Date().toISOString().split('T')[0]
              })

            if (activateError) throw activateError

            const { error: archiveError } = await supabase
              .from('arquivados')
              .insert({
                tipo: 'FUNCIONARIO_TRANSFERIDO',
                referencia_id: transferenciaSelecionada.funcionario_id,
                tabela_origem: 'funcionarios',
                motivo: `TRANSFERENCIA: Transferido para a escola ${transferenciaSelecionada.destino?.nome ?? 'Destino'}${isGestorRede ? ' (Despachado pela Secretaria de Educação)' : ''}`,
                escola_origem_id: transferenciaSelecionada.escola_origem_id,
                arquivado_por: funcionario.id,
                payload_completo: transferenciaSelecionada.ficha_snapshot || {},
                status: 'TRANSFERIDO'
              })

            if (archiveError) throw archiveError

            await logAudit({
              supabase,
              action: 'UPDATE',
              entity: 'funcionarios (TRANSFERENCIA)',
              entityId: transferenciaSelecionada.funcionario_id,
              newData: { escola_destino_id: transferenciaSelecionada.escola_destino_id },
              performedBy: { id: funcionario?.id ?? null, name: funcionario?.nome ?? '', email: funcionario?.email ?? '' },
              tenantId: transferenciaSelecionada.escola_origem_id
            })
          }
        }

        // Notificar solicitante, servidor e diretores das escolas envolvidas
        const solicitanteAuthId = transferenciaSelecionada.solicitante?.auth_user_id
        const funcionarioAuthId = transferenciaSelecionada.funcionarios?.auth_user_id

        const destinatariosDecisao = new Set<string>()
        if (solicitanteAuthId) destinatariosDecisao.add(solicitanteAuthId)
        if (funcionarioAuthId && funcionarioAuthId !== solicitanteAuthId) {
          destinatariosDecisao.add(funcionarioAuthId)
        }

        if (destinatariosDecisao.size > 0) {
          const despachanteTexto = isGestorRede ? 'pela Secretaria de Educação' : 'pela escola de destino'
          await (supabase as any).rpc('criar_notificacoes', {
            p_destinatarios: Array.from(destinatariosDecisao),
            p_title: `Transferência de Servidor ${statusDestino}`,
            p_message: `O pedido de transferência do funcionário ${transferenciaSelecionada.funcionarios?.nome ?? 'Funcionário'} foi ${statusDestino.toLowerCase()} ${despachanteTexto}.${justificativa ? ` Motivo: ${justificativa}` : ''}`,
            p_type: aceitar ? 'SUCCESS' : 'ERROR',
            p_link: '/transferencias?tab=funcionarios&subtab=submissoes'
          })
        }

        // Ao aceitar, notificar diretores da escola de ORIGEM
        if (aceitar && transferenciaSelecionada.escola_origem_id) {
          try {
            const chefesOrigem = await coletarAuthUserIds(
              supabase,
              [transferenciaSelecionada.escola_origem_id],
              [2]
            )
            const destinatariosOrigem = chefesOrigem.filter(
              (id) => id !== solicitanteAuthId && id !== funcionarioAuthId
            )
            if (destinatariosOrigem.length > 0) {
              await (supabase as any).rpc('criar_notificacoes', {
                p_destinatarios: destinatariosOrigem,
                p_title: 'Funcionário Transferido',
                p_message: `O funcionário ${transferenciaSelecionada.funcionarios?.nome ?? 'Funcionário'} foi transferido para ${transferenciaSelecionada.destino?.nome ?? 'outra escola'}.`,
                p_type: 'INFO',
                p_link: '/transferencias?tab=funcionarios'
              })
            }
          } catch (notifErr) {
            console.warn('Erro não-crítico ao notificar chefes de origem:', notifErr)
          }
        }
      }

      toast.success(`Solicitação ${aceitar ? 'aprovada' : 'rejeitada'} com sucesso!`)
      setModalDecisaoOpen(false)
      setJustificativa('')
      setTransferenciaSelecionada(null)

      if (aceitar && transferenciaSelecionada.funcionarios?.auth_user_id) {
        try {
          const { invalidarCachePerfil } = await import('@/lib/invalidarCachePerfil')
          await invalidarCachePerfil(transferenciaSelecionada.funcionarios.auth_user_id)
        } catch (err) {
          console.warn('Erro ao invalidar cache (não-crítico):', err)
        }
      }

      await loadTransferencias()
    } catch (err: any) {
      console.error(err)
      toast.error(`Erro ao salvar decisão: ${err.message}`)
    } finally {
      if (isMounted.current) setProcessing(false)
    }
  }

  const handleReverterTransferencia = async () => {
    if (!funcionario || !transferenciaSelecionada) return
    setProcessing(true)
    try {
      const { error } = await (supabase as any).rpc('reverter_transferencia_lotacao', {
        p_transferencia_id: transferenciaSelecionada.id,
        p_revertido_por_id: funcionario.id
      })

      if (error) throw error

      const userIds = new Set<string>()

      const { data: acessosEnvolvidos } = await supabase
        .from('acessos_usuarios')
        .select('funcionarios(auth_user_id)')
        .in('escola_id', [transferenciaSelecionada.escola_origem_id, transferenciaSelecionada.escola_destino_id])
        .eq('nivel', 2)
        .eq('ativo', true)

      if (acessosEnvolvidos) {
        acessosEnvolvidos.forEach((acc: any) => {
          const authId = acc.funcionarios?.auth_user_id
          if (authId && typeof authId === 'string') userIds.add(authId)
        })
      }

      // Notificar também o próprio funcionário que teve a transferência revertida
      const funcionarioAuthIdRev = transferenciaSelecionada.funcionarios?.auth_user_id
      if (funcionarioAuthIdRev) userIds.add(funcionarioAuthIdRev)

      if (userIds.size > 0) {
        await (supabase as any).rpc('criar_notificacoes', {
          p_destinatarios: Array.from(userIds),
          p_title: 'Transferência Revertida pelo Admin',
          p_message: `A transferência de lotação do funcionário ${transferenciaSelecionada.funcionarios?.nome ?? 'Funcionário'} foi revertida pelo Administrador Global.`,
          p_type: 'WARNING',
          p_link: '/transferencias?tab=funcionarios'
        })
      }

      toast.success('Transferência de lotação revertida com sucesso!')
      setModalDecisaoOpen(false)
      setTransferenciaSelecionada(null)

      if (transferenciaSelecionada.funcionarios?.auth_user_id) {
        try {
          const { invalidarCachePerfil } = await import('@/lib/invalidarCachePerfil')
          await invalidarCachePerfil(transferenciaSelecionada.funcionarios.auth_user_id)
        } catch (err) {
          console.warn('Erro ao invalidar cache (não-crítico):', err)
        }
      }

      await loadTransferencias()
    } catch (err: any) {
      console.error(err)
      toast.error(`Erro ao reverter: ${err.message}`)
    } finally {
      if (isMounted.current) setProcessing(false)
    }
  }

  const items = getTransferenciasFiltradas()

  return {
    activeTab,
    setActiveTab,
    activeSubTab,
    setActiveSubTab,
    historicoAberto,
    setHistoricoAberto,
    modalFuncionarioOpen,
    setModalFuncionarioOpen,
    transferenciaSelecionada,
    setTransferenciaSelecionada,
    modalDecisaoOpen,
    setModalDecisaoOpen,
    justificativa,
    setJustificativa,
    processing,
    loading,
    isEditMode,
    isAdminGlobalOrRoot,
    isGestorRede,
    escolaAtivaId,
    items,
    loadTransferencias,
    handleDecidirTransferencia,
    handleReverterTransferencia
  }
}
