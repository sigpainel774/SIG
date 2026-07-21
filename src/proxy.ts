import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(request: NextRequest) {
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

  const { pathname } = request.nextUrl

  // Se não estiver logado e tentando acessar rota protegida, envia pro login
  if (!user && !pathname.startsWith('/login') && !pathname.startsWith('/assinar') && !pathname.startsWith('/verificar') && pathname.startsWith('/')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user) {
    const isPublicRoute =
      pathname.startsWith('/login') ||
      pathname.startsWith('/assinar') ||
      pathname.startsWith('/verificar') ||
      pathname.startsWith('/primeiro-acesso')

    const { data: funcionario } = await supabase
      .from('funcionarios')
      .select('primeiro_acesso')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (funcionario?.primeiro_acesso && !isPublicRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/primeiro-acesso'
      return NextResponse.redirect(url)
    }

    if (!funcionario?.primeiro_acesso && pathname.startsWith('/primeiro-acesso')) {
      const url = request.nextUrl.clone()
      url.pathname = '/home'
      return NextResponse.redirect(url)
    }
  }

  // Lógica simplificada de níveis baseada em JWT Custom Claims.
  // Em um cenário real, se as custom claims não estiverem habilitadas, 
  // será preciso buscar o nível no banco e rotear.
  // Se logado MAS com parâmetro de órfão, permite chegar ao login para limpeza
  if (user && pathname.startsWith('/login') && request.nextUrl.searchParams.get('error') === 'orphan') {
    const res = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
    supabaseResponse.cookies.getAll().forEach((c) => res.cookies.set(c.name, c.value, c))
    return res
  }

  if (user) {
    if (pathname === '/' || pathname.startsWith('/login') || pathname === '/home') {
      // Zero queries: lê is_superadmin diretamente do JWT (app_metadata populado pelo trigger Postgres)
      const isSuperAdmin = user.app_metadata?.is_superadmin === true

      // Se for superadmin de sistema, a navegação fica trancada no painel root /admin
      if (isSuperAdmin && !pathname.startsWith('/admin')) {
        const url = request.nextUrl.clone()
        url.pathname = '/admin'
        return NextResponse.redirect(url)
      } 
      // Se NÃO for superadmin e estiver na raiz ou no login, joga pro home
      else if (!isSuperAdmin && (pathname === '/' || pathname.startsWith('/login'))) {
        const url = request.nextUrl.clone()
        url.pathname = '/home'
        return NextResponse.redirect(url)
      }
    }
    if (pathname.startsWith('/financeiro/folha-pagamento')) {
      const isSuperAdmin = user.app_metadata?.is_superadmin === true
      if (!isSuperAdmin) {
        // Otimização: unifica a busca em uma única query síncrona com join explícito para evitar RTTs redundantes
        const { data: acessos } = await supabase
          .from('acessos_usuarios')
          .select('nivel, funcionarios!acessos_usuarios_funcionario_id_fkey!inner(auth_user_id)')
          .eq('funcionarios.auth_user_id', user.id)
          .eq('ativo', true)

        const temNivel1 = acessos?.some((a: any) => a.nivel === 1)
        if (!temNivel1) {
          const url = request.nextUrl.clone()
          url.pathname = '/home'
          return NextResponse.redirect(url)
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
  return finalResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
