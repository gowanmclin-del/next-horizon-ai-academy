-- Next Horizon AI Academy — Phase 22
-- Corporate Partnership Program lead capture. Additive only.

create table if not exists public.corporate_partnership_inquiries (
  id uuid primary key default gen_random_uuid(),
  organization_name text not null,
  contact_name text not null,
  email text not null,
  job_title text,
  industry text,
  organization_size text,
  interests text[] not null default '{}',
  participant_count text,
  timeline text,
  goals text,
  status text not null default 'new' check (status in ('new','contacted','qualified','proposal','won','closed')),
  created_at timestamptz not null default now()
);

alter table public.corporate_partnership_inquiries enable row level security;
create policy "corporate_partnership_inquiries: public insert"
  on public.corporate_partnership_inquiries for insert with check (true);

create table if not exists public.ai_readiness_assessments (
  id uuid primary key default gen_random_uuid(),
  organization_name text not null,
  contact_name text not null,
  email text not null,
  organization_size text,
  current_usage smallint not null check (current_usage between 1 and 5),
  formal_training smallint not null check (formal_training between 1 and 5),
  ai_policy smallint not null check (ai_policy between 1 and 5),
  prompting_confidence smallint not null check (prompting_confidence between 1 and 5),
  verification_practice smallint not null check (verification_practice between 1 and 5),
  workflow_integration smallint not null check (workflow_integration between 1 and 5),
  leadership_readiness smallint not null check (leadership_readiness between 1 and 5),
  top_priority text,
  score smallint not null check (score between 0 and 100),
  level text not null check (level in ('Foundational','Developing','AI Ready','AI Enabled','AI Forward')),
  created_at timestamptz not null default now()
);

alter table public.ai_readiness_assessments enable row level security;
create policy "ai_readiness_assessments: public insert"
  on public.ai_readiness_assessments for insert with check (true);

-- Public forms are intentionally write-only. No SELECT policy is granted to anon/authenticated users here.
