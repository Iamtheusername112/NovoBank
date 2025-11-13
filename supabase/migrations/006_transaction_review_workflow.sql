-- Transaction review workflow

-- Add review columns to transactions table
alter table public.transactions
    add column if not exists review_status text default 'pending'
        check (review_status in ('pending', 'approved', 'rejected', 'blocked')),
    add column if not exists review_notes text,
    add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
    add column if not exists reviewed_at timestamp with time zone,
    add column if not exists requires_manual_review boolean default true,
    add column if not exists account_id uuid references public.accounts(id) on delete set null;

-- Ensure status default aligns with review workflow
alter table public.transactions
    alter column status set default 'pending';

-- Add account status to user profiles
alter table public.user_profiles
    add column if not exists account_status text default 'active'
        check (account_status in ('active', 'restricted', 'blocked')),
    add column if not exists account_status_updated_at timestamp with time zone,
    add column if not exists account_status_reason text;

-- Function to log transaction review notifications
create or replace function public.log_transaction_review_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    notif_title text;
    notif_message text;
    notif_type text := 'info';
begin
    if NEW.user_id is null then
        return NEW;
    end if;

    -- Only fire when review status changes
    if OLD.review_status is not distinct from NEW.review_status then
        return NEW;
    end if;

    if NEW.review_status = 'approved' then
        notif_title := 'Transaction approved';
        notif_message := coalesce(NEW.review_notes,
            'Your recent transaction has been approved and will be processed shortly.');
        notif_type := 'success';
    elsif NEW.review_status = 'rejected' then
        notif_title := 'Transaction rejected';
        notif_message := coalesce(NEW.review_notes,
            'Your recent transaction was rejected. Please review and try again or contact support.');
        notif_type := 'error';
    elsif NEW.review_status = 'blocked' then
        notif_title := 'Account under review';
        notif_message := coalesce(NEW.review_notes,
            'This transaction was blocked and your account may be restricted. Please contact support.');
        notif_type := 'warning';
    else
        return NEW;
    end if;

    insert into public.notifications (user_id, title, message, type, is_read, created_at)
    values (
        NEW.user_id,
        notif_title,
        notif_message,
        notif_type,
        false,
        timezone('utc', now())
    );

    return NEW;
end;
$$;

drop trigger if exists trigger_transaction_review_notification on public.transactions;

create trigger trigger_transaction_review_notification
after update on public.transactions
for each row execute function public.log_transaction_review_notification();

-- Function to log account status changes
create or replace function public.log_account_status_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    notif_title text;
    notif_message text;
    notif_type text := 'warning';
begin
    if NEW.id is null then
        return NEW;
    end if;

    if OLD.account_status is not distinct from NEW.account_status then
        return NEW;
    end if;

    if NEW.account_status = 'active' then
        notif_title := 'Account reactivated';
        notif_message := coalesce(NEW.account_status_reason,
            'Your account has been reactivated and you can continue banking with us.');
        notif_type := 'success';
    elsif NEW.account_status = 'restricted' then
        notif_title := 'Account under review';
        notif_message := coalesce(NEW.account_status_reason,
            'Your account access is temporarily restricted. Please contact support for assistance.');
    elsif NEW.account_status = 'blocked' then
        notif_title := 'Account blocked';
        notif_message := coalesce(NEW.account_status_reason,
            'Your account has been blocked. Please contact your banking institution immediately.');
        notif_type := 'error';
    else
        return NEW;
    end if;

    insert into public.notifications (user_id, title, message, type, is_read, created_at)
    values (
        NEW.id,
        notif_title,
        notif_message,
        notif_type,
        false,
        timezone('utc', now())
    );

    return NEW;
end;
$$;

drop trigger if exists trigger_account_status_notification on public.user_profiles;

create trigger trigger_account_status_notification
after update on public.user_profiles
for each row execute function public.log_account_status_notification();

-- Helpful indexes
create index if not exists idx_transactions_review_status on public.transactions(review_status);
create index if not exists idx_transactions_requires_manual_review on public.transactions(requires_manual_review);
create index if not exists idx_user_profiles_account_status on public.user_profiles(account_status);

