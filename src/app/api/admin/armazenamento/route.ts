import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

// Interface para representar as informações do arquivo mapeado
interface MappedFile {
  id: string
  name: string
  bucketId: string
  size: number
  mimetype: string
  createdAt: string
  escolaId: string | null
  escolaNome: string
  type: 'images' | 'docs' | 'videos' | 'others'
}

// 1. Helper para autenticar e validar se é superadmin (ROOT)
async function getAuthenticatedSuperadmin() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: funcionario } = await supabaseAdmin
    .from('funcionarios')
    .select('id, nome, email, is_superadmin')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!funcionario?.is_superadmin) return null
  return funcionario
}

// 2. Inicializar o cliente Supabase administrativo apontando para o schema de 'storage'
const supabaseStorageAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    db: { schema: 'storage' },
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function GET(req: NextRequest) {
  try {
    // A. Validar autenticação
    const admin = await getAuthenticatedSuperadmin()
    if (!admin) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    // B. Buscar todas as escolas (incluindo inativas para histórico)
    const { data: escolas, error: escolasErr } = await supabaseAdmin
      .from('escolas')
      .select('id, nome, logo_url, assinatura_diretor_url')
    
    if (escolasErr) {
      return NextResponse.json({ error: `Erro ao buscar escolas: ${escolasErr.message}` }, { status: 500 })
    }

    // C. Buscar metadados de arquivos na tabela storage.objects
    const { data: objects, error: objectsErr } = await supabaseStorageAdmin
      .from('objects')
      .select('id, bucket_id, name, metadata, created_at')
    
    if (objectsErr) {
      return NextResponse.json({ error: `Erro ao buscar objetos de storage: ${objectsErr.message}` }, { status: 500 })
    }

    // D. Extrair UUIDs candidatos do nome/caminho dos arquivos
    const uuidRegex = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i
    const candidatesSet = new Set<string>()

    objects?.forEach(obj => {
      // 1. Checa UUID no nome/caminho completo
      const match = obj.name.match(uuidRegex)
      if (match) {
        candidatesSet.add(match[0].toLowerCase())
      }
      
      // 2. Checa o primeiro segmento (ex: atividades-secretaria/[escolaId]/...)
      const parts = obj.name.split('/')
      if (parts.length > 0 && uuidRegex.test(parts[0])) {
        candidatesSet.add(parts[0].toLowerCase())
      }
    })

    const candidateUuids = Array.from(candidatesSet)

    // E. Buscar em lote alunos e funcionários vinculados que coincidam com os UUIDs candidatos
    let studentsMap: Record<string, { escolaId: string }> = {}
    let employeesMap: Record<string, { escolaId: string }> = {}

    if (candidateUuids.length > 0) {
      // 1. Busca alunos (incluindo deletados para não gerar orfandade silenciosa de arquivos antigos)
      const { data: students } = await supabaseAdmin
        .from('alunos')
        .select('id, escola_id')
        .in('id', candidateUuids)
      
      students?.forEach(s => {
        if (s.escola_id) {
          studentsMap[s.id.toLowerCase()] = { escolaId: s.escola_id }
        }
      })

      // 2. Busca vínculos de funcionários
      const { data: employeeLinks } = await supabaseAdmin
        .from('vinculos_funcionarios')
        .select('funcionario_id, escola_id')
        .in('funcionario_id', candidateUuids)
      
      employeeLinks?.forEach(el => {
        if (el.escola_id && el.funcionario_id) {
          employeesMap[el.funcionario_id.toLowerCase()] = { escolaId: el.escola_id }
        }
      })
    }

    // F. Criar mapas de busca rápida para as escolas
    const schoolsMap: Record<string, { nome: string; logoUrl: string | null; assinaturaUrl: string | null }> = {}
    const logoToSchoolMap: Record<string, string> = {}
    const signatureToSchoolMap: Record<string, string> = {}

    escolas?.forEach(e => {
      schoolsMap[e.id.toLowerCase()] = {
        nome: e.nome,
        logoUrl: e.logo_url,
        assinaturaUrl: e.assinatura_diretor_url
      }

      // Mapeamento por URL contida
      if (e.logo_url) {
        const logoName = e.logo_url.split('/').pop()?.split('?')[0]
        if (logoName) {
          logoToSchoolMap[logoName.toLowerCase()] = e.id
        }
      }
      if (e.assinatura_diretor_url) {
        const sigName = e.assinatura_diretor_url.split('/').pop()?.split('?')[0]
        if (sigName) {
          signatureToSchoolMap[sigName.toLowerCase()] = e.id
        }
      }
    })

    // G. Mapear e classificar cada arquivo em seu respectivo proprietário (escola ou rede)
    const mappedFiles: MappedFile[] = []

    objects?.forEach(obj => {
      const size = Number(obj.metadata?.size ?? obj.metadata?.contentLength ?? 0)
      const mimetype = (obj.metadata?.mimetype ?? '').toLowerCase()
      const nameLower = obj.name.toLowerCase()
      const filename = obj.name.split('/').pop() || obj.name
      const filenameLower = filename.toLowerCase()

      // 1. Classificação do tipo de arquivo
      let type: 'images' | 'docs' | 'videos' | 'others' = 'others'
      if (mimetype.startsWith('image/')) {
        type = 'images'
      } else if (mimetype.startsWith('video/')) {
        type = 'videos'
      } else if (
        mimetype.startsWith('application/pdf') ||
        mimetype.startsWith('application/msword') ||
        mimetype.startsWith('application/vnd.openxmlformats-officedocument') ||
        filenameLower.endsWith('.pdf') ||
        filenameLower.endsWith('.docx') ||
        filenameLower.endsWith('.doc') ||
        filenameLower.endsWith('.xlsx') ||
        filenameLower.endsWith('.txt') ||
        filenameLower.endsWith('.xls')
      ) {
        type = 'docs'
      }

      // 2. Resolução da escola dona do arquivo
      let escolaId: string | null = null

      // Caso A: Bucket atividades-secretaria (ID da escola é a primeira pasta)
      if (obj.bucket_id === 'atividades-secretaria') {
        const schoolFolder = obj.name.split('/')[0].toLowerCase()
        if (schoolsMap[schoolFolder]) {
          escolaId = schoolFolder
        }
      }

      // Caso B: Bucket logos (se bater com a URL configurada da escola)
      if (!escolaId && obj.bucket_id === 'logos') {
        escolaId = logoToSchoolMap[filenameLower] ?? null
      }

      // Caso C: Bucket assinaturas_alunos (se bater com a assinatura do diretor)
      if (!escolaId && obj.bucket_id === 'assinaturas_alunos') {
        escolaId = signatureToSchoolMap[filenameLower] ?? null
      }

      // Caso D: Extração geral por UUID
      if (!escolaId) {
        const uuidMatch = obj.name.match(uuidRegex)
        if (uuidMatch) {
          const uuid = uuidMatch[0].toLowerCase()
          if (schoolsMap[uuid]) {
            escolaId = uuid
          } else if (studentsMap[uuid]) {
            escolaId = studentsMap[uuid].escolaId
          } else if (employeesMap[uuid]) {
            escolaId = employeesMap[uuid].escolaId
          }
        }
      }

      // Caso E: Se ainda não mapeou, tenta extrair a pasta do aluno no bucket 'alunos-anexos' ou 'fotos-funcionarios'
      if (!escolaId) {
        const firstFolder = obj.name.split('/')[0].toLowerCase()
        if (studentsMap[firstFolder]) {
          escolaId = studentsMap[firstFolder].escolaId
        } else if (employeesMap[firstFolder]) {
          escolaId = employeesMap[firstFolder].escolaId
        }
      }

      const normalizedEscolaId = escolaId ? escolaId.toLowerCase() : null
      const escolaNome = normalizedEscolaId ? (schoolsMap[normalizedEscolaId]?.nome ?? 'Escola Desconhecida') : 'Rede Compartilhada (Global)'

      mappedFiles.push({
        id: obj.id,
        name: obj.name,
        bucketId: obj.bucket_id,
        size,
        mimetype,
        createdAt: obj.created_at,
        escolaId: normalizedEscolaId,
        escolaNome,
        type
      })
    })

    // H. Agregar estatísticas globais e por escola
    let totalBytes = 0
    let sharedBytes = 0
    let totalFileCount = mappedFiles.length

    const schoolStats: Record<string, {
      escolaId: string
      escolaNome: string
      totalBytes: number
      fileCount: number
      breakdown: { images: number; docs: number; videos: number; others: number }
    }> = {}

    // Inicializa estatísticas para todas as escolas ativas, garantindo que apareçam mesmo com consumo zero
    escolas?.forEach(e => {
      schoolStats[e.id.toLowerCase()] = {
        escolaId: e.id.toLowerCase(),
        escolaNome: e.nome,
        totalBytes: 0,
        fileCount: 0,
        breakdown: { images: 0, docs: 0, videos: 0, others: 0 }
      }
    })

    const sharedBreakdown = { images: 0, docs: 0, videos: 0, others: 0 }
    let sharedFileCount = 0

    mappedFiles.forEach(file => {
      totalBytes += file.size

      if (file.escolaId) {
        const sStat = schoolStats[file.escolaId]
        if (sStat) {
          sStat.totalBytes += file.size
          sStat.fileCount += 1
          sStat.breakdown[file.type] += file.size
        } else {
          // Caso a escola não esteja mais ativa, mas o arquivo exista
          schoolStats[file.escolaId] = {
            escolaId: file.escolaId,
            escolaNome: file.escolaNome,
            totalBytes: file.size,
            fileCount: 1,
            breakdown: { images: 0, docs: 0, videos: 0, others: 0 }
          }
          schoolStats[file.escolaId].breakdown[file.type] = file.size
        }
      } else {
        sharedBytes += file.size
        sharedFileCount += 1
        sharedBreakdown[file.type] += file.size
      }
    })

    // I. Ordenar escolas por consumo de dados decrescente
    const bySchool = Object.values(schoolStats).sort((a, b) => b.totalBytes - a.totalBytes)

    // J. Obter lista de arquivos ordenados por tamanho decrescente (top 100 maiores arquivos para auditoria)
    const topFiles = mappedFiles
      .sort((a, b) => b.size - a.size)
      .slice(0, 100)

    return NextResponse.json({
      totalBytes,
      sharedBytes,
      sharedFileCount,
      sharedBreakdown,
      totalFileCount,
      bySchool,
      topFiles
    })

  } catch (err: any) {
    console.error('Erro na API de armazenamento:', err)
    return NextResponse.json({ error: `Erro interno no servidor: ${err.message || err}` }, { status: 500 })
  }
}
