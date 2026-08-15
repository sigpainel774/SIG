const QRCode = require('qrcode');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function gerarQRCode() {
  const url = 'https://sig-six-kappa.vercel.app/portal-aluno';
  const logoPath = path.join(__dirname, '..', 'public', 'img', 'brasaoSapeaçu.png');
  const logoPrefeitura = fs.existsSync(logoPath) 
    ? logoPath 
    : path.join(__dirname, '..', 'public', 'img', 'logo-prefeitura.png');

  console.log('Usando logo:', logoPrefeitura);

  // 1. Gerar buffer do QR Code em PNG com resolução 1024x1024 e Error Correction Level 'H' (30% de tolerância)
  const qrBuffer = await QRCode.toBuffer(url, {
    errorCorrectionLevel: 'H',
    type: 'png',
    width: 1024,
    margin: 3,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });

  // 2. Processar a logo para encaixar no centro com fundo circular branco e borda sutil
  const logoSize = 240; // ~23% do QR Code, perfeitamente legível com nível H
  const circlePadding = 16;
  const badgeSize = logoSize + circlePadding * 2;

  // Criar SVG de fundo circular branco com sombra/borda suave
  const backgroundCircleSvg = Buffer.from(`
    <svg width="${badgeSize}" height="${badgeSize}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${badgeSize/2}" cy="${badgeSize/2}" r="${badgeSize/2 - 2}" fill="#ffffff" stroke="#e2e8f0" stroke-width="4" />
    </svg>
  `);

  // Redimensionar a logo
  const resizedLogoBuffer = await sharp(logoPrefeitura)
    .resize(logoSize, logoSize, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 0 }
    })
    .png()
    .toBuffer();

  // Compor a logo sobre o círculo branco
  const centerBadgeBuffer = await sharp(backgroundCircleSvg)
    .composite([
      {
        input: resizedLogoBuffer,
        top: circlePadding,
        left: circlePadding,
      },
    ])
    .png()
    .toBuffer();

  // 3. Compor o QR Code final
  const finalQrImage = await sharp(qrBuffer)
    .composite([
      {
        input: centerBadgeBuffer,
        gravity: 'center',
      },
    ])
    .png()
    .toBuffer();

  // 4. Salvar nos diretórios de destino
  const publicImgDest = path.join(__dirname, '..', 'public', 'img', 'qrcode-portal-pais.png');
  fs.writeFileSync(publicImgDest, finalQrImage);
  console.log('Salvo em:', publicImgDest);

  // Salvar na pasta Imagens / Pictures do Windows do usuário
  const userHome = process.env.USERPROFILE || 'C:\\Users\\Pc';
  const possibleImageDirs = [
    path.join(userHome, 'Pictures'),
    path.join(userHome, 'Imagens'),
    path.join(userHome, 'Images'),
    path.join(userHome, 'Desktop'),
    path.join(userHome, 'Downloads'),
  ];

  for (const dir of possibleImageDirs) {
    try {
      if (fs.existsSync(dir)) {
        const dest = path.join(dir, 'qrcode-portal-dos-pais.png');
        fs.writeFileSync(dest, finalQrImage);
        console.log('Salvo com sucesso em:', dest);
      }
    } catch (e) {
      console.warn('Não foi possível salvar em:', dir, e.message);
    }
  }

  console.log('QR Code gerado com sucesso!');
}

gerarQRCode().catch(console.error);
