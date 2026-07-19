import { useMemo, useRef } from 'react';

/**
 * Função utilitária para normalizar strings, convertendo para minúsculas
 * e removendo acentos/diacríticos para uma busca mais assertiva.
 */
function normalizeString(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Hook customizado para busca e filtragem local de dados na memória.
 * Oferece suporte a chaves diretas do objeto ou a uma função callback personalizada.
 * 
 * @param data Array de dados a ser filtrado.
 * @param searchTerm Termo de busca digitado pelo usuário.
 * @param searchFields Array de chaves do objeto T ou função callback personalizada.
 * @returns Array filtrado.
 */
export function useLocalSearch<T>(
  data: T[],
  searchTerm: string,
  searchFields: (keyof T)[] | ((item: T, normalizedTerm: string) => boolean)
): T[] {
  // Armazena a referência mais recente de searchFields para evitar recomputações desnecessárias
  // se a função callback for declarada inline no componente.
  const searchFieldsRef = useRef(searchFields);
  searchFieldsRef.current = searchFields;

  return useMemo(() => {
    const term = normalizeString(searchTerm).trim();
    if (!term) return data;

    const fields = searchFieldsRef.current;

    if (typeof fields === 'function') {
      return data.filter((item) => fields(item, term));
    }

    return data.filter((item) => {
      return fields.some((field) => {
        const value = item[field];
        return normalizeString(value).includes(term);
      });
    });
  }, [data, searchTerm]); // Depende apenas de dados e termo de busca
}
