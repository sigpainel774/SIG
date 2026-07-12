import { NextResponse, type NextRequest } from 'next/server'
import { PDFDocument, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import QRCode from 'qrcode'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// Cache da fonte em memória para evitar múltiplos downloads
let robotoFontBytes: Uint8Array | null = null

async function getRobotoFont() {
  if (robotoFontBytes) return robotoFontBytes
  const filePath = path.join(process.cwd(), 'public', 'fonts', 'Roboto-Regular.ttf')
  const fileBuffer = fs.readFileSync(filePath)
  robotoFontBytes = new Uint8Array(fileBuffer)
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
        error: `Erro ao carregar fonte institucional Roboto: ${fontErr.message}` 
      }, { status: 500 })
    }

    // 4.1 Carregar as logos institucionais locais do disco
    let logoPrefeituraImageBytes: Uint8Array | null = null
    let logoSecretariaImageBytes: Uint8Array | null = null
    
    try {
      const logoPrefeituraPath = path.join(process.cwd(), 'public', 'img', 'logo-prefeitura.png')
      const logoPrefeituraBuffer = fs.readFileSync(logoPrefeituraPath)
      logoPrefeituraImageBytes = new Uint8Array(logoPrefeituraBuffer)
    } catch (err) {
      console.error('Erro ao ler logo da prefeitura no disco:', err)
    }

    try {
      const logoSecretariaPath = path.join(process.cwd(), 'public', 'img', 'logo-secretaria.png')
      const logoSecretariaBuffer = fs.readFileSync(logoSecretariaPath)
      logoSecretariaImageBytes = new Uint8Array(logoSecretariaBuffer)
    } catch (err) {
      console.error('Erro ao ler logo da secretaria no disco:', err)
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

    // Embutir as logos no PDF se carregadas (com fallback PNG/JPG)
    let logoPrefeituraImage: any = null
    if (logoPrefeituraImageBytes) {
      try {
        logoPrefeituraImage = await pdfDoc.embedPng(logoPrefeituraImageBytes)
      } catch (e) {
        try {
          logoPrefeituraImage = await pdfDoc.embedJpg(logoPrefeituraImageBytes)
        } catch (e2) {
          console.error('Erro ao embutir logo prefeitura (PNG e JPG):', e2)
        }
      }
    }

    let logoSecretariaImage: any = null
    if (logoSecretariaImageBytes) {
      try {
        logoSecretariaImage = await pdfDoc.embedPng(logoSecretariaImageBytes)
      } catch (e) {
        try {
          logoSecretariaImage = await pdfDoc.embedJpg(logoSecretariaImageBytes)
        } catch (e2) {
          console.error('Erro ao embutir logo secretaria (PNG e JPG):', e2)
        }
      }
    }

    // Adicionar página A4
    const page = pdfDoc.addPage([595.28, 841.89]) // A4
    const { width, height } = page.getSize()

    // Margens e Estilos
    const margin = 40
    let yPosition = height - margin

    // Desenhar Cabeçalho Institucional
    const logoY = yPosition - 42
    
    // Desenhar Logo Prefeitura (Esquerda)
    if (logoPrefeituraImage) {
      page.drawImage(logoPrefeituraImage, {
        x: margin,
        y: logoY,
        width: 60,
        height: 35
      })
    }

    // Desenhar Logo Secretaria (Direita)
    if (logoSecretariaImage) {
      page.drawImage(logoSecretariaImage, {
        x: width - margin - 75,
        y: logoY + 2,
        width: 75,
        height: 30
      })
    }

    // Textos Institucionais centralizados
    const txtEstado = 'ESTADO DA BAHIA'
    const txtPrefeitura = 'PREFEITURA MUNICIPAL DE SAPEAÇU'
    const txtSecretaria = 'SECRETARIA MUNICIPAL DE EDUCAÇÃO'

    const wEstado = robotoFont.widthOfTextAtSize(txtEstado, 9)
    const wPrefeitura = robotoFont.widthOfTextAtSize(txtPrefeitura, 11)
    const wSecretaria = robotoFont.widthOfTextAtSize(txtSecretaria, 8)

    const pageCenter = width / 2

    page.drawText(txtEstado, {
      x: pageCenter - (wEstado / 2),
      y: yPosition - 12,
      size: 9,
      font: robotoFont,
      color: rgb(0.3, 0.3, 0.3)
    })
    
    page.drawText(txtPrefeitura, {
      x: pageCenter - (wPrefeitura / 2),
      y: yPosition - 26,
      size: 11,
      font: robotoFont,
      color: rgb(0.1, 0.1, 0.1)
    })

    page.drawText(txtSecretaria, {
      x: pageCenter - (wSecretaria / 2),
      y: yPosition - 38,
      size: 8,
      font: robotoFont,
      color: rgb(0.2, 0.2, 0.2)
    })
    
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
    const txtDocTitle = 'COMPROVANTE OFICIAL DE MATRÍCULA ELETRÔNICA'
    const txtAnoLetivo = `ANO LETIVO: ${dm.anoLetivo || '2026'}`
    const wDocTitle = robotoFont.widthOfTextAtSize(txtDocTitle, 11)
    const wAnoLetivo = robotoFont.widthOfTextAtSize(txtAnoLetivo, 9)

    page.drawText(txtDocTitle, {
      x: pageCenter - (wDocTitle / 2),
      y: yPosition,
      size: 11,
      font: robotoFont,
      color: rgb(0.05, 0.05, 0.05)
    })
    page.drawText(txtAnoLetivo, {
      x: pageCenter - (wAnoLetivo / 2),
      y: yPosition - 14,
      size: 9,
      font: robotoFont,
      color: rgb(0.2, 0.2, 0.2)
    })

    // Box com dados do aluno (Tabela Estruturada)
    yPosition -= 35
    const tableHeight = 100
    const tableWidth = width - (margin * 2)
    const tableY = yPosition - tableHeight

    // Borda externa
    page.drawRectangle({
      x: margin,
      y: tableY,
      width: tableWidth,
      height: tableHeight,
      borderColor: rgb(0.1, 0.1, 0.1),
      borderWidth: 0.75,
      color: rgb(1, 1, 1)
    })

    // Linhas horizontais divisórias
    page.drawLine({ start: { x: margin, y: yPosition - 25 }, end: { x: width - margin, y: yPosition - 25 }, thickness: 0.5, color: rgb(0.1, 0.1, 0.1) })
    page.drawLine({ start: { x: margin, y: yPosition - 50 }, end: { x: width - margin, y: yPosition - 50 }, thickness: 0.5, color: rgb(0.1, 0.1, 0.1) })
    page.drawLine({ start: { x: margin, y: yPosition - 75 }, end: { x: width - margin, y: yPosition - 75 }, thickness: 0.5, color: rgb(0.1, 0.1, 0.1) })

    // Linha vertical divisória - Linha 1 (3/4 e 1/4)
    const col1_4 = margin + tableWidth * 0.75 // 426.46
    page.drawLine({ start: { x: col1_4, y: yPosition - 25 }, end: { x: col1_4, y: yPosition }, thickness: 0.5, color: rgb(0.1, 0.1, 0.1) })

    // Linha vertical divisória - Linha 3 (1/3, 1/3, 1/3)
    const col3_1 = margin + tableWidth / 3 // 211.76
    const col3_2 = margin + (tableWidth / 3) * 2 // 383.52
    page.drawLine({ start: { x: col3_1, y: yPosition - 75 }, end: { x: col3_1, y: yPosition - 50 }, thickness: 0.5, color: rgb(0.1, 0.1, 0.1) })
    page.drawLine({ start: { x: col3_2, y: yPosition - 75 }, end: { x: col3_2, y: yPosition - 50 }, thickness: 0.5, color: rgb(0.1, 0.1, 0.1) })

    // Linha vertical divisória - Linha 4 (1/2 e 1/2)
    const col2_1 = margin + tableWidth / 2 // 297.64
    page.drawLine({ start: { x: col2_1, y: tableY }, end: { x: col2_1, y: yPosition - 75 }, thickness: 0.5, color: rgb(0.1, 0.1, 0.1) })

    // Rótulos e Valores
    const labelColor = rgb(0.3, 0.3, 0.3)
    const valueColor = rgb(0, 0, 0)
    const labelSize = 6.5
    const valueSize = 8.5
    const paddingLeft = 6

    const escolaNome = aluno.escolas?.nome || dm.escolaNome || 'Não especificada'
    const dataMatriculaFormatada = dm.dataMatricula 
      ? new Date(dm.dataMatricula).toLocaleDateString('pt-BR') 
      : new Date().toLocaleDateString('pt-BR')

    // Regex de parsing do Ano e da Turma
    const rawSerie = aluno.serie || dm.serieAluno || ''
    let exibidoAno = '-'
    let exibidoTurma = '-'
    const matchSerie = rawSerie.trim().match(/^(\d+)(?:\s*[-°ºª]?\s*)([a-zA-Z])$/i)
    if (matchSerie) {
      exibidoAno = matchSerie[1]
      exibidoTurma = matchSerie[2].toUpperCase()
    } else {
      exibidoAno = rawSerie || '-'
      exibidoTurma = dm.turmaAluno || '-'
    }

    // --- LINHA 1 ---
    // Unidade Escolar
    page.drawText('UNIDADE ESCOLAR', { x: margin + paddingLeft, y: yPosition - 8, size: labelSize, font: robotoFont, color: labelColor })
    page.drawText((escolaNome || 'Sem Escola').toUpperCase(), { x: margin + paddingLeft, y: yPosition - 18, size: valueSize, font: robotoFont, color: valueColor })

    // Data
    page.drawText('DATA', { x: col1_4 + paddingLeft, y: yPosition - 8, size: labelSize, font: robotoFont, color: labelColor })
    page.drawText(dataMatriculaFormatada, { x: col1_4 + paddingLeft, y: yPosition - 18, size: valueSize, font: robotoFont, color: valueColor })

    // --- LINHA 2 ---
    // Aluno
    page.drawText('ALUNO(A)', { x: margin + paddingLeft, y: yPosition - 33, size: labelSize, font: robotoFont, color: labelColor })
    page.drawText(aluno.nome.toUpperCase(), { x: margin + paddingLeft, y: yPosition - 43, size: valueSize, font: robotoFont, color: valueColor })

    // --- LINHA 3 ---
    // Ano
    page.drawText('ANO', { x: margin + paddingLeft, y: yPosition - 58, size: labelSize, font: robotoFont, color: labelColor })
    page.drawText(exibidoAno, { x: margin + paddingLeft, y: yPosition - 68, size: valueSize, font: robotoFont, color: valueColor })

    // Turma
    page.drawText('TURMA', { x: col3_1 + paddingLeft, y: yPosition - 58, size: labelSize, font: robotoFont, color: labelColor })
    page.drawText(exibidoTurma, { x: col3_1 + paddingLeft, y: yPosition - 68, size: valueSize, font: robotoFont, color: valueColor })

    // Turno
    page.drawText('TURNO', { x: col3_2 + paddingLeft, y: yPosition - 58, size: labelSize, font: robotoFont, color: labelColor })
    page.drawText((dm.turnoAluno || 'MATUTINO').toUpperCase(), { x: col3_2 + paddingLeft, y: yPosition - 68, size: valueSize, font: robotoFont, color: valueColor })

    // --- LINHA 4 ---
    // RG
    page.drawText('Nº IDENTIDADE (RG)', { x: margin + paddingLeft, y: yPosition - 83, size: labelSize, font: robotoFont, color: labelColor })
    page.drawText(aluno.rg || dm.rgAluno || '-', { x: margin + paddingLeft, y: yPosition - 93, size: valueSize, font: robotoFont, color: valueColor })

    // CPF
    page.drawText('CPF', { x: col2_1 + paddingLeft, y: yPosition - 83, size: labelSize, font: robotoFont, color: labelColor })
    page.drawText(aluno.cpf || dm.cpfAluno || '-', { x: col2_1 + paddingLeft, y: yPosition - 93, size: valueSize, font: robotoFont, color: valueColor })

    // Atualiza yPosition para após a tabela
    yPosition -= tableHeight

    // --- TERMO DE COMPROMISSO ---
    yPosition -= 15
    page.drawRectangle({
      x: margin,
      y: yPosition - 12,
      width: tableWidth,
      height: 12,
      borderColor: rgb(0.1, 0.1, 0.1),
      borderWidth: 0.75,
      color: rgb(0.88, 0.88, 0.88)
    })
    page.drawText('TERMO DE COMPROMISSO DO RESPONSÁVEL LEGAL', {
      x: margin + 6,
      y: yPosition - 9.5,
      size: 7.5,
      font: robotoFont,
      color: rgb(0.1, 0.1, 0.1)
    })

    page.drawRectangle({
      x: margin,
      y: yPosition - 12 - 55,
      width: tableWidth,
      height: 55,
      borderColor: rgb(0.1, 0.1, 0.1),
      borderWidth: 0.75,
      color: rgb(1, 1, 1)
    })
    const termoText = 'Declaro, sob as penas da Lei, que as informações prestadas bem como documentos que apresento para a matrícula são verdadeiros e autênticos (fiéis à verdade e condizentes com a realidade). Estou ciente de que as informações contidas nesta ficha são muito importantes para o registro do CENSO ESCOLAR e para que a escola possa tomar as providências necessárias em caso de acidentes ou doenças durante a permanência do aluno no período de aulas. Firmo acordo de informar a escola caso haja qualquer mudança nas informações aqui prestadas e a manter-las sempre atualizada. Comprometo-me pelo zelo e preservação do patrimônio desta Escola e responsabilizo-me pelo ressarcimento de quaisquer danos e prejuízo causados pelo aluno sob nossa responsabilidade.'
    
    page.drawText(termoText, {
      x: margin + 6,
      y: yPosition - 20,
      size: 7,
      font: robotoFont,
      lineHeight: 9.5,
      maxWidth: tableWidth - 12,
      color: rgb(0.15, 0.15, 0.15)
    })
    yPosition -= (12 + 55)

    // --- AUTORIZAÇÃO DE IMAGEM E VOZ ---
    yPosition -= 15
    page.drawRectangle({
      x: margin,
      y: yPosition - 12,
      width: tableWidth,
      height: 12,
      borderColor: rgb(0.1, 0.1, 0.1),
      borderWidth: 0.75,
      color: rgb(0.88, 0.88, 0.88)
    })
    page.drawText('AUTORIZAÇÃO DE USO DE IMAGEM E VOZ', {
      x: margin + 6,
      y: yPosition - 9.5,
      size: 7.5,
      font: robotoFont,
      color: rgb(0.1, 0.1, 0.1)
    })

    page.drawRectangle({
      x: margin,
      y: yPosition - 12 - 38,
      width: tableWidth,
      height: 38,
      borderColor: rgb(0.1, 0.1, 0.1),
      borderWidth: 0.75,
      color: rgb(1, 1, 1)
    })

    const autorizaTexto = 'Neste ato, e para todos os fins de direito admitidos autorizo expressamente a utilização da imagem e voz do alunos acima discriminado, em caráter definitivo e gratuito, constante em fotos e filmagens decorrentes da sua participação em eventos da Secretaria Municipal de Educação de Sapeaçu-Bahia.'

    page.drawText(autorizaTexto, {
      x: margin + 6,
      y: yPosition - 20,
      size: 6.8,
      font: robotoFont,
      lineHeight: 9,
      maxWidth: 350,
      color: rgb(0.15, 0.15, 0.15)
    })

    // Desenhar as opções Sim e Não
    const optX = margin + 370
    const optY = yPosition - 32
    const autorizaImagemVoz = dm.autoriza_imagem_voz || 'Não'

    // Opção Sim
    page.drawRectangle({
      x: optX,
      y: optY,
      width: 9,
      height: 9,
      borderColor: rgb(0, 0, 0),
      borderWidth: 0.75,
      color: rgb(1, 1, 1)
    })
    if (autorizaImagemVoz === 'Sim') {
      page.drawText('X', { x: optX + 2, y: optY + 1.5, size: 7.5, font: robotoFont })
    }
    page.drawText('Sim, autorizo.', { x: optX + 13, y: optY + 1.5, size: 7.5, font: robotoFont })

    // Opção Não
    page.drawRectangle({
      x: optX,
      y: optY - 14,
      width: 9,
      height: 9,
      borderColor: rgb(0, 0, 0),
      borderWidth: 0.75,
      color: rgb(1, 1, 1)
    })
    if (autorizaImagemVoz === 'Não') {
      page.drawText('X', { x: optX + 2, y: optY - 12.5, size: 7.5, font: robotoFont })
    }
    page.drawText('Não, não autorizo.', { x: optX + 13, y: optY - 12.5, size: 7.5, font: robotoFont })

    yPosition -= (12 + 38)

    // ÁREA DE ASSINATURAS
    yPosition -= 65
    
    // Desenhar as Assinaturas Lado a Lado
    const signatureWidth = 140
    const signatureHeight = 35
    
    // 1. Assinatura do Funcionário (Esquerda)
    const xFunc = margin + 20
    const ySigs = yPosition - 45
    page.drawImage(funcSigImage, {
      x: xFunc + 10,
      y: ySigs + 10,
      width: signatureWidth,
      height: signatureHeight
    })
    page.drawLine({
      start: { x: xFunc, y: ySigs + 8 },
      end: { x: xFunc + signatureWidth + 20, y: ySigs + 8 },
      thickness: 0.5,
      color: rgb(0.1, 0.1, 0.1)
    })
    page.drawText('ASSINATURA DO FUNCIONÁRIO RESPONSÁVEL PELA MATRÍCULA', { x: xFunc - 5, y: ySigs - 1, size: 6.5, font: robotoFont, color: rgb(0.2, 0.2, 0.2) })
    
    // 2. Assinatura do Responsável (Direita)
    const xResp = width - margin - signatureWidth - 40
    page.drawImage(respSigImage, {
      x: xResp + 10,
      y: ySigs + 10,
      width: signatureWidth,
      height: signatureHeight
    })
    page.drawLine({
      start: { x: xResp, y: ySigs + 8 },
      end: { x: xResp + signatureWidth + 20, y: ySigs + 8 },
      thickness: 0.5,
      color: rgb(0.1, 0.1, 0.1)
    })
    page.drawText('ASSINATURA DO PAI/MÃE/RESPONSÁVEL PELO ALUNO(A)', { x: xResp - 5, y: ySigs - 1, size: 6.5, font: robotoFont, color: rgb(0.2, 0.2, 0.2) })

    yPosition = ySigs - 15

    // ÁREA DE INTEGRIDADE (QR Code e Metadados) no rodapé
    yPosition -= 50
    const metaBoxHeight = 55
    page.drawRectangle({
      x: margin,
      y: yPosition - 10,
      width: tableWidth,
      height: metaBoxHeight,
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 0.5,
      color: rgb(0.96, 0.97, 0.98)
    })

    // Desenhar QR Code de verificação
    page.drawImage(qrCodeImage, {
      x: margin + 8,
      y: yPosition - 7,
      width: 48,
      height: 48
    })

    // Textos de Integridade e Hash
    const xMeta = margin + 65
    page.drawText('DOCUMENTO ASSINADO ELETRONICAMENTE', { x: xMeta, y: yPosition + 33, size: 7.5, font: robotoFont, color: rgb(0.1, 0.2, 0.4) })
    page.drawText(`Chave de Verificação: ${token}`, { x: xMeta, y: yPosition + 23, size: 7, font: robotoFont, color: rgb(0.1, 0.1, 0.1) })
    page.drawText(`Valide este comprovante lendo o QR Code ou acessando: ${verificationUrl}`, { x: xMeta, y: yPosition + 14, size: 6.5, font: robotoFont, color: rgb(0.3, 0.3, 0.3) })

    // Salvar o arquivo PDF em buffer
    const pdfBytes = await pdfDoc.save()

    // 7. Calcular o Hash SHA-256 do arquivo gerado
    const hash = crypto.createHash('sha256').update(pdfBytes).digest('hex')

    // Escrever o Hash no rodapé do PDF (para que apareça na folha impressa)
    page.drawText(`Hash de Integridade SHA-256: ${hash}`, { x: xMeta, y: yPosition + 4, size: 6, font: robotoFont, color: rgb(0.4, 0.4, 0.4) })
    
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
