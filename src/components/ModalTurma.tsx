'use client'

import React from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Users,
  BookOpen,
  Trash2,
  Plus,
  User
} from 'lucide-react'
import { useEditModeStore } from '@/store/useEditModeStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useModalTurmaForm } from '@/hooks/useModalTurmaForm'
import { cn } from '@/lib/utils'

interface ModalTurmaProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  turma?: any // null para criar, objeto para editar
  onSuccess: () => void
}

export function ModalTurma({ open, onOpenChange, turma, onSuccess }: ModalTurmaProps) {
  const {
    nome, setNome,
    anoLetivo, setAnoLetivo,
    turno, setTurno,
    capacidade, setCapacidade,
    loading,
    professoresEscola,
    vinculosProfessores,
    materias,
    selectedProfId, setSelectedProfId,
    novaMateriaNome,
    novaMateriaProfId, setNovaMateriaProfId,
    novaMateriaBaseCurricular,
    catalogoMaterias,
    handleSelectMateriaCatalogo,
    handleSave,
    handleAddProfessor,
    handleRemoveProfessor,
    handleAddMateria,
    handleRemoveMateria
  } = useModalTurmaForm({
    open,
    turma,
    onSuccess,
    onOpenChange
  })

  const { acessos, funcionario } = useAuthStore()
  const { isEditMode: globalEditMode } = useEditModeStore()
  const isProfessor = !!(acessos?.some(a => a.nivel === 4 || a.nivel === 5) || funcionario?.cargo?.toLowerCase().includes('professor'))
  const isCoordenador = !!funcionario?.cargo?.toLowerCase().includes('coordenador')
  const isEditMode = globalEditMode && !isProfessor && !isCoordenador

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEditMode ? (turma ? 'Editar Turma' : 'Nova Turma') : 'Detalhes da Turma'}
      description={
        isEditMode 
          ? `Preencha os dados abaixo para ${turma ? 'editar a' : 'cadastrar uma nova'} turma.`
          : 'Visualize as informações, professores e matérias alocadas a esta turma.'
      }
      maxWidth="sm:max-w-[550px]"
      footer={
        <div className="w-full">
          {isEditMode ? (
            <Button
              onClick={handleSave}
              disabled={loading}
              className="w-full bg-[#3ea6ff] hover:bg-[#0090ff] text-[#0f0f0f] font-bold h-11 rounded-lg transition-colors"
            >
              {loading ? 'Salvando...' : 'Salvar Turma'}
            </Button>
          ) : (
            <Button
              onClick={() => onOpenChange(false)}
              className="w-full bg-[#27272a] hover:bg-[#3f3f46] text-white font-bold h-11 rounded-lg transition-colors"
            >
              Fechar
            </Button>
          )}
        </div>
      }
    >
      <div className="grid gap-4 py-2">
        {/* Primeira Linha: Nome e Ano Letivo */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-300">Nome da Turma *</label>
            <Input
              placeholder="Ex: 1 - B"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              disabled={!isEditMode || loading}
              className="bg-[#18181b] border-[#2a2a2a] text-white placeholder-zinc-500 focus-visible:ring-[#3ea6ff] h-10 disabled:opacity-75 disabled:cursor-not-allowed"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-300">Ano Letivo *</label>
            <Input
              type="number"
              value={anoLetivo}
              onChange={(e) => setAnoLetivo(parseInt(e.target.value) || 0)}
              disabled={!isEditMode || loading}
              className="bg-[#18181b] border-[#2a2a2a] text-white placeholder-zinc-500 focus-visible:ring-[#3ea6ff] h-10 disabled:opacity-75 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Segunda Linha: Turno e Capacidade */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-300">Turno *</label>
            <Select value={turno} onValueChange={(val) => setTurno(val ?? '')} disabled={!isEditMode || loading}>
              <SelectTrigger className="bg-[#18181b] border-[#2a2a2a] text-white focus:ring-[#3ea6ff] h-10 disabled:opacity-75 disabled:cursor-not-allowed">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent className="bg-[#18181b] border-[#2a2a2a] text-white">
                <SelectItem value="Matutino">Matutino</SelectItem>
                <SelectItem value="Vespertino">Vespertino</SelectItem>
                <SelectItem value="Integral">Integral</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-300">Capacidade de Alunos</label>
            <Input
              type="number"
              value={capacidade}
              onChange={(e) => setCapacidade(parseInt(e.target.value) || 0)}
              disabled={!isEditMode || loading}
              className="bg-[#18181b] border-[#2a2a2a] text-white placeholder-zinc-500 focus-visible:ring-[#3ea6ff] h-10 disabled:opacity-75 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Áreas de Alocação */}
        {turma && (
          <div className="space-y-5 mt-2">
            {/* Professores da Turma */}
            <div className="border border-[#26262a] bg-[#161618] rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-[#26262a] pb-2">
                <Users className="w-4 h-4 text-zinc-400" />
                Professores da Turma
              </div>
              {isEditMode && (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select value={selectedProfId} onValueChange={(val) => setSelectedProfId(val ?? '')}>
                      <SelectTrigger className="bg-[#121214] border-[#2a2a2a] text-white focus:ring-[#3ea6ff] h-10">
                        <SelectValue placeholder="-- Selecione um Professor --" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#121214] border-[#2a2a2a] text-white">
                        {professoresEscola.map((prof: any) => (
                          <SelectItem key={prof.id} value={prof.id}>
                            {prof.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={handleAddProfessor}
                    className="bg-[#3ea6ff] hover:bg-[#0090ff] text-[#0f0f0f] font-bold px-4 h-10"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Alocar
                  </Button>
                </div>
              )}

              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {vinculosProfessores.length === 0 ? (
                  <div className="text-zinc-500 text-xs py-2 text-center">Nenhum professor alocado nesta turma.</div>
                ) : (
                  vinculosProfessores.map((vp: any) => (
                    <div key={vp.id} className="flex justify-between items-center bg-[#121214] p-2.5 rounded-lg border border-[#222]">
                      <div className="flex items-center gap-2 text-xs text-zinc-300">
                        <User className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{vp.funcionarios?.nome ?? 'Funcionário'}</span>
                      </div>
                      {isEditMode && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveProfessor(vp.id, vp.funcionario_id)}
                          className="h-8 w-8 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Disciplinas da Turma */}
            <div className="border border-[#26262a] bg-[#161618] rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-[#26262a] pb-2">
                <BookOpen className="w-4 h-4 text-zinc-400" />
                Matérias / Disciplinas
              </div>

              {isEditMode && (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select onValueChange={(val) => handleSelectMateriaCatalogo((val as string) ?? '')}>
                      <SelectTrigger className="bg-[#121214] border-[#2a2a2a] text-white focus:ring-[#3ea6ff] h-10">
                        <SelectValue placeholder="-- Selecionar Componente Curricular --" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#121214] border-[#2a2a2a] text-white">
                        {catalogoMaterias.map((cat: any) => (
                          <SelectItem key={cat.id} value={cat.nome}>
                            {cat.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={handleAddMateria}
                    className="bg-[#3ea6ff] hover:bg-[#0090ff] text-[#0f0f0f] font-bold px-4 h-10"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Adicionar
                  </Button>
                </div>
              )}

              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {materias.length === 0 ? (
                  <div className="text-zinc-500 text-xs py-2 text-center">Nenhuma matéria adicionada a esta turma.</div>
                ) : (
                  materias.map((mat: any) => (
                    <div key={mat.id} className="flex justify-between items-center bg-[#121214] p-2.5 rounded-lg border border-[#222]">
                      <div className="flex items-center gap-2 text-xs text-zinc-300">
                        <BookOpen className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{mat.nome}</span>
                      </div>
                      {isEditMode && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveMateria(mat.id)}
                          className="h-8 w-8 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </StandardDialog>
  )
}
