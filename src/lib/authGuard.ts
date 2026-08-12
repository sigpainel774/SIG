import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export interface AuthGuardSuccess {
  user: any
  funcionario?: any
  response: null
}

export interface AuthGuardFailure {
  user: null
  funcionario: null
  response: NextResponse
}

export type AuthGuardResult = AuthGuardSuccess | AuthGuardFailure

/**
 * Guarda centralizado de autenticação para endpoints de Administração (/api/admin/*).
 * Garante que apenas usuários autenticados com perfil Superadmin (is_superadmin = true)
 * possam executar ações administrativas.
 * 
 * Compatível com a API assíncrona cookies() do Next.js 16.
 */
export async function requireSuperAdminApi(request?: NextRequest): Promise<AuthGuardResult> {
  try {
    const cookieStore = await cookies()

    const supabaseServer = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Ignorar contexto imutável de Server Component se aplicável
            }
          },
        },
      }
    )

    const { data: { user }, error: userError } = await supabaseServer.auth.getUser()

    if (userError || !user) {
      return {
        user: null,
        funcionario: null,
        response: NextResponse.json(
          { error: 'Não autenticado. Por favor, faça login.' },
          { status: 401 }
        ),
      }
    }

    // 1. Checa primeiro no JWT app_metadata (zero queries)
    const isJwtSuperAdmin = user.app_metadata?.is_superadmin === true

    // 2. Se não estiver no JWT, faz busca segura no banco via supabaseAdmin
    let funcionarioData = null
    if (isJwtSuperAdmin) {
      const { data: func } = await supabaseAdmin
        .from('funcionarios')
        .select('id, nome, email, is_superadmin')
        .eq('auth_user_id', user.id)
        .maybeSingle()
      funcionarioData = func
    } else {
      const { data: func } = await supabaseAdmin
        .from('funcionarios')
        .select('id, nome, email, is_superadmin')
        .eq('auth_user_id', user.id)
        .maybeSingle()

      if (!func?.is_superadmin) {
        return {
          user: null,
          funcionario: null,
          response: NextResponse.json(
            { error: 'Acesso negado: Recursos de administração restritos a Superadmins.' },
            { status: 403 }
          ),
        }
      }
      funcionarioData = func
    }

    return {
      user,
      funcionario: funcionarioData,
      response: null,
    }
  } catch (error: any) {
    console.error('Erro na validação de superadmin da API:', error)
    return {
      user: null,
      funcionario: null,
      response: NextResponse.json(
        { error: 'Erro interno durante validação de permissões administrativas.' },
        { status: 500 }
      ),
    }
  }
}
