-- ─────────────────────────────────────────
-- profiles
-- ─────────────────────────────────────────
create table public.profiles (
  id                  uuid primary key references auth.users on delete cascade,
  display_name        text not null,
  avatar_url          text,
  phone_number        text,
  preferred_call_time time not null default '21:00:00',
  created_at          timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create profile on sign-up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ─────────────────────────────────────────
-- habits
-- ─────────────────────────────────────────
create table public.habits (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users on delete cascade,
  name          text not null,
  current_stage int not null default 0,
  streak        int not null default 0,
  habit_stages  jsonb not null,
  archived      boolean not null default false,
  created_at    timestamptz not null default now()
);

alter table public.habits enable row level security;

create policy "Users can view own habits"
  on public.habits for select
  using (auth.uid() = user_id);

create policy "Users can insert own habits"
  on public.habits for insert
  with check (auth.uid() = user_id);

create policy "Users can update own habits"
  on public.habits for update
  using (auth.uid() = user_id);

create policy "Users can delete own habits"
  on public.habits for delete
  using (auth.uid() = user_id);


-- ─────────────────────────────────────────
-- habit_logs
-- ─────────────────────────────────────────
create table public.habit_logs (
  id         uuid primary key default gen_random_uuid(),
  habit_id   uuid not null references public.habits on delete cascade,
  user_id    uuid not null references auth.users on delete cascade,
  date       date not null,
  completed  boolean not null default false,
  notes      text,
  created_at timestamptz not null default now()
);

alter table public.habit_logs enable row level security;

create policy "Users can view own habit_logs"
  on public.habit_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert own habit_logs"
  on public.habit_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own habit_logs"
  on public.habit_logs for update
  using (auth.uid() = user_id);


-- ─────────────────────────────────────────
-- pending_confirmations
-- ─────────────────────────────────────────
create table public.pending_confirmations (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users on delete cascade,
  conversation_id text,
  parsed_habits   jsonb,
  confirmed       boolean not null default false,
  created_at      timestamptz not null default now()
);

alter table public.pending_confirmations enable row level security;

create policy "Users can view own pending_confirmations"
  on public.pending_confirmations for select
  using (auth.uid() = user_id);

create policy "Users can insert own pending_confirmations"
  on public.pending_confirmations for insert
  with check (auth.uid() = user_id);

create policy "Users can update own pending_confirmations"
  on public.pending_confirmations for update
  using (auth.uid() = user_id);
