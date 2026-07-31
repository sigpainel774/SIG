# Plano de otimização de fotos — SIG

## Contexto

O SIG hoje envia fotos de alunos e funcionários ao Supabase Storage no formato e tamanho originais. Como os mesmos arquivos são usados em avatares de 40–56 px, listas, mapas, modais e impressões, uma foto de celular pode transferir vários megabytes para uma área que precisa de poucas dezenas de kilobytes.

O objetivo é preservar, quando necessário, o arquivo original como documento privado e gerar automaticamente versões pequenas, padronizadas e adequadas a cada tela. Nenhuma tela operacional deve usar a foto original.

## Erros silenciosos

| ID | Achado | Consequência |
| --- | --- | --- |
| ES-F1 | A interface de funcionário informa máximo de 5 MB, mas o handler não valida o tamanho. | Arquivos grandes podem ser enviados apesar da mensagem exibida. |
| ES-F2 | A foto de aluno aceita `image/*` sem limite de peso, pixels ou formato. | HEIC, GIFs, imagens enormes e formatos não previstos podem chegar ao Storage. |
| ES-F3 | A mesma URL original atende avatar, lista, mapa e modal. | CSS reduz apenas a exibição, não o download nem a decodificação da imagem. |
| ES-F4 | O mapa pré-carrega fotos de todos os funcionários visíveis. | Uma base grande gera tráfego e uso de memória desnecessários ao abrir o mapa. |

## Arquitetura proposta

### Contrato de arquivos

Para cada nova foto, o sistema receberá um arquivo original e produzirá duas versões públicas:

| Variante | Dimensões máximas | Formato | Meta de peso | Uso |
| --- | ---: | --- | ---: | --- |
| `avatar` | 160×200 px | WebP | até 60 KB | listas, cards, sidebar, mapa |
| `visualizacao` | 480×600 px | WebP | até 180 KB | modal e ampliação |
| `original` | sem alteração, opcional | formato recebido validado | até 8 MB | comprovação administrativa; bucket privado |

O recorte será central, preservando proporção 3×4 (`object-fit: cover`). O sistema deve aceitar somente JPEG, PNG e WebP; converter para WebP e remover metadados EXIF, incluindo geolocalização.

### Processamento recomendado

1. O navegador valida tipo, tamanho e dimensões antes de iniciar o envio; isso impede tentativas óbvias e oferece feedback imediato.
2. A foto é enviada para um bucket privado temporário, não para a URL pública final.
3. Uma função de servidor autenticada processa a imagem com `sharp` (ou Edge Function equivalente), gera as duas variantes e grava seus caminhos nos buckets apropriados.
4. Após sucesso, a função atualiza a coluna de foto com o caminho da versão `avatar` e, idealmente, registra também `foto_avatar_path`, `foto_visualizacao_path` e `foto_original_path`.
5. O cliente recebe apenas URLs públicas/destinadas a cada tamanho. O original fica acessível somente por URL assinada e perfil autorizado.

Não usar o processamento no navegador como única garantia: ele é útil para prévia e economia de upload, mas não substitui a validação no servidor.

### Onde ficam os arquivos e como acessá-los

| Conteúdo | Local | Visibilidade | Acesso na interface |
| --- | --- | --- | --- |
| `avatar` e `visualizacao` atuais | Buckets `fotos-avatar` e `fotos-visualizacao` | Público controlado pelas políticas do sistema | Uso automático nas telas; não exige ação do usuário |
| Original enviado após a nova função | Bucket privado `fotos-originais` | Nunca público; somente URL assinada temporária | Aba **Foto e histórico** no modal de cadastro/detalhes correspondente |
| Foto anterior à migração | Bucket atual, preservado durante a retenção | Mantém a política existente, sem ser alterada pela migração | Aba **Foto e histórico**, como “Foto legada” |
| Cópia de segurança da migração | Bucket privado `backup-fotos-legadas/<data-da-migracao>/` | ROOT e job de servidor; sem URLs públicas | Não é exibida no fluxo comum; disponível ao ROOT pelo botão **Restaurar foto legada** |

O acesso será incluído nos modais já usados para cada cadastro:

