import { NextResponse, type NextRequest } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { createClient } from '@/lib/supabaseServer'
import { checkRateLimit } from '@/lib/rateLimit'

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

// Gerador de token de verificação criptograficamente seguro (8 caracteres alfanuméricos)
function generateSecureVerificacaoToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const bytes = crypto.randomBytes(8)
  let token = ''
  for (let i = 0; i < 8; i++) {
    token += chars[bytes[i] % chars.length]
  }
  return token
}

export async function POST(request: NextRequest) {
  try {
    // 1. Validar autenticação do usuário logado via Supabase Server Client
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Acesso não autorizado. Por favor, realize o login.' }, { status: 401 })
    }

    // 2. Extrair IP real do requisitante e aplicar Rate Limiting
    const forwardedFor = request.headers.get('x-forwarded-for')
    const ipFuncionario = forwardedFor
      ? forwardedFor.split(',')[0].trim()
      : request.headers.get('x-real-ip') || '127.0.0.1'
    const uaFuncionario = request.headers.get('user-agent') || 'SIG/DocumentosServer'

    const rlResult = checkRateLimit(ipFuncionario, 'general')
    if (!rlResult.allowed) {
      return NextResponse.json(
        { error: 'Muitas solicitações de documentos. Por favor, aguarde alguns instantes.' },
        { status: 429, headers: { 'Retry-After': String(rlResult.retryAfterSeconds) } }
      )
    }

    // 3. Extrair payload da requisição
    const body = await request.json().catch(() => ({}))
    const { alunoId, docType, dadosOficio } = body

    if (!docType || typeof docType !== 'string') {
      return NextResponse.json({ error: 'Tipo de documento (docType) é obrigatório.' }, { status: 400 })
    }

    // Validação estrita de UUID para alunoId
    const targetAlunoId = (alunoId && typeof alunoId === 'string' && UUID_REGEX.test(alunoId))
      ? alunoId
      : null

    let nomeAluno = ''
    let matriculaId = ''

    // 4. Buscar dados do aluno se houver um alunoId válido
    if (targetAlunoId) {
      const { data: aluno } = await supabaseAdmin
        .from('alunos')
        .select('id, nome, numero_matricula, escola_id, turma_id, dados_matricula')
        .eq('id', targetAlunoId)
        .maybeSingle()

      if (aluno) {
        nomeAluno = aluno.nome?.toUpperCase() || ''
        matriculaId = aluno.numero_matricula || aluno.id || ''
      }
    }

    // 5. Verificar perfil do funcionário emissor
    const { data: funcionario } = await supabaseAdmin
      .from('funcionarios')
      .select('id, nome, is_superadmin')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (!funcionario) {
      return NextResponse.json({ error: 'Perfil de funcionário não encontrado para o usuário logado.' }, { status: 403 })
    }

    // 6. Gerar Token Criptográfico CSH de 8 Caracteres
    const token = generateSecureVerificacaoToken()
    const nowIso = new Date().toISOString()

    // 7. Calcular Hash SHA-256 determinístico no Back-end (Node.js crypto)
    const canonicalPayload = JSON.stringify({
      alunoId: targetAlunoId,
      nomeAluno,
      matriculaId,
      docType,
      dadosOficio: dadosOficio || null,
      emissorId: funcionario.id,
      token,
      criadoEm: nowIso
    })

    const hashHex = crypto.createHash('sha256').update(canonicalPayload).digest('hex')

    // 8. Gravar registro de assinatura na tabela public.assinatura via supabaseAdmin
    const activeDadosPayload = dadosOficio ? {
      numeroOficio: dadosOficio.numeroOficio,
      destinatario: dadosOficio.destinatario,
      assunto: dadosOficio.assunto,
      conteudoHtml: dadosOficio.conteudoHtml,
    } : null

    const { error: insertError } = await supabaseAdmin
      .from('assinatura')
      .insert({
        aluno_id: targetAlunoId,
        tipo_documento: docType,
        token_verificacao: token,
        hash_sha256: hashHex,
        ip_funcionario: ipFuncionario,
        user_agent_funcionario: uaFuncionario,
        dispositivo_funcionario: request.headers.get('sec-ch-ua-mobile') === '?1' ? 'Celular' : 'Computador',
        data_funcionario: nowIso,
        dados_documento: activeDadosPayload
      } as any)

    if (insertError) {
      console.error('Erro ao gravar assinatura no banco:', insertError)
      throw insertError
    }

    // 9. Se for um documento associado a um aluno específico, limpar documentos anteriores idênticos
    if (targetAlunoId) {
      await supabaseAdmin
        .from('assinatura')
        .delete()
        .eq('aluno_id', targetAlunoId)
        .eq('tipo_documento', docType)
        .neq('token_verificacao', token)
    }

    return NextResponse.json({
      success: true,
      token_verificacao: token,
      hash_sha256: hashHex,
      data_emissao: nowIso
    })

  } catch (err: any) {
    console.error('Erro na API de geração de assinatura de documento:', err)
    return NextResponse.json({ error: `Falha interna no servidor: ${err.message}` }, { status: 500 })
  }
}
