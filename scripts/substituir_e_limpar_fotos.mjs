import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Faltam variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function checkUrlExists(url) {
  if (!url || typeof url !== 'string' || !url.startsWith('http')) return false;
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.status === 200;
  } catch (err) {
    return false;
  }
}

async function processAndUploadWebP(id, entity, originalPhotoUrl) {
  const response = await fetch(originalPhotoUrl);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const timestamp = Date.now();
  const avatarPath = `${entity}/${id}_avatar_${timestamp}.webp`;
  const visualizacaoPath = `${entity}/${id}_vis_${timestamp}.webp`;
  const originalPath = `${entity}/${id}_orig_${timestamp}.webp`;

  const [avatarBuffer, visualizacaoBuffer, origBuffer] = await Promise.all([
    sharp(buffer).rotate().resize(256, 256, { fit: 'cover', position: 'top' }).webp({ quality: 80, effort: 4 }).toBuffer(),
    sharp(buffer).rotate().resize(1024, 1024, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 85, effort: 4 }).toBuffer(),
    sharp(buffer).rotate().webp({ quality: 90 }).toBuffer()
  ]);

  await Promise.all([
    supabase.storage.from('fotos-avatar').upload(avatarPath, avatarBuffer, { contentType: 'image/webp', upsert: true }),
    supabase.storage.from('fotos-visualizacao').upload(visualizacaoPath, visualizacaoBuffer, { contentType: 'image/webp', upsert: true }),
    supabase.storage.from('fotos-originais').upload(originalPath, origBuffer, { contentType: 'image/webp', upsert: true })
  ]);

  return { avatarPath, visualizacaoPath, originalPath };
}

function parseStorageBucketAndPath(fotoUrl) {
  if (!fotoUrl || !fotoUrl.includes('/storage/v1/object/public/')) return null;
  const parts = fotoUrl.split('/storage/v1/object/public/');
  if (parts.length < 2) return null;
  const pathParts = parts[1].split('/');
  const bucket = pathParts[0];
  const filePath = pathParts.slice(1).join('/');
  return { bucket, filePath };
}

async function runReplacementAndPurge() {
  console.log('================================================================');
  console.log(' INICIANDO SUBSTITUIÇÃO DE FOTOS E PURGA DE JPEGS NO STORAGE (PARALELO)');
  console.log('================================================================\n');

  const { data: funcionarios } = await supabase.from('funcionarios').select('id, nome, foto_url, foto_avatar_path, foto_visualizacao_path, foto_original_path').not('foto_url', 'is', null);
  const { data: alunos } = await supabase.from('alunos').select('id, nome, foto_url, foto_avatar_path, foto_visualizacao_path, foto_original_path').not('foto_url', 'is', null);

  const allRecords = [
    ...(funcionarios || []).map(f => ({ ...f, entity: 'funcionarios' })),
    ...(alunos || []).map(a => ({ ...a, entity: 'alunos' }))
  ];

  console.log(`Processando em lote paralelo ${allRecords.length} cadastros...\n`);

  let sucessos = 0;
  let falhas = 0;
  let bytesLiberados = 0;
  let webpGeradosNaHora = 0;

  const BATCH_SIZE = 15;
  for (let i = 0; i < allRecords.length; i += BATCH_SIZE) {
    const batch = allRecords.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async (rec) => {
      try {
        let avatarPath = rec.foto_avatar_path;
        let visualizacaoPath = rec.foto_visualizacao_path;
        let originalPath = rec.foto_original_path;

        let avatarUrl = avatarPath ? `${supabaseUrl}/storage/v1/object/public/fotos-avatar/${avatarPath}` : null;
        let visualizacaoUrl = visualizacaoPath ? `${supabaseUrl}/storage/v1/object/public/fotos-visualizacao/${visualizacaoPath}` : null;

        const avatarOk = await checkUrlExists(avatarUrl);
        const visOk = await checkUrlExists(visualizacaoUrl);

        if (!avatarOk || !visOk) {
          const generated = await processAndUploadWebP(rec.id, rec.entity, rec.foto_url);
          avatarPath = generated.avatarPath;
          visualizacaoPath = generated.visualizacaoPath;
          originalPath = generated.originalPath;
          visualizacaoUrl = `${supabaseUrl}/storage/v1/object/public/fotos-visualizacao/${visualizacaoPath}`;
          webpGeradosNaHora++;
        }

        const updatedTimestamp = new Date().toISOString();
        const newFotoUrl = visualizacaoUrl || rec.foto_url;

        const { error: updateErr } = await supabase
          .from(rec.entity)
          .update({
            foto_avatar_path: avatarPath,
            foto_visualizacao_path: visualizacaoPath,
            foto_original_path: originalPath,
            foto_url: newFotoUrl,
            foto_updated_at: updatedTimestamp
          })
          .eq('id', rec.id);

        if (updateErr) throw updateErr;

        const parsedStorage = parseStorageBucketAndPath(rec.foto_url);
        if (parsedStorage && ['fotos-funcionarios', 'fotos-alunos'].includes(parsedStorage.bucket)) {
          let size = 0;
          try {
            const resJpg = await fetch(rec.foto_url, { method: 'HEAD' });
            size = parseInt(resJpg.headers.get('content-length') || '0', 10);
          } catch (_) {}

          const { error: removeErr } = await supabase.storage
            .from(parsedStorage.bucket)
            .remove([parsedStorage.filePath]);

          if (!removeErr) {
            bytesLiberados += size;
          }
        }

        sucessos++;
        console.log(`  [OK] ${rec.nome} -> WebP validado, BD atualizado, JPEG removido.`);
      } catch (err) {
        falhas++;
        console.error(`  [ERRO] ${rec.nome}:`, err.message);
      }
    }));
  }

  console.log('\n================================================================');
  console.log('      SUBSTITUIÇÃO E LIMPEZA CONCLUÍDAS COM SUCESSO!            ');
  console.log('================================================================');
  console.log(`- Total de Registros Processados: ${allRecords.length}`);
  console.log(`- Atualizados com Sucesso: ${sucessos}`);
  console.log(`- Falhas: ${falhas}`);
  console.log(`- WebPs Gerados na Hora: ${webpGeradosNaHora}`);
  console.log(`- Espaço Efetivamente Liberado no Supabase: ${formatBytes(bytesLiberados)}`);
  console.log('================================================================\n');
}

runReplacementAndPurge().catch(console.error);
