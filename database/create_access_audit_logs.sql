create extension if not exists pgcrypto;

create table if not exists public.access_audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  ip_address text,
  user_agent text,
  path text,
  event text,
  created_at timestamp with time zone default now()
);

create index if not exists access_audit_logs_user_idx on public.access_audit_logs(user_id);
create index if not exists access_audit_logs_created_idx on public.access_audit_logs(created_at);
