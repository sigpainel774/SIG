const fs = require('fs');
const path = require('path');

const files = [
  'src/components/alunos/AlunosList.tsx',
  'src/components/funcionarios/FuncionariosList.tsx',
  'src/components/map/MapaAlunos.tsx',
  'src/components/map/MapaGlobal.tsx',
  'src/components/map/MapaImpressao.tsx',
  'src/components/modals/lotacoes/FuncionarioLotacaoList.tsx',
  'src/components/modals/modal-gestao-lotacoes.tsx',
  'src/components/turmas/TabAlunosTurma.tsx',
  'src/components/turmas/TabFrequenciasTurma.tsx'
];

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (!content.includes('getAvatarUrl')) {
    // Inject import after React or other imports
    content = content.replace(/(import .* from ['"]react['"];?\n?)/, "$1import { getAvatarUrl } from '@/lib/photoHelper';\n");
    if (!content.includes('@/lib/photoHelper')) {
        content = "import { getAvatarUrl } from '@/lib/photoHelper';\n" + content;
    }
  }

  // Replace aluno.foto_url, funcionario.foto_url, func.foto_url, lot.foto_url, f.foto_url
  content = content.replace(/([a-zA-Z0-9_]+)\.foto_url/g, "getAvatarUrl($1)");

  fs.writeFileSync(filePath, content, 'utf8');
});

const filesPrint = [
  'src/components/ModalDetalhesAluno.tsx',
  'src/components/modals/modal-imprimir-relacao-turma.tsx',
  'src/components/print/print-comprovante-matricula.tsx',
  'src/components/print/print-ficha-aluno.tsx',
  'src/components/print/print-relacao-alunos-fotos.tsx',
  'src/components/print/print-relatorio-geolocalizacao.tsx'
];

filesPrint.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (!content.includes('getVisualizacaoUrl')) {
    content = content.replace(/(import .* from ['"]react['"];?\n?)/, "$1import { getVisualizacaoUrl } from '@/lib/photoHelper';\n");
    if (!content.includes('@/lib/photoHelper')) {
        content = "import { getVisualizacaoUrl } from '@/lib/photoHelper';\n" + content;
    }
  }

  // Relacionamento fotos
  if(file.includes('print-relacao-alunos-fotos')) {
     content = content.replace(/([a-zA-Z0-9_]+)\.foto_url/g, "getVisualizacaoUrl($1)");
  } else {
     content = content.replace(/([a-zA-Z0-9_]+)\.foto_url/g, "getVisualizacaoUrl($1)");
  }

  fs.writeFileSync(filePath, content, 'utf8');
});
