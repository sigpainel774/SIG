'use client'

import React from 'react'
import { useMatriculaEmaeeContext } from '../context/MatriculaEmaeeContext'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { FileText, ShieldCheck } from 'lucide-react'

export function SecaoAssinaturasComprovante() {
  const {
    alunoSelecionado,
    nomeCompleto,
    escolaAtendimentoId,
    unidadesEmaee,
    turnoAtendimento,
    dataMatricula
  } = useMatriculaEmaeeContext()

  const nomeUnidadeSelecionada = unidadesEmaee.find(u => u.id === escolaAtendimentoId)?.nome || 'EMAEE — Unidade Sede'
  const nomeAlunoExibicao = nomeCompleto || alunoSelecionado?.nome || 'Aguardando seleção do aluno'

  return (
    <section className="overflow-hidden border border-[#26262a] rounded-2xl bg-gradient-to-b from-[#1a202c]/95 to-[#121621]/95 shadow-xl">
      <div className="flex items-start gap-3 p-4 md:p-5 border-b border-[#26262a] bg-white/[0.012]">
        <span className="grid place-items-center w-9 h-9 flex-shrink-0 rounded-xl color-[#3ea6ff] bg-[#3ea6ff]/10 font-extrabold text-sm text-[#3ea6ff]">
          05
        </span>
        <div>
          <h2 className="text-base font-bold text-foreground">Responsáveis e comprovante</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Assinaturas da matrícula e comprovante destacável para entrega ao responsável.</p>
        </div>
      </div>

      <div className="p-4 md:p-5 space-y-6">
        {/* Quadro de Assinaturas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border border-dashed border-white/20 rounded-xl bg-[#0b0e14]/40">
            <strong className="block text-xs font-bold text-foreground mb-1">Responsável pela matrícula</strong>
            <p className="text-[11px] text-muted-foreground mb-3">Assinatura do servidor/coordenador responsável do EMAEE.</p>
            <div className="h-14 border-b border-white/30 flex items-end justify-center pb-1 text-xs text-slate-400">
              Assinatura do servidor
            </div>
          </div>

          <div className="p-4 border border-dashed border-white/20 rounded-xl bg-[#0b0e14]/40">
            <strong className="block text-xs font-bold text-foreground mb-1">Responsável pelo aluno</strong>
            <p className="text-[11px] text-muted-foreground mb-3">Assinatura do pai, mãe ou responsável legal.</p>
            <div className="h-14 border-b border-white/30 flex items-end justify-center pb-1 text-xs text-slate-400">
              Assinatura do responsável legal
            </div>
          </div>
        </div>

        {/* Bloco de Comprovante de Matrícula */}
        <div className="p-4 md:p-5 border border-dashed border-[#3ea6ff]/40 rounded-xl bg-[#3ea6ff]/[0.045] space-y-4">
          <div className="flex items-center justify-center gap-2 text-center text-sm font-bold text-[#3ea6ff]">
            <FileText className="w-4 h-4" />
            <h3>Comprovante de matrícula AEE</h3>
          </div>

          <div className="grid grid-cols-12 gap-3.5">
            <div className="col-span-12">
              <Label className="block mb-1 text-xs font-bold text-slate-200">Unidade escolar de atendimento</Label>
              <Input
                readOnly
                value={nomeUnidadeSelecionada}
                className="bg-[#121621] border-[#26262a] text-foreground text-xs rounded-xl"
              />
            </div>

            <div className="col-span-12 md:col-span-8">
              <Label className="block mb-1 text-xs font-bold text-slate-200">Nome completo do aluno</Label>
              <Input
                readOnly
                value={nomeAlunoExibicao}
                className="bg-[#121621] border-[#26262a] text-foreground text-xs rounded-xl"
              />
            </div>

            <div className="col-span-6 md:col-span-2">
              <Label className="block mb-1 text-xs font-bold text-slate-200">Turno</Label>
              <Input
                readOnly
                value={turnoAtendimento}
                className="bg-[#121621] border-[#26262a] text-foreground text-xs rounded-xl text-center"
              />
            </div>

            <div className="col-span-6 md:col-span-2">
              <Label className="block mb-1 text-xs font-bold text-slate-200">Data</Label>
              <Input
                readOnly
                value={dataMatricula}
                className="bg-[#121621] border-[#26262a] text-foreground text-xs rounded-xl text-center"
              />
            </div>

            <div className="col-span-12 p-3 border border-dashed border-white/20 rounded-xl bg-[#0b0e14]/40 mt-2">
              <strong className="block text-xs font-bold text-foreground mb-1">Responsável pela matrícula</strong>
              <div className="h-10 border-b border-white/30 flex items-end justify-center pb-1 text-xs text-slate-400">
                Assinatura de validação
              </div>
            </div>
          </div>
        </div>

        {/* Nota LGPD */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground p-3 border border-[#26262a] rounded-xl bg-[#121621]/60">
          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>Dados pessoais e clínicos: aplicar permissões RLS e tratamento compatível com a LGPD.</span>
        </div>
      </div>
    </section>
  )
}
