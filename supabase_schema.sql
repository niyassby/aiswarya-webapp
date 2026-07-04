-- ==========================================
-- SUPABASE SCHEMA - SALES & PURCHASE MANAGEMENT
-- ==========================================

-- Enable PGCrypto for password hashing in admin user creation
create extension if not exists pgcrypto;

-- 1. ENUMS
create type app_role as enum ('sales_admin', 'accounts', 'manager', 'super_admin');
create type order_status as enum ('enquiry', 'invoice', 'purchase', 'completed', 'cancelled');
create type purchase_status as enum ('requested', 'ordered', 'received', 'fulfilled', 'cancelled');
create type complaint_status as enum ('open', 'assigned', 'in_progress', 'resolved', 'closed');
create type complaint_priority as enum ('low', 'medium', 'high', 'urgent');

-- 2. SEQUENCES & AUTO-GENERATORS FOR HUMAN-READABLE NUMBERS
create sequence if not exists order_no_seq;
create or replace function next_order_no() returns text as $$
begin
  return 'ORD-' || to_char(now(), 'YYYYMM') || '-' || lpad(nextval('order_no_seq')::text, 4, '0');
end;
$$ language plpgsql;

create sequence if not exists request_no_seq;
create or replace function next_request_no() returns text as $$
begin
  return 'PR-' || to_char(now(), 'YYYYMM') || '-' || lpad(nextval('request_no_seq')::text, 4, '0');
end;
$$ language plpgsql;

create sequence if not exists complaint_no_seq;
create or replace function next_complaint_no() returns text as $$
begin
  return 'CMP-' || to_char(now(), 'YYYYMM') || '-' || lpad(nextval('complaint_no_seq')::text, 4, '0');
end;
$$ language plpgsql;

-- 3. TABLES

