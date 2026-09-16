import { createBrowserClient } from '@/lib/supabaseClient'

/**
 * Lista canônica padrão de especialidades do EMAEE.
 * Usada como fallback quando a unidade ainda não personalizou sua lista.
 */
export const ESPECIALIDADES_CANONICAS_PADRAO = [
  'Psicologia',
  'Psicopedagogia',
  'Atendimento Pedagógico Especializado',
  'Neuropsicopedagogia',
  'Fisioterapia',
  'Massoterapia',
  'Nutrição',
  'Serviço Social',
  'Fonoaudiologia',
  'Terapia Ocupacional',
  'Psicomotricidade',
  'Outros'
] as const

export type EspecialidadePadraoTipo = (typeof ESPECIALIDADES_CANONICAS_PADRAO)[number]

/**
 * Mapeador de cargos de profissionais para nomes padronizados de especialidades.
 * Cobre todos os cargos dos 12 profissionais ativos cadastrados no EMAEE.
 */
export function deduzirEspecialidadeDeCargo(cargo: string | null | undefined): string {
  if (!cargo) return 'Atendimento Pedagógico Especializado'
  const c = cargo.toLowerCase().trim()

  if (c.includes('psicólog') || c.includes('psicolog')) return 'Psicologia'
  if (c.includes('neuropsicopedagog')) return 'Neuropsicopedagogia'
  if (c.includes('psicopedagog')) return 'Psicopedagogia'
  if (c.includes('fono')) return 'Fonoaudiologia'
  if (c.includes('terapia ocupacional') || c.includes('terapeuta')) return 'Terapia Ocupacional'
  if (c.includes('fisio')) return 'Fisioterapia'
  if (c.includes('masso')) return 'Massoterapia'
  if (c.includes('nutri')) return 'Nutrição'
  if (c.includes('assistente social') || c.includes('serviço social') || c.includes('servico social')) return 'Serviço Social'
  if (c.includes('psicomotric')) return 'Psicomotricidade'
  if (c.includes('professor aee') || c.includes('aee') || c.includes('pedagóg') || c.includes('pedagog')) return 'Atendimento Pedagógico Especializado'

  return cargo
}

/**
 * Normaliza qualquer texto de especialidade ou cargo para a sua forma canônica,
 * permitindo comparações seguras sem sensibilidade a maiúsculas/acentos/cargos legados.
 */
export function normalizarEspecialidade(especialidadeOuCargo: string | null | undefined): string {
  if (!especialidadeOuCargo) return ''
  const str = especialidadeOuCargo.trim()

  // 1. Tentar deduzir se for um cargo conhecido
  const deduzida = deduzirEspecialidadeDeCargo(str)
  if (deduzida !== str) return deduzida

  // 2. Normalizar strings conhecidas
  const lower = str.toLowerCase()
  if (lower.includes('psicolog') || lower.includes('psicólog')) return 'Psicologia'
  if (lower.includes('neuropsicopedagog')) return 'Neuropsicopedagogia'
  if (lower.includes('psicopedagog')) return 'Psicopedagogia'
  if (lower.includes('fono')) return 'Fonoaudiologia'
  if (lower.includes('terapia ocupacional') || lower.includes('terapeuta')) return 'Terapia Ocupacional'
  if (lower.includes('fisio')) return 'Fisioterapia'
  if (lower.includes('masso')) return 'Massoterapia'
  if (lower.includes('nutri')) return 'Nutrição'
  if (lower.includes('social')) return 'Serviço Social'
  if (lower.includes('psicomotric')) return 'Psicomotricidade'
  if (lower.includes('professor aee') || lower.includes('aee') || lower.includes('pedagog')) return 'Atendimento Pedagógico Especializado'

  return str
}

/**
 * Verifica se duas especialidades são equivalentes (ex: 'Psicólogo(a)' === 'Psicologia').
 */
export function saoEspecialidadesEquivalentes(espA: string | null | undefined, espB: string | null | undefined): boolean {
  if (!espA || !espB) return false
  if (espA.toLowerCase().trim() === espB.toLowerCase().trim()) return true
  return normalizarEspecialidade(espA).toLowerCase() === normalizarEspecialidade(espB).toLowerCase()
}

