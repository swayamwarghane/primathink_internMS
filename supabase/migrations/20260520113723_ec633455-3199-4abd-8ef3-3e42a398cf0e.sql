
-- Roles enum
create type public.app_role as enum ('admin', 'intern');

-- Task status enum
create type public.task_status as enum ('locked', 'in_progress', 'pending_approval', 'approved', 'rejected');

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null,
  mobile text default '',
  internship_domain text default '',
  onboarding_step integer not null default 1, -- 1=account done, 2=personal done, 3=college done (fully onboarded when >=4)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- User roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

-- Personal details
create table public.personal_details (
  user_id uuid primary key references auth.users(id) on delete cascade,
  date_of_birth date,
  address text,
  skills text,
  internship_domain text,
  updated_at timestamptz not null default now()
);
alter table public.personal_details enable row level security;

-- College details
create table public.college_details (
  user_id uuid primary key references auth.users(id) on delete cascade,
  college_name text,
  degree text,
  branch text,
  year_of_passing integer,
  updated_at timestamptz not null default now()
);
alter table public.college_details enable row level security;

-- Tasks (templates assigned by admin to interns)
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  intern_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  sequence_order integer not null,
  status public.task_status not null default 'locked',
  submission text default '',
  feedback text default '',
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (intern_id, sequence_order)
);
alter table public.tasks enable row level security;

-- Has-role function (security definer to avoid RLS recursion)
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles where user_id = _user_id and role = _role
  )
$$;

-- Profiles policies
create policy "Users view own profile" on public.profiles
  for select using (auth.uid() = id or public.has_role(auth.uid(), 'admin'));
create policy "Users insert own profile" on public.profiles
  for insert with check (auth.uid() = id);
create policy "Users update own profile" on public.profiles
  for update using (auth.uid() = id or public.has_role(auth.uid(), 'admin'));

-- User roles policies (read own + admin reads all; only admin can write)
create policy "Users view own roles" on public.user_roles
  for select using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));
create policy "Admins manage roles" on public.user_roles
  for all using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Personal details policies
create policy "Users view own personal" on public.personal_details
  for select using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));
create policy "Users upsert own personal" on public.personal_details
  for insert with check (auth.uid() = user_id);
create policy "Users update own personal" on public.personal_details
  for update using (auth.uid() = user_id);

-- College details policies
create policy "Users view own college" on public.college_details
  for select using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));
create policy "Users upsert own college" on public.college_details
  for insert with check (auth.uid() = user_id);
create policy "Users update own college" on public.college_details
  for update using (auth.uid() = user_id);

-- Tasks policies
create policy "Intern views own tasks" on public.tasks
  for select using (auth.uid() = intern_id or public.has_role(auth.uid(), 'admin'));
create policy "Admin inserts tasks" on public.tasks
  for insert with check (public.has_role(auth.uid(), 'admin'));
create policy "Admin updates any task; intern updates own submission" on public.tasks
  for update using (auth.uid() = intern_id or public.has_role(auth.uid(), 'admin'));
create policy "Admin deletes tasks" on public.tasks
  for delete using (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();
create trigger personal_updated_at before update on public.personal_details
  for each row execute function public.set_updated_at();
create trigger college_updated_at before update on public.college_details
  for each row execute function public.set_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, mobile)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'mobile', '')
  );
  -- Default everyone to intern role; admin role is granted via server function
  insert into public.user_roles (user_id, role) values (new.id, 'intern');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
