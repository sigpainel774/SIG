'use client'

import React, { forwardRef } from 'react'

export interface AlunoAtaResultados {
  aluno_id: string
  numero_chamada?: number
  nome: string
  matricula?: string
  notas_materias: Record<string, number | string> // { [materiaNome]: mediaFinal }
  media_geral: number | string
  total_faltas: number
  percentual_frequencia: number
  situacao_final: string // 'APROVADO_DIRETO' | 'APROVADO_CONSELHO' | 'PROGRESSAO_PARCIAL' | 'REPROVADO_NOTA' | 'REPROVADO_FALTA' | 'TRANSFERIDO'
  parecer_individual?: string
}

export interface MembroConselho {
  nome: string
  cargo: string
  assinou?: boolean
}

export interface DadosAtaResultadosFinais {
  escolaNome: string
  escolaInep?: string
  escolaEndereco?: string
  turmaNome: string
  turmaTurno: string
  anoLetivo: string
  periodo: string
  dataReuniao: string
  horarioInicio?: string
  horarioTermino?: string
  materias: string[]
  alunos: AlunoAtaResultados[]
  parecerGeral?: string
  membros: MembroConselho[]
  diretorNome?: string
  secretarioNome?: string
  coordenadorNome?: string
  hashAutenticidade?: string
}

interface PrintAtaResultadosFinaisProps {
  dados: DadosAtaResultadosFinais
}

