import { SupabaseClient } from '@supabase/supabase-js'

export const getProfessoresEscola = async (supabase: SupabaseClient, escolaId: string) => {
  if (!escolaId) return []
  const { data, error } = await supabase
    .from('vinculos_funcionarios')
    .select(`
      id,
      cargo,
      ativo,
      funcionarios (
        id,
        nome,
        cargo,
        acessos_usuarios (
          nivel,
          escola_id,
          ativo
        )
      )
    `)
    .eq('escola_id', escolaId)
    .eq('ativo', true)

  if (error) throw error

  const profs = (data || [])
    .filter((v: any) => {
      const func = v.funcionarios
      if (!func) return false

      const cargoVinc = (v.cargo || '').toLowerCase()
      const cargoFunc = (func.cargo || '').toLowerCase()
      const temCargoProfessor = cargoVinc.includes('professor') || cargoFunc.includes('professor')

      const acessosList = func.acessos_usuarios || []
      const temAcessoProfessor = (Array.isArray(acessosList) ? acessosList : [acessosList]).some(
        (a: any) => (a.nivel === 4 || a.nivel === 5) && a.ativo && a.escola_id === escolaId
      )

      return temCargoProfessor || temAcessoProfessor
    })
    .map((v: any) => {
      const func = v.funcionarios
      if (Array.isArray(func)) return func[0]
      return func
    })
    .filter(Boolean)

  return profs.filter((value: any, index: number, self: any[]) =>
    self.findIndex((v: any) => v.id === value.id) === index
  )
}

export const getCatalogoMaterias = async (supabase: SupabaseClient, escolaId: string) => {
  if (!escolaId) return []
  const { data, error } = await supabase
    .from('grade_curricular_escola')
    .select('*')
    .eq('escola_id', escolaId)
    .order('nome', { ascending: true })

  if (error) throw error
  return data || []
}

export const getVinculosProfessores = async (supabase: SupabaseClient, turmaId: string) => {
  if (!turmaId) return []
  const { data, error } = await supabase
    .from('vinculos_turmas')
    .select('id, funcionario_id, funcionarios(id, nome)')
    .eq('turma_id', turmaId)
    .eq('tipo', 'professor')

  if (error) throw error
  return data || []
}
