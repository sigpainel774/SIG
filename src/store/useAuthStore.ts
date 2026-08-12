import { create } from 'zustand';
import { Database } from '@/types/supabase';
import { useSchoolStore } from './useSchoolStore';
import { usePermissionSimulationStore } from './usePermissionSimulationStore';
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
  getFuncionarioAtivo: () => Funcionario | Partial<Funcionario> | null;
  getAcessosAtivos: () => AcessoUsuario[];
  getVinculosAtivos: () => VinculoFuncionario[];
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
    // Encerrar simulação de permissões se estivesse ativa
    usePermissionSimulationStore.getState().encerrarSimulacao();

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
  getFuncionarioAtivo: () => {
    const state = get();
    const simState = usePermissionSimulationStore.getState();
    if (simState.isSimulating && simState.simulatedFuncionario) {
      return simState.simulatedFuncionario;
    }
    return state.funcionario;
  },
  getAcessosAtivos: () => {
    const state = get();
    const simState = usePermissionSimulationStore.getState();
    if (simState.isSimulating && simState.simulatedAcessos) {
      return simState.simulatedAcessos;
    }
    return state.acessos || [];
  },
  getVinculosAtivos: () => {
    const state = get();
    const simState = usePermissionSimulationStore.getState();
    if (simState.isSimulating && simState.simulatedVinculos) {
      return simState.simulatedVinculos as VinculoFuncionario[];
    }
    return state.vinculos || [];
  },
  isAdminGlobalOrRoot: () => {
    const funcionario = get().getFuncionarioAtivo();
    const acessos = get().getAcessosAtivos();
    if (funcionario?.is_superadmin) return true;
    return acessos.some(a => a.nivel === 1 && !a.pode_rh_rede && a.ativo);
  },
  isDiretor: () => {
    const acessos = get().getAcessosAtivos();
    return acessos.some(a => a.nivel === 2 && a.ativo);
  },
  isChefe: () => {
    const acessos = get().getAcessosAtivos();
    return acessos.some(a => a.nivel === 5 && a.ativo);
  },
  isProfessor: () => {
    const funcionario = get().getFuncionarioAtivo();
    const acessos = get().getAcessosAtivos();
    const cargo = funcionario?.cargo?.toLowerCase() || '';
    return acessos.some(a => a.nivel === 4 || a.nivel === 5) || cargo.includes('professor');
  },
  isCoordenador: () => {
    const funcionario = get().getFuncionarioAtivo();
    const cargo = funcionario?.cargo?.toLowerCase() || '';
    return cargo.includes('coordenador');
  },
  isRhRede: () => {
    const funcionario = get().getFuncionarioAtivo();
    const acessos = get().getAcessosAtivos();
    if (funcionario?.is_superadmin) return true;
    return acessos.some(a => (a.pode_rh_rede || a.nivel === 1) && a.ativo);
  },
  isRhRedeExclusivo: () => {
    const funcionario = get().getFuncionarioAtivo();
    const acessos = get().getAcessosAtivos();
    if (funcionario?.is_superadmin) return false;
    const temRhRede = acessos.some(a => a.pode_rh_rede === true && a.ativo);
    const temOutroAcessoAmplo = acessos.some(a => a.nivel === 1 && !a.pode_rh_rede && a.ativo);
    return temRhRede && !temOutroAcessoAmplo;
  },
}));

