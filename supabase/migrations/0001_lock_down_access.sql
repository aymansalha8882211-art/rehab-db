-- Locks the database so that reaching it requires being a signed-in member of
-- staff. Until this runs, the browser talks to Postgres as the `anon` role using
-- a key that ships inside the public JS bundle, so every row is world-readable
-- and world-writable by anyone who opens the site and reads the source.
--
-- Apply in: Supabase dashboard -> SQL Editor.
--
-- ORDER MATTERS. The app signs in through a custom edge function that never
-- establishes a Supabase session, so it authenticates as `anon` for every call.
-- Running this file before the client is migrated to supabase.auth will lock the
-- app out of its own data. Migrate the client first, or accept the outage.

-- ---------------------------------------------------------------------------
-- 1. Staff identity
-- ---------------------------------------------------------------------------
-- public.users keeps the profile; auth.users keeps the credential. The password
-- column goes away entirely -- Supabase Auth stores a hash, and nothing that
-- reaches the browser should ever carry a password again.
--
-- DO THIS FIRST, BEFORE RUNNING THIS FILE: create an auth.users entry for each
-- existing member of staff, reusing their current password, and set
-- public.users.id to the new auth id. Both statements below depend on it:
--   * dropping `password` destroys the only copy of the credentials, so the
--     accounts must already exist in auth.users or nobody can sign in again;
--   * the foreign key fails outright if any public.users.id has no match.
-- Five accounts is a short manual job in the dashboard (Authentication -> Add
-- user). Sign-in uses a synthetic address, `<username>@rehab-db.local`, so staff
-- keep typing the username they already know.

alter table public.users drop column if exists password;

-- public.users.id must equal auth.uid() so policies can join on it.
alter table public.users
  add constraint users_id_is_auth_user
  foreign key (id) references auth.users (id) on delete cascade;

-- Reading the caller's own role from inside a policy on public.users would
-- recurse. SECURITY DEFINER runs the lookup as the owner, bypassing RLS once,
-- which breaks the cycle. search_path is pinned so the function cannot be
-- hijacked by a scoped schema.
create or replace function public.app_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $fn$
  select role from public.users where id = auth.uid() and status = 'active'
$fn$;

create or replace function public.app_user_projects()
returns text[]
language sql
stable
security definer
set search_path = public
as $fn$
  select coalesce(projects, '{}') from public.users
  where id = auth.uid() and status = 'active'
$fn$;

revoke execute on function public.app_user_role()     from anon;
revoke execute on function public.app_user_projects() from anon;

-- ---------------------------------------------------------------------------
-- 2. Turn RLS on everywhere
-- ---------------------------------------------------------------------------
-- With RLS on and no policy granting anon anything, the anon key becomes
-- useless on its own -- which is the entire point, since it is public.

alter table public.users         enable row level security;
alter table public.beneficiaries enable row level security;
alter table public.sessions      enable row level security;
alter table public.assessments   enable row level security;
alter table public.alerts        enable row level security;
alter table public.settings      enable row level security;

revoke all on public.users, public.beneficiaries, public.sessions,
              public.assessments, public.alerts, public.settings
  from anon;

-- ---------------------------------------------------------------------------
-- 3. Policies
-- ---------------------------------------------------------------------------

-- users ---------------------------------------------------------------------
-- Everyone signed in can read their own row (the app refreshes role and status
-- from it every 30 seconds). Only admins see the whole staff list.
create policy users_read_self on public.users
  for select to authenticated
  using (id = auth.uid());

create policy users_read_all_admin on public.users
  for select to authenticated
  using (public.app_user_role() = 'admin');

create policy users_write_admin on public.users
  for all to authenticated
  using      (public.app_user_role() = 'admin')
  with check (public.app_user_role() = 'admin');

-- beneficiaries -------------------------------------------------------------
-- Case data is visible only for the projects a staff member is assigned to.
-- This is the rule that stops a Church-project data entry clerk from reading
-- every CBM case, and it is enforced here rather than in the UI, so a crafted
-- request cannot step around it.
create policy beneficiaries_read on public.beneficiaries
  for select to authenticated
  using (
    public.app_user_role() is not null
    and (
      public.app_user_role() in ('admin', 'supervisor')
      or project = any (public.app_user_projects())
    )
  );

create policy beneficiaries_insert on public.beneficiaries
  for insert to authenticated
  with check (
    public.app_user_role() in ('admin', 'supervisor', 'data_entry')
    and (
      public.app_user_role() in ('admin', 'supervisor')
      or project = any (public.app_user_projects())
    )
  );

create policy beneficiaries_update on public.beneficiaries
  for update to authenticated
  using (
    public.app_user_role() in ('admin', 'supervisor', 'data_entry')
    and (
      public.app_user_role() in ('admin', 'supervisor')
      or project = any (public.app_user_projects())
    )
  );

-- Deleting a case removes a person's whole treatment history. Admins only.
create policy beneficiaries_delete_admin on public.beneficiaries
  for delete to authenticated
  using (public.app_user_role() = 'admin');

-- sessions / assessments ----------------------------------------------------
-- Both hang off a beneficiary, so they inherit that beneficiary's visibility
-- rather than repeating the project rule and risking the two drifting apart.
-- The EXISTS subquery is itself filtered by beneficiaries_read, so a row whose
-- parent case is out of scope is invisible here too.
create policy sessions_read on public.sessions
  for select to authenticated
  using (exists (select 1 from public.beneficiaries b where b.id = beneficiary_id));

create policy sessions_insert on public.sessions
  for insert to authenticated
  with check (
    public.app_user_role() in ('admin', 'supervisor', 'data_entry')
    and exists (select 1 from public.beneficiaries b where b.id = beneficiary_id)
  );

create policy sessions_update on public.sessions
  for update to authenticated
  using (
    public.app_user_role() in ('admin', 'supervisor', 'data_entry')
    and exists (select 1 from public.beneficiaries b where b.id = beneficiary_id)
  );

create policy sessions_delete_admin on public.sessions
  for delete to authenticated
  using (public.app_user_role() = 'admin');

create policy assessments_read on public.assessments
  for select to authenticated
  using (exists (select 1 from public.beneficiaries b where b.id = beneficiary_id));

create policy assessments_insert on public.assessments
  for insert to authenticated
  with check (
    public.app_user_role() in ('admin', 'supervisor', 'data_entry')
    and exists (select 1 from public.beneficiaries b where b.id = beneficiary_id)
  );

create policy assessments_update on public.assessments
  for update to authenticated
  using (
    public.app_user_role() in ('admin', 'supervisor', 'data_entry')
    and exists (select 1 from public.beneficiaries b where b.id = beneficiary_id)
  );

create policy assessments_delete_admin on public.assessments
  for delete to authenticated
  using (public.app_user_role() = 'admin');

-- alerts --------------------------------------------------------------------
create policy alerts_read on public.alerts
  for select to authenticated
  using (public.app_user_role() is not null);

create policy alerts_insert on public.alerts
  for insert to authenticated
  with check (public.app_user_role() is not null);

create policy alerts_update on public.alerts
  for update to authenticated
  using (public.app_user_role() is not null);

-- settings ------------------------------------------------------------------
-- Maintenance mode is read before login, so this one stays readable by anon.
-- It holds two switches and no personal data.
create policy settings_read_anyone on public.settings
  for select to anon, authenticated
  using (true);

grant select on public.settings to anon;

create policy settings_write_admin on public.settings
  for all to authenticated
  using      (public.app_user_role() = 'admin')
  with check (public.app_user_role() = 'admin');
