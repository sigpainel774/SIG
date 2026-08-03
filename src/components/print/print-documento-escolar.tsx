'use client'

import React, { useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { PrintHeader } from '@/components/print/print-header'
import { Printer, X, Loader2, Award, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { useSchoolStore } from '@/store/useSchoolStore'
import QRCode from 'qrcode'
import { toast } from 'sonner'

function generateVerificacaoToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let token = ''
  for (let i = 0; i < 8; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

interface PrintDocumentoProps {
  aluno?: any
  docType: 'atestado-matricula' | 'atestado-frequencia' | 'declaracao-vaga' | 'atestado-transferencia' | 'oficio'
  dadosOficio?: {
    numeroOficio: string
    destinatario: string
    assunto: string
    conteudoHtml: string
  }
  tokenExistente?: string | null
  onClose: () => void
}

export function PrintDocumentoEscolar({ aluno, docType, dadosOficio, tokenExistente, onClose }: PrintDocumentoProps) {
  const [mounted, setMounted] = useState(false)
  const [imagesLoaded, setImagesLoaded] = useState(false)
  
  const [escolaNome, setEscolaNome] = useState('')
  const [escolaLogoUrl, setEscolaLogoUrl] = useState<string | null>(null)
  const [escolaInep, setEscolaInep] = useState('')
  const [diretorNome, setDiretorNome] = useState('')
  const [diretorAssinaturaUrl, setDiretorAssinaturaUrl] = useState<string | null>(null)

  const [turmaNome, setTurmaNome] = useState('')
  const [turnoVal, setTurnoVal] = useState('')

  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [tokenVerificacao, setTokenVerificacao] = useState('')
  const [hashSha256, setHashSha256] = useState('')
  const [dataEmissao, setDataEmissao] = useState<string | null>(null)
  const [registrandoAssinatura, setRegistrandoAssinatura] = useState(false)
  const [localDadosOficio, setLocalDadosOficio] = useState<any>(dadosOficio || null)

  useEffect(() => {
    if (dadosOficio) {
      setLocalDadosOficio(dadosOficio)
    }
  }, [dadosOficio])

  const { funcionario } = useAuthStore()
  const { selectedEscola, selectedSecretaria } = useSchoolStore()

  const secNome = selectedSecretaria?.nome || selectedEscola?.secretariaNome || (selectedEscola?.secretarias as any)?.nome || ''
  const isSaudeContext = /sa[uú]de/i.test(secNome) || selectedEscola?.tipo === 'SAUDE' || selectedEscola?.tipo === 'UNIDADE_SAUDE' || docType === 'oficio'
  const nomeSecretariaOficial = isSaudeContext ? "SECRETARIA MUNICIPAL DE SAÚDE" : (secNome.toUpperCase() || "SECRETARIA MUNICIPAL DE EDUCAÇÃO")

  const dm = aluno.dados_matricula || {}
  const dataNascimentoFormatada = (() => {
    if (!aluno.data_nascimento) return 'Não informada'
    const parts = aluno.data_nascimento.split('-')
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    return new Date(aluno.data_nascimento).toLocaleDateString('pt-BR')
  })()
  
  const filiacao = [aluno.nome_mae, aluno.nome_pai].filter(Boolean).join(' e ') || 'Não informada'
  const anoLetivo = dm.anoLetivo || new Date().getFullYear().toString()

  const [timestamp] = useState(() => Date.now())

  const getCacheBustedUrl = (url: string) => {
    if (!url) return ''
    if (url.startsWith('data:')) return url
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}t=${timestamp}`
  }

  useEffect(() => {
    const fetchDados = async () => {
      const supabase = createClient()
      
      // 1. Unidade Escolar e Assinatura do Diretor
      const targetEscolaId = aluno?.escola_id || dm.escolaId
      if (targetEscolaId) {
        const { data: esc } = await supabase
          .from('escolas')
          .select('*, funcionarios!diretor_id(nome)')
          .eq('id', targetEscolaId)
          .maybeSingle()
        
        if (esc) {
          setEscolaNome(esc.nome)
          setEscolaLogoUrl(esc.logo_url || null)
          setEscolaInep(esc.inep || '')
          setDiretorAssinaturaUrl(esc.assinatura_diretor_url || null)
          if (esc.funcionarios) {
            setDiretorNome(esc.funcionarios.nome)
          }
        }
      }

      // 2. Turma e Turno
      const targetTurmaId = aluno?.turma_id || dm.turmaIdAluno
      if (targetTurmaId) {
        const { data: tur } = await supabase
          .from('turmas')
          .select('nome, turno')
          .eq('id', targetTurmaId)
          .maybeSingle()
        if (tur) {
          setTurmaNome(tur.nome || '')
          setTurnoVal(tur.turno || '')
        }
      }
    }

    fetchDados()
  }, [aluno?.escola_id, aluno?.turma_id, dm.escolaId, dm.turmaIdAluno])

  // Carregar assinatura existente se houver (Modo Histórico)
  useEffect(() => {
    if (tokenExistente) {
      const loadAssinatura = async () => {
        const supabase = createClient()
        const { data } = await supabase
          .from('assinatura')
          .select('*')
          .eq('token_verificacao', tokenExistente)
          .maybeSingle()

        if (data) {
          const item = data as any
          setTokenVerificacao(item.token_verificacao)
          setHashSha256(item.hash_sha256)
          setDataEmissao(item.data_funcionario || item.criado_em)
          if (item.dados_documento) {
            setLocalDadosOficio(item.dados_documento)
          }
          
          const siteUrl = window.location.origin
          const qrUrl = await QRCode.toDataURL(`${siteUrl}/verificar/${data.token_verificacao}`, { margin: 1, width: 80 })
          setQrCodeUrl(qrUrl)
        }
      }
      loadAssinatura()
    }
  }, [tokenExistente])

  useEffect(() => {
    setMounted(true)

    // Preload de imagens
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nijjizpcodnjhvqwjuso.supabase.co'
    const logoPrefeitura = `${supabaseUrl}/storage/v1/object/public/logos/logo-prefeitura.png`
    const logoEducacao = `${supabaseUrl}/storage/v1/object/public/alunos-anexos/logos/sec_1785727158753_educacao_final.png`
    const logoSaude = `${supabaseUrl}/storage/v1/object/public/alunos-anexos/logos/sec_1785727067249_icone_saude_clean.png`
    
    const logoSecretaria = isSaudeContext ? logoSaude : logoEducacao
    
    const imageUrls = [logoPrefeitura, logoSecretaria]
    if (escolaLogoUrl) imageUrls.push(escolaLogoUrl)
    if (diretorAssinaturaUrl) imageUrls.push(diretorAssinaturaUrl)

    const preloadAll = async () => {
      const promises = imageUrls.map((url) => {
        return new Promise((resolve) => {
          const img = new Image()
          img.src = getCacheBustedUrl(url)
          img.onload = () => resolve(true)
          img.onerror = () => resolve(false)
        })
      })
      await Promise.all(promises)
      setImagesLoaded(true)
    }

    preloadAll()

    return () => setMounted(false)
  }, [escolaLogoUrl, diretorAssinaturaUrl])

  if (!mounted) return null

  const getDocumentTitle = () => {
    if (docType === 'oficio') return 'OFÍCIO'
    if (docType === 'atestado-matricula') return 'ATESTADO DE MATRÍCULA'
    if (docType === 'atestado-frequencia') return 'ATESTADO DE FREQUÊNCIA'
    if (docType === 'atestado-transferencia') return 'ATESTADO DE TRANSFERÊNCIA'
    return 'DECLARAÇÃO DE VAGA'
  }

  const renderDocumentContent = () => {
    if (docType === 'oficio') {
      const activeDados = dadosOficio || localDadosOficio
      const numOficio = activeDados?.numeroOficio || `_____ / ${anoLetivo}`
      const dest = activeDados?.destinatario || 'Ao(À) Senhor(a): ________________________________________'
      const ass = activeDados?.assunto || 'Assunto: ________________________________________________'
      const htmlBody = activeDados?.conteudoHtml || `<p>Cumprimentando-o(a) cordialmente, vimos por meio deste encaminhar a comunicação oficial desta Secretaria / Unidade de Saúde, colocando-nos à inteira disposição para maiores esclarecimentos que se fizerem necessários.</p><p>Sem mais para o momento, renovamos nossos protestos de elevada estima e distinta consideração.</p>`

      return (
        <div className="space-y-3 min-h-[180px]">
          <div className="text-left font-bold text-sm text-gray-900">
            OFÍCIO Nº {numOficio}
          </div>
          <div className="text-left text-xs font-semibold text-gray-800 space-y-0.5">
            <p>{dest.startsWith('Ao') ? dest : `Ao(À) Senhor(a): ${dest}`}</p>
            <p>{ass.startsWith('Assunto') ? ass : `Assunto: ${ass}`}</p>
          </div>
          <div
            className="oficio-print-body text-justify text-sm text-gray-900 leading-relaxed pt-1"
            dangerouslySetInnerHTML={{ __html: htmlBody }}
          />
        </div>
      )
    }

    const nomeAluno = aluno?.nome?.toUpperCase() || '_________________________________'
    const matriculaId = aluno?.numero_matricula || aluno?.id || 'N/A'
    const cursoTurno = turnoVal?.toUpperCase() || '___________________'
    const cursoTurma = turmaNome?.toUpperCase() || '___________________'
    const nascimento = dataNascimentoFormatada

    const cpfFormatado = aluno.cpf?.trim() ? `nº ${aluno.cpf.trim()}` : 'não informado'

    const filiacaoFormatada = (() => {
      const pai = aluno.nome_pai?.trim()
      const mae = aluno.nome_mae?.trim()
      if (pai && mae) {
        return (
          <>
            filho(a) do Sr. <strong className="text-black font-semibold">{pai}</strong> e da Sra.{' '}
            <strong className="text-black font-semibold">{mae}</strong>
          </>
        )
      } else if (mae) {
        return (
          <>
            filho(a) da Sra. <strong className="text-black font-semibold">{mae}</strong>
          </>
        )
      } else if (pai) {
        return (
          <>
            filho(a) do Sr. <strong className="text-black font-semibold">{pai}</strong>
          </>
        )
      }
      return <>filiação não informada</>
    })()

    const cursoSerieFormatado = (() => {
      if (aluno.serie?.trim()) {
        return aluno.serie.trim()
      }
      if (turmaNome?.trim()) {
        return turmaNome.trim()
      }
      return '___________________'
    })()

    if (docType === 'atestado-transferencia') {
      return (
        <div className="space-y-6">
          <p className="text-justify text-sm text-gray-800 leading-relaxed indent-12">
            Atesto, para os devidos fins de direito, que o(a) aluno(a){' '}
            <strong className="text-black font-bold">{nomeAluno}</strong>, nascido(a) em{' '}
            <strong className="text-black font-semibold">{nascimento}</strong>, portador(a) do CPF{' '}
            <strong className="text-black font-semibold">{cpfFormatado}</strong>, {filiacaoFormatada}, está
            matriculado(a) e frequenta a{' '}
            <strong className="text-black font-bold">{escolaNome || 'Unidade Escolar'}</strong>, cursando o{' '}
            <strong className="text-black font-bold">{cursoSerieFormatado}</strong> no ano letivo de{' '}
            <strong className="text-black font-bold">{anoLetivo}</strong>.
          </p>

          <p className="text-justify text-sm text-gray-800 leading-relaxed indent-12">
            Consta o pedido de transferência em curso, e o referido documento poderá ser disponibilizado no prazo de 60
            a 120 dias, a contar desta data.
          </p>
        </div>
      )
    }

    if (docType === 'atestado-matricula') {
      return (
        <p className="text-justify text-sm text-gray-800 leading-relaxed indent-12">
          Atestamos, para os devidos fins de direito, junto a quem interessar possa, que o(a) estudante{' '}
          <strong className="text-black font-bold">{nomeAluno}</strong>, nascido(a) em{' '}
          <strong className="text-black font-semibold">{nascimento}</strong>, filho(a) de{' '}
          <strong className="text-black font-semibold">{filiacao}</strong>, está regularmente matriculado(a) e
          frequentando as aulas nesta Unidade Escolar sob a matrícula nº{' '}
          <strong className="text-black font-bold">{matriculaId}</strong>, no Ano Letivo de{' '}
          <strong className="text-black font-bold">{anoLetivo}</strong>, cursando a turma{' '}
          <strong className="text-black font-bold">{cursoTurma}</strong> no turno{' '}
          <strong className="text-black font-semibold">{cursoTurno}</strong>.
        </p>
      )
    }

    if (docType === 'atestado-frequencia') {
      return (
        <p className="text-justify text-sm text-gray-800 leading-relaxed indent-12">
          Atestamos, para os devidos fins de comprovação, que o(a) estudante{' '}
          <strong className="text-black font-bold">{nomeAluno}</strong>, nascido(a) em{' '}
          <strong className="text-black font-semibold">{nascimento}</strong>, filho(a) de{' '}
          <strong className="text-black font-semibold">{filiacao}</strong>, é aluno(a) regular desta Unidade
          Escolar, devidamente matriculado(a) no Ano Letivo de{' '}
          <strong className="text-black font-bold">{anoLetivo}</strong>, cursando a turma{' '}
          <strong className="text-black font-bold">{cursoTurma}</strong> no turno{' '}
          <strong className="text-black font-semibold">{cursoTurno}</strong>, e apresenta frequência regular às
          atividades escolares até a presente data.
        </p>
      )
    }

    // Declaração de Vaga
    return (
      <p className="text-justify text-sm text-gray-800 leading-relaxed indent-12">
        Declaramos, para os devidos fins de transferência escolar, que esta Unidade Escolar dispõe de vaga garantida
        para o Ano Letivo de <strong className="text-black font-bold">{anoLetivo}</strong> para o(a) estudante{' '}
        <strong className="text-black font-bold">{nomeAluno}</strong>, nascido(a) em{' '}
        <strong className="text-black font-semibold">{nascimento}</strong>, filho(a) de{' '}
        <strong className="text-black font-semibold">{filiacao}</strong>, a fim de ser matriculado(a) na turma{' '}
        <strong className="text-black font-bold">{cursoTurma}</strong> no turno{' '}
        <strong className="text-black font-semibold">{cursoTurno}</strong>, mediante a apresentação de seu
        Histórico Escolar original e demais documentos exigidos por lei para a efetivação da transferência.
      </p>
    )
  }

  // Data de emissão ou data atual formatada por extenso
  const dataRef = dataEmissao ? new Date(dataEmissao) : new Date()
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]
  const dataPorExtenso = `Sapeaçu - BA, ${dataRef.getDate()} de ${meses[dataRef.getMonth()]} de ${dataRef.getFullYear()}.`

  const triggerPrintWithTitle = () => {
    const originalTitle = document.title
    const activeDados = dadosOficio || localDadosOficio
    let customTitle = `Ofício ${activeDados?.numeroOficio ? activeDados.numeroOficio.replace(/\//g, '-').trim() : `001-${anoLetivo}`} - Secretaria de Saúde`
    if (docType !== 'oficio') {
      const nomeAluno = aluno?.nome ? aluno.nome.trim() : 'Estudante'
      if (docType === 'atestado-matricula') customTitle = `Atestado de Matrícula - ${nomeAluno}`
      else if (docType === 'atestado-frequencia') customTitle = `Atestado de Frequência - ${nomeAluno}`
      else if (docType === 'declaracao-vaga') customTitle = `Declaração de Vaga - ${nomeAluno}`
      else if (docType === 'atestado-transferencia') customTitle = `Atestado de Transferência - ${nomeAluno}`
      else customTitle = `Documento Oficial - ${nomeAluno}`
    }
    
    try {
      document.title = customTitle
      window.print()
    } finally {
      setTimeout(() => {
        document.title = originalTitle
      }, 1200)
    }
  }

  const handlePrint = async () => {
    if (tokenVerificacao) {
      triggerPrintWithTitle()
      return
    }

    setRegistrandoAssinatura(true)
    const supabase = createClient()

    try {
      // 1. Obter IP externo (com fallback rápido)
      let ip = '127.0.0.1'
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json')
        if (ipRes.ok) {
          const ipData = await ipRes.json()
          ip = ipData.ip
        }
      } catch (ipErr) {
        console.error('Erro ao obter IP externo:', ipErr)
      }

      // 2. Gerar Token e Hash
      const token = generateVerificacaoToken()
      
      const nomeAluno = aluno.nome?.toUpperCase() || ''
      const matriculaId = aluno.numero_matricula || aluno.id || ''
      const cursoTurma = turmaNome?.toUpperCase() || ''
      
      let hashHex = ''
      const payload = nomeAluno + matriculaId + cursoTurma + anoLetivo + new Date().toISOString() + token
      if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
        const msgUint8 = new TextEncoder().encode(payload)
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
      } else {
        // Fallback para hashes sem HTTPS / crypto.subtle indisponível
        let hash = 0
        for (let i = 0; i < payload.length; i++) {
          const char = payload.charCodeAt(i)
          hash = (hash << 5) - hash + char
          hash = hash & hash // Convert to 32bit integer
        }
        hashHex = Math.abs(hash).toString(16).padEnd(64, 'a')
      }

      // 3. Salvar no banco
      const targetAlunoId = (aluno?.id && aluno.id !== 'oficio') ? aluno.id : null

      const activeDadosPayload = (dadosOficio || localDadosOficio) ? {
        numeroOficio: (dadosOficio || localDadosOficio)?.numeroOficio,
        destinatario: (dadosOficio || localDadosOficio)?.destinatario,
        assunto: (dadosOficio || localDadosOficio)?.assunto,
        conteudoHtml: (dadosOficio || localDadosOficio)?.conteudoHtml,
      } : null

      const { error: insertError } = await supabase
        .from('assinatura')
        .insert({
          aluno_id: targetAlunoId,
          tipo_documento: docType,
          token_verificacao: token,
          hash_sha256: hashHex,
          ip_funcionario: ip,
          user_agent_funcionario: navigator.userAgent,
          dispositivo_funcionario: window.innerWidth < 768 ? 'Celular' : 'Computador',
          data_funcionario: new Date().toISOString(),
          dados_documento: activeDadosPayload
        } as any)

      if (insertError) throw insertError

      // 4. Deletar atestados/documentos anteriores deste mesmo tipo
      if (targetAlunoId) {
        await supabase
          .from('assinatura')
          .delete()
          .eq('aluno_id', targetAlunoId)
          .eq('tipo_documento', docType)
          .neq('token_verificacao', token)
      }

      // 5. Atualizar QR Code no state
      const siteUrl = window.location.origin
      const qrUrl = await QRCode.toDataURL(`${siteUrl}/verificar/${token}`, { margin: 1, width: 80 })
      
      setQrCodeUrl(qrUrl)
      setTokenVerificacao(token)
      setHashSha256(hashHex)
      setDataEmissao(new Date().toISOString())

      // Pequeno timeout para garantir a renderização antes de disparar o print do browser
      setTimeout(() => {
        triggerPrintWithTitle()
      }, 300)

    } catch (err: any) {
      console.error('Erro ao registrar assinatura eletrônica:', err)
      toast.error('Erro ao validar assinatura eletrônica: ' + err.message)
    } finally {
      setRegistrandoAssinatura(false)
    }
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
            background: white !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          @page {
            size: A4 portrait;
            margin: 8mm 12mm;
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
          .oficio-print-body p {
            margin-bottom: 0.5rem;
            line-height: 1.5;
            text-align: justify;
            text-indent: 1.5rem;
          }
          .oficio-print-body p:last-child {
            margin-bottom: 0;
          }
        }
      `}</style>

      {/* Botões de Ações Flutuantes */}
      <div className="fixed top-4 right-4 z-[101] flex gap-3 print-hidden items-center">
        {!tokenVerificacao && (
          <span className="text-amber-400 text-xs font-semibold mr-2 bg-amber-950/30 px-3 py-1.5 rounded-lg border border-amber-900/30">
            ⚠️ O QR Code de validade digital e a assinatura eletrônica serão gerados ao clicar em imprimir.
          </span>
        )}
        <button
          onClick={handlePrint}
          disabled={!imagesLoaded || registrandoAssinatura}
          className="px-4 py-2.5 bg-[#10b981] hover:bg-[#10b981]/90 text-white font-bold rounded-lg shadow-lg flex items-center gap-2 text-xs transition-all cursor-pointer disabled:opacity-50"
        >
          {registrandoAssinatura ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Gerando Autenticidade...</span>
            </>
          ) : imagesLoaded ? (
            <>
              <Printer className="w-4 h-4" />
              <span>{tokenVerificacao ? 'Imprimir Documento' : 'Gerar QR Code & Imprimir'}</span>
            </>
          ) : (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Carregando Assinaturas...</span>
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

      {/* Folha A4 */}
      <div
        className="bg-white text-black w-full max-w-[800px] min-h-[1000px] p-6 sm:p-8 shadow-2xl rounded-sm print:shadow-none print:p-0 print:w-full print:max-w-none flex flex-col justify-between my-auto border border-gray-300 print:border-none print:m-0"
        style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
      >
        <div>
          {/* Cabeçalho Oficial da Prefeitura/SME */}
          <PrintHeader
            className="pb-2 border-b border-black mb-2"
            estado="ESTADO DA BAHIA"
            municipio="PREFEITURA MUNICIPAL DE SAPEAÇU"
            secretaria={nomeSecretariaOficial}
          />

          {/* Sub-Cabeçalho com Logo da Escola (Se Houver) */}
          <div className="flex flex-col items-center text-center space-y-0.5 mb-2">
            {escolaLogoUrl && (
              <img
                src={getCacheBustedUrl(escolaLogoUrl)}
                alt={escolaNome}
                className="h-10 w-auto object-contain mb-0.5"
              />
            )}
            <h1 className="text-sm sm:text-base font-black text-gray-900 uppercase tracking-wide">
              {escolaNome || (docType === 'oficio' ? nomeSecretariaOficial : 'UNIDADE ESCOLAR MUNICIPAL')}
            </h1>
            {escolaInep && (
              <p className="text-[11px] font-semibold text-gray-800 tracking-wider uppercase">
                Código do INEP: {escolaInep}
              </p>
            )}
            <div className="w-12 h-0.5 bg-black mt-0.5"></div>
          </div>

          {/* Título do Documento */}
          <div className="text-center mb-2">
            <h2 className="text-[13px] font-black uppercase text-gray-900 tracking-widest underline decoration-2 underline-offset-4">
              {getDocumentTitle()}
            </h2>
          </div>

          {/* Corpo do Documento */}
          <div className="px-4 mb-3">
            {renderDocumentContent()}
          </div>

          {/* Local e Data */}
          <div className="px-4 mb-2 text-right text-xs font-semibold text-gray-900">
            {dataPorExtenso}
          </div>
        </div>

        {/* Rodapé e Área de Assinatura */}
        <div className="px-4 pb-2">
          {docType === 'oficio' ? (
            <div className="flex flex-col items-center justify-end min-h-[65px] mx-auto text-center mt-2">
              {funcionario?.assinatura_url ? (
                <img
                  src={getCacheBustedUrl(funcionario.assinatura_url)}
                  alt="Assinatura Redator"
                  className="max-h-[45px] w-auto object-contain mb-0.5 select-none pointer-events-none"
                />
              ) : (
                <div className="w-36 h-[32px] border-b border-dashed border-gray-400 mb-0.5"></div>
              )}
              <span className="font-bold text-[10.5px] uppercase border-t border-black pt-0.5 w-full max-w-[260px]">
                {funcionario?.nome || 'Responsável p/ Redação'}
              </span>
              <span className="text-gray-600 text-[9.5px] mt-0.5 font-semibold">
                {funcionario?.cargo || 'Secretaria Municipal de Saúde'}
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-8 text-center text-xs font-semibold mt-2">
              {/* Diretor da Unidade */}
              <div className="flex flex-col items-center justify-end min-h-[65px]">
                {diretorAssinaturaUrl ? (
                  <img
                    src={getCacheBustedUrl(diretorAssinaturaUrl)}
                    alt="Assinatura Diretor"
                    className="max-h-[45px] w-auto object-contain mb-0.5 select-none pointer-events-none"
                  />
                ) : (
                  <div className="w-28 h-[32px] border-b border-dashed border-gray-400 mb-0.5"></div>
                )}
                <span className="font-bold text-[10px] uppercase border-t border-black pt-0.5 w-full max-w-[200px]">
                  {diretorNome || 'Diretor(a) Escolar'}
                </span>
                <span className="text-gray-500 text-[9px] mt-0.5">Direção Escolar</span>
              </div>

              {/* Secretário / Emitente */}
              <div className="flex flex-col items-center justify-end min-h-[65px]">
                {funcionario?.assinatura_url ? (
                  <img
                    src={getCacheBustedUrl(funcionario.assinatura_url)}
                    alt="Assinatura Servidor"
                    className="max-h-[45px] w-auto object-contain mb-0.5 select-none pointer-events-none"
                  />
                ) : (
                  <div className="w-28 h-[32px] border-b border-dashed border-gray-400 mb-0.5"></div>
                )}
                <span className="font-bold text-[10px] uppercase border-t border-black pt-0.5 w-full max-w-[200px]">
                  {funcionario?.nome || 'Responsável p/ Emissão'}
                </span>
                <span className="text-gray-500 text-[9px] mt-0.5">Secretaria / Coordenação</span>
              </div>
            </div>
          )}

          {/* Autenticação com QR Code */}
          {qrCodeUrl && (
            <div className="mt-2 pt-1.5 border-t border-gray-300 flex items-center gap-2 text-[8px] text-gray-500 font-mono leading-tight bg-gray-50/50 p-1 rounded border border-gray-200">
              <img src={qrCodeUrl} alt="QR Code Verificação" className="h-9 w-9 shrink-0 border border-gray-300 p-0.5 rounded bg-white" />
              <div className="flex-1 space-y-0.5 text-left">
                <span className="font-bold text-gray-800 uppercase block text-[7.5px]">DOCUMENTO ASSINADO E REGISTRADO ELETRONICAMENTE</span>
                <span className="block text-[7.5px] text-gray-600">Chave de Verificação: <strong className="text-gray-900">{tokenVerificacao}</strong></span>
                <span className="block text-[7.5px] text-gray-600 truncate">Hash SHA-256: <strong className="text-gray-900 text-[6.5px]">{hashSha256}</strong></span>
                <span className="block text-[6.5px] text-gray-500">Valide este comprovante lendo o QR Code ou acesse: {window.location.origin}/verificar/{tokenVerificacao}</span>
              </div>
            </div>
          )}

          {/* Autenticação/Notas de Rodapé */}
          <div className="border-t border-gray-300 mt-2 pt-1 text-[8px] font-semibold text-gray-500 text-center">
            Este documento é de emissão oficial do Painel Escolar Municipal de Sapeaçu. Qualquer adulteração invalida sua legalidade jurídica.
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
