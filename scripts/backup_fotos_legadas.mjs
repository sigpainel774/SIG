import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Faltam variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function makeCrc32Table() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
}
const crcTable = makeCrc32Table();

function calculateCrc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i++) {
    crc = crcTable[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

class SimpleZip {
  constructor() {
    this.files = [];
  }

  addFile(name, contentBuffer) {
    const filenameBuf = Buffer.from(name, 'utf8');
    const crc = calculateCrc32(contentBuffer);
    const uncompressedSize = contentBuffer.length;
    const compressedData = zlib.deflateRawSync(contentBuffer, { level: 6 });
    const compressedSize = compressedData.length;

    this.files.push({
      filename: name,
      filenameBuf,
      crc,
      uncompressedSize,
      compressedSize,
      compressedData
    });
  }

  toBuffer() {
    const localHeaders = [];
    const cdHeaders = [];
    let offset = 0;

    for (const f of this.files) {
      const lfh = Buffer.alloc(30 + f.filenameBuf.length);
      lfh.writeUInt32LE(0x04034b50, 0);
      lfh.writeUInt16LE(20, 4);
      lfh.writeUInt16LE(0, 6);
      lfh.writeUInt16LE(8, 8);
      lfh.writeUInt16LE(0, 10);
      lfh.writeUInt16LE(0, 12);
      lfh.writeUInt32LE(f.crc, 14);
      lfh.writeUInt32LE(f.compressedSize, 18);
      lfh.writeUInt32LE(f.uncompressedSize, 22);
      lfh.writeUInt16LE(f.filenameBuf.length, 26);
      lfh.writeUInt16LE(0, 28);
      f.filenameBuf.copy(lfh, 30);

      localHeaders.push(lfh, f.compressedData);

      const cdh = Buffer.alloc(46 + f.filenameBuf.length);
      cdh.writeUInt32LE(0x02014b50, 0);
      cdh.writeUInt16LE(20, 4);
      cdh.writeUInt16LE(20, 6);
      cdh.writeUInt16LE(0, 8);
      cdh.writeUInt16LE(8, 10);
      cdh.writeUInt16LE(0, 12);
      cdh.writeUInt16LE(0, 14);
      cdh.writeUInt32LE(f.crc, 16);
      cdh.writeUInt32LE(f.compressedSize, 20);
      cdh.writeUInt32LE(f.uncompressedSize, 24);
      cdh.writeUInt16LE(f.filenameBuf.length, 28);
      cdh.writeUInt16LE(0, 30);
      cdh.writeUInt16LE(0, 32);
      cdh.writeUInt16LE(0, 34);
      cdh.writeUInt16LE(0, 36);
      cdh.writeUInt32LE(0, 38);
      cdh.writeUInt32LE(offset, 42);
      f.filenameBuf.copy(cdh, 46);

      cdHeaders.push(cdh);
      offset += lfh.length + f.compressedData.length;
    }

    const cdStartOffset = offset;
    let cdSize = 0;
    for (const cdh of cdHeaders) {
      cdSize += cdh.length;
    }

    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(0, 4);
    eocd.writeUInt16LE(0, 6);
    eocd.writeUInt16LE(this.files.length, 8);
    eocd.writeUInt16LE(this.files.length, 10);
    eocd.writeUInt32LE(cdSize, 12);
    eocd.writeUInt32LE(cdStartOffset, 16);
    eocd.writeUInt16LE(0, 20);

    return Buffer.concat([...localHeaders, ...cdHeaders, eocd]);
  }
}

function sanitizeFilename(text) {
  if (!text) return 'desconhecido';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 40);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function runBackup() {
  console.log('================================================================');
  console.log('   INICIANDO BACKUP DE FOTOS LEGADAS E GERAÇÃO DE MANIFESTO');
  console.log('================================================================\n');

  console.log('1. Buscando cadastros com foto no Supabase...');
  
  const { data: funcionarios, error: errFunc } = await supabase
    .from('funcionarios')
    .select('id, nome, cpf, cargo, foto_url')
    .not('foto_url', 'is', null);

  if (errFunc) {
    console.error('Erro ao buscar funcionários:', errFunc);
    process.exit(1);
  }

  const { data: alunos, error: errAlunos } = await supabase
    .from('alunos')
    .select('id, nome, numero_matricula, serie, foto_url')
    .not('foto_url', 'is', null);

  if (errAlunos) {
    console.error('Erro ao buscar alunos:', errAlunos);
    process.exit(1);
  }

  const funcItems = (funcionarios || []).map(f => ({
    tipo: 'Funcionário',
    id: f.id,
    nome: f.nome,
    doc: f.cpf || 'Não informado',
    cargoOuSerie: f.cargo || 'Funcionário',
    folder: 'funcionarios',
    fotoUrl: f.foto_url
  }));

  const alunItems = (alunos || []).map(a => ({
    tipo: 'Aluno',
    id: a.id,
    nome: a.nome,
    doc: a.numero_matricula || 'Sem matrícula',
    cargoOuSerie: a.serie || 'Estudante',
    folder: 'alunos',
    fotoUrl: a.foto_url
  }));

  const totalList = [...funcItems, ...alunItems];
  console.log(`- Total de fotos para baixar em paralelo: ${totalList.length}`);

  const zip = new SimpleZip();
  const manifesto = [];
  let baixadosComSucesso = 0;
  let falhas = 0;

  console.log('\n2. Baixando arquivos de fotos em paralelo...');

  // Chunk size 15 for fast parallel download
  const CHUNK_SIZE = 15;
  for (let i = 0; i < totalList.length; i += CHUNK_SIZE) {
    const chunk = totalList.slice(i, i + CHUNK_SIZE);
    await Promise.all(chunk.map(async (item) => {
      const cleanName = sanitizeFilename(item.nome);
      const shortId = item.id.substring(0, 8);

      let ext = '.jpg';
      if (item.fotoUrl.includes('.png')) ext = '.png';
      else if (item.fotoUrl.includes('.webp')) ext = '.webp';

      const zipPath = `${item.folder}/${item.folder.slice(0, -1)}_${shortId}_${cleanName}${ext}`;

      try {
        const res = await fetch(item.fotoUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        zip.addFile(zipPath, buffer);
        baixadosComSucesso++;

        manifesto.push({
          tipo: item.tipo,
          id: item.id,
          nome: item.nome,
          documento_ou_matricula: item.doc,
          cargo_ou_serie: item.cargoOuSerie,
          arquivo_no_zip: zipPath,
          tamanho_bytes: buffer.length,
          status_download: 'SUCESSO',
          foto_url_origem: item.fotoUrl
        });

        console.log(`  [OK] ${item.nome} -> ${zipPath} (${formatBytes(buffer.length)})`);
      } catch (err) {
        falhas++;
        console.error(`  [FALHA] ${item.nome}:`, err.message);
        manifesto.push({
          tipo: item.tipo,
          id: item.id,
          nome: item.nome,
          documento_ou_matricula: item.doc,
          cargo_ou_serie: item.cargoOuSerie,
          arquivo_no_zip: 'N/A',
          tamanho_bytes: 0,
          status_download: `FALHA (${err.message})`,
          foto_url_origem: item.fotoUrl
        });
      }
    }));
  }

  console.log('\n3. Gerando Arquivos de Manifesto de Identificação...');

  const jsonContent = JSON.stringify(manifesto, null, 2);
  zip.addFile('manifesto_identificacao.json', Buffer.from(jsonContent, 'utf8'));

  let csvContent = '\uFEFF"Tipo";"ID";"Nome";"CPF ou Matrícula";"Cargo ou Série";"Arquivo no ZIP";"Tamanho (Bytes)";"Status Download";"URL Origem Supabase"\n';
  manifesto.forEach(item => {
    csvContent += `"${item.tipo}";"${item.id}";"${item.nome}";"${item.documento_ou_matricula}";"${item.cargo_ou_serie}";"${item.arquivo_no_zip}";"${item.tamanho_bytes}";"${item.status_download}";"${item.foto_url_origem}"\n`;
  });
  zip.addFile('manifesto_identificacao.csv', Buffer.from(csvContent, 'utf8'));

  console.log('\n4. Compactando e salvando arquivo ZIP final...');
  const zipBuffer = zip.toBuffer();

  const backupsDir = path.resolve(process.cwd(), 'backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const zipFileName = `fotos_legadas_backup.zip`;
  const zipFilePath = path.join(backupsDir, zipFileName);

  fs.writeFileSync(zipFilePath, zipBuffer);

  console.log('\n================================================================');
  console.log('             BACKUP CONCLUÍDO COM SUCESSO!                      ');
  console.log('================================================================');
  console.log(`- Arquivo ZIP Criado: ${zipFilePath}`);
  console.log(`- Tamanho do Arquivo ZIP: ${formatBytes(zipBuffer.length)}`);
  console.log(`- Fotos Empacotadas com Sucesso: ${baixadosComSucesso}`);
  console.log(`- Fotos com Falha no Download: ${falhas}`);
  console.log(`- Manifestos Incluídos no ZIP: manifesto_identificacao.json e manifesto_identificacao.csv`);
  console.log('================================================================\n');
}

runBackup().catch(console.error);
