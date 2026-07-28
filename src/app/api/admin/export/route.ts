import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const table = searchParams.get('table')
    const days = searchParams.get('days')

    if (!table) {
      return NextResponse.json({ error: 'Tabela não informada' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar se o usuário é superadmin/admin para exportação global
    const { data: func } = await supabaseAdmin
      .from('funcionarios')
      .select('is_superadmin')
      .eq('auth_user_id', user.id)
      .single()

    if (!func?.is_superadmin) {
      return NextResponse.json({ error: 'Acesso negado. Apenas administradores podem exportar o banco de dados.' }, { status: 403 })
    }

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode('[\n'))

        let start = 0
        const chunkSize = 2000 // Busca em blocos de 2000
        let isFirstRow = true
        let hasMore = true

        const parsedDays = days ? parseInt(days) : NaN

        while (hasMore) {
          let query = (supabaseAdmin as any)
            .from(table)
            .select('*')
            .range(start, start + chunkSize - 1)
          
          if (!isNaN(parsedDays) && parsedDays > 0) {
            const dateLimit = new Date()
            dateLimit.setDate(dateLimit.getDate() - parsedDays)
            query = query.gte('created_at', dateLimit.toISOString())
          }

          const { data, error } = await query

          if (error) {
            console.error('Erro no chunk da exportação:', error)
            controller.error(error)
            break
          }

          if (!data || data.length === 0) {
            hasMore = false
            break
          }

          for (let i = 0; i < data.length; i++) {
            if (!isFirstRow) {
              controller.enqueue(encoder.encode(',\n'))
            } else {
              isFirstRow = false
            }
            controller.enqueue(encoder.encode(JSON.stringify(data[i])))
          }

          if (data.length < chunkSize) {
            hasMore = false
          } else {
            start += chunkSize
          }
        }

        controller.enqueue(encoder.encode('\n]'))
        controller.close()
      },
    })

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${table}_${new Date().toISOString().split('T')[0]}.json"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
    })
  } catch (err: any) {
    console.error('Erro na exportação:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
