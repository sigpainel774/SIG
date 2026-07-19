'use client'

import React from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useFuncionarioForm } from '../context/FuncionarioFormContext'

export function EscolaridadeTab() {
  const {
    escolaridadeNivel, setEscolaridadeNivel,
    ensinoMedioTipo, setEnsinoMedioTipo,
    superiorArea, setSuperiorArea,
    superiorCodigo, setSuperiorCodigo,
    superiorAno, setSuperiorAno,
    superiorTipoInst, setSuperiorTipoInst,
    superiorGrau, setSuperiorGrau,
    superiorInstituicao, setSuperiorInstituicao,
    complementacaoPedagogica, setComplementacaoPedagogica,
    posGraduacoes, setPosGraduacoes,
    outrosCursos, setOutrosCursos,
    toggleOutroCurso,
  } = useFuncionarioForm()

  const addPos = () => {
    if (posGraduacoes.length >= 6) {
      toast.error('Limite de 6 pós-graduações atingido.')
      return
    }
    setPosGraduacoes([...posGraduacoes, { tipo: 'Especialização', area: '', ano: '' }])
  }

  const updatePos = (index: number, key: 'tipo' | 'area' | 'ano', value: string) => {
    const updated = [...posGraduacoes]
    updated[index] = { ...updated[index], [key]: value }
    setPosGraduacoes(updated)
  }

  const removePos = (index: number) => {
    setPosGraduacoes(posGraduacoes.filter((_, i) => i !== index))
  }

  const cursosDisponiveis = [
    'Creche (0 a 3 anos)',
    'Pré-escolar (4 e 5 anos)',
    'Anos iniciais do ensino fundamental',
    'Anos finais do ensino fundamental',
    'Ensino médio',
    'Educação de jovens e adultos',
    'Educação especial',
    'Educação indígena',
    'Educação do campo',
    'Direitos da criança e do adolescente',
    'Educação em direitos humanos',
    'Gênero e diversidade sexual',
    'Gestão escolar',
    'Outros',
    'Nenhum',
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Maior Nível de Escolaridade Concluído</Label>
          <select
            value={escolaridadeNivel}
            onChange={(e) => setEscolaridadeNivel(e.target.value)}
            className="w-full h-10 px-3 rounded-md bg-[#181818] border border-borderCustom text-white text-sm outline-none mt-1"
          >
            <option value="Não concluiu o Ensino Fundamental">Não concluiu o Ensino Fundamental</option>
            <option value="Ensino Fundamental">Ensino Fundamental Completo</option>
            <option value="Ensino Médio">Ensino Médio Completo</option>
            <option value="Educação Superior">Educação Superior Completa</option>
          </select>
        </div>

        {escolaridadeNivel === 'Ensino Médio' && (
          <div>
            <Label>Tipo de Ensino Médio Cursado</Label>
            <select
              value={ensinoMedioTipo}
              onChange={(e) => setEnsinoMedioTipo(e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-[#181818] border border-borderCustom text-white text-sm outline-none mt-1"
            >
              <option value="Formação Geral">Formação Geral</option>
              <option value="Modalidade Normal/Magistérios">Modalidade Normal / Magistério</option>
              <option value="Curso Técnico">Curso Técnico</option>
              <option value="Magistério Indígena - modalidade Normal">Magistério Indígena - modalidade Normal</option>
            </select>
          </div>
        )}
      </div>

      {escolaridadeNivel === 'Educação Superior' && (
        <div className="bg-[#18181a] p-4 rounded-xl border border-zinc-800 space-y-4">
          <h4 className="text-xs font-bold text-highlight uppercase tracking-wider">Dados do Curso Superior</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs">Área do Curso</Label>
              <Input
                value={superiorArea}
                onChange={(e) => setSuperiorArea(e.target.value)}
                placeholder="Ex: Pedagogia, Matemática"
                className="bg-[#121212] border-borderCustom text-white mt-1 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Código do Curso Superior</Label>
              <Input
                value={superiorCodigo}
                onChange={(e) => setSuperiorCodigo(e.target.value)}
                placeholder="Código do curso"
                className="bg-[#121212] border-borderCustom text-white mt-1 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Ano de Conclusão</Label>
              <Input
                value={superiorAno}
                onChange={(e) => setSuperiorAno(e.target.value)}
                placeholder="Ex: 2018"
                className="bg-[#121212] border-borderCustom text-white mt-1 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs">Tipo de Instituição</Label>
              <select
                value={superiorTipoInst}
                onChange={(e) => setSuperiorTipoInst(e.target.value)}
                className="w-full h-10 px-3 rounded-md bg-[#121212] border border-borderCustom text-white text-xs outline-none mt-1"
              >
                <option value="Pública">Pública</option>
                <option value="Privada">Privada</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Nível / Grau Acadêmico</Label>
              <select
                value={superiorGrau}
                onChange={(e) => setSuperiorGrau(e.target.value)}
                className="w-full h-10 px-3 rounded-md bg-[#121212] border border-borderCustom text-white text-xs outline-none mt-1"
              >
                <option value="Licenciatura">Licenciatura</option>
                <option value="Bacharelado">Bacharelado</option>
                <option value="Sequencial">Sequencial</option>
                <option value="Tecnológico">Tecnológico</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Instituição de Formação</Label>
              <Input
                value={superiorInstituicao}
                onChange={(e) => setSuperiorInstituicao(e.target.value)}
                placeholder="Nome da faculdade"
                className="bg-[#121212] border-borderCustom text-white mt-1 text-xs"
              />
            </div>
          </div>
        </div>
      )}

      <div>
        <Label>Formação / Complementação Pedagógica</Label>
        <Input
          value={complementacaoPedagogica}
          onChange={(e) => setComplementacaoPedagogica(e.target.value)}
          placeholder="Área de conhecimento/componentes curriculares"
          className="bg-[#181818] border-borderCustom text-white mt-1"
        />
      </div>

      {/* Pós-Graduações */}
      <div className="space-y-3 bg-[#18181a] p-4 rounded-xl border border-zinc-800">
        <div className="flex justify-between items-center">
          <h4 className="text-xs font-bold text-highlight uppercase tracking-wider">Pós-Graduações Concluídas (Até 6)</h4>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addPos}
            className="text-xs h-7 border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar
          </Button>
        </div>

        {posGraduacoes.length === 0 ? (
          <p className="text-xs text-zinc-500 text-center py-2">Nenhuma pós-graduação inserida.</p>
        ) : (
          <div className="space-y-3">
            {posGraduacoes.map((item, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-[#121212] p-2.5 rounded border border-zinc-800 relative">
                <div>
                  <Label className="text-[10px] text-zinc-500">Tipo</Label>
                  <select
                    value={item.tipo}
                    onChange={(e) => updatePos(idx, 'tipo', e.target.value)}
                    className="w-full h-8 px-2 rounded bg-[#181818] border border-borderCustom text-white text-xs outline-none mt-1"
                  >
                    <option value="Especialização">Especialização</option>
                    <option value="Mestrado">Mestrado</option>
                    <option value="Doutorado">Doutorado</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <Label className="text-[10px] text-zinc-500 font-semibold">Área do Curso</Label>
                  <Input
                    value={item.area}
                    onChange={(e) => updatePos(idx, 'area', e.target.value)}
                    placeholder="Ex: Gestão Escolar, Psicopedagogia"
                    className="bg-[#181818] border-borderCustom text-white h-8 text-xs mt-1"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label className="text-[10px] text-zinc-500">Conclusão</Label>
                    <Input
                      value={item.ano}
                      onChange={(e) => updatePos(idx, 'ano', e.target.value)}
                      placeholder="Ano"
                      className="bg-[#181818] border-borderCustom text-white h-8 text-xs mt-1"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => removePos(idx)}
                    className="h-8 w-8 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 p-0 border border-transparent hover:border-rose-500/20 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Outros cursos */}
      <div className="space-y-3">
        <Label className="font-bold text-xs text-highlight">Outros Cursos Específicos / Formação Continuada (mín. 80h)</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs bg-[#18181a] p-4 rounded-xl border border-zinc-800/80">
          {cursosDisponiveis.map((curso) => (
            <div key={curso} className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`curso_${curso}`}
                checked={outrosCursos.includes(curso)}
                onChange={() => toggleOutroCurso(curso)}
                className="w-4 h-4 accent-highlight cursor-pointer"
              />
              <label htmlFor={`curso_${curso}`} className="cursor-pointer select-none text-zinc-300">{curso}</label>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
