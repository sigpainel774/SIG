'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { PrintHeader } from '@/components/print/print-header'
import { Printer, X } from 'lucide-react'
import { getAvatarUrl } from '@/lib/photoHelper'

const sessionTimestamp = Date.now()

export interface PacienteProfissionalPrintData {
  id: string
  especialidade: string
  frequencia: string
  dia_semana: number
  horario_inicio: string
  horario_fim?: string | null
  ativo: boolean
  matricula: {
    id: string
    numero_matricula_emaee?: string | null
    status?: string | null
    ano_escolarizacao?: string | null
    turma_regular?: string | null
    turno_atendimento?: string | null
    escola_origem_fora_rede?: boolean | null
    escola_origem_nome?: string | null
    escolas?: {
      nome: string
    } | null
    aluno: {
      id: string
      nome: string
      cpf?: string | null
      data_nascimento?: string | null
      nome_mae?: string | null
      foto_url?: string | null
      foto_avatar_path?: string | null
      foto_visualizacao_path?: string | null
      foto_updated_at?: string | null
    }
  }
}

interface PrintPacientesProfissionalEmaeeProps {
  profissional: {
    id: string
    nome: string
    cargo?: string | null
    registro_profissional?: string | null
  }
  pacientes: PacienteProfissionalPrintData[]
  escolaNome?: string
  escolaLogoUrl?: string | null
  onClose: () => void
}

const DIAS_SEMANA_MAP: Record<number, string> = {
  1: 'Segunda-feira',
  2: 'Terça-feira',
  3: 'Quarta-feira',
  4: 'Quinta-feira',
  5: 'Sexta-feira',
  6: 'Sábado',
  7: 'Domingo'
}

function formatarHorario(h?: string | null): string {
  if (!h) return '--:--'
  const partes = h.split(':')
  if (partes.length >= 2) {
    return `${partes[0].padStart(2, '0')}:${partes[1].padStart(2, '0')}`
  }
  return h
}

function calcularIdade(dataNasc?: string | null): string {
  if (!dataNasc) return ''
  try {
    const hoje = new Date()
    const nasc = new Date(dataNasc)
    let idade = hoje.getFullYear() - nasc.getFullYear()
    const m = hoje.getMonth() - nasc.getMonth()
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) {
      idade--
    }
    return idade > 0 ? `${idade} anos` : ''
  } catch {
    return ''
  }
}

