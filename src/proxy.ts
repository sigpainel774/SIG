import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(request: NextRequest) {
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now()

  // Helper para injetar o tempo de carregamento/processamento do middleware na resposta
  const withTiming = (response: NextResponse) => {
    const duration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime
    response.headers.set('Server-Timing', `middleware;dur=${duration.toFixed(3)};desc="Middleware"`)
    return response
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Usuário não autenticado tentando acessar rota protegida → login
  if (!user && !pathname.startsWith('/login') && !pathname.startsWith('/assinar') && !pathname.startsWith('/verificar') && pathname.startsWith('/')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return withTiming(NextResponse.redirect(url))
  }

  // Usuário autenticado tentando acessar /login:
  // - Com ?error=orphan: deixa passar (DashboardLayout fará o signOut)
  // - Sem o parâmetro: redireciona para / (RootPage decide /admin ou /home)
  if (user && pathname.startsWith('/login')) {
    if (request.nextUrl.searchParams.get('error') === 'orphan') {
      return withTiming(supabaseResponse)
    }
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return withTiming(NextResponse.redirect(url))
  }

  // Responsabilidade do proxy encerrada aqui.
  // O routing pós-login (/admin vs /home) é feito pela RootPage em (dashboard)/page.tsx,
  // usando React.cache() compartilhado com o DashboardLayout — sem nova query ao banco.
  return withTiming(supabaseResponse)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
