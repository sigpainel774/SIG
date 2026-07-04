'use client'

import React from 'react'

export interface AlunoPrintData {
  id?: string
  nome: string
  cpf?: string | null
  inep?: string | null
  data_nascimento?: string | null
  telefone?: string | null
  rg?: string | null
  nis?: string | null
  cartao_sus?: string | null
  certidao_nascimento?: string | null
  nome_mae?: string | null
  nome_pai?: string | null
  endereco?: string | null
  serie?: string | null
  foto_url?: string | null
  escola_nome?: string
  dados_matricula?: Record<string, any>
}

interface PrintFichaAlunoProps {
  aluno: AlunoPrintData
  onClose?: () => void
}

export function PrintFichaAluno({ aluno, onClose }: PrintFichaAlunoProps) {
  const dm = aluno.dados_matricula || {}

  // Helpers for checkboxes formatting
  const renderList = (items: string[] | undefined) => {
    if (!items || items.length === 0) return 'Não'
    return `Sim. ${items.join(', ')}`
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto print:static print:block print:p-0 print:bg-white print:overflow-visible">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
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
      {/* Botões de Ação na tela (escondidos na impressão) */}
      <div className="fixed top-4 right-4 z-50 flex gap-2 print:hidden">
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-[#3ea6ff] hover:bg-[#3ea6ff]/90 text-black font-bold rounded-lg shadow flex items-center gap-2 text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Imprimir Ficha
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-[#272727] hover:bg-[#333] text-white rounded-lg text-sm font-semibold"
        >
          Fechar
        </button>
      </div>

      {/* Conteúdo Impresso (A4) */}
      <div 
        className="bg-white text-black w-full max-w-[800px] min-h-[1050px] p-6 shadow-2xl rounded-sm print:shadow-none print:p-0 print:w-full print:max-w-none text-[11px] leading-tight font-sans border border-gray-300 print:border-none flex flex-col justify-between my-auto print:flex print:flex-col print:justify-between print:min-h-[275mm] print:m-0"
        style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
      >
        <div>
          {/* Cabeçalho Oficial */}
          <div className="flex items-center justify-between pb-3 border-b-2 border-black mb-2">
            <div className="flex items-center gap-2 max-w-[200px]">
              <img 
                src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logos/logo-prefeitura.png`} 
                alt="Prefeitura de Sapeaçu" 
                className="h-16 w-auto object-contain"
              />
            </div>

            <div className="text-center flex-1 px-2">
              <h1 className="text-base font-extrabold tracking-wider text-gray-800 uppercase">FICHA DE MATRÍCULA</h1>
              <p className="text-xs font-bold text-gray-600">Ano Letivo {dm.anoLetivo || '2026'}</p>
            </div>

            <div className="text-right max-w-[220px]">
              <img 
                src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logos/logo-secretaria.jpg`} 
                alt="Secretaria Municipal de Educação" 
                className="h-16 w-auto object-contain"
              />
            </div>
          </div>

          {/* Dados da Unidade Escolar */}
          <table className="w-full border-collapse border border-black mb-2 text-[10px]">
            <tbody>
              <tr>
                <td className="border border-black p-1 bg-gray-50/50 w-3/4">
                  <span className="font-bold block text-[9px] uppercase text-gray-700">Unidade Escolar</span>
                  <span className="font-bold text-[11px]">{aluno.escola_nome || dm.escolaNome || 'Colégio Moisés Alves'}</span>
                </td>
                <td className="border border-black p-1 bg-gray-50/50 w-1/4">
                  <span className="font-bold block text-[9px] uppercase text-gray-700">Localização da UE</span>
                  <span>{dm.localizacaoUE || 'Zona Urbana'}</span>
                </td>
              </tr>
              <tr>
                <td className="border border-black p-1">
                  <span className="font-bold block text-[9px] uppercase text-gray-700">Tipo de matrícula</span>
                  <span>{dm.tipoMatricula || 'Renovação'}</span>
                </td>
                <td className="border border-black p-1">
                  <span className="font-bold block text-[9px] uppercase text-gray-700">Data</span>
                  <span>{dm.dataMatricula ? new Date(dm.dataMatricula).toLocaleDateString('pt-BR') : '31/05/2026'}</span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* 1. IDENTIFICAÇÃO DO ALUNO */}
          <div className="bg-black text-white font-bold px-1.5 py-0.5 text-[10px] uppercase mb-0 tracking-wide">
            IDENTIFICAÇÃO DO ALUNO
          </div>
          <table className="w-full border-collapse border border-black mb-2 text-[10px]">
            <tbody>
              <tr>
                <td colSpan={4} className="border border-black p-1">
                  <span className="font-bold block text-[9px] text-gray-700">1 - Nome Completo do ALUNO</span>
                  <span className="font-bold text-[11px]">{aluno.nome}</span>
                </td>
              </tr>
              <tr>
                <td className="border border-black p-1 w-1/4">
                  <span className="font-bold block text-[9px] text-gray-700">2 - Nascimento</span>
                  <span>{aluno.data_nascimento ? new Date(aluno.data_nascimento).toLocaleDateString('pt-BR') : dm.nascimentoAluno || '-'}</span>
                </td>
                <td className="border border-black p-1 w-2/4" colSpan={2}>
                  <span className="font-bold block text-[9px] text-gray-700">3 - Identificação única CENSO (código INEP)</span>
                  <span>{aluno.inep || dm.censoAluno || '-'}</span>
                </td>
                <td className="border border-black p-1 w-1/4">
                  <span className="font-bold block text-[9px] text-gray-700">4 - CPF do ALUNO</span>
                  <span>{aluno.cpf || dm.cpfAluno || '-'}</span>
                </td>
              </tr>
              <tr>
                <td className="border border-black p-1">
                  <span className="font-bold block text-[9px] text-gray-700">5 - Estado Civil</span>
                  <span>{dm.estadoCivilAluno || 'Solteiro'}</span>
                </td>
                <td className="border border-black p-1">
                  <span className="font-bold block text-[9px] text-gray-700">6 - Telefone do Aluno</span>
                  <span>{aluno.telefone || dm.telefoneAluno || '-'}</span>
                </td>
                <td className="border border-black p-1">
                  <span className="font-bold block text-[9px] text-gray-700">7 - Cor/Raça</span>
                  <span>{dm.corRacaAluno || '-'}</span>
                </td>
                <td className="border border-black p-1">
                  <span className="font-bold block text-[9px] text-gray-700">8 - Sexo</span>
                  <span>{dm.sexoAluno || '-'}</span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* 2. DOCUMENTOS */}
          <div className="bg-black text-white font-bold px-1.5 py-0.5 text-[10px] uppercase mb-0 tracking-wide">
            DOCUMENTOS
          </div>
          <table className="w-full border-collapse border border-black mb-2 text-[10px]">
            <tbody>
              <tr>
                <td className="border border-black p-1 w-1/3">
                  <span className="font-bold block text-[9px] text-gray-700">9 - Número da Identidade (RG)</span>
                  <span>{aluno.rg || dm.rgAluno || '-'}</span>
                </td>
                <td className="border border-black p-1 w-1/3">
                  <span className="font-bold block text-[9px] text-gray-700">10 - Número do NIS</span>
                  <span>{aluno.nis || dm.nisAluno || '-'}</span>
                </td>
                <td className="border border-black p-1 w-1/3">
                  <span className="font-bold block text-[9px] text-gray-700">11 - Número do Cartão do SUS</span>
                  <span>{aluno.cartao_sus || dm.susAluno || '-'}</span>
                </td>
              </tr>
              <tr>
                <td colSpan={3} className="border border-black p-1">
                  <span className="font-bold block text-[9px] text-gray-700">12 - Certidão de Nascimento</span>
                  <span>{aluno.certidao_nascimento || dm.certidaoAluno || '-'}</span>
                </td>
              </tr>
              <tr>
                <td className="border border-black p-1">
                  <span className="font-bold block text-[9px] text-gray-700">13 - Nacionalidade</span>
                  <span>{dm.nacionalidadeAluno || 'BRASILEIRA'}</span>
                </td>
                <td className="border border-black p-1">
                  <span className="font-bold block text-[9px] text-gray-700">14 - Cidade de Nasc.</span>
                  <span>{dm.cidadeNascAluno || '-'}</span>
                </td>
                <td className="border border-black p-1">
                  <span className="font-bold block text-[9px] text-gray-700">15 - UF Nasc.</span>
                  <span>{dm.ufNascAluno || '-'}</span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* 3. FILIAÇÃO */}
          <div className="bg-black text-white font-bold px-1.5 py-0.5 text-[10px] uppercase mb-0 tracking-wide">
            FILIAÇÃO
          </div>
          <table className="w-full border-collapse border border-black mb-2 text-[10px]">
            <tbody>
              <tr>
                <td className="border border-black p-1 w-3/4">
                  <span className="font-bold block text-[9px] text-gray-700">16 - Mãe</span>
                  <span className="font-semibold">{aluno.nome_mae || dm.maeAluno || '-'}</span>
                </td>
                <td className="border border-black p-1 w-1/4">
                  <span className="font-bold block text-[9px] text-gray-700">17 - Tel da Mãe</span>
                  <span>{dm.telMaeAluno || '-'}</span>
                </td>
              </tr>
              <tr>
                <td className="border border-black p-1">
                  <span className="font-bold block text-[9px] text-gray-700">18 - Pai</span>
                  <span className="font-semibold">{aluno.nome_pai || dm.paiAluno || '-'}</span>
                </td>
                <td className="border border-black p-1">
                  <span className="font-bold block text-[9px] text-gray-700">19 - Tel do Pai</span>
                  <span>{dm.telPaiAluno || '-'}</span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* 4. ANO/ETAPA DE ESCOLARIZAÇÃO */}
          <div className="bg-black text-white font-bold px-1.5 py-0.5 text-[10px] uppercase mb-0 tracking-wide">
            ANO/ETAPA DE ESCOLARIZAÇÃO
          </div>
          <table className="w-full border-collapse border border-black mb-2 text-[10px]">
            <tbody>
              <tr>
                <td className="border border-black p-1 w-1/3">
                  <span className="font-bold block text-[9px] text-gray-700">Ano / Série / Etapa</span>
                  <span className="font-bold">{aluno.serie || dm.serieAluno || '-'}</span>
                </td>
                <td className="border border-black p-1 w-1/3">
                  <span className="font-bold block text-[9px] text-gray-700">Turno</span>
                  <span>{dm.turnoAluno || '-'}</span>
                </td>
                <td className="border border-black p-1 w-1/3">
                  <span className="font-bold block text-[9px] text-gray-700">Turma</span>
                  <span>{dm.turmaAluno || '-'}</span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* 5. TRANSPORTE ESCOLAR */}
          <div className="bg-black text-white font-bold px-1.5 py-0.5 text-[10px] uppercase mb-0 tracking-wide">
            TRANSPORTE ESCOLAR
          </div>
          <table className="w-full border-collapse border border-black mb-2 text-[10px]">
            <tbody>
              <tr>
                <td className="border border-black p-1 w-1/2">
                  <span className="font-bold block text-[9px] text-gray-700">24 - Utiliza Transporte Público?</span>
                  <span>{dm.transporteAluno ? 'Sim' : 'Não'}</span>
                </td>
                <td className="border border-black p-1 w-1/2">
                  <span className="font-bold block text-[9px] text-gray-700">25 - Se Sim, qual a rota?</span>
                  <span>{dm.rotaTransporteAluno || '-'}</span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* 6. ENDEREÇO */}
          <div className="bg-black text-white font-bold px-1.5 py-0.5 text-[10px] uppercase mb-0 tracking-wide">
            ENDEREÇO
          </div>
          <table className="w-full border-collapse border border-black mb-2 text-[10px]">
            <tbody>
              <tr>
                <td className="border border-black p-1 w-4/5">
                  <span className="font-bold block text-[9px] text-gray-700">26 - Rua / Logradouro</span>
                  <span>{dm.ruaAluno || aluno.endereco || '-'}</span>
                </td>
                <td className="border border-black p-1 w-1/5">
                  <span className="font-bold block text-[9px] text-gray-700">27 - Nº</span>
                  <span>{dm.numeroAluno || '-'}</span>
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="p-0">
                  <div className="grid grid-cols-4 w-full">
                    <div className="border border-black p-1">
                      <span className="font-bold block text-[9px] text-gray-700">28 - CEP</span>
                      <span>{dm.cepAluno || '-'}</span>
                    </div>
                    <div className="border border-black p-1">
                      <span className="font-bold block text-[9px] text-gray-700">29 - Bairro / Localidade</span>
                      <span>{dm.bairroAluno || '-'}</span>
                    </div>
                    <div className="border border-black p-1">
                      <span className="font-bold block text-[9px] text-gray-700">30 - Cidade</span>
                      <span>{dm.cidadeEndAluno || 'SAPE AÇU'}</span>
                    </div>
                    <div className="border border-black p-1">
                      <span className="font-bold block text-[9px] text-gray-700">31 - UF</span>
                      <span>{dm.ufEndAluno || 'BA'}</span>
                    </div>
                  </div>
                </td>
              </tr>
              <tr>
                <td className="border border-black p-1">
                  <span className="font-bold block text-[9px] text-gray-700">32 - Área de localização da residência</span>
                  <span>{dm.areaLocalizacaoAluno || 'Urbana'}</span>
                </td>
                <td className="border border-black p-1">
                  <span className="font-bold block text-[9px] text-gray-700">33 - A residência está em área diferenciada?</span>
                  <span>{dm.areaDiferenciadaAluno || 'Não está em área diferenciada'}</span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* 7. RECURSOS SAEB */}
          <div className="bg-black text-white font-bold px-1.5 py-0.5 text-[10px] uppercase mb-0 tracking-wide">
            RECURSOS PARA USO DO(A) ALUNO(A) EM SALA DE AULA E NA AVALIAÇÃO DO INEP (SAEB)
          </div>
          <table className="w-full border-collapse border border-black mb-2 text-[10px]">
            <tbody>
              <tr>
                <td className="border border-black p-1">
                  <span className="font-bold block text-[9px] text-gray-700">34 - Necessidade de recursos especiais?</span>
                  <span>{dm.recursosEspeciaisAluno === 'Sim' ? renderList(dm.recursosSelecionados) : 'Não'}</span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* 8. FICHA DE SAÚDE / ANAMNESE */}
          <div className="bg-black text-white font-bold px-1.5 py-0.5 text-[10px] uppercase mb-0 tracking-wide">
            FICHA DE SAÚDE / ANAMNESE
          </div>
          <table className="w-full border-collapse border border-black mb-2 text-[10px]">
            <tbody>
              <tr>
                <td className="border border-black p-1 w-1/4">
                  <span className="font-bold block text-[9px] text-gray-700">36 - Diabete?</span>
                  <span>{dm.diabeteAluno || 'Não'}</span>
                </td>
                <td className="border border-black p-1 w-1/4">
                  <span className="font-bold block text-[9px] text-gray-700">37 - Convulsões?</span>
                  <span>{dm.convulsoesAluno || 'Não'}</span>
                </td>
                <td className="border border-black p-1 w-1/4">
                  <span className="font-bold block text-[9px] text-gray-700">38 - Asma Brônquica?</span>
                  <span>{dm.asmaAluno || 'Não'}</span>
                </td>
                <td className="border border-black p-1 w-1/4">
                  <span className="font-bold block text-[9px] text-gray-700">39 - Infecções freq.?</span>
                  <span>{dm.infeccoesAluno || 'Não'}</span>
                </td>
              </tr>
              <tr>
                <td className="border border-black p-1">
                  <span className="font-bold block text-[9px] text-gray-700">40 - Restrição a Exercício?</span>
                  <span>{dm.restricaoExercicioAluno || 'Não'}</span>
                </td>
                <td className="border border-black p-1" colSpan={2}>
                  <span className="font-bold block text-[9px] text-gray-700">41 - Teve COVID-19? (Quando?)</span>
                  <span>{dm.covidAluno === 'Sim' ? `Sim (${dm.covidQuandoAluno || ''})` : 'Não'}</span>
                </td>
                <td className="border border-black p-1">
                  <span className="font-bold block text-[9px] text-gray-700">43 - Situação Vacinal COVID</span>
                  <span>{dm.situacaoVacinalAluno || '-'}</span>
                </td>
              </tr>
              <tr>
                <td className="border border-black p-1" colSpan={2}>
                  <span className="font-bold block text-[9px] text-gray-700">42 - Alergia a matérias/medicamentos?</span>
                  <span>{dm.alergiaMedAluno === 'Sim' ? `Sim (${dm.alergiaMedQuaisAluno || ''})` : 'Não'}</span>
                </td>
                <td className="border border-black p-1" colSpan={2}>
                  <span className="font-bold block text-[9px] text-gray-700">45 - Restrições alimentares?</span>
                  <span>{dm.restricaoAlimentarAluno === 'Sim' ? `Sim (${dm.restricaoAlimentarQuaisAluno || ''})` : 'Não'}</span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* 9. ALUNO COM NEE OU DEFICIÊNCIA */}
          <div className="bg-black text-white font-bold px-1.5 py-0.5 text-[10px] uppercase mb-0 tracking-wide">
            ALUNO(A) COM NECESSIDADE EDUCATIVA ESPECIAL OU DEFICIÊNCIA?
          </div>
          <table className="w-full border-collapse border border-black mb-4 text-[10px]">
            <tbody>
              <tr>
                <td className="border border-black p-1">
                  <span className="font-bold block text-[9px] text-gray-700">50 - Alguma Necessidade Educativa Especial (Física ou Intelectual)?</span>
                  <span>{dm.neeAluno === 'Sim' || (dm.neeSelecionadas && dm.neeSelecionadas.length > 0) ? renderList(dm.neeSelecionadas) : 'Não'}</span>
                </td>
              </tr>
              <tr>
                <td className="border border-black p-1">
                  <span className="font-bold block text-[9px] text-gray-700">51 - Aluno(a) com deficiência física, auditiva ou visual?</span>
                  <span>{dm.deficienciaAluno === 'Sim' || (dm.deficienciasSelecionadas && dm.deficienciasSelecionadas.length > 0) ? renderList(dm.deficienciasSelecionadas) : 'Não'}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Rodapé de Assinaturas (Espaço reservado para assinatura digital do responsável e funcionário) */}
        <div className="pt-6 mt-auto">
          <div className="grid grid-cols-2 gap-12 text-center text-[10px]">
            <div className="flex flex-col items-center justify-end h-20">
              <div className="h-12 flex items-center justify-center">
                {dm.assinatura_funcionario_url ? (
                  <img src={dm.assinatura_funcionario_url} alt="Assinatura Funcionário" className="max-h-12 object-contain" />
                ) : null}
              </div>
              <div className="border-t border-black w-full pt-1 text-[10px] font-semibold text-gray-800">
                Funcionário Responsável pela Matrícula
              </div>
            </div>

            <div className="flex flex-col items-center justify-end h-20">
              <div className="h-12 flex items-center justify-center">
                {dm.assinatura_responsavel_url ? (
                  <img src={dm.assinatura_responsavel_url} alt="Assinatura Responsável" className="max-h-12 object-contain" />
                ) : null}
              </div>
              <div className="border-t border-black w-full pt-1 text-[10px] font-semibold text-gray-800">
                Assinatura do Pai/Mãe/Responsável pelo(a) Aluno(a)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
