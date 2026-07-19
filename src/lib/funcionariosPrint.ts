'use client'

function formatarDataLocal(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

function getInitials(nome: string): string {
  const parts = nome.trim().split(' ').filter(Boolean)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const PALETTES = [
  { bg: '#1a3a5c', text: '#60a5fa' },
  { bg: '#1a2e1a', text: '#4ade80' },
  { bg: '#3a1a1a', text: '#f87171' },
  { bg: '#2e1a3a', text: '#c084fc' },
  { bg: '#3a2e1a', text: '#fbbf24' },
  { bg: '#1a3a3a', text: '#34d399' }
]

function getPalette(nome: string) {
  let hash = 0
  for (let i = 0; i < nome.length; i++) {
    hash = nome.charCodeAt(i) + ((hash << 5) - hash)
  }
  return PALETTES[Math.abs(hash) % PALETTES.length]
}

const sessionTimestamp = Date.now()

export function gerarFichaFuncionarioHtml(
  f: any,
  logoPrefeituraUrl: string,
  logoDireitoUrl: string,
  logoSecretariaUrl: string,
  doencasStr: string,
  defsStr: string,
  posHtml: string,
  outrosCursosStr: string,
  docsAnexadosStr: string
): string {
  const initials = getInitials(f.nome)
  const palette = getPalette(f.nome)
  const fotoCleanUrl = f.foto_url ? (f.foto_url.startsWith('data:') ? f.foto_url : `${f.foto_url.split('?')[0]}?t=${sessionTimestamp}`) : ''
  const fotoCell = f.foto_url
    ? `<img src="${fotoCleanUrl}" class="foto-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
       <div class="foto-initials" style="display:none; background:${palette.bg}; color:${palette.text};">${initials}</div>`
    : `<div class="foto-initials" style="background:${palette.bg}; color:${palette.text};">${initials}</div>`

  const activeVinc = f.vinculos_funcionarios?.find((v: any) => v.ativo)
  const escolaNome = activeVinc?.escolas?.nome ?? 'Não informada'
  const escolaInep = activeVinc?.escolas?.inep ?? 'Não informado'
  const escolaLocalizacao = activeVinc?.escolas?.localizacao ?? 'Não informada'

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Ficha Sapeaçu - ${f.nome}</title>
        <style>
          @page {
            size: A4;
            margin: 5mm 10mm 5mm 10mm;
          }
          html, body {
            height: 100%;
            margin: 0;
            padding: 0;
            overflow: hidden;
          }
          body {
            font-family: Arial, sans-serif;
            color: #000;
            background-color: #fff;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-container {
            width: 100%;
            height: 100%;
            max-height: 282mm;
            box-sizing: border-box;
            position: relative;
            padding-bottom: 35px;
          }
          .header {
            display: flex;
            align-items: center;
            border-bottom: 2px solid #000;
            padding-bottom: 6px;
            margin-bottom: 12px;
          }
          .header-logo {
            width: 70px;
            height: 50px;
            border: 1px dashed #999;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 8px;
            color: #888;
            font-weight: bold;
            text-transform: uppercase;
            margin-right: 15px;
          }
          .header-title-box {
            flex-grow: 1;
          }
          .header-pref {
            font-size: 10px;
            font-weight: bold;
            letter-spacing: 0.5px;
            margin: 0;
          }
          .header-sub {
            font-size: 8.5px;
            color: #555;
            margin: 1px 0 0 0;
          }
          .header-main {
            font-size: 12px;
            font-weight: 900;
            letter-spacing: 0.8px;
            text-transform: uppercase;
            margin: 4px 0 0 0;
          }
          .header-right {
            text-align: right;
            font-size: 7.5px;
            color: #666;
          }
          .header-logo-dir {
            height: 48px;
            width: auto;
            max-width: 140px;
            object-fit: contain;
            margin-left: 15px;
          }
          .main-content {
            display: flex;
            gap: 15px;
          }
          .left-column {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .right-column {
            width: 125px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
          }
          .foto-box {
            width: 110px;
            height: 140px;
            border: 1.5px solid #000;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #f7f7f7;
            overflow: hidden;
            border-radius: 4px;
          }
          .foto-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .foto-initials {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
            font-size: 36px;
            font-weight: bold;
          }
          .qr-box {
            width: 90px;
            height: 90px;
            border: 1px solid #ddd;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 4px;
            background: #fff;
          }
          .qr-img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
          .qr-label {
            font-size: 6px;
            color: #777;
            text-align: center;
            margin-top: 2px;
            text-transform: uppercase;
            font-weight: bold;
          }
          .section {
            border: 1px solid #000;
            border-radius: 5px;
            margin-bottom: 8px;
            background-color: #fff;
            overflow: hidden;
          }
          .section-title {
            background-color: #f0f0f0;
            font-size: 8.5px;
            font-weight: bold;
            text-transform: uppercase;
            padding: 3px 6px;
            border-bottom: 1px solid #000;
            letter-spacing: 0.5px;
          }
          .grid-fields {
            display: grid;
            padding: 5px 6px;
            gap: 5px;
          }
          .field {
            display: flex;
            flex-direction: column;
          }
          .field-label {
            font-size: 7.5px;
            color: #555;
            text-transform: uppercase;
            font-weight: bold;
            margin-bottom: 1.5px;
          }
          .field-value {
            font-size: 9.5px;
            font-weight: bold;
            color: #000;
            word-break: break-word;
          }
          .pos-item {
            margin-bottom: 3.5px;
            font-size: 8.5px;
          }
          .pos-item:last-child {
            margin-bottom: 0;
          }
          .col-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .col-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
          .col-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .col-1 { grid-template-columns: 1fr; }
          .col-mix { grid-template-columns: 2fr 1fr 1fr; }
          .col-mix-2 { grid-template-columns: 1fr 2fr; }
          .col-mix-3 { grid-template-columns: 3fr 1fr; }
          .col-vinc { grid-template-columns: 2fr 1.5fr 1fr; }
          
          .footer {
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-top: 1.5px solid #000;
            padding-top: 4px;
            font-size: 7px;
            color: #555;
            font-weight: bold;
          }
        </style>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 600);
          };
        </script>
      </head>
      <body>
        <div class="print-container">
          <!-- Cabeçalho -->
          <div class="header">
            <img src="${logoPrefeituraUrl}" class="header-logo-dir" style="margin-right:15px; margin-left:0;" alt="Logo Pref" onerror="this.style.visibility='hidden';" />
            <div class="header-title-box">
              <h2 class="header-pref">PREFEITURA MUNICIPAL DE SAPEAÇU</h2>
              <h4 class="header-sub">ESTADO DA BAHIA</h4>
              <h3 class="header-main">FICHA CADASTRAL DE FUNCIONÁRIO</h3>
            </div>
            <div class="header-right">
              <div>SIG SAPEAÇU</div>
              <div style="margin-top: 2px;">EMISSÃO: ${new Date().toLocaleDateString('pt-BR')}</div>
              <div style="margin-top: 1px;">STATUS: <span style="text-transform: uppercase; font-weight: bold;">${f.status}</span></div>
            </div>
            <img src="${logoDireitoUrl}" class="header-logo-dir" alt="Logo Sec" onerror="this.onerror=null; this.src='${logoSecretariaUrl}';" />
          </div>

          <!-- Conteúdo Principal -->
          <div class="main-content">
            <div class="left-column">
              <!-- DADOS PESSOAIS -->
              <div class="section">
                <div class="section-title">Dados Pessoais</div>
                <div class="grid-fields col-mix-3">
                  <div class="field">
                    <span class="field-label">Nome Completo</span>
                    <span class="field-value">${f.nome}</span>
                  </div>
                  <div class="field">
                    <span class="field-label">Nascimento</span>
                    <span class="field-value">${formatarDataLocal(f.data_nascimento)}</span>
                  </div>
                </div>
                <div class="grid-fields col-4" style="border-top: 1px solid #eee; padding-top: 5px;">
                  <div class="field">
                    <span class="field-label">Sexo</span>
                    <span class="field-value" style="text-transform: capitalize;">${f.sexo ?? '—'}</span>
                  </div>
                  <div class="field">
                    <span class="field-label">Estado Civil</span>
                    <span class="field-value" style="text-transform: capitalize;">${f.estado_civil ?? '—'}</span>
                  </div>
                  <div class="field">
                    <span class="field-label">Cor / Raça</span>
                    <span class="field-value" style="text-transform: capitalize;">${f.cor_raca ?? '—'}</span>
                  </div>
                  <div class="field">
                    <span class="field-label">Nacionalidade</span>
                    <span class="field-value">${f.nacionalidade ?? '—'}</span>
                  </div>
                </div>
              </div>

              <!-- CONTATO E ENDEREÇO -->
              <div class="section">
                <div class="section-title">Contato e Endereço</div>
                <div class="grid-fields col-3">
                  <div class="field">
                    <span class="field-label">Email Principal</span>
                    <span class="field-value">${f.email}</span>
                  </div>
                  <div class="field">
                    <span class="field-label">Telefone Celular</span>
                    <span class="field-value">${f.telefone ?? '—'}</span>
                  </div>
                  <div class="field">
                    <span class="field-label">Telefone Fixo / Recado</span>
                    <span class="field-value">${f.telefone_recado ?? '—'}</span>
                  </div>
                </div>
                <div class="grid-fields col-mix-2" style="border-top: 1px solid #eee; padding-top: 5px;">
                  <div class="field">
                    <span class="field-label">CEP</span>
                    <span class="field-value">${f.cep ?? '—'}</span>
                  </div>
                  <div class="field">
                    <span class="field-label">Endereço Residencial</span>
                    <span class="field-value">${f.endereco ?? '—'}</span>
                  </div>
                </div>
              </div>

              <!-- DADOS DO VÍNCULO E LOTAÇÃO -->
              <div class="section">
                <div class="section-title">Vínculo Ativo e Lotação</div>
                <div class="grid-fields col-vinc">
                  <div class="field">
                    <span class="field-label">Unidade de Lotação</span>
                    <span class="field-value">${escolaNome}</span>
                  </div>
                  <div class="field">
                    <span class="field-label">Cargo / Função</span>
                    <span class="field-value">${f.cargo ?? '—'}</span>
                  </div>
                  <div class="field">
                    <span class="field-label">Código INEP Escola</span>
                    <span class="field-value">${escolaInep}</span>
                  </div>
                </div>
                <div class="grid-fields col-3" style="border-top: 1px solid #eee; padding-top: 5px;">
                  <div class="field">
                    <span class="field-label">Tipo de Localização</span>
                    <span class="field-value" style="text-transform: uppercase; font-size: 8.5px;">${escolaLocalizacao}</span>
                  </div>
                  <div class="field">
                    <span class="field-label">Data de Admissão</span>
                    <span class="field-value">${formatarDataLocal(f.data_admissao)}</span>
                  </div>
                  <div class="field">
                    <span class="field-label">Carga Horária Semanal</span>
                    <span class="field-value">${f.carga_horaria ? `${f.carga_horaria}h` : '—'}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Coluna Direita (Foto e QR) -->
            <div class="right-column">
              <div class="foto-box">${fotoCell}</div>
              
              <div style="margin-top:15px; display:flex; flex-direction:column; align-items:center;">
                <div class="qr-box">
                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent('https://sig-six-kappa.vercel.app/verificar/funcionario/' + f.id)}" class="qr-img" alt="QR Code Autenticidade" />
                </div>
                <div class="qr-label">Ficha Autenticada</div>
              </div>
            </div>
          </div>

          <!-- DOCUMENTOS E REGISTROS CIVIS -->
          <div class="section" style="margin-top: -2px;">
            <div class="section-title">Documentação e Registros Civis</div>
            <div class="grid-fields col-4">
              <div class="field">
                <span class="field-label">CPF</span>
                <span class="field-value">${f.cpf ?? '—'}</span>
              </div>
              <div class="field">
                <span class="field-label">Registro Geral (RG)</span>
                <span class="field-value">${f.rg ?? '—'} (Órgão: ${f.rg_orgao_emissor ?? '—'})</span>
              </div>
              <div class="field">
                <span class="field-label">PIS / PASEP</span>
                <span class="field-value">${f.pis_pasep ?? '—'}</span>
              </div>
              <div class="field">
                <span class="field-label">Título Eleitoral</span>
                <span class="field-value">${f.titulo_eleitor ?? '—'} (Zona: ${f.titulo_zona ?? '—'} Seção: ${f.titulo_secao ?? '—'})</span>
              </div>
            </div>
            <div class="grid-fields col-3" style="border-top: 1px solid #eee; padding-top: 5px;">
              <div class="field">
                <span class="field-label">Certidão de Reservista</span>
                <span class="field-value">${f.certificado_reservista ?? '—'}</span>
              </div>
              <div class="field">
                <span class="field-label">Nome da Mãe</span>
                <span class="field-value">${f.nome_mae ?? '—'}</span>
              </div>
              <div class="field">
                <span class="field-label">Nome do Pai</span>
                <span class="field-value">${f.nome_pai ?? '—'}</span>
              </div>
            </div>
          </div>

          <!-- DADOS ACADÊMICOS / FORMAÇÃO -->
          <div class="section">
            <div class="section-title">Formação Acadêmica e Qualificações</div>
            <div class="grid-fields col-2">
              <div class="field">
                <span class="field-label">Nível de Escolaridade (Formação Principal)</span>
                <span class="field-value" style="text-transform: capitalize;">${f.formacao ?? '—'}</span>
              </div>
              <div class="field">
                <span class="field-label">Pós-Graduações Cadastradas</span>
                <span class="field-value" style="font-weight: normal; font-size: 8.5px;">${posHtml}</span>
              </div>
            </div>
            <div class="grid-fields col-2" style="border-top: 1px solid #eee; padding-top: 5px;">
              <div class="field">
                <span class="field-label">Outros Cursos de Aperfeiçoamento</span>
                <span class="field-value" style="font-weight: normal; font-size: 8.5px;">${outrosCursosStr}</span>
              </div>
              <div class="field">
                <span class="field-label">Comprovantes Digitais Anexados</span>
                <span class="field-value" style="font-size: 8.5px; color:#1a3a5c;">${docsAnexadosStr}</span>
              </div>
            </div>
          </div>

          <!-- SAÚDE E ACESSIBILIDADE -->
          <div class="section">
            <div class="section-title">Saúde e Acessibilidade</div>
            <div class="grid-fields col-mix">
              <div class="field">
                <span class="field-label">Tipo Sanguíneo e Fator Rh</span>
                <span class="field-value">${f.tipo_sanguineo ?? '—'}</span>
              </div>
              <div class="field">
                <span class="field-label">Histórico de Doenças Crônicas</span>
                <span class="field-value" style="font-size: 8.5px; font-weight: normal;">${doencasStr}</span>
              </div>
              <div class="field">
                <span class="field-label">Necessidades Especiais / Deficiências</span>
                <span class="field-value" style="font-size: 8.5px; font-weight: normal;">${defsStr}</span>
              </div>
            </div>
          </div>

          <!-- Rodapé -->
          <div class="footer">
            <span>SECRETARIA MUNICIPAL DE EDUCAÇÃO · DEPARTAMENTO DE RECURSOS HUMANOS</span>
            <span>Documento oficial para fins cadastrais municipais · SIG Sapeaçu</span>
          </div>
        </div>
      </body>
    </html>
  `
}

export function gerarListaFuncionariosHtml(
  funcionarios: any[],
  logoPrefeituraUrl: string,
  logoDireitoUrl: string,
  logoSecretariaUrl: string,
  legendaEscola: string,
  legendaCargo: string
): string {
  const linhas = funcionarios
    .map((f) => {
      const initials = getInitials(f.nome)
      const palette = getPalette(f.nome)
      const fotoCell = f.foto_url
        ? `<img src="${f.foto_url}?t=${Date.now()}" class="foto-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
           <div class="foto-initials" style="display:none; background:${palette.bg}; color:${palette.text};">${initials}</div>`
        : `<div class="foto-initials" style="background:${palette.bg}; color:${palette.text};">${initials}</div>`

      const statusClass =
        f.status === 'ativo'
          ? 'status-ativo'
          : f.status === 'afastado'
          ? 'status-afastado'
          : 'status-outro'
      return `<tr>
        <td class="td-foto"><div class="foto-wrap">${fotoCell}</div></td>
        <td class="td-nome"><span class="nome-text">${f.nome}</span></td>
        <td>${f.cargo ?? '—'}</td>
        <td><span class="status-badge ${statusClass}">${f.status}</span></td>
        <td>${f.orgao ?? '—'}</td>
        <td>${formatarDataLocal(f.data_nascimento)}</td>
      </tr>`
    })
    .join('')

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Lista de Funcionários</title>
        <style>
          @page { size: A4 landscape; margin: 10mm 12mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: Arial, sans-serif;
            color: #111;
            background: #fff;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* ── Cabeçalho ── */
          .doc-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 3px solid #1a3a5c;
            padding-bottom: 10px;
            margin-bottom: 14px;
          }
          .doc-logo {
            width: 70px;
            height: 60px;
            object-fit: contain;
          }
          .doc-title-block {
            flex: 1;
            text-align: center;
            padding: 0 16px;
          }
          .doc-title-pref {
            font-size: 10px;
            font-weight: bold;
            letter-spacing: 0.6px;
            text-transform: uppercase;
            color: #1a3a5c;
          }
          .doc-title-sec {
            font-size: 9px;
            color: #555;
            margin-top: 1px;
          }
          .doc-title-main {
            font-size: 15px;
            font-weight: 900;
            letter-spacing: 1px;
            text-transform: uppercase;
            color: #1a3a5c;
            margin-top: 3px;
          }
          .doc-meta {
            font-size: 8px;
            color: #888;
            margin-top: 2px;
          }

          /* ── Tabela ── */
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
          }
          thead tr {
            background: #1a3a5c;
            color: #fff;
          }
          thead th {
            padding: 6px 8px;
            text-align: left;
            font-size: 9.5px;
            font-weight: bold;
            letter-spacing: 0.4px;
            text-transform: uppercase;
          }
          tbody tr {
            border-bottom: 1px solid #dde3f0;
          }
          tbody tr:nth-child(even) {
            background: #f4f6fb;
          }
          tbody tr:hover {
            background: #e8edf8;
          }
          td {
            padding: 5px 8px;
            vertical-align: middle;
          }

          /* ── Foto 3×4 ── */
          .td-foto {
            width: 44px;
            padding: 4px 6px;
          }
          .foto-wrap {
            width: 34px;
            height: 45px;
            border: 1px solid #bbb;
            border-radius: 3px;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f0f0f0;
          }
          .foto-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
          }
          .foto-initials {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
            font-size: 13px;
            font-weight: 900;
            letter-spacing: -0.5px;
          }

          /* ── Nome ── */
          .td-nome { font-weight: bold; }
          .nome-text { font-size: 11px; }

          /* ── Status badge ── */
          .status-badge {
            display: inline-block;
            padding: 2px 7px;
            border-radius: 10px;
            font-size: 9px;
            font-weight: bold;
            text-transform: capitalize;
          }
          .status-ativo   { background: #d1fae5; color: #065f46; }
          .status-afastado { background: #fef3c7; color: #92400e; }
          .status-outro   { background: #fee2e2; color: #991b1b; }

          /* ── Rodapé ── */
          .doc-footer {
            margin-top: 14px;
            display: flex;
            justify-content: space-between;
            font-size: 8px;
            color: #888;
            border-top: 1px solid #ddd;
            padding-top: 5px;
          }
        </style>
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 600);
          };
        </script>
      </head>
      <body>
        <!-- Cabeçalho -->
        <div class="doc-header">
          <img src="${logoPrefeituraUrl}" class="doc-logo" alt="Logo Prefeitura" onerror="this.style.visibility='hidden'" />
          <div class="doc-title-block">
            <div class="doc-title-pref">Prefeitura Municipal de Sapeaçu</div>
            <div class="doc-title-sec">Secretaria Municipal de Educação</div>
            <div class="doc-title-main">Lista de Funcionários</div>
            <div class="doc-meta">Emitido em: ${new Date().toLocaleDateString(
              'pt-BR'
            )} às ${new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  })} · Total: ${funcionarios.length} funcionário(s)</div>
            <div class="doc-meta" style="margin-top:3px; color:#1a3a5c; font-weight:bold;">Escola: ${legendaEscola} &nbsp;|&nbsp; Cargo: ${legendaCargo}</div>
          </div>
          <img src="${logoDireitoUrl}" class="doc-logo" alt="Logo Secretaria" onerror="this.onerror=null; this.src='${logoSecretariaUrl}';" />
        </div>

        <!-- Tabela -->
        <table>
          <thead>
            <tr>
              <th style="width:44px;">Foto</th>
              <th>Nome</th>
              <th>Cargo / Função</th>
              <th>Status</th>
              <th>Unidade Escolar</th>
              <th>Nascimento</th>
            </tr>
          </thead>
          <tbody>${linhas}</tbody>
        </table>

        <!-- Rodapé -->
        <div class="doc-footer">
          <span>SIG Sapeaçu · Secretaria Municipal de Educação</span>
          <span>Lista de Funcionários · Documento gerado automaticamente pelo sistema</span>
        </div>
      </body>
    </html>
  `
}
