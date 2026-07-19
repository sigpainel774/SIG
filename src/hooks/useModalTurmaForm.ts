'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/useAuthStore'

interface UseModalTurmaFormProps {
  open: boolean
  turma?: any
  onSuccess: () => void
  onOpenChange: (open: boolean) => void
}

export function useModalTurmaForm({ open, turma, onSuccess, onOpenChange }: UseModalTurmaFormProps) {
  const [nome, setNome] = useState('')
  const [anoLetivo, setAnoLetivo] = useState(new Date().getFullYear())
  const [turno, setTurno] = useState('')
  const [capacidade, setCapacidade] = useState(30)
  const [loading, setLoading] = useState(false)

  // Allocation States
  const [professoresEscola, setProfessoresEscola] = useState<any[]>([])
  const [vinculosProfessores, setVinculosProfessores] = useState<any[]>([])
  const [materias, setMaterias] = useState<any[]>([])

  const [selectedProfId, setSelectedProfId] = useState('')
  const [novaMateriaNome, setNovaMateriaNome] = useState('')
  const [novaMateriaProfId, setNovaMateriaProfId] = useState('')
  const [novaMateriaBaseCurricular, setNovaMateriaBaseCurricular] = useState('comum')
  const [catalogoMaterias, setCatalogoMaterias] = useState<any[]>([])

  const supabase = createClient() as any
  const { escolaAtivaId } = useAuthStore()

  const fetchCatalogoMaterias = async () => {
    if (!escolaAtivaId) return
    try {
      const { data, error } = await supabase
        .from('grade_curricular_escola')
        .select('*')
        .eq('escola_id', escolaAtivaId)
        .order('nome', { ascending: true })

      if (error) throw error
      setCatalogoMaterias(data || [])
    } catch (err: any) {
      console.error('Erro ao carregar catálogo de matérias:', err)
    }
  }

  const handleSelectMateriaCatalogo = (nomeMateria: string) => {
    setNovaMateriaNome(nomeMateria)
    const selected = catalogoMaterias.find(m => m.nome === nomeMateria)
    if (selected) {
      setNovaMateriaBaseCurricular(selected.base_curricular)
    } else {
      setNovaMateriaBaseCurricular('comum')
    }
  }

  const fetchProfessoresEscola = async () => {
    if (!escolaAtivaId) return
    try {
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
        .eq('escola_id', escolaAtivaId)
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
            (a: any) => (a.nivel === 4 || a.nivel === 5) && a.ativo && a.escola_id === escolaAtivaId
          )

          return temCargoProfessor || temAcessoProfessor
        })
        .map((v: any) => {
          const func = v.funcionarios
          if (Array.isArray(func)) return func[0]
          return func
        })
        .filter(Boolean)

      // Remover duplicados (por ID)
      const uniqueProfs = profs.filter((value: any, index: number, self: any[]) =>
        self.findIndex((v: any) => v.id === value.id) === index
      )

      setProfessoresEscola(uniqueProfs)
    } catch (err: any) {
      console.error('Erro ao carregar professores da escola:', err)
    }
  }

  const fetchVinculosProfessores = async () => {
    if (!turma?.id) return
    try {
      const { data, error } = await supabase
        .from('vinculos_turmas')
        .select('id, funcionario_id, funcionarios(id, nome)')
        .eq('turma_id', turma.id)
        .eq('tipo', 'professor')

      if (error) throw error
      setVinculosProfessores(data || [])
    } catch (err: any) {
      console.error('Erro ao carregar professores da turma:', err)
    }
  }

  const fetchMaterias = async () => {
    if (!turma?.id) return
    try {
      const { data, error } = await supabase
        .from('materias')
        .select('id, nome, professor_id, funcionarios:funcionarios(id, nome)')
        .eq('turma_id', turma.id)
        .order('nome', { ascending: true })

      if (error) throw error
      setMaterias(data || [])
    } catch (err: any) {
      console.error('Erro ao carregar matérias:', err)
    }
  }

  // Preenchimento e Resets (Protegido contra race conditions)
  useEffect(() => {
    let active = true

    if (open) {
      if (turma) {
        setNome(turma.nome)
        setAnoLetivo(turma.ano_letivo)
        setTurno(turma.turno ?? '')
        setCapacidade(turma.capacidade ?? 30)
        fetchVinculosProfessores()
        fetchMaterias()
      } else {
        setNome('')
        setAnoLetivo(new Date().getFullYear())
        setTurno('')
        setCapacidade(30)
        setVinculosProfessores([])
        setMaterias([])
      }
      fetchProfessoresEscola()
      fetchCatalogoMaterias()
      setSelectedProfId('')
      setNovaMateriaNome('')
      setNovaMateriaProfId('')
    }

    return () => {
      active = false
    }
  }, [open, turma, escolaAtivaId])

  const handleSave = async () => {
    if (!nome.trim()) {
      toast.error('O nome da turma é obrigatório')
      return
    }

    if (!anoLetivo) {
      toast.error('O ano letivo é obrigatório')
      return
    }

    if (!turno) {
      toast.error('Selecione um turno')
      return
    }

    if (!escolaAtivaId) {
      toast.error('Nenhuma escola ativa selecionada')
      return
    }

    setLoading(true)

    try {
      if (turma?.id) {
        // Editar
        const { error } = await supabase
          .from('turmas')
          .update({
            nome: nome.trim(),
            ano_letivo: anoLetivo,
            turno: turno,
            capacidade: capacidade,
          })
          .eq('id', turma.id)

        if (error) throw error
        toast.success('Turma atualizada com sucesso')
      } else {
        // Criar
        const { data: newTurma, error } = await supabase
          .from('turmas')
          .insert({
            nome: nome.trim(),
            ano_letivo: anoLetivo,
            turno: turno,
            capacidade: capacidade,
            escola_id: escolaAtivaId
          })
          .select()
          .single()

        if (error) throw error

        // Auto-vincular o funcionário criador à turma como coordenador (padrão de acesso)
        const funcionarioId = useAuthStore.getState().funcionario?.id
        if (funcionarioId && newTurma?.id) {
          await supabase.from('vinculos_turmas').insert({
            funcionario_id: funcionarioId,
            escola_id: escolaAtivaId,
            turma_id: newTurma.id,
            tipo: 'coordenador'
          })
        }

        toast.success('Turma criada com sucesso')
      }

      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast.error('Erro ao salvar turma: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddProfessor = async () => {
    if (!selectedProfId) {
      toast.error('Selecione um professor')
      return
    }

    if (vinculosProfessores.some(vp => vp.funcionario_id === selectedProfId)) {
      toast.error('Este professor já está vinculado a esta turma')
      return
    }

    try {
      const { error } = await supabase
        .from('vinculos_turmas')
        .insert({
          funcionario_id: selectedProfId,
          turma_id: turma.id,
          escola_id: escolaAtivaId,
          tipo: 'professor'
        })

      if (error) throw error
      toast.success('Professor adicionado com sucesso')
      setSelectedProfId('')
      fetchVinculosProfessores()
    } catch (err: any) {
      toast.error('Erro ao adicionar professor: ' + err.message)
    }
  }

  const handleRemoveProfessor = async (vinculoId: string, funcionarioId: string) => {
    try {
      // Validar se o professor ministra alguma matéria na turma
      const hasSubject = materias.some(m => m.professor_id === funcionarioId)
      if (hasSubject) {
        toast.error('Não é possível remover este professor, pois ele está alocado em uma ou mais matérias desta turma.')
        return
      }

      const { error } = await supabase
        .from('vinculos_turmas')
        .delete()
        .eq('id', vinculoId)

      if (error) throw error
      toast.success('Professor removido com sucesso')
      fetchVinculosProfessores()
    } catch (err: any) {
      toast.error('Erro ao remover professor: ' + err.message)
    }
  }

  const handleAddMateria = async () => {
    if (!novaMateriaNome.trim()) {
      toast.error('Digite o nome da matéria')
      return
    }

    try {
      const { error } = await supabase
        .from('materias')
        .insert({
          nome: novaMateriaNome.trim(),
          turma_id: turma.id,
          escola_id: escolaAtivaId,
          professor_id: novaMateriaProfId === 'sem_professor' || !novaMateriaProfId ? null : novaMateriaProfId,
          base_curricular: novaMateriaBaseCurricular
        })

      if (error) throw error
      toast.success('Matéria adicionada com sucesso')
      setNovaMateriaNome('')
      setNovaMateriaProfId('')
      fetchMaterias()
    } catch (err: any) {
      toast.error('Erro ao adicionar matéria: ' + err.message)
    }
  }

  const handleRemoveMateria = async (materiaId: string) => {
    try {
      const { error } = await supabase
        .from('materias')
        .delete()
        .eq('id', materiaId)

      if (error) throw error
      toast.success('Matéria removida com sucesso')
      fetchMaterias()
    } catch (err: any) {
      toast.error('Erro ao remover matéria: ' + err.message)
    }
  }

  return {
    nome, setNome,
    anoLetivo, setAnoLetivo,
    turno, setTurno,
    capacidade, setCapacidade,
    loading,
    professoresEscola,
    vinculosProfessores,
    materias,
    selectedProfId, setSelectedProfId,
    novaMateriaNome, setNovaMateriaNome,
    novaMateriaProfId, setNovaMateriaProfId,
    novaMateriaBaseCurricular, setNovaMateriaBaseCurricular,
    catalogoMaterias,
    handleSelectMateriaCatalogo,
    handleSave,
    handleAddProfessor,
    handleRemoveProfessor,
    handleAddMateria,
    handleRemoveMateria
  }
}
