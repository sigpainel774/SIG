'use client'

import React from 'react'
import { useAlunoForm } from '../context/AlunoFormContext'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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
    <div className="space-y-6">
      {/* 6. Transporte Escolar */}
      <div>
        <div className="text-[#3ea6ff] font-bold text-xs uppercase tracking-wider pb-1 mb-3 border-b border-[#2a2a2a]">
          6. Transporte Escolar
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center bg-[#121212] p-3 rounded-xl border border-[#2a2a2a]">
          <div className="flex items-center gap-3">
            <input 
              type="checkbox" 
              id="chkTransporte" 
              checked={transporte} 
              onChange={(e) => setTransporte(e.target.checked)}
              className="w-4 h-4 accent-[#3ea6ff] rounded bg-[#181818] border-[#2a2a2a]"
            />
            <label htmlFor="chkTransporte" className="text-sm font-semibold text-white cursor-pointer">
              Utiliza Transporte Público?
            </label>
          </div>

          {transporte && (
            <div>
              <Label className="text-xs text-gray-300">Qual a Rota do Transporte?</Label>
              <Input 
                value={rotaTransporte} 
                onChange={(e) => setRotaTransporte(e.target.value)} 
                placeholder="Ex: Rota 02 - Zona Rural" 
                className="bg-[#181818] border-[#2a2a2a] text-white mt-1" 
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 items-start">
          <div>
            <Label className="text-xs text-gray-300">Situação Vacinal Geral</Label>
            <Select value={situacaoVacinal} onValueChange={(val) => setSituacaoVacinal(val || 'Em dia')}>
              <SelectTrigger className="bg-[#121212] border-[#2a2a2a] text-white mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#181818] border-[#2a2a2a] text-white">
                <SelectItem value="Em dia">Em dia</SelectItem>
                <SelectItem value="Atrasada">Atrasada</SelectItem>
                <SelectItem value="Não Vacinado">Não Vacinado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {situacaoVacinal !== 'Em dia' && (
            <div>
              <Label className="text-xs text-gray-300">Motivo de não vacinação / atraso</Label>
              <Input 
                value={motivoNaoVacinacaoGeral} 
                onChange={(e) => setMotivoNaoVacinacaoGeral(e.target.value)} 
                placeholder="Opção da família / Recomendação" 
                className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
              />
            </div>
          )}
        </div>

        <div className="mt-3">
          <Label className="text-xs text-gray-300">Outras observações de saúde</Label>
          <Input 
            value={restricoesSaude} 
            onChange={(e) => setRestricoesSaude(e.target.value)} 
            placeholder="Alergias, cuidados especiais, etc." 
            className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
          />
        </div>
      </div>

      {/* 9. Ficha de Saúde / Anamnese */}
      <div>
        <div className="text-[#3ea6ff] font-bold text-xs uppercase tracking-wider pb-1 mb-3 border-b border-[#2a2a2a]">
          9. Ficha de Saúde / Anamnese
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs text-gray-300">Diabete?</Label>
              <Select value={diabete} onValueChange={(val) => setDiabete(val || 'Não')}>
                <SelectTrigger className="bg-[#121212] border-[#2a2a2a] text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#181818] border-[#2a2a2a] text-white">
                  <SelectItem value="Não">Não</SelectItem>
                  <SelectItem value="Sim">Sim</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-300">Convulsões?</Label>
              <Select value={convulsoes} onValueChange={(val) => setConvulsoes(val || 'Não')}>
                <SelectTrigger className="bg-[#121212] border-[#2a2a2a] text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#181818] border-[#2a2a2a] text-white">
                  <SelectItem value="Não">Não</SelectItem>
                  <SelectItem value="Sim">Sim</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-300">Asma Brônquica?</Label>
              <Select value={asma} onValueChange={(val) => setAsma(val || 'Não')}>
                <SelectTrigger className="bg-[#121212] border-[#2a2a2a] text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#181818] border-[#2a2a2a] text-white">
                  <SelectItem value="Não">Não</SelectItem>
                  <SelectItem value="Sim">Sim</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-300">Infecções freq.?</Label>
              <Select value={infeccoes} onValueChange={(val) => setInfeccoes(val || 'Não')}>
                <SelectTrigger className="bg-[#121212] border-[#2a2a2a] text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#181818] border-[#2a2a2a] text-white">
                  <SelectItem value="Não">Não</SelectItem>
                  <SelectItem value="Sim">Sim</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-gray-300">Restrição a Exercício?</Label>
              <Select value={restricaoExercicio} onValueChange={(val) => setRestricaoExercicio(val || 'Não')}>
                <SelectTrigger className="bg-[#121212] border-[#2a2a2a] text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#181818] border-[#2a2a2a] text-white">
                  <SelectItem value="Não">Não</SelectItem>
                  <SelectItem value="Sim">Sim</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-gray-300">Teve COVID-19?</Label>
              <Select value={covid} onValueChange={(val) => setCovid(val || 'Não')}>
                <SelectTrigger className="bg-[#121212] border-[#2a2a2a] text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#181818] border-[#2a2a2a] text-white">
                  <SelectItem value="Não">Não</SelectItem>
                  <SelectItem value="Sim">Sim</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {covid === 'Sim' && (
              <div>
                <Label className="text-xs text-gray-300">Quando teve COVID-19?</Label>
                <Input 
                  value={covidQuando} 
                  onChange={(e) => setCovidQuando(e.target.value)} 
                  placeholder="Ex: Em 2021" 
                  className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-gray-300">Situação Vacinal COVID-19</Label>
              <Select value={situacaoVacinalCovid} onValueChange={(val) => setSituacaoVacinalCovid(val || '')}>
                <SelectTrigger className="bg-[#121212] border-[#2a2a2a] text-white mt-1">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-[#181818] border-[#2a2a2a] text-white">
                  <SelectItem value="D1">D1 (1ª Dose)</SelectItem>
                  <SelectItem value="D2">D2 (2ª Dose)</SelectItem>
                  <SelectItem value="Reforço">Reforço</SelectItem>
                  <SelectItem value="Não foi vacinado">Não foi vacinado</SelectItem>
                  <SelectItem value="Não informado">Não informado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {situacaoVacinalCovid === 'Não foi vacinado' && (
              <div>
                <Label className="text-xs text-gray-300">Motivo de não vacinação</Label>
                <Input 
                  value={motivoNaoVacinacaoCovid} 
                  onChange={(e) => setMotivoNaoVacinacaoCovid(e.target.value)} 
                  placeholder="Opção da família / Recomendação" 
                  className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-gray-300">Alergia a Matérias / Medicamentos?</Label>
              <Select value={alergiaMed} onValueChange={(val) => setAlergiaMed(val || 'Não')}>
                <SelectTrigger className="bg-[#121212] border-[#2a2a2a] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#181818] border-[#2a2a2a] text-white">
                  <SelectItem value="Não">Não</SelectItem>
                  <SelectItem value="Sim">Sim</SelectItem>
                </SelectContent>
              </Select>
              {alergiaMed === 'Sim' && (
                <Input 
                  value={alergiaMedQuais} 
                  onChange={(e) => setAlergiaMedQuais(e.target.value)} 
                  placeholder="Quais alergias?" 
                  className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
                />
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-gray-300">Restrições Alimentares?</Label>
              <Select value={restricaoAlimentar} onValueChange={(val) => setRestricaoAlimentar(val || 'Não')}>
                <SelectTrigger className="bg-[#121212] border-[#2a2a2a] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#181818] border-[#2a2a2a] text-white">
                  <SelectItem value="Não">Não</SelectItem>
                  <SelectItem value="Sim">Sim</SelectItem>
                </SelectContent>
              </Select>
              {restricaoAlimentar === 'Sim' && (
                <Input 
                  value={restricaoAlimentarQuais} 
                  onChange={(e) => setRestricaoAlimentarQuais(e.target.value)} 
                  placeholder="Quais restrições alimentares?" 
                  className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 10. Necessidade Educativa Especial (NEE) */}
      <div>
        <div className="text-[#3ea6ff] font-bold text-xs uppercase tracking-wider pb-1 mb-3 border-b border-[#2a2a2a]">
          10. Necessidade Educativa Especial (NEE)
        </div>
        <div className="space-y-3">
          <div className="w-56">
            <Label className="text-xs text-gray-300">Possui NEE?</Label>
            <Select value={nee} onValueChange={(val) => setNee(val || 'Não')}>
              <SelectTrigger className="bg-[#121212] border-[#2a2a2a] text-white mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#181818] border-[#2a2a2a] text-white">
                <SelectItem value="Não">Não</SelectItem>
                <SelectItem value="Sim">Sim, indique qual(is)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {nee !== 'Não' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-3 bg-[#121212] rounded-xl border border-[#2a2a2a]">
              {OPCOES_NEE.map((opcao) => (
                <label 
                  key={opcao}
                  className="flex items-center gap-2 p-2 bg-[#181818] border border-[#2a2a2a] rounded-lg text-xs cursor-pointer hover:border-[#3ea6ff]/50 transition-colors"
                >
                  <input 
                    type="checkbox" 
                    checked={neeSelecionadas.includes(opcao)}
                    onChange={() => toggleArrayItem(neeSelecionadas, opcao, setNeeSelecionadas)}
                    className="accent-[#3ea6ff]"
                  />
                  <span>{opcao}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 11. Deficiências */}
      <div>
        <div className="text-[#3ea6ff] font-bold text-xs uppercase tracking-wider pb-1 mb-3 border-b border-[#2a2a2a]">
          11. Deficiência Física, Auditiva ou Visual
        </div>
        <div className="space-y-3">
          <div className="w-56">
            <Label className="text-xs text-gray-300">Possui Deficiência?</Label>
            <Select value={deficiencia} onValueChange={(val) => setDeficiencia(val || 'Não')}>
              <SelectTrigger className="bg-[#121212] border-[#2a2a2a] text-white mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#181818] border-[#2a2a2a] text-white">
                <SelectItem value="Não">Não</SelectItem>
                <SelectItem value="Sim">Sim, indique qual(is)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {deficiencia !== 'Não' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 p-3 bg-[#121212] rounded-xl border border-[#2a2a2a]">
              {OPCOES_DEFICIENCIA.map((opcao) => (
                <label 
                  key={opcao}
                  className="flex items-center gap-2 p-2 bg-[#181818] border border-[#2a2a2a] rounded-lg text-xs cursor-pointer hover:border-[#3ea6ff]/50 transition-colors"
                >
                  <input 
                    type="checkbox" 
                    checked={deficienciasSelecionadas.includes(opcao)}
                    onChange={() => toggleArrayItem(deficienciasSelecionadas, opcao, setDeficienciasSelecionadas)}
                    className="accent-[#3ea6ff]"
                  />
                  <span>{opcao}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