/**
 * Carrega a lista de especialidades configuradas para a unidade EMAEE.
 * Se a unidade não possuir especialidades personalizadas, retorna a lista padrão + especialidades dos profissionais.
 */
export async function obterEspecialidadesEmaee(escolaId?: string): Promise<string[]> {
  const supabase = createBrowserClient()

  try {
    // 1. Tentar buscar da tabela system_config (chave configurável por escola)
    const chaveConfig = escolaId ? `emaee_especialidades_${escolaId}` : null
    if (chaveConfig) {
      const { data: sysData } = await supabase
        .from('system_config')
        .select('valor')
        .eq('chave', chaveConfig)
        .maybeSingle()

      if (sysData?.valor) {
        try {
          const parsed = JSON.parse(sysData.valor)
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed
          }
        } catch {
          // Ignora erro de JSON parse
        }
      }
    }

    // 2. Tentar buscar de qualquer chave genérica emaee_especialidades_ se não encontrou específica
    const { data: sysDataGen } = await supabase
      .from('system_config')
      .select('valor')
      .ilike('chave', 'emaee_especialidades_%')
      .limit(1)
      .maybeSingle()

    if (sysDataGen?.valor) {
      try {
        const parsed = JSON.parse(sysDataGen.valor)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
        }
      } catch {
        // Ignora erro de JSON parse
      }
    }

    // 3. Buscar se a escola tem coluna especialidades_disponiveis
    let q = supabase.from('escolas').select('id, tipo, especialidades_disponiveis' as any)
    if (escolaId) {
      q = q.eq('id', escolaId)
    } else {
      q = q.or('tipo.eq.EMAEE,nome.ilike.%EMAEE%')
    }

    const { data: escolas } = await q.limit(1)

    if (escolas && escolas.length > 0) {
      const esc: any = escolas[0]
      if (Array.isArray(esc.especialidades_disponiveis) && esc.especialidades_disponiveis.length > 0) {
        return esc.especialidades_disponiveis
      }
    }
  } catch (err) {
    console.warn('Aviso ao consultar especialidades da escola:', err)
  }

  // 4. Fallback: Buscar profissionais AEE ativos para derivar especialidades reais
  try {
    const { data: profs } = await supabase
      .from('funcionarios')
      .select('cargo')
      .eq('is_profissional_aee', true)
      .eq('status', 'ativo')
      .is('deleted_at', null)

    const setEspecialidades = new Set<string>()

    if (profs && profs.length > 0) {
      profs.forEach((p) => {
        if (p.cargo) {
          setEspecialidades.add(deduzirEspecialidadeDeCargo(p.cargo))
        }
      })
    }

    // Mesclar com as canônicas padrão para não deixar nenhuma área médica/pedagógica de fora
    ESPECIALIDADES_CANONICAS_PADRAO.forEach((esp) => setEspecialidades.add(esp))

    return Array.from(setEspecialidades)
  } catch (err) {
    console.error('Erro no fallback de especialidades EMAEE:', err)
    return Array.from(ESPECIALIDADES_CANONICAS_PADRAO)
  }
}

/**
 * Salva a lista de especialidades personalizadas da unidade EMAEE.
 * Persiste na tabela `system_config` (chave única por unidade) e tenta atualizar a tabela `escolas`.
 */
export async function salvarEspecialidadesEmaee(escolaId: string, especialidades: string[]): Promise<{ success: boolean; error?: any }> {
  const supabase = createBrowserClient()

  try {
    const chave = `emaee_especialidades_${escolaId}`

    // 1. Salvar na tabela system_config
    const { error: errSys } = await supabase
      .from('system_config')
      .upsert({
        chave,
        valor: JSON.stringify(especialidades),
        descricao: 'Especialidades clínicas e pedagógicas cadastradas no EMAEE'
      }, { onConflict: 'chave' })

    if (errSys) {
      console.warn('Aviso ao persistir em system_config:', errSys)
    }

    // 2. Tentar também atualizar a coluna dedicada em escolas caso exista
    try {
      await supabase
        .from('escolas')
        .update({
          especialidades_disponiveis: especialidades
        } as any)
        .eq('id', escolaId)
    } catch {
      // Ignora se coluna direta não existir
    }

    return { success: true }
  } catch (err: any) {
    console.error('Erro ao salvar especialidades da escola:', err)
    return { success: false, error: err }
  }
}
