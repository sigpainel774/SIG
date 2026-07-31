const fs = require('fs');
const path = require('path');

const replaceInFile = (file, target, replacement) => {
  const p = path.join(__dirname, file);
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');
    c = c.replace(target, replacement);
    fs.writeFileSync(p, c, 'utf8');
  }
}

replaceInFile('src/components/map/MapaAlunos.tsx', /getAvatarUrl\(aluno\)/g, '(getAvatarUrl(aluno) ?? undefined)');
replaceInFile('src/components/map/MapaGlobal.tsx', /getAvatarUrl\(item\)/g, '(getAvatarUrl(item) ?? undefined)');
replaceInFile('src/components/print/print-relatorio-geolocalizacao.tsx', /foto_url: string \| null \| undefined/g, 'foto_url: string | undefined');
replaceInFile('src/components/print/print-relatorio-geolocalizacao.tsx', /foto_url: getAvatarUrl\(item\)/g, 'foto_url: getAvatarUrl(item) ?? undefined');
replaceInFile('src/components/print/print-relatorio-geolocalizacao.tsx', /foto_url: getAvatarUrl\(f\)/g, 'foto_url: getAvatarUrl(f) ?? undefined');
replaceInFile('src/components/print/print-relatorio-geolocalizacao.tsx', /foto_url: getAvatarUrl\(a\)/g, 'foto_url: getAvatarUrl(a) ?? undefined');

replaceInFile('src/components/turmas/TabAlunosTurma.tsx', /foto_url: getAvatarUrl\(aluno\)/g, 'foto_url: getAvatarUrl(aluno) ?? undefined');
replaceInFile('src/components/turmas/TabFrequenciasTurma.tsx', /foto_url: getAvatarUrl\(aluno\)/g, 'foto_url: getAvatarUrl(aluno) ?? undefined');

