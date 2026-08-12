'use client'

import React from 'react'
import { useMatriculaEmaeeContext } from '../context/MatriculaEmaeeContext'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export function SecaoDadosClinicos() {
  const {
    cidCodigo, setCidCodigo,
    outrosTranstornos, setOutrosTranstornos,
    observacoes, setObservacoes,
    deficiencias, toggleDeficiencia
  } = useMatriculaEmaeeContext()

  return (
    <section className="overflow-hidden border border-border rounded-2xl bg-gradient-to-b from-[#1a202c]/95 to-[#121621]/95 shadow-xl">
      <div className="flex items-start gap-3 p-4 md:p-5 border-b border-border bg-white/[0.012]">
        <span className="grid place-items-center w-9 h-9 flex-shrink-0 rounded-xl color-[#3ea6ff] bg-[#3ea6ff]/10 font-extrabold text-sm text-[#3ea6ff]">
          04
        </span>
        <div>
          <h2 className="text-base font-bold text-foreground">Dados clínicos e deficiências</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Marque todas as condições de deficiência e transtornos informados nos laudos/documentos do aluno.</p>
        </div>
      </div>

      <div className="p-4 md:p-5 space-y-4">
        {/* Tipo de Deficiência */}
        <fieldset className="p-3.5 border border-border rounded-xl bg-[#0b0e14]/40">
          <legend className="px-1 text-xs font-bold text-slate-200">Tipo de deficiência</legend>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mt-2">
            {[
              { key: 'def_baixa_visao', label: 'Baixa visão' },
              { key: 'def_cegueira', label: 'Cegueira' },
              { key: 'def_auditiva', label: 'Deficiência auditiva' },
              { key: 'def_fisica', label: 'Deficiência física' },
              { key: 'def_intelectual', label: 'Deficiência intelectual' },
              { key: 'def_surdez', label: 'Surdez' },
              { key: 'def_surdocegueira', label: 'Surdocegueira' },
              { key: 'def_multipla', label: 'Deficiência múltipla' }
            ].map((item) => {
              const isChecked = deficiencias[item.key as keyof typeof deficiencias]
              return (
                <label
                  key={item.key}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                    isChecked
                      ? 'border-[#3ea6ff]/60 bg-[#3ea6ff]/15 text-foreground font-semibold'
                      : 'border-border bg-[#121621] text-slate-300 hover:border-[#3ea6ff]/40'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleDeficiencia(item.key as keyof typeof deficiencias)}
                    className="w-4 h-4 rounded accent-[#3ea6ff]"
                  />
                  {item.label}
                </label>
              )
            })}
          </div>
        </fieldset>

        {/* Transtornos */}
        <fieldset className="p-3.5 border border-border rounded-xl bg-[#0b0e14]/40">
          <legend className="px-1 text-xs font-bold text-slate-200">Transtornos</legend>
          <div className="flex flex-wrap gap-2.5 mt-2">
            <label className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
              deficiencias.transtorno_tea
                ? 'border-[#3ea6ff]/60 bg-[#3ea6ff]/15 text-foreground font-semibold'
                : 'border-border bg-[#121621] text-slate-300 hover:border-[#3ea6ff]/40'
            }`}>
              <input
                type="checkbox"
                checked={deficiencias.transtorno_tea}
                onChange={() => toggleDeficiencia('transtorno_tea')}
                className="w-4 h-4 rounded accent-[#3ea6ff]"
              />
              Transtorno do Espectro Autista (TEA)
            </label>
          </div>
        </fieldset>

        <div className="grid grid-cols-12 gap-3.5">
          <div className="col-span-12 md:col-span-8">
            <Label className="block mb-1 text-xs font-bold text-slate-200">Outros transtornos</Label>
            <Input
              placeholder="Especifique, se houver"
              value={outrosTranstornos}
              onChange={(e) => setOutrosTranstornos(e.target.value)}
              className="bg-[#121621] border-border text-foreground text-sm rounded-xl"
            />
          </div>

          <div className="col-span-12 md:col-span-4">
            <Label className="block mb-1 text-xs font-bold text-slate-200">CID (Classificação Internacional de Doenças)</Label>
            <Input
              placeholder="Ex.: F84.0"
              value={cidCodigo}
              onChange={(e) => setCidCodigo(e.target.value)}
              className="bg-[#121621] border-border text-foreground text-sm rounded-xl"
            />
          </div>

          <div className="col-span-12">
            <Label className="block mb-1 text-xs font-bold text-slate-200">
              Observações sobre o aluno para requerer o atendimento
            </Label>
            <Textarea
              placeholder="Registre informações relevantes sobre a solicitação de atendimento AEE, queixas principais ou encaminhamentos..."
              rows={3}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="bg-[#121621] border-border text-foreground text-sm rounded-xl resize-y min-h-[90px]"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
