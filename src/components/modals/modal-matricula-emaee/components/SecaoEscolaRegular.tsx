'use client'

import React from 'react'
import { useMatriculaEmaeeContext } from '../context/MatriculaEmaeeContext'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

export function SecaoEscolaRegular() {
  const {
    escolaRegularId, setEscolaRegularId,
    escolas,
    anoEscolarizacao, setAnoEscolarizacao,
    turnoRegular, setTurnoRegular,
    turmaRegular, setTurmaRegular,
    professorRegular, setProfessorRegular,
    gestorRegular, setGestorRegular
  } = useMatriculaEmaeeContext()

  return (
    <section className="overflow-hidden border border-[#26262a] rounded-2xl bg-gradient-to-b from-[#1a202c]/95 to-[#121621]/95 shadow-xl">
      <div className="flex items-start gap-3 p-4 md:p-5 border-b border-[#26262a] bg-white/[0.012]">
        <span className="grid place-items-center w-9 h-9 flex-shrink-0 rounded-xl color-[#3ea6ff] bg-[#3ea6ff]/10 font-extrabold text-sm text-[#3ea6ff]">
          03
        </span>
        <div>
          <h2 className="text-base font-bold text-foreground">Unidade escolar da escolarização regular</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Informe onde o aluno está matriculado no ensino regular da rede municipal.</p>
        </div>
      </div>

      <div className="p-4 md:p-5 grid grid-cols-12 gap-4">
        {/* Escola Municipal de Origem */}
        <div className="col-span-12">
          <Label className="block mb-1.5 text-xs font-bold text-slate-200">
            Escola municipal de origem
          </Label>
          <select
            className="w-full min-h-[42px] px-3 py-2 border border-[#26262a] rounded-xl outline-none bg-[#121621] text-foreground text-sm focus:border-[#3ea6ff] focus:ring-1 focus:ring-[#3ea6ff]/20 transition-all"
            value={escolaRegularId}
            onChange={(e) => setEscolaRegularId(e.target.value)}
          >
            <option value="">Selecione a escola de origem</option>
            {escolas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}
              </option>
            ))}
          </select>
        </div>

        {/* Ano de escolarização */}
        <div className="col-span-12 md:col-span-4">
          <Label className="block mb-1.5 text-xs font-bold text-slate-200">Ano de escolarização</Label>
          <Input
            placeholder="Ex.: 5º ano"
            value={anoEscolarizacao}
            onChange={(e) => setAnoEscolarizacao(e.target.value)}
            className="bg-[#121621] border-[#26262a] text-foreground text-sm rounded-xl"
          />
        </div>

        {/* Turno */}
        <div className="col-span-12 md:col-span-4">
          <Label className="block mb-1.5 text-xs font-bold text-slate-200">Turno</Label>
          <select
            value={turnoRegular}
            onChange={(e) => setTurnoRegular(e.target.value)}
            className="w-full min-h-[40px] px-3 py-2 border border-[#26262a] rounded-xl outline-none bg-[#121621] text-foreground text-sm focus:border-[#3ea6ff]"
          >
            <option value="">Selecione o turno</option>
            <option value="Matutino">Matutino</option>
            <option value="Vespertino">Vespertino</option>
            <option value="Integral">Integral</option>
          </select>
        </div>

        {/* Turma */}
        <div className="col-span-12 md:col-span-4">
          <Label className="block mb-1.5 text-xs font-bold text-slate-200">Turma</Label>
          <Input
            placeholder="Ex.: A"
            value={turmaRegular}
            onChange={(e) => setTurmaRegular(e.target.value)}
            className="bg-[#121621] border-[#26262a] text-foreground text-sm rounded-xl"
          />
        </div>

        {/* Professor */}
        <div className="col-span-12 md:col-span-6">
          <Label className="block mb-1.5 text-xs font-bold text-slate-200">Professor regente</Label>
          <Input
            placeholder="Nome do professor regente"
            value={professorRegular}
            onChange={(e) => setProfessorRegular(e.target.value)}
            className="bg-[#121621] border-[#26262a] text-foreground text-sm rounded-xl"
          />
        </div>

        {/* Gestor */}
        <div className="col-span-12 md:col-span-6">
          <Label className="block mb-1.5 text-xs font-bold text-slate-200">Gestor da escola regular</Label>
          <Input
            placeholder="Nome do gestor escolar"
            value={gestorRegular}
            onChange={(e) => setGestorRegular(e.target.value)}
            className="bg-[#121621] border-[#26262a] text-foreground text-sm rounded-xl"
          />
        </div>
      </div>
    </section>
  )
}
