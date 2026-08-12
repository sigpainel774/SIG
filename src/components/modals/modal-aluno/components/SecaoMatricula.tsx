'use client'

import React from 'react'
import { useAlunoForm } from '../context/AlunoFormContext'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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
    <div className="space-y-4">
      {/* 2. Turma Vinculada */}
      <div className="student-edit-modal__section student-section-card p-5 rounded-xl bg-white border border-[#D1D5DB]">
        <div className="student-edit-modal__section-title section-title text-[#0067C0] font-bold text-base tracking-[0.01em] pb-2.5 mb-3 border-b border-[#D1D5DB]">
          2. Turma Vinculada
        </div>
        <div>
          <Label className="text-xs text-muted-foreground font-medium">Selecione a Turma no Sistema</Label>
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
            <SelectTrigger className="mt-1 w-full">
              <SelectValue placeholder="Selecione uma turma ativa">
                {turmaId 
                  ? (() => {
                      const t = turmas.find((x) => x.id === turmaId);
                      return t ? `${t.nome} (${t.ano_letivo})` : (turmas.length === 0 ? 'Carregando...' : turmaId);
                    })()
                  : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {turmas.filter(t => (t.escola_id || t.school_id) === escolaId).map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.nome} ({t.ano_letivo})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 5. Informações da Matrícula & Etapa */}
      <div className="student-edit-modal__section student-section-card p-5 rounded-xl bg-white border border-[#D1D5DB]">
        <div className="student-edit-modal__section-title section-title text-[#0067C0] font-bold text-base tracking-[0.01em] pb-2.5 mb-3 border-b border-[#D1D5DB]">
          5. Ano / Etapa de Escolarização & Matrícula
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground font-medium">Tipo de Matrícula</Label>
            <Select value={tipoMatricula} onValueChange={(val) => setTipoMatricula(val || 'Renovação')}>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Nova Matrícula">Nova Matrícula</SelectItem>
                <SelectItem value="Renovação">Renovação</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground font-medium">Data da Matrícula</Label>
            <Input 
              type="date" 
              value={dataMatricula} 
              onChange={(e) => setDataMatricula(e.target.value)} 
              className="mt-1" 
            />
          </div>

          <div>
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
              <SelectTrigger className="mt-1 w-full">
                <SelectValue placeholder="Selecione o Ano / Série / Etapa">
                  {serie || undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {turmas.filter(t => (t.escola_id || t.school_id) === escolaId).map((t) => (
                  <SelectItem key={t.id} value={t.nome}>{t.nome} ({t.ano_letivo})</SelectItem>
                ))}
                {turmas.filter(t => (t.escola_id || t.school_id) === escolaId).length === 0 && (
                  <div className="p-2 text-xs text-muted-foreground text-center">Nenhuma turma cadastrada</div>
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground font-medium">Turno</Label>
            <Select value={turno} onValueChange={(val) => setTurno(val || 'Matutino')}>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Matutino">Matutino</SelectItem>
                <SelectItem value="Vespertino">Vespertino</SelectItem>
                <SelectItem value="Noturno">Noturno</SelectItem>
                <SelectItem value="Integral">Integral</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 8. Recursos SAEB (INEP) */}
      <div className="student-edit-modal__section student-section-card p-5 rounded-xl bg-white border border-[#D1D5DB]">
        <div className="student-edit-modal__section-title section-title text-[#0067C0] font-bold text-base tracking-[0.01em] pb-2.5 mb-3 border-b border-[#D1D5DB]">
          8. Recursos para Uso em Sala de Aula e Avaliação INEP (SAEB)
        </div>
        <div className="space-y-3">
          <div className="w-48">
            <Label className="text-xs text-muted-foreground font-medium">Necessita de Recursos Especiais?</Label>
            <Select value={recursosEspeciais} onValueChange={(val) => setRecursosEspeciais(val || 'Não')}>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Não">Não</SelectItem>
                <SelectItem value="Sim">Sim</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {recursosEspeciais === 'Sim' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-3 bg-[#F8FAFC] rounded-xl border border-[#D1D5DB]">
              {OPCOES_RECURSOS.map((opcao) => (
                <label 
                  key={opcao}
                  className="flex items-center gap-2 p-2 bg-white border border-[#D1D5DB] rounded-lg text-xs cursor-pointer hover:border-[#0067C0] transition-colors text-[#374151]"
                >
                  <input 
                    type="checkbox" 
                    checked={recursosSelecionados.includes(opcao)}
                    onChange={() => toggleArrayItem(recursosSelecionados, opcao, setRecursosSelecionados)}
                    className="accent-[#0067C0]"
                  />
                  <span>{opcao}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

