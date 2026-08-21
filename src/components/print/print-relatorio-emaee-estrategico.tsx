'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Printer, Heart, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PrintHeader } from '@/components/print/print-header'

const sessionTimestamp = Date.now()

export interface RelatorioEmaeePrintPayload {
  meta: {
    gerado_em: string
    ano_letivo: number
    escopo: string
    is_nivel_1: boolean
  }
  kpis: {
    total_ativos: number
    total_fila: number
    total_altas: number
    total_geral: number
    tempo_medio_fila_dias: number
    taxa_resolutividade: number
  }
  epidemiologia: {
    total_base: number
    tea: number
    tdah: number
    def_intelectual: number
    dislexia: number
    disgrafia: number
    tod: number
    ansiedade: number
    superdotacao: number
    def_visual: number
    def_auditiva: number
    def_fisica: number
    def_multipla: number
    outros: number
  }
  especialidades: Array<{
    especialidade: string
    total_atendimentos: number
    total_profissionais: number
    pacientes_atendidos: number
  }>
  origem_escolas: Array<{
    escola_nome: string
    total_encaminhados: number
    em_atendimento: number
    na_fila: number
  }>
  intersetorialidade: {
    total_solicitacoes: number
    pendentes: number
    respondidos: number
    tempo_medio_resposta_dias: number
  }
  logistica: {
    zona_urbana: number
    zona_rural: number
    turno_matutino: number
    turno_vespertino: number
  }
}

interface PrintRelatorioEmaeeProps {
  data: RelatorioEmaeePrintPayload
  onClose: () => void
}

