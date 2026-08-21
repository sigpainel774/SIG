'use client'

import React from 'react'
import { useMatriculaEmaeeContext } from '../context/MatriculaEmaeeContext'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Building2, Globe, MapPin } from 'lucide-react'

const UFS_BRASIL = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
]

export function SecaoEscolaRegular() {
  const {
    escolaOrigemForaRede, setEscolaOrigemForaRede,
    escolaOrigemNome, setEscolaOrigemNome,
    escolaOrigemMunicipio, setEscolaOrigemMunicipio,
    escolaOrigemUf, setEscolaOrigemUf,
    escolaRegularId, setEscolaRegularId,
    escolas,
    anoEscolarizacao, setAnoEscolarizacao,
    turnoRegular, setTurnoRegular,
    turmaRegular, setTurmaRegular,
    professorRegular, setProfessorRegular,
    gestorRegular, setGestorRegular
  } = useMatriculaEmaeeContext()

  return (
    <section className="overflow-hidden border border-border rounded-2xl bg-card shadow-sm dark:bg-gradient-to-b dark:from-[#1a202c]/95 dark:to-[#121621]/95 dark:shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 md:p-5 border-b border-border bg-muted/40 dark:bg-white/[0.012]">
        <div className="flex items-start gap-3">
          <span className="grid place-items-center w-9 h-9 flex-shrink-0 rounded-xl bg-primary/10 font-extrabold text-sm text-primary">
            02
          </span>
          <div>
            <h2 className="text-base font-bold text-foreground">Unidade escolar da escolarização regular</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Informe onde o aluno está matriculado no ensino regular ou se é de outro município/rede.</p>
          </div>
        </div>

        {/* Alternador de Tipo de Unidade de Origem */}
        <div className="inline-flex p-1 bg-muted/80 dark:bg-[#1f2430] border border-border rounded-xl self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setEscolaOrigemForaRede(false)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              !escolaOrigemForaRede
                ? 'bg-background dark:bg-[#2a3040] text-primary shadow-sm border border-border/60'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Rede Municipal
          </button>
          <button
            type="button"
            onClick={() => setEscolaOrigemForaRede(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              escolaOrigemForaRede
                ? 'bg-background dark:bg-[#2a3040] text-primary shadow-sm border border-border/60'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Unidade fora da rede
          </button>
        </div>
      </div>

      <div className="p-4 md:p-5 grid grid-cols-12 gap-4">
        {/* Caso 1: Escola Municipal da Rede */}
        {!escolaOrigemForaRede ? (
          <div className="col-span-12">
            <Label className="block mb-1.5 text-xs font-bold text-foreground">
              Escola municipal de origem
            </Label>
            <select
              className="w-full min-h-[42px] px-3 py-2 border border-border rounded-xl outline-none bg-input text-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
              value={escolaRegularId}
              onChange={(e) => setEscolaRegularId(e.target.value)}
            >
              <option value="">Selecione a escola municipal de origem</option>
              {escolas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </select>
          </div>
        ) : (
          /* Caso 2: Unidade Fora da Rede / Outro Município */
          <div className="col-span-12 grid grid-cols-12 gap-4 p-4 rounded-xl bg-muted/30 dark:bg-white/[0.02] border border-border/70">
            <div className="col-span-12 flex items-center gap-2 pb-1 border-b border-border/40">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                Dados da Unidade de Origem (Fora da Rede / Outro Município)
              </span>
            </div>

            {/* Nome da Escola */}
            <div className="col-span-12 md:col-span-6">
              <Label className="block mb-1.5 text-xs font-bold text-foreground">
                Nome da escola de origem <span className="text-rose-500">*</span>
              </Label>
              <Input
                placeholder="Ex.: Escola Estadual Castro Alves, Colégio ABC..."
                value={escolaOrigemNome}
                onChange={(e) => setEscolaOrigemNome(e.target.value)}
                className="bg-input border-border text-foreground text-sm rounded-xl"
              />
            </div>

            {/* Cidade / Município */}
            <div className="col-span-12 md:col-span-4">
              <Label className="block mb-1.5 text-xs font-bold text-foreground">
                Cidade / Município <span className="text-rose-500">*</span>
              </Label>
              <Input
                placeholder="Ex.: Salvador, Feira de Santana..."
                value={escolaOrigemMunicipio}
                onChange={(e) => setEscolaOrigemMunicipio(e.target.value)}
                className="bg-input border-border text-foreground text-sm rounded-xl"
              />
            </div>

            {/* Estado / UF */}
            <div className="col-span-12 md:col-span-2">
              <Label className="block mb-1.5 text-xs font-bold text-foreground">
                Estado (UF) <span className="text-rose-500">*</span>
              </Label>
              <select
                value={escolaOrigemUf}
                onChange={(e) => setEscolaOrigemUf(e.target.value)}
                className="w-full min-h-[40px] px-3 py-2 border border-border rounded-xl outline-none bg-input text-foreground text-sm focus:border-primary"
              >
                {UFS_BRASIL.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Ano de escolarização */}
        <div className="col-span-12 md:col-span-4">
          <Label className="block mb-1.5 text-xs font-bold text-foreground">Ano de escolarização</Label>
          <Input
            placeholder="Ex.: 5º ano"
            value={anoEscolarizacao}
            onChange={(e) => setAnoEscolarizacao(e.target.value)}
            className="bg-input border-border text-foreground text-sm rounded-xl"
          />
        </div>

        {/* Turno */}
        <div className="col-span-12 md:col-span-4">
          <Label className="block mb-1.5 text-xs font-bold text-foreground">Turno</Label>
          <select
            value={turnoRegular}
            onChange={(e) => setTurnoRegular(e.target.value)}
            className="w-full min-h-[40px] px-3 py-2 border border-border rounded-xl outline-none bg-input text-foreground text-sm focus:border-primary"
          >
            <option value="">Selecione o turno</option>
            <option value="Matutino">Matutino</option>
            <option value="Vespertino">Vespertino</option>
            <option value="Integral">Integral</option>
          </select>
        </div>

        {/* Turma */}
        <div className="col-span-12 md:col-span-4">
          <Label className="block mb-1.5 text-xs font-bold text-foreground">Turma</Label>
          <Input
            placeholder="Ex.: A"
            value={turmaRegular}
            onChange={(e) => setTurmaRegular(e.target.value)}
            className="bg-input border-border text-foreground text-sm rounded-xl"
          />
        </div>

        {/* Professor */}
        <div className="col-span-12 md:col-span-6">
          <Label className="block mb-1.5 text-xs font-bold text-foreground">Professor regente</Label>
          <Input
            placeholder="Nome do professor regente"
            value={professorRegular}
            onChange={(e) => setProfessorRegular(e.target.value)}
            className="bg-input border-border text-foreground text-sm rounded-xl"
          />
        </div>

        {/* Gestor */}
        <div className="col-span-12 md:col-span-6">
          <Label className="block mb-1.5 text-xs font-bold text-foreground">Gestor da escola regular</Label>
          <Input
            placeholder="Nome do gestor escolar"
            value={gestorRegular}
            onChange={(e) => setGestorRegular(e.target.value)}
            className="bg-input border-border text-foreground text-sm rounded-xl"
          />
        </div>
      </div>
    </section>
  )
}

