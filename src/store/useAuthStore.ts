import { create } from 'zustand';
import { Database } from '@/types/supabase';

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
  funcionario: Funcionario | null;
  acessos: AcessoUsuario[];
  vinculos: VinculoFuncionario[];
  escolaAtivaId: string | null;
  setAuth: (func: Funcionario, acessos: AcessoUsuario[], vinculos?: VinculoFuncionario[]) => void;
  setEscolaAtivaId: (id: string | null) => void;
  limparSessao: () => void;
  isAdminGlobalOrRoot: () => boolean;
  isDiretor: () => boolean;
  isChefe: () => boolean;
  isProfessor: () => boolean;
  isCoordenador: () => boolean;
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
    const { useSchoolStore } = require('./useSchoolStore')
    useSchoolStore.getState().selectEscolaById(escolaAtivaId)
  },
  limparSessao: () => set({ funcionario: null, acessos: [], vinculos: [], escolaAtivaId: null }),
  isAdminGlobalOrRoot: () => {
    const state = get();
    if (state.funcionario?.is_superadmin) return true;
    return state.acessos.some(a => a.nivel === 1);
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
}));