export function PrintRelatorioEmaeeEstrategico({ data, onClose }: PrintRelatorioEmaeeProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Registrar ação de impressão silenciosamente no backend
    fetch('/api/relatorios/emaee-estrategico/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        acao: 'impressao',
        relatorio: 'emaee_estrategico',
        escopo: data.meta.escopo,
      }),
    }).catch((err) => console.warn('Erro ao registrar log de impressão:', err))

    return () => setMounted(false)
  }, [data.meta.escopo])

  const handlePrint = () => {
    window.dispatchEvent(new Event('beforeprint'))
    setTimeout(() => {
      window.print()
    }, 200)
  }

  if (!mounted) return null

  const epiList = [
    { label: 'TEA (Transtorno do Espectro Autista)', count: data.epidemiologia.tea },
    { label: 'TDAH (Déficit de Atenção e Hiperatividade)', count: data.epidemiologia.tdah },
    { label: 'Deficiência Intelectual (DI)', count: data.epidemiologia.def_intelectual },
    { label: 'Dislexia', count: data.epidemiologia.dislexia },
    { label: 'Disgrafia / Disortografia', count: data.epidemiologia.disgrafia },
    { label: 'TOD (Transtorno Opositivo Desafiador)', count: data.epidemiologia.tod },
    { label: 'Transtorno de Ansiedade', count: data.epidemiologia.ansiedade },
    { label: 'Altas Habilidades / Superdotação', count: data.epidemiologia.superdotacao },
    { label: 'Deficiência Visual (Baixa Visão / Cegueira)', count: data.epidemiologia.def_visual },
    { label: 'Deficiência Auditiva / Surdez', count: data.epidemiologia.def_auditiva },
    { label: 'Deficiência Física / Motora', count: data.epidemiologia.def_fisica },
    { label: 'Deficiência Múltipla', count: data.epidemiologia.def_multipla },
    { label: 'Outros Transtornos / Em Investigação', count: data.epidemiologia.outros },
  ].filter((item) => item.count > 0)

  const totalBase = data.epidemiologia.total_base || 1

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-[#09090b]/95 flex items-center justify-center p-4 overflow-y-auto print:static print:block print:p-0 print:bg-white print:overflow-visible print-portal-container">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 12mm 12mm 12mm;
          }
          body > *:not(.print-portal-container) {
            display: none !important;
          }
          .no-print {
            display: none !important;
          }
          .print-break-inside-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .print-clean-text {
            color: #000 !important;
            background: transparent !important;
            box-shadow: none !important;
            border-color: #cbd5e1 !important;
          }
        }
      `}</style>

      {/* Floating Toolbar */}
      <div className="fixed top-5 right-5 z-50 flex items-center gap-2 no-print bg-[#18181b] border border-border shadow-2xl rounded-2xl p-2 px-3">
        <Button
          onClick={handlePrint}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 py-2 text-sm rounded-xl gap-2 shadow cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          Imprimir Relatório (A4)
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground hover:bg-hoverCustom rounded-xl"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Document A4 Container */}
      <div className="w-full max-w-[210mm] min-h-[297mm] bg-white text-slate-900 shadow-2xl my-8 p-[14mm] print:m-0 print:p-0 print:shadow-none print:w-full font-sans text-xs flex flex-col justify-between rounded-lg print:rounded-none">
        <div>
          {/* Header Oficial */}
          <PrintHeader
            docTitulo="RELATÓRIO EXECUTIVO E ESTRATÉGICO DO EMAEE"
            docSubtitulo="Atendimento Educacional Especializado & Censo Epidemiológico Inclusivo"
          />

          {/* Tarja de Identificação e Escopo */}
          <div className="mt-3 bg-slate-100 border border-slate-300 rounded-lg p-2.5 flex justify-between items-center text-[11px] print-break-inside-avoid">
            <div>
              <span className="font-bold text-slate-700">Abrangência / Escopo:</span>{' '}
              <strong className="text-slate-900">{data.meta.escopo}</strong>
            </div>
            <div className="flex gap-4">
              <div>
                <span className="font-bold text-slate-700">Ano de Referência:</span>{' '}
                <span className="text-slate-900 font-semibold">{data.meta.ano_letivo}</span>
              </div>
              <div>
                <span className="font-bold text-slate-700">Emissão:</span>{' '}
                <span className="text-slate-900">
                  {new Date(data.meta.gerado_em).toLocaleDateString('pt-BR')} às{' '}
                  {new Date(data.meta.gerado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>

          {/* Aviso Legal de Proteção de Dados LGPD */}
          <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-2 text-[10px] text-amber-900 flex items-center gap-2 print-break-inside-avoid">
            <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>Documento de Inteligência e Gestão Pública (LGPD Art. 11 e 14)</strong>: Os dados contidos neste relatório são estritamente agregados e anonimizados para fins de planejamento educacional, distribuição de recursos FUNDEB e formação pedagógica contínua.
            </span>
          </div>

          {/* 1. Grade de Indicadores Principais (KPIs) */}
          <div className="mt-4 print-break-inside-avoid">
            <h3 className="font-bold text-slate-800 text-[12px] uppercase tracking-wider border-b border-slate-300 pb-1 mb-2">
              1. Panorama Geral de Atendimento & Fila
            </h3>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="border border-slate-300 rounded-lg p-2 bg-slate-50">
                <div className="text-[10px] uppercase font-bold text-slate-600">Atendimentos Ativos</div>
                <div className="text-lg font-extrabold text-blue-700 mt-0.5">{data.kpis.total_ativos}</div>
                <div className="text-[9px] text-slate-500">Acolhimento clínico contínuo</div>
              </div>
              <div className="border border-slate-300 rounded-lg p-2 bg-slate-50">
                <div className="text-[10px] uppercase font-bold text-slate-600">Fila de Espera</div>
                <div className="text-lg font-extrabold text-amber-700 mt-0.5">{data.kpis.total_fila}</div>
                <div className="text-[9px] text-slate-500">Tempo médio: {data.kpis.tempo_medio_fila_dias} dias</div>
              </div>
              <div className="border border-slate-300 rounded-lg p-2 bg-slate-50">
                <div className="text-[10px] uppercase font-bold text-slate-600">Altas / Concluídos</div>
                <div className="text-lg font-extrabold text-emerald-700 mt-0.5">{data.kpis.total_altas}</div>
                <div className="text-[9px] text-slate-500">Taxa de resolutividade: {data.kpis.taxa_resolutividade}%</div>
              </div>
              <div className="border border-slate-300 rounded-lg p-2 bg-slate-50">
                <div className="text-[10px] uppercase font-bold text-slate-600">Total Histórico</div>
                <div className="text-lg font-extrabold text-slate-800 mt-0.5">{data.kpis.total_geral}</div>
                <div className="text-[9px] text-slate-500">Prontuários registrados</div>
              </div>
            </div>
          </div>

          {/* 2. Perfil Epidemiológico & Condições de Saúde */}
          <div className="mt-4 print-break-inside-avoid">
            <h3 className="font-bold text-slate-800 text-[12px] uppercase tracking-wider border-b border-slate-300 pb-1 mb-2">
              2. Perfil Epidemiológico e Neurodesenvolvimento (Censo AEE)
            </h3>
            <table className="w-full border border-slate-300 text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 text-[10px]">
                  <th className="p-1.5 border-r border-slate-300">Condição / Neurodivergência / Deficiência</th>
                  <th className="p-1.5 border-r border-slate-300 text-center w-24">Casos (Nº)</th>
                  <th className="p-1.5 border-r border-slate-300 text-center w-28">% sobre Pacientes</th>
                  <th className="p-1.5 text-left">Observação Pedagógica / Apoio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-[10px]">
                {epiList.map((item, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                    <td className="p-1.5 border-r border-slate-300 font-medium text-slate-900">{item.label}</td>
                    <td className="p-1.5 border-r border-slate-300 text-center font-bold text-slate-800">{item.count}</td>
                    <td className="p-1.5 border-r border-slate-300 text-center font-semibold text-slate-700">
                      {((item.count / totalBase) * 100).toFixed(1)}%
                    </td>
                    <td className="p-1.5 text-slate-600">
                      {item.label.includes('TEA') ? 'Acompanhamento com Profissional de Apoio Escolar' : 'Adaptação Curricular & Sala de Recursos'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[9px] text-slate-500 mt-1 italic">
              * A soma percentual pode ultrapassar 100% em virtude de comorbidades (múltiplos diagnósticos por estudante).
            </p>
          </div>

          {/* 3. Gestão de Especialidades Clínicas */}
          <div className="mt-4 print-break-inside-avoid">
            <h3 className="font-bold text-slate-800 text-[12px] uppercase tracking-wider border-b border-slate-300 pb-1 mb-2">
              3. Sobrecarga por Especialidade e Produção Clínica ({data.meta.ano_letivo})
            </h3>
            <table className="w-full border border-slate-300 text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 text-[10px]">
                  <th className="p-1.5 border-r border-slate-300">Especialidade</th>
                  <th className="p-1.5 border-r border-slate-300 text-center w-24">Sessões Realizadas</th>
                  <th className="p-1.5 border-r border-slate-300 text-center w-24">Profissionais</th>
                  <th className="p-1.5 text-center w-28">Pacientes Únicos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-[10px]">
                {data.especialidades.length > 0 ? (
                  data.especialidades.map((esp, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                      <td className="p-1.5 border-r border-slate-300 font-medium text-slate-900">{esp.especialidade}</td>
                      <td className="p-1.5 border-r border-slate-300 text-center font-bold text-slate-800">{esp.total_atendimentos}</td>
                      <td className="p-1.5 border-r border-slate-300 text-center text-slate-700">{esp.total_profissionais}</td>
                      <td className="p-1.5 text-center font-semibold text-slate-800">{esp.pacientes_atendidos}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-3 text-center text-slate-500 italic">
                      Nenhuma evolução registrada para o período selecionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 4. Escolas de Origem & Intersetorialidade */}
          <div className="mt-4 grid grid-cols-2 gap-4 print-break-inside-avoid">
            <div>
              <h3 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider border-b border-slate-300 pb-1 mb-1.5">
                4. Principais Escolas de Origem
              </h3>
              <table className="w-full border border-slate-300 text-left border-collapse text-[10px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                    <th className="p-1 border-r border-slate-300">Escola Regular</th>
                    <th className="p-1 border-r border-slate-300 text-center w-12">Ativos</th>
                    <th className="p-1 text-center w-12">Fila</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.origem_escolas.slice(0, 6).map((esc, idx) => (
                    <tr key={idx}>
                      <td className="p-1 border-r border-slate-300 truncate font-medium text-slate-900">{esc.escola_nome}</td>
                      <td className="p-1 border-r border-slate-300 text-center font-bold text-blue-700">{esc.em_atendimento}</td>
                      <td className="p-1 text-center font-bold text-amber-700">{esc.na_fila}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <h3 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider border-b border-slate-300 pb-1 mb-1.5">
                5. Demografia & Pareceres Escolares
              </h3>
              <div className="border border-slate-300 rounded-lg p-2 bg-slate-50 space-y-1.5 text-[10px]">
                <div className="flex justify-between border-b border-slate-200 pb-1">
                  <span className="text-slate-600">Distribuição Territorial:</span>
                  <span className="font-bold text-slate-900">
                    {data.logistica.zona_urbana} Urbana / {data.logistica.zona_rural} Rural
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1">
                  <span className="text-slate-600">Turno de Acolhimento:</span>
                  <span className="font-bold text-slate-900">
                    {data.logistica.turno_matutino} Matutino / {data.logistica.turno_vespertino} Vespertino
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1">
                  <span className="text-slate-600">Pareceres Emitidos às Escolas:</span>
                  <span className="font-bold text-emerald-700">{data.intersetorialidade.respondidos}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Tempo Médio de Resposta:</span>
                  <span className="font-bold text-slate-900">{data.intersetorialidade.tempo_medio_resposta_dias} dias</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé Oficial de Autenticidade */}
        <div className="mt-8 pt-3 border-t border-slate-300 text-[9px] text-slate-500 flex justify-between items-center print-break-inside-avoid">
          <span>
            SIG - Sistema Integrado de Gestão Municipal • Secretaria Municipal de Educação de Sapeaçu
          </span>
          <span>Chancela Eletrônica de Auditoria • ID: {sessionTimestamp}</span>
        </div>
      </div>
    </div>,
    document.body
  )
}
