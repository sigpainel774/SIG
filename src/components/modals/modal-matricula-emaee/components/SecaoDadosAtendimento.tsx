'use client'

import React from 'react'
import { useMatriculaEmaeeContext } from '../context/MatriculaEmaeeContext'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

export function SecaoDadosAtendimento() {
  const {
    escolaAtendimentoId, setEscolaAtendimentoId,
    localizacaoAtendimento, setLocalizacaoAtendimento,
    dataMatricula, setDataMatricula,
    unidadesEmaee
  } = useMatriculaEmaeeContext()

  return (
    <section className="overflow-hidden border border-border rounded-2xl bg-card shadow-sm dark:bg-gradient-to-b dark:from-[#1a202c]/95 dark:to-[#121621]/95 dark:shadow-xl">
      <div className="flex items-start gap-3 p-4 md:p-5 border-b border-border bg-muted/40 dark:bg-white/[0.012]">
        <span className="grid place-items-center w-9 h-9 flex-shrink-0 rounded-xl bg-primary/10 font-extrabold text-sm text-primary">
          01
        </span>
        <div>
          <h2 className="text-base font-bold text-foreground">Dados do atendimento</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Identifique a unidade EMAEE, a localização e a data desta matrícula.</p>
        </div>
      </div>

      <div className="p-4 md:p-5 grid grid-cols-12 gap-4">
        {/* Unidade Escolar de Atendimento */}
        <div className="col-span-12 md:col-span-7">
          <Label className="block mb-1.5 text-xs font-bold text-foreground">
            Unidade escolar de atendimento <span className="text-rose-500">*</span>
          </Label>
          <select
            className="w-full min-h-[42px] px-3 py-2 border border-border rounded-xl outline-none bg-input text-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
            value={escolaAtendimentoId}
            onChange={(e) => setEscolaAtendimentoId(e.target.value)}
            required
          >
            <option value="">Selecione a unidade EMAEE</option>
            {unidadesEmaee.map((esc) => (
              <option key={esc.id} value={esc.id}>
                {esc.nome}
              </option>
            ))}
          </select>
        </div>

        {/* Localização */}
        <div className="col-span-12 md:col-span-3">
          <fieldset className="p-3 border border-border rounded-xl bg-muted/50 dark:bg-[#0b0e14]/40 h-full flex flex-col justify-center">
            <legend className="px-1 text-xs font-bold text-foreground">
              Localização <span className="text-rose-500">*</span>
            </legend>
            <div className="flex flex-wrap gap-2.5 mt-1">
              <label className={`flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                localizacaoAtendimento === 'Urbana'
                  ? 'border-primary/60 bg-primary/10 text-foreground font-semibold'
                  : 'border-border bg-input text-foreground/80 hover:border-primary/40'
              }`}>
                <input
                  type="radio"
                  name="localizacao_atendimento"
                  value="Urbana"
                  checked={localizacaoAtendimento === 'Urbana'}
                  onChange={() => setLocalizacaoAtendimento('Urbana')}
                  className="accent-[#3ea6ff]"
                />
                Urbana
              </label>

              <label className={`flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                localizacaoAtendimento === 'Rural'
                  ? 'border-primary/60 bg-primary/10 text-foreground font-semibold'
                  : 'border-border bg-input text-foreground/80 hover:border-primary/40'
              }`}>
                <input
                  type="radio"
                  name="localizacao_atendimento"
                  value="Rural"
                  checked={localizacaoAtendimento === 'Rural'}
                  onChange={() => setLocalizacaoAtendimento('Rural')}
                  className="accent-[#3ea6ff]"
                />
                Rural
              </label>
            </div>
          </fieldset>
        </div>

        {/* Data da Matrícula */}
        <div className="col-span-12 md:col-span-2">
          <Label className="block mb-1.5 text-xs font-bold text-foreground">
            Data da matrícula <span className="text-rose-500">*</span>
          </Label>
          <Input
            type="date"
            className="bg-input border-border text-foreground text-sm rounded-xl"
            value={dataMatricula}
            onChange={(e) => setDataMatricula(e.target.value)}
            required
          />
        </div>
      </div>
    </section>
  )
}
