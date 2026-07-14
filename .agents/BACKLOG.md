# Backlog Técnico — Itens Deixados para Depois

Registro de melhorias planejadas que foram conscientemente adiadas durante sessões de implementação.

---

## 🟠 JWT Custom Claims via Supabase Hook

**Contexto:** Discutido durante a otimização de middleware (2026-07-13).

**Problema que resolve:**
Hoje o `proxy.ts` ainda chama `supabase.auth.getUser()`, que valida o token com os servidores do Supabase (chamada de rede). Com o JWT Custom Claims, o campo `is_superadmin` ficaria embutido diretamente no token JWT — o proxy poderia ler isso **sem nenhuma chamada de rede ou ao banco**.

**Como implementar:**

1. Criar a função Postgres:
```sql
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  v_is_superadmin boolean := false;
  claims jsonb;
BEGIN
  SELECT COALESCE(is_superadmin, false)
  INTO v_is_superadmin
  FROM public.funcionarios
  WHERE auth_user_id = (event->>'user_id')::uuid;

  claims := jsonb_set(
    event->'claims',
    '{is_superadmin}',
    to_jsonb(v_is_superadmin)
  );
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;
```

2. Ativar no Dashboard do Supabase:
   - *Authentication → Hooks → Custom Access Token Hook*
   - Selecionar `public.custom_access_token_hook`

3. Atualizar `proxy.ts` para ler o claim do JWT (sem `getUser()`):
```typescript
const { data: { session } } = await supabase.auth.getSession()
const jwtPayload = session?.access_token
  ? JSON.parse(Buffer.from(session.access_token.split('.')[1], 'base64url').toString())
  : null
const isSuperAdmin = jwtPayload?.is_superadmin ?? false
```

**⚠️ Atenção:** Se `is_superadmin` mudar no banco, a mudança só reflete após o token expirar (~1h). Para mudanças críticas imediatas, o admin deve forçar logout do usuário.

**Pré-requisito:** A migração de `auth_user_id` (item abaixo) deve estar concluída antes, pois a função hook busca por `auth_user_id`.

---

## 🟠 Migração de Lookup por `auth_user_id` (UUID) em vez de `email`

**Contexto:** Discutido durante a otimização de middleware (2026-07-13).

**Problema que resolve:**
O `DashboardLayout` e os helpers de `auth-cache.ts` ainda usam `.ilike('email', user.email)` para encontrar o funcionário. Isso faz um scan case-insensitive por string — mais lento que buscar por UUID indexado.

**Como implementar:**

1. Garantir que **todos os funcionários** têm `auth_user_id` preenchido (a reconciliação on-the-fly no layout já está fazendo isso gradualmente).

2. Verificar no banco se ainda restam registros sem `auth_user_id`:
```sql
SELECT COUNT(*) FROM public.funcionarios WHERE auth_user_id IS NULL;
```

3. Quando o resultado for 0, atualizar `src/lib/auth-cache.ts`:
```typescript
// SUBSTITUIR getCachedFuncionarioByEmail por:
export const getCachedFuncionario = cache(async (authUserId: string) => {
  const { data } = await supabaseAdmin
    .from('funcionarios')
    .select('*')
    .eq('auth_user_id', authUserId)  // UUID indexado — muito mais rápido
    .maybeSingle()
  return data
})
```

4. Atualizar `DashboardLayout` e `RootPage` para usar `getCachedFuncionario(user.id)` em vez de `getCachedFuncionarioByEmail(user.email)`.

5. Remover o helper `getCachedFuncionarioByEmail` (ou manter como fallback temporário).

**O índice já foi criado** (`idx_funcionarios_auth_user_id`) em 2026-07-13, então essa etapa estará pronta assim que todos os registros tiverem `auth_user_id`.

---

## Histórico de Sessões

| Data | Sessão | Itens adiados |
|---|---|---|
| 2026-07-13 | Otimização de Middleware & Autenticação | JWT Custom Claims, Migração auth_user_id |
