import { create } from 'zustand';
import { Database } from '@/types/supabase';
import { useSchoolStore } from './useSchoolStore';
import { limparCacheIndexedDB } from '@/lib/swr/indexedDBCache';
import { mutate } from 'swr';

type Funcionario = Database['public']['Tables']['funcionarios']['Row'];
type AcessoUsuario = Database['public']['Tables']['acessos_usuarios']['Row'];

export type VinculoFuncionario = {
  id: string
  escola_id: string
  escolaNome?: string
  cargo: string | null
  ativo: boolean
}

interface AuthState {
  funcionario: Funcionario | Partial<Funcionario> | null;
  acessos: AcessoUsuario[];
  vinculos: VinculoFuncionario[];
  escolaAtivaId: string | null;
  setAuth: (func: Funcionario | any, acessos: AcessoUsuario[], vinculos?: VinculoFuncionario[]) => void;
  setEscolaAtivaId: (id: string | null) => void;
  limparSessao: () => void;
  logout: (supabase: any) => Promise<void>;
  isAdminGlobalOrRoot: () => boolean;
  isDiretor: () => boolean;
  isChefe: () => boolean;
  isProfessor: () => boolean;
  isCoordenador: () => boolean;
  isRhRede: () => boolean;
  isRhRedeExclusivo: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  funcionario: null,
  acessos: [],
  vinculos: [],
  escolaAtivaId: null,
  setAuth: (funcionario, acessos, vinculos = []) => set({ funcionario, acessos, vinculos }),
  setEscolaAtivaId: (escolaAtivaId) => {
    if (get().escolaAtivaId === escolaAtivaId) return
    set({ escolaAtivaId })
    useSchoolStore.getState().selectEscolaById(escolaAtivaId)
  },
  limparSessao: () => set({ funcionario: null, acessos: [], vinculos: [], escolaAtivaId: null }),
  logout: async (supabase: any) => {
    get().limparSessao()

    // Expurgo profundo de caches autenticados no navegador
    if (typeof window !== 'undefined') {
      try {
        await limparCacheIndexedDB().catch(() => {})
      } catch (e) {}

      try {
        mutate(() => true, undefined, { revalidate: false }).catch(() => {})
      } catch (e) {}

      if ('caches' in window) {
        caches.keys().then((keys) => {
          keys.forEach((key) => caches.delete(key))
        }).catch(() => {})
      }
    }

    if (supabase?.auth) {
      supabase.auth.signOut().catch((err: any) => console.warn('Erro ao encerrar sessão Supabase:', err))
    }
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
  },
  isAdminGlobalOrRoot: () => {
    const state = get();
    if (state.funcionario?.is_superadmin) return true;
    return state.acessos.some(a => a.nivel === 1 && !a.pode_rh_rede && a.ativo);
  },
  isDiretor: () => {
    const state = get();
    return state.acessos.some(a => a.nivel === 2 && a.ativo);
  },
  isChefe: () => {
    const state = get();
    return state.acessos.some(a => a.nivel === 5 && a.ativo);
  },
  isProfessor: () => {
    const state = get();
    const acessos = state.acessos || [];
    const cargo = state.funcionario?.cargo?.toLowerCase() || '';
    return acessos.some(a => a.nivel === 4 || a.nivel === 5) || cargo.includes('professor');
  },
  isCoordenador: () => {
    const state = get();
    const cargo = state.funcionario?.cargo?.toLowerCase() || '';
    return cargo.includes('coordenador');
  },
  isRhRede: () => {
    const state = get();
    if (state.funcionario?.is_superadmin) return true;
    return state.acessos.some(a => (a.pode_rh_rede || a.nivel === 1) && a.ativo);
  },
  isRhRedeExclusivo: () => {
    const state = get();
    if (state.funcionario?.is_superadmin) return false;
    const temRhRede = state.acessos.some(a => a.pode_rh_rede === true && a.ativo);
    const temOutroAcessoAmplo = state.acessos.some(a => a.nivel === 1 && !a.pode_rh_rede && a.ativo);
    return temRhRede && !temOutroAcessoAmplo;
  },
}));
