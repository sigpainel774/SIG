'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { useSchoolStore } from '@/store/useSchoolStore'
import { CalendarioAcademicoContent } from '@/components/modals/modal-calendario-academico/CalendarioAcademicoContent'
import { Calendar, ShieldAlert, BookOpen, Sparkles, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function CalendarioAcademicoPage() {
  const router = useRouter()
  const { funcionario, isSecretarioEducacao, isAdminGlobalOrRoot } = useAuthStore()
  const { selectedSecretaria } = useSchoolStore()
  const [authorized, setAuthorized] = useState<boolean | null>(null)

  const isAllowed = isSecretarioEducacao() || isAdminGlobalOrRoot()

  useEffect(() => {
    if (funcionario) {
      setAuthorized(isAllowed)
    }
  }, [funcionario, isAllowed])

  if (authorized === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-center">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Acesso Restrito</h1>
        <p className="text-sm text-muted-foreground max-w-md">
          Esta sessão do Calendário Acadêmico é exclusiva para o cargo de{' '}
          <strong className="text-foreground">Secretário(a) Municipal de Educação</strong> e Administradores do Sistema.
        </p>
        <Button
          type="button"
          onClick={() => router.push('/home')}
          className="bg-primary text-primary-foreground font-semibold rounded-xl h-10 px-6 cursor-pointer"
        >
          Voltar ao Início
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-6 rounded-2xl shadow-xs">
        <div className="flex items-start md:items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary border border-primary/25 flex items-center justify-center shrink-0 shadow-inner">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">
                Calendário Acadêmico da Rede
              </h1>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/30 px-2.5 py-0.5 rounded-full">
                <Sparkles className="w-3 h-3" /> Gestão Oficial
              </span>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              Planejamento temporal oficial de aulas, trimestres, recessos e feriados de toda a rede municipal de ensino.
            </p>
          </div>
        </div>
      </div>

      {/* Container Principal com o Calendário */}
      <div className="bg-card border border-border p-5 rounded-2xl shadow-xs">
        <CalendarioAcademicoContent
          secretariaId={selectedSecretaria?.id}
          secretariaNome={selectedSecretaria?.nome}
        />
      </div>
    </div>
  )
}
