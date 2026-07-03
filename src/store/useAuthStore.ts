import { create } from 'zustand';
import { Database } from '@/types/supabase';

type Funcionario = Database['public']['Tables']['funcionarios']['Row'];
type AcessoUsuario = Database['public']['Tables']['acessos_usuarios']['Row'];

interface AuthState {
  funcionario: Funcionario | null;
  acessos: AcessoUsuario[];
  escolaAtivaId: string | null;
  setAuth: (func: Funcionario, acessos: AcessoUsuario[]) => void;
  setEscolaAtivaId: (id: string | null) => void;
  limparSessao: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  funcionario: null,
  acessos: [],
  escolaAtivaId: null,
  setAuth: (funcionario, acessos) => set({ funcionario, acessos }),
  setEscolaAtivaId: (escolaAtivaId) => set({ escolaAtivaId }),
  limparSessao: () => set({ funcionario: null, acessos: [], escolaAtivaId: null }),
}));
