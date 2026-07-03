'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  ShieldCheck, 
  Building2, 
  Users, 
  KeyRound, 
  Briefcase, 
  Activity, 
  Trash2, 
  MonitorSmartphone, 
  Database, 
  UserCheck, 
  ScanLine, 
  Bus 
} from 'lucide-react'

export default function AdminHubPage() {
  const router = useRouter()

  const adminModules = [
    { title: 'Escolas', icon: Building2, path: '/admin/escolas', desc: 'Gestão da rede e unidades' },
    { title: 'Acessos & Permissões', icon: KeyRound, path: '/admin/acessos', desc: 'Níveis de sistema e bloqueios' },
    { title: 'Cargos Base', icon: Briefcase, path: '/admin/cargos', desc: 'Tabela salarial e funções' },
    { title: 'Controle de Rondas', icon: ScanLine, path: '/admin/rondas', desc: 'Pontos de GPS e trajetos' },
    { title: 'Transporte Escolar', icon: Bus, path: '/admin/transporte', desc: 'Frotas, motoristas e rotas' },
    { title: 'Logs & Auditoria', icon: Activity, path: '/admin/logs', desc: 'Rastreabilidade de ações' },
    { title: 'Solicitações (TI)', icon: UserCheck, path: '/admin/solicitacoes', desc: 'Chamados e suporte' },
    { title: 'Dispositivos', icon: MonitorSmartphone, path: '/admin/dispositivos', desc: 'Sessões ativas e Mobile' },
    { title: 'Banco de Dados', icon: Database, path: '/admin/banco', desc: 'Dumps, backups e saúde' },
    { title: 'Lixeira Global', icon: Trash2, path: '/admin/lixeira', desc: 'Registros apagados e restauro' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#3f3f46]">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-purple-500" /> 
            Super Painel Administrativo
            <span className="bg-purple-500/20 text-purple-400 border border-purple-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full ml-2">ROOT</span>
          </h2>
          <p className="text-[#aaa] text-sm mt-1">Visão global, parametrizações e controle de infraestrutura.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {adminModules.map((mod, i) => (
          <Card 
            key={i} 
            className="bg-[#121212] border-[#3f3f46] hover:bg-[#18181b] hover:border-purple-500/50 cursor-pointer transition-all duration-200"
            onClick={() => router.push(mod.path)}
          >
            <CardHeader className="p-4 pb-2">
              <div className="w-10 h-10 rounded-lg bg-[#1f1f23] border border-[#2f2f33] flex items-center justify-center mb-2">
                <mod.icon className="w-5 h-5 text-purple-400" />
              </div>
              <CardTitle className="text-white text-base">{mod.title}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-[#aaa] text-sm leading-snug">
              {mod.desc}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
