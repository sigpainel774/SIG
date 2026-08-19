# Plano de reativação da compressão de fotos — SIG

**Status:** Planejado — prioridade crítica

**Atualizado em:** 2026-08-19

**Escopo imediato:** foto 3x4 da ficha de funcionários

**Escopo posterior:** reutilização controlada para alunos e outros cadastros

## 1. Contexto e causa da regressão

Em 2026-08-19 o fluxo otimizado da ficha de funcionários foi alterado para enviar o arquivo binário como `multipart/form-data` para `/api/fotos/process`. Em produção, a Vercel limita o corpo de entrada de uma Function a 4,5 MB. Portanto, fotos de celular próximas dos 5 MB anunciados pela interface falhavam com HTTP 413 antes de o `sharp` executar.

Como contenção, o commit `306c77b` suspendeu a otimização e voltou a gravar a foto original diretamente no bucket público legado `fotos-funcionarios`. O cadastro voltou a ter um caminho de upload, mas perdeu compressão, variantes, limpeza transacional e parte do tratamento de erros.

O objetivo deste plano é reativar a compressão sem fazer os bytes da imagem atravessarem uma Route Handler da Vercel, proteger o original e tornar cada etapa observável e autorizada.

## 2. Decisão de arquitetura

### 2.1 Fluxo escolhido

```text
Celular/navegador
  1. valida arquivo e dimensões
  2. normaliza localmente quando necessário
          |
          v
API de autorização gera URL assinada curta
          |
          v
Upload direto ao bucket privado fotos-originais
          |
          v
/api/fotos/process recebe somente JSON com caminho e ID
          |
          v
Sharp valida novamente e gera variantes WebP
          |
          v
Storage + atualização do registro + limpeza compensatória
```

O arquivo nunca será enviado como `multipart/form-data` para a Vercel. A Route Handler receberá apenas JSON pequeno, por exemplo `entity`, `id`, `originalPath` e `requestId`.

### 2.2 Por que esta é a melhor opção

| Opção | Avaliação |
| --- | --- |
| Binário passando pela Vercel | Rejeitada: limite rígido de 4,5 MB e maior uso de memória/CPU. |
| Upload direto ao bucket público legado | Rejeitada como solução final: não comprime, expõe foto integral e produz arquivos órfãos. |
| Somente compressão no navegador | Insuficiente: o cliente pode falhar, ser manipulado ou não suportar o formato. |
| URL assinada + normalização cliente + validação/Sharp servidor | Escolhida: evita o limite da Vercel, reduz tráfego móvel e mantém validação confiável no servidor. |
| TUS resumível para toda foto | Desnecessário no fluxo normalizado; fica reservado para futura necessidade de arquivos acima de 6 MB. |

O Supabase recomenda upload padrão para arquivos de até 6 MB e upload resumível acima desse tamanho. Por isso, a imagem enviada ao bucket terá meta de até 3 MiB, mesmo quando a foto capturada originalmente for muito maior.

## 3. Política para fotos tiradas pelo celular

### 3.1 Limites definidos

| Camada | Limite | Comportamento |
| --- | ---: | --- |
| Arquivo selecionado/capturado | até **20 MiB** | Acima disso, rejeitar antes de ler o arquivo e orientar o usuário a reduzir a resolução ou usar modo compatível. |
| Formatos na primeira entrega | JPEG, PNG e WebP | HEIC/HEIF será rejeitado com mensagem orientando “Mais compatível/JPEG”; suporte só após teste explícito do runtime. |
| Quantidade de pixels de entrada | até **40 megapixels** | Acima disso, rejeitar ou exigir redução local antes do upload; impede estouro de memória com fotos de 108/200 MP. |
| Maior dimensão | até **10.000 px** antes da normalização | Proteção adicional contra imagens anormais ou maliciosas. |
| Arquivo normalizado enviado | meta de **até 3 MiB** | Mantém o upload padrão abaixo da recomendação de 6 MB do Supabase. |
| Maior dimensão normalizada | **2.560 px** | É mais que suficiente para recorte e impressão de ficha, reduzindo memória e banda. |

### 3.2 Regra para uma foto muito pesada

