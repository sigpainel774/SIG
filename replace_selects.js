const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk(path.join(__dirname, 'src'));

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const regex = /(\.select\(\s*['"][^'"]*)\bfoto_url\b(?!,\s*foto_avatar_path)([^'"]*['"]\s*\))/g;
  
  if (regex.test(content)) {
    console.log('Modified:', file);
    content = content.replace(regex, '$1foto_url, foto_avatar_path, foto_visualizacao_path, foto_updated_at$2');
    fs.writeFileSync(file, content, 'utf8');
  }
});
