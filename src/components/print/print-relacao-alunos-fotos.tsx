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
      <div className="flex items-center justify-between bg-gray-100 border border-gray-300 rounded px-3 py-1.5 mb-3 font-semibold text-[11px]">
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
        <table className="w-full border-collapse border border-black text-[10px]">
          <thead>
            <tr className="bg-gray-200 text-black border-b border-black">
              <th className="border border-black px-1.5 py-1 text-center w-8">#</th>
              <th className="border border-black px-1.5 py-1 text-center w-[32mm]">Foto (3x4)</th>
              <th className="border border-black px-2 py-1 text-left">Nome do Estudante</th>
              <th className="border border-black px-2 py-1 text-center w-24">Data Nasc.</th>
              <th className="border border-black px-2 py-1 text-left w-36">Mãe / Responsável</th>
              <th className="border border-black px-2 py-1 text-center w-36">Visto / Assinatura</th>
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
                  {/* Ordem */}
                  <td className="border border-black px-1 py-1 text-center font-bold text-[11px]">
                    {index + 1}
                  </td>

                  {/* Espaço da Foto 3x4 */}
                  <td className="border border-black p-1 text-center align-middle">
                    <div
                      className="mx-auto flex items-center justify-center border rounded overflow-hidden"
                      style={{
                        width: '30mm',
                        height: '40mm',
                        borderStyle: hasValidPhoto ? 'solid' : 'dashed',
                        borderColor: hasValidPhoto ? '#000000' : '#9ca3af',
                        backgroundColor: hasValidPhoto ? '#ffffff' : '#f9fafb',
                      }}
                    >
                      {hasValidPhoto ? (
                        <img
                          src={getCacheBustedUrl(aluno.foto_url)}
                          alt={aluno.nome}
                          onError={() => handleImageError(aluno.id)}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-[9px] text-gray-400 font-medium">
                          <span>Foto 3x4</span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Nome do Aluno */}
                  <td className="border border-black px-2 py-1 text-left font-bold text-[11px]">
                    {aluno.nome?.toUpperCase()}
                    {aluno.matricula && (
                      <div className="text-[9px] text-gray-600 font-normal mt-0.5">
                        Matrícula: {aluno.matricula}
                      </div>
                    )}
                  </td>

                  {/* Data Nascimento */}
                  <td className="border border-black px-2 py-1 text-center font-medium">
                    {formatDataNascimento(aluno.data_nascimento)}
                  </td>

                  {/* Responsável */}
                  <td className="border border-black px-2 py-1 text-left text-[9.5px]">
                    {respNome}
                  </td>

                  {/* Assinatura / Visto */}
                  <td className="border border-black px-2 py-1 text-center">
                    <div className="w-full h-8 border-b border-dashed border-gray-300"></div>
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