1. **Aluno:** `ModalDetalhesAluno` e o modal de edição de aluno receberão a aba **Foto e histórico**.
2. **Funcionário:** o modal de funcionário receberá a mesma aba **Foto e histórico**.
3. A aba mostra a variante atual, data da última geração, estado da migração e, para usuários autorizados, ações de **Ver original**, **Ver foto legada** e **Restaurar foto legada**.
4. “Ver original” não revela a URL do Storage: o sistema solicita uma URL assinada de curta duração ao servidor, abre a visualização e registra a consulta. Para alunos, restringir a ação a perfil autorizado da mesma escola; para restauração, restringir ao ROOT.
5. O backup técnico não fica navegável por pastas nem exposto em telas administrativas gerais; seu acesso acontece somente como parte de uma restauração auditada.

## Mudanças propostas

### Fase 1 — Contrato, segurança e infraestrutura

1. Criar buckets separados: `fotos-originais` privado, `fotos-avatar` público/controlado e `fotos-visualizacao` público/controlado. Definir RLS por escola e por perfil; foto de aluno merece atenção extra por LGPD.
2. Criar migration para armazenar os três caminhos e `foto_updated_at`, mantendo temporariamente `foto_url` para compatibilidade. Criar índices apenas onde realmente houver consulta por esses campos.
3. Implementar Route Handler autenticado para receber/processar fotos. O handler valida MIME real, peso máximo de 8 MB e dimensões máximas de 6000×6000 antes de chamar o processador.
4. Adicionar `sharp` ao ambiente Node do servidor. Se a plataforma impedir seu uso no deploy, migrar o mesmo contrato para uma função dedicada de processamento com suporte nativo à biblioteca.
5. Definir exclusão segura: ao substituir/remover foto, excluir variantes e original antigos somente após a nova geração confirmar sucesso; registrar a ação em auditoria.

### Fase 2 — Geração e integração de interface

1. Implementar utilitário de processamento: corrigir orientação EXIF, limitar pixels, recortar 3×4, converter WebP e usar qualidade inicial 82 (avatar) e 85 (visualização). Caso a meta de peso não seja atingida, reduzir qualidade progressivamente até o limite mínimo definido.
2. Substituir os uploads atuais de aluno e funcionário pelo novo endpoint. Aplicar o mesmo fluxo a logos em um escopo separado, sem recorte 3×4.
3. Validar no cliente JPEG/PNG/WebP, até 8 MB e até 6000×6000; apresentar a prévia local e mensagens claras em caso de recusa.
4. Usar sempre `avatar` em listas, turmas, lotações, sidebar e marcadores de mapa; usar `visualizacao` somente no modal de foto ampliada; manter impressão em variante própria ou `visualizacao`, conforme qualidade validada.
5. Remover o pré-carregamento amplo do mapa. Carregar avatares apenas dos marcadores no viewport/cluster aberto, com concorrência limitada e `loading="lazy"` onde aplicável.

### Fase 3 — Migração do acervo e limpeza

1. Criar uma tabela de controle de migração, por exemplo `migracao_fotos`, com o ID do aluno/funcionário, URL original, hash do arquivo original, caminhos gerados, status, tentativas, erro, operador e timestamps. A tabela impede processamento duplicado e torna a operação auditável.
2. Antes de qualquer alteração, gerar um inventário congelado de todas as fotos atuais: entidade, ID, escola, URL, tamanho, MIME, hash SHA-256 e data. Exportar esse inventário para local protegido e registrar a contagem esperada por entidade.
3. Fazer backup por cópia, nunca por movimentação: copiar cada original para o bucket privado e versionado `backup-fotos-legadas/<data-da-migracao>/...`. Validar quantidade, tamanho e hash de cada cópia antes de marcar o item como apto à migração. O objeto antigo e a coluna `foto_url` permanecem intactos nesta etapa.
4. Criar job administrativo paginado, acessível exclusivamente ao ROOT, para baixar uma cópia, gerar as variantes e gravá-las em caminhos novos e imutáveis. O job precisa ser idempotente, reiniciável, limitado por concorrência e registrar sucesso ou falha por item.
5. Aplicar atualização atômica no registro somente depois que ambas as variantes forem gravadas e validadas. Manter `foto_url_legacy` com a URL anterior; os novos campos passam a apontar para as variantes. Em falha, não alterar o registro nem excluir qualquer objeto.
6. Começar com lote piloto de 20 registros em ambiente de teste e depois com 20 registros reais escolhidos de forma representativa. Conferir qualidade visual, hashes, permissões, listas, mapas, PDFs e impressões antes da execução total.
7. Executar em lotes pequenos, por exemplo 50 imagens por rodada, com painel de progresso, pausa manual, reprocessamento apenas das falhas e relatório final comparando `inventariado = backup confirmado = processado + falha registrada`.
8. Oferecer reversão por item e global: reverter os campos de foto para `foto_url_legacy`, manter variantes produzidas para diagnóstico e registrar a ação em auditoria. A reversão não deve depender da foto no cache do navegador.
9. Manter originais antigos, backup e `foto_url_legacy` por período de retenção aprovado — sugestão inicial de 90 dias após validação completa. Só então, com exportação do relatório, backup conferido e autorização explícita, permitir exclusão em uma operação separada e reversível via lixeira/soft-delete.
10. Após o período de observação, tornar `foto_url` um campo de compatibilidade ou removê-lo em migration posterior. Compactar também os assets institucionais locais, consolidar os três PNGs idênticos e corrigir as dimensões declaradas dos screenshots PWA.

