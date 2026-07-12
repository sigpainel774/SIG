'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, Printer, X, ExternalLink } from 'lucide-react'
import QRCode from 'qrcode'
import { createClient } from '@/lib/supabaseClient'

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
  escola_id?: string | null
  turma_id?: string | null
  dados_matricula?: Record<string, any>
}

interface PrintComprovanteProps {
  aluno: AlunoPrintData
  onClose?: () => void
}

export function PrintComprovanteMatricula({ aluno, onClose }: PrintComprovanteProps) {
  const [mounted, setMounted] = useState(false)
  const [imagesLoaded, setImagesLoaded] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState('')

  const dm = aluno.dados_matricula || {}
  const autorizaImagemVoz = dm.autoriza_imagem_voz || 'Não'

  useEffect(() => {
    if (dm.pdf_assinado_token) {
      const siteUrl = window.location.origin
      QRCode.toDataURL(`${siteUrl}/verificar/${dm.pdf_assinado_token}`, { margin: 1, width: 80 })
        .then(setQrCodeUrl)
        .catch(err => console.error('Erro ao gerar QR Code:', err))
    }
  }, [dm.pdf_assinado_token])

  // Prevenção de Cache com timestamp
  const getCacheBustedUrl = (url: string) => {
    if (!url) return ''
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}t=${Date.now()}`
  }

  useEffect(() => {
    const fetchDados = async () => {
      const supabase = createClient()
      
      // 1. Unidade Escolar
      const targetEscolaId = aluno.escola_id || dm.escolaId
      if (targetEscolaId) {
        const { data: esc } = await supabase
          .from('escolas')
          .select('nome')
          .eq('id', targetEscolaId)
          .single()
        if (esc) {
          setEscolaNome(esc.nome)
        }
      }

      // 2. Turma e Ano
      const targetTurmaId = aluno.turma_id || dm.turmaIdAluno
      if (targetTurmaId) {
        const { data: tur } = await supabase
          .from('turmas')
          .select('nome, turno')
          .eq('id', targetTurmaId)
          .single()
        if (tur) {
          setTurnoVal(tur.turno || '')
          
          // Parse class name e.g. "6° A" or "6º A" or "6 - A"
          const nomeTurma = tur.nome || ''
          const regex = /^(\d+)(?:\s*[-°ºª]?\s*)([a-zA-Z])$/i
          const match = nomeTurma.trim().match(regex)
          if (match) {
            setTurmaAno(`${match[1]}º ANO`)
            setTurmaLetra(match[2].toUpperCase())
          } else {
            // Fallback split
            const parts = nomeTurma.split(/[\s-]+/)
            if (parts.length >= 2) {
              setTurmaAno(parts[0])
              setTurmaLetra(parts[parts.length - 1].toUpperCase())
            } else {
              setTurmaAno(nomeTurma)
              setTurmaLetra('')
            }
          }
        }
      }
    }

    // Declarar variáveis de estado de fetchDados
    fetchDados()
  }, [aluno.escola_id, aluno.turma_id, dm.escolaId, dm.turmaIdAluno])

  const [escolaNome, setEscolaNome] = useState('')
  const [turmaAno, setTurmaAno] = useState('')
  const [turmaLetra, setTurmaLetra] = useState('')
  const [turnoVal, setTurnoVal] = useState('')

  useEffect(() => {
    setMounted(true)

    // Lista de imagens para pré-carregar
    const logoPrefeitura = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logos/logo-prefeitura.png`
    const logoSecretaria = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logos/logo-secretaria.jpg`
    
    const imageUrls = [logoPrefeitura, logoSecretaria]
    if (dm.assinatura_responsavel_url) imageUrls.push(dm.assinatura_responsavel_url)
    if (dm.assinatura_funcionario_url) imageUrls.push(dm.assinatura_funcionario_url)

    const preloadAll = async () => {
      const promises = imageUrls.map((url) => {
        return new Promise((resolve) => {
          const img = new Image()
          img.src = getCacheBustedUrl(url)
          img.onload = () => resolve(true)
          img.onerror = () => resolve(false) // Não trava a impressão se uma falhar
        })
      })
      await Promise.all(promises)
      setImagesLoaded(true)
    }

    preloadAll()

    return () => setMounted(false)
  }, [dm.assinatura_responsavel_url, dm.assinatura_funcionario_url])



  if (!mounted) return null

  const renderComprovanteVia = (isTopCopy: boolean) => {
    const dataMatriculaFormatada = dm.dataMatricula 
      ? new Date(dm.dataMatricula).toLocaleDateString('pt-BR') 
      : new Date().toLocaleDateString('pt-BR')

    const rawSerie = aluno.serie || dm.serieAluno || ''
    let exibidoAno = '-'
    let exibidoTurma = '-'

    // Tenta encontrar o ano e a turma combinando as informações
    const match = rawSerie.trim().match(/^(\d+)(?:\s*[-°ºª]?\s*)([a-zA-Z])$/i)
    if (match) {
      exibidoAno = match[1]
      exibidoTurma = match[2].toUpperCase()
    } else {
      exibidoAno = rawSerie || turmaAno || '-'
      exibidoTurma = dm.turmaAluno || turmaLetra || '-'
    }

    return (
      <div className="flex flex-col justify-between min-h-[130mm] h-auto border border-gray-400 p-4 rounded-lg bg-white print:border-none print:p-0 print:h-[130mm]">
        <div>
          {/* Cabeçalho */}
          <div className="flex items-center justify-between pb-1.5 border-b border-black mb-2">
            <div className="flex items-center gap-2 max-w-[130px]">
              <img 
                src={getCacheBustedUrl(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logos/logo-prefeitura.png`)} 
                alt="Prefeitura de Sapeaçu" 
                className="h-12 w-auto object-contain"
              />
            </div>

            <div className="text-center flex-1 px-1">
              <h2 className="text-[10px] font-extrabold tracking-wider text-gray-800 uppercase leading-none">ESTADO DA BAHIA</h2>
              <h3 className="text-[11px] font-black text-gray-900 uppercase">PREFEITURA MUNICIPAL DE SAPEAÇU</h3>
              <p className="text-[8.5px] font-bold text-gray-600">SECRETARIA MUNICIPAL DE EDUCAÇÃO</p>
            </div>

            <div className="text-right max-w-[135px]">
              <img 
                src={getCacheBustedUrl(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logos/logo-secretaria.jpg`)} 
                alt="Secretaria de Educação" 
                className="h-9 w-auto object-contain"
              />
            </div>
          </div>

          {/* Título */}
          <div className="text-center bg-gray-100 py-0.5 rounded border border-gray-300 mb-1.5">
            <h1 className="text-[10px] font-black uppercase text-gray-900 tracking-wider">
              COMPROVANTE DE MATRÍCULA - ANO LETIVO {dm.anoLetivo || '2026'}
            </h1>
          </div>

          {/* Dados da Matrícula */}
          <table className="w-full border-collapse border border-black mb-1.5 text-[8.5px] font-mono leading-tight">
            <tbody>
              <tr>
                <td className="border border-black p-1 w-3/4 font-semibold">
                  <span className="font-bold block text-[8px] uppercase font-sans text-gray-700">Unidade Escolar</span>
                  <span className="text-[10px]">{escolaNome || aluno.escola_nome || dm.escolaNome || 'Sem Escola'}</span>
                </td>
                <td className="border border-black p-1 w-1/4">
                  <span className="font-bold block text-[8px] uppercase font-sans text-gray-700">Data</span>
                  <span className="text-[10px] font-bold">{dataMatriculaFormatada}</span>
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="border border-black p-1">
                  <span className="font-bold block text-[8px] uppercase font-sans text-gray-700">Aluno(a)</span>
                  <span className="text-[10px] font-bold uppercase">{aluno.nome}</span>
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="p-0">
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr>
                        <td className="border-r border-black p-1 w-1/3">
                          <span className="font-bold block text-[8px] uppercase font-sans text-gray-700">Ano</span>
                          <span>{exibidoAno}</span>
                        </td>
                        <td className="border-r border-black p-1 w-1/3">
                          <span className="font-bold block text-[8px] uppercase font-sans text-gray-700">Turma</span>
                          <span>{exibidoTurma}</span>
                        </td>
                        <td className="p-1 w-1/3">
                          <span className="font-bold block text-[8px] uppercase font-sans text-gray-700">Turno</span>
                          <span>{dm.turnoAluno || turnoVal || 'Matutino'}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="p-0 border-t border-black">
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr>
                        <td className="border-r border-black p-1 w-1/2">
                          <span className="font-bold block text-[8px] uppercase font-sans text-gray-700">Nº Identidade (RG)</span>
                          <span>{aluno.rg || dm.rgAluno || '-'}</span>
                        </td>
                        <td className="p-1 w-1/2">
                          <span className="font-bold block text-[8px] uppercase font-sans text-gray-700">CPF</span>
                          <span>{aluno.cpf || dm.cpfAluno || '-'}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Termo de Compromisso */}
          <div className="mb-1.5">
            <div className="bg-gray-200 text-black font-black px-1.5 py-0.5 text-[7.5px] uppercase border border-black border-b-0 tracking-wider">
              TERMO DE COMPROMISSO DO RESPONSÁVEL LEGAL
            </div>
            <div className="border border-black p-1 text-[7px] leading-normal text-justify text-gray-800 bg-white/50 space-y-0.5">
              <p>
                Declaro, sob as penas da Lei, que as informações prestadas bem como documentos que apresento para a matrícula são verdadeiros e autênticos (fiéis à verdade e condizentes com a realidade).
              </p>
              <p>
                Estou ciente de que as informações contidas nesta ficha são muito importantes para o registro do CENSO ESCOLAR e para que a escola possa tomar as providências necessárias em caso de acidentes ou doenças durante a permanência do aluno no período de aulas. Firmo acordo de informar a escola caso haja qualquer mudança nas informações aqui prestadas e a manter-las sempre atualizada.
              </p>
              <p>
                Comprometo-me pelo zelo e preservação do patrimônio desta Escola e responsabilizo-me pelo ressarcimento de quaisquer danos e prejuízo causados pelo aluno sob nossa responsabilidade.
              </p>
            </div>
          </div>

          {/* Uso de Imagem e Voz */}
          <div className="mb-2">
            <div className="bg-gray-200 text-black font-black px-1.5 py-0.5 text-[7.5px] uppercase border border-black border-b-0 tracking-wider">
              USO DE IMAGEM E VOZ
            </div>
            <div className="border border-black p-1 text-[7px] leading-snug text-justify text-gray-800 bg-white/50 flex flex-col md:flex-row md:items-center justify-between gap-1">
              <p className="flex-1">
                Neste ato, e para todos os fins de direito admitidos autorizo expressamente a utilização da imagem e voz do alunos acima discriminado, em caráter definitivo e gratuito, constante em fotos e filmagens decorrentes da sua participação em eventos da Secretaria Municipal de Educação de Sapeaçu-Bahia.
              </p>
              <div className="flex gap-4 font-bold shrink-0 text-[7.5px] pr-2">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 inline-flex items-center justify-center border border-black font-mono">
                    {autorizaImagemVoz === 'Sim' ? 'X' : ' '}
                  </span>
                  Sim, autorizo.
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 inline-flex items-center justify-center border border-black font-mono">
                    {autorizaImagemVoz === 'Não' ? 'X' : ' '}
                  </span>
                  Não, não autorizo.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Assinaturas */}
        <div className="pt-1.5">
          <div className="grid grid-cols-2 gap-8 text-center text-[7px] mb-1">
            {/* Responsável pela Matrícula (Funcionário) */}
            <div className="flex flex-col items-center justify-end h-12">
              <div className="h-7 flex items-center justify-center mb-0.5">
                {dm.assinatura_funcionario_url ? (
                  <img 
                    src={getCacheBustedUrl(dm.assinatura_funcionario_url)} 
                    alt="Assinatura Funcionário" 
                    className="max-h-7 w-auto object-contain filter brightness-95" 
                  />
                ) : null}
              </div>
              <div className="border-t border-black w-full pt-0.5 font-bold uppercase text-gray-800">
                {isTopCopy ? 'Assinatura do funcionário responsável pela matrícula' : 'Funcionário Responsável pela matrícula'}
              </div>
            </div>

            {/* Pai/Mãe/Responsável */}
            <div className="flex flex-col items-center justify-end h-12">
              <div className="h-7 flex items-center justify-center mb-0.5">
                {dm.assinatura_responsavel_url ? (
                  <img 
                    src={getCacheBustedUrl(dm.assinatura_responsavel_url)} 
                    alt="Assinatura Responsável" 
                    className="max-h-7 w-auto object-contain filter brightness-95" 
                  />
                ) : null}
              </div>
              <div className="border-t border-black w-full pt-0.5 font-bold uppercase text-gray-800">
                Assinatura do Pai/Mãe/Responsável pelo aluno(a)
              </div>
            </div>
          </div>

          {/* Tarja de Autenticidade Digital */}
          {qrCodeUrl && (
            <div className="mt-1 pt-1 border-t border-gray-300 flex items-center gap-3 text-[7px] text-gray-600 font-mono leading-tight bg-gray-50/50 p-1 rounded border border-gray-200">
              <img src={qrCodeUrl} alt="QR Code Verificação" className="h-8.5 w-8.5 shrink-0 border border-gray-300 p-0.5 rounded bg-white" />
              <div className="flex-1 space-y-0.5 text-left">
                <span className="font-bold text-gray-800 uppercase block text-[7px]">DOCUMENTO ASSINADO ELETRONICAMENTE</span>
                <span className="block">Chave de Verificação: <strong className="text-gray-900">{dm.pdf_assinado_token}</strong></span>
                <span className="block truncate">Hash SHA-256: <strong className="text-gray-900 text-[6px]">{dm.pdf_assinado_hash}</strong></span>
                <span className="block text-[6px] text-gray-500">Valide este comprovante lendo o QR Code ou em: {window.location.origin}/verificar/{dm.pdf_assinado_token}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-4 overflow-y-auto print:static print:block print:p-0 print:bg-white print:overflow-visible print-portal-container">
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
            margin: 8mm 10mm;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-hidden {
            display: none !important;
          }
        }
      `}</style>

      {/* Botões de Ação na tela (Ocultos na Impressão) */}
      <div className="fixed top-4 right-4 z-[100] flex gap-2 print-hidden">
        <button
          onClick={() => window.print()}
          disabled={!imagesLoaded}
          className="px-4 py-2.5 bg-[#10b981] hover:bg-[#10b981]/90 text-white font-bold rounded-lg shadow-lg flex items-center gap-2 text-xs transition-all cursor-pointer disabled:opacity-50"
        >
          {imagesLoaded ? (
            <>
              <Printer className="w-4 h-4" />
              <span>Imprimir Comprovante</span>
            </>
          ) : (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Carregando Imagens...</span>
            </>
          )}
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2.5 bg-[#27272a] hover:bg-[#3f3f46] text-white rounded-lg text-xs font-semibold border border-[#3f3f46] transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <X className="w-4 h-4" />
          <span>Fechar</span>
        </button>
      </div>

      {/* Conteúdo do Comprovante em A4 */}
      <div 
        className="bg-white text-black w-full max-w-[800px] p-6 shadow-2xl rounded-sm print:shadow-none print:p-0 print:w-full print:max-w-none flex flex-col justify-between my-auto border border-gray-300 print:border-none print:m-0 space-y-6 print:space-y-8"
        style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
      >
        {/* Via Superior */}
        {renderComprovanteVia(true)}

        {/* Divisor das Vias */}
        <div className="relative py-2 print-hidden">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-dashed border-gray-400"></div>
          </div>
          <div className="relative flex justify-center text-[10px] font-bold text-gray-500 uppercase">
            <span className="bg-white px-3 border border-gray-300 rounded-full py-0.5">Destaque/Corte aqui</span>
          </div>
        </div>
        
        {/* Via do Divisor para impressão real */}
        <div className="hidden print:block border-t-2 border-dashed border-black my-2"></div>

        {/* Via Inferior */}
        {renderComprovanteVia(false)}
      </div>
    </div>,
    document.body
  )
}
