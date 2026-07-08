# Requisitos — Atualização do Cadastro de Funcionário

> Documento de referência para atualização do formulário de "Cadastro de Funcionário"
> do sistema (Next.js + Supabase + Vercel + GitHub), com base na ficha física oficial
> da Secretaria Municipal de Educação de Sapeaçu.

## Contexto do projeto

- **Stack:** Next.js, Supabase (banco de dados e storage), deploy na Vercel, repositório no GitHub.
- Já existe uma tela/formulário de cadastro de funcionário. Antes de alterar, é necessário
  levantar todos os campos, tabelas e componentes atuais relacionados a esse cadastro
  (schema no Supabase, formulário no front-end e template de impressão/PDF).

---

## Tarefa 1 — Mapear campos faltantes

Comparar o formulário atual com a lista de campos abaixo (extraída da ficha física em
papel) e identificar quais já existem e quais precisam ser criados no banco (Supabase)
e no formulário.

### 1–3. Dados da Unidade Escolar
1. Unidade Escolar
2. Código INEP da Unidade Escolar
3. Localização da UE

> ⚠️ Ver Tarefa 2 — estes 3 campos **não devem ser digitados manualmente**.

### Identificação do Funcionário
4. Nome completo do funcionário
5. Identificação CENSO (código gerado pelo INEP para professores durante o Censo)
6. Estado civil — *Solteiro, Casado, Separado, Divorciado, Viúvo, Não declarado*
7. Cor/raça — *Amarela, Branca, Indígena, Parda, Preta, Não declarado*
8. Sexo — *Feminino, Masculino, Outro, Não declarado*
9. Filiação — Nome da Mãe, Nome do Pai
10. Nacionalidade — *Brasileira, Brasileira nascido no exterior/nacionalizado,
    Estrangeira* (+ campo "especifique" quando Estrangeira)
11. Data de nascimento
12. Município de nascimento
13. UF de nascimento

### Documentos
14. Número da identidade (RG)
15. Número do NIS
16. Número do CPF

### Endereço
17. Avenida/Rua/Travessa
18. Número
19. CEP
20. Bairro/Localidade
21. Cidade de residência
22. UF de residência
23. Área de localização da residência — *Urbana, Rural*
24. Área de localização diferenciada — *Não está em área diferenciada, Comunidade
    remanescente de quilombos, Terra indígena, Área de assentamento cigano*

### Dados Empregatícios
25. Função que exerce na escola — *Auxiliar Administrativo, Auxiliar de Sala, Auxiliar
    de Serviços Gerais, Coordenador(a) Pedagógico, Diretor(a), Merendeira, Monitor de
    Atividade Complementar, Monitor(a) de área, Nutricionista, Professor(a),
    Psicólogo(a), Psicopedagogo(a), Secretária(o), Tecnólogo em Alimentos,
    Vice-Diretor, Vigilante, Zelador(a), Outro* (+ campo texto)
26. Tipo de vínculo — *Contratado, Efetivo, Nomeado, Outro* (+ campo texto)

### Saúde
27. Profissional escolar com deficiência, TEA ou altas habilidades/superdotação
    (Sim/Não)
27.a. Tipo (quando 27 = Sim), dividido em três grupos:
   - **Deficiência:** Baixa visão, Cegueira, Surdez, Deficiência física, Deficiência
     intelectual, Deficiência Auditiva, Surdocegueira, Deficiência múltipla
   - **Transtorno do espectro autista**
   - **Altas habilidades/superdotação**
28. Doenças (cada uma com Sim/Não): Diabetes, Convulsões, Asma/Bronquite, Infecções,
    Cardiopatias, Alergias, Covid-19, Doenças articulares, Outra (campo texto)

### Escolaridade
29. Maior nível de escolaridade concluído — *Não concluiu o Ensino Fundamental, Ensino
    Fundamental, Ensino Médio, Educação Superior*
30. Tipo de Ensino Médio cursado — *Formação Geral, Modalidade Normal/Magistérios,
    Curso Técnico, Magistério Indígena - modalidade Normal*
31. Dados do Curso Superior: Área do curso, Código do curso superior, Ano de
    conclusão, Tipo de instituição (Pública/Privada), Nível/Grau acadêmico
    (Bacharelado, Licenciatura, Sequencial, Tecnológico), Instituição de formação
32. Formação/Complementação pedagógica: Área do conhecimento/componentes curriculares
33. Pós-graduações concluídas (**lista repetível, até 6 registros**): Tipo
    (Especialização, Mestrado, Doutorado), Área do curso, Ano de conclusão