1. Se a foto tiver até 6 MiB e respeitar pixels/formato, ela pode seguir pelo upload direto assinado; o servidor ainda a normaliza e remove metadados.
2. Se tiver entre 6 e 20 MiB, o navegador deve redimensionar para no máximo 2.560 px no lado maior, converter para WebP com qualidade inicial 0,82 e tentar atingir até 3 MiB.
3. Se a normalização no navegador falhar e o arquivo original tiver até 6 MiB, usar o upload direto assinado como fallback e deixar o Sharp concluir.
4. Se a normalização falhar para um arquivo acima de 6 MiB, não realizar upload silencioso. Mostrar instrução para refazer a foto, selecionar uma versão menor ou configurar a câmera para JPEG/modo compatível.
5. Acima de 20 MiB ou 40 MP, rejeitar imediatamente. Para foto cadastral 3x4, essa resolução não agrega qualidade útil e aumenta fortemente o risco de travamento em celulares modestos.

O limite de 20 MiB é o limite de **entrada do usuário**, não o tamanho que ficará armazenado. A meta persistida será muito menor.

### 3.3 Captura pela câmera

A interface poderá oferecer duas ações separadas:

- **Tirar foto:** input dedicado com `accept="image/jpeg,image/png,image/webp"` e `capture="user"` em dispositivos que respeitem essa indicação.
- **Escolher da galeria:** input sem `capture`, com os mesmos formatos.

`accept` e `capture` são apenas orientações ao dispositivo; tipo, bytes e metadados precisam ser validados pelo código. A prévia deve informar tamanho original, tamanho normalizado e redução obtida antes de salvar.

## 4. Contrato de arquivos resultantes

| Variante | Dimensões | Formato/qualidade inicial | Meta de peso | Visibilidade e uso |
| --- | ---: | --- | ---: | --- |
| `avatar` | 240×320 px, 3:4 | WebP 78 | até 80 KB | Listas, cards, sidebar, mapa e crachá. |
| `visualizacao` | 900×1200 px, 3:4 | WebP 84 | até 300 KB | Modal, ficha e visualização ampliada. |
| `original_otimizado` | até 1600×2133 px, 3:4 | WebP 88 | até 1,5 MiB | Bucket privado; impressão ou recuperação autorizada. |

O recorte deve aplicar orientação EXIF antes do corte, privilegiar a região superior/rosto e remover metadados EXIF, inclusive geolocalização. Se a meta de peso não for atingida, reduzir qualidade em passos controlados até um piso definido; nunca criar loop ilimitado.

## 5. Infraestrutura existente e ajustes necessários

Os buckets e campos principais já existem. Não devem ser recriados sem necessidade:

| Recurso | Estado atual | Ação planejada |
| --- | --- | --- |
| `fotos-originais` | Privado | Manter privado; definir limite/MIME e caminhos temporários por usuário e entidade. |
| `fotos-avatar` | Público | Manter para variantes pequenas, com escrita exclusiva do servidor. |
| `fotos-visualizacao` | Público | Manter para variante de ficha/modal, com escrita exclusiva do servidor. |
| `fotos-funcionarios` | Público, limite 5 MiB | Manter apenas para compatibilidade legada durante transição; não receber novas fotos após ativação. |
| Campos `foto_*` | Já presentes em `funcionarios` | Reutilizar `foto_url`, `foto_avatar_path`, `foto_visualizacao_path`, `foto_original_path` e `foto_updated_at`. |
| `sharp` | Já instalado | Manter em runtime Node; não usar Edge runtime para esse processamento. |

Qualquer migration de políticas Storage deverá ser criada somente após consulta ao `MIGRATIONS_MAP.md` e registrada nele na mesma alteração.

## 6. Erros silenciosos que o plano deve eliminar

