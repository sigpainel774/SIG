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
  realFuncionario: Funcionario | Partial<Funcionario> | null;
  realAcessos: AcessoUsuario[];
  realVinculos: VinculoFuncionario[];
  escolaAtivaId: string | null;
  setAuth: (func: Funcionario | any, acessos: AcessoUsuario[], vinculos?: VinculoFuncionario[]) => void;
  syncSimulation: (simFunc: Funcionario | any, simAcessos: AcessoUsuario[], simVinculos: VinculoFuncionario[]) => void;
  desativarSimulacao: () => void;
  setEscolaAtivaId: (id: string | null) => void;
  limparSessao: () => void;
  logout: (supabase: any, redirectUrl?: string) => Promise<void>;
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
  isContaEja: () => boolean;
  canAccessEja: () => boolean;
  isSecretarioEducacao: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  funcionario: null,
  acessos: [],
  vinculos: [],
  realFuncionario: null,
  realAcessos: [],
  realVinculos: [],
  escolaAtivaId: null,

  setAuth: (funcionario, acessos, vinculos = []) => {
    const simState = usePermissionSimulationStore.getState();
    const isSimulating = simState.isSimulating && simState.simulatedFuncionario;

    set({
      realFuncionario: funcionario,
      realAcessos: acessos,
      realVinculos: vinculos,
      funcionario: isSimulating ? simState.simulatedFuncionario : funcionario,
      acessos: isSimulating ? simState.simulatedAcessos : acessos,
      vinculos: isSimulating ? (simState.simulatedVinculos as VinculoFuncionario[]) : vinculos,
    });
  },

  syncSimulation: (simFunc, simAcessos, simVinculos) => {
    const current = get();
    // Preservar o perfil real caso ainda não tenha sido explicitamente capturado
    const realFunc = current.realFuncionario ?? current.funcionario;
    const realAc = current.realAcessos.length > 0 ? current.realAcessos : current.acessos;
    const realVinc = current.realVinculos.length > 0 ? current.realVinculos : current.vinculos;

    set({
      realFuncionario: realFunc,
      realAcessos: realAc,
      realVinculos: realVinc,
      funcionario: simFunc,
      acessos: simAcessos,
      vinculos: simVinculos,
    });
  },

  desativarSimulacao: () => {
    const current = get();
    set({
      funcionario: current.realFuncionario ?? current.funcionario,
      acessos: current.realAcessos ?? current.acessos,
      vinculos: current.realVinculos ?? current.vinculos,
    });
  },

  setEscolaAtivaId: (escolaAtivaId) => {
    if (get().escolaAtivaId === escolaAtivaId) return;
    set({ escolaAtivaId });
    useSchoolStore.getState().selectEscolaById(escolaAtivaId);
  },

  limparSessao: () => set({ funcionario: null, acessos: [], vinculos: [], realFuncionario: null, realAcessos: [], realVinculos: [], escolaAtivaId: null }),

  logout: async (supabase: any, redirectUrl: string = '/login') => {
    // Encerrar simulação de permissões se estivesse ativa
    usePermissionSimulationStore.getState().encerrarSimulacao();

    get().limparSessao();

    // Expurgo profundo de caches autenticados no navegador
    if (typeof window !== 'undefined') {
      try {
        await limparCacheIndexedDB().catch(() => {});
      } catch (e) {}

      try {
        mutate(() => true, undefined, { revalidate: false }).catch(() => {});
      } catch (e) {}

      if ('caches' in window) {
        caches.keys().then((keys) => {
          keys.forEach((key) => caches.delete(key));
        }).catch(() => {});
      }
    }

    if (supabase?.auth) {
      supabase.auth.signOut().catch((err: any) => console.warn('Erro ao encerrar sessão Supabase:', err));
    }
    if (typeof window !== 'undefined') {
      window.location.href = redirectUrl;
    }
  },

  getFuncionarioAtivo: () => {
    return get().funcionario;
  },

  getAcessosAtivos: () => {
    return get().acessos || [];
  },

  getVinculosAtivos: () => {
    return get().vinculos || [];
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
    return acessos.some(a => (a.nivel === 4 || a.nivel === 5) && a.ativo) || cargo.includes('professor');
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

  isContaEja: () => {
    const funcionario = get().getFuncionarioAtivo();
    return Boolean((funcionario as any)?.is_conta_eja === true);
  },

  canAccessEja: () => {
    const funcionario = get().getFuncionarioAtivo();
    const acessos = get().getAcessosAtivos();
    if ((funcionario as any)?.is_conta_eja === true) return true;
    if (funcionario?.is_superadmin) return true;
    if (acessos.some(a => (a as any).pode_eja === true && a.ativo)) return true;
    return false;
  },

  isSecretarioEducacao: () => {
    const funcionario = get().getFuncionarioAtivo();
    const acessos = get().getAcessosAtivos();
    if (funcionario?.is_superadmin) return true;
    const isNivel1 = acessos.some(a => a.nivel === 1 && a.ativo);
    if (!isNivel1) return false;
    const rawCargo = (funcionario?.cargo ?? '').trim().toLowerCase();
    const normCargo = rawCargo.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return (
      (normCargo.includes('secretari') && normCargo.includes('educa')) ||
      normCargo.includes('secretario(a) municipal de educacao')
    );
  },
}));

