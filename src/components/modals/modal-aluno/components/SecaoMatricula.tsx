'use client'

import React from 'react'
import { useAlunoForm } from '../context/AlunoFormContext'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { GraduationCap, BookOpen, Layers } from 'lucide-react'

export function SecaoMatricula() {
  const {
    turmaId, setTurmaId,
    turmas,
    escolaId,
    setSerie,
    serie,
    tipoMatricula, setTipoMatricula,
    dataMatricula, setDataMatricula,
    turno, setTurno,
    recursosEspeciais, setRecursosEspeciais,
    recursosSelecionados, setRecursosSelecionados,
    toggleArrayItem
  } = useAlunoForm()

  const OPCOES_RECURSOS = [
    'Auxílio leitor',
    'Tradutor/intérprete de Libras',
    'Leitura Labial',
    'Material em Braille',
    'Auxílio transcrição',
    'Prova fonte 16',
    'Guia intérprete',
    'Prova fonte 18',
    'Vídeo Libras',
    'CD áudio',
    'LP Segunda Língua'
  ]

  return (
    <div className="space-y-6 py-2">
      {/* 1. Enturmação e Matrícula */}
      <div className="p-4 rounded-xl bg-background border border-borderCustom space-y-4">
        <div className="flex items-center gap-2 pb-2.5 border-b border-borderCustom text-highlight font-bold text-xs uppercase tracking-wider">
          <GraduationCap className="w-4 h-4 text-highlight" />
          Turma & Modalidade de Ensino
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground font-medium">Turma Vinculada no Sistema</Label>
            <Select 
              value={turmaId} 
              onValueChange={(val) => {
                setTurmaId(val || '')
                if (val) {
                  const selectedTurma = turmas.find(t => t.id === val)
                  if (selectedTurma) {
                    setSerie(selectedTurma.nome)
                  }
                }
              }}
            >
              <SelectTrigger className="h-8 bg-[#181818] border-borderCustom text-xs">
                <SelectValue placeholder="Selecione uma turma ativa">
                  {turmaId 
                    ? (() => {
                        const t = turmas.find((x) => x.id === turmaId);
                        return t ? `${t.nome} (${t.ano_letivo})` : (turmas.length === 0 ? 'Carregando...' : turmaId);
                      })()
                    : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-[#181818] border-borderCustom text-foreground text-xs">
                {turmas.filter(t => (t.escola_id || t.school_id) === escolaId).map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.nome} ({t.ano_letivo})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground font-medium">Ano / Série / Etapa</Label>
            <Select 
              value={serie} 
              onValueChange={(val) => {
                setSerie(val || '')
                if (val) {
                  const selectedTurma = turmas.find(t => t.nome === val && (t.escola_id || t.school_id) === escolaId)
                  if (selectedTurma) {
                    setTurmaId(selectedTurma.id)
                  }
                }
              }}
            >
              <SelectTrigger className="h-8 bg-[#181818] border-borderCustom text-xs">
                <SelectValue placeholder="Selecione o Ano / Série / Etapa">
                  {serie || undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-[#181818] border-borderCustom text-foreground text-xs">
                {turmas.filter(t => (t.escola_id || t.school_id) === escolaId).map((t) => (
                  <SelectItem key={t.id} value={t.nome}>{t.nome} ({t.ano_letivo})</SelectItem>
                ))}
                {turmas.filter(t => (t.escola_id || t.school_id) === escolaId).length === 0 && (
                  <div className="p-2 text-xs text-muted-foreground text-center">Nenhuma turma cadastrada</div>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground font-medium">Tipo de Matrícula</Label>
            <Select value={tipoMatricula} onValueChange={(val) => setTipoMatricula(val || 'Renovação')}>
              <SelectTrigger className="h-8 bg-[#181818] border-borderCustom text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#181818] border-borderCustom text-foreground text-xs">
                <SelectItem value="Nova Matrícula">Nova Matrícula</SelectItem>
                <SelectItem value="Renovação">Renovação</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground font-medium">Data da Matrícula</Label>
            <Input 
              type="date"
              value={dataMatricula} 
              onChange={(e) => setDataMatricula(e.target.value)} 
              className="h-8 bg-[#181818] border-borderCustom text-xs text-foreground" 
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground font-medium">Turno das Aulas</Label>
            <Select value={turno} onValueChange={(val) => setTurno(val || 'Matutino')}>
              <SelectTrigger className="h-8 bg-[#181818] border-borderCustom text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#181818] border-borderCustom text-foreground text-xs">
                <SelectItem value="Matutino">Matutino</SelectItem>
                <SelectItem value="Vespertino">Vespertino</SelectItem>
                <SelectItem value="Noturno">Noturno</SelectItem>
                <SelectItem value="Integral">Integral</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 2. Recursos SAEB (INEP) */}
      <div className="p-4 rounded-xl bg-background border border-borderCustom space-y-4">
        <div className="flex items-center gap-2 pb-2.5 border-b border-borderCustom text-highlight font-bold text-xs uppercase tracking-wider">
          <BookOpen className="w-4 h-4 text-highlight" />
          Recursos de Acessibilidade em Avaliações INEP (SAEB)
        </div>

        <div className="space-y-3">
          <div className="w-56 space-y-1">
            <Label className="text-xs text-muted-foreground font-medium">Necessita de Recursos Especiais?</Label>
            <Select value={recursosEspeciais} onValueChange={(val) => setRecursosEspeciais(val || 'Não')}>
              <SelectTrigger className="h-8 bg-[#181818] border-borderCustom text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#181818] border-borderCustom text-foreground text-xs">
                <SelectItem value="Não">Não</SelectItem>
                <SelectItem value="Sim">Sim, indicar quais</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {recursosEspeciais === 'Sim' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-3 bg-[#181818] rounded-xl border border-borderCustom">
              {OPCOES_RECURSOS.map((opcao) => (
                <label 
                  key={opcao}
                  className="flex items-center gap-2 p-2 bg-[#141416] border border-borderCustom rounded-lg text-xs cursor-pointer hover:border-highlight transition-colors text-zinc-300"
                >
                  <input 
                    type="checkbox" 
                    checked={recursosSelecionados.includes(opcao)}
                    onChange={() => toggleArrayItem(recursosSelecionados, opcao, setRecursosSelecionados)}
                    className="accent-[#3ea6ff]"
                  />
                  <span className="truncate">{opcao}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
