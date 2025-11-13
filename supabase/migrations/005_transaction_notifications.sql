-- Transaction notifications trigger

create or replace function public.log_transaction_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    abs_amount numeric;
    amount_text text;
    account_name text;
    notif_title text;
    notif_message text;
    notif_type text := 'info';
begin
    if NEW.user_id is null then
        return NEW;
    end if;

    abs_amount := abs(coalesce(NEW.amount, 0));
    if abs_amount <= 0 then
        return NEW;
    end if;

    -- Only notify for completed & approved transactions
    if NEW.status <> 'completed' then
        return NEW;
    end if;

    if coalesce(NEW.review_status, 'approved') <> 'approved' then
        return NEW;
    end if;

    if TG_OP = 'UPDATE' and (OLD.status = NEW.status and coalesce(OLD.review_status, '') = coalesce(NEW.review_status, '')) then
        return NEW;
    end if;

    amount_text := to_char(abs_amount, 'FM$999,999,999.00');
    account_name := coalesce(NEW.recipient_name, 'your account');

    if NEW.transaction_type = 'deposit' then
        notif_title := 'Deposit posted';
        notif_message := format('We added %s to %s.', amount_text, account_name);
        notif_type := 'success';
    elsif NEW.transaction_type = 'withdrawal' then
        notif_title := 'Withdrawal completed';
        notif_message := format('%s was withdrawn from %s.', amount_text, account_name);
        notif_type := 'warning';
    elsif NEW.transaction_type = 'sent' then
        notif_title := 'Transfer sent';
        notif_message := format('You sent %s to %s.', amount_text, account_name);
    elsif NEW.transaction_type = 'received' then
        notif_title := 'Funds received';
        notif_message := format('You received %s from %s.', amount_text, account_name);
        notif_type := 'success';
    else
        notif_title := 'Account activity';
        notif_message := format('A transaction of %s affected %s.', amount_text, account_name);
    end if;

    insert into public.notifications (user_id, title, message, type, is_read, created_at)
    values (
        NEW.user_id,
        notif_title,
        notif_message,
        notif_type,
        false,
        coalesce(NEW.created_at, timezone('utc', now()))
    );

    return NEW;
end;
$$;

drop trigger if exists trigger_transaction_notifications on public.transactions;

create trigger trigger_transaction_notifications
after insert or update on public.transactions
for each row execute function public.log_transaction_notification();

