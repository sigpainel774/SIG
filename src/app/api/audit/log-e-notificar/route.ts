import { NextResponse } from 'next/server'
import { notificarDiretorEAuditar, LogAndNotifyParams } from '@/lib/notifications/diretorNotifications'

export async function POST(request: Request) {
  try {
    const body: LogAndNotifyParams = await request.json()

    if (!body.titulo || !body.mensagem || !body.tipoNotificacao) {
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios ausentes' },
        { status: 400 }
      )
    }

    const result = await notificarDiretorEAuditar(body)
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Erro na API /api/audit/log-e-notificar:', error)
    return NextResponse.json(
      { error: error?.message || 'Erro interno no servidor' },
      { status: 500 }
    )
  }
}
