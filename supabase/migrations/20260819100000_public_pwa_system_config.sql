-- Permitir leitura pública (não logado) de configurações relacionadas ao PWA
-- Isso previne problemas onde o login tenta checar a versão e recebe array vazio,
-- rebaixando o cache local para v13 e forçando atualizações em loop infinito.

CREATE POLICY "leitura_publica_pwa" 
ON public.system_config 
FOR SELECT 
TO public
USING (chave LIKE 'pwa_%');
