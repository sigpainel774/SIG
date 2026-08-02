-- Migration: Manter fotos-originais como Privado para proteção de LGPD
UPDATE storage.buckets
SET public = false
WHERE id = 'fotos-originais';
