'use client'

import { useState } from 'react'
import { toast } from 'sonner'

interface UseTurmaMateriasProps {
  turma: any
  escolaAtivaId: string | null
  materias: any[]
  vinculosProfessores: any[]
  professoresEscola: any[]
  catalogoMaterias: any[]
  mutateTurmaData: any
  mutateVinculos: any
  supabase: any
  isMounted: React.RefObject<boolean>
}

export function useTurmaMaterias({
  turma,
  escolaAtivaId,
  materias,
  vinculosProfessores,
  professoresEscola,
  catalogoMaterias,
  mutateTurmaData,
  mutateVinculos,
  supabase,
  isMounted
}: UseTurmaMateriasProps) {
  const [selectedProfId, setSelectedProfId] = useState('')
  const [novaMateriaNome, setNovaMateriaNome] = useState('')
  const [novaMateriaProfId, setNovaMateriaProfId] = useState('')
  const [novaMateriaBaseCurricular, setNovaMateriaBaseCurricular] = useState('comum')
  const [materiaAberta, setMateriaAberta] = useState<string | null>(null)

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
          escola_id: escolaAtivaId ?? '',
          tipo: 'professor'
        })

      if (error) throw error
      toast.success('Professor adicionado com sucesso')
      if (isMounted.current) {
        setSelectedProfId('')
      }
      mutateVinculos()
    } catch (err: any) {
      toast.error('Erro ao adicionar professor: ' + err.message)
    }
  }

  const handleRemoveProfessor = async (vinculoId: string, funcionarioId: string) => {
    try {
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
      mutateVinculos()
    } catch (err: any) {
      toast.error('Erro ao remover professor: ' + err.message)
    }
  }

  const handleSelectMateriaCatalogo = (nomeMateria: string) => {
    if (isMounted.current) {
      setNovaMateriaNome(nomeMateria)
      const selected = catalogoMaterias.find(m => m.nome === nomeMateria)
      if (selected) {
        setNovaMateriaBaseCurricular(selected.base_curricular)
      } else {
        setNovaMateriaBaseCurricular('comum')
      }
    }
  }

  const handleAddMateria = async () => {
    if (!novaMateriaNome.trim()) {
      toast.error('Digite o nome da matéria')
      return
    }

    const alreadyExists = materias.some(
      (m: any) => m.nome.trim().toLowerCase() === novaMateriaNome.trim().toLowerCase()
    )
    if (alreadyExists) {
      toast.error('Esta matéria já está vinculada a esta turma.')
      return
    }

    try {
      const { error } = await supabase
        .from('materias')
        .insert({
          nome: novaMateriaNome.trim(),
          turma_id: turma.id,
          escola_id: escolaAtivaId || null,
          professor_id: novaMateriaProfId === 'sem_professor' || !novaMateriaProfId ? null : novaMateriaProfId,
          base_curricular: novaMateriaBaseCurricular
        })

      if (error) throw error
      toast.success('Matéria adicionada com sucesso')
      if (isMounted.current) {
        setNovaMateriaNome('')
        setNovaMateriaProfId('')
        setNovaMateriaBaseCurricular('comum')
      }
      mutateTurmaData()
    } catch (err: any) {
      toast.error('Erro ao adicionar matéria: ' + err.message)
    }
  }

  const handleImportarMateriasDaGrade = async () => {
    if (!catalogoMaterias || catalogoMaterias.length === 0) {
      toast.info('Não há matérias na grade curricular desta escola.')
      return
    }

    try {
      const missingMaterias = catalogoMaterias.filter((gridMat: any) => 
        !materias.some((mat: any) => mat.nome.trim().toLowerCase() === gridMat.nome.trim().toLowerCase())
      )

      if (missingMaterias.length === 0) {
        toast.info('Todas as matérias da grade já estão nesta turma.')
        return
      }

      const inserts = missingMaterias.map((gridMat: any) => ({
        nome: gridMat.nome.trim(),
        turma_id: turma.id,
        escola_id: escolaAtivaId || null,
        professor_id: null,
        base_curricular: gridMat.base_curricular || 'comum'
      }))

      const { error } = await supabase
        .from('materias')
        .insert(inserts)

      if (error) throw error

      toast.success(`${missingMaterias.length} matéria(s) importada(s) com sucesso!`)
      mutateTurmaData()
    } catch (err: any) {
      toast.error('Erro ao importar matérias da grade: ' + err.message)
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
      mutateTurmaData()
    } catch (err: any) {
      toast.error('Erro ao remover matéria: ' + err.message)
    }
  }

  const handleUpdateMateriaProfessor = async (materiaId: string, professorId: string) => {
    const profIdVal = professorId === 'sem_professor' || !professorId ? null : professorId

    mutateTurmaData(
      (curr: any) => {
        if (!curr) return curr
        const nomeProf = vinculosProfessores.find(vp => vp.funcionario_id === profIdVal)?.funcionarios?.nome || null
        return {
          ...curr,
          materias: curr.materias.map((m: any) => 
            m.id === materiaId 
              ? { 
                  ...m, 
                  professor_id: profIdVal, 
                  funcionarios: profIdVal ? { id: profIdVal, nome: nomeProf } : null 
                } 
              : m
          )
        }
      },
      { revalidate: false }
    )

    try {
      const { error } = await supabase
        .from('materias')
        .update({ professor_id: profIdVal })
        .eq('id', materiaId)

      if (error) throw error
      toast.success('Professor da matéria atualizado!')
      mutateTurmaData()
    } catch (err: any) {
      toast.error('Erro ao atualizar professor da matéria: ' + err.message)
      mutateTurmaData()
    }
  }

  const handleUpdateMateriaBase = async (materiaId: string, baseCurricular: string) => {
    mutateTurmaData(
      (curr: any) => {
        if (!curr) return curr
        return {
          ...curr,
          materias: curr.materias.map((m: any) => 
            m.id === materiaId 
              ? { ...m, base_curricular: baseCurricular } 
              : m
          )
        }
      },
      { revalidate: false }
    )

    try {
      const { error } = await supabase
        .from('materias')
        .update({ base_curricular: baseCurricular })
        .eq('id', materiaId)

      if (error) throw error
      toast.success('Base curricular da matéria atualizada com sucesso!')
      mutateTurmaData()
    } catch (err: any) {
      toast.error('Erro ao atualizar base curricular da matéria: ' + err.message)
      mutateTurmaData()
    }
  }

  return {
    selectedProfId,
    setSelectedProfId,
    novaMateriaNome,
    setNovaMateriaNome,
    novaMateriaProfId,
    setNovaMateriaProfId,
    novaMateriaBaseCurricular,
    setNovaMateriaBaseCurricular,
    materiaAberta,
    setMateriaAberta,
    handleAddProfessor,
    handleRemoveProfessor,
    handleSelectMateriaCatalogo,
    handleAddMateria,
    handleImportarMateriasDaGrade,
    handleRemoveMateria,
    handleUpdateMateriaProfessor,
    handleUpdateMateriaBase
  }
}
