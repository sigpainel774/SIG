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

  // Divisão em páginas de até 30 estudantes (15 na coluna da esquerda, 15 na coluna da direita)
  const TAMANHO_PAGINA = 30
  const METADE_PAGINA = 15
  const paginas: Array<{ esquerda: AlunoRelacaoItem[]; direita: AlunoRelacaoItem[] }> = []

  if (alunos.length === 0) {
    paginas.push({ esquerda: [], direita: [] })
  } else {
    for (let i = 0; i < alunos.length; i += TAMANHO_PAGINA) {
      const grupoPagina = alunos.slice(i, i + TAMANHO_PAGINA)
      const esquerda = grupoPagina.slice(0, METADE_PAGINA)
      const direita = grupoPagina.slice(METADE_PAGINA, TAMANHO_PAGINA)
      paginas.push({ esquerda, direita })
    }
  }

  const renderTabelaSub = (lista: AlunoRelacaoItem[], startIndex: number) => {
    return (
      <table className="w-full border-collapse border border-black text-[9px] print:text-[8.5px]">
        <thead>
          <tr className="bg-gray-200 text-black border-b border-black">
            <th className="border border-black px-0.5 py-1 text-center w-8"></th>
            <th className="border border-black px-1.5 py-1 text-left">Nome do Estudante</th>
            <th className="border border-black px-1 py-1 text-center w-16">Data Nasc.</th>
            <th className="border border-black px-1.5 py-1 text-left w-24">Mãe / Responsável</th>
            <th className="border border-black px-0.5 py-1 text-center w-6">#</th>
            <th className="border border-black px-1 py-1 text-center w-24">Assinatura</th>
            <th className="border border-black px-1 py-1 text-center w-9">Visto</th>
          </tr>
        </thead>
        <tbody>
          {lista.map((aluno, index) => {
            const numeroOrdem = startIndex + index + 1
            const respNome =
              (aluno.nome_mae && aluno.nome_mae.trim() !== '' ? aluno.nome_mae : null) ??
              (aluno.nome_pai && aluno.nome_pai.trim() !== '' ? aluno.nome_pai : null) ??
              (aluno.nome_responsavel && aluno.nome_responsavel.trim() !== '' ? aluno.nome_responsavel : null) ??
              (aluno.dados_matricula?.responsavel_nome && aluno.dados_matricula.responsavel_nome.trim() !== '' ? aluno.dados_matricula.responsavel_nome : null) ??
              '-'

            const hasValidPhoto = aluno.foto_url && !failedImageIds[aluno.id]

            return (
              <tr
                key={aluno.id ?? numeroOrdem}
                className="border-b border-black align-middle"
                style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
              >
                {/* Foto Avatar Circular */}
                <td className="border border-black p-0.5 text-center align-middle">
                  <div className="w-7 h-7 rounded-full border border-gray-400 bg-gray-200 overflow-hidden mx-auto flex items-center justify-center text-[7.5px] text-gray-500 font-semibold shrink-0">
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
                <td className="border border-black px-1.5 py-0.5 text-left align-middle leading-tight">
                  <div className="font-bold text-[9.5px] text-black truncate" title={aluno.nome}>
                    {aluno.nome?.toUpperCase()}
                  </div>
                  <div className="text-[7.5px] text-gray-600 font-normal mt-0.5 flex items-center gap-x-2">
                    <span>Matrícula: {aluno.matricula ?? '-'}</span>
                  </div>
                  <div className="text-[7.5px] text-gray-600 font-normal truncate" title={respNome}>
                    Mãe/Resp: {respNome}
                  </div>
                </td>

                {/* Data Nascimento */}
                <td className="border border-black px-1 py-0.5 text-center font-medium text-[8.5px]">
                  {formatDataNascimento(aluno.data_nascimento)}
                </td>

                {/* Responsável */}
                <td className="border border-black px-1.5 py-0.5 text-left text-[8px] truncate" title={respNome}>
                  {respNome}
                </td>

                {/* Ordem (#) */}
                <td className="border border-black px-0.5 py-0.5 text-center font-bold text-[9.5px]">
                  {numeroOrdem}
                </td>

                {/* Assinatura com Linha Pontilhada */}
                <td className="border border-black px-1 py-0.5 text-center align-middle">
                  <span className="text-gray-400 font-mono text-[7.5px] tracking-wider">...................</span>
                </td>

                {/* Visto */}
                <td className="border border-black px-1 py-0.5 text-center w-9">
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    )
  }

  return (
    <div className="w-full bg-white text-black p-4 text-xs font-sans print:p-0 leading-normal">
      {paginas.map((pagina, pageIndex) => (
        <div
          key={pageIndex}
          className={`w-full ${pageIndex < paginas.length - 1 ? 'page-break-after-always mb-8 print:mb-0' : ''}`}
          style={{ pageBreakAfter: pageIndex < paginas.length - 1 ? 'always' : 'auto' }}
        >
          {/* Cabeçalho Oficial */}
          <PrintHeader
            escolaNome={escolaNome}
            escolaLogoUrl={escolaLogoUrl}
            docTitulo="RELAÇÃO DE ESTUDANTES"
            docSubtitulo={`TURMA: ${turma.nome?.toUpperCase() ?? ''} • TURNO: ${turma.turno?.toUpperCase() ?? 'NÃO INFORMADO'} • ANO LETIVO: ${turma.ano_letivo ?? ''}`}
            timestamp={sessionTimestamp}
          />

          {/* Resumo da Turma */}
          <div className="flex items-center justify-between bg-gray-100 border border-gray-300 rounded px-3 py-1.5 mb-3 print:py-0.5 print:px-2 print:mb-2 font-semibold text-[11px] print:text-[9.5px]">
            <span>Turma: <strong>{turma.nome}</strong></span>
            <span>Turno: <strong>{turma.turno ?? 'Não informado'}</strong></span>
            <span>Ano Letivo: <strong>{turma.ano_letivo ?? '-'}</strong></span>
            <span>Total de Estudantes: <strong>{alunos.length}</strong></span>
          </div>

          {/* Tabela Dividida em 2 Colunas (Esquerda: 1-15 | Direita: 16-30) */}
          {alunos.length === 0 ? (
            <div className="text-center py-8 text-gray-500 italic">
              Nenhum estudante matriculado nesta turma.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 items-start w-full">
              {/* Coluna 1: Esquerda (1 a 15) */}
              <div className="w-full">
                {renderTabelaSub(pagina.esquerda, pageIndex * TAMANHO_PAGINA)}
              </div>

              {/* Coluna 2: Direita (16 a 30) */}
              <div className="w-full">
                {pagina.direita.length > 0 ? (
                  renderTabelaSub(pagina.direita, pageIndex * TAMANHO_PAGINA + METADE_PAGINA)
                ) : (
                  <div className="h-20 border border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 italic text-[9px] print:hidden">
                    (Sem estudantes para a coluna direita)
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Rodapé do Relatório */}
          <div className="mt-4 pt-2 border-t border-gray-400 flex items-center justify-between text-[9px] text-gray-600 font-medium print:mt-2">
            <span>Documento gerado pelo SIG em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
            <span>Página {pageIndex + 1} de {paginas.length}</span>
          </div>
        </div>
      ))}
    </div>
  )
}



