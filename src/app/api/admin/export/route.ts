import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const table = searchParams.get('table')
    const days = searchParams.get('days')

    if (!table) {
      return NextResponse.json({ error: 'Table is required' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value, ...options })
            } catch (error) {}
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: '', ...options })
            } catch (error) {}
          },
        },
      }
    )

    // Verifica se é um usuário autorizado (Admin)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode('[\n'))

        let start = 0
        const chunkSize = 2000 // Busca em blocos de 2000 para poupar memória
        let isFirstRow = true
        let hasMore = true

        while (hasMore) {
          let query = supabase
            .from(table)
            .select('*')
            .range(start, start + chunkSize - 1)
          
          if (days) {
            const dateLimit = new Date()
            dateLimit.setDate(dateLimit.getDate() - parseInt(days))
            query = query.gte('created_at', dateLimit.toISOString())
          }

          const { data, error } = await query

          if (error) {
            console.error('Error fetching export chunk:', error)
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
    console.error('Error exporting data:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
