import { createClient } from '@/lib/supabaseClient';
import { Localidade, LocalidadeInsert, LocalidadeUpdate } from '@/types/localidades';

/**
 * Busca todas as localidades cadastradas no banco de dados.
 * @param apenasAtivas Se true, retorna somente localidades ativas (para uso em mapas de endereço).
 */
export async function listarLocalidades(apenasAtivas = false): Promise<Localidade[]> {
  const supabase = createClient();
  let query = supabase
    .from('localidades')
    .select('*')
    .order('prioridade', { ascending: true })
    .order('nome', { ascending: true });

  if (apenasAtivas) {
    query = query.eq('ativo', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Erro ao buscar localidades:', error);
    throw error;
  }

  return (data || []).map((loc) => ({
    ...loc,
    latitude: Number(loc.latitude),
    longitude: Number(loc.longitude),
    tamanho_fonte: Number(loc.tamanho_fonte ?? 14),
    min_zoom: Number(loc.min_zoom ?? 12),
    prioridade: Number(loc.prioridade ?? 1),
    ativo: loc.ativo !== false,
  })) as Localidade[];
}

/**
 * Salva (cria ou atualiza) uma localidade no Supabase.
 */
export async function salvarLocalidade(
  localidade: LocalidadeInsert & { id?: string },
  userId?: string | null
): Promise<Localidade> {
  const supabase = createClient();

  const payload = {
    nome: localidade.nome.trim(),
    descricao: localidade.descricao?.trim() || null,
    tipo: localidade.tipo || 'RURAL',
    latitude: Number(localidade.latitude),
    longitude: Number(localidade.longitude),
    cep: localidade.cep?.trim() || null,
    tamanho_fonte: Number(localidade.tamanho_fonte ?? 14),
    cor_texto: localidade.cor_texto || '#ffffff',
    cor_fundo: localidade.cor_fundo || 'rgba(15, 23, 42, 0.85)',
    peso_fonte: localidade.peso_fonte || 'bold',
    min_zoom: Number(localidade.min_zoom ?? 12),
    prioridade: Number(localidade.prioridade ?? 1),
    ativo: localidade.ativo !== false,
    updated_at: new Date().toISOString(),
    ...(userId ? { criado_por: userId } : {}),
  };

  if (localidade.id) {
    const { data, error } = await supabase
      .from('localidades')
      .update(payload)
      .eq('id', localidade.id)
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      latitude: Number(data.latitude),
      longitude: Number(data.longitude),
    } as Localidade;
  } else {
    const { data, error } = await supabase
      .from('localidades')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      latitude: Number(data.latitude),
      longitude: Number(data.longitude),
    } as Localidade;
  }
}

/**
 * Remove uma localidade do banco de dados.
 */
export async function excluirLocalidade(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('localidades').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Alterna o estado ativo/inativo de uma localidade.
 */
export async function alternarStatusLocalidade(id: string, ativo: boolean): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('localidades')
    .update({ ativo, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}