34. Outros cursos específicos / formação continuada (mín. 80h) — múltipla escolha:
    Creche (0 a 3 anos), Pré-escolar (4 e 5 anos), Anos iniciais do ensino
    fundamental, Anos finais do ensino fundamental, Ensino médio, Educação de jovens
    e adultos, Educação especial, Educação indígena, Educação do campo, Direitos da
    criança e do adolescente, Educação em direitos humanos, Gênero e diversidade
    sexual, Gestão escolar, Outros, Nenhum

### Documentação anexa (upload de arquivos)
35. Cópias de documentos anexados: Identidade, CPF, Comprovante de residência,
    Comprovante de escolaridade (Ensino Fundamental, Ensino Médio, Curso Superior,
    Pós-Graduação, Mestrado, Doutorado) — cada um com upload de arquivo no Supabase
    Storage

### Outros
- Campo de Observações (texto livre)
- Data de preenchimento e Assinatura do funcionário (informativo no sistema, sem
  exigir assinatura física)

---

## Tarefa 2 — Adaptar para o sistema (não replicar 1:1 o papel)

- Os quadradinhos de "letra de forma" da ficha em papel (Nome, CENSO, CPF, CEP etc.)
  **não devem ser recriados** na interface. Devem virar inputs normais de texto/número,
  com máscara quando fizer sentido (CPF, CEP, data).
- Os itens **1, 2 e 3** (Unidade Escolar, Código INEP da Unidade Escolar, Localização
  da UE) **não devem ser digitados** pelo usuário: buscar automaticamente no sistema
  (tabela de escolas/unidades já existente no Supabase) e preencher com base na
  unidade escolar vinculada ao funcionário/usuário logado, exibindo como campo
  somente leitura ou select vinculado.
- Campos de múltipla escolha exclusiva (estado civil, cor/raça, sexo, nacionalidade,
  função, tipo de vínculo, escolaridade, etc.) → **radio buttons ou select dropdown**.
- Campos de múltipla escolha não exclusiva (outros cursos específicos, tipo de
  deficiência) → **checkboxes**.
- Verificar se já existe um **bucket no Supabase Storage para foto 3x4** dos
  funcionários. Se existir, reutilizar; se não existir, criar bucket apropriado (com
  política de acesso adequada) e implementar upload/preview da foto 3x4 no topo do
  formulário, no lugar do retângulo em branco da ficha física.

---

## Tarefa 3 — Layout de impressão

- Criar/ajustar um template de impressão (PDF ou CSS de impressão) que reproduza a
  ficha em **exatamente 2 folhas A4**, mantendo a organização visual em seções
  (Identificação, Documentos, Endereço, Dados Empregatícios, Saúde, Escolaridade,
  Documentação Anexa).
- **Regra importante:** na impressão, os campos de múltipla escolha devem exibir
  **somente a opção selecionada**, e não a lista completa de opções com parênteses
  vazios. Exemplo: no item 25 (Função), se o usuário selecionou "Professor(a)" na
  tela de edição, a impressão deve mostrar apenas `Função: Professor(a)`, sem listar
  as demais opções não marcadas. Aplicar essa mesma regra a todos os campos de
  seleção única ou múltipla do formulário (estado civil, cor/raça, sexo,
  nacionalidade, tipo de vínculo, escolaridade, tipo de deficiência, doenças
  marcadas como "Sim", outros cursos marcados, documentos anexados, etc.).
- Incluir a foto 3x4 do funcionário no canto superior esquerdo da primeira folha
  impressa, como na ficha original.

---

## Entregáveis esperados

1. Alterações no schema do Supabase (migrations) para os campos que ainda não existem.
2. Atualização do formulário (componentes React/Next.js) com os novos campos,
   validações e máscaras apropriadas.
3. Lógica para autopreenchimento dos itens 1, 2 e 3 a partir dos dados já cadastrados
   da unidade escolar.
4. Verificação/criação do bucket de foto 3x4 no Supabase Storage, com upload funcional.
5. Template de impressão em 2 páginas A4 com lógica condicional (mostrar só o que foi
   selecionado).
6. Resumo final explicando o que foi adicionado, alterado e quais migrations precisam
   ser rodadas em produção (Vercel/Supabase).

> Antes de codar, fazer um plano listando os arquivos que serão alterados/criados e
> apresentar para aprovação, especialmente as mudanças de schema no banco.