| ID | Achado atual | Correção planejada |
| --- | --- | --- |
| ES-F1 | A tela informa 5 MB, mas não valida `file.size`. | Validar antes de `FileReader`, com limite real e mensagem coerente. |
| ES-F2 | O fluxo atual não comprime e grava a foto integral publicamente. | Retomar bucket privado + variantes WebP. |
| ES-F3 | Erro do `UPDATE funcionarios` após upload não é verificado. | Desestruturar e tratar `error`; falha deve acionar rollback e impedir toast de sucesso. |
| ES-F4 | Pode aparecer aviso de falha da foto e depois sucesso geral. | Um único resultado final por operação, com estado `partial_failure` explícito apenas se necessário. |
| ES-F5 | `upsert: true` é usado com nomes únicos e políticas incompletas para sobrescrita. | Caminhos imutáveis e `upsert: false`. |
| ES-F6 | Variantes antigas e fotos legadas podem ficar órfãs. | Limpeza compensatória somente após persistência confirmada; job separado para legados. |
| ES-F7 | `/api/fotos/process` aceita qualquer `id` para qualquer autenticado e usa service role. | Revalidar ABAC/RLS por entidade, secretaria/escola e permissão de edição antes do admin client. |
| ES-F8 | MIME é confiado ao input/extensão. | Validar assinatura real e `sharp.metadata()` no servidor. |
| ES-F9 | Avatar chamado de 3x4 é gerado atualmente em 256×256. | Gerar 240×320 e testar enquadramento real. |
| ES-F10 | O helper cliente faz fallback silencioso para o original. | Fallback condicionado ao limite de 6 MiB; acima disso, bloquear com orientação clara. |
| ES-F11 | Store/cache pode continuar exibindo a URL antiga após sucesso. | Usar a resposta da API para atualizar preview, store e cache por `foto_updated_at`. |
| ES-F12 | Não há correlação entre autorização, upload e processamento. | Adotar `requestId`, logs por etapa e caminho temporário verificável. |

## 7. Mudanças propostas por fase

### Fase 0 — Preparação e proteção do rollout

1. Criar uma flag de configuração para alternar entre `legacy_direct` e `optimized_signed` sem novo deploy emergencial.
2. Registrar métricas mínimas por etapa: tamanho original/normalizado, duração, status HTTP, entidade e `requestId`, sem nome, CPF ou URL assinada.
3. Levantar e congelar as políticas Storage atuais antes de qualquer migration.
4. Manter o fluxo legado disponível apenas como rollback temporário e claramente sinalizado nos logs.

### Fase 1 — Segurança e contrato das APIs

1. Alterar `/api/fotos/presigned-url` para receber também `entity` e `id`, autenticar a sessão e confirmar que o usuário pode editar o registro conforme nível, secretaria, escola, vínculo e trava de edição.
2. Gerar caminho temporário como `temp/<auth.uid>/<entity>/<id>/<requestId>.<ext>` e URL assinada de curta duração.
3. Alterar `/api/fotos/process` para aceitar somente JSON com caminho; remover o ramo `multipart/form-data` para impedir regressão.
4. Repetir a autorização no processamento. Nunca confiar apenas na autorização feita ao emitir a URL.
5. Confirmar que o caminho pertence ao usuário, entidade, ID e `requestId` informados.
6. Validar MIME real, pixels, dimensões e tamanho antes de decodificar integralmente.
7. Usar `supabaseAdmin` somente depois dessas verificações.

### Fase 2 — Normalização no celular e integração da ficha

1. Refatorar `imageCompression.ts` para suportar política de foto cadastral: limites, orientação, destino WebP, retorno tipado de erro e ausência de fallback silencioso.
2. Validar o arquivo antes de criar Data URL; preferir `URL.createObjectURL` para a prévia e revogá-la ao trocar/fechar o modal.
3. Exibir progresso por estágio: `Preparando foto`, `Enviando`, `Otimizando` e `Salvando ficha`.
4. Reativar o fluxo assinado em cadastro e edição de funcionário.
5. Consumir `data` retornado pela API para atualizar a foto exibida e o Zustand/cache do próprio usuário.
6. Separar resultado da ficha e resultado da foto sem mensagens contraditórias. Se a foto falhar, manter o modal aberto e permitir nova tentativa sem repetir todo o cadastro.

### Fase 3 — Processamento, consistência e limpeza

1. Criar uma instância base de `sharp` após validação de metadados e gerar as três variantes com limite explícito de pixels.
2. Usar caminhos novos e imutáveis; nunca sobrescrever objeto CDN.
3. Fazer upload das variantes, verificar cada resultado e somente então atualizar `funcionarios`.
4. Se qualquer upload ou atualização falhar, remover apenas os objetos criados pela tentativa atual e preservar a foto anterior.
5. Após o banco confirmar sucesso, apagar o temporário e tentar remover as variantes antigas. Falha nessa limpeza gera log e fila de manutenção, não desfaz uma foto válida.
6. Registrar troca e remoção de foto em auditoria sem armazenar conteúdo ou URL assinada.

### Fase 4 — Rollout e legado

1. Ativar primeiro nas escolas de teste e em um grupo pequeno de usuários.
2. Testar ao menos um Android intermediário, um Android de câmera alta resolução e um iPhone/Safari.
3. Observar por 48 horas: taxa de sucesso, 401/403, 413, 422, 5xx, duração do Sharp e tamanho final.
4. Ampliar gradualmente a flag para produção.
5. Inventariar fotos órfãs/legadas antes de qualquer exclusão. Não apagar automaticamente durante a reativação.
6. Planejar a migração do acervo como tarefa separada, idempotente, com backup e rollback.

