import { z } from "zod";

/**
 * SIG Core Schemas & Validation Types (Zod)
 * Permite validação em runtime e tipagem automática via z.infer<typeof Schema>
 */

// --- Alunos & Matrícula ---
export const AlunoSchema = z.object({
  id: z.string().uuid().optional(),
  escola_id: z.string().uuid(),
  nome: z.string().min(2, "O nome do aluno deve ter pelo menos 2 caracteres"),
  cpf: z
    .string()
    .regex(/^\d{11}$/, "CPF deve conter 11 dígitos numéricos")
    .optional()
    .nullable(),
  data_nascimento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD")
    .optional()
    .nullable(),
  matricula: z.string().optional().nullable(),
  status: z.enum(["Ativo", "Inativo", "Transferido", "Evadido"]).default("Ativo"),
  turma_id: z.string().uuid().optional().nullable(),
  nome_responsavel: z.string().optional().nullable(),
  telefone_responsavel: z.string().optional().nullable(),
  email_responsavel: z.string().email("E-mail inválido").optional().nullable(),
});

export type AlunoInput = z.infer<typeof AlunoSchema>;

// --- Turmas & Séries ---
export const TurmaSchema = z.object({
  id: z.string().uuid().optional(),
  escola_id: z.string().uuid(),
  nome: z.string().min(1, "Nome da turma é obrigatório"),
  ano_letivo: z.number().int().min(2020).max(2050),
  turno: z.enum(["Matutino", "Vespertino", "Noturno", "Integral"]),
  etapa_ensino: z.string().min(1, "Etapa de ensino é obrigatória"),
  capacidade_maxima: z.number().int().positive().default(35),
  ativo: z.boolean().default(true),
});

export type TurmaInput = z.infer<typeof TurmaSchema>;

// --- Frequência / Chamada ---
export const ChamadaRegistroSchema = z.object({
  aluno_id: z.string().uuid(),
  turma_id: z.string().uuid(),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(["P", "F", "FJ"]), // Presente, Falta, Falta Justificada
  justificativa: z.string().optional().nullable(),
  aula_numero: z.number().int().min(1).max(10).optional().default(1),
});

export const LoteChamadaSchema = z.object({
  turma_id: z.string().uuid(),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  disciplina_id: z.string().uuid().optional().nullable(),
  registros: z.array(ChamadaRegistroSchema),
});

export type LoteChamadaInput = z.infer<typeof LoteChamadaSchema>;

// --- Mural / Avisos ---
export const ComunicadoMuralSchema = z.object({
  id: z.string().uuid().optional(),
  titulo: z.string().min(3, "Título deve ter no mínimo 3 caracteres"),
  conteudo: z.string().min(5, "Conteúdo do comunicado é obrigatório"),
  escola_id: z.string().uuid().optional().nullable(),
  turma_ids: z.array(z.string().uuid()).optional().default([]),
  destinatarios_tipo: z.enum(["todos", "professores", "pais", "alunos"]).default("todos"),
  is_pinned: z.boolean().default(false),
  data_expiracao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data de expiração obrigatória"),
  permite_reacoes: z.boolean().default(true),
});

export type ComunicadoMuralInput = z.infer<typeof ComunicadoMuralSchema>;

// --- Utilitário de parsing seguro com mensagens amigáveis ---
export function safeValidate<T>(
  schema: z.ZodType<T>,
  data: unknown,
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errors = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
  return { success: false, errors };
}
