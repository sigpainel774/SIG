'use client'

import { useState } from 'react'
import { ChevronDown, Info, Lock, Save, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export default function PerfilPage() {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Meu Perfil</h1>
        <p className="mt-1 text-sm text-muted-foreground">Dados da ficha funcional e seguranca da conta.</p>
      </div>

      <Card className="border-borderCustom bg-card p-6">
        <h2 className="mb-5 flex items-center gap-2 border-b border-borderCustom pb-4 text-lg font-semibold text-white">
          <User className="h-5 w-5 text-highlight" />
          Dados da Ficha Funcional
        </h2>
        <div className="flex flex-col gap-5 sm:flex-row">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-input text-white">
            <User className="h-10 w-10" />
          </div>
          <div className="grid flex-1 gap-4 sm:grid-cols-2">
            <ProfileField label="Nome Completo" value="Usuario do Sistema" strong />
            <ProfileField label="E-mail" value="usuario@sapeacu.gov.br" />
            <ProfileField label="Cargo" value="Servidor" badge />
            <ProfileField label="Telefone" value="-" />
          </div>
        </div>
      </Card>

      <div className="rounded-lg border-l-4 border-blue-500 bg-blue-500/10 p-4 text-blue-100">
        <h3 className="mb-2 flex items-center gap-2 font-semibold">
          <Info className="h-5 w-5" />
          Recomendacoes de Seguranca
        </h3>
        <p className="text-sm leading-6">
          Se este e seu primeiro acesso usando uma senha padrao fornecida pela secretaria, crie uma senha forte e pessoal.
        </p>
      </div>

      <Card className="border-borderCustom bg-card p-6">
        <button
          type="button"
          onClick={() => setShowPassword((value) => !value)}
          className={`flex w-full items-center justify-between gap-3 text-left text-lg font-semibold text-white ${showPassword ? 'border-b border-borderCustom pb-4' : ''}`}
        >
          <span className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-highlight" />
            Alterar Senha de Acesso
          </span>
          <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${showPassword ? 'rotate-180' : ''}`} />
        </button>

        {showPassword && (
          <div className="mt-5 grid gap-4">
            <div>
              <label className="mb-2 block text-sm text-muted-foreground">Senha Atual</label>
              <Input type="password" placeholder="Digite sua senha atual" className="bg-input" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-muted-foreground">Nova Senha</label>
                <Input type="password" placeholder="Minimo 6 caracteres" className="bg-input" />
              </div>
              <div>
                <label className="mb-2 block text-sm text-muted-foreground">Confirmar Nova Senha</label>
                <Input type="password" placeholder="Digite a nova senha novamente" className="bg-input" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button className="bg-highlight text-background hover:bg-highlight/90">
                <Save className="mr-2 h-4 w-4" />
                Atualizar Senha
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

function ProfileField({ label, value, strong, badge }: { label: string; value: string; strong?: boolean; badge?: boolean }) {
  return (
    <div>
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      {badge ? (
        <span className="inline-flex rounded-md bg-input px-2 py-1 text-sm text-white">{value}</span>
      ) : (
        <span className={strong ? 'text-base font-semibold text-white' : 'text-sm text-white'}>{value}</span>
      )}
    </div>
  )
}
