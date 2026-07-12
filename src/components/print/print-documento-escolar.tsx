'use client'

import React, { useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Printer, X, Loader2, Award, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
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
  aluno: any
  docType: 'atestado-matricula' | 'atestado-frequencia' | 'declaracao-vaga'
  tokenExistente?: string | null
  onClose: () => void
}

export function PrintDocumentoEscolar({ aluno, docType, tokenExistente, onClose }: PrintDocumentoProps) {
  const [mounted, setMounted] = useState(false)
  const [imagesLoaded, setImagesLoaded] = useState(false)
  
  const [escolaNome, setEscolaNome] = useState('')
  const [escolaLogoUrl, setEscolaLogoUrl] = useState<string | null>(null)
  const [diretorNome, setDiretorNome] = useState('')
  const [diretorAssinaturaUrl, setDiretorAssinaturaUrl] = useState<string | null>(null)

  const [turmaNome, setTurmaNome] = useState('')
  const [turnoVal, setTurnoVal] = useState('')

  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [tokenVerificacao, setTokenVerificacao] = useState('')
  const [hashSha256, setHashSha256] = useState('')
  const [dataEmissao, setDataEmissao] = useState<string | null>(null)
  const [registrandoAssinatura, setRegistrandoAssinatura] = useState(false)

  const { funcionario } = useAuthStore()

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

  const getCacheBustedUrl = (url: string) => {
    if (!url) return ''
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}t=${Date.now()}`
  }

  useEffect(() => {
    const fetchDados = async () => {
      const supabase = createClient()
      
      // 1. Unidade Escolar e Assinatura do Diretor
      const targetEscolaId = aluno.escola_id || dm.escolaId
      if (targetEscolaId) {
        const { data: esc } = await supabase
          .from('escolas')
          .select('*, funcionarios!diretor_id(nome)')
          .eq('id', targetEscolaId)
          .maybeSingle()
        
        if (esc) {
          setEscolaNome(esc.nome)
          setEscolaLogoUrl(esc.logo_url || null)
          setDiretorAssinaturaUrl(esc.assinatura_diretor_url || null)
          if (esc.funcionarios) {
            setDiretorNome(esc.funcionarios.nome)
          }
        }
      }

      // 2. Turma e Turno
      const targetTurmaId = aluno.turma_id || dm.turmaIdAluno
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
  }, [aluno.escola_id, aluno.turma_id, dm.escolaId, dm.turmaIdAluno])

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
          setTokenVerificacao(data.token_verificacao)
          setHashSha256(data.hash_sha256)
          setDataEmissao(data.data_funcionario || data.criado_em)
          
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
    const logoPrefeitura = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logos/logo-prefeitura.png`
    const logoSecretaria = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logos/logo-secretaria.jpg`
    
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
    if (docType === 'atestado-matricula') return 'ATESTADO DE MATRÍCULA'
    if (docType === 'atestado-frequencia') return 'ATESTADO DE FREQUÊNCIA'
    return 'DECLARAÇÃO DE VAGA'
  }

  const renderDocumentContent = () => {
    const nomeAluno = aluno.nome?.toUpperCase() || '_________________________________'
    const matriculaId = aluno.id || 'N/A'
    const cursoTurno = turnoVal?.toUpperCase() || '___________________'
    const cursoTurma = turmaNome?.toUpperCase() || '___________________'
    const nascimento = dataNascimentoFormatada

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

  const handlePrint = async () => {
    if (tokenVerificacao) {
      window.print()
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
      const matriculaId = aluno.id || ''
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
      const { error: insertError } = await supabase
        .from('assinatura')
        .insert({
          aluno_id: aluno.id,
          tipo_documento: docType,
          token_verificacao: token,
          hash_sha256: hashHex,
          ip_funcionario: ip,
          user_agent_funcionario: navigator.userAgent,
          dispositivo_funcionario: window.innerWidth < 768 ? 'Celular' : 'Computador',
          data_funcionario: new Date().toISOString()
        })

      if (insertError) throw insertError

      // 4. Deletar atestados/documentos anteriores deste mesmo tipo para o mesmo aluno
      await supabase
        .from('assinatura')
        .delete()
        .eq('aluno_id', aluno.id)
        .eq('tipo_documento', docType)
        .neq('token_verificacao', token)

      // 5. Atualizar QR Code no state
      const siteUrl = window.location.origin
      const qrUrl = await QRCode.toDataURL(`${siteUrl}/verificar/${token}`, { margin: 1, width: 80 })
      
      setQrCodeUrl(qrUrl)
      setTokenVerificacao(token)
      setHashSha256(hashHex)
      setDataEmissao(new Date().toISOString())

      // Pequeno timeout para garantir a renderização antes de disparar o print do browser
      setTimeout(() => {
        window.print()
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
            position: static !important;
            overflow: visible !important;
            height: auto !important;
          }
          .print-hidden {
            display: none !important;
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
        className="bg-white text-black w-full max-w-[800px] min-h-[1050px] p-12 shadow-2xl rounded-sm print:shadow-none print:p-0 print:w-full print:max-w-none flex flex-col justify-between my-auto border border-gray-300 print:border-none print:m-0"
        style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
      >
        <div>
          {/* Cabeçalho Oficial da Prefeitura/SME */}
          <div className="flex items-center justify-between pb-3 border-b border-black mb-8">
            <div className="flex items-center gap-2 max-w-[180px] shrink-0">
              <img
                src={getCacheBustedUrl(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logos/logo-prefeitura.png`)}
                alt="Prefeitura de Sapeaçu"
                className="doc-header-logo-prefeitura"
              />
            </div>

            <div className="text-center flex-1 px-3">
              <h2 className="text-[11px] font-extrabold tracking-wider text-gray-800 uppercase leading-none">ESTADO DA BAHIA</h2>
              <h3 className="text-[13px] font-black text-gray-900 uppercase mt-0.5">PREFEITURA MUNICIPAL DE SAPEAÇU</h3>
              <p className="text-[10px] font-bold text-gray-600 mt-0.5">SECRETARIA MUNICIPAL DE EDUCAÇÃO</p>
            </div>

            <div className="text-right max-w-[180px] shrink-0">
              <img
                src={getCacheBustedUrl(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logos/logo-secretaria.jpg`)}
                alt="Secretaria de Educação"
                className="doc-header-logo-secretaria"
              />
            </div>
          </div>

          {/* Sub-Cabeçalho com Logo da Escola (Se Houver) */}
          <div className="flex flex-col items-center text-center space-y-2 mb-12">
            {escolaLogoUrl && (
              <img
                src={getCacheBustedUrl(escolaLogoUrl)}
                alt={escolaNome}
                className="h-16 w-auto object-contain mb-1"
              />
            )}
            <h1 className="text-lg font-black text-gray-900 uppercase tracking-wide">
              {escolaNome || 'UNIDADE ESCOLAR MUNICIPAL'}
            </h1>
            <div className="w-16 h-0.5 bg-black"></div>
          </div>

          {/* Título do Documento */}
          <div className="text-center mb-10">
            <h2 className="text-[15px] font-black uppercase text-gray-900 tracking-widest underline decoration-2 underline-offset-4">
              {getDocumentTitle()}
            </h2>
          </div>

          {/* Corpo do Documento */}
          <div className="px-6 mb-16">
            {renderDocumentContent()}
          </div>

          {/* Local e Data */}
          <div className="px-6 mb-24 text-right text-sm font-semibold text-gray-900">
            {dataPorExtenso}
          </div>
        </div>

        {/* Rodapé e Área de Assinatura */}
        <div className="px-6 pb-6">
          <div className="grid grid-cols-2 gap-12 text-center text-xs font-semibold mt-6">
            {/* Diretor da Unidade */}
            <div className="flex flex-col items-center justify-end min-h-[90px]">
              {diretorAssinaturaUrl ? (
                <img
                  src={getCacheBustedUrl(diretorAssinaturaUrl)}
                  alt="Assinatura Diretor"
                  className="max-h-[60px] w-auto object-contain mb-1 select-none pointer-events-none"
                />
              ) : (
                <div className="w-32 h-[45px] border-b border-dashed border-gray-400 mb-1"></div>
              )}
              <span className="font-bold text-[11px] uppercase border-t border-black pt-1 w-full max-w-[220px]">
                {diretorNome || 'Diretor(a) Escolar'}
              </span>
              <span className="text-gray-500 text-[10px] mt-0.5">Direção Escolar</span>
            </div>

            {/* Secretário / Emitente */}
            <div className="flex flex-col items-center justify-end min-h-[90px]">
              {funcionario?.assinatura_url ? (
                <img
                  src={getCacheBustedUrl(funcionario.assinatura_url)}
                  alt="Assinatura Servidor"
                  className="max-h-[60px] w-auto object-contain mb-1 select-none pointer-events-none"
                />
              ) : (
                <div className="w-32 h-[45px] border-b border-dashed border-gray-400 mb-1"></div>
              )}
              <span className="font-bold text-[11px] uppercase border-t border-black pt-1 w-full max-w-[220px]">
                {funcionario?.nome || 'Responsável p/ Emissão'}
              </span>
              <span className="text-gray-500 text-[10px] mt-0.5">Secretaria / Coordenação</span>
            </div>
          </div>

          {/* Autenticação com QR Code */}
          {qrCodeUrl && (
            <div className="mt-8 pt-3 border-t border-gray-300 flex items-center gap-3 text-[8px] text-gray-500 font-mono leading-tight bg-gray-50/50 p-2 rounded border border-gray-200">
              <img src={qrCodeUrl} alt="QR Code Verificação" className="h-11 w-11 shrink-0 border border-gray-300 p-0.5 rounded bg-white" />
              <div className="flex-1 space-y-0.5 text-left">
                <span className="font-bold text-gray-800 uppercase block text-[8px]">DOCUMENTO ASSINADO E REGISTRADO ELETRONICAMENTE</span>
                <span className="block text-[8px] text-gray-600">Chave de Verificação: <strong className="text-gray-900">{tokenVerificacao}</strong></span>
                <span className="block text-[8px] text-gray-600 truncate">Hash SHA-256: <strong className="text-gray-900 text-[7px]">{hashSha256}</strong></span>
                <span className="block text-[7px] text-gray-500">Valide este comprovante lendo o QR Code ou acesse: {window.location.origin}/verificar/{tokenVerificacao}</span>
              </div>
            </div>
          )}

          {/* Autenticação/Notas de Rodapé */}
          <div className="border-t border-gray-300 mt-6 pt-4 text-[9px] font-semibold text-gray-500 text-center">
            Este documento é de emissão oficial do Painel Escolar Municipal de Sapeaçu. Qualquer adulteração invalida sua legalidade jurídica.
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
