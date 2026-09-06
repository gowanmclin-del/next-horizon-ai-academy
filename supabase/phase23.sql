-- Next Horizon AI Academy — Phase 23
-- Corporate partnership admin pipeline. Run AFTER phase22.sql.
-- Additive except for replacing the Phase 22 inquiry status CHECK with an expanded pipeline.

alter table public.corporate_partnership_inquiries
  add column if not exists priority text not null default 'normal',
  add column if not exists admin_notes text,
  add column if not exists next_follow_up_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.corporate_partnership_inquiries
  drop constraint if exists corporate_partnership_inquiries_status_check;

alter table public.corporate_partnership_inquiries
  add constraint corporate_partnership_inquiries_status_check
  check (status in ('new','contacted','qualified','proposal','pilot','partner','closed'));

alter table public.corporate_partnership_inquiries
  drop constraint if exists corporate_partnership_inquiries_priority_check;

alter table public.corporate_partnership_inquiries
  add constraint corporate_partnership_inquiries_priority_check
  check (priority in ('low','normal','high','urgent'));

alter table public.ai_readiness_assessments
  add column if not exists follow_up_status text not null default 'new',
  add column if not exists admin_notes text,
  add column if not exists linked_inquiry_id uuid references public.corporate_partnership_inquiries(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

alter table public.ai_readiness_assessments
  drop constraint if exists ai_readiness_assessments_follow_up_status_check;

alter table public.ai_readiness_assessments
  add constraint ai_readiness_assessments_follow_up_status_check
  check (follow_up_status in ('new','reviewed','contacted','converted','closed'));

-- Admins may read corporate lead records through their authenticated session.
create policy "corporate_partnership_inquiries: admin read all"
  on public.corporate_partnership_inquiries for select
  using (public.is_admin(auth.uid()));

create policy "ai_readiness_assessments: admin read all"
  on public.ai_readiness_assessments for select
  using (public.is_admin(auth.uid()));

-- Mutations go through SECURITY DEFINER RPCs instead of broad UPDATE policies.
create or replace function public.admin_update_corporate_lead(
  p_inquiry_id uuid,
  p_status text,
  p_priority text,
  p_admin_notes text default null,
  p_next_follow_up_at timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Not authorized';
  end if;

  if p_status not in ('new','contacted','qualified','proposal','pilot','partner','closed') then
    raise exception 'Invalid status';
  end if;
  if p_priority not in ('low','normal','high','urgent') then
    raise exception 'Invalid priority';
  end if;

  update public.corporate_partnership_inquiries
  set status = p_status,
      priority = p_priority,
      admin_notes = nullif(trim(coalesce(p_admin_notes, '')), ''),
      next_follow_up_at = p_next_follow_up_at,
      updated_at = now()
  where id = p_inquiry_id;

  if not found then
    raise exception 'Corporate inquiry not found';
  end if;

  perform public.admin_log_action(
    'corporate_lead_updated',
    'corporate_partnership_inquiry',
    p_inquiry_id,
    jsonb_build_object('status', p_status, 'priority', p_priority, 'next_follow_up_at', p_next_follow_up_at)
  );
end;
$$;

grant execute on function public.admin_update_corporate_lead(uuid, text, text, text, timestamptz) to authenticated;

create or replace function public.admin_update_readiness_followup(
  p_assessment_id uuid,
  p_follow_up_status text,
  p_admin_notes text default null,
  p_linked_inquiry_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Not authorized';
  end if;
  if p_follow_up_status not in ('new','reviewed','contacted','converted','closed') then
    raise exception 'Invalid follow-up status';
  end if;

  update public.ai_readiness_assessments
  set follow_up_status = p_follow_up_status,
      admin_notes = nullif(trim(coalesce(p_admin_notes, '')), ''),
      linked_inquiry_id = p_linked_inquiry_id,
      updated_at = now()
  where id = p_assessment_id;

  if not found then
    raise exception 'Readiness assessment not found';
  end if;

  perform public.admin_log_action(
    'readiness_followup_updated',
    'ai_readiness_assessment',
    p_assessment_id,
    jsonb_build_object('follow_up_status', p_follow_up_status, 'linked_inquiry_id', p_linked_inquiry_id)
  );
end;
$$;

grant execute on function public.admin_update_readiness_followup(uuid, text, text, uuid) to authenticated;

create index if not exists corporate_partnership_inquiries_status_created_idx
  on public.corporate_partnership_inquiries(status, created_at desc);
create index if not exists corporate_partnership_inquiries_followup_idx
  on public.corporate_partnership_inquiries(next_follow_up_at)
  where next_follow_up_at is not null;
create index if not exists ai_readiness_assessments_followup_created_idx
  on public.ai_readiness_assessments(follow_up_status, created_at desc);
