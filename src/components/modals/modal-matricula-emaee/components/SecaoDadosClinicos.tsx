'use client'

import React from 'react'
import { useMatriculaEmaeeContext } from '../context/MatriculaEmaeeContext'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

export function SecaoDadosClinicos() {
  const {
    turnoAtendimento, setTurnoAtendimento,
    localizacaoAtendimento, setLocalizacaoAtendimento,
    principalQueixa, setPrincipalQueixa,
    cidCodigo, setCidCodigo,
    observacoes, setObservacoes,
    deficiencias, toggleDeficiencia,
    especialidades, toggleEspecialidade,
    outraEspecialidade, setOutraEspecialidade
  } = useMatriculaEmaeeContext()

  return (
    <div className="space-y-6">
      {/* Dados do Atendimento EMAEE */}
      <div>
        <div className="text-[#3ea6ff] font-bold text-xs uppercase tracking-wider pb-1 mb-3 border-b border-[#2a2a2a]">
          3. Dados do Atendimento Especializado
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-gray-300">Turno da Matrícula para Atendimento</Label>
            <Select value={turnoAtendimento} onValueChange={(val) => setTurnoAtendimento(val || '')}>
              <SelectTrigger className="bg-[#121212] border-[#2a2a2a] text-white mt-1">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent className="bg-[#18181b] border-[#27272a] text-white">
                <SelectItem value="Matutino">Matutino</SelectItem>
                <SelectItem value="Vespertino">Vespertino</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-gray-300">Localização</Label>
            <Select value={localizacaoAtendimento} onValueChange={(val) => setLocalizacaoAtendimento(val || '')}>
              <SelectTrigger className="bg-[#121212] border-[#2a2a2a] text-white mt-1">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent className="bg-[#18181b] border-[#27272a] text-white">
                <SelectItem value="Urbana">Urbana</SelectItem>
                <SelectItem value="Rural">Rural</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Dados de Deficiência */}
      <div>
        <div className="text-[#3ea6ff] font-bold text-xs uppercase tracking-wider pb-1 mb-3 border-b border-[#2a2a2a]">
          4. Dados de Deficiência e Clínica
        </div>
        
        <div className="bg-[#121212] border border-[#2a2a2a] rounded-xl p-4 mb-4">
          <Label className="text-sm text-white font-bold mb-3 block">Tipo de Deficiência</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-zinc-300">
            {[
              { id: 'def_baixa_visao', label: 'Baixa visão' },
              { id: 'def_cegueira', label: 'Cegueira' },
              { id: 'def_auditiva', label: 'Deficiência Auditiva' },
              { id: 'def_fisica', label: 'Deficiência Física' },
              { id: 'def_intelectual', label: 'Deficiência Intelectual' },
              { id: 'def_surdez', label: 'Surdez' },
              { id: 'def_surdocegueira', label: 'Surdocegueira' },
              { id: 'def_multipla', label: 'Deficiência múltipla' }
            ].map((def) => (
              <label key={def.id} className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                <input 
                  type="checkbox" 
                  checked={(deficiencias as any)[def.id]}
                  onChange={() => toggleDeficiencia(def.id as keyof typeof deficiencias)}
                  className="rounded border-[#2a2a2a] bg-[#1a1a1a] text-[#3ea6ff] focus:ring-[#3ea6ff]/50"
                />
                {def.label}
              </label>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-[#2a2a2a]">
            <Label className="text-sm text-white font-bold mb-3 block">Transtornos</Label>
            <div className="flex flex-col gap-3 text-xs text-zinc-300">
              <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                <input 
                  type="checkbox" 
                  checked={deficiencias.transtorno_tea}
                  onChange={() => toggleDeficiencia('transtorno_tea')}
                  className="rounded border-[#2a2a2a] bg-[#1a1a1a] text-[#3ea6ff] focus:ring-[#3ea6ff]/50"
                />
                Transtorno do espectro autista
              </label>
              
              <div className="flex items-center gap-2 w-full mt-1">
                <label className="flex items-center gap-2 cursor-pointer hover:text-white shrink-0">
                  <input 
                    type="checkbox" 
                    checked={deficiencias.transtorno_outros}
                    onChange={() => toggleDeficiencia('transtorno_outros')}
                    className="rounded border-[#2a2a2a] bg-[#1a1a1a] text-[#3ea6ff] focus:ring-[#3ea6ff]/50"
                  />
                  Outros transtornos:
                </label>
                <Input 
                  disabled={!deficiencias.transtorno_outros}
                  placeholder="Especifique..."
                  className="h-7 text-xs bg-[#1a1a1a] border-[#2a2a2a] text-white flex-1"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-gray-300">Principal Queixa</Label>
            <Input 
              value={principalQueixa}
              onChange={(e) => setPrincipalQueixa(e.target.value)}
              placeholder="Descreva a queixa inicial"
              className="bg-[#121212] border-[#2a2a2a] text-white mt-1"
            />
          </div>
          <div>
            <Label className="text-xs text-gray-300">CID (Opcional)</Label>
            <Input 
              value={cidCodigo}
              onChange={(e) => setCidCodigo(e.target.value)}
              placeholder="Ex: F84.0"
              className="bg-[#121212] border-[#2a2a2a] text-white mt-1"
            />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs text-gray-300">Observações sobre aluno para requerer o atendimento</Label>
            <Textarea 
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Informações adicionais relevantes..."
              className="bg-[#121212] border-[#2a2a2a] text-white mt-1 resize-none"
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* Profissionais AEE */}
      <div>
        <div className="text-[#3ea6ff] font-bold text-xs uppercase tracking-wider pb-1 mb-3 border-b border-[#2a2a2a]">
          5. Profissionais AEE Solicitados
        </div>
        <div className="bg-[#121212] border border-[#2a2a2a] p-4 rounded-xl space-y-4">
          {profissionaisAEE.length === 0 ? (
            <p className="text-xs text-gray-400">Nenhum profissional especializado vinculado a esta unidade.</p>
          ) : (
            profissionaisAEE.map(prof => {
              const isSelected = profissionaisSelecionados.some(p => p.profissional_id === prof.id)
              const freq = profissionaisSelecionados.find(p => p.profissional_id === prof.id)?.frequencia || 'SEMANAL'
              return (
                <div key={prof.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
                  <label className="flex items-center gap-3 cursor-pointer flex-1">
                    <input 
                      type="checkbox" 
                      checked={isSelected}
                      onChange={() => toggleProfissional(prof.id, prof.cargo)}
                      className="rounded border-[#333] bg-[#222] text-[#3ea6ff] focus:ring-[#3ea6ff]/50 w-4 h-4"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm text-white font-medium">{prof.nome}</span>
                      <span className="text-xs text-gray-400">{prof.cargo || 'Especialista'}</span>
                    </div>
                  </label>
                  
                  {isSelected && (
                    <div className="w-full sm:w-40 mt-2 sm:mt-0">
                      <Select value={freq} onValueChange={(val) => updateFrequenciaProfissional(prof.id, val)}>
                        <SelectTrigger className="h-8 text-xs bg-[#222] border-[#333] text-white">
                          <SelectValue placeholder="Frequência" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#18181b] border-[#27272a] text-white">
                          <SelectItem value="SEMANAL">Semanal</SelectItem>
                          <SelectItem value="QUINZENAL">Quinzenal</SelectItem>
                          <SelectItem value="MENSAL">Mensal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