-- Profiles (extends auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- User Roles (many-to-many)
create table user_roles (
  user_id uuid not null references profiles(id) on delete cascade,
  role app_role not null,
  assigned_by uuid references profiles(id),
  assigned_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- Invitations / Pending Users
create table invited_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  role app_role[] not null,
  invited_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- Customers
create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  address text,
  tax_id text, -- GST/Tax ID
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Products Catalog
create table products (
  id uuid primary key default gen_random_uuid(),
  barcode text unique,
  name text not null,
  specs text,
  stock_quantity integer not null default 0,
  unit_price numeric(12,2) not null default 0.00,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Orders
create table orders (
  id uuid primary key default gen_random_uuid(),
  order_no text unique not null default next_order_no(),
  customer_id uuid not null references customers(id) on delete restrict,
  status order_status not null default 'enquiry',
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Order Items
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  barcode text, -- matches product barcode (optional for custom items)
  item_name text not null,
  specs text,
  is_custom boolean default false,
  quantity integer not null default 1,
  unit_price numeric(12,2) not null default 0.00,
  created_at timestamptz not null default now()
);

-- Order Status History
create table order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  from_status order_status,
  to_status order_status not null,
  changed_by uuid references profiles(id),
  changed_at timestamptz not null default now(),
  note text
);

-- Purchase Requests
create table purchase_requests (
  id uuid primary key default gen_random_uuid(),
  request_no text unique not null default next_request_no(),
  order_id uuid references orders(id) on delete set null,
  product_name text not null,
  specs text,
  quantity integer not null default 1,
  supplier_info text,
  status purchase_status not null default 'requested',
  requested_by uuid references profiles(id),
  expected_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Purchase Request Comments
create table purchase_request_comments (
  id uuid primary key default gen_random_uuid(),
  purchase_request_id uuid not null references purchase_requests(id) on delete cascade,
  author_id uuid references profiles(id) on delete set null,
  comment text not null,
  created_at timestamptz not null default now()
);

-- Complaints
create table complaints (
  id uuid primary key default gen_random_uuid(),
  complaint_no text unique not null default next_complaint_no(),
  subject text not null,
  description text,
  customer_id uuid references customers(id) on delete set null,
  order_id uuid references orders(id) on delete set null,
  priority complaint_priority not null default 'medium',
  status complaint_status not null default 'open',
  raised_by uuid references profiles(id) not null,
  assigned_to uuid references profiles(id) on delete set null,
  assigned_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Complaint Comments
create table complaint_comments (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references complaints(id) on delete cascade,
  author_id uuid references profiles(id) on delete set null,
  comment text not null,
  created_at timestamptz not null default now()
);

-- Audit Log
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

-- 4. HELPER FUNCTIONS FOR ROLE-BASED ACCESS CONTROL
create or replace function public.has_role(_role app_role)
returns boolean as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = _role
  );
$$ language sql security definer stable;

create or replace function public.has_any_role(variadic _roles app_role[])
returns boolean as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = any(_roles)
  );
$$ language sql security definer stable;


-- Enable RLS on all tables
alter table profiles enable row level security;
alter table user_roles enable row level security;
alter table invited_users enable row level security;
alter table customers enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table order_status_history enable row level security;
alter table purchase_requests enable row level security;
alter table purchase_request_comments enable row level security;
alter table complaints enable row level security;
alter table complaint_comments enable row level security;
alter table audit_log enable row level security;

-- PROFILES Policies
create policy "Allow reading all profiles to authenticated users" on profiles
  for select using (auth.role() = 'authenticated');

create policy "Allow updates to own profile" on profiles
  for update using (auth.uid() = id);

create policy "Allow full control to super admins on profiles" on profiles
  for all using (public.has_role('super_admin'));

-- USER ROLES Policies
create policy "Allow reading user roles to authenticated users" on user_roles
  for select using (auth.role() = 'authenticated');

create policy "Allow full control to super admins on user_roles" on user_roles
  for all using (public.has_role('super_admin'));

-- INVITED USERS Policies
create policy "Allow reading invitations to super admins" on invited_users
  for select using (public.has_role('super_admin'));

create policy "Allow full control to super admins on invited_users" on invited_users
  for all using (public.has_role('super_admin'));

-- CUSTOMERS Policies
create policy "Allow reading customers to all staff" on customers
  for select using (auth.role() = 'authenticated');

create policy "Allow customer creation to sales_admin and super_admin" on customers
  for insert with check (public.has_any_role('sales_admin', 'super_admin'));

create policy "Allow customer updates to sales_admin and super_admin" on customers
  for update using (public.has_any_role('sales_admin', 'super_admin'));

-- PRODUCTS Policies
create policy "Allow reading products to all staff" on products
  for select using (auth.role() = 'authenticated');

create policy "Allow product modification to manager, sales_admin, super_admin" on products
  for all using (public.has_any_role('manager', 'sales_admin', 'super_admin'));

-- ORDERS Policies
create policy "Allow reading orders based on roles" on orders
  for select using (
    public.has_any_role('super_admin', 'manager')
    or (public.has_role('accounts') and status != 'enquiry')
    or (public.has_role('sales_admin') and created_by = auth.uid())
  );

create policy "Allow order creation to sales_admin and super_admin" on orders
  for insert with check (public.has_any_role('sales_admin', 'super_admin'));

create policy "Allow order updates to authorized roles" on orders
  for update using (
    public.has_any_role('super_admin', 'manager')
    or (public.has_role('accounts') and status != 'enquiry')
    or (public.has_role('sales_admin') and created_by = auth.uid())
  );

-- ORDER ITEMS Policies
create policy "Allow reading order items based on order access" on order_items
  for select using (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
    )
  );

create policy "Allow order items creation/update to sales_admin and super_admin" on order_items
  for all using (public.has_any_role('sales_admin', 'super_admin'));

-- ORDER STATUS HISTORY Policies
create policy "Allow reading status history based on order access" on order_status_history
  for select using (
    exists (
      select 1 from public.orders
      where orders.id = order_status_history.order_id
    )
  );

create policy "Allow status history logging to all staff" on order_status_history
  for insert with check (auth.role() = 'authenticated');

-- PURCHASE REQUESTS Policies
create policy "Allow reading purchase requests based on roles" on purchase_requests
  for select using (
    public.has_any_role('super_admin', 'manager', 'accounts')
    or (public.has_role('sales_admin') and requested_by = auth.uid())
  );

create policy "Allow PR creation to sales_admin, manager, super_admin" on purchase_requests
  for insert with check (public.has_any_role('sales_admin', 'manager', 'super_admin'));

create policy "Allow PR updates to managers and super admins" on purchase_requests
  for update using (public.has_any_role('manager', 'super_admin'));

-- PURCHASE REQUEST COMMENTS Policies
create policy "Allow comments view based on PR access" on purchase_request_comments
  for select using (
    exists (
      select 1 from public.purchase_requests
      where purchase_requests.id = purchase_request_comments.purchase_request_id
    )
  );

create policy "Allow comments creation to all staff" on purchase_request_comments
  for insert with check (auth.role() = 'authenticated' and auth.uid() = author_id);

-- COMPLAINTS Policies
create policy "Allow reading complaints based on involvement or admin role" on complaints
  for select using (
    public.has_any_role('super_admin', 'manager')
    or raised_by = auth.uid()
    or assigned_to = auth.uid()
    or assigned_by = auth.uid()
  );

create policy "Allow filing complaints to all staff" on complaints
  for insert with check (auth.role() = 'authenticated');

create policy "Allow updating complaints based on involvement or admin role" on complaints
  for update using (
    public.has_any_role('super_admin', 'manager')
    or raised_by = auth.uid()
    or assigned_to = auth.uid()
    or assigned_by = auth.uid()
  );

-- COMPLAINT COMMENTS Policies
create policy "Allow complaint comments view based on complaint access" on complaint_comments
  for select using (
    exists (
      select 1 from public.complaints
      where complaints.id = complaint_comments.complaint_id
    )
  );

create policy "Allow complaint comments insertion to all staff" on complaint_comments
  for insert with check (auth.role() = 'authenticated' and auth.uid() = author_id);

-- AUDIT LOG Policies
create policy "Allow audit log view to super admins only" on audit_log
  for select using (public.has_role('super_admin'));

create policy "Allow appending audit logs to authenticated sessions" on audit_log
  for insert with check (auth.role() = 'authenticated');

-- ADDITIONAL POLICIES FOR ACCEPTING INVITATIONS
-- Allow profile insertion on sign up
create policy "Allow profile insertion on signup" on profiles
  for insert with check (auth.uid() = id);

-- Allow user role insertion during registration (client-side)
create policy "Allow user role insertion during registration" on user_roles
  for insert with check (auth.uid() = user_id);

-- Allow deletion of own invitation during registration
create policy "Allow invitation deletion by authenticated users" on invited_users
  for delete using (true);

