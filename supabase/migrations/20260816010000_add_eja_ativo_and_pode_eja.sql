-- Migration: 20260816010000_add_eja_ativo_and_pode_eja.sql
-- Propósito: Adicionar a coluna eja_ativo em public.escolas e pode_eja em public.acessos_usuarios

-- 1. Flag de ativação do Módulo EJA na unidade escolar
ALTER TABLE public.escolas
  ADD COLUMN IF NOT EXISTS eja_ativo boolean DEFAULT false;

-- 2. Flag de liberação do Módulo EJA para Secretários/Servidores autorizados pelo Diretor
ALTER TABLE public.acessos_usuarios
  ADD COLUMN IF NOT EXISTS pode_eja boolean DEFAULT false;
