import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import dotenv from 'dotenv';
import path from 'path';

// Carrega as variáveis de ambiente do .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Faltam variáveis de ambiente no .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function processPhoto(record, entityName) {
  try {
    const { id, foto_url } = record;
    console.log(`\nProcessando [${entityName}] ID: ${id} - URL: ${foto_url}`);

    // 1. Download the original image
    const response = await fetch(foto_url);
    if (!response.ok) {
      throw new Error(`Erro ao baixar a imagem: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 2. Generate Avatar (160x200, WebP, cover)
    const avatarBuffer = await sharp(buffer)
      .rotate() // Auto-orient based on EXIF
      .resize({ width: 160, height: 200, fit: 'cover', position: 'center' })
      .webp({ quality: 82 })
      .toBuffer();

    const avatarFileName = `${id}_avatar_${Date.now()}.webp`;
    const avatarPath = `${entityName}/${avatarFileName}`;

    // 3. Generate Visualizacao (480x600, WebP, cover)
    const visualizacaoBuffer = await sharp(buffer)
      .rotate() // Auto-orient based on EXIF
      .resize({ width: 480, height: 600, fit: 'cover', position: 'center' })
      .webp({ quality: 85 })
      .toBuffer();

    const visualizacaoFileName = `${id}_visualizacao_${Date.now()}.webp`;
    const visualizacaoPath = `${entityName}/${visualizacaoFileName}`;

    // 4. Generate Original optimized (just in case we want a clean copy, but let's stick to original bytes for 'original')
    const originalFileName = `${id}_original_${Date.now()}.webp`;
    const originalPath = `${entityName}/${originalFileName}`;
    
    // Convert to webp to save space and remove EXIF, as per plan.
    const originalBuffer = await sharp(buffer)
      .rotate()
      .webp({ quality: 90 }) // just a basic compression
      .toBuffer();

    // 5. Upload to buckets
    console.log(`  -> Fazendo upload para fotos-avatar...`);
    const { error: err1 } = await supabase.storage.from('fotos-avatar').upload(avatarPath, avatarBuffer, { contentType: 'image/webp', upsert: true });
    if (err1) throw err1;

    console.log(`  -> Fazendo upload para fotos-visualizacao...`);
    const { error: err2 } = await supabase.storage.from('fotos-visualizacao').upload(visualizacaoPath, visualizacaoBuffer, { contentType: 'image/webp', upsert: true });
    if (err2) throw err2;

    console.log(`  -> Fazendo upload para fotos-originais...`);
    const { error: err3 } = await supabase.storage.from('fotos-originais').upload(originalPath, originalBuffer, { contentType: 'image/webp', upsert: true });
    if (err3) throw err3;

    // 6. Update Database
    const updatedAt = new Date().toISOString();
    console.log(`  -> Atualizando banco de dados...`);
    const { error: dbError } = await supabase
      .from(entityName)
      .update({
        foto_avatar_path: avatarPath,
        foto_visualizacao_path: visualizacaoPath,
        foto_original_path: originalPath,
        foto_updated_at: updatedAt
      })
      .eq('id', id);

    if (dbError) throw dbError;

    console.log(`  [Sucesso] Registro ${id} atualizado.`);
    return true;
  } catch (error) {
    console.error(`  [Erro] Falha ao processar ID ${record.id}:`, error.message);
    return false;
  }
}

async function runMigration() {
  console.log("Iniciando migração de fotos...");

  // Funcionários
  const { data: funcionarios, error: errFunc } = await supabase
    .from('funcionarios')
    .select('id, foto_url')
    .not('foto_url', 'is', null)
    .is('foto_avatar_path', null);

  if (errFunc) {
    console.error("Erro ao buscar funcionarios:", errFunc);
    return;
  }

  // Alunos
  const { data: alunos, error: errAlunos } = await supabase
    .from('alunos')
    .select('id, foto_url')
    .not('foto_url', 'is', null)
    .is('foto_avatar_path', null);

  if (errAlunos) {
    console.error("Erro ao buscar alunos:", errAlunos);
    return;
  }

  console.log(`Encontrados ${funcionarios.length} funcionários e ${alunos.length} alunos para migrar.`);

  let successCount = 0;
  let failCount = 0;

  for (const f of funcionarios) {
    const ok = await processPhoto(f, 'funcionarios');
    if (ok) successCount++; else failCount++;
  }

  for (const a of alunos) {
    const ok = await processPhoto(a, 'alunos');
    if (ok) successCount++; else failCount++;
  }

  console.log(`\nMigração concluída! Sucessos: ${successCount} | Falhas: ${failCount}`);
}

runMigration().catch(console.error);
