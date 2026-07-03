'use client'

import { useState } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UserPlus, Save, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabaseClient'

interface ModalFuncionarioProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
  onSuccess?: () => void
}

export function ModalFuncionario({ open, onOpenChange, trigger, onSuccess }: ModalFuncionarioProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const activeOpen = open !== undefined ? open : isOpen
  const handleOpenChange = (val: boolean) => {
    if (onOpenChange) onOpenChange(val)
    setIsOpen(val)
  }

  // Form states
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [cpf, setCpf] = useState('')
  const [telefone, setTelefone] = useState('')
  const [nascimento, setNascimento] = useState('')
  const [cargo, setCargo] = useState('Professor')
  const [status, setStatus] = useState('ativo')
  const [formacao, setFormacao] = useState('')
  const [endereco, setEndereco] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome || !email) {
      toast.error('Preencha os campos obrigatórios: Nome e E-mail.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      const payload: any = {
        nome,
        email,
        cargo,
        is_superadmin: false
      }

      const { error } = await supabase.from('funcionarios').insert(payload)
      if (error) throw error

      toast.success('Funcionário cadastrado com sucesso!')
      handleOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (err: any) {
      toast.error(`Erro ao cadastrar funcionário: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={activeOpen} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger render={trigger as any} />}
      <DialogContent className="sm:max-w-2xl bg-[#121212] border-borderCustom text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
            <UserPlus className="w-5 h-5 text-highlight" />
            Cadastro de Funcionário / Servidor
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-2">
          {/* Dados Pessoais */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-highlight uppercase tracking-wider">Dados Pessoais</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nome Completo *</Label>
                <Input 
                  value={nome} 
                  onChange={(e) => setNome(e.target.value)} 
                  placeholder="Ex: Maria Silva" 
                  className="bg-[#181818] border-borderCustom text-white mt-1" 
                  required
                />
              </div>
              <div>
                <Label>CPF</Label>
                <Input 
                  value={cpf} 
                  onChange={(e) => setCpf(e.target.value)} 
                  placeholder="000.000.000-00" 
                  className="bg-[#181818] border-borderCustom text-white mt-1" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>E-mail de Login *</Label>
                <Input 
                  type="email"
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="maria@escola.com" 
                  className="bg-[#181818] border-borderCustom text-white mt-1" 
                  required
                />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input 
                  value={telefone} 
                  onChange={(e) => setTelefone(e.target.value)} 
                  placeholder="(75) 99999-9999" 
                  className="bg-[#181818] border-borderCustom text-white mt-1" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Data de Nascimento</Label>
                <Input 
                  type="date" 
                  value={nascimento} 
                  onChange={(e) => setNascimento(e.target.value)} 
                  className="bg-[#181818] border-borderCustom text-white mt-1" 
                />
              </div>
              <div>
                <Label>Cargo / Função</Label>
                <Select value={cargo} onValueChange={(val) => val && setCargo(val)}>
                  <SelectTrigger className="bg-[#181818] border-borderCustom text-white mt-1">
                    <SelectValue placeholder="Selecione o cargo" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#181818] border-borderCustom text-white">
                    <SelectItem value="Professor">Professor</SelectItem>
                    <SelectItem value="Coordenador">Coordenador Pedagógico</SelectItem>
                    <SelectItem value="Diretor">Diretor Escolar</SelectItem>
                    <SelectItem value="Monitor">Monitor</SelectItem>
                    <SelectItem value="Agente de Portaria">Agente de Portaria</SelectItem>
                    <SelectItem value="Merendeira">Merendeira</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status Funcional</Label>
                <Select value={status} onValueChange={(val) => val && setStatus(val)}>
                  <SelectTrigger className="bg-[#181818] border-borderCustom text-white mt-1">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#181818] border-borderCustom text-white">
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="afastado">Afastado</SelectItem>
                    <SelectItem value="desligado">Desligado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Formação e Endereço */}
          <div className="space-y-4 pt-2 border-t border-borderCustom">
            <h3 className="text-xs font-bold text-highlight uppercase tracking-wider">Formação e Endereço</h3>
            <div>
              <Label>Formação Acadêmica</Label>
              <Input 
                value={formacao} 
                onChange={(e) => setFormacao(e.target.value)} 
                placeholder="Ex: Licenciatura em Pedagogia" 
                className="bg-[#181818] border-borderCustom text-white mt-1" 
              />
            </div>
            <div>
              <Label>Endereço Completo</Label>
              <Input 
                value={endereco} 
                onChange={(e) => setEndereco(e.target.value)} 
                placeholder="Rua, Número, Bairro, Cidade" 
                className="bg-[#181818] border-borderCustom text-white mt-1" 
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-4 border-t border-borderCustom">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => handleOpenChange(false)}
              className="bg-[#1a1a1a] border-borderCustom text-white hover:bg-hoverCustom"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-highlight text-background hover:bg-highlight/90 font-bold gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Salvando...' : 'Cadastrar Funcionário'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
