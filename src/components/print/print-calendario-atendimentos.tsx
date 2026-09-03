'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Printer, CalendarDays, Clock, Users, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PrintHeader } from '@/components/print/print-header'

const DIAS_SEMANA_NOMES: Record<number, string> = {
  1: 'Segunda-feira',
  2: 'Terça-feira',
  3: 'Quarta-feira',
  4: 'Quinta-feira',
  5: 'Sexta-feira',
  6: 'Sábado',
  7: 'Domingo'
}

export interface AtendimentoPrintItem {
  id: string
  dia_semana: number
  horario_inicio: string
  horario_fim: string
  especialidade: string
  especialidade_outros?: string | null
  frequencia?: string | null
  funcionarios?: {
    nome: string
    cargo?: string | null
    telefone?: string | null
  } | null
  emaee_matriculas?: {
    numero_matricula_emaee?: string | null
    turno_atendimento?: string | null
    cid_codigo?: string | null
    alunos?: {
      nome: string
      cpf?: string | null
      data_nascimento?: string | null
      nome_mae?: string | null
      telefone?: string | null
    } | null
  } | null
}

interface PrintCalendarioAtendimentosProps {
  vinculos: AtendimentoPrintItem[]
  escolaNome?: string | null
  escolaLogoUrl?: string | null
  filtroProfissionalNome?: string
  filtroEspecialidade?: string
  filtroTurno?: string
  filtroDiaSemanaNome?: string
  totalSessoes?: number
  totalProfissionais?: number
  totalAlunos?: number
  onClose: () => void
}

