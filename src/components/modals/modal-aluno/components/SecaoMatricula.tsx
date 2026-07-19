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
    <div className="space-y-6">
      {/* 2. Turma Vinculada */}
      <div>
        <div className="text-[#3ea6ff] font-bold text-xs uppercase tracking-wider pb-1 mb-3 border-b border-[#2a2a2a]">
          2. Turma Vinculada
        </div>
        <div>
          <Label className="text-xs text-gray-300">Selecione a Turma no Sistema</Label>
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
            <SelectTrigger className="bg-[#121212] border-[#2a2a2a] text-white mt-1">
              <SelectValue placeholder="Selecione uma turma ativa">
                {turmaId 
                  ? (() => {
                      const t = turmas.find((x) => x.id === turmaId);
                      return t ? `${t.nome} (${t.ano_letivo})` : (turmas.length === 0 ? 'Carregando...' : turmaId);
                    })()
                  : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-[#181818] border-[#2a2a2a] text-white">
              {turmas.filter(t => t.escola_id === escolaId).map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.nome} ({t.ano_letivo})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 5. Informações da Matrícula & Etapa */}
      <div>
        <div className="text-[#3ea6ff] font-bold text-xs uppercase tracking-wider pb-1 mb-3 border-b border-[#2a2a2a]">
          5. Ano / Etapa de Escolarização & Matrícula
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs text-gray-300">Tipo de Matrícula</Label>
            <Select value={tipoMatricula} onValueChange={(val) => setTipoMatricula(val || 'Renovação')}>
              <SelectTrigger className="bg-[#121212] border-[#2a2a2a] text-white mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#181818] border-[#2a2a2a] text-white">
                <SelectItem value="Nova Matrícula">Nova Matrícula</SelectItem>
                <SelectItem value="Renovação">Renovação</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-gray-300">Data da Matrícula</Label>
            <Input 
              type="date" 
              value={dataMatricula} 
              onChange={(e) => setDataMatricula(e.target.value)} 
              className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
            />
          </div>

          <div>
            <Label className="text-xs text-gray-300">Ano / Série / Etapa</Label>
            <Select 
              value={serie} 
              onValueChange={(val) => {
                setSerie(val || '')
                if (val) {
                  const selectedTurma = turmas.find(t => t.nome === val && t.escola_id === escolaId)
                  if (selectedTurma) {
                    setTurmaId(selectedTurma.id)
                  }
                }
              }}
            >
              <SelectTrigger className="bg-[#121212] border-[#2a2a2a] text-white mt-1 w-full">
                <SelectValue placeholder="Selecione o Ano / Série / Etapa">
                  {serie || undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-[#181818] border-[#2a2a2a] text-white">
                {turmas.filter(t => t.escola_id === escolaId).map((t) => (
                  <SelectItem key={t.id} value={t.nome}>{t.nome} ({t.ano_letivo})</SelectItem>
                ))}
                {turmas.filter(t => t.escola_id === escolaId).length === 0 && (
                  <div className="p-2 text-xs text-zinc-500 text-center">Nenhuma turma cadastrada</div>
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-gray-300">Turno</Label>
            <Select value={turno} onValueChange={(val) => setTurno(val || 'Matutino')}>
              <SelectTrigger className="bg-[#121212] border-[#2a2a2a] text-white mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#181818] border-[#2a2a2a] text-white">
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
      <div>
        <div className="text-[#3ea6ff] font-bold text-xs uppercase tracking-wider pb-1 mb-3 border-b border-[#2a2a2a]">
          8. Recursos para Uso em Sala de Aula e Avaliação INEP (SAEB)
        </div>
        <div className="space-y-3">
          <div className="w-48">
            <Label className="text-xs text-gray-300">Necessita de Recursos Especiais?</Label>
            <Select value={recursosEspeciais} onValueChange={(val) => setRecursosEspeciais(val || 'Não')}>
              <SelectTrigger className="bg-[#121212] border-[#2a2a2a] text-white mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#181818] border-[#2a2a2a] text-white">
                <SelectItem value="Não">Não</SelectItem>
                <SelectItem value="Sim">Sim</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {recursosEspeciais === 'Sim' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-3 bg-[#121212] rounded-xl border border-[#2a2a2a]">
              {OPCOES_RECURSOS.map((opcao) => (
                <label 
                  key={opcao}
                  className="flex items-center gap-2 p-2 bg-[#181818] border border-[#2a2a2a] rounded-lg text-xs cursor-pointer hover:border-[#3ea6ff]/50 transition-colors"
                >
                  <input 
                    type="checkbox" 
                    checked={recursosSelecionados.includes(opcao)}
                    onChange={() => toggleArrayItem(recursosSelecionados, opcao, setRecursosSelecionados)}
                    className="accent-[#3ea6ff]"
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
