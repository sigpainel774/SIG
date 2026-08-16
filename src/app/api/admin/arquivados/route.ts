import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireSuperAdminApi } from '@/lib/authGuard'
import { reverterArquivado, excluirDefinitivamenteArquivado } from '@/lib/audit/archive-agent'

export async function POST(req: NextRequest) {
  try {
    const auth = await requireSuperAdminApi(req)
    if (auth.response) {
      return auth.response
    }
    const admin = auth.funcionario

    const body = await req.json()
    const { action, arquivadoId } = body

    if (!arquivadoId) {
      return NextResponse.json({ error: 'ID do arquivado não informado' }, { status: 400 })
    }

    const executor = {
      id: admin?.id ?? null,
      name: admin?.nome ?? 'Administrador',
      email: admin?.email ?? ''
    }

    if (action === 'reverter') {
      const res = await reverterArquivado({
        supabaseAdmin,
        arquivadoId,
        revertidoPor: executor
      })

      if (!res.success) {
        return NextResponse.json({ error: 'Falha ao reverter registro arquivado', details: res.error }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: 'Registro revertido com sucesso' })
    }

    if (action === 'expurgar' || action === 'excluir') {
      const res = await excluirDefinitivamenteArquivado({
        supabaseAdmin,
        arquivadoId,
        excluidoPor: executor
      })

      if (!res.success) {
        return NextResponse.json({ error: 'Falha ao excluir definitivamente registro arquivado', details: res.error }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: 'Registro excluído definitivamente' })
    }

    return NextResponse.json({ error: 'Ação inválida. Use "reverter" ou "expurgar".' }, { status: 400 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno do servidor'
    console.error('[api/admin/arquivados]', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
