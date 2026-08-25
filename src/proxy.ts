import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { checkRateLimit } from '@/lib/rateLimit'
import { inspectUrlAndHeaders, recordThreatEventAsync } from '@/lib/security/threatDetector'

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

  // 1. Identificação de IP para Rate Limiting e WAF
  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'

  // 2. Inspeção WAF em tempo real (Detecção de SQLi, XSS, Path Traversal e Scanners)
  // Ignora rotas de telemetria interna para evitar loops
  if (!pathname.startsWith('/api/admin/defesa/log-threat')) {
    const threatCheck = inspectUrlAndHeaders(request.nextUrl, request.headers, clientIp)
    if (threatCheck.detected) {
      const country = request.headers.get('x-vercel-ip-country') || request.headers.get('cf-ipcountry') || null
      const city = request.headers.get('x-vercel-ip-city') || null
      const userAgent = request.headers.get('user-agent') || null

      recordThreatEventAsync({
        tipo_ataque: threatCheck.pattern?.category ?? 'PROBING',
        severidade: threatCheck.pattern?.severity ?? 'MEDIA',
        status: threatCheck.blocked ? 'BLOQUEADO' : 'DETECTADO',
        ip_origem: clientIp,
        pais: country,
        cidade: city,
        user_agent: userAgent,
        rota_alvo: pathname,
        metodo_http: request.method,
        payload_detectado: threatCheck.matchedPayload ?? null,
        headers_snapshot: {
          referer: request.headers.get('referer'),
          origin: request.headers.get('origin'),
          host: request.headers.get('host'),
        },
        detalhes_analise: {
          reason: threatCheck.reason,
          location: threatCheck.location,
        },
      })

      if (threatCheck.blocked) {
        const blockedResponse = NextResponse.json(
          {
            error: 'Requisição bloqueada pelo Sistema de Defesa Cibernética (WAF). Atividade suspeita registrada.',
            incidentId: Date.now().toString(36),
          },
          { status: 403 }
        )
        return applySecurityHeaders(blockedResponse)
      }
    }
  }

  // 3. Definição da categoria de limitação com base no caminho
  let routeType: 'login' | 'verify' | 'general' = 'general'
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/portal-aluno/login') ||
    pathname.startsWith('/alpha/login') ||
    pathname.startsWith('/api/auth')
  ) {
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

  // 0. Redirecionamento de compatibilidade /portal-pais -> /portal-aluno e /visitas -> /alpha/visitas
  if (pathname.startsWith('/portal-pais')) {
    const url = request.nextUrl.clone()
    url.pathname = pathname.replace('/portal-pais', '/portal-aluno')
    return applySecurityHeaders(NextResponse.redirect(url))
  }
  if (pathname === '/visitas' || pathname.startsWith('/visitas/')) {
    const url = request.nextUrl.clone()
    url.pathname = pathname.replace('/visitas', '/alpha/visitas')
    return applySecurityHeaders(NextResponse.redirect(url))
  }

  // Rotas públicas permitidas sem login
  const isPublicRoute = 
    pathname.startsWith('/login') || 
    pathname.startsWith('/portal-aluno/login') ||
    pathname.startsWith('/alpha/login') ||
    pathname.startsWith('/assinar') || 
    pathname.startsWith('/verificar') || 
    pathname.startsWith('/api/')

  // Se não estiver logado e tentando acessar rota protegida, redireciona adequadamente
  if (!user && !isPublicRoute && pathname.startsWith('/')) {
    const url = request.nextUrl.clone()
    if (pathname.startsWith('/portal-aluno')) {
      url.pathname = '/portal-aluno/login'
    } else if (pathname.startsWith('/alpha')) {
      url.pathname = '/alpha/login'
    } else {
      url.pathname = '/login'
    }
    return applySecurityHeaders(NextResponse.redirect(url))
  }

  // Se logado MAS com parâmetro de órfão, permite chegar ao login para limpeza
  if (user && (pathname.startsWith('/login') || pathname.startsWith('/alpha/login')) && request.nextUrl.searchParams.get('error') === 'orphan') {
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
      // ─── BLOQUEIO DE STAFF / CONTAS ALPHA ──────────────────────────────
      const isAlphaAccount = user.user_metadata?.is_alpha === true

      // Se já autenticado e na tela de login do Alpha, envia direto para /alpha
      if (pathname === '/alpha/login') {
        const url = request.nextUrl.clone()
        url.pathname = '/alpha'
        return applySecurityHeaders(NextResponse.redirect(url))
      }

      // Servidores não acessam a área de pais
      if (pathname.startsWith('/portal-aluno') && !pathname.startsWith('/portal-aluno/login')) {
        const url = request.nextUrl.clone()
        url.pathname = isAlphaAccount ? '/alpha' : '/home'
        return applySecurityHeaders(NextResponse.redirect(url))
      }

      // Contas Alpha operacionais (não superadmin) ficam restritas ao ecossistema /alpha
      if (isAlphaAccount && !user.app_metadata?.is_superadmin) {
        if (!pathname.startsWith('/alpha') && !pathname.startsWith('/api') && !pathname.startsWith('/login')) {
          const url = request.nextUrl.clone()
          url.pathname = '/alpha'
          return applySecurityHeaders(NextResponse.redirect(url))
        }
      }

      // Roteamento padrão de servidores (Superadmin vs Staff vs Alpha)
      if (pathname === '/' || pathname.startsWith('/login') || pathname === '/home') {
        const isSuperAdmin = user.app_metadata?.is_superadmin === true
        const isSimulating = request.cookies.get('sig_simulating')?.value === '1'

        if (isAlphaAccount && !isSuperAdmin) {
          const url = request.nextUrl.clone()
          url.pathname = '/alpha'
          return applySecurityHeaders(NextResponse.redirect(url))
        } else if (isSuperAdmin && !isSimulating && !pathname.startsWith('/admin') && !pathname.startsWith('/relatorios') && !pathname.startsWith('/alpha')) {
          const url = request.nextUrl.clone()
          url.pathname = '/admin'
          return applySecurityHeaders(NextResponse.redirect(url))
        } else if (!isSuperAdmin && !isAlphaAccount && (pathname === '/' || pathname.startsWith('/login'))) {
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
    '/((?!_next/static|_next/image|favicon.ico|manifest.*\\.json|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