export function PrintPacientesProfissionalEmaee({
  profissional,
  pacientes,
  escolaNome = 'EMAEE - Espaço Municipal de Atendimento Educacional Especializado',
  escolaLogoUrl,
  onClose
}: PrintPacientesProfissionalEmaeeProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  const handlePrint = () => {
    window.print()
  }

  if (!mounted) return null

  // URL padrão da logo do EMAEE para fallback seguro
  const defaultEmaeeLogo = 'https://nijjizpcodnjhvqwjuso.supabase.co/storage/v1/object/public/logos/escola_1785901172024.png'
  const resolvedLogo = escolaLogoUrl || defaultEmaeeLogo

  const dataAtualFormatada = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(new Date())

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 overflow-y-auto print:static print:block print:p-0 print:bg-white print:overflow-visible print-portal-container">
      <style>{`
        @media print {
          body > *:not(.print-portal-container) {
            display: none !important;
          }
          .print-portal-container {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Action Buttons (Hidden on Print) */}
      <div className="fixed top-4 right-4 z-[100] flex gap-2 print:hidden">
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-[#3ea6ff] hover:bg-[#3ea6ff]/90 text-black font-bold rounded-lg shadow-lg flex items-center gap-2 text-sm cursor-pointer transition-all"
        >
          <Printer className="w-4 h-4" />
          Imprimir Relação
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-lg shadow-lg flex items-center gap-2 text-sm cursor-pointer transition-all border border-neutral-700"
        >
          <X className="w-4 h-4" />
          Fechar
        </button>
      </div>

      {/* A4 Sheet Container */}
      <div className="bg-white text-black w-full max-w-[210mm] min-h-[297mm] p-[10mm] shadow-2xl mx-auto flex flex-col justify-between print:shadow-none print:m-0 print:p-0 text-[11px] leading-tight">
        <div>
          {/* Header Oficial Padronizado */}
          <PrintHeader
            escolaNome={escolaNome}
            escolaLogoUrl={resolvedLogo}
            docTitulo="RELAÇÃO DE PACIENTES ATENDIDOS"
            docSubtitulo="ATENDIMENTO EDUCACIONAL ESPECIALIZADO (EMAEE)"
            timestamp={sessionTimestamp}
            className="mb-3"
          />

          {/* Dados do Profissional Especialista */}
          <div className="border border-gray-400 rounded-lg p-2.5 mb-3 bg-gray-50 text-[11px]">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <span className="font-bold text-gray-700 block text-[10px] uppercase">Profissional Especialista:</span>
                <span className="font-extrabold text-gray-900 text-[12px]">{profissional.nome}</span>
              </div>
              <div>
                <span className="font-bold text-gray-700 block text-[10px] uppercase">Cargo / Especialidade:</span>
                <span className="font-semibold text-gray-900">{profissional.cargo ?? 'Especialista AEE'}</span>
                {profissional.registro_profissional && (
                  <span className="text-[10px] text-gray-600 block">Reg.: {profissional.registro_profissional}</span>
                )}
              </div>
              <div>
                <span className="font-bold text-gray-700 block text-[10px] uppercase">Total de Pacientes:</span>
                <span className="font-bold text-gray-900">{pacientes.length} paciente(s) vinculado(s)</span>
              </div>
            </div>
          </div>

          {/* Tabela de Pacientes */}
          <div className="mb-4">
            <h4 className="text-[11px] font-bold uppercase text-gray-800 border-b border-gray-300 pb-1 mb-2">
              Pacientes em Atendimento Multidisciplinar ({pacientes.length})
            </h4>

            {pacientes.length === 0 ? (
              <div className="p-6 text-center text-gray-500 border border-dashed border-gray-300 rounded-lg text-xs">
                Nenhum paciente vinculado a este profissional até o momento.
              </div>
            ) : (
              <table className="w-full border-collapse text-[10px]">
                <thead>
                  <tr className="bg-gray-200 text-gray-800 border border-gray-400 font-bold">
                    <th className="p-1.5 text-center border-r border-gray-300 w-8">#</th>
                    <th className="p-1.5 text-center border-r border-gray-300 w-12">Foto</th>
                    <th className="p-1.5 text-left border-r border-gray-300">Paciente / Aluno</th>
                    <th className="p-1.5 text-left border-r border-gray-300">Matrícula EMAEE</th>
                    <th className="p-1.5 text-left border-r border-gray-300">Escola Regular / Ano</th>
                    <th className="p-1.5 text-center border-r border-gray-300">Dia da Semana</th>
                    <th className="p-1.5 text-center border-r border-gray-300">Horário</th>
                    <th className="p-1.5 text-center">Frequência</th>
                  </tr>
                </thead>
                <tbody>
                  {pacientes.map((item, idx) => {
                    const aluno = item.matricula?.aluno
                    const avatarUrl = aluno ? getAvatarUrl(aluno) : undefined
                    const escolaRegularNome =
                      item.matricula?.escolas?.nome ??
                      item.matricula?.escola_origem_nome ??
                      'Não informada'
                    const diaNome = DIAS_SEMANA_MAP[item.dia_semana] ?? `Dia ${item.dia_semana}`
                    const horarioFormatado = `${formatarHorario(item.horario_inicio)} às ${formatarHorario(item.horario_fim)}`
                    const idadeTxt = calcularIdade(aluno?.data_nascimento)

                    return (
                      <tr
                        key={item.id}
                        className={`border-b border-l border-r border-gray-300 ${
                          idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                      >
                        <td className="p-1.5 text-center font-bold text-gray-600 border-r border-gray-300">
                          {idx + 1}
                        </td>
                        <td className="p-1 text-center border-r border-gray-300">
                          <div className="w-8 h-8 mx-auto rounded-full border border-gray-300 overflow-hidden bg-gray-100 flex items-center justify-center">
                            {avatarUrl ? (
                              <img
                                src={avatarUrl}
                                alt={aluno?.nome ?? 'Aluno'}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="font-bold text-gray-500 text-[10px]">
                                {(aluno?.nome ?? 'A').charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-1.5 border-r border-gray-300">
                          <span className="font-bold text-gray-900 block text-[11px]">
                            {aluno?.nome ?? 'Aluno não identificado'}
                          </span>
                          {idadeTxt && (
                            <span className="text-[9px] text-gray-600 block">
                              Idade: {idadeTxt} {aluno?.nome_mae ? `• Mãe: ${aluno.nome_mae}` : ''}
                            </span>
                          )}
                        </td>
                        <td className="p-1.5 font-mono font-bold text-gray-800 border-r border-gray-300">
                          {item.matricula?.numero_matricula_emaee ?? 'Pendente'}
                        </td>
                        <td className="p-1.5 border-r border-gray-300">
                          <span className="font-semibold text-gray-800 block">{escolaRegularNome}</span>
                          <span className="text-[9px] text-gray-600 block">
                            {item.matricula?.ano_escolarizacao
                              ? `${item.matricula.ano_escolarizacao} - Turma ${item.matricula.turma_regular ?? 'A'}`
                              : 'Escolarização regular'}
                          </span>
                        </td>
                        <td className="p-1.5 text-center font-medium border-r border-gray-300 text-gray-800">
                          {diaNome}
                        </td>
                        <td className="p-1.5 text-center font-mono font-bold border-r border-gray-300 text-gray-900">
                          {horarioFormatado}
                        </td>
                        <td className="p-1.5 text-center font-medium text-gray-800 capitalize">
                          {item.frequencia?.toLowerCase() ?? 'Semanal'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Rodapé e Assinaturas */}
        <div className="mt-8 pt-4 border-t border-gray-300">
          <div className="text-right text-[10px] text-gray-500 mb-8">
            Sapeaçu - BA, {dataAtualFormatada}
          </div>

          <div className="grid grid-cols-2 gap-8 text-center text-[10px] pt-4">
            <div className="border-t border-black pt-1">
              <span className="font-bold block uppercase">{profissional.nome}</span>
              <span className="text-gray-600 block">{profissional.cargo ?? 'Profissional Especialista'}</span>
              {profissional.registro_profissional && (
                <span className="text-[9px] text-gray-500 block">Registro: {profissional.registro_profissional}</span>
              )}
            </div>
            <div className="border-t border-black pt-1">
              <span className="font-bold block uppercase">Coordenação / Direção EMAEE</span>
              <span className="text-gray-600 block">Visto da Equipe Multidisciplinar</span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