export const PrintAtaResultadosFinais = forwardRef<HTMLDivElement, PrintAtaResultadosFinaisProps>(
  ({ dados }, ref) => {
    const dataFormatada = dados.dataReuniao.split('-').reverse().join('/')

    const formatarSituacao = (sit: string) => {
      switch (sit) {
        case 'APROVADO_DIRETO':
          return 'APROVADO'
        case 'APROVADO_CONSELHO':
          return 'APROVADO P/ CONSELHO'
        case 'PROGRESSAO_PARCIAL':
          return 'PROGRESSÃO PARCIAL'
        case 'REPROVADO_NOTA':
          return 'CONSERVADO (RENDIMENTO)'
        case 'REPROVADO_FALTA':
          return 'CONSERVADO (INFREQUÊNCIA)'
        case 'TRANSFERIDO':
          return 'TRANSFERIDO'
        default:
          return sit || 'EM ANÁLISE'
      }
    }

    return (
      <div ref={ref} className="print-document bg-white text-black p-8 font-sans text-[11px] leading-tight max-w-[210mm] mx-auto min-h-[297mm]">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page {
              size: A4 portrait;
              margin: 12mm 12mm 12mm 12mm;
            }
            body {
              background: white !important;
              color: black !important;
              font-family: Arial, sans-serif !important;
            }
            .print-document {
              padding: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
            }
            .page-break {
              page-break-before: always;
            }
          }
        `}} />

        {/* 1. Cabeçalho Oficial */}
        <div className="text-center border-b-2 border-black pb-3 mb-4 space-y-1">
          <div className="flex items-center justify-center gap-3 mb-1">
            {/* Brasão Oficial */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/img/brasaoSapeaçu.png"
              alt="Brasão de Sapeaçu"
              className="h-14 w-auto object-contain"
              onError={(e) => { (e.target as HTMLElement).style.display = 'none' }}
            />
          </div>
          <p className="text-[12px] font-bold uppercase tracking-wider">Estado da Bahia • Município de Sapeaçu</p>
          <p className="text-[13px] font-extrabold uppercase">Secretaria Municipal de Educação (SEMED)</p>
          <h1 className="text-[14px] font-black uppercase text-black pt-1">
            ATA DE RESULTADOS FINAIS DO CONSELHO DE CLASSE
          </h1>
          <p className="text-[11px] font-semibold text-zinc-700">
            Ano Letivo {dados.anoLetivo} • {dados.periodo === 'FINAL' ? 'Encerramento Anual' : `Conselho da ${dados.periodo}`}
          </p>
        </div>

        {/* 2. Dados da Unidade Escolar e Turma */}
        <div className="border border-black p-2.5 mb-4 bg-zinc-50 grid grid-cols-2 gap-2 text-[10.5px]">
          <div>
            <p><strong>Unidade Escolar:</strong> {dados.escolaNome}</p>
            <p><strong>Endereço:</strong> {dados.escolaEndereco || 'Sapeaçu - Bahia'}</p>
            {dados.escolaInep && <p><strong>Código INEP:</strong> {dados.escolaInep}</p>}
          </div>
          <div>
            <p><strong>Turma:</strong> {dados.turmaNome}</p>
            <p><strong>Turno:</strong> {dados.turmaTurno}</p>
            <p><strong>Data da Reunião:</strong> {dataFormatada} {dados.horarioInicio ? `• ${dados.horarioInicio}` : ''}</p>
          </div>
        </div>

        {/* 3. Preâmbulo da Reunião */}
        <div className="mb-3 text-[10px] text-justify leading-relaxed">
          <p>
            Aos <strong>{dataFormatada}</strong>, reuniu-se ordinariamente o Conselho de Classe da turma <strong>{dados.turmaNome}</strong>, sob a presidência da equipe gestora e pedagógica, em conformidade com o Regimento Escolar Municipal e as diretrizes da LDB (Lei 9.394/96), para análise do desempenho escolar, rendimento e frequência final dos estudantes, deliberando os seguintes resultados oficiais:
          </p>
        </div>

        {/* 4. Quadro Geral de Notas e Situação Final dos Estudantes */}
        <div className="overflow-x-auto mb-4">
          <table className="w-full border-collapse border border-black text-[9.5px]">
            <thead>
              <tr className="bg-zinc-200 text-center font-bold">
                <th className="border border-black p-1 w-6">Nº</th>
                <th className="border border-black p-1 text-left">Nome do Aluno</th>
                {dados.materias.map((m) => (
                  <th key={m} className="border border-black p-1 text-center w-9 font-bold" title={m}>
                    {m.slice(0, 4).toUpperCase()}
                  </th>
                ))}
                <th className="border border-black p-1 w-9 bg-zinc-300">MÉD.</th>
                <th className="border border-black p-1 w-9">FALTAS</th>
                <th className="border border-black p-1 w-10">FREQ.</th>
                <th className="border border-black p-1 w-32">SITUAÇÃO FINAL</th>
              </tr>
            </thead>
            <tbody>
              {dados.alunos.map((aluno, idx) => (
                <tr key={aluno.aluno_id || idx} className="hover:bg-zinc-50">
                  <td className="border border-black p-1 text-center font-bold">{idx + 1}</td>
                  <td className="border border-black p-1 font-semibold uppercase">{aluno.nome}</td>
                  {dados.materias.map((m) => {
                    const nota = aluno.notas_materias[m]
                    const valNum = Number(nota)
                    const isBaixa = !isNaN(valNum) && valNum < 5.0
                    return (
                      <td
                        key={m}
                        className={`border border-black p-1 text-center ${
                          isBaixa ? 'font-bold text-red-700 underline' : ''
                        }`}
                      >
                        {nota !== undefined && nota !== null ? Number(nota).toFixed(1) : '-'}
                      </td>
                    )
                  })}
                  <td className="border border-black p-1 text-center font-bold bg-zinc-100">
                    {aluno.media_geral ? Number(aluno.media_geral).toFixed(1) : '-'}
                  </td>
                  <td className="border border-black p-1 text-center">{aluno.total_faltas ?? 0}</td>
                  <td className="border border-black p-1 text-center font-medium">
                    {aluno.percentual_frequencia !== undefined ? `${aluno.percentual_frequencia}%` : '100%'}
                  </td>
                  <td className="border border-black p-1 text-center font-bold text-[9px]">
                    {formatarSituacao(aluno.situacao_final)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 5. Parecer Descritivo do Conselho e Observações */}
        {dados.parecerGeral && (
          <div className="border border-black p-2.5 mb-4 text-[10px] leading-relaxed bg-zinc-50">
            <h3 className="font-bold uppercase text-[10.5px] mb-1">Parecer Conclusivo & Deliberações do Conselho:</h3>
            <p className="text-justify">{dados.parecerGeral}</p>
          </div>
        )}

        {/* 6. Termo de Encerramento e Assinaturas */}
        <div className="mt-4 pt-2 text-[10px] space-y-6">
          <p className="text-justify">
            Nada mais havendo a tratar, lavrou-se a presente ata que, após lida e achada conforme por todos os membros presentes e corpo docente, segue devidamente assinada para os devidos fins de direito e comprovação perante a Secretaria Municipal de Educação.
          </p>

          <div className="grid grid-cols-3 gap-6 pt-6 text-center text-[10px]">
            <div className="border-t border-black pt-1">
              <p className="font-bold">{dados.diretorNome || 'Diretor(a) Escolar'}</p>
              <p className="text-[9px] text-zinc-600">Direção</p>
            </div>
            <div className="border-t border-black pt-1">
              <p className="font-bold">{dados.secretarioNome || 'Secretário(a) Escolar'}</p>
              <p className="text-[9px] text-zinc-600">Secretaria Escolar</p>
            </div>
            <div className="border-t border-black pt-1">
              <p className="font-bold">{dados.coordenadorNome || 'Coordenador(a) Pedagógico(a)'}</p>
              <p className="text-[9px] text-zinc-600">Coordenação Pedagógica</p>
            </div>
          </div>

          {/* Docentes Presentes */}
          {dados.membros && dados.membros.length > 0 && (
            <div className="pt-4">
              <p className="font-bold text-[10px] mb-4 text-center uppercase tracking-wider">
                Corpo Docente e Membros da Comissão Avaliadora
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-6 text-center text-[9.5px]">
                {dados.membros.map((m, idx) => (
                  <div key={idx} className="border-t border-black pt-1">
                    <p className="font-bold uppercase truncate">{m.nome}</p>
                    <p className="text-[8.5px] text-zinc-600 truncate">{m.cargo || 'Professor(a)'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 7. Rodapé de Auditoria e Integridade */}
        <div className="mt-8 pt-2 border-t border-zinc-400 text-[8px] text-zinc-500 flex items-center justify-between">
          <span>SIG - Sistema Integrado de Gestão • Sapeaçu / BA</span>
          <span>Autenticidade / Hash: {dados.hashAutenticidade || 'SIG-ATA-' + Math.random().toString(36).substring(2, 10).toUpperCase()}</span>
          <span>Emissão: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</span>
        </div>
      </div>
    )
  }
)

PrintAtaResultadosFinais.displayName = 'PrintAtaResultadosFinais'