### Salvaguardas obrigatórias da migração

1. Usar credenciais de servidor exclusivamente no job; a `SUPABASE_SERVICE_ROLE_KEY` nunca chega ao navegador nem é exposta em logs.
2. Restringir execução, retomada, reversão e exclusão ao ROOT; exigir confirmação explícita para cada operação em massa e registrar-a em `audit_logs`.
3. Não sobrescrever objetos: usar nomes com versão/data e habilitar versionamento ou retenção do bucket quando disponível.
4. Não considerar URL acessível como backup válido: validar status HTTP, tamanho e SHA-256 da cópia. Guardar hashes no inventário para detectar corrupção ou arquivo divergente.
5. Tratar fotos de alunos como dados pessoais: buckets privados para original/backup, URLs assinadas com validade curta e acesso limitado à escola autorizada.
6. Estabelecer parada automática se a taxa de falhas superar 2% em um lote; o sistema conserva os itens não processados e apresenta a causa antes de permitir continuidade.

## Prioridade

| Item | Gargalo/ES | Fase | Impacto |
| --- | --- | --- | --- |
| Endpoint autenticado + buckets segregados | Originais públicos e sem padronização | 1 | Crítico |
| Validação real de tipo/peso/dimensões | ES-F1 e ES-F2 | 1 | Alto |
| Geração de avatar e visualização WebP | ES-F3 | 2 | Alto |
| Atualização das telas para variantes | Download de originais em avatars | 2 | Alto |
| Limite de pré-carregamento do mapa | ES-F4 | 2 | Médio/alto |
| Migração idempotente do acervo | Fotos antigas pesadas | 3 | Alto |
| Limpeza de duplicados e PWA | Peso estático | 3 | Médio |

## Plano de verificação

1. Enviar JPEG de 6–8 MB, PNG transparente e WebP; confirmar que cada um resulta em avatar e visualização dentro das metas, com orientação correta e sem EXIF.
2. Tentar GIF, HEIC, arquivo disfarçado, mais de 8 MB e imagem com mais de 6000 px; confirmar rejeição antes da persistência.
3. Conferir que lista, turma, lotação e mapa solicitam apenas a URL `avatar`; confirmar que modal solicita `visualizacao` e que o original não é público.
4. Validar permissões com usuários de escolas distintas e perfil sem autorização; nenhuma URL privada ou foto de outra escola pode ser acessível.
5. Executar a migração piloto duas vezes e confirmar idempotência, preservação dos registros já processados e relatório de falhas.
6. Antes do lote real, comparar o inventário com as cópias de backup: mesma contagem, mesmo tamanho e mesmo SHA-256; interromper se houver qualquer divergência.
7. Durante a migração, conferir em cada lote que nenhum registro perde a URL anterior antes da validação de `avatar` e `visualizacao`; simular falha de processamento e confirmar que o registro original permanece utilizável.
8. Testar a reversão de um aluno e de um funcionário, depois uma reversão de lote, confirmando que a tela retorna à URL legada e que os originais continuam acessíveis somente a perfis autorizados.
9. Antes de qualquer limpeza, emitir relatório assinado de inventário, backup, processados, falhas e itens revertidos; exigir aprovação operacional explícita e aguardar o prazo de retenção.
10. Validar impressão, PDF e cache após troca de foto; confirmar invalidação por `foto_updated_at`, sem timestamp aleatório a cada renderização.
11. Rodar `npx tsc --noEmit --incremental false` ao fim de cada fase e testar manualmente em celular com rede limitada.
