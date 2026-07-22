'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { useEditModeStore } from '@/store/useEditModeStore'
import { logAudit } from '@/lib/audit/audit-agent'
import { toast } from 'sonner'

export function useTransferencias() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  const { funcionario, escolaAtivaId, isAdminGlobalOrRoot } = useAuthStore()
  const { isEditMode } = useEditModeStore()

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
    if (!escolaAtivaId) return
    if (isMounted.current) setLoading(true)
    
    try {
      // 1. Alunos
      const { data: alData } = await supabase
        .from('transferencias_alunos')
        .select(`
          *,
          alunos(nome, cpf),
          origem:escola_origem_id(nome),
          destino:escola_destino_id(nome),
          solicitante:solicitante_id(nome)
        `)
        .or(`escola_origem_id.eq.${escolaAtivaId},escola_destino_id.eq.${escolaAtivaId}`)
        .order('created_at', { ascending: false })

      // 2. Funcionários
      const { data: funcData } = await supabase
        .from('transferencias_funcionarios')
        .select(`
          *,
          funcionarios(nome, cpf, cargo, auth_user_id),
          origem:escola_origem_id(nome),
          destino:escola_destino_id(nome),
          solicitante:solicitante_id(nome)
        `)
        .or(`escola_origem_id.eq.${escolaAtivaId},escola_destino_id.eq.${escolaAtivaId}`)
        .order('created_at', { ascending: false })

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
  }, [escolaAtivaId])

  // URL Params parsing
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
      loadTransferencias().then((data) => {
        if (!isMounted.current || !data) return
        const { al, func } = data
        let found = null
        if (tabParam === 'funcionarios') {
          found = func.find((f: any) => f.id === idParam)
        } else {
          found = al.find((a: any) => a.id === idParam)
        }
        if (found) {
          setTransferenciaSelecionada(found)
          setModalDecisaoOpen(true)
        }
      })
    }
  }, [searchParams, loadTransferencias])

  useEffect(() => {
    loadTransferencias()
  }, [escolaAtivaId, loadTransferencias])

  const getTransferenciasFiltradas = () => {
    const list = activeTab === 'alunos' ? transferenciasAlunos : transferenciasFuncionarios
    
    if (historicoAberto) {
      return list.filter((t: any) => t.status !== 'PENDENTE')
    }

    if (activeSubTab === 'recebimentos') {
      return list.filter((t: any) => t.escola_destino_id === escolaAtivaId && t.status === 'PENDENTE')
    } else {
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
            .select('*')
            .eq('id', transferenciaSelecionada.aluno_id)
            .single()

          const { data: anexosAtivos } = await supabase
            .from('alunos_anexos')
            .select('*')
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
            performedBy: { id: funcionario.id, name: funcionario.nome, email: funcionario.email },
            tenantId: transferenciaSelecionada.escola_origem_id
          })
        }

        // Enviar notificação se solicitante_id for UUID válido
        if (transferenciaSelecionada.solicitante_id) {
          await (supabase as any).rpc('criar_notificacoes', {
            p_destinatarios: [transferenciaSelecionada.solicitante_id],
            p_title: `Transferência de Aluno ${statusDestino}`,
            p_message: `O pedido de transferência do aluno ${transferenciaSelecionada.alunos?.nome ?? 'Aluno'} foi ${statusDestino.toLowerCase()} pela escola de destino.`,
            p_type: aceitar ? 'SUCCESS' : 'ERROR',
            p_link: '/transferencias?tab=alunos&subtab=submissoes'
          })
        }

      } else {
        // Funcionários
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

            const { error: accessError } = await supabase
              .from('acessos_usuarios')
              .update({ escola_id: transferenciaSelecionada.escola_destino_id })
              .eq('funcionario_id', transferenciaSelecionada.funcionario_id)
              .eq('escola_id', transferenciaSelecionada.escola_origem_id)

            if (accessError) throw accessError

            const { error: archiveError } = await supabase
              .from('arquivados')
              .insert({
                tipo: 'FUNCIONARIO_TRANSFERIDO',
                referencia_id: transferenciaSelecionada.funcionario_id,
                tabela_origem: 'funcionarios',
                motivo: `TRANSFERENCIA: Transferido para a escola ${transferenciaSelecionada.destino?.nome ?? 'Destino'}`,
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
              performedBy: { id: funcionario.id, name: funcionario.nome, email: funcionario.email },
              tenantId: transferenciaSelecionada.escola_origem_id
            })
          }
        }

        if (transferenciaSelecionada.solicitante_id) {
          await (supabase as any).rpc('criar_notificacoes', {
            p_destinatarios: [transferenciaSelecionada.solicitante_id],
            p_title: `Transferência de Funcionário ${statusDestino}`,
            p_message: `O pedido de transferência do funcionário ${transferenciaSelecionada.funcionarios?.nome ?? 'Funcionário'} foi ${statusDestino.toLowerCase()} pela escola de destino.`,
            p_type: aceitar ? 'SUCCESS' : 'ERROR',
            p_link: '/transferencias?tab=funcionarios&subtab=submissoes'
          })
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
        .select('funcionarios(id)')
        .in('escola_id', [transferenciaSelecionada.escola_origem_id, transferenciaSelecionada.escola_destino_id])
        .eq('nivel', 2)
        .eq('ativo', true)

      if (acessosEnvolvidos) {
        acessosEnvolvidos.forEach((acc: any) => {
          const funcId = acc.funcionarios?.id
          if (funcId) userIds.add(funcId)
        })
      }

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
    escolaAtivaId,
    items,
    loadTransferencias,
    handleDecidirTransferencia,
    handleReverterTransferencia
  }
}
