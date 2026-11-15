-- AWLAD AL RAJHI (أولاد الراجحي) – Complete Supabase Schema, Storage & RLS Policies
-- Run this SQL in your Supabase SQL Editor when connecting your Supabase project.

create extension if not exists "pgcrypto";

-- 1. Authorized Admin Users Table (No public registration)
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role text not null default 'admin' check (role in ('admin', 'owner')),
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  );
$$;

create policy "Admins can view admin_users"
  on public.admin_users for select
  to authenticated
  using (public.is_admin());

-- 2. Categories Table
create table if not exists public.categories (
  id text primary key,
  slug text not null unique,
  name_en text not null,
  name_ar text not null,
  description_en text default '',
  description_ar text default '',
  cover_image text default '',
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.categories enable row level security;

create policy "Public can read categories"
  on public.categories for select
  to anon, authenticated
  using (true);

create policy "Only admins can insert categories"
  on public.categories for insert
  to authenticated
  with check (public.is_admin());

create policy "Only admins can update categories"
  on public.categories for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Only admins can delete categories"
  on public.categories for delete
  to authenticated
  using (public.is_admin());

-- 3. Products Table
create table if not exists public.products (
  id text primary key,
  category_id text not null references public.categories(id) on delete restrict,
  title_en text not null,
  title_ar text not null,
  description_en text default '',
  description_ar text default '',
  materials_en text default '',
  materials_ar text default '',
  price numeric(12, 2),
  discount_price numeric(12, 2),
  images text[] not null default '{}',
  is_best_seller boolean not null default false,
  is_featured boolean not null default false,
  is_published boolean not null default true,
  availability text not null default 'in-stock' check (availability in ('in-stock', 'made-to-order', 'out-of-stock')),
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products enable row level security;

create policy "Public can read published products"
  on public.products for select
  to anon, authenticated
  using (is_published = true or public.is_admin());

create policy "Only admins can modify products"
  on public.products for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 4. Customer Reviews Table
create table if not exists public.customer_reviews (
  id text primary key,
  customer_name text default '',
  comment_ar text not null,
  comment_en text default '',
  screenshot_url text default '',
  show_stars boolean not null default true,
  rating integer not null default 5 check (rating between 1 and 5),
  status text not null default 'approved' check (status in ('approved', 'pending', 'rejected')),
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.customer_reviews enable row level security;

create policy "Public can read approved active reviews"
  on public.customer_reviews for select
  to anon, authenticated
  using ((status = 'approved' and is_active = true) or public.is_admin());

create policy "Only admins can modify reviews"
  on public.customer_reviews for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 5. Exclusive Offers Table
create table if not exists public.offers (
  id text primary key,
  title_en text not null,
  title_ar text not null,
  subtitle_en text default '',
  subtitle_ar text default '',
  description_en text default '',
  description_ar text default '',
  original_price numeric(12, 2),
  discount_price numeric(12, 2),
  image_url text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.offers enable row level security;

create policy "Public can read active offers"
  on public.offers for select
  to anon, authenticated
  using (is_active = true or public.is_admin());

create policy "Only admins can modify offers"
  on public.offers for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 6. Advertising Banners Table
create table if not exists public.banners (
  id text primary key,
  title_en text not null,
  title_ar text not null,
  subtitle_en text default '',
  subtitle_ar text default '',
  image_url text not null,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.banners enable row level security;

create policy "Public can read active banners"
  on public.banners for select
  to anon, authenticated
  using (is_active = true or public.is_admin());

create policy "Only admins can modify banners"
  on public.banners for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 7. Videos Table
create table if not exists public.videos (
  id text primary key,
  title_en text not null,
  title_ar text not null,
  video_url text not null,
  thumbnail_url text default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.videos enable row level security;

create policy "Public can read active videos"
  on public.videos for select
  to anon, authenticated
  using (is_active = true or public.is_admin());

create policy "Only admins can modify videos"
  on public.videos for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 8. Showroom Settings (Single row id = 'default')
create table if not exists public.showroom_settings (
  id text primary key default 'default',
  brand_name_en text not null default 'AWLAD AL RAJHI',
  brand_name_ar text not null default 'أولاد الراجحي',
  slogan text not null default 'WHERE ELEGANCE MEETS EXCELLENCE',
  phone text not null default '01275979910',
  whatsapp_url text not null default 'https://wa.me/201275979910',
  facebook_url text default '',
  instagram_url text default '',
  showroom_address_en text default '',
  showroom_address_ar text default '',
  google_maps_url text default '',
  google_maps_embed_url text default '',
  latitude text default '',
  longitude text default '',
  review_display_mode text not null default 'cards',
  whatsapp_screenshots text[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.showroom_settings enable row level security;

create policy "Public can read showroom settings"
  on public.showroom_settings for select
  to anon, authenticated
  using (true);

create policy "Only admins can update showroom settings"
  on public.showroom_settings for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 9. Activity / Recent Updates Log
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_email text,
  action_en text not null,
  action_ar text not null,
  created_at timestamptz not null default now()
);

alter table public.activity_logs enable row level security;

create policy "Only admins can read/write activity logs"
  on public.activity_logs for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 10. Storage Bucket for Product, Category, Offer & Review Media
insert into storage.buckets (id, name, public)
values ('showroom-media', 'showroom-media', true)
on conflict (id) do nothing;

create policy "Public can view showroom media"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'showroom-media');

create policy "Only admins can upload showroom media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'showroom-media' and public.is_admin());

create policy "Only admins can update or delete showroom media"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'showroom-media' and public.is_admin())
  with check (bucket_id = 'showroom-media' and public.is_admin());
