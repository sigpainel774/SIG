/**
 * Assinaturas e Padrões de Detecção WAF (Web Application Firewall) & IDS do SIG.
 * Projetado para execução em alta velocidade no Edge Runtime e Node.js.
 */

export interface ThreatPattern {
  name: string
  category: 'SQL_INJECTION' | 'XSS' | 'PATH_TRAVERSAL' | 'SCANNER_BOT' | 'PROBING' | 'TOKEN_TAMPERING'
  severity: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA'
  regex: RegExp
  description: string
}

// 1. Padrões de SQL Injection (SQLi)
export const SQLI_PATTERNS: ThreatPattern[] = [
  {
    name: 'UNION_SELECT_INJECTION',
    category: 'SQL_INJECTION',
    severity: 'CRITICA',
    regex: /\bunion\s+(all\s+)?select\b/i,
    description: 'Tentativa de injeção SQL baseada em UNION SELECT',
  },
  {
    name: 'SQL_BOOLEAN_OR_INJECTION',
    category: 'SQL_INJECTION',
    severity: 'ALTA',
    regex: /(%27|')\s*(or|and)\s*(\d+=\d+|%27\w+%27=%27\w+%27|true|false)/i,
    description: 'Tentativa de bypass de autenticação por expressão booleana SQL',
  },
  {
    name: 'SQL_TIME_DELAY_INJECTION',
    category: 'SQL_INJECTION',
    severity: 'CRITICA',
    regex: /\b(pg_sleep|sleep|waitfor\s+delay)\s*\(/i,
    description: 'Tentativa de injeção SQL baseada em tempo (Time-based Blind SQLi)',
  },
  {
    name: 'SQL_DDL_DML_INJECTION',
    category: 'SQL_INJECTION',
    severity: 'CRITICA',
    regex: /;\s*(drop\s+table|truncate\s+table|delete\s+from|insert\s+into|update\s+\w+\s+set)\b/i,
    description: 'Tentativa de execução empilhada de comando SQL destrutivo',
  },
  {
    name: 'SQL_METADATA_INJECTION',
    category: 'SQL_INJECTION',
    severity: 'ALTA',
    regex: /\b(information_schema|pg_catalog|pg_tables|current_user|version\(\))/i,
    description: 'Tentativa de extração de metadados do banco de dados',
  },
  {
    name: 'SQL_COMMENT_INJECTION',
    category: 'SQL_INJECTION',
    severity: 'MEDIA',
    regex: /(--\s*|\/\*[\s\S]*?\*\/|#\s*$)/i,
    description: 'Tentativa de truncamento de instrução SQL via comentário',
  },
]

// 2. Padrões de Cross-Site Scripting (XSS)
export const XSS_PATTERNS: ThreatPattern[] = [
  {
    name: 'SCRIPT_TAG_INJECTION',
    category: 'XSS',
    severity: 'ALTA',
    regex: /<script\b[^>]*>[\s\S]*?<\/script>/i,
    description: 'Tentativa de injeção de tag <script>',
  },
  {
    name: 'JS_EVENT_HANDLER_INJECTION',
    category: 'XSS',
    severity: 'ALTA',
    regex: /\bon(error|load|click|mouseover|focus|blur)\s*=\s*['"][^'"]*['"]/i,
    description: 'Tentativa de injeção de manipulador de evento JavaScript',
  },
  {
    name: 'JAVASCRIPT_URI_INJECTION',
    category: 'XSS',
    severity: 'ALTA',
    regex: /javascript:\s*[^;\s]+/i,
    description: 'Tentativa de execução de script via protocolo javascript:',
  },
  {
    name: 'DOM_EVAL_INJECTION',
    category: 'XSS',
    severity: 'CRITICA',
    regex: /\b(eval|document\.cookie|window\.location|document\.location)\s*\(/i,
    description: 'Tentativa de roubo de sessão ou execução de código via eval/DOM',
  },
]

// 3. Padrões de Path Traversal & LFI / RFI
export const PATH_TRAVERSAL_PATTERNS: ThreatPattern[] = [
  {
    name: 'DIRECTORY_TRAVERSAL',
    category: 'PATH_TRAVERSAL',
    severity: 'ALTA',
    regex: /(\.\.[\/\\]|%2e%2e[\/\\]|\.\.%2f|\.\.%5c)/i,
    description: 'Tentativa de navegação em diretórios restritos do servidor (Path Traversal)',
  },
  {
    name: 'SENSITIVE_FILE_ACCESS',
    category: 'PATH_TRAVERSAL',
    severity: 'CRITICA',
    regex: /\/(etc\/passwd|proc\/self\/environ|boot\.ini|win\.ini|\.env|\.git\/config|wp-config\.php)\b/i,
    description: 'Tentativa de leitura direta de arquivos confidenciais do sistema',
  },
]

// 4. Scanners Automatizados, Vulnerability Probing e Bots Maliciosos
export const SCANNER_PATTERNS: ThreatPattern[] = [
  {
    name: 'SECURITY_SCANNER_USER_AGENT',
    category: 'SCANNER_BOT',
    severity: 'ALTA',
    regex: /\b(sqlmap|nikto|masscan|gobuster|dirbuster|nmap|wpscan|zgrab|acunetix|nessus|openvas|havij)\b/i,
    description: 'Ferramenta automatizada de varredura ou ataque identificada',
  },
  {
    name: 'VULNERABILITY_PROBING_PATH',
    category: 'PROBING',
    severity: 'MEDIA',
    regex: /(\/\.env|\/\.git|\/phpmyadmin|\/pma|\/xmlrpc\.php|\/wp-login\.php|\/actuator|\/solr|\/cgi-bin|\/\.aws)/i,
    description: 'Varredura oportunista de endpoints e arquivos de configuração expostos',
  },
]

// Lista consolidada de todas as regras
export const ALL_THREAT_PATTERNS: ThreatPattern[] = [
  ...SQLI_PATTERNS,
  ...XSS_PATTERNS,
  ...PATH_TRAVERSAL_PATTERNS,
  ...SCANNER_PATTERNS,
]
