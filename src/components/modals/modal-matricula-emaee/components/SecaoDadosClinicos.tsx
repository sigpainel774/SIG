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
    deficiencias, toggleDeficiencia,
    condicoesSaude, toggleCondicao, setCidCondicao
  } = useMatriculaEmaeeContext()

  const condicoesList = [
    { key: 'em_investigacao', label: 'Em Investigação Diagnóstica / Aguardando Laudo', placeholder: 'Suspeita / Especialidade médica (ex: Neuro, TEA)', isDestaque: true },
    { key: 'transtorno_tea', label: 'Transtorno do Espectro Autista (TEA)', placeholder: 'Especifique o CID (Ex.: F84.0)' },
    { key: 'tdah', label: 'Transtorno do Déficit de Atenção com Hiperatividade (TDAH)', placeholder: 'Especifique o CID (Ex.: F90.0)' },
    { key: 'deficiencia_intelectual', label: 'Deficiência Intelectual (DI)', placeholder: 'Especifique o CID (Ex.: F70-F72)' },
    { key: 'epilepsia', label: 'Epilepsia / Distúrbios Convulsivos', placeholder: 'Especifique o CID (Ex.: G40)' },
    { key: 'transtorno_linguagem', label: 'Transtornos da Fala e Linguagem (TDL / Fala)', placeholder: 'Especifique o CID (Ex.: F80)' },
    { key: 'sindrome_down', label: 'Síndrome de Down (T21)', placeholder: 'Especifique o CID (Ex.: Q90)' },
    { key: 'paralisia_cerebral', label: 'Paralisia Cerebral (PC)', placeholder: 'Especifique o CID (Ex.: G80)' },
    { key: 'dislexia', label: 'Dislexia', placeholder: 'Especifique o CID (Ex.: F81.0)' },
    { key: 'disgrafia_disortografia', label: 'Disgrafia / Disortografia', placeholder: 'Especifique o CID (Ex.: F81.1)' },
    { key: 'discalculia', label: 'Discalculia', placeholder: 'Especifique o CID (Ex.: F81.2)' },
    { key: 'tpac', label: 'Transtorno do Processamento Auditivo Central (TPAC)', placeholder: 'Especifique o CID (Ex.: H93.25)' },
    { key: 'tod', label: 'Transtorno Opositor Desafiador (TOD)', placeholder: 'Especifique o CID (Ex.: F91.3)' },
    { key: 'transtorno_conduta', label: 'Transtorno de Conduta', placeholder: 'Especifique o CID (Ex.: F91)' },
    { key: 'ansiedade', label: 'Transtornos de Ansiedade', placeholder: 'Especifique o CID (Ex.: F41)' },
    { key: 'superdotacao', label: 'Superdotação / Altas Habilidades', placeholder: 'Especifique o CID (Ex.: Z55)' },
  ] as const

  return (
    <section className="overflow-hidden border border-border rounded-2xl bg-card shadow-sm dark:bg-gradient-to-b dark:from-[#1a202c]/95 dark:to-[#121621]/95 dark:shadow-xl">
      <div className="flex items-start gap-3 p-4 md:p-5 border-b border-border bg-muted/40 dark:bg-white/[0.012]">
        <span className="grid place-items-center w-9 h-9 flex-shrink-0 rounded-xl bg-primary/10 font-extrabold text-sm text-primary">
          03
        </span>
        <div>
          <h2 className="text-base font-bold text-foreground">Dados clínicos e deficiências</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Marque todas as condições de deficiência e neurodesenvolvimento informadas nos laudos/documentos do aluno.</p>
        </div>
      </div>

      <div className="p-4 md:p-5 space-y-4">
        {/* Tipo de Deficiência */}
        <fieldset className="p-3.5 border border-border rounded-xl bg-muted/50 dark:bg-[#0b0e14]/40">
          <legend className="px-1 text-xs font-bold text-foreground">Tipo de deficiência</legend>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mt-2">
            {[
              { key: 'def_baixa_visao', label: 'Baixa visão' },
              { key: 'def_cegueira', label: 'Cegueira' },
              { key: 'def_auditiva', label: 'Deficiência auditiva' },
              { key: 'def_fisica', label: 'Deficiência física' },
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
                      ? 'border-primary/60 bg-primary/10 text-foreground font-semibold'
                      : 'border-border bg-input text-foreground/80 hover:border-primary/40'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleDeficiencia(item.key as keyof typeof deficiencias)}
                    className="w-4 h-4 rounded accent-primary"
                  />
                  {item.label}
                </label>
              )
            })}
          </div>
        </fieldset>

        {/* Outras Condições de Saúde e Neurodesenvolvimento */}
        <fieldset className="p-3.5 border border-border rounded-xl bg-muted/50 dark:bg-[#0b0e14]/40">
          <legend className="px-1 text-xs font-bold text-foreground">Outras Condições de Saúde e Neurodesenvolvimento</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 mt-2">
            {condicoesList.map((item) => {
              const cond = (condicoesSaude as any)[item.key]
              const isChecked = Boolean(cond?.selecionado)
              const isDestaque = (item as any).isDestaque
              return (
                <div
                  key={item.key}
                  className={`flex flex-col justify-between p-3 rounded-xl border transition-all ${
                    isChecked
                      ? isDestaque
                        ? 'border-amber-500/70 bg-amber-500/10 text-foreground shadow-sm dark:bg-amber-500/15'
                        : 'border-primary/60 bg-primary/10 text-foreground'
                      : isDestaque
                        ? 'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50 text-foreground/90'
                        : 'border-border bg-input text-foreground/80 hover:border-primary/40'
                  }`}
                >
                  <label className="flex items-start gap-2 text-xs font-medium cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleCondicao(item.key as any)}
                      className={`w-4 h-4 mt-0.5 rounded shrink-0 ${isDestaque ? 'accent-amber-600' : 'accent-primary'}`}
                    />
                    <span className={isChecked ? 'font-semibold text-foreground' : 'text-foreground/90'}>
                      {item.label}
                    </span>
                  </label>

                  {isChecked && (
                    <div className={`mt-2.5 pt-2 border-t ${isDestaque ? 'border-amber-500/25' : 'border-primary/20'}`} onClick={(e) => e.stopPropagation()}>
                      <Input
                        type="text"
                        placeholder={item.placeholder || 'Especifique o CID'}
                        value={cond?.cid ?? ''}
                        onChange={(e) => setCidCondicao(item.key as any, e.target.value)}
                        className="h-7 text-xs bg-background/80 border-border text-foreground placeholder:text-muted-foreground/60 rounded-lg px-2 shadow-inner"
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </fieldset>

        <div className="grid grid-cols-12 gap-3.5">
          <div className="col-span-12 md:col-span-8">
            <Label className="block mb-1 text-xs font-bold text-foreground">Outras condições</Label>
            <Input
              placeholder="Especifique, se houver"
              value={outrosTranstornos}
              onChange={(e) => setOutrosTranstornos(e.target.value)}
              className="bg-input border-border text-foreground text-sm rounded-xl"
            />
          </div>

          <div className="col-span-12 md:col-span-4">
            <Label className="block mb-1 text-xs font-bold text-foreground">CID Geral / Principal</Label>
            <Input
              placeholder="Ex.: F84.0"
              value={cidCodigo}
              onChange={(e) => setCidCodigo(e.target.value)}
              className="bg-input border-border text-foreground text-sm rounded-xl"
            />
          </div>

          <div className="col-span-12">
            <Label className="block mb-1 text-xs font-bold text-foreground">
              Observações sobre o aluno para requerer o atendimento
            </Label>
            <Textarea
              placeholder="Registre informações relevantes sobre a solicitação de atendimento AEE, queixas principais ou encaminhamentos..."
              rows={3}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="bg-input border-border text-foreground text-sm rounded-xl resize-y min-h-[90px]"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
