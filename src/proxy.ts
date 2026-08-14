import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { checkRateLimit } from '@/lib/rateLimit'

/**
 * Injeta cabeçalhos de segurança HTTP em todas as respostas de saída.
 * Protege contra Clickjacking, MIME-sniffing e vazamento de referrer.
 */
function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set(
    'Permissions-Policy',
    'camera=(self), microphone=(), geolocation=(self)'
  )
  return response
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Identificação de IP para Rate Limiting
  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'

  // 2. Definição da categoria de limitação com base no caminho
  let routeType: 'login' | 'verify' | 'general' = 'general'
  if (pathname.startsWith('/login') || pathname.startsWith('/portal-aluno/login') || pathname.startsWith('/api/auth')) {
    routeType = 'login'
  } else if (pathname.startsWith('/verificar') || pathname.startsWith('/assinar')) {
    routeType = 'verify'
  }

  // 3. Execução da verificação de Rate Limit
  const rateLimit = checkRateLimit(clientIp, routeType)
  if (!rateLimit.allowed) {
    const rateLimitResponse = NextResponse.json(
      { error: 'Muitas requisições. Por favor, aguarde alguns segundos antes de tentar novamente.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimit.retryAfterSeconds),
          'Content-Type': 'application/json',
        },
      }
    )
    return applySecurityHeaders(rateLimitResponse)
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

  const requestHeaders = new Headers(request.headers)
  if (user) {
    requestHeaders.set('x-user-id', user.id)
    requestHeaders.set('x-user-email', user.email || '')
  }

  // Rotas públicas permitidas sem login
  const isPublicRoute = 
    pathname.startsWith('/login') || 
    pathname.startsWith('/portal-aluno/login') ||
    pathname.startsWith('/assinar') || 
    pathname.startsWith('/verificar') || 
    pathname.startsWith('/api/')

  // Se não estiver logado e tentando acessar rota protegida, redireciona adequadamente
  if (!user && !isPublicRoute && pathname.startsWith('/')) {
    const url = request.nextUrl.clone()
    if (pathname.startsWith('/portal-aluno')) {
      url.pathname = '/portal-aluno/login'
    } else {
      url.pathname = '/login'
    }
    return applySecurityHeaders(NextResponse.redirect(url))
  }

  // Se logado MAS com parâmetro de órfão, permite chegar ao login para limpeza
  if (user && pathname.startsWith('/login') && request.nextUrl.searchParams.get('error') === 'orphan') {
    const res = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
    supabaseResponse.cookies.getAll().forEach((c) => res.cookies.set(c.name, c.value, c))
    return applySecurityHeaders(res)
  }

  if (user) {
    const isResponsavel = user.user_metadata?.tipo_conta === 'responsavel'
    const mustChangePassword = user.user_metadata?.must_change_password === true

    // ─── BLOQUEIO DE RESPONSÁVEIS (ES-4 e ES-8) ─────────────────────────
    if (isResponsavel) {
      // Se for primeiro acesso, obriga ir para /portal-aluno/trocar-senha
      if (mustChangePassword && !pathname.startsWith('/portal-aluno/trocar-senha') && !pathname.startsWith('/api')) {
        const url = request.nextUrl.clone()
        url.pathname = '/portal-aluno/trocar-senha'
        return applySecurityHeaders(NextResponse.redirect(url))
      }

      // Impede o responsável de acessar o painel staff (/home, /alunos, /admin, etc.)
      if (!pathname.startsWith('/portal-aluno') && !pathname.startsWith('/api')) {
        const url = request.nextUrl.clone()
        url.pathname = '/portal-aluno/dashboard'
        return applySecurityHeaders(NextResponse.redirect(url))
      }

      // Se estiver na tela de login do portal mas já autenticado, manda pro dashboard
      if (pathname === '/portal-aluno/login' || pathname === '/portal-aluno') {
        const url = request.nextUrl.clone()
        url.pathname = '/portal-aluno/dashboard'
        return applySecurityHeaders(NextResponse.redirect(url))
      }
    } else {
      // ─── BLOQUEIO DE STAFF ──────────────────────────────────────────────
      // Servidores não acessam a área de pais
      if (pathname.startsWith('/portal-aluno/dashboard') || pathname === '/portal-aluno/trocar-senha') {
        const url = request.nextUrl.clone()
        url.pathname = '/home'
        return applySecurityHeaders(NextResponse.redirect(url))
      }

      // Roteamento padrão de servidores (Superadmin vs Staff)
      if (pathname === '/' || pathname.startsWith('/login') || pathname === '/home') {
        const isSuperAdmin = user.app_metadata?.is_superadmin === true
        const isSimulating = request.cookies.get('sig_simulating')?.value === '1'

        if (isSuperAdmin && !isSimulating && !pathname.startsWith('/admin') && !pathname.startsWith('/relatorios')) {
          const url = request.nextUrl.clone()
          url.pathname = '/admin'
          return applySecurityHeaders(NextResponse.redirect(url))
        } else if (!isSuperAdmin && (pathname === '/' || pathname.startsWith('/login'))) {
          const url = request.nextUrl.clone()
          url.pathname = '/home'
          return applySecurityHeaders(NextResponse.redirect(url))
        }
      }
    }
  }

  const finalResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
  supabaseResponse.cookies.getAll().forEach((c) => finalResponse.cookies.set(c.name, c.value, c))
  return applySecurityHeaders(finalResponse)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
