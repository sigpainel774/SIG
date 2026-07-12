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
    const margin = 30
    const tableWidth = width - (margin * 2)
    const pageCenter = width / 2
    const paddingLeft = 6

    const txtEstado = 'ESTADO DA BAHIA'
    const txtPrefeitura = 'PREFEITURA MUNICIPAL DE SAPEAÇU'
    const txtSecretaria = 'SECRETARIA MUNICIPAL DE EDUCAÇÃO'

    const wEstado = robotoFont.widthOfTextAtSize(txtEstado, 9)
    const wPrefeitura = robotoFont.widthOfTextAtSize(txtPrefeitura, 11)
    const wSecretaria = robotoFont.widthOfTextAtSize(txtSecretaria, 8)

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

    const autorizaImagemVoz = dm.autoriza_imagem_voz || 'Não'

    // Função auxiliar para desenhar uma Via do Comprovante
    const drawVia = (yStart: number, isTopCopy: boolean, hashText: string) => {
      let y = yStart

      // 1. Cabeçalho
      // Logo Prefeitura (Esquerda)
      if (logoPrefeituraImage) {
        page.drawImage(logoPrefeituraImage, {
          x: margin,
          y: y - 44,
          width: 75,
          height: 44
        })
      }

      // Logo Secretaria (Direita)
      if (logoSecretariaImage) {
        page.drawImage(logoSecretariaImage, {
          x: width - margin - 75,
          y: y - 38,
          width: 75,
          height: 30
        })
      }

      // Textos Centralizados
      page.drawText(txtEstado, {
        x: pageCenter - (wEstado / 2),
        y: y - 12,
        size: 9,
        font: robotoFont,
        color: rgb(0.3, 0.3, 0.3)
      })
      page.drawText(txtPrefeitura, {
        x: pageCenter - (wPrefeitura / 2),
        y: y - 25,
        size: 11,
        font: robotoFont,
        color: rgb(0.1, 0.1, 0.1)
      })
      page.drawText(txtSecretaria, {
        x: pageCenter - (wSecretaria / 2),
        y: y - 36,
        size: 8,
        font: robotoFont,
        color: rgb(0.2, 0.2, 0.2)
      })

      // Linha Divisória
      page.drawLine({
        start: { x: margin, y: y - 50 },
        end: { x: width - margin, y: y - 50 },
        thickness: 0.75,
        color: rgb(0, 0, 0)
      })

      y -= 50

      // 2. Banner de Título
      y -= 22
      page.drawRectangle({
        x: margin,
        y: y - 12,
        width: tableWidth,
        height: 12,
        borderColor: rgb(0.1, 0.1, 0.1),
        borderWidth: 0.75,
        color: rgb(0.92, 0.92, 0.92)
      })
      const txtTitle = `COMPROVANTE DE MATRÍCULA - ANO LETIVO ${dm.anoLetivo || '2026'}`
      const wTitle = robotoFont.widthOfTextAtSize(txtTitle, 8.5)
      page.drawText(txtTitle, {
        x: pageCenter - wTitle / 2,
        y: y - 9.5,
        size: 8.5,
        font: robotoFont,
        color: rgb(0, 0, 0)
      })

      y -= 12

      // 3. Tabela de Dados (Estruturada)
      y -= 10
      const tableHeight = 70
      const tableY = y - tableHeight

      // Borda Externa
      page.drawRectangle({
        x: margin,
        y: tableY,
        width: tableWidth,
        height: tableHeight,
        borderColor: rgb(0.1, 0.1, 0.1),
        borderWidth: 0.75,
        color: rgb(1, 1, 1)
      })

      // Linhas Horizontais
      const row1Y = y - 18
      const row2Y = y - 35
      const row3Y = y - 52
      page.drawLine({ start: { x: margin, y: row1Y }, end: { x: width - margin, y: row1Y }, thickness: 0.5, color: rgb(0.1, 0.1, 0.1) })
      page.drawLine({ start: { x: margin, y: row2Y }, end: { x: width - margin, y: row2Y }, thickness: 0.5, color: rgb(0.1, 0.1, 0.1) })
      page.drawLine({ start: { x: margin, y: row3Y }, end: { x: width - margin, y: row3Y }, thickness: 0.5, color: rgb(0.1, 0.1, 0.1) })

      // Linhas Verticais
      const col1_4 = margin + tableWidth * 0.75
      const col3_1 = margin + tableWidth / 3
      const col3_2 = margin + (tableWidth / 3) * 2
      const col2_1 = margin + tableWidth / 2

      page.drawLine({ start: { x: col1_4, y: row1Y }, end: { x: col1_4, y: y }, thickness: 0.5, color: rgb(0.1, 0.1, 0.1) })
      page.drawLine({ start: { x: col3_1, y: row3Y }, end: { x: col3_1, y: row2Y }, thickness: 0.5, color: rgb(0.1, 0.1, 0.1) })
      page.drawLine({ start: { x: col3_2, y: row3Y }, end: { x: col3_2, y: row2Y }, thickness: 0.5, color: rgb(0.1, 0.1, 0.1) })
      page.drawLine({ start: { x: col2_1, y: tableY }, end: { x: col2_1, y: row3Y }, thickness: 0.5, color: rgb(0.1, 0.1, 0.1) })

      // Rótulos e Valores
      const labelColor = rgb(0.3, 0.3, 0.3)
      const valueColor = rgb(0, 0, 0)
      const labelSize = 6.5
      const valueSize = 8

      // Linha 1
      page.drawText('UNIDADE ESCOLAR', { x: margin + paddingLeft, y: y - 7, size: labelSize, font: robotoFont, color: labelColor })
      page.drawText((escolaNome || 'Sem Escola').toUpperCase(), { x: margin + paddingLeft, y: y - 15, size: valueSize, font: robotoFont, color: valueColor })

      page.drawText('DATA', { x: col1_4 + paddingLeft, y: y - 7, size: labelSize, font: robotoFont, color: labelColor })
      page.drawText(dataMatriculaFormatada, { x: col1_4 + paddingLeft, y: y - 15, size: valueSize, font: robotoFont, color: valueColor })

      // Linha 2
      page.drawText('ALUNO(A)', { x: margin + paddingLeft, y: y - 24.5, size: labelSize, font: robotoFont, color: labelColor })
      page.drawText(aluno.nome.toUpperCase(), { x: margin + paddingLeft, y: y - 32.5, size: valueSize, font: robotoFont, color: valueColor })

      // Linha 3
      page.drawText('ANO', { x: margin + paddingLeft, y: y - 41.5, size: labelSize, font: robotoFont, color: labelColor })
      page.drawText(exibidoAno, { x: margin + paddingLeft, y: y - 49.5, size: valueSize, font: robotoFont, color: valueColor })

      page.drawText('TURMA', { x: col3_1 + paddingLeft, y: y - 41.5, size: labelSize, font: robotoFont, color: labelColor })
      page.drawText(exibidoTurma, { x: col3_1 + paddingLeft, y: y - 49.5, size: valueSize, font: robotoFont, color: valueColor })

      page.drawText('TURNO', { x: col3_2 + paddingLeft, y: y - 41.5, size: labelSize, font: robotoFont, color: labelColor })
      page.drawText((dm.turnoAluno || 'MATUTINO').toUpperCase(), { x: col3_2 + paddingLeft, y: y - 49.5, size: valueSize, font: robotoFont, color: valueColor })

      // Linha 4
      page.drawText('Nº IDENTIDADE (RG)', { x: margin + paddingLeft, y: y - 58.5, size: labelSize, font: robotoFont, color: labelColor })
      page.drawText(aluno.rg || dm.rgAluno || '-', { x: margin + paddingLeft, y: y - 66.5, size: valueSize, font: robotoFont, color: valueColor })

      page.drawText('CPF', { x: col2_1 + paddingLeft, y: y - 58.5, size: labelSize, font: robotoFont, color: labelColor })
      page.drawText(aluno.cpf || dm.cpfAluno || '-', { x: col2_1 + paddingLeft, y: y - 66.5, size: valueSize, font: robotoFont, color: valueColor })

      y -= tableHeight

      // 4. Termo de Compromisso
      y -= 8
      page.drawRectangle({
        x: margin,
        y: y - 10,
        width: tableWidth,
        height: 10,
        borderColor: rgb(0.1, 0.1, 0.1),
        borderWidth: 0.75,
        color: rgb(0.92, 0.92, 0.92)
      })
      page.drawText('TERMO DE COMPROMISSO DO RESPONSÁVEL LEGAL', {
        x: margin + paddingLeft,
        y: y - 8,
        size: 7,
        font: robotoFont,
        color: rgb(0, 0, 0)
      })

      const termoBoxHeight = 45
      page.drawRectangle({
        x: margin,
        y: y - 10 - termoBoxHeight,
        width: tableWidth,
        height: termoBoxHeight,
        borderColor: rgb(0.1, 0.1, 0.1),
        borderWidth: 0.75,
        color: rgb(1, 1, 1)
      })

      const termoText = 'Declaro, sob as penas da Lei, que as informações prestadas bem como documentos que apresento para a matrícula são verdadeiros e autênticos (fiéis à verdade e condizentes com a realidade). Estou ciente de que as informações contidas nesta ficha são muito importantes para o registro do CENSO ESCOLAR e para que a escola possa tomar as providências necessárias em caso de acidentes ou doenças durante a permanência do aluno no período de aulas. Firmo acordo de informar a escola caso haja qualquer mudança nas informações aqui prestadas e a manter-las sempre atualizada. Comprometo-me pelo zelo e preservação do patrimônio desta Escola e responsabilizo-me pelo ressarcimento de quaisquer danos e prejuízo causados pelo aluno sob nossa responsabilidade.'
      page.drawText(termoText, {
        x: margin + paddingLeft,
        y: y - 17,
        size: 6.2,
        font: robotoFont,
        lineHeight: 8,
        maxWidth: tableWidth - 12,
        color: rgb(0.15, 0.15, 0.15)
      })

      y -= (10 + termoBoxHeight)

      // 5. Uso de Imagem e Voz
      y -= 8
      page.drawRectangle({
        x: margin,
        y: y - 10,
        width: tableWidth,
        height: 10,
        borderColor: rgb(0.1, 0.1, 0.1),
        borderWidth: 0.75,
        color: rgb(0.92, 0.92, 0.92)
      })
      page.drawText('USO DE IMAGEM E VOZ', {
        x: margin + paddingLeft,
        y: y - 8,
        size: 7,
        font: robotoFont,
        color: rgb(0, 0, 0)
      })

      const imagemBoxHeight = 28
      page.drawRectangle({
        x: margin,
        y: y - 10 - imagemBoxHeight,
        width: tableWidth,
        height: imagemBoxHeight,
        borderColor: rgb(0.1, 0.1, 0.1),
        borderWidth: 0.75,
        color: rgb(1, 1, 1)
      })

      const autorizaTexto = 'Neste ato, e para todos os fins de direito admitidos autorizo expressamente a utilização da imagem e voz do alunos acima discriminado, em caráter definitivo e gratuito, constante em fotos e filmagens decorrentes da sua participação em eventos da Secretaria Municipal de Educação de Sapeaçu-Bahia.'
      page.drawText(autorizaTexto, {
        x: margin + paddingLeft,
        y: y - 17,
        size: 6.2,
        font: robotoFont,
        lineHeight: 7.8,
        maxWidth: 390,
        color: rgb(0.15, 0.15, 0.15)
      })

      // Checkboxes Sim / Não
      const optXSim = margin + 415
      const optXNao = margin + 475
      const optY = y - 20

      // Checkbox Sim
      page.drawRectangle({
        x: optXSim,
        y: optY,
        width: 8,
        height: 8,
        borderColor: rgb(0, 0, 0),
        borderWidth: 0.75,
        color: rgb(1, 1, 1)
      })
      page.drawText('Sim, autorizo.', { x: optXSim + 12, y: optY + 1, size: 6.5, font: robotoFont })
      if (autorizaImagemVoz === 'Sim') {
        page.drawText('X', { x: optXSim + 1.5, y: optY + 1, size: 6.5, font: robotoFont })
      }

      // Checkbox Não
      page.drawRectangle({
        x: optXNao,
        y: optY,
        width: 8,
        height: 8,
        borderColor: rgb(0, 0, 0),
        borderWidth: 0.75,
        color: rgb(1, 1, 1)
      })
      page.drawText('Não, não autorizo.', { x: optXNao + 12, y: optY + 1, size: 6.5, font: robotoFont })
      if (autorizaImagemVoz === 'Não') {
        page.drawText('X', { x: optXNao + 1.5, y: optY + 1, size: 6.5, font: robotoFont })
      }

      y -= (10 + imagemBoxHeight)

      // 6. Área de Assinaturas
      y -= 42
      const signatureWidth = 140
      const signatureHeight = 25

      // Funcionário (Esquerda)
      const xFunc = margin + 15
      page.drawImage(funcSigImage, {
        x: xFunc + 10,
        y: y + 6,
        width: signatureWidth,
        height: signatureHeight
      })
      page.drawLine({
        start: { x: xFunc, y: y + 4 },
        end: { x: xFunc + signatureWidth + 20, y: y + 4 },
        thickness: 0.5,
        color: rgb(0.1, 0.1, 0.1)
      })
      const txtFuncLabel = isTopCopy 
        ? 'ASSINATURA DO FUNCIONÁRIO RESPONSÁVEL PELA MATRÍCULA' 
        : 'FUNCIONÁRIO RESPONSÁVEL PELA MATRÍCULA'
      page.drawText(txtFuncLabel, { x: xFunc - 5, y: y - 5, size: 6.2, font: robotoFont, color: rgb(0.2, 0.2, 0.2) })

      // Responsável (Direita)
      const xResp = width - margin - signatureWidth - 35
      page.drawImage(respSigImage, {
        x: xResp + 10,
        y: y + 6,
        width: signatureWidth,
        height: signatureHeight
      })
      page.drawLine({
        start: { x: xResp, y: y + 4 },
        end: { x: xResp + signatureWidth + 20, y: y + 4 },
        thickness: 0.5,
        color: rgb(0.1, 0.1, 0.1)
      })
      page.drawText('ASSINATURA DO PAI/MÃE/RESPONSÁVEL PELO ALUNO(A)', { x: xResp - 5, y: y - 5, size: 6.2, font: robotoFont, color: rgb(0.2, 0.2, 0.2) })

      y -= 15

      // 7. Tarja de Autenticidade Digital
      y -= 40
      page.drawRectangle({
        x: margin,
        y: y,
        width: tableWidth,
        height: 35,
        borderColor: rgb(0.8, 0.8, 0.8),
        borderWidth: 0.5,
        color: rgb(0.96, 0.97, 0.98)
      })

      page.drawImage(qrCodeImage, {
        x: margin + 5,
        y: y + 3.5,
        width: 28,
        height: 28
      })

      const xMeta = margin + 40
      page.drawText('DOCUMENTO ASSINADO ELETRONICAMENTE', { 
        x: xMeta, 
        y: y + 25, 
        size: 7, 
        font: robotoFont, 
        color: rgb(0.1, 0.2, 0.4) 
      })
      page.drawText(`Chave de Verificação: ${token}  |  Hash SHA-256: ${hashText}`, { 
        x: xMeta, 
        y: y + 15, 
        size: 5.5, 
        font: robotoFont, 
        color: rgb(0.1, 0.1, 0.1) 
      })
      page.drawText(`Valide este comprovante lendo o QR Code ou em: ${verificationUrl}`, { 
        x: xMeta, 
        y: y + 6, 
        size: 5.5, 
        font: robotoFont, 
        color: rgb(0.3, 0.3, 0.3) 
      })
    }

    // Coordenadas Y de início de cada via
    const via0YStart = height - 20 // Via Superior
    const via1YStart = height / 2 - 15 // Via Inferior
    const placeholderHash = '----------------------------------------------------------------'

    // Passo A: Desenhar ambas as vias com um hash provisório
    drawVia(via0YStart, true, placeholderHash)
    drawVia(via1YStart, false, placeholderHash)

    // Desenhar a linha tracejada divisória de vias (meio da página A4)
    const yMiddle = height / 2
    page.drawLine({
      start: { x: 20, y: yMiddle },
      end: { x: width - 20, y: yMiddle },
      thickness: 1,
      dashArray: [4, 4],
      color: rgb(0.5, 0.5, 0.5)
    })

    // Salvar o arquivo PDF temporariamente em buffer para computar o hash correto
    const tempPdfBytes = await pdfDoc.save()

    // Calcular o Hash SHA-256 final a partir dos bytes temporários
    const hash = crypto.createHash('sha256').update(tempPdfBytes).digest('hex')

    // Passo B: Redesenhar os blocos de autenticidade (com a real chave e hash real)
    drawVia(via0YStart, true, hash)
    drawVia(via1YStart, false, hash)

    // Salvar o PDF finalizado com o hash impresso nas vias
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
