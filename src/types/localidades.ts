export type TipoLocalidade =
  | 'RURAL'
  | 'POVOADO'
  | 'DISTRITO'
  | 'ASSENTAMENTO'
  | 'QUILOMBO'
  | 'URBANA'
  | 'OUTRO';

export type PesoFonteLocalidade = 'normal' | 'bold' | 'semibold';

export interface Localidade {
  id: string;
  nome: string;
  descricao?: string | null;
  tipo: TipoLocalidade;
  latitude: number;
  longitude: number;
  cep?: string | null;
  tamanho_fonte: number;
  cor_texto: string;
  cor_fundo: string;
  peso_fonte: PesoFonteLocalidade;
  min_zoom: number;
  prioridade: number;
  ativo: boolean;
  criado_por?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type LocalidadeInsert = Omit<Localidade, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
};

export type LocalidadeUpdate = Partial<LocalidadeInsert>;
