'use client'

import React, { useState } from 'react'
import { PrintHeader } from './print-header'

const sessionTimestamp = Date.now()

export interface AlunoRelacaoItem {
  id: string
  nome: string
  foto_url?: string | null
  data_nascimento?: string | null
  matricula?: string | null
  nome_mae?: string | null
  nome_pai?: string | null
  nome_responsavel?: string | null
  dados_matricula?: any
}

export interface PrintRelacaoAlunosFotosProps {
  turma: {
    nome: string
    ano_letivo?: string | number
    turno?: string
  }
  escolaNome?: string
  escolaLogoUrl?: string
  alunos: AlunoRelacaoItem[]
}

export function PrintRelacaoAlunosFotos({
  turma,
  escolaNome,
  escolaLogoUrl,
  alunos
}: PrintRelacaoAlunosFotosProps) {
  const [failedImageIds, setFailedImageIds] = useState<Record<string, boolean>>({})

  const getCacheBustedUrl = (url?: string | null) => {
    if (!url) return ''
    if (url.startsWith('data:')) return url
    const cleanUrl = url.split('?')[0]
    return `${cleanUrl}?t=${sessionTimestamp}`
  }

  const formatDataNascimento = (dataStr?: string | null) => {
    if (!dataStr) return '-'
    try {
      const [ano, mes, dia] = dataStr.split('T')[0].split('-')
      if (dia && mes && ano) return `${dia}/${mes}/${ano}`
      return dataStr
    } catch {
      return dataStr
    }
  }

  const handleImageError = (id: string) => {
    setFailedImageIds(prev => ({ ...prev, [id]: true }))
  }

  return (
    <div className="w-full bg-white text-black p-4 text-xs font-sans print:p-0 leading-normal">
      {/* Cabeçalho Oficial */}
      <PrintHeader
        escolaNome={escolaNome}
        escolaLogoUrl={escolaLogoUrl}
        docTitulo="RELAÇÃO DE ESTUDANTES"
        docSubtitulo={`TURMA: ${turma.nome?.toUpperCase() ?? ''} • TURNO: ${turma.turno?.toUpperCase() ?? 'NÃO INFORMADO'} • ANO LETIVO: ${turma.ano_letivo ?? ''}`}
        timestamp={sessionTimestamp}
      />

      {/* Resumo da Turma */}
      <div className="flex items-center justify-between bg-gray-100 border border-gray-300 rounded px-3 py-1.5 mb-3 print:py-0.5 print:px-2 print:mb-1.5 font-semibold text-[11px] print:text-[9.5px]">
        <span>Turma: <strong>{turma.nome}</strong></span>
        <span>Turno: <strong>{turma.turno ?? 'Não informado'}</strong></span>
        <span>Ano Letivo: <strong>{turma.ano_letivo ?? '-'}</strong></span>
        <span>Total de Estudantes: <strong>{alunos.length}</strong></span>
      </div>

      {/* Tabela de Alunos */}
      {alunos.length === 0 ? (
        <div className="text-center py-8 text-gray-500 italic">
          Nenhum estudante matriculado nesta turma.
        </div>
      ) : (
        <table className="w-full border-collapse border border-black text-[10px] print:text-[8.5px]">
          <thead>
            <tr className="bg-gray-200 text-black border-b border-black">
              <th className="border border-black px-1 py-1 print:py-0.5 text-center w-9 print:w-8"></th>
              <th className="border border-black px-2 py-1 print:px-1.5 print:py-0.5 text-left">Nome do Estudante</th>
              <th className="border border-black px-2 py-1 print:px-1 print:py-0.5 text-center w-24 print:w-20">Data Nasc.</th>
              <th className="border border-black px-2 py-1 print:px-1.5 print:py-0.5 text-left w-36 print:w-32">Mãe / Responsável</th>
              <th className="border border-black px-1.5 py-1 print:px-0.5 print:py-0.5 text-center w-10 print:w-8">#</th>
              <th className="border border-black px-2 py-1 print:px-1 print:py-0.5 text-center w-36 print:w-28">Assinatura</th>
              <th className="border border-black px-2 py-1 print:px-1 print:py-0.5 text-center w-16 print:w-12">Visto</th>
            </tr>
          </thead>
          <tbody>
            {alunos.map((aluno, index) => {
              const respNome =
                (aluno.nome_mae && aluno.nome_mae.trim() !== '' ? aluno.nome_mae : null) ??
                (aluno.nome_pai && aluno.nome_pai.trim() !== '' ? aluno.nome_pai : null) ??
                (aluno.nome_responsavel && aluno.nome_responsavel.trim() !== '' ? aluno.nome_responsavel : null) ??
                (aluno.dados_matricula?.responsavel_nome && aluno.dados_matricula.responsavel_nome.trim() !== '' ? aluno.dados_matricula.responsavel_nome : null) ??
                '-'

              const hasValidPhoto = aluno.foto_url && !failedImageIds[aluno.id]

              return (
                <tr
                  key={aluno.id ?? index}
                  className="border-b border-black align-middle"
                  style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
                >
                  {/* Foto Avatar Circular */}
                  <td className="border border-black p-1 print:p-0.5 text-center align-middle">
                    <div className="w-10 h-10 print:w-6 print:h-6 rounded-full border border-gray-400 bg-gray-200 overflow-hidden mx-auto flex items-center justify-center text-[10px] print:text-[7.5px] text-gray-500 font-semibold shrink-0">
                      {hasValidPhoto ? (
                        <img
                          src={getCacheBustedUrl(aluno.foto_url)}
                          alt={aluno.nome}
                          onError={() => handleImageError(aluno.id)}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>Foto</span>
                      )}
                    </div>
                  </td>

                  {/* Nome do Aluno e Detalhes Multilinha */}
                  <td className="border border-black px-2 py-1 print:px-1.5 print:py-0.5 text-left align-middle">
                    <div className="font-bold text-[11px] print:text-[9px] text-black leading-tight">
                      {aluno.nome?.toUpperCase()}
                    </div>
                    <div className="text-[9px] print:text-[7.5px] text-gray-600 font-normal mt-0.5 print:mt-0 flex flex-wrap items-center gap-x-3 leading-tight">
                      <span>Matrícula: {aluno.matricula ?? '-'}</span>
                      <span>Nasc: {formatDataNascimento(aluno.data_nascimento)}</span>
                    </div>
                    <div className="text-[9px] print:text-[7.5px] text-gray-600 font-normal leading-tight">
                      Mãe/Resp: {respNome}
                    </div>
                  </td>

                  {/* Data Nascimento */}
                  <td className="border border-black px-2 py-1 print:px-1 print:py-0.5 text-center font-medium text-[10.5px] print:text-[8.5px]">
                    {formatDataNascimento(aluno.data_nascimento)}
                  </td>

                  {/* Responsável */}
                  <td className="border border-black px-2 py-1 print:px-1.5 print:py-0.5 text-left text-[9.5px] print:text-[8px] truncate max-w-[140px]">
                    {respNome}
                  </td>

                  {/* Ordem (#) */}
                  <td className="border border-black px-1 py-1 print:px-0.5 print:py-0.5 text-center font-bold text-[12px] print:text-[10px]">
                    {index + 1}
                  </td>

                  {/* Assinatura com Linha Pontilhada */}
                  <td className="border border-black px-2 py-1 print:px-1 print:py-0.5 text-center align-middle">
                    <span className="text-gray-400 font-mono text-[9px] print:text-[7.5px] tracking-wider">.......................</span>
                  </td>

                  {/* Visto */}
                  <td className="border border-black px-2 py-1 print:px-1 print:py-0.5 text-center w-16 print:w-12">
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {/* Rodapé do Relatório */}
      <div className="mt-4 pt-2 border-t border-gray-400 flex items-center justify-between text-[9px] text-gray-600 font-medium">
        <span>Documento gerado pelo SIG em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
        <span>Página 1</span>
      </div>
    </div>
  )
}


