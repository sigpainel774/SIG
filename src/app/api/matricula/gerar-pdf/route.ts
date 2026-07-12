import { NextResponse, type NextRequest } from 'next/server'
import { PDFDocument, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import QRCode from 'qrcode'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// Cache da fonte em memória para evitar múltiplos downloads
let robotoFontBytes: Uint8Array | null = null

async function getRobotoFont() {
  if (robotoFontBytes) return robotoFontBytes
  const res = await fetch('https://raw.githubusercontent.com/google/fonts/main/ofl/roboto/Roboto-Regular.ttf')
  const arrayBuffer = await res.arrayBuffer()
  robotoFontBytes = new Uint8Array(arrayBuffer)
  return robotoFontBytes
}

function generateVerificacaoToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let token = ''
  for (let i = 0; i < 8; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

export async function POST(request: NextRequest) {
  try {
    const { alunoId } = await request.json()
    if (!alunoId) {
      return NextResponse.json({ error: 'ID do aluno é obrigatório.' }, { status: 400 })
    }

    // 1. Buscar dados do aluno no banco de dados (bypassing RLS com supabaseAdmin)
    const { data: aluno, error: alunoError } = await supabaseAdmin
      .from('alunos')
      .select('*, escolas(nome)')
      .eq('id', alunoId)
      .maybeSingle()

    if (alunoError || !aluno) {
      return NextResponse.json({ error: 'Aluno não encontrado no sistema.' }, { status: 404 })
    }

    const dm = (aluno.dados_matricula as Record<string, any>) || {}
    
    // Verificar se ambas as assinaturas estão presentes
    const sigRespUrl = dm.assinatura_responsavel_url
    const sigFuncUrl = dm.assinatura_funcionario_url

    if (!sigRespUrl || !sigFuncUrl) {
      return NextResponse.json({ 
        error: 'Para gerar o documento oficial, ambas as assinaturas (responsável e funcionário) devem estar capturadas.' 
      }, { status: 400 })
    }

    // 2. Obter IP de quem está solicitando a geração (funcionário na escola)
    const forwardedFor = request.headers.get('x-forwarded-for')
    const ipFuncionario = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1'
    const uaFuncionario = request.headers.get('user-agent') || 'SIG/Server'

    // 3. Baixar imagens das assinaturas em array buffer
    let respSigImageBytes: Uint8Array
    let funcSigImageBytes: Uint8Array

    try {
      // Adicionar query timestamp para forçar download atualizado
      const respRes = await fetch(`${sigRespUrl}?t=${Date.now()}`)
      const funcRes = await fetch(`${sigFuncUrl}?t=${Date.now()}`)
      
      if (!respRes.ok || !funcRes.ok) throw new Error('Falha ao baixar imagem de assinatura do storage.')
      
      const respBuf = await respRes.arrayBuffer()
      const funcBuf = await funcRes.arrayBuffer()
      
      respSigImageBytes = new Uint8Array(respBuf)
      funcSigImageBytes = new Uint8Array(funcBuf)
    } catch (fetchErr: any) {
      return NextResponse.json({ 
        error: `Erro ao buscar imagens de assinaturas: ${fetchErr.message}` 
      }, { status: 500 })
    }

    // 4. Carregar a fonte Roboto-Regular para UTF-8
    let robotoBytes: Uint8Array
    try {
      robotoBytes = await getRobotoFont()
    } catch (fontErr: any) {
      return NextResponse.json({ 
        error: `Erro ao baixar fonte institucional Roboto: ${fontErr.message}` 
      }, { status: 500 })
    }

    // 5. Gerar o token de verificação e QR Code
    const token = generateVerificacaoToken()
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sig-six-kappa.vercel.app'
    const verificationUrl = `${siteUrl}/verificar/${token}`
    
    // Gerar QR code em base64 como imagem PNG
    const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, { margin: 1, width: 120 })
    const qrCodeBase64 = qrCodeDataUrl.split(';base64,')[1]
    const qrCodeImageBytes = new Uint8Array(Buffer.from(qrCodeBase64, 'base64'))

    // 6. Criar o PDF usando pdf-lib
    const pdfDoc = await PDFDocument.create()
    pdfDoc.registerFontkit(fontkit)
    
    // Registrar fonte UTF-8
    const robotoFont = await pdfDoc.embedFont(robotoBytes)
    
    // Embutir as assinaturas e o QR Code no PDF
    const respSigImage = await pdfDoc.embedPng(respSigImageBytes)
    const funcSigImage = await pdfDoc.embedPng(funcSigImageBytes)
    const qrCodeImage = await pdfDoc.embedPng(qrCodeImageBytes)

    // Adicionar página A4
    const page = pdfDoc.addPage([595.28, 841.89]) // A4
    const { width, height } = page.getSize()

    // Margens e Estilos
    const margin = 40
    let yPosition = height - margin

    // Desenhar Cabeçalho Institucional
    page.drawText('ESTADO DA BAHIA', { x: 190, y: yPosition - 10, size: 10, font: robotoFont, color: rgb(0.3, 0.3, 0.3) })
    page.drawText('PREFEITURA MUNICIPAL DE SAPEAÇU', { x: 140, y: yPosition - 25, size: 13, font: robotoFont, color: rgb(0.1, 0.1, 0.1) })
    page.drawText('SECRETARIA MUNICIPAL DE EDUCAÇÃO', { x: 160, y: yPosition - 38, size: 9, font: robotoFont, color: rgb(0.2, 0.2, 0.2) })
    
    // Linha Divisória
    yPosition -= 50
    page.drawLine({
      start: { x: margin, y: yPosition },
      end: { x: width - margin, y: yPosition },
      thickness: 1,
      color: rgb(0, 0, 0)
    })

    // Título do Documento
    yPosition -= 25
    page.drawText('COMPROVANTE OFICIAL DE MATRÍCULA ELETRÔNICA', { x: 110, y: yPosition, size: 12, font: robotoFont, color: rgb(0.05, 0.05, 0.05) })
    page.drawText(`ANO LETIVO: ${dm.anoLetivo || '2026'}`, { x: 250, y: yPosition - 15, size: 10, font: robotoFont, color: rgb(0.2, 0.2, 0.2) })

    // Box com dados do aluno
    yPosition -= 40
    page.drawRectangle({
      x: margin,
      y: yPosition - 110,
      width: width - (margin * 2),
      height: 120,
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 1,
      color: rgb(0.98, 0.98, 0.98)
    })

    // Textos do Aluno
    const xCol1 = margin + 15
    const xCol2 = 300
    let textY = yPosition - 15

    const escolaNome = aluno.escolas?.nome || dm.escolaNome || 'Não especificada'
    const formattedNasc = aluno.data_nascimento 
      ? new Date(aluno.data_nascimento).toLocaleDateString('pt-BR') 
      : '-'

    page.drawText(`Aluno(a): ${aluno.nome.toUpperCase()}`, { x: xCol1, y: textY, size: 9, font: robotoFont })
    page.drawText(`Unidade Escolar: ${escolaNome}`, { x: xCol1, y: textY - 18, size: 9, font: robotoFont })
    page.drawText(`Série: ${aluno.serie || dm.serieAluno || '-'}`, { x: xCol1, y: textY - 36, size: 9, font: robotoFont })
    page.drawText(`CPF: ${aluno.cpf || dm.cpfAluno || '-'}`, { x: xCol1, y: textY - 54, size: 9, font: robotoFont })
    page.drawText(`RG: ${aluno.rg || dm.rgAluno || '-'}`, { x: xCol1, y: textY - 72, size: 9, font: robotoFont })
    page.drawText(`Mãe: ${aluno.nome_mae || dm.maeAluno || '-'}`, { x: xCol1, y: textY - 90, size: 9, font: robotoFont })

    page.drawText(`Nascimento: ${formattedNasc}`, { x: xCol2, y: textY - 36, size: 9, font: robotoFont })
    page.drawText(`NIS: ${aluno.nis || dm.nisAluno || '-'}`, { x: xCol2, y: textY - 54, size: 9, font: robotoFont })
    page.drawText(`Pai: ${aluno.nome_pai || dm.paiAluno || '-'}`, { x: xCol2, y: textY - 90, size: 9, font: robotoFont })

    // Termo de Compromisso
    yPosition -= 140
    page.drawText('TERMO DE COMPROMISSO DO RESPONSÁVEL LEGAL', { x: margin, y: yPosition, size: 9, font: robotoFont })
    
    yPosition -= 70
    const termoText = 'Declaro, sob as penas da Lei, que as informações prestadas bem como documentos que apresento para a matrícula são verdadeiros e autênticos. Estou ciente de que as informações contidas nesta ficha são muito importantes para o registro do CENSO ESCOLAR e para que a escola possa tomar as providências necessárias em caso de acidentes. Comprometo-me pelo zelo e preservação do patrimônio desta Escola.'
    page.drawText(termoText, {
      x: margin,
      y: yPosition + 55,
      size: 7.5,
      font: robotoFont,
      lineHeight: 12,
      maxWidth: width - (margin * 2)
    })

    // Uso de imagem e voz
    yPosition -= 60
    page.drawText('AUTORIZAÇÃO DE USO DE IMAGEM E VOZ', { x: margin, y: yPosition + 35, size: 9, font: robotoFont })
    const autorizaTexto = `Autorizo expressamente a utilização da imagem e voz do aluno acima discriminado, em caráter definitivo e gratuito, constante em fotos e filmagens decorrentes da sua participação em eventos escolares da Secretaria Municipal de Educação. Opção selecionada pelo responsável: ${dm.autoriza_imagem_voz || 'Não informado'}.`
    page.drawText(autorizaTexto, {
      x: margin,
      y: yPosition + 20,
      size: 7.5,
      font: robotoFont,
      lineHeight: 12,
      maxWidth: width - (margin * 2)
    })

    // ÁREA DE ASSINATURAS
    yPosition -= 100
    page.drawLine({
      start: { x: margin, y: yPosition },
      end: { x: width - margin, y: yPosition },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8)
    })

    // Desnhar as Assinaturas Lado a Lado
    const signatureWidth = 140
    const signatureHeight = 45
    
    // 1. Assinatura do Funcionário (Esquerda)
    const xFunc = margin + 20
    const ySigs = yPosition - 60
    page.drawImage(funcSigImage, {
      x: xFunc + 10,
      y: ySigs + 15,
      width: signatureWidth,
      height: signatureHeight
    })
    page.drawLine({
      start: { x: xFunc, y: ySigs + 10 },
      end: { x: xFunc + signatureWidth + 20, y: ySigs + 10 },
      thickness: 0.5,
      color: rgb(0.1, 0.1, 0.1)
    })
    page.drawText('FUNCIONÁRIO RESPONSÁVEL', { x: xFunc + 25, y: ySigs - 2, size: 7.5, font: robotoFont })
    
    // 2. Assinatura do Responsável (Direita)
    const xResp = width - margin - signatureWidth - 40
    page.drawImage(respSigImage, {
      x: xResp + 10,
      y: ySigs + 15,
      width: signatureWidth,
      height: signatureHeight
    })
    page.drawLine({
      start: { x: xResp, y: ySigs + 10 },
      end: { x: xResp + signatureWidth + 20, y: ySigs + 10 },
      thickness: 0.5,
      color: rgb(0.1, 0.1, 0.1)
    })
    page.drawText('PAI/MÃE/RESPONSÁVEL LEGAL', { x: xResp + 20, y: ySigs - 2, size: 7.5, font: robotoFont })

    // ÁREA DE INTEGRIDADE (QR Code e Metadados) no rodapé
    yPosition -= 140
    page.drawRectangle({
      x: margin,
      y: yPosition - 10,
      width: width - (margin * 2),
      height: 75,
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 0.5,
      color: rgb(0.96, 0.97, 0.98)
    })

    // Desenhar QR Code de verificação
    page.drawImage(qrCodeImage, {
      x: margin + 10,
      y: yPosition - 5,
      width: 65,
      height: 65
    })

    // Textos de Integridade e Hash
    const xMeta = margin + 90
    page.drawText('VERIFICAÇÃO DE AUTENTICIDADE', { x: xMeta, y: yPosition + 50, size: 8, font: robotoFont, color: rgb(0.1, 0.2, 0.4) })
    page.drawText(`Este documento foi assinado eletronicamente e sua integridade pode ser verificada`, { x: xMeta, y: yPosition + 38, size: 7, font: robotoFont })
    page.drawText(`lendo o QR Code ao lado ou acessando: ${verificationUrl}`, { x: xMeta, y: yPosition + 28, size: 7, font: robotoFont })
    page.drawText(`Código de Verificação: ${token}`, { x: xMeta, y: yPosition + 15, size: 7.5, font: robotoFont })

    // Salvar o arquivo PDF em buffer
    const pdfBytes = await pdfDoc.save()

    // 7. Calcular o Hash SHA-256 do arquivo gerado
    const hash = crypto.createHash('sha256').update(pdfBytes).digest('hex')

    // Escrever o Hash no rodapé do PDF (para que apareça na folha impressa)
    page.drawText(`Hash de Integridade SHA-256: ${hash}`, { x: xMeta, y: yPosition, size: 6.5, font: robotoFont, color: rgb(0.4, 0.4, 0.4) })
    
    // Salvar o PDF com o hash desenhado
    const finalPdfBytes = await pdfDoc.save()

    // 8. Fazer upload do PDF gerado para o Supabase Storage (comprovantes_matriculas)
    const pdfFileName = `comprovante_aluno_${alunoId}_${token}.pdf`
    
    const { error: uploadError } = await supabaseAdmin.storage
      .from('comprovantes_matriculas')
      .upload(pdfFileName, finalPdfBytes, {
        contentType: 'application/pdf',
        upsert: true
      })

    if (uploadError) throw uploadError

    // Buscar URL Pública do PDF
    const { data: publicUrlData } = supabaseAdmin.storage
      .from('comprovantes_matriculas')
      .getPublicUrl(pdfFileName)

    const pdfPublicUrl = publicUrlData.publicUrl

    // 9. Registrar dados na tabela assinatura
    const { error: insertSigError } = await (supabaseAdmin
      .from('assinatura' as any) as any)
      .insert({
        aluno_id: alunoId,
        tipo_documento: 'comprovante_matricula',
        token_verificacao: token,
        hash_sha256: hash,
        arquivo_pdf_url: pdfPublicUrl,
        
        // Evidências do responsável salvas no aluno
        ip_responsavel: dm.assinatura_responsavel_ip || null,
        user_agent_responsavel: dm.assinatura_responsavel_user_agent || null,
        dispositivo_responsavel: dm.assinatura_responsavel_dispositivo || null,
        data_responsavel: dm.assinatura_responsavel_at || null,
        
        // Evidências do funcionário
        ip_funcionario: dm.assinatura_funcionario_ip || ipFuncionario,
        user_agent_funcionario: dm.assinatura_funcionario_user_agent || uaFuncionario,
        dispositivo_funcionario: dm.assinatura_funcionario_dispositivo || 'Desktop',
        data_funcionario: dm.assinatura_funcionario_at || new Date().toISOString()
      })

    if (insertSigError) throw insertSigError

    // 10. Atualizar dados_matricula com a URL do PDF, Token e Hash na tabela alunos
    const dadosMatriculaAtualizados = {
      ...dm,
      pdf_assinado_url: pdfPublicUrl,
      pdf_assinado_token: token,
      pdf_assinado_hash: hash,
      documento_bloqueado: true
    }

    const { error: updateAlunoError } = await supabaseAdmin
      .from('alunos')
      .update({ dados_matricula: dadosMatriculaAtualizados })
      .eq('id', alunoId)

    if (updateAlunoError) throw updateAlunoError

    return NextResponse.json({
      success: true,
      token,
      hash,
      pdfUrl: pdfPublicUrl
    })

  } catch (error: any) {
    console.error('Erro na API de geração de PDF assinado:', error)
    return NextResponse.json({ error: `Falha interna no servidor: ${error.message}` }, { status: 500 })
  }
}
