'use client'

import {
  Edit,
  Trash2,
  Phone,
  MapPin,
  User,
  FileText,
  BadgeInfo,
  Building2,
  Printer,
  Archive,
  Paperclip,
  Hash,
  Lock,
} from 'lucide-react'
import { type Aluno } from '@/hooks/useAlunos'

interface AlunosListProps {
  carregando: boolean
  alunosFiltrados: Aluno[]
  isEditMode: boolean
  onAnexos: (aluno: Aluno) => void
  onEditar: (aluno: Aluno) => void
  onImprimir: (aluno: Aluno) => void
  onComprovante: (aluno: Aluno) => void
  onArquivar: (aluno: Aluno) => void
}

export function AlunosList({
  carregando,
  alunosFiltrados,
  isEditMode,
  onAnexos,
  onEditar,
  onImprimir,
  onComprovante,
  onArquivar,
}: AlunosListProps) {
  if (carregando) {
    return (
      <div className="text-center py-16 bg-surface-1 rounded-2xl border border-borderCustom text-muted-foreground text-sm">
        Carregando alunos...
      </div>
    )
  }

  if (alunosFiltrados.length === 0) {
    return (
      <div className="text-center py-16 bg-surface-1 rounded-2xl border border-borderCustom text-muted-foreground text-sm">
        Nenhum aluno encontrado.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {alunosFiltrados.map((aluno) => {
        const escolaNome =
          aluno.escola_nome ?? aluno.dados_matricula?.escolaNome ?? 'Sem Escola'
        const serieNome =
          aluno.serie ?? aluno.dados_matricula?.serieAluno ?? 'Sem Série'
        const telefone =
          aluno.telefone ?? aluno.dados_matricula?.telMaeAluno ?? '-'
        const endereco =
          aluno.endereco ?? aluno.dados_matricula?.ruaAluno ?? '-'
        const nomeMae =
          aluno.nome_mae ?? aluno.dados_matricula?.nomeMaeAluno ?? null

        return (
          <div
            key={aluno.id}
            className="bg-card border-[0.5px] border-border hover:border-primary/40 rounded-2xl p-5 flex flex-col gap-4 transition-all duration-200 shadow-sm"
          >
            {/* ── Topo do card: Foto + Nome + Série ── */}
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-border/50">
              <div className="flex items-center gap-4 min-w-0">
                {/* Foto / Iniciais */}
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border border-border flex-shrink-0 flex items-center justify-center bg-muted text-foreground text-base sm:text-lg font-bold overflow-hidden shadow-inner">
                  {aluno.foto_url ? (
                    <img
                      src={aluno.foto_url}
                      alt={aluno.nome}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    aluno.nome.substring(0, 2).toUpperCase()
                  )}
                </div>

                {/* Informações Principais */}
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-foreground tracking-tight truncate max-w-full flex items-center gap-2">
                    <span>{aluno.nome}</span>
                    {aluno.dados_matricula?.documento_bloqueado === true && (
                      <span
                        className="p-1 bg-primary/10 border border-primary/20 rounded-md text-primary"
                        title="Ficha Assinada e Trancada"
                      >
                        <Lock className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </h3>
                  <div className="mt-1">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 border border-primary/20 text-primary shrink-0">
                      {serieNome}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Detalhes do Aluno ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2 text-sm font-normal text-muted-foreground">
              {aluno.numero_matricula && (
                <div className="flex items-center gap-1.5 truncate text-purple-400 font-semibold">
                  <Hash className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span className="truncate">Matrícula: {aluno.numero_matricula}</span>
                </div>
              )}

              <div className="flex items-center gap-1.5 truncate">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                <span className="truncate">{escolaNome}</span>
              </div>

              {telefone !== '-' && (
                <div className="flex items-center gap-1.5 truncate">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                  <span className="truncate">{telefone}</span>
                </div>
              )}

              {aluno.cpf && (
                <div className="flex items-center gap-1.5 truncate">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                  <span className="truncate">CPF: {aluno.cpf}</span>
                </div>
              )}

              {aluno.inep && (
                <div className="flex items-center gap-1.5 truncate">
                  <BadgeInfo className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                  <span className="truncate">INEP: {aluno.inep}</span>
                </div>
              )}

              {nomeMae && (
                <div className="flex items-center gap-1.5 truncate">
                  <User className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                  <span className="truncate">Mãe: {nomeMae}</span>
                </div>
              )}

              {endereco !== '-' && (
                <div className="flex items-center gap-1.5 truncate">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                  <span className="truncate">{endereco}</span>
                </div>
              )}
            </div>

            {/* ── Botões de Ação ── */}
            <div className="flex flex-wrap items-center justify-end gap-2 shrink-0 pt-2">
              <button
                onClick={() => onAnexos(aluno)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-transparent border border-border text-foreground hover:bg-hoverCustom text-xs font-semibold transition-colors cursor-pointer"
                title="Anexos do Aluno"
              >
                <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="hidden sm:inline">Anexos</span>
              </button>

              {isEditMode && (
                <button
                  onClick={() => onEditar(aluno)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-transparent border border-border text-foreground hover:bg-hoverCustom text-xs font-semibold transition-colors cursor-pointer"
                  title="Editar Aluno"
                >
                  <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="hidden sm:inline">Editar</span>
                </button>
              )}

              {/* Imprimir Ficha */}
              <button
                onClick={() => onImprimir(aluno)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition-colors cursor-pointer border-none shadow-sm"
                title="Imprimir Ficha de Matrícula"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Imprimir Ficha</span>
              </button>

              <button
                onClick={() => onComprovante(aluno)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-transparent border border-border text-foreground hover:bg-hoverCustom text-xs font-semibold transition-colors cursor-pointer"
                title="Imprimir Comprovante de Matrícula"
              >
                <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="hidden sm:inline">Comprovante</span>
              </button>

              {isEditMode && (
                <button
                  onClick={() => onArquivar(aluno)}
                  className="p-2 sm:px-3 sm:py-2 rounded-xl bg-transparent border border-border text-foreground hover:bg-destructive/10 hover:text-destructive text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                  title="Arquivar Aluno"
                >
                  <Archive className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="hidden sm:inline">Arquivar</span>
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
