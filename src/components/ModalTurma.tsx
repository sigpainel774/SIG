'use client'

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] bg-[#121214] border-[#26262a] text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {isEditMode ? (turma ? 'Editar Turma' : 'Nova Turma') : 'Detalhes da Turma'}
          </DialogTitle>
          <DialogDescription className="text-zinc-400 text-sm">
            {isEditMode 
              ? `Preencha os dados abaixo para ${turma ? 'editar a' : 'cadastrar uma nova'} turma.`
              : 'Visualize as informações, professores e matérias alocadas a esta turma.'
            }
          </DialogDescription>
        </DialogHeader>

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
                          {professoresEscola
                            .filter(p => !vinculosProfessores.some(vp => vp.funcionario_id === p.id))
                            .map((prof) => (
                              <SelectItem key={prof.id} value={prof.id}>
                                {prof.nome}
                              </SelectItem>
                            ))}
                          {professoresEscola.filter(p => !vinculosProfessores.some(vp => vp.funcionario_id === p.id)).length === 0 && (
                            <div className="p-2 text-xs text-zinc-500 text-center">Nenhum professor disponível</div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={handleAddProfessor}
                      className="bg-[#3ea6ff] hover:bg-[#0090ff] text-background font-bold px-4 h-10"
                    >
                      Adicionar
                    </Button>
                  </div>
                )}

                {/* Lista de Professores Adicionados */}
                {vinculosProfessores.length > 0 ? (
                  <div className="space-y-2 mt-2 max-h-32 overflow-y-auto pr-1">
                    {vinculosProfessores.map((vp) => (
                      <div key={vp.id} className="flex items-center justify-between bg-[#121214] p-2 rounded-lg border border-[#202022]">
                        <span className="text-sm font-medium text-zinc-200 pl-1">{vp.funcionarios?.nome || 'Sem nome'}</span>
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
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-zinc-500 text-center py-1">Nenhum professor alocado.</div>
                )}
              </div>

              {/* Matérias da Turma */}
              <div className="border border-[#26262a] bg-[#161618] rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-[#26262a] pb-2">
                  <BookOpen className="w-4 h-4 text-zinc-400" />
                  Matérias da Turma
                </div>

                {/* Formulário de Adição (Dashed Container) */}
                {isEditMode && (
                  <div className="border border-dashed border-[#3f3f46] bg-[#121214] rounded-lg p-3 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <Select value={novaMateriaNome} onValueChange={(val) => handleSelectMateriaCatalogo(val ?? '')}>
                        <SelectTrigger className="bg-[#18181b] border-[#2a2a2a] text-white focus:ring-[#3ea6ff] h-10">
                          <SelectValue placeholder="-- Selecione a Matéria --" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#18181b] border-[#2a2a2a] text-white">
                          {catalogoMaterias.length === 0 ? (
                            <SelectItem value="nenhuma" disabled>Cadastre matérias nas Configurações</SelectItem>
                          ) : (
                            catalogoMaterias.map((m) => (
                              <SelectItem key={m.id} value={m.nome}>
                                {m.nome}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <Select value={novaMateriaProfId} onValueChange={(val) => setNovaMateriaProfId(val ?? '')}>
                        <SelectTrigger className="bg-[#18181b] border-[#2a2a2a] text-white focus:ring-[#3ea6ff] h-10">
                          <SelectValue placeholder="-- Selecione o Professor --" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#18181b] border-[#2a2a2a] text-white">
                          <SelectItem value="sem_professor">-- Selecione o Professor --</SelectItem>
                          {vinculosProfessores.map((vp) => (
                            <SelectItem key={vp.funcionario_id} value={vp.funcionario_id}>
                              {vp.funcionarios?.nome || 'Sem nome'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="w-full bg-[#18181b] border border-[#2a2a2a] rounded-lg text-zinc-400 px-3 h-10 text-xs flex items-center justify-between">
                        <span>Base:</span>
                        <span className={cn(
                          "font-semibold uppercase text-[10px] px-2 py-0.5 rounded border",
                          novaMateriaBaseCurricular === 'comum'
                            ? "bg-blue-500/10 border-blue-500/20 text-[#3ea6ff]"
                            : "bg-purple-500/10 border-purple-500/20 text-purple-400"
                        )}>
                          {novaMateriaBaseCurricular === 'comum' ? 'Comum' : 'Diversificada'}
                        </span>
                      </div>
                    </div>
                    <Button
                      onClick={handleAddMateria}
                      className="bg-[#3ea6ff] hover:bg-[#0090ff] text-background font-bold w-auto gap-1 h-9 px-3"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar Matéria
                    </Button>
                  </div>
                )}

                {/* Lista de Matérias */}
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {materias.length === 0 ? (
                    <div className="text-xs text-zinc-500 text-center py-2">Nenhuma matéria cadastrada.</div>
                  ) : (
                    materias.map((mat) => (
                      <div key={mat.id} className="flex items-center justify-between bg-[#121214] p-3 rounded-lg border border-[#202022]">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-white">{mat.nome}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="flex items-center gap-1.5 text-xs text-zinc-400">
                              <User className="w-3.5 h-3.5 text-zinc-500" />
                              {mat.funcionarios?.nome ? mat.funcionarios.nome : 'Sem professor'}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-[#3ea6ff] border border-blue-500/20 font-semibold">
                              {mat.base_curricular === 'diversificada' ? 'Diversificada' : 'Comum'}
                            </span>
                          </div>
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

        {/* Botão de Ação Inferior */}
        <div className="pt-2 border-t border-[#26262a] mt-2">
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
      </DialogContent>
    </Dialog>
  )
}
