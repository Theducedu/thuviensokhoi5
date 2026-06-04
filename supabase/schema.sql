create type public.user_role as enum ('teacher', 'admin');
create type public.resource_status as enum ('approved', 'pending', 'rejected');
create type public.resource_type as enum ('lesson', 'book');

create table public.teachers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text not null unique,
  subject text not null,
  access_code text not null unique,
  role public.user_role not null default 'teacher',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subject text not null,
  type public.resource_type not null,
  category text not null default 'Tài liệu',
  week text not null default '',
  contributor_id uuid references public.teachers(id) on delete set null,
  contributor_name text not null,
  drive_url text not null,
  description text not null,
  status public.resource_status not null default 'pending',
  views integer not null default 0,
  opens integer not null default 0,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.teachers(id) on delete set null
);

create table public.news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null,
  image_url text not null,
  author_id uuid references public.teachers(id) on delete set null,
  author_name text not null,
  visible boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.access_events (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references public.teachers(id) on delete set null,
  event_type text not null,
  resource_id uuid references public.resources(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.teachers enable row level security;
alter table public.resources enable row level security;
alter table public.news enable row level security;
alter table public.access_events enable row level security;

create or replace function public.current_teacher_role()
returns public.user_role
language sql
security definer
set search_path = public
as $$
  select role
  from public.teachers
  where auth_user_id = auth.uid() and active = true
  limit 1
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(public.current_teacher_role() = 'admin', false)
$$;

create policy "active teachers can read teachers"
on public.teachers for select
to authenticated
using (
  auth_user_id = auth.uid()
  or public.is_admin()
);

create policy "admins manage teachers"
on public.teachers for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "teachers read approved resources"
on public.resources for select
to authenticated
using (
  status = 'approved'
  or public.is_admin()
  or contributor_id in (select id from public.teachers where auth_user_id = auth.uid())
);

create policy "teachers create pending resources"
on public.resources for insert
to authenticated
with check (
  status = 'pending'
  and contributor_id in (select id from public.teachers where auth_user_id = auth.uid() and active = true)
);

create policy "admins manage resources"
on public.resources for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "teachers read visible news"
on public.news for select
to authenticated
using (visible = true or public.is_admin());

create policy "admins manage news"
on public.news for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "teachers create access events"
on public.access_events for insert
to authenticated
with check (
  teacher_id in (select id from public.teachers where auth_user_id = auth.uid() and active = true)
);

create policy "admins read access events"
on public.access_events for select
to authenticated
using (public.is_admin());

insert into public.teachers (name, email, subject, access_code, role)
values ('Quản trị Khối 5', 'admin@khoi5.edu.vn', 'Quản trị', 'ADMIN-2026', 'admin');
