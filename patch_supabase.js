const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/types/supabase.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Replace foto_url with foto_url, foto_avatar_path, foto_visualizacao_path, foto_original_path, foto_updated_at
content = content.replace(/foto_url: string \| null/g, `foto_url: string | null
          foto_avatar_path: string | null
          foto_visualizacao_path: string | null
          foto_original_path: string | null
          foto_updated_at: string | null`);
          
content = content.replace(/foto_url\?: string \| null/g, `foto_url?: string | null
          foto_avatar_path?: string | null
          foto_visualizacao_path?: string | null
          foto_original_path?: string | null
          foto_updated_at?: string | null`);

fs.writeFileSync(filePath, content, 'utf8');