## 8. Prioridades

| Item | Gargalo/ES | Fase | Impacto |
| --- | --- | --- | --- |
| Voltar ao upload assinado direto | Limite Vercel 4,5 MB | 1 | Crítico |
| ABAC antes da service role | ES-F7 | 1 | Crítico |
| Remover multipart da Route Handler | Regressão de arquitetura | 1 | Crítico |
| Validar peso, MIME e megapixels | ES-F1, ES-F8 e imagem-bomba | 1–2 | Crítico |
| Tratar erro do banco e rollback | ES-F3 e ES-F4 | 2–3 | Alto |
| Normalizar fotos de 6–20 MiB | Uso por câmera de celular | 2 | Alto |
| Variantes 3x4 e remoção de EXIF | ES-F2 e ES-F9 | 3 | Alto |
| Atualizar cache/store com resposta real | ES-F11 | 2 | Médio/alto |
| Limpeza e migração de legado | ES-F6 | 4 | Médio; executar separadamente |

## 9. Plano de verificação

### 9.1 Testes automatizados

1. Testar validação com 0 byte, MIME ausente, JPEG válido, PNG, WebP, arquivo disfarçado, GIF e HEIC.
2. Testar limites em 5,9 MiB, 6,1 MiB, 19,9 MiB e 20,1 MiB.
3. Testar 12 MP, 40 MP e acima de 40 MP, incluindo EXIF rotacionado.
4. Confirmar que o endpoint rejeita caminho temporário pertencente a outro usuário, outra entidade ou outro ID.
5. Simular falha em cada etapa: autorização, URL assinada, upload temporário, Sharp, cada bucket e update do banco.
6. Confirmar que uma segunda chamada com o mesmo `requestId` é idempotente ou retorna estado já concluído sem duplicar objetos.
7. Rodar `cmd /c "npx tsc --noEmit --incremental false"` ao fim de cada fase.

### 9.2 Checklist manual em celular

- Tirar foto pela câmera frontal e escolher foto da galeria.
- Usar foto comum de 2–5 MB e foto pesada de 10–20 MB.
- Testar rede Wi-Fi, 4G instável, interrupção e repetição.
- Confirmar enquadramento 3x4, orientação, nitidez e ausência de atraso excessivo.
- Confirmar mensagens de formato, peso e resolução em linguagem simples.
- Verificar que cancelar ou fechar o modal libera a prévia e não deixa upload órfão.
- Confirmar que a nova foto aparece imediatamente na ficha, lista, sidebar e crachá.
- Confirmar que o original privado não abre por URL pública.

### 9.3 Critérios de aceite

- Nenhum arquivo binário de foto passa pela Vercel Function.
- Fotos capturadas de até 20 MiB são aceitas quando normalizáveis e chegam ao Storage com meta de até 3 MiB.
- Arquivos fora do contrato são rejeitados antes de alterar a ficha.
- Avatar, visualização e original otimizado são gerados e persistidos com caminhos coerentes.
- A foto anterior permanece utilizável em qualquer falha intermediária.
- Usuário sem permissão não consegue emitir URL nem processar foto de outro registro.
- Não há toast de sucesso quando banco ou foto falham.
- TypeScript e testes manuais em dispositivos reais passam antes da ativação geral.

## 10. Rollback

1. Desativar `optimized_signed` pela flag e retornar temporariamente a `legacy_direct` sem reverter schema.
2. Não excluir as variantes já válidas nem os caminhos anteriores durante o rollback.
3. Preservar logs e `requestId` das falhas para diagnóstico.
4. Corrigir a causa, repetir o piloto e somente então reativar gradualmente.

## 11. Referências técnicas

- Vercel Functions — limite de corpo de 4,5 MB: <https://vercel.com/docs/functions/limitations>
- Vercel — recomendação de upload direto ao destino: <https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions>
- Supabase — upload padrão recomendado até 6 MB: <https://supabase.com/docs/guides/storage/uploads/standard-uploads>
- Supabase — limites por bucket e limite global: <https://supabase.com/docs/guides/storage/uploads/file-limits>
- Supabase — upload resumível para arquivos grandes: <https://supabase.com/features/resumable-uploads>
