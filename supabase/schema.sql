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

create table if not exists public.platform_companies (
  id text primary key,
  name text not null,
  tax_id text,
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_modules (
  code text primary key,
  name text not null,
  description text,
  sort_order integer not null default 0,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.platform_positions (
  id uuid primary key default gen_random_uuid(),
  company_id text not null references public.platform_companies (id),
  code text not null,
  name text not null,
  level integer not null default 0,
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, code)
);

create table if not exists public.platform_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  company_id text not null references public.platform_companies (id),
  employee_id text,
  display_name text not null,
  email text not null,
  phone text,
  position_id uuid references public.platform_positions (id),
  account_status text not null default 'active' check (account_status in ('invited', 'active', 'disabled', 'left')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_roles (
  id uuid primary key default gen_random_uuid(),
  company_id text references public.platform_companies (id),
  code text not null,
  name text not null,
  description text,
  system_role boolean not null default false,
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, code)
);

create table if not exists public.platform_permissions (
  code text primary key,
  module_code text not null references public.platform_modules (code),
  resource text not null,
  action text not null,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.platform_role_permissions (
  role_id uuid not null references public.platform_roles (id) on delete cascade,
  permission_code text not null references public.platform_permissions (code) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_code)
);

create table if not exists public.platform_user_roles (
  user_id uuid not null references public.platform_profiles (user_id) on delete cascade,
  role_id uuid not null references public.platform_roles (id) on delete cascade,
  assigned_by uuid references auth.users (id),
  assigned_at timestamptz not null default now(),
  expires_at timestamptz,
  primary key (user_id, role_id)
);

create table if not exists public.platform_user_data_scopes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.platform_profiles (user_id) on delete cascade,
  scope_type text not null check (
    scope_type in (
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
  company_id text references public.platform_companies (id),
  institution_id text,
  region_id text,
  department_id text,
  business_unit_id text,
  class_id text,
  case_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.hr_employees (
  id uuid primary key default gen_random_uuid(),
  company_id text not null references public.platform_companies (id),
  profile_user_id uuid references public.platform_profiles (user_id),
  employee_no text not null,
  display_name text not null,
  email text,
  phone text,
  position_id uuid references public.platform_positions (id),
  department_id text,
  business_unit_id text,
  hire_date date,
  leave_date date,
  employment_status text not null default 'active' check (employment_status in ('active', 'leave', 'left')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, employee_no)
);

create index if not exists platform_profiles_company_idx on public.platform_profiles (company_id);
create index if not exists platform_profiles_account_status_idx on public.platform_profiles (account_status);
create index if not exists platform_user_roles_role_idx on public.platform_user_roles (role_id);
create index if not exists platform_role_permissions_permission_idx on public.platform_role_permissions (permission_code);
create index if not exists platform_user_data_scopes_user_idx on public.platform_user_data_scopes (user_id, scope_type);
create index if not exists hr_employees_company_status_idx on public.hr_employees (company_id, employment_status);

alter table public.platform_companies enable row level security;
alter table public.platform_modules enable row level security;
alter table public.platform_positions enable row level security;
alter table public.platform_profiles enable row level security;
alter table public.platform_roles enable row level security;
alter table public.platform_permissions enable row level security;
alter table public.platform_role_permissions enable row level security;
alter table public.platform_user_roles enable row level security;
alter table public.platform_user_data_scopes enable row level security;
alter table public.hr_employees enable row level security;

drop policy if exists "Public read enabled platform modules" on public.platform_modules;
create policy "Public read enabled platform modules"
  on public.platform_modules
  for select
  using (enabled = true);

drop policy if exists "Public read platform permissions" on public.platform_permissions;
create policy "Public read platform permissions"
  on public.platform_permissions
  for select
  using (
    exists (
      select 1
      from public.platform_modules m
      where m.code = platform_permissions.module_code
        and m.enabled = true
    )
  );

insert into public.platform_modules (code, name, description, sort_order)
values
  ('portal', '登入入口網', '帳號登入、模組入口、個人權限與系統通知。', 10),
  ('system', '權限中心', '使用者、角色、職位、權限矩陣與資料範圍管理。', 20),
  ('hr', '人資系統', '員工主檔、組織、職位、到離職與帳號狀態。', 30),
  ('accounting', '會計系統', '收支、請款、付款、核准流程與財務報表。', 40),
  ('care', '照顧服務', '居家照顧、日間照顧、個案、排班與服務紀錄。', 50),
  ('general_affairs', '總務系統', '採購、資產、用品、維修與供應商。', 60),
  ('projects', '敏捷專案管理', '專案、任務、看板、負責人與進度追蹤。', 70),
  ('cms', '網站後台管理', '文章、頁面、活動、媒體、SEO 與發布審核。', 80)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order;

insert into public.platform_permissions (code, module_code, resource, action, name)
values
  ('portal.dashboard.view', 'portal', 'dashboard', 'view', '查看入口網'),
  ('system.users.view', 'system', 'users', 'view', '查看使用者'),
  ('system.users.manage', 'system', 'users', 'manage', '管理使用者'),
  ('system.roles.view', 'system', 'roles', 'view', '查看角色'),
  ('system.roles.manage', 'system', 'roles', 'manage', '管理角色'),
  ('system.permissions.view', 'system', 'permissions', 'view', '查看權限矩陣'),
  ('system.permissions.manage', 'system', 'permissions', 'manage', '管理權限矩陣'),
  ('hr.employee.view', 'hr', 'employee', 'view', '查看員工'),
  ('hr.employee.manage', 'hr', 'employee', 'manage', '管理員工'),
  ('hr.position.view', 'hr', 'position', 'view', '查看職位'),
  ('hr.position.manage', 'hr', 'position', 'manage', '管理職位'),
  ('accounting.invoice.view', 'accounting', 'invoice', 'view', '查看請款'),
  ('accounting.invoice.manage', 'accounting', 'invoice', 'manage', '管理請款'),
  ('accounting.invoice.approve', 'accounting', 'invoice', 'approve', '核准請款'),
  ('care.homecase.view', 'care', 'homecase', 'view', '查看居家照顧個案'),
  ('care.homecase.assign', 'care', 'homecase', 'assign', '指派居家照顧服務'),
  ('care.daycare.view', 'care', 'daycare', 'view', '查看日間照顧'),
  ('care.daycare.assign', 'care', 'daycare', 'assign', '指派日間照顧服務'),
  ('general_affairs.asset.view', 'general_affairs', 'asset', 'view', '查看資產'),
  ('general_affairs.asset.manage', 'general_affairs', 'asset', 'manage', '管理資產'),
  ('projects.board.view', 'projects', 'board', 'view', '查看看板'),
  ('projects.board.manage', 'projects', 'board', 'manage', '管理看板'),
  ('cms.content.view', 'cms', 'content', 'view', '查看網站內容'),
  ('cms.content.manage', 'cms', 'content', 'manage', '管理網站內容'),
  ('cms.content.publish', 'cms', 'content', 'publish', '發布網站內容')
on conflict (code) do update set
  module_code = excluded.module_code,
  resource = excluded.resource,
  action = excluded.action,
  name = excluded.name;

create or replace function public.get_platform_user_context(target_user_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'user_id', p.user_id,
    'email', coalesce(p.email, au.email),
    'display_name', p.display_name,
    'company_id', p.company_id,
    'account_status', p.account_status,
    'roles', coalesce(roles.roles, '[]'::jsonb),
    'position', case
      when pos.id is null then null
      else jsonb_build_object('id', pos.id, 'code', pos.code, 'name', pos.name)
    end,
    'permissions', coalesce(perms.permissions, '[]'::jsonb),
    'data_scope', coalesce(scopes.data_scope, '[]'::jsonb),
    'enabled_modules', coalesce(modules.enabled_modules, '[]'::jsonb)
  )
  from public.platform_profiles p
  left join auth.users au on au.id = p.user_id
  left join public.platform_positions pos on pos.id = p.position_id
  left join lateral (
    select jsonb_agg(distinct r.code) as roles
    from public.platform_user_roles ur
    join public.platform_roles r on r.id = ur.role_id
    where ur.user_id = p.user_id
      and r.status = 'active'
      and (ur.expires_at is null or ur.expires_at > now())
  ) roles on true
  left join lateral (
    select jsonb_agg(distinct rp.permission_code) as permissions
    from public.platform_user_roles ur
    join public.platform_roles r on r.id = ur.role_id
    join public.platform_role_permissions rp on rp.role_id = r.id
    join public.platform_permissions perm on perm.code = rp.permission_code
    join public.platform_modules m on m.code = perm.module_code
    where ur.user_id = p.user_id
      and r.status = 'active'
      and m.enabled = true
      and (ur.expires_at is null or ur.expires_at > now())
  ) perms on true
  left join lateral (
    select jsonb_agg(
      jsonb_build_object(
        'scope_type', uds.scope_type,
        'company_id', uds.company_id,
        'institution_id', uds.institution_id,
        'region_id', uds.region_id,
        'department_id', uds.department_id,
        'business_unit_id', uds.business_unit_id,
        'class_id', uds.class_id,
        'case_id', uds.case_id
      )
      order by uds.created_at
    ) as data_scope
    from public.platform_user_data_scopes uds
    where uds.user_id = p.user_id
  ) scopes on true
  left join lateral (
    select jsonb_agg(distinct perm.module_code) as enabled_modules
    from public.platform_user_roles ur
    join public.platform_roles r on r.id = ur.role_id
    join public.platform_role_permissions rp on rp.role_id = r.id
    join public.platform_permissions perm on perm.code = rp.permission_code
    join public.platform_modules m on m.code = perm.module_code
    where ur.user_id = p.user_id
      and r.status = 'active'
      and m.enabled = true
      and (ur.expires_at is null or ur.expires_at > now())
  ) modules on true
  where p.user_id = target_user_id;
$$;

comment on function public.get_platform_user_context(uuid) is
  'Returns the login portal context used by every Suiyuecare module: identity, roles, permissions, data scope, and enabled modules.';
