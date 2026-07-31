const fs = require('fs');
const path = require('path');

const pHelper = path.join(__dirname, 'src/lib/photoHelper.ts');
if (fs.existsSync(pHelper)) {
  let c = fs.readFileSync(pHelper, 'utf8');
  c = c.replace(/string \| undefined/g, 'string | null | undefined');
  c = c.replace(/return getVersaoImagemUrl\(url, registro\.foto_updated_at\)/g, 'return getVersaoImagemUrl(url ?? null, registro.foto_updated_at) ?? undefined');
  fs.writeFileSync(pHelper, c, 'utf8');
}

const pPrint = path.join(__dirname, 'src/components/print/print-relatorio-geolocalizacao.tsx');
if (fs.existsSync(pPrint)) {
  let c = fs.readFileSync(pPrint, 'utf8');
  c = c.replace(/Object is possibly 'undefined'/g, ''); // just a comment in mind, TS throws error
  c = c.replace(/const isAluno = item\.cargoOuTurma\.includes/g, 'const isAluno = item?.cargoOuTurma?.includes');
  fs.writeFileSync(pPrint, c, 'utf8');
}
