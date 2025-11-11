-- Migration: Create recipient_contacts table for saved transfer recipients
create table if not exists public.recipient_contacts (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references public.user_profiles(id) on delete cascade,
    name text not null,
    account_number text not null,
    bank_name text,
    created_at timestamp with time zone default timezone('utc', now()) not null,
    last_used_at timestamp with time zone default timezone('utc', now()) not null,
    unique (user_id, account_number)
);

create index if not exists idx_recipient_contacts_user_id on public.recipient_contacts(user_id);

alter table public.recipient_contacts enable row level security;

drop policy if exists "Users can view own recipient contacts" on public.recipient_contacts;
create policy "Users can view own recipient contacts"
    on public.recipient_contacts for select
    using (auth.uid() = user_id);

drop policy if exists "Users can manage own recipient contacts" on public.recipient_contacts;
create policy "Users can manage own recipient contacts"
    on public.recipient_contacts for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

alter table public.transactions
    add column if not exists recipient_account text;