export function PrintCalendarioAtendimentos({
  vinculos,
  escolaNome,
  escolaLogoUrl,
  filtroProfissionalNome,
  filtroEspecialidade,
  filtroTurno,
  filtroDiaSemanaNome,
  totalSessoes,
  totalProfissionais,
  totalAlunos,
  onClose,
}: PrintCalendarioAtendimentosProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  const handlePrint = () => {
    window.dispatchEvent(new Event('beforeprint'))
    setTimeout(() => {
      window.print()
    }, 200)
  }

  if (!mounted) return null

  // Fallback padrão para a logo do EMAEE
  const defaultEmaeeLogo = 'https://nijjizpcodnjhvqwjuso.supabase.co/storage/v1/object/public/logos/escola_1785901172024.png'
  const resolvedLogo = escolaLogoUrl || defaultEmaeeLogo
  const nomeUnidade = escolaNome || 'EMAEE - Espaço Municipal de Atendimento Educacional Especializado'

  // Agrupamento por dia da semana (1 a 7)
  const atendimentosPorDia = [1, 2, 3, 4, 5, 6].map(dia => ({
    dia,
    nome: DIAS_SEMANA_NOMES[dia] || `Dia ${dia}`,
    itens: vinculos
      .filter(v => v.dia_semana === dia)
      .sort((a, b) => (a.horario_inicio || '').localeCompare(b.horario_inicio || ''))
  })).filter(grupo => grupo.itens.length > 0)

  const formatarHora = (h?: string | null) => {
    if (!h) return '--:--'
    return h.slice(0, 5)
  }

  const sessoesContador = totalSessoes ?? vinculos.length
  const profsContador = totalProfissionais ?? new Set(vinculos.map(v => v.funcionarios?.nome).filter(Boolean)).size
  const alunosContador = totalAlunos ?? new Set(vinculos.map(v => v.emaee_matriculas?.alunos?.nome).filter(Boolean)).size

  const dataAtualFormatada = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-[#09090b]/95 flex items-center justify-center p-4 overflow-y-auto print:static print:block print:p-0 print:bg-white print:overflow-visible print-portal-container">
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm 10mm;
          }
          body > *:not(.print-portal-container) {
            display: none !important;
          }
          .print-portal-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          tr, .print-card, .print-section {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Botões Flutuantes de Ação (Ocultos na Impressão) */}
      <div className="fixed top-4 right-4 flex gap-3 print:hidden no-print z-[10000]">
        <Button
          onClick={handlePrint}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl h-10 px-5 shadow-lg flex items-center gap-2 cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          Imprimir Grade (A4)
        </Button>
        <Button
          onClick={onClose}
          variant="ghost"
          className="bg-secondary border border-border hover:bg-hoverCustom text-foreground font-bold rounded-xl h-10 px-5 shadow-lg flex items-center gap-2 cursor-pointer"
        >
          <X className="w-4 h-4" />
          Fechar
        </Button>
      </div>

      {/* Documento A4 Formato Paisagem (Landscape) */}
      <div
        className="bg-white text-black w-full max-w-[1100px] p-8 shadow-2xl rounded-sm print:shadow-none print:p-0 print:w-full print:max-w-none text-[11px] leading-relaxed font-sans border border-gray-300 print:border-none flex flex-col justify-start my-auto"
        style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
      >
        {/* Cabeçalho Oficial */}
        <PrintHeader
          className="pb-3 border-b-2 border-black mb-3"
          escolaLogoUrl={resolvedLogo}
          escolaNome={nomeUnidade}
          docTitulo="GRADE SEMANAL DE ATENDIMENTOS MULTIDISCIPLINARES (AEE)"
          docSubtitulo={`Escala Oficial de Atendimento Especializado • Emitido em: ${dataAtualFormatada}`}
        />

        {/* Barra Informativa e de Filtros */}
        <div className="bg-gray-100 border border-gray-300 rounded p-2.5 mb-3 flex flex-wrap items-center justify-between gap-2 text-[10.5px]">
          <div className="flex items-center gap-4 flex-wrap">
            <span><strong>Especialista:</strong> {filtroProfissionalNome || 'Todos'}</span>
            <span><strong>Especialidade:</strong> {filtroEspecialidade || 'Todas'}</span>
            <span><strong>Turno:</strong> {filtroTurno || 'Todos'}</span>
            {filtroDiaSemanaNome && <span><strong>Dia:</strong> {filtroDiaSemanaNome}</span>}
          </div>
          <div className="flex items-center gap-3 font-semibold text-gray-800">
            <span>Sessões: <strong className="text-black">{sessoesContador}</strong></span>
            <span>|</span>
            <span>Profissionais: <strong className="text-black">{profsContador}</strong></span>
            <span>|</span>
            <span>Alunos Atendidos: <strong className="text-black">{alunosContador}</strong></span>
          </div>
        </div>

        {/* Tabela de Atendimentos Agrupados por Dia */}
        {atendimentosPorDia.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-gray-400 rounded my-4 text-gray-500 font-semibold">
            Nenhum atendimento especializado cadastrado ou localizado com os filtros selecionados.
          </div>
        ) : (
          <div className="space-y-4">
            {atendimentosPorDia.map((grupo) => (
              <div key={grupo.dia} className="print-section">
                {/* Título do Dia */}
                <div className="bg-gray-800 text-white px-3 py-1 font-bold text-[11px] rounded-t flex items-center justify-between uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-3.5 h-3.5 text-gray-300" />
                    <span>{grupo.nome}</span>
                  </div>
                  <span className="text-[10px] font-normal text-gray-300 lowercase">
                    {grupo.itens.length} {grupo.itens.length === 1 ? 'atendimento' : 'atendimentos'}
                  </span>
                </div>

                {/* Tabela do Dia */}
                <table className="w-full border-collapse border border-gray-400 text-[10px] mb-2">
                  <thead>
                    <tr className="bg-gray-200 text-gray-900 font-bold border-b border-gray-400">
                      <th className="border border-gray-400 p-1.5 text-center w-[90px]">Horário</th>
                      <th className="border border-gray-400 p-1.5 text-left">Aluno(a) / Matrícula EMAEE</th>
                      <th className="border border-gray-400 p-1.5 text-left w-[180px]">Especialidade / Frequência</th>
                      <th className="border border-gray-400 p-1.5 text-left w-[220px]">Especialista / Cargo</th>
                      <th className="border border-gray-400 p-1.5 text-center w-[75px]">Turno</th>
                      <th className="border border-gray-400 p-1.5 text-center w-[65px]">CID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupo.itens.map((item, idx) => {
                      const alunoNome = item.emaee_matriculas?.alunos?.nome ?? 'Aluno não identificado'
                      const matriculaEmaee = item.emaee_matriculas?.numero_matricula_emaee
                      const especialidadeNome = (!item.especialidade || item.especialidade === 'Outros' || item.especialidade === 'Outro') 
                        ? (item.especialidade_outros || item.funcionarios?.cargo || 'Especialista AEE') 
                        : item.especialidade
                      const profNome = item.funcionarios?.nome ?? 'Profissional não atribuído'
                      const profCargo = item.funcionarios?.cargo ?? 'Especialista AEE'
                      const cid = item.emaee_matriculas?.cid_codigo
                      const turno = item.emaee_matriculas?.turno_atendimento ?? 'Diurno'

                      return (
                        <tr
                          key={item.id || idx}
                          className={idx % 2 === 1 ? 'bg-gray-50' : 'bg-white'}
                        >
                          <td className="border border-gray-400 p-1.5 text-center font-bold text-gray-900 whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <Clock className="w-3 h-3 text-gray-500" />
                              <span>{formatarHora(item.horario_inicio)} - {formatarHora(item.horario_fim)}</span>
                            </div>
                          </td>
                          <td className="border border-gray-400 p-1.5 font-semibold text-gray-900">
                            <div>{alunoNome}</div>
                            {matriculaEmaee && (
                              <span className="text-[9px] font-normal text-gray-500">
                                Matrícula: {matriculaEmaee}
                              </span>
                            )}
                          </td>
                          <td className="border border-gray-400 p-1.5 text-gray-800">
                            <div className="font-bold text-blue-900">{especialidadeNome}</div>
                            {item.frequencia && (
                              <span className="text-[9px] text-gray-500">{item.frequencia}</span>
                            )}
                          </td>
                          <td className="border border-gray-400 p-1.5 text-gray-800">
                            <div className="font-semibold">{profNome}</div>
                            <span className="text-[9px] text-gray-500">{profCargo}</span>
                          </td>
                          <td className="border border-gray-400 p-1.5 text-center font-medium text-gray-700 uppercase text-[9px]">
                            {turno}
                          </td>
                          <td className="border border-gray-400 p-1.5 text-center font-bold text-rose-800">
                            {cid || '-'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        {/* Rodapé com Assinaturas Oficiais */}
        <div className="mt-8 pt-4 border-t border-gray-400 print-section">
          <div className="grid grid-cols-2 gap-12 text-center text-[10px] mt-6">
            <div>
              <div className="border-b border-black w-3/4 mx-auto mb-1.5" />
              <p className="font-bold text-gray-900">Coordenação Pedagógica / Direção do EMAEE</p>
              <p className="text-[9px] text-gray-500">Espaço Municipal de Atendimento Educacional Especializado</p>
            </div>
            <div>
              <div className="border-b border-black w-3/4 mx-auto mb-1.5" />
              <p className="font-bold text-gray-900">Secretaria Municipal de Educação</p>
              <p className="text-[9px] text-gray-500">Prefeitura Municipal de Sapeaçu - BA</p>
            </div>
          </div>

          <div className="flex justify-between items-center text-[8.5px] text-gray-400 mt-6">
            <span>SIG - Sistema Integrado de Gestão Municipal • EMAEE</span>
            <span>Documento oficial gerado para controle e acompanhamento de atendimentos do AEE</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
