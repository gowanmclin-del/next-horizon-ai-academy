-- Next Horizon AI Academy — Phase 22 corporate partnership inquiries
create table if not exists public.corporate_partnership_inquiries (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  work_email text not null,
  organization text not null,
  job_title text,
  organization_size text,
  partnership_interest text not null,
  learner_count text,
  timeline text,
  goals text not null,
  created_at timestamptz not null default now(),
  status text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'closed'))
);

create index if not exists corporate_partnership_inquiries_created_at_idx
  on public.corporate_partnership_inquiries (created_at desc);

alter table public.corporate_partnership_inquiries enable row level security;

drop policy if exists "corporate inquiries: public insert" on public.corporate_partnership_inquiries;
create policy "corporate inquiries: public insert"
  on public.corporate_partnership_inquiries for insert
  with check (true);

drop policy if exists "corporate inquiries: admin read" on public.corporate_partnership_inquiries;
create policy "corporate inquiries: admin read"
  on public.corporate_partnership_inquiries for select
  using (public.is_admin(auth.uid()));

grant insert on public.corporate_partnership_inquiries to anon, authenticated;
grant select on public.corporate_partnership_inquiries to authenticated;
