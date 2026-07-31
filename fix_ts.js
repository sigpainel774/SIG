const fs = require('fs');
const path = require('path');

// 1. Fix route.ts cookies
const fixCookies = (file) => {
  const p = path.join(__dirname, file);
  if (!fs.existsSync(p)) return;
  let c = fs.readFileSync(p, 'utf8');
  c = c.replace(/const cookieStore = cookies\(\)/g, 'const cookieStore = await cookies()');
  fs.writeFileSync(p, c, 'utf8');
}
fixCookies('src/app/api/fotos/presigned-url/route.ts');
fixCookies('src/app/api/fotos/process/route.ts');

// 2. Fix entity cast in process/route.ts
const pRoute = path.join(__dirname, 'src/app/api/fotos/process/route.ts');
if (fs.existsSync(pRoute)) {
  let c = fs.readFileSync(pRoute, 'utf8');
  c = c.replace(/from\(entity\)/g, "from(entity as 'alunos' | 'funcionarios')");
  fs.writeFileSync(pRoute, c, 'utf8');
}

// 3. Fix MapaAlunos and MapaGlobal getAvatarUrl nullability
const replaceNullToUndef = (file) => {
  const p = path.join(__dirname, file);
  if (!fs.existsSync(p)) return;
  let c = fs.readFileSync(p, 'utf8');
  // if we have getAvatarUrl(aluno) we can change it to getAvatarUrl(aluno) ?? undefined inside the component or we can change getAvatarUrl to return string | undefined instead of string | null.
  fs.writeFileSync(p, c, 'utf8');
}

// Actually, let's fix getAvatarUrl in photoHelper to return string | undefined!
const pHelper = path.join(__dirname, 'src/lib/photoHelper.ts');
if (fs.existsSync(pHelper)) {
  let c = fs.readFileSync(pHelper, 'utf8');
  c = c.replace(/string \| null/g, 'string | undefined');
  c = c.replace(/return null/g, 'return undefined');
  c = c.replace(/return base\?/g, 'return (base?');
  // ensure we return undefined instead of null
  c = c.replace(/ : null/g, ' : undefined)');
  // actually just let's blindly replace null -> undefined in returns
  fs.writeFileSync(pHelper, c, 'utf8');
}

// Fix print-relatorio-geolocalizacao.tsx
const pPrint = path.join(__dirname, 'src/components/print/print-relatorio-geolocalizacao.tsx');
if (fs.existsSync(pPrint)) {
  let c = fs.readFileSync(pPrint, 'utf8');
  c = c.replace(/foto_url: string \| null/g, 'foto_url: string | undefined');
  fs.writeFileSync(pPrint, c, 'utf8');
}

// Fix TabAlunosTurma and TabFrequenciasTurma
const pTabA = path.join(__dirname, 'src/components/turmas/TabAlunosTurma.tsx');
if (fs.existsSync(pTabA)) {
  let c = fs.readFileSync(pTabA, 'utf8');
  c = c.replace(/foto_url \|\| undefined/g, 'foto_url ?? undefined');
  fs.writeFileSync(pTabA, c, 'utf8');
}
