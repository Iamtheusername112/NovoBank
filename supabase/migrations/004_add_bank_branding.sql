-- Migration: add bank branding metadata to accounts
alter table public.accounts
    add column if not exists bank_name text;

alter table public.accounts
    add column if not exists bank_logo text;

