const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Carregar variáveis de ambiente do .env.local
const envFile = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
const supabaseUrl = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseServiceKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('ERRO: Variáveis SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontradas no .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const TABELAS = [
  'escolas',
  'funcionarios',
  'vinculos_funcionarios',
  'acessos_usuarios',
  'alunos',
  'alunos_anexos',
  'turmas',
  'vinculos_turmas',
  'materias',
  'notas',
  'frequencias',
  'ocorrencias',
  'atestados',
  'assinatura',
  'trash_bin',
  'grade_semanal',
  'horarios_aulas_slots',
  'orgaos',
  'pontos_ronda',
  'blocked_ips',
  'access_logs',
  'notifications',
  'cargos',
  'dispositivos',
  'veiculos',
  'rotas_transporte',
  'alunos_transporte',
  'rotas_ronda',
  'registros_ronda',
  'transferencias_alunos',
  'arquivados',
  'bug_reports',
  'transacoes_financeiras',
  'escalas_servico',
  'movimentacoes_funcionarios',
  'solicitacoes_rh',
  'comunicados',
  'performance_metrics',
  'recuperacoes_finais',
  'solicitacoes_edicao_aluno',
  'configuracao_notificacoes_niveis',
  'prazos_unidades',
  'transferencias_funcionarios',
  'atividades_secretaria',
  'atividades_secretaria_historico',
  'grade_curricular_escola',
  'agenda_aulas',
  'folha_pagamento_config',
  'desligamentos_programados',
  'adicionais_salario',
  'configuracoes_rede',
  'abastecimentos_veiculos',
  'manutencoes_veiculos'
];

async function exportTable(tabela) {
  let allRows = [];
  let from = 0;
  const step = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from(tabela)
      .select('*')
      .range(from, from + step - 1);

    if (error) {
      console.warn(`⚠️ Aviso na tabela '${tabela}': ${error.message}`);
      break;
    }

    if (data && data.length > 0) {
      allRows = allRows.concat(data);
      from += step;
      if (data.length < step) {
        hasMore = false;
      }
    } else {
      hasMore = false;
    }
  }

  return allRows;
}

async function runBackup() {
  console.log('🚀 Iniciando backup do banco de dados Supabase SIG...');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '../backups');

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupData = {
    metadata: {
      timestamp: new Date().toISOString(),
      project_url: supabaseUrl,
      tables_count: TABELAS.length,
    },
    tables: {}
  };

  const summary = {};
  let totalRegistros = 0;

  for (const tabela of TABELAS) {
    process.stdout.write(`Exportando tabela: ${tabela}... `);
    const rows = await exportTable(tabela);
    backupData.tables[tabela] = rows;
    summary[tabela] = rows.length;
    totalRegistros += rows.length;
    console.log(`✅ ${rows.length} registros`);
  }

  backupData.metadata.total_records = totalRegistros;

  const jsonFilename = `backup_sig_supabase_${timestamp}.json`;
  const jsonPath = path.join(backupDir, jsonFilename);

  fs.writeFileSync(jsonPath, JSON.stringify(backupData, null, 2), 'utf8');

  const stats = fs.statSync(jsonPath);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

  console.log('\n==================================================');
  console.log('🎉 Backup concluído com sucesso!');
  console.log(`📂 Arquivo salvo em: ${jsonPath}`);
  console.log(`📊 Tamanho do arquivo: ${fileSizeMB} MB`);
  console.log(`🔢 Total de registros exportados: ${totalRegistros}`);
  console.log('==================================================\n');

  console.log(JSON.stringify({
    success: true,
    backupFile: jsonPath,
    fileSizeMB,
    totalRegistros,
    summary
  }, null, 2));
}

runBackup().catch(err => {
  console.error('❌ Erro durante o backup:', err);
  process.exit(1);
});
