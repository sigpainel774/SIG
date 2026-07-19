'use client'

import { Loader2, ShieldCheck, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AutocompleteFuncionario } from './AutocompleteFuncionario'
import type { UsePermissoesReturn } from './usePermissoes'
import type { Escola } from './types'

interface PermissoesFormProps {
  hook: UsePermissoesReturn
}

export function PermissoesForm({ hook }: PermissoesFormProps) {
  const {
    autocompleteRef,
    isGlobalAdmin,
    restringirNivel,
    salvando,
    escolas,
    inputFunc,
    setInputFunc,
    funcSelecionado,
    setFuncSelecionado,
    showSugestoes,
    setShowSugestoes,
    escolaSel,
    setEscolaSel,
    nivelSel,
    setNivelSel,
    sugestoesFiltradas,
    handleSalvarPermissao,
  } = hook

  return (
    <div className="bg-card border border-borderCustom rounded-2xl p-6 shadow-md space-y-5">
      <div className="flex items-center gap-2">
        <UserCheck className="w-5 h-5 text-[#0090ff]" />
        <h2 className="text-lg font-bold text-foreground">Atribuir / Atualizar Acesso</h2>
      </div>

      <form onSubmit={handleSalvarPermissao} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Campo Funcionário — Autocomplete */}
          <AutocompleteFuncionario
            autocompleteRef={autocompleteRef}
            inputFunc={inputFunc}
            setInputFunc={setInputFunc}
            funcSelecionado={funcSelecionado}
            setFuncSelecionado={setFuncSelecionado}
            showSugestoes={showSugestoes}
            setShowSugestoes={setShowSugestoes}
            sugestoesFiltradas={sugestoesFiltradas}
          />

          {/* Campo Escola / Órgão — populado do banco */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase block">
              ESCOLA / ÓRGÃO
            </label>
            <select
              value={escolaSel}
              onChange={(e) => setEscolaSel(e.target.value)}
              className="w-full bg-surface-1 border border-borderCustom text-foreground h-11 rounded-xl px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#0090ff] focus:border-[#0090ff] cursor-pointer"
            >
              {isGlobalAdmin && <option value="">Global / Todas as Escolas</option>}
              {escolas.map((e: Escola) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Campo Nível de Acesso */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase block">
              NÍVEL DE ACESSO
            </label>
            <select
              value={nivelSel}
              onChange={(e) => setNivelSel(e.target.value)}
              className="w-full bg-surface-1 border border-borderCustom text-foreground h-11 rounded-xl px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#0090ff] focus:border-[#0090ff] cursor-pointer"
            >
              <option value="">Selecione o nível</option>
              {!restringirNivel && <option value="1">Nível 1 - Administrador Global</option>}
              {!restringirNivel && <option value="2">Nível 2 - Diretor</option>}
              <option value="3">Nível 3 - Coord. / Secretário</option>
              <option value="4">Nível 4 - Professor</option>
              <option value="5">Nível 5 - Chefe de Equipe</option>
              <option value="6">Nível 6 - Operacional Mobile</option>
            </select>
          </div>
        </div>

        <Button
          type="submit"
          disabled={salvando}
          className="w-full h-12 bg-[#0090ff] hover:bg-[#0070f3] text-white font-semibold text-base rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-60"
        >
          {salvando ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Salvando...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              Salvar Permissão
            </span>
          )}
        </Button>
      </form>
    </div>
  )
}
