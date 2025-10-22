-- Habilita a extensão pgcrypto para gerar UUIDs
create extension if not exists pgcrypto;

-- Cria a função que executará os comandos SQL
create or replace function exec_sql(query text)
returns void
language plpgsql
security definer
as $$
begin
  execute query;
end;
$$;