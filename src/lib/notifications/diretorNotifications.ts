import { supabaseAdmin } from '@/lib/supabaseAdmin'

export interface LogAndNotifyParams {
  escolaId?: string | null
  titulo: string
  mensagem: string
  tipoNotificacao: 'matricula' | 'funcionario_matriculado' | 'edicao_ficha' | 'visualizacao_ficha'
  entidade: 'alunos' | 'funcionarios' | 'matriculas'
  entidadeId: string
  acao: 'CREATE' | 'UPDATE' | 'READ'
  executadoPor: {
    id: string | null
    name: string
    email: string
    cargo?: string
  }
  oldData?: any
  newData?: any
  linkCustom?: string
}

export async function notificarDiretorEAuditar(params: LogAndNotifyParams) {
  try {
    const {
      escolaId,
      titulo,
      mensagem,
      tipoNotificacao,
      entidade,
      entidadeId,
      acao,
      executadoPor,
      oldData,
      newData,
      linkCustom,
    } = params

    // 1. Gravar Log de Auditoria
    const { data: auditLog, error: auditError } = await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: executadoPor.id || null,
        user_name: executadoPor.name,
        user_email: executadoPor.email,
        user_cargo: executadoPor.cargo || null,
        action: acao,
        entity: entidade,
        entity_id: entidadeId,
        old_data: oldData || null,
        new_data: newData || null,
      })
      .select('id')
      .single()

    if (auditError) {
      console.error('Erro ao salvar audit_log:', auditError)
    }

    const logId = auditLog?.id
    const finalLink =
      linkCustom ||
      `/relatorios/atividades?${escolaId ? `escola_id=${escolaId}&` : ''}${logId ? `log_id=${logId}` : ''}`

    // 2. Se for 'visualizacao_ficha', NÃO enviamos notificação in-app (evita spam no header do diretor),
    // mas o log de auditoria foi gravado acima.
    if (tipoNotificacao === 'visualizacao_ficha') {
      return { success: true, auditLogId: logId, notified: false }
    }

    // 3. Para ações mutativas (matricula, funcionario_matriculado, edicao_ficha):
    if (escolaId) {
      // Buscar o diretor_id da escola
      const { data: escolaData } = await supabaseAdmin
        .from('escolas')
        .select('diretor_id')
        .eq('id', escolaId)
        .single()

      if (escolaData?.diretor_id) {
        // Buscar auth_user_id do diretor
        const { data: funcData } = await supabaseAdmin
          .from('funcionarios')
          .select('auth_user_id')
          .eq('id', escolaData.diretor_id)
          .single()

        if (funcData?.auth_user_id) {
          // Inserir notificação para o Diretor usando supabaseAdmin (evita RLS)
          const { error: notifError } = await supabaseAdmin
            .from('notifications')
            .insert({
              user_id: funcData.auth_user_id,
              title: titulo,
              message: mensagem,
              type: tipoNotificacao,
              link: finalLink,
              read: false,
            })

          if (notifError) {
            console.error('Erro ao enviar notificação in-app para o Diretor:', notifError)
          } else {
            return { success: true, auditLogId: logId, notified: true }
          }
        }
      }
    }

    return { success: true, auditLogId: logId, notified: false }
  } catch (error) {
    console.error('Falha em notificarDiretorEAuditar:', error)
    return { success: false, error }
  }
}
