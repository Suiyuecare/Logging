create extension if not exists pgcrypto;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (
    event_type in (
      'login',
      'logout',
      'export',
      'print',
      'delete',
      'submit',
      'approve',
      'reject',
      'assign',
      'permission_change',
      'sensitive_access',
      'external_account_status_change'
    )
  ),
  severity text not null default 'info' check (severity in ('info', 'warning', 'critical')),
  result text not null default 'success' check (result in ('success', 'failed', 'denied')),
  action text not null,
  module_code text not null,
  resource_type text,
  resource_id text,
  data_scope text check (
    data_scope is null
    or data_scope in (
      'self',
      'assigned',
      'class',
      'department',
      'business_unit',
      'region',
      'institution',
      'company',
      'group',
      'custom'
    )
  ),
  actor_user_id uuid,
  actor_email text,
  actor_roles text[] not null default '{}',
  actor_company_id text,
  actor_institution_id text,
  actor_region_id text,
  actor_department_id text,
  actor_business_unit_id text,
  actor_class_id text,
  target_user_id uuid,
  target_email text,
  target_company_id text,
  target_institution_id text,
  target_region_id text,
  target_department_id text,
  target_business_unit_id text,
  target_class_id text,
  reason text,
  request_id text,
  ip_address inet,
  user_agent text,
  before_snapshot jsonb not null default '{}'::jsonb,
  after_snapshot jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_event_type_idx on public.audit_logs (event_type, created_at desc);
create index if not exists audit_logs_actor_user_idx on public.audit_logs (actor_user_id, created_at desc);
create index if not exists audit_logs_target_user_idx on public.audit_logs (target_user_id, created_at desc);
create index if not exists audit_logs_module_idx on public.audit_logs (module_code, created_at desc);
create index if not exists audit_logs_resource_idx on public.audit_logs (resource_type, resource_id);
create index if not exists audit_logs_request_id_idx on public.audit_logs (request_id);
create index if not exists audit_logs_metadata_gin_idx on public.audit_logs using gin (metadata);

alter table public.audit_logs enable row level security;

comment on table public.audit_logs is
  'Suiyuecare platform audit logs. Write from trusted server-side code only; no public insert policy by default.';

comment on column public.audit_logs.before_snapshot is
  'Record prior state for delete, permission_change, assign, approve/reject, and external account status changes.';

comment on column public.audit_logs.after_snapshot is
  'Record resulting state for delete, permission_change, assign, approve/reject, and external account status changes.';

comment on column public.audit_logs.metadata is
  'Structured context such as filters used for export, sensitive grant id, workflow id, or error payload.';

-- Intentionally no anon/authenticated RLS policy here.
-- Use service_role from server-side APIs or create narrow SELECT policies only for system permission admins.

