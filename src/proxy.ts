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

  const { pathname } = request.nextUrl

  // Se não estiver logado e tentando acessar rota protegida, envia pro login
  if (!user && !pathname.startsWith('/login') && pathname.startsWith('/')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Lógica simplificada de níveis baseada em JWT Custom Claims.
  // Em um cenário real, se as custom claims não estiverem habilitadas, 
  // será preciso buscar o nível no banco e rotear.
  // Se logado MAS com parâmetro de órfão, permite chegar ao login para limpeza
  if (user && pathname.startsWith('/login') && request.nextUrl.searchParams.get('error') === 'orphan') {
    return supabaseResponse
  }

  if (user) {
    if (pathname === '/' || pathname.startsWith('/login') || pathname === '/home') {
      const { supabaseAdmin } = await import('@/lib/supabaseAdmin')
      const { data } = await supabaseAdmin
        .from('funcionarios')
        .select('is_superadmin')
        .ilike('email', user.email || '')
        .maybeSingle()

      const isSuperAdmin = data?.is_superadmin || false

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
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
