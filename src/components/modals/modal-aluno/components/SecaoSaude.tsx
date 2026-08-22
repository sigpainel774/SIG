'use client'

import React from 'react'
import { useAlunoForm } from '../context/AlunoFormContext'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { HeartPulse, Bus, ShieldAlert, Activity } from 'lucide-react'

export function SecaoSaude() {
  const {
    transporte, setTransporte,
    rotaTransporte, setRotaTransporte,
    situacaoVacinal, setSituacaoVacinal,
    restricoesSaude, setRestricoesSaude,
    diabete, setDiabete,
    convulsoes, setConvulsoes,
    asma, setAsma,
    infeccoes, setInfeccoes,
    restricaoExercicio, setRestricaoExercicio,
    covid, setCovid,
    covidQuando, setCovidQuando,
    situacaoVacinalCovid, setSituacaoVacinalCovid,
    alergiaMed, setAlergiaMed,
    alergiaMedQuais, setAlergiaMedQuais,
    motivoNaoVacinacaoGeral, setMotivoNaoVacinacaoGeral,
    motivoNaoVacinacaoCovid, setMotivoNaoVacinacaoCovid,
    restricaoAlimentar, setRestricaoAlimentar,
    restricaoAlimentarQuais, setRestricaoAlimentarQuais,
    nee, setNee,
    neeSelecionadas, setNeeSelecionadas,
    deficiencia, setDeficiencia,
    deficienciasSelecionadas, setDeficienciasSelecionadas,
    toggleArrayItem
  } = useAlunoForm()

  const OPCOES_NEE = [
    'Desenvolvimento de funções cognitivas',
    'Desenvolvimento de vida autônoma',
    'Enriquecimento curricular',
    'Ensino de informática acessível',
    'Ensino do Sistema Braille',
    'Língua Portuguesa como Segunda Língua',
    'Técnicas de cálculo no Soroban',
    'Orientação e mobilidade',
    'Comunicação Alternativa e Aumentativa',
    'Transtorno do Espectro Autista',
    'Altas habilidades/Superdotação'
  ]

  const OPCOES_DEFICIENCIA = [
    'Baixa visão',
    'Surdez',
    'Deficiência Intelectual',
    'Cegueira',
    'Surdocegueira',
    'Deficiência múltipla',
    'Deficiência auditiva',
    'Deficiência Física'
  ]

  return (
    <div className="space-y-6 py-2">
      {/* 1. Transporte Escolar e Vacinação */}
      <div className="p-4 rounded-xl bg-background border border-borderCustom space-y-4">
        <div className="flex items-center gap-2 pb-2.5 border-b border-borderCustom text-highlight font-bold text-xs uppercase tracking-wider">
          <Bus className="w-4 h-4 text-highlight" />
          Transporte Escolar & Imunização
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-[#181818] p-3.5 rounded-xl border border-borderCustom">
          <div className="flex items-center gap-3">
            <input 
              type="checkbox" 
              id="chkTransporte" 
              checked={transporte} 
              onChange={(e) => setTransporte(e.target.checked)}
              className="w-4 h-4 accent-[#3ea6ff] rounded border-borderCustom cursor-pointer"
            />
            <label htmlFor="chkTransporte" className="text-xs font-semibold text-foreground cursor-pointer">
              Utiliza Transporte Escolar Público?
            </label>
          </div>

          {transporte && (
            <div>
              <Label className="text-xs text-muted-foreground font-medium">Linha / Rota do Transporte</Label>
              <Input 
                value={rotaTransporte} 
                onChange={(e) => setRotaTransporte(e.target.value)} 
                placeholder="Ex: Rota 02 - Zona Rural" 
                className="mt-1 h-8 bg-[#141416] border-borderCustom text-xs" 
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground font-medium">Situação Vacinal Geral</Label>
            <Select value={situacaoVacinal} onValueChange={(val) => setSituacaoVacinal(val || 'Em dia')}>
              <SelectTrigger className="h-8 bg-[#181818] border-borderCustom text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#181818] border-borderCustom text-foreground text-xs">
                <SelectItem value="Em dia">Em dia</SelectItem>
                <SelectItem value="Atrasada">Atrasada</SelectItem>
                <SelectItem value="Não Vacinado">Não Vacinado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {situacaoVacinal !== 'Em dia' && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground font-medium">Motivo de não vacinação / atraso</Label>
              <Input 
                value={motivoNaoVacinacaoGeral} 
                onChange={(e) => setMotivoNaoVacinacaoGeral(e.target.value)} 
                placeholder="Opção da família / Recomendação médica" 
                className="h-8 bg-[#181818] border-borderCustom text-xs" 
              />
            </div>
          )}
        </div>
      </div>

      {/* 2. Ficha de Saúde e Anamnese */}
      <div className="p-4 rounded-xl bg-background border border-borderCustom space-y-4">
        <div className="flex items-center gap-2 pb-2.5 border-b border-borderCustom text-highlight font-bold text-xs uppercase tracking-wider">
          <HeartPulse className="w-4 h-4 text-highlight" />
          Ficha de Saúde & Anamnese Clínica
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground font-medium">Diabetes</Label>
            <Select value={diabete} onValueChange={(val) => setDiabete(val || 'Não')}>
              <SelectTrigger className="h-8 bg-[#181818] border-borderCustom text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#181818] border-borderCustom text-foreground text-xs">
                <SelectItem value="Não">Não</SelectItem>
                <SelectItem value="Sim">Sim</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground font-medium">Convulsões / Epilepsia</Label>
            <Select value={convulsoes} onValueChange={(val) => setConvulsoes(val || 'Não')}>
              <SelectTrigger className="h-8 bg-[#181818] border-borderCustom text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#181818] border-borderCustom text-foreground text-xs">
                <SelectItem value="Não">Não</SelectItem>
                <SelectItem value="Sim">Sim</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground font-medium">Asma / Bronquite</Label>
            <Select value={asma} onValueChange={(val) => setAsma(val || 'Não')}>
              <SelectTrigger className="h-8 bg-[#181818] border-borderCustom text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#181818] border-borderCustom text-foreground text-xs">
                <SelectItem value="Não">Não</SelectItem>
                <SelectItem value="Sim">Sim</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground font-medium">Infecções Recorrentes</Label>
            <Select value={infeccoes} onValueChange={(val) => setInfeccoes(val || 'Não')}>
              <SelectTrigger className="h-8 bg-[#181818] border-borderCustom text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#181818] border-borderCustom text-foreground text-xs">
                <SelectItem value="Não">Não</SelectItem>
                <SelectItem value="Sim">Sim</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground font-medium">Restrição para Exercícios Físicos</Label>
            <Select value={restricaoExercicio} onValueChange={(val) => setRestricaoExercicio(val || 'Não')}>
              <SelectTrigger className="h-8 bg-[#181818] border-borderCustom text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#181818] border-borderCustom text-foreground text-xs">
                <SelectItem value="Não">Não</SelectItem>
                <SelectItem value="Sim">Sim</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground font-medium">Teve COVID-19?</Label>
            <Select value={covid} onValueChange={(val) => setCovid(val || 'Não')}>
              <SelectTrigger className="h-8 bg-[#181818] border-borderCustom text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#181818] border-borderCustom text-foreground text-xs">
                <SelectItem value="Não">Não</SelectItem>
                <SelectItem value="Sim">Sim</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {covid === 'Sim' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-[#181818] rounded-xl border border-borderCustom">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground font-medium">Quando teve COVID-19?</Label>
              <Input 
                value={covidQuando} 
                onChange={(e) => setCovidQuando(e.target.value)} 
                placeholder="Ex: Ano de 2021" 
                className="h-8 bg-[#141416] border-borderCustom text-xs" 
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground font-medium">Situação Vacinal COVID-19</Label>
              <Input 
                value={situacaoVacinalCovid} 
                onChange={(e) => setSituacaoVacinalCovid(e.target.value)} 
                placeholder="Ex: 2 doses tomadas" 
                className="h-8 bg-[#141416] border-borderCustom text-xs" 
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 bg-[#181818] rounded-xl border border-borderCustom space-y-2">
            <Label className="text-xs font-semibold text-foreground">Alergia a Medicamentos?</Label>
            <Select value={alergiaMed} onValueChange={(val) => setAlergiaMed(val || 'Não')}>
              <SelectTrigger className="h-8 bg-[#141416] border-borderCustom text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#181818] border-borderCustom text-foreground text-xs">
                <SelectItem value="Não">Não</SelectItem>
                <SelectItem value="Sim">Sim</SelectItem>
              </SelectContent>
            </Select>
            {alergiaMed === 'Sim' && (
              <Input 
                value={alergiaMedQuais} 
                onChange={(e) => setAlergiaMedQuais(e.target.value)} 
                placeholder="Quais medicamentos?" 
                className="h-8 bg-[#141416] border-borderCustom text-xs mt-2" 
              />
            )}
          </div>

          <div className="p-3 bg-[#181818] rounded-xl border border-borderCustom space-y-2">
            <Label className="text-xs font-semibold text-foreground">Restrição Alimentar / Intolerância?</Label>
            <Select value={restricaoAlimentar} onValueChange={(val) => setRestricaoAlimentar(val || 'Não')}>
              <SelectTrigger className="h-8 bg-[#141416] border-borderCustom text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#181818] border-borderCustom text-foreground text-xs">
                <SelectItem value="Não">Não</SelectItem>
                <SelectItem value="Sim">Sim</SelectItem>
              </SelectContent>
            </Select>
            {restricaoAlimentar === 'Sim' && (
              <Input 
                value={restricaoAlimentarQuais} 
                onChange={(e) => setRestricaoAlimentarQuais(e.target.value)} 
                placeholder="Quais alimentos / intolerâncias?" 
                className="h-8 bg-[#141416] border-borderCustom text-xs mt-2" 
              />
            )}
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground font-medium">Outras Restrições ou Observações de Saúde</Label>
          <Input 
            value={restricoesSaude} 
            onChange={(e) => setRestricoesSaude(e.target.value)} 
            placeholder="Ex: Utiliza medicação contínua, prótese, etc." 
            className="h-8 bg-[#181818] border-borderCustom text-xs" 
          />
        </div>
      </div>

      {/* 3. Necessidades Educacionais Especiais (NEE) */}
      <div className="p-4 rounded-xl bg-background border border-borderCustom space-y-3">
        <div className="flex items-center gap-2 pb-2.5 border-b border-borderCustom text-highlight font-bold text-xs uppercase tracking-wider">
          <ShieldAlert className="w-4 h-4 text-highlight" />
          Necessidades Educacionais Especiais (NEE)
        </div>

        <div className="w-64 space-y-1">
          <Label className="text-xs text-muted-foreground font-medium">Possui NEE?</Label>
          <Select value={nee} onValueChange={(val) => setNee(val || 'Não')}>
            <SelectTrigger className="h-8 bg-[#181818] border-borderCustom text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#181818] border-borderCustom text-foreground text-xs">
              <SelectItem value="Não">Não</SelectItem>
              <SelectItem value="Sim">Sim, indicar quais</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {nee !== 'Não' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-3 bg-[#181818] rounded-xl border border-borderCustom">
            {OPCOES_NEE.map((opcao) => (
              <label 
                key={opcao}
                className="flex items-center gap-2 p-2 bg-[#141416] border border-borderCustom rounded-lg text-xs cursor-pointer hover:border-highlight transition-colors text-zinc-300"
              >
                <input 
                  type="checkbox" 
                  checked={neeSelecionadas.includes(opcao)}
                  onChange={() => toggleArrayItem(neeSelecionadas, opcao, setNeeSelecionadas)}
                  className="accent-[#3ea6ff]"
                />
                <span className="truncate">{opcao}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* 4. Deficiências */}
      <div className="p-4 rounded-xl bg-background border border-borderCustom space-y-3">
        <div className="flex items-center gap-2 pb-2.5 border-b border-borderCustom text-highlight font-bold text-xs uppercase tracking-wider">
          <Activity className="w-4 h-4 text-highlight" />
          Deficiências Físicas, Sensoriais ou Intelectuais
        </div>

        <div className="w-64 space-y-1">
          <Label className="text-xs text-muted-foreground font-medium">Possui Deficiência Diagnosticada?</Label>
          <Select value={deficiencia} onValueChange={(val) => setDeficiencia(val || 'Não')}>
            <SelectTrigger className="h-8 bg-[#181818] border-borderCustom text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#181818] border-borderCustom text-foreground text-xs">
              <SelectItem value="Não">Não</SelectItem>
              <SelectItem value="Sim">Sim, indicar quais</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {deficiencia !== 'Não' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 p-3 bg-[#181818] rounded-xl border border-borderCustom">
            {OPCOES_DEFICIENCIA.map((opcao) => (
              <label 
                key={opcao}
                className="flex items-center gap-2 p-2 bg-[#141416] border border-borderCustom rounded-lg text-xs cursor-pointer hover:border-highlight transition-colors text-zinc-300"
              >
                <input 
                  type="checkbox" 
                  checked={deficienciasSelecionadas.includes(opcao)}
                  onChange={() => toggleArrayItem(deficienciasSelecionadas, opcao, setDeficienciasSelecionadas)}
                  className="accent-[#3ea6ff]"
                />
                <span className="truncate">{opcao}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
