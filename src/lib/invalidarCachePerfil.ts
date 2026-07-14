/**
 * Invalida o cache de perfil de um funcionário no servidor.
 * Deve ser chamado após qualquer mutação em:
 *  - acessos_usuarios (nível, ativo)
 *  - vinculos_funcionarios (escola_id, ativo)
 *  - funcionarios (dados gerais, is_superadmin)
 *
 * @param targetUserId - UUID do auth.users do funcionário alvo.
 *   Se omitido, invalida apenas o cache do usuário logado.
 */
export async function invalidarCachePerfil(targetUserId?: string): Promise<void> {
  try {
    await fetch('/api/auth/invalidate-cache', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(targetUserId ? { targetUserId } : {}),
    })
  } catch (err) {
    // Não deve quebrar o fluxo principal — apenas registra o erro
    console.warn('[invalidarCachePerfil] Falha ao invalidar cache:', err)
  }
}
