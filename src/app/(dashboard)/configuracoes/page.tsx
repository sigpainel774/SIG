'use client'

import { useState, useEffect } from 'react'
import { 
  User, 
  ShieldCheck, 
  Settings, 
  Sun, 
  Moon, 
  Monitor,
  Lock, 
  Save, 
  ChevronDown, 
  Info, 
  Search, 
  X, 
  BookOpen, 
  GraduationCap, 
  KeyRound, 
  Pin, 
  School, 
  Users,
  CheckCircle2,
  Smartphone,
  PenTool,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { PermissoesView } from '@/components/PermissoesView'
import { useAuthStore } from '@/store/useAuthStore'
import { useSchoolStore } from '@/store/useSchoolStore'
import { SignaturePad } from '@/components/ui/SignaturePad'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'

const modulesList = [
  { label: 'Mural', icon: Pin, enabled: true },
  { label: 'Turmas', icon: BookOpen, enabled: true },
  { label: 'Funcionários', icon: Users, enabled: false },
  { label: 'Matrículas', icon: KeyRound, enabled: true },
  { label: 'Alunos', icon: GraduationCap, enabled: true },
  { label: 'Ocorrências', icon: ShieldCheck, enabled: true },
]



export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState<'perfil' | 'permissoes' | 'coletor-local' | 'assinatura-diretor' | 'assinatura-pessoal'>('perfil')
  const [showPassword, setShowPassword] = useState(false)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [modules, setModules] = useState(modulesList)
  const { funcionario, vinculos, isAdminGlobalOrRoot, escolaAtivaId } = useAuthStore()
  const { selectedEscola } = useSchoolStore()
  const isAdmin = isAdminGlobalOrRoot()
  const [localFuncionario, setLocalFuncionario] = useState<any>(null)

  // Estados para a Assinatura Global do Diretor
  const [assinaturaDiretorUrl, setAssinaturaDiretorUrl] = useState<string | null>(null)
  const [newDiretorSignature, setNewDiretorSignature] = useState<string | null>(null)
  const [loadingDiretorSig, setLoadingDiretorSig] = useState(false)

  // Estados para a Assinatura Pessoal do Funcionário
  const [assinaturaPessoalUrl, setAssinaturaPessoalUrl] = useState<string | null>(null)
  const [newPessoalSignature, setNewPessoalSignature] = useState<string | null>(null)
  const [loadingPessoalSig, setLoadingPessoalSig] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (funcionario) {
      setLocalFuncionario(funcionario)
    } else {
      const fetchLocal = async () => {
        const { createClient } = await import('@/lib/supabaseClient')
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user && user.email) {
          const { data } = await supabase
            .from('funcionarios')
            .select('*')
            .ilike('email', user.email)
            .maybeSingle()
          if (data) setLocalFuncionario(data)
        }
      }
      fetchLocal()
    }
  }, [funcionario])

  // Sincroniza assinatura pessoal do funcionario
  useEffect(() => {
    if (localFuncionario) {
      setAssinaturaPessoalUrl(localFuncionario.assinatura_url || null)
    }
  }, [localFuncionario])

  // Carrega assinatura do diretor se a escola ativa mudar ou se for carregada
  useEffect(() => {
    if (escolaAtivaId) {
      const fetchEscolaSig = async () => {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('escolas')
          .select('assinatura_diretor_url')
          .eq('id', escolaAtivaId)
          .maybeSingle()
        if (data) {
          setAssinaturaDiretorUrl(data.assinatura_diretor_url)
        }
      }
      fetchEscolaSig()
    }
  }, [escolaAtivaId])

  const handleSaveDiretorSignature = async () => {
    if (!escolaAtivaId || !newDiretorSignature) return
    setLoadingDiretorSig(true)
    const supabase = createClient()

    try {
      // 1. Converter base64 para blob
      const parts = newDiretorSignature.split(';base64,')
      const contentType = parts[0].split(':')[1]
      const raw = window.atob(parts[1])
      const rawLength = raw.length
      const uInt8Array = new Uint8Array(rawLength)
      for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i)
      }
      const blob = new Blob([uInt8Array], { type: contentType })

      // 2. Upload para storage
      const fileName = `escola_${escolaAtivaId}_diretor.png`
      const { error: uploadErr } = await supabase.storage
        .from('assinaturas_alunos')
        .upload(fileName, blob, { contentType: 'image/png', upsert: true })

      if (uploadErr) throw uploadErr

      // 3. Obter URL pública
      const { data: pData } = supabase.storage.from('assinaturas_alunos').getPublicUrl(fileName)
      const publicUrl = pData.publicUrl

      // 4. Salvar na tabela escolas
      const { error: dbErr } = await supabase
        .from('escolas')
        .update({ assinatura_diretor_url: publicUrl } as any)
        .eq('id', escolaAtivaId)

      if (dbErr) throw dbErr

      setAssinaturaDiretorUrl(publicUrl)
      setNewDiretorSignature(null)
      toast.success('Assinatura global do diretor salva com sucesso!')
    } catch (err: any) {
      toast.error(`Erro ao salvar assinatura do diretor: ${err.message}`)
    } finally {
      setLoadingDiretorSig(false)
    }
  }

  const handleSavePessoalSignature = async () => {
    if (!localFuncionario?.id || !newPessoalSignature) return
    setLoadingPessoalSig(true)
    const supabase = createClient()

    try {
      // 1. Converter base64 para blob
      const parts = newPessoalSignature.split(';base64,')
      const contentType = parts[0].split(':')[1]
      const raw = window.atob(parts[1])
      const rawLength = raw.length
      const uInt8Array = new Uint8Array(rawLength)
      for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i)
      }
      const blob = new Blob([uInt8Array], { type: contentType })

      // 2. Upload para storage
      const fileName = `funcionario_${localFuncionario.id}_assinatura.png`
      const { error: uploadErr } = await supabase.storage
        .from('assinaturas_alunos')
        .upload(fileName, blob, { contentType: 'image/png', upsert: true })

      if (uploadErr) throw uploadErr

      // 3. Obter URL pública
      const { data: pData } = supabase.storage.from('assinaturas_alunos').getPublicUrl(fileName)
      const publicUrl = pData.publicUrl

      // 4. Salvar na tabela funcionarios
      const { error: dbErr } = await supabase
        .from('funcionarios')
        .update({ assinatura_url: publicUrl } as any)
        .eq('id', localFuncionario.id)

      if (dbErr) throw dbErr

      setAssinaturaPessoalUrl(publicUrl)
      
      // Sincronizar em tempo real com o useAuthStore
      useAuthStore.setState({ 
        funcionario: { 
          ...funcionario!, 
          assinatura_url: publicUrl 
        } 
      })

      setNewPessoalSignature(null)
      toast.success('Sua assinatura pessoal foi salva com sucesso!')
    } catch (err: any) {
      toast.error(`Erro ao salvar assinatura pessoal: ${err.message}`)
    } finally {
      setLoadingPessoalSig(false)
    }
  }

  const isDiretor = selectedEscola?.diretor_id === localFuncionario?.id || 
                    vinculos.some(v => v.escola_id === escolaAtivaId && (v.cargo?.toUpperCase() === 'DIRETOR' || v.cargo?.toUpperCase().includes('DIRETOR')))

  const toggleModule = (index: number) => {
    setModules(prev => prev.map((m, i) => i === index ? { ...m, enabled: !m.enabled } : m))
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foregroundCustom flex items-center gap-3">
          <Settings className="h-8 w-8 text-[#185FA5] dark:text-[#3ea6ff]" />
          Configurações do Sistema
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie seu perfil pessoal, preferências de tema e permissões de acesso ao sistema.
        </p>
      </div>

      {/* Grid Quick Navigation Cards */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        <button
          onClick={() => setActiveTab('perfil')}
          className={cn(
            "flex items-center gap-4 p-5 rounded-xl border text-left transition-all cursor-pointer shadow-sm",
            activeTab === 'perfil'
              ? "bg-card border-highlight ring-1 ring-highlight/50"
              : "bg-card border-borderCustom hover:bg-hoverCustom"
          )}
        >
          <div className={cn(
            "p-3 rounded-xl",
            activeTab === 'perfil' ? "bg-highlight/10 text-highlight" : "bg-muted text-muted-foreground"
          )}>
            <User className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-foregroundCustom text-base">Meu Perfil & Aparência</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Ficha funcional, alterar senha e tema do sistema</p>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('coletor-local')}
          className={cn(
            "flex items-center gap-4 p-5 rounded-xl border text-left transition-all cursor-pointer shadow-sm",
            activeTab === 'coletor-local'
              ? "bg-card border-[#185FA5] dark:border-[#3ea6ff] ring-1 ring-[#185FA5]/50 dark:ring-[#3ea6ff]/50"
              : "bg-card border-borderCustom hover:bg-hoverCustom"
          )}
        >
          <div className={cn(
            "p-3 rounded-xl",
            activeTab === 'coletor-local' ? "bg-[#185FA5]/10 text-[#185FA5] dark:bg-[#3ea6ff]/10 dark:text-[#3ea6ff]" : "bg-muted text-muted-foreground"
          )}>
            <Smartphone className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-foregroundCustom text-base">Coleta Local</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Assinar ficha de aluno na tela por código de 4 dígitos</p>
          </div>
        </button>

        {(isDiretor || isAdmin) && (
          <button
            onClick={() => setActiveTab('assinatura-diretor')}
            className={cn(
              "flex items-center gap-4 p-5 rounded-xl border text-left transition-all cursor-pointer shadow-sm",
              activeTab === 'assinatura-diretor'
                ? "bg-card border-[#185FA5] dark:border-[#3ea6ff] ring-1 ring-[#185FA5]/50 dark:ring-[#3ea6ff]/50"
                : "bg-card border-borderCustom hover:bg-hoverCustom"
            )}
          >
            <div className={cn(
              "p-3 rounded-xl",
              activeTab === 'assinatura-diretor' ? "bg-[#185FA5]/10 text-[#185FA5] dark:bg-[#3ea6ff]/10 dark:text-[#3ea6ff]" : "bg-muted text-muted-foreground"
            )}>
              <PenTool className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-foregroundCustom text-base">Assinatura do Diretor</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Cadastrar assinatura oficial do gestor para os documentos</p>
            </div>
          </button>
        )}

        <button
          onClick={() => setActiveTab('assinatura-pessoal')}
          className={cn(
            "flex items-center gap-4 p-5 rounded-xl border text-left transition-all cursor-pointer shadow-sm",
            activeTab === 'assinatura-pessoal'
              ? "bg-card border-[#185FA5] dark:border-[#3ea6ff] ring-1 ring-[#185FA5]/50 dark:ring-[#3ea6ff]/50"
              : "bg-card border-borderCustom hover:bg-hoverCustom"
          )}
        >
          <div className={cn(
            "p-3 rounded-xl",
            activeTab === 'assinatura-pessoal' ? "bg-[#185FA5]/10 text-[#185FA5] dark:bg-[#3ea6ff]/10 dark:text-[#3ea6ff]" : "bg-muted text-muted-foreground"
          )}>
            <PenTool className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-foregroundCustom text-base">Minha Assinatura</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Cadastrar sua assinatura digital pessoal para assinar documentos</p>
          </div>
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveTab('permissoes')}
            className={cn(
              "flex items-center gap-4 p-5 rounded-xl border text-left transition-all cursor-pointer shadow-sm",
              activeTab === 'permissoes'
                ? "bg-card border-[#185FA5] dark:border-[#3ea6ff] ring-1 ring-[#185FA5]/50 dark:ring-[#3ea6ff]/50"
                : "bg-card border-borderCustom hover:bg-hoverCustom"
            )}
          >
            <div className={cn(
              "p-3 rounded-xl",
              activeTab === 'permissoes' ? "bg-[#185FA5]/10 text-[#185FA5] dark:bg-[#3ea6ff]/10 dark:text-[#3ea6ff]" : "bg-muted text-muted-foreground"
            )}>
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-foregroundCustom text-base">Permissões de Acesso</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Gestão de níveis, escolas e módulos por funcionário</p>
            </div>
          </button>
        )}
      </div>

      {/* Main Content Sections */}
      {activeTab === 'perfil' && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          {/* Card: Aparência e Tema */}
          <Card className="border-[0.5px] border-borderCustom bg-card p-5">
            <h2 className="mb-5 flex items-center gap-2 border-b border-borderCustom/50 pb-4 text-lg font-semibold text-foregroundCustom">
              <Sun className="h-5 w-5 text-[#185FA5] dark:text-[#3ea6ff]" />
              Personalização de Tema
            </h2>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-medium text-foregroundCustom">Tema do Sistema & Menu Lateral</h3>
                <p className="text-sm text-muted-foreground">
                  Escolha como deseja visualizar a interface e o menu lateral do painel.
                </p>
              </div>
              
              {mounted && (
                <div className="flex items-center space-x-2 rounded-lg border border-borderCustom bg-input p-1">
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={cn(
                      "flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer border border-transparent",
                      theme === 'light'
                        ? "bg-background text-[#185FA5] border-[#185FA5]/30 shadow-sm font-semibold dark:text-[#3ea6ff] dark:border-[#3ea6ff]/30"
                        : "text-muted-foreground hover:bg-hoverCustom hover:text-foregroundCustom"
                    )}
                  >
                    <Sun className="h-4 w-4 text-amber-500" />
                    <span>Claro</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={cn(
                      "flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer border border-transparent",
                      theme === 'dark'
                        ? "bg-background text-[#185FA5] border-[#185FA5]/30 shadow-sm font-semibold dark:text-[#3ea6ff] dark:border-[#3ea6ff]/30"
                        : "text-muted-foreground hover:bg-hoverCustom hover:text-foregroundCustom"
                    )}
                  >
                    <Moon className="h-4 w-4 text-blue-400" />
                    <span>Escuro</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTheme('system')}
                    className={cn(
                      "flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer border border-transparent",
                      theme === 'system'
                        ? "bg-background text-[#185FA5] border-[#185FA5]/30 shadow-sm font-semibold dark:text-[#3ea6ff] dark:border-[#3ea6ff]/30"
                        : "text-muted-foreground hover:bg-hoverCustom hover:text-foregroundCustom"
                    )}
                  >
                    <Monitor className="h-4 w-4" />
                    <span>Sistema</span>
                  </button>
                </div>
              )}
            </div>
          </Card>

          {/* Card: Dados da Ficha Funcional */}
          <Card className="border-[0.5px] border-borderCustom bg-card p-5">
            <h2 className="mb-5 flex items-center gap-2 border-b border-borderCustom/50 pb-4 text-lg font-semibold text-foregroundCustom">
              <User className="h-5 w-5 text-[#185FA5] dark:text-[#3ea6ff]" />
              Dados da Ficha Funcional
            </h2>
            <div className="flex flex-col gap-5 sm:flex-row">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-input text-foregroundCustom border border-borderCustom">
                <User className="h-10 w-10 text-muted-foreground" />
              </div>
              <div className="grid flex-1 gap-4 sm:grid-cols-2">
                <ProfileField label="Nome Completo" value={mounted ? (localFuncionario?.nome || "Usuário") : "Carregando..."} strong />
                <ProfileField label="E-mail" value={mounted ? (localFuncionario?.email || "-") : "Carregando..."} />
                <ProfileField label="Cargo" value={mounted ? (localFuncionario?.cargo || vinculos.find(v => v.ativo)?.cargo || "Servidor") : "Carregando..."} badge />
                <ProfileField label="Status" value={mounted ? (localFuncionario?.status || "Ativo") : "Carregando..."} isStatus />
              </div>
            </div>
          </Card>

          {/* Alert Recomendação de Segurança */}
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-blue-800 dark:text-blue-100 flex items-start gap-3">
            <Info className="h-5 w-5 shrink-0 mt-0.5 text-blue-500" />
            <div>
              <h3 className="font-semibold text-sm">Recomendações de Segurança</h3>
              <p className="text-xs leading-5 mt-1 text-muted-foreground">
                Se este é seu primeiro acesso usando uma senha padrão fornecida pela secretaria, crie uma senha forte e pessoal.
              </p>
            </div>
          </div>

          {/* Card: Alterar Senha */}
          <Card className="border-borderCustom bg-card p-6">
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className={cn(
                "flex w-full items-center justify-between gap-3 text-left text-lg font-semibold text-foregroundCustom cursor-pointer",
                showPassword ? 'border-b border-borderCustom pb-4' : ''
              )}
            >
              <span className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-highlight" />
                Alterar Senha de Acesso
              </span>
              <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform", showPassword ? 'rotate-180' : '')} />
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
                    <Input type="password" placeholder="Mínimo 6 caracteres" className="bg-input" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm text-muted-foreground">Confirmar Nova Senha</label>
                    <Input type="password" placeholder="Digite a nova senha novamente" className="bg-input" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button className="bg-highlight text-background hover:bg-highlight/90 font-medium">
                    <Save className="mr-2 h-4 w-4" />
                    Atualizar Senha
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'permissoes' && (
        <div className="animate-in fade-in-50 duration-200">
          <PermissoesView />
        </div>
      )}

      {activeTab === 'coletor-local' && (
        <div className="animate-in fade-in-50 duration-200">
          <ColetorLocalTab />
        </div>
      )}

      {activeTab === 'assinatura-diretor' && (isDiretor || isAdmin) && (
        <div className="animate-in fade-in-50 duration-200">
          <Card className="border-borderCustom bg-card p-6">
            <h2 className="mb-5 flex items-center gap-2 border-b border-borderCustom pb-4 text-lg font-semibold text-foregroundCustom">
              <PenTool className="h-5 w-5 text-highlight" />
              Assinatura Oficial do Diretor (Global)
            </h2>
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Esta assinatura será impressa automaticamente em todos os comprovantes, boletins e documentos oficiais desta escola.
              </p>
              <div className="max-w-md">
                <SignaturePad
                  label="Assinatura Digital"
                  value={newDiretorSignature || assinaturaDiretorUrl}
                  onChange={setNewDiretorSignature}
                  isEditMode={true}
                />
              </div>
              {newDiretorSignature && (
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setNewDiretorSignature(null)}
                    className="text-zinc-400 hover:text-white"
                    disabled={loadingDiretorSig}
                  >
                    Descartar
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveDiretorSignature}
                    disabled={loadingDiretorSig}
                    className="bg-highlight text-background hover:bg-highlight/90 font-bold"
                  >
                    {loadingDiretorSig ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Salvar Assinatura Oficial
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'assinatura-pessoal' && (
        <div className="animate-in fade-in-50 duration-200">
          <Card className="border-borderCustom bg-card p-6">
            <h2 className="mb-5 flex items-center gap-2 border-b border-borderCustom pb-4 text-lg font-semibold text-foregroundCustom">
              <PenTool className="h-5 w-5 text-highlight" />
              Minha Assinatura Digital Pessoal
            </h2>
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Cadastre sua assinatura digital pessoal. Ela será usada quando você assinar documentos do sistema (como fichas de alunos) utilizando o preenchimento automático.
              </p>
              <div className="max-w-md">
                <SignaturePad
                  label="Minha Assinatura"
                  value={newPessoalSignature || assinaturaPessoalUrl}
                  onChange={setNewPessoalSignature}
                  isEditMode={true}
                />
              </div>
              {newPessoalSignature && (
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setNewPessoalSignature(null)}
                    className="text-zinc-400 hover:text-white"
                    disabled={loadingPessoalSig}
                  >
                    Descartar
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSavePessoalSignature}
                    disabled={loadingPessoalSig}
                    className="bg-highlight text-background hover:bg-highlight/90 font-bold"
                  >
                    {loadingPessoalSig ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Salvar Assinatura
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

function ProfileField({ 
  label, 
  value, 
  strong, 
  badge,
  isStatus
}: { 
  label: string; 
  value: string; 
  strong?: boolean; 
  badge?: boolean;
  isStatus?: boolean;
}) {
  return (
    <div>
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      {badge || isStatus ? (
        <span className={cn(
          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border tracking-wide",
          isStatus
            ? (value.toLowerCase() === 'ativo'
                ? "bg-emerald-50 border-emerald-200/50 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800/50 dark:text-emerald-400"
                : "bg-zinc-50 border-zinc-200/50 text-zinc-700 dark:bg-zinc-800/40 dark:border-zinc-700/50 dark:text-zinc-400")
            : "bg-blue-50 border-blue-200/50 text-[#185FA5] dark:bg-blue-950/40 dark:border-blue-800/50 dark:text-blue-400"
        )}>
          {isStatus && (
            <span className={cn(
              "w-1.5 h-1.5 rounded-full mr-1.5",
              value.toLowerCase() === 'ativo' ? "bg-emerald-500" : "bg-zinc-500"
            )} />
          )}
          {value}
        </span>
      ) : (
        <span className={strong ? 'text-base font-semibold text-foregroundCustom' : 'text-sm text-foregroundCustom'}>
          {value}
        </span>
      )}
    </div>
  )
}

function ColetorLocalTab() {
  const { funcionario } = useAuthStore()
  const [token, setToken] = useState('')
  const [aluno, setAluno] = useState<any | null>(null)
  const [sigType, setSigType] = useState<'resp' | 'func' | null>(null)
  const [newSignature, setNewSignature] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || token.length !== 4) {
      toast.error('Por favor, insira um código de 4 dígitos.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      // 1. Busca por código de responsável
      let { data: alunoResp } = await supabase
        .from('alunos')
        .select('*')
        .eq('codigo_temp_resp', token)
        .is('deleted_at', null)
        .maybeSingle()

      if (alunoResp) {
        setAluno(alunoResp)
        setSigType('resp')
        setNewSignature(null)
        toast.success('Código do responsável validado!')
        return
      }

      // 2. Busca por código de funcionário
      let { data: alunoFunc } = await supabase
        .from('alunos')
        .select('*')
        .eq('codigo_temp_func', token)
        .is('deleted_at', null)
        .maybeSingle()

      if (alunoFunc) {
        setAluno(alunoFunc)
        setSigType('func')
        setNewSignature(null)
        toast.success('Código do funcionário validado!')
        return
      }

      toast.error('Código inválido, expirado ou já utilizado.')
      setAluno(null)
      setSigType(null)
    } catch (err: any) {
      toast.error(`Erro ao validar código: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSignature = async () => {
    if (!aluno || !sigType || !newSignature) return
    setLoading(true)
    const supabase = createClient()

    try {
      // 1. Converter base64 para blob
      const parts = newSignature.split(';base64,')
      const contentType = parts[0].split(':')[1]
      const raw = window.atob(parts[1])
      const rawLength = raw.length
      const uInt8Array = new Uint8Array(rawLength)
      for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i)
      }
      const blob = new Blob([uInt8Array], { type: contentType })

      // 2. Upload para storage
      const fileName = `aluno_${aluno.id}_${sigType === 'resp' ? 'responsavel' : 'funcionario'}.png`
      const { error: uploadError } = await supabase.storage
        .from('assinaturas_alunos')
        .upload(fileName, blob, {
          contentType: 'image/png',
          upsert: true
        })

      if (uploadError) throw uploadError

      const { data: publicData } = supabase.storage
        .from('assinaturas_alunos')
        .getPublicUrl(fileName)

      const publicUrl = publicData.publicUrl

      // 3. Atualizar dados_matricula e zerar token
      const dadosMatriculaAtualizados = {
        ...(aluno.dados_matricula || {}),
        [sigType === 'resp' ? 'assinatura_responsavel_url' : 'assinatura_funcionario_url']: publicUrl,
        [sigType === 'resp' ? 'assinatura_responsavel_at' : 'assinatura_funcionario_at']: new Date().toISOString()
      }

      const updatePayload: any = {
        dados_matricula: dadosMatriculaAtualizados,
        [sigType === 'resp' ? 'codigo_temp_resp' : 'codigo_temp_func']: null
      }

      const { error: updateError } = await supabase
        .from('alunos')
        .update(updatePayload)
        .eq('id', aluno.id)

      if (updateError) throw updateError

      toast.success('Assinatura colhida e salva com sucesso!')
      setToken('')
      setAluno(null)
      setSigType(null)
      setNewSignature(null)
    } catch (err: any) {
      toast.error(`Erro ao salvar assinatura: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-borderCustom bg-card p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foregroundCustom flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-highlight" />
          Coletor Local de Assinaturas
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Use esta ferramenta caso o responsável não possua celular e queira assinar diretamente na tela da secretaria usando o mouse ou touchpad.
        </p>
      </div>

      {!aluno ? (
        <form onSubmit={handleVerifyCode} className="space-y-4 max-w-sm">
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5 uppercase font-bold tracking-wider">
              Insira o Código de Assinatura (4 dígitos)
            </label>
            <Input
              type="text"
              pattern="[0-9]{4}"
              maxLength={4}
              placeholder="Ex: 1234"
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
              className="bg-input h-11 text-center font-mono text-xl tracking-widest text-white border-borderCustom"
              required
            />
          </div>
          <Button
            type="submit"
            disabled={loading || token.length !== 4}
            className="w-full bg-highlight text-background hover:bg-highlight/90 font-bold"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Validando...
              </>
            ) : (
              'Verificar Código'
            )}
          </Button>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="p-4 bg-background rounded-xl border border-borderCustom space-y-2">
            <h3 className="text-xs uppercase font-bold text-zinc-400 tracking-wider">Dados da Matrícula Localizada</h3>
            <div className="grid gap-2 sm:grid-cols-2 text-sm">
              <div>
                <span className="text-zinc-500 block text-xs">Aluno(a)</span>
                <span className="font-semibold text-white uppercase">{aluno.nome}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-xs">Tipo de Assinatura</span>
                <span className="font-bold text-[#3ea6ff] uppercase">
                  {sigType === 'resp' ? 'Pai/Mãe/Responsável' : 'Funcionário Responsável'}
                </span>
              </div>
            </div>
          </div>

          <div className="max-w-md space-y-4">
            <SignaturePad
              label={`Assine aqui (${sigType === 'resp' ? 'Responsável' : 'Funcionário'})`}
              value={newSignature}
              onChange={setNewSignature}
              isEditMode={true}
              globalSignatureUrl={sigType === 'func' ? funcionario?.assinatura_url : null}
            />

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setAluno(null)
                  setSigType(null)
                  setNewSignature(null)
                }}
                disabled={loading}
                className="text-rose-400 hover:text-rose-300"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSaveSignature}
                disabled={loading || !newSignature}
                className="bg-highlight text-background hover:bg-highlight/90 font-bold"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Assinatura na Ficha
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
