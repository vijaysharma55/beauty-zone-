-- Reproducible BeautyZone Supabase schema and policy baseline.

-- Requires a standard Supabase project with auth and storage schemas.

create extension if not exists pgcrypto;

create schema if not exists private;

revoke all on schema private from public;

grant usage on schema private to anon, authenticated;

create table if not exists public."profiles" (
  "id" uuid not null,
  "email" text not null,
  "name" text default ''::text not null,
  "role" text default 'salon_owner'::text not null,
  "created_at" timestamptz default now() not null,
  "updated_at" timestamptz default now() not null
);

create table if not exists public."salons" (
  "id" uuid default gen_random_uuid() not null,
  "owner_id" uuid not null,
  "name" text not null,
  "slug" text not null,
  "tagline" text default ''::text not null,
  "description" text default ''::text not null,
  "logo_url" text default ''::text not null,
  "cover_image" text default ''::text not null,
  "gallery" jsonb default '[]'::jsonb not null,
  "phone" text default ''::text not null,
  "email" text default ''::text not null,
  "whatsapp" text default ''::text not null,
  "address_line" text default ''::text not null,
  "city" text default ''::text not null,
  "state" text default ''::text not null,
  "postal_code" text default ''::text not null,
  "country" text default 'India'::text not null,
  "map_url" text default ''::text not null,
  "instagram" text default ''::text not null,
  "facebook" text default ''::text not null,
  "hero_title" text default ''::text not null,
  "hero_subtitle" text default ''::text not null,
  "theme" jsonb default '{}'::jsonb not null,
  "website_published" bool default false not null,
  "published_at" timestamptz,
  "status" text default 'draft'::text not null,
  "submitted_at" timestamptz,
  "approved_at" timestamptz,
  "review_note" text default ''::text not null,
  "reviewed_at" timestamptz,
  "suspended" bool default false not null,
  "suspended_reason" text default ''::text not null,
  "suspended_at" timestamptz,
  "template_id" text default 'luxe'::text not null,
  "timings" jsonb default '[]'::jsonb not null,
  "owner_name" text default ''::text not null,
  "owner_phone" text default ''::text not null,
  "onboarding_completed" bool default false not null,
  "created_at" timestamptz default now() not null,
  "updated_at" timestamptz default now() not null
);

create table if not exists public."salon_versions" (
  "id" uuid default gen_random_uuid() not null,
  "salon_id" uuid not null,
  "version" int4 not null,
  "status" text not null,
  "snapshot" jsonb not null,
  "content_hash" text,
  "submitted_at" timestamptz default now() not null,
  "reviewed_at" timestamptz,
  "reviewed_by" uuid,
  "review_note" text default ''::text not null
);

create table if not exists public."services" (
  "id" uuid default gen_random_uuid() not null,
  "salon_id" uuid not null,
  "name" text not null,
  "category" text default 'other'::text not null,
  "description" text default ''::text not null,
  "price_paise" int8 default 0 not null,
  "duration_minutes" int4 default 30 not null,
  "image_url" text default ''::text not null,
  "active" bool default true not null,
  "sort_order" int4 default 0 not null,
  "created_at" timestamptz default now() not null,
  "updated_at" timestamptz default now() not null
);

create table if not exists public."staff" (
  "id" uuid default gen_random_uuid() not null,
  "salon_id" uuid not null,
  "name" text not null,
  "role_title" text default ''::text not null,
  "bio" text default ''::text not null,
  "photo_url" text default ''::text not null,
  "specialties" jsonb default '[]'::jsonb not null,
  "active" bool default true not null,
  "booking_enabled" bool default true not null,
  "sort_order" int4 default 0 not null,
  "created_at" timestamptz default now() not null,
  "updated_at" timestamptz default now() not null
);

create table if not exists public."subscriptions" (
  "id" uuid default gen_random_uuid() not null,
  "salon_id" uuid not null,
  "plan" text default 'trial'::text not null,
  "status" text default 'trialing'::text not null,
  "current_period_end" timestamptz,
  "created_at" timestamptz default now() not null,
  "updated_at" timestamptz default now() not null
);

create table if not exists public."bookings" (
  "id" uuid default gen_random_uuid() not null,
  "salon_id" uuid,
  "reference" text not null,
  "full_name" text not null,
  "phone" text not null,
  "email" text,
  "service" text not null,
  "service_id" uuid,
  "category" text default ''::text not null,
  "stylist" text default ''::text not null,
  "staff_id" uuid,
  "booking_date" date not null,
  "booking_time" text not null,
  "location_type" text default 'salon'::text not null,
  "branch" text default ''::text not null,
  "address" text default ''::text not null,
  "locality" text default ''::text not null,
  "distance_km" numeric,
  "bridal_trial" bool default false not null,
  "notes" text default ''::text not null,
  "promo_code" text,
  "estimated_total" int8 default 0 not null,
  "advance_paid" int8 default 0 not null,
  "advance_ref" text,
  "status" text default 'requested'::text not null,
  "source" text default 'public'::text not null,
  "created_by" uuid,
  "created_at" timestamptz default now() not null,
  "updated_at" timestamptz default now() not null
);

create table if not exists public."site_sections" (
  "id" uuid default gen_random_uuid() not null,
  "owner_id" uuid,
  "section_key" text not null,
  "payload" jsonb default '{}'::jsonb not null,
  "is_published" bool default true not null,
  "updated_by" uuid,
  "created_at" timestamptz default now() not null,
  "updated_at" timestamptz default now() not null
);

create table if not exists public."gallery_items" (
  "id" uuid default gen_random_uuid() not null,
  "salon_id" uuid,
  "owner_id" uuid,
  "item_type" text default 'photo'::text not null,
  "title" text default ''::text not null,
  "description" text default ''::text not null,
  "category" text default ''::text not null,
  "service" text default ''::text not null,
  "image_url" text not null,
  "before_image_url" text,
  "artist" text default ''::text not null,
  "featured" bool default false not null,
  "active" bool default true not null,
  "sort_order" int4 default 0 not null,
  "created_at" timestamptz default now() not null,
  "updated_at" timestamptz default now() not null
);

create table if not exists public."salon_packages" (
  "id" uuid default gen_random_uuid() not null,
  "salon_id" uuid,
  "owner_id" uuid,
  "name" text not null,
  "description" text default ''::text not null,
  "services" jsonb default '[]'::jsonb not null,
  "duration" text default ''::text not null,
  "regular_price" int8 default 0 not null,
  "package_price" int8 default 0 not null,
  "discount" numeric default 0 not null,
  "savings" int8 default 0 not null,
  "validity" text default ''::text not null,
  "usage_rules" jsonb default '[]'::jsonb not null,
  "outlets" jsonb default '[]'::jsonb not null,
  "image_url" text default ''::text not null,
  "active" bool default true not null,
  "featured" bool default false not null,
  "sort_order" int4 default 0 not null,
  "created_at" timestamptz default now() not null,
  "updated_at" timestamptz default now() not null
);

create table if not exists public."videos" (
  "id" uuid default gen_random_uuid() not null,
  "salon_id" uuid,
  "owner_id" uuid,
  "url" text not null,
  "embed_url" text default ''::text not null,
  "platform" text default 'other'::text not null,
  "title" text default ''::text not null,
  "description" text default ''::text not null,
  "category" text default ''::text not null,
  "thumbnail" text default ''::text not null,
  "video_url" text default ''::text not null,
  "featured" bool default false not null,
  "active" bool default true not null,
  "views_count" text default ''::text not null,
  "views_numeric" int8 default 0 not null,
  "pin_count" int4 default 0 not null,
  "clicks_count" int8 default 0 not null,
  "engagement_score" numeric default 0 not null,
  "duration" text default ''::text not null,
  "author" text default ''::text not null,
  "sort_order" int4 default 0 not null,
  "created_at" timestamptz default now() not null,
  "updated_at" timestamptz default now() not null
);

create table if not exists public."branches" (
  "id" uuid default gen_random_uuid() not null,
  "salon_id" uuid,
  "owner_id" uuid,
  "name" text not null,
  "locality" text default ''::text not null,
  "address" text default ''::text not null,
  "phone" text default ''::text not null,
  "active" bool default true not null,
  "sort_order" int4 default 0 not null,
  "created_at" timestamptz default now() not null,
  "updated_at" timestamptz default now() not null
);

create table if not exists public."waitlist" (
  "id" uuid default gen_random_uuid() not null,
  "salon_id" uuid not null,
  "full_name" text not null,
  "phone" text not null,
  "email" text,
  "service" text not null,
  "requested_date" date not null,
  "requested_time" text not null,
  "status" text default 'pending'::text not null,
  "created_at" timestamptz default now() not null,
  "updated_at" timestamptz default now() not null
);

create table if not exists public."stylist_inquiries" (
  "id" uuid default gen_random_uuid() not null,
  "salon_id" uuid not null,
  "stylist_id" uuid,
  "stylist_name" text not null,
  "user_name" text not null,
  "user_phone" text not null,
  "message" text not null,
  "status" text default 'new'::text not null,
  "created_at" timestamptz default now() not null
);

create table if not exists public."service_reviews" (
  "id" uuid default gen_random_uuid() not null,
  "salon_id" uuid not null,
  "service_id" uuid,
  "booking_id" uuid,
  "customer_name" text not null,
  "rating" int4 not null,
  "title" text default ''::text not null,
  "review" text not null,
  "status" text default 'pending'::text not null,
  "created_at" timestamptz default now() not null
);

create table if not exists public."loyalty_accounts" (
  "id" uuid default gen_random_uuid() not null,
  "owner_id" uuid,
  "phone" text not null,
  "name" text default ''::text not null,
  "member_id" text not null,
  "tier" text default 'silver'::text not null,
  "total_points" int4 default 0 not null,
  "lifetime_points" int4 default 0 not null,
  "visits_count" int4 default 0 not null,
  "created_at" timestamptz default now() not null,
  "updated_at" timestamptz default now() not null
);

create table if not exists public."loyalty_transactions" (
  "id" uuid default gen_random_uuid() not null,
  "account_id" uuid not null,
  "booking_id" uuid,
  "salon_id" uuid,
  "service_title" text default ''::text not null,
  "bill_amount" int8 default 0 not null,
  "points" int4 not null,
  "transaction_type" text not null,
  "description" text default ''::text not null,
  "created_at" timestamptz default now() not null
);

create table if not exists public."loyalty_vouchers" (
  "id" uuid default gen_random_uuid() not null,
  "code" text not null,
  "account_id" uuid not null,
  "offer_id" text not null,
  "title" text not null,
  "discount_amount" int8 default 0 not null,
  "points_cost" int4 default 0 not null,
  "used" bool default false not null,
  "used_booking_id" uuid,
  "created_at" timestamptz default now() not null,
  "expires_at" timestamptz not null
);

create table if not exists public."platform_settings" (
  "key" text not null,
  "value" jsonb not null,
  "updated_by" uuid,
  "updated_at" timestamptz default now() not null
);

create table if not exists public."audit_logs" (
  "id" uuid default gen_random_uuid() not null,
  "actor_id" uuid,
  "action" text not null,
  "target_type" text,
  "target_id" text,
  "metadata" jsonb,
  "ip" inet,
  "created_at" timestamptz default now() not null
);

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.audit_logs'::regclass and conname = 'audit_logs_actor_id_fkey') then alter table public."audit_logs" add constraint "audit_logs_actor_id_fkey" FOREIGN KEY (actor_id) REFERENCES profiles(id) ON DELETE SET NULL; end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.audit_logs'::regclass and conname = 'audit_logs_pkey') then alter table public."audit_logs" add constraint "audit_logs_pkey" PRIMARY KEY (id); end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.bookings'::regclass and conname = 'bookings_location_type_check') then alter table public."bookings" add constraint "bookings_location_type_check" CHECK ((location_type = ANY (ARRAY['salon'::text, 'home'::text]))); end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.bookings'::regclass and conname = 'bookings_status_check') then alter table public."bookings" add constraint "bookings_status_check" CHECK ((status = ANY (ARRAY['requested'::text, 'confirmed'::text, 'declined'::text, 'completed'::text, 'cancelled'::text]))); end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.bookings'::regclass and conname = 'bookings_created_by_fkey') then alter table public."bookings" add constraint "bookings_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL; end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.bookings'::regclass and conname = 'bookings_salon_id_fkey') then alter table public."bookings" add constraint "bookings_salon_id_fkey" FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE; end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.bookings'::regclass and conname = 'bookings_service_id_fkey') then alter table public."bookings" add constraint "bookings_service_id_fkey" FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL; end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.bookings'::regclass and conname = 'bookings_staff_id_fkey') then alter table public."bookings" add constraint "bookings_staff_id_fkey" FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE SET NULL; end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.bookings'::regclass and conname = 'bookings_pkey') then alter table public."bookings" add constraint "bookings_pkey" PRIMARY KEY (id); end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.bookings'::regclass and conname = 'bookings_reference_key') then alter table public."bookings" add constraint "bookings_reference_key" UNIQUE (reference); end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.branches'::regclass and conname = 'branches_check') then alter table public."branches" add constraint "branches_check" CHECK (((salon_id IS NOT NULL) OR (owner_id IS NOT NULL))); end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.branches'::regclass and conname = 'branches_owner_id_fkey') then alter table public."branches" add constraint "branches_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE; end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.branches'::regclass and conname = 'branches_salon_id_fkey') then alter table public."branches" add constraint "branches_salon_id_fkey" FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE; end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.branches'::regclass and conname = 'branches_pkey') then alter table public."branches" add constraint "branches_pkey" PRIMARY KEY (id); end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.gallery_items'::regclass and conname = 'gallery_items_check') then alter table public."gallery_items" add constraint "gallery_items_check" CHECK (((salon_id IS NOT NULL) OR (owner_id IS NOT NULL))); end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.gallery_items'::regclass and conname = 'gallery_items_owner_id_fkey') then alter table public."gallery_items" add constraint "gallery_items_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE; end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.gallery_items'::regclass and conname = 'gallery_items_salon_id_fkey') then alter table public."gallery_items" add constraint "gallery_items_salon_id_fkey" FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE; end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.gallery_items'::regclass and conname = 'gallery_items_pkey') then alter table public."gallery_items" add constraint "gallery_items_pkey" PRIMARY KEY (id); end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.loyalty_accounts'::regclass and conname = 'loyalty_accounts_owner_id_fkey') then alter table public."loyalty_accounts" add constraint "loyalty_accounts_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE; end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.loyalty_accounts'::regclass and conname = 'loyalty_accounts_pkey') then alter table public."loyalty_accounts" add constraint "loyalty_accounts_pkey" PRIMARY KEY (id); end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.loyalty_accounts'::regclass and conname = 'loyalty_accounts_member_id_key') then alter table public."loyalty_accounts" add constraint "loyalty_accounts_member_id_key" UNIQUE (member_id); end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.loyalty_accounts'::regclass and conname = 'loyalty_accounts_phone_key') then alter table public."loyalty_accounts" add constraint "loyalty_accounts_phone_key" UNIQUE (phone); end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.loyalty_transactions'::regclass and conname = 'loyalty_transactions_account_id_fkey') then alter table public."loyalty_transactions" add constraint "loyalty_transactions_account_id_fkey" FOREIGN KEY (account_id) REFERENCES loyalty_accounts(id) ON DELETE CASCADE; end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.loyalty_transactions'::regclass and conname = 'loyalty_transactions_booking_id_fkey') then alter table public."loyalty_transactions" add constraint "loyalty_transactions_booking_id_fkey" FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL; end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.loyalty_transactions'::regclass and conname = 'loyalty_transactions_salon_id_fkey') then alter table public."loyalty_transactions" add constraint "loyalty_transactions_salon_id_fkey" FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE SET NULL; end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.loyalty_transactions'::regclass and conname = 'loyalty_transactions_pkey') then alter table public."loyalty_transactions" add constraint "loyalty_transactions_pkey" PRIMARY KEY (id); end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.loyalty_vouchers'::regclass and conname = 'loyalty_vouchers_account_id_fkey') then alter table public."loyalty_vouchers" add constraint "loyalty_vouchers_account_id_fkey" FOREIGN KEY (account_id) REFERENCES loyalty_accounts(id) ON DELETE CASCADE; end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.loyalty_vouchers'::regclass and conname = 'loyalty_vouchers_used_booking_id_fkey') then alter table public."loyalty_vouchers" add constraint "loyalty_vouchers_used_booking_id_fkey" FOREIGN KEY (used_booking_id) REFERENCES bookings(id) ON DELETE SET NULL; end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.loyalty_vouchers'::regclass and conname = 'loyalty_vouchers_pkey') then alter table public."loyalty_vouchers" add constraint "loyalty_vouchers_pkey" PRIMARY KEY (id); end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.loyalty_vouchers'::regclass and conname = 'loyalty_vouchers_code_key') then alter table public."loyalty_vouchers" add constraint "loyalty_vouchers_code_key" UNIQUE (code); end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.platform_settings'::regclass and conname = 'platform_settings_updated_by_fkey') then alter table public."platform_settings" add constraint "platform_settings_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES profiles(id) ON DELETE SET NULL; end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.platform_settings'::regclass and conname = 'platform_settings_pkey') then alter table public."platform_settings" add constraint "platform_settings_pkey" PRIMARY KEY (key); end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.profiles'::regclass and conname = 'profiles_role_check') then alter table public."profiles" add constraint "profiles_role_check" CHECK ((role = ANY (ARRAY['super_admin'::text, 'salon_owner'::text]))); end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.profiles'::regclass and conname = 'profiles_id_fkey') then alter table public."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE; end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.profiles'::regclass and conname = 'profiles_pkey') then alter table public."profiles" add constraint "profiles_pkey" PRIMARY KEY (id); end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.salon_packages'::regclass and conname = 'salon_packages_check') then alter table public."salon_packages" add constraint "salon_packages_check" CHECK (((salon_id IS NOT NULL) OR (owner_id IS NOT NULL))); end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.salon_packages'::regclass and conname = 'salon_packages_owner_id_fkey') then alter table public."salon_packages" add constraint "salon_packages_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE; end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.salon_packages'::regclass and conname = 'salon_packages_salon_id_fkey') then alter table public."salon_packages" add constraint "salon_packages_salon_id_fkey" FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE; end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.salon_packages'::regclass and conname = 'salon_packages_pkey') then alter table public."salon_packages" add constraint "salon_packages_pkey" PRIMARY KEY (id); end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.salon_versions'::regclass and conname = 'salon_versions_status_check') then alter table public."salon_versions" add constraint "salon_versions_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'changes_requested'::text, 'superseded'::text]))); end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.salon_versions'::regclass and conname = 'salon_versions_reviewed_by_fkey') then alter table public."salon_versions" add constraint "salon_versions_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES profiles(id) ON DELETE SET NULL; end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.salon_versions'::regclass and conname = 'salon_versions_salon_id_fkey') then alter table public."salon_versions" add constraint "salon_versions_salon_id_fkey" FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE; end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.salon_versions'::regclass and conname = 'salon_versions_pkey') then alter table public."salon_versions" add constraint "salon_versions_pkey" PRIMARY KEY (id); end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.salon_versions'::regclass and conname = 'salon_versions_salon_id_version_key') then alter table public."salon_versions" add constraint "salon_versions_salon_id_version_key" UNIQUE (salon_id, version); end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.salons'::regclass and conname = 'salons_status_check') then alter table public."salons" add constraint "salons_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'pending'::text, 'approved'::text, 'rejected'::text, 'changes_requested'::text]))); end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.salons'::regclass and conname = 'salons_template_id_check') then alter table public."salons" add constraint "salons_template_id_check" CHECK ((template_id = ANY (ARRAY['luxe'::text, 'minimal'::text, 'noir'::text, 'blush'::text]))); end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.salons'::regclass and conname = 'salons_owner_id_fkey') then alter table public."salons" add constraint "salons_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE; end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.salons'::regclass and conname = 'salons_pkey') then alter table public."salons" add constraint "salons_pkey" PRIMARY KEY (id); end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.salons'::regclass and conname = 'salons_owner_id_key') then alter table public."salons" add constraint "salons_owner_id_key" UNIQUE (owner_id); end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.salons'::regclass and conname = 'salons_slug_key') then alter table public."salons" add constraint "salons_slug_key" UNIQUE (slug); end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.service_reviews'::regclass and conname = 'service_reviews_rating_check') then alter table public."service_reviews" add constraint "service_reviews_rating_check" CHECK (((rating >= 1) AND (rating <= 5))); end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.service_reviews'::regclass and conname = 'service_reviews_status_check') then alter table public."service_reviews" add constraint "service_reviews_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))); end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.service_reviews'::regclass and conname = 'service_reviews_booking_id_fkey') then alter table public."service_reviews" add constraint "service_reviews_booking_id_fkey" FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL; end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.service_reviews'::regclass and conname = 'service_reviews_salon_id_fkey') then alter table public."service_reviews" add constraint "service_reviews_salon_id_fkey" FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE; end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.service_reviews'::regclass and conname = 'service_reviews_service_id_fkey') then alter table public."service_reviews" add constraint "service_reviews_service_id_fkey" FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL; end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.service_reviews'::regclass and conname = 'service_reviews_pkey') then alter table public."service_reviews" add constraint "service_reviews_pkey" PRIMARY KEY (id); end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.services'::regclass and conname = 'services_duration_minutes_check') then alter table public."services" add constraint "services_duration_minutes_check" CHECK (((duration_minutes >= 1) AND (duration_minutes <= 1440))); end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.services'::regclass and conname = 'services_price_paise_check') then alter table public."services" add constraint "services_price_paise_check" CHECK ((price_paise >= 0)); end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.services'::regclass and conname = 'services_salon_id_fkey') then alter table public."services" add constraint "services_salon_id_fkey" FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE; end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.services'::regclass and conname = 'services_pkey') then alter table public."services" add constraint "services_pkey" PRIMARY KEY (id); end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.site_sections'::regclass and conname = 'site_sections_owner_id_fkey') then alter table public."site_sections" add constraint "site_sections_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE; end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.site_sections'::regclass and conname = 'site_sections_updated_by_fkey') then alter table public."site_sections" add constraint "site_sections_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES profiles(id) ON DELETE SET NULL; end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.site_sections'::regclass and conname = 'site_sections_pkey') then alter table public."site_sections" add constraint "site_sections_pkey" PRIMARY KEY (id); end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.staff'::regclass and conname = 'staff_salon_id_fkey') then alter table public."staff" add constraint "staff_salon_id_fkey" FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE; end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.staff'::regclass and conname = 'staff_pkey') then alter table public."staff" add constraint "staff_pkey" PRIMARY KEY (id); end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.stylist_inquiries'::regclass and conname = 'stylist_inquiries_status_check') then alter table public."stylist_inquiries" add constraint "stylist_inquiries_status_check" CHECK ((status = ANY (ARRAY['new'::text, 'responded'::text, 'archived'::text]))); end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.stylist_inquiries'::regclass and conname = 'stylist_inquiries_salon_id_fkey') then alter table public."stylist_inquiries" add constraint "stylist_inquiries_salon_id_fkey" FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE; end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.stylist_inquiries'::regclass and conname = 'stylist_inquiries_stylist_id_fkey') then alter table public."stylist_inquiries" add constraint "stylist_inquiries_stylist_id_fkey" FOREIGN KEY (stylist_id) REFERENCES staff(id) ON DELETE SET NULL; end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.stylist_inquiries'::regclass and conname = 'stylist_inquiries_pkey') then alter table public."stylist_inquiries" add constraint "stylist_inquiries_pkey" PRIMARY KEY (id); end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.subscriptions'::regclass and conname = 'subscriptions_plan_check') then alter table public."subscriptions" add constraint "subscriptions_plan_check" CHECK ((plan = ANY (ARRAY['trial'::text, 'starter'::text, 'pro'::text, 'elite'::text]))); end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.subscriptions'::regclass and conname = 'subscriptions_status_check') then alter table public."subscriptions" add constraint "subscriptions_status_check" CHECK ((status = ANY (ARRAY['trialing'::text, 'active'::text, 'past_due'::text, 'canceled'::text]))); end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.subscriptions'::regclass and conname = 'subscriptions_salon_id_fkey') then alter table public."subscriptions" add constraint "subscriptions_salon_id_fkey" FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE; end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.subscriptions'::regclass and conname = 'subscriptions_pkey') then alter table public."subscriptions" add constraint "subscriptions_pkey" PRIMARY KEY (id); end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.subscriptions'::regclass and conname = 'subscriptions_salon_id_key') then alter table public."subscriptions" add constraint "subscriptions_salon_id_key" UNIQUE (salon_id); end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.videos'::regclass and conname = 'videos_check') then alter table public."videos" add constraint "videos_check" CHECK (((salon_id IS NOT NULL) OR (owner_id IS NOT NULL))); end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.videos'::regclass and conname = 'videos_owner_id_fkey') then alter table public."videos" add constraint "videos_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE; end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.videos'::regclass and conname = 'videos_salon_id_fkey') then alter table public."videos" add constraint "videos_salon_id_fkey" FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE; end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.videos'::regclass and conname = 'videos_pkey') then alter table public."videos" add constraint "videos_pkey" PRIMARY KEY (id); end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.waitlist'::regclass and conname = 'waitlist_status_check') then alter table public."waitlist" add constraint "waitlist_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'notified'::text, 'expired'::text]))); end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.waitlist'::regclass and conname = 'waitlist_salon_id_fkey') then alter table public."waitlist" add constraint "waitlist_salon_id_fkey" FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE; end if; end $$;

do $$ begin if not exists (select 1 from pg_constraint where conrelid = 'public.waitlist'::regclass and conname = 'waitlist_pkey') then alter table public."waitlist" add constraint "waitlist_pkey" PRIMARY KEY (id); end if; end $$;

CREATE OR REPLACE FUNCTION private.is_super_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'super_admin'
  );
$function$
;

CREATE OR REPLACE FUNCTION private.prevent_profile_role_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if (select auth.uid()) is not null
     and new.role is distinct from old.role
     and not (select private.is_super_admin()) then
    raise exception 'Only a super admin may change profile roles';
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.guard_profile_identity_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if (select auth.uid()) is not null and not (select public.is_super_admin()) then
    if new.id is distinct from old.id
       or new.email is distinct from old.email
       or new.created_at is distinct from old.created_at then
      raise exception 'Only trusted authentication flows may change profile identity fields';
    end if;
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.guard_public_booking_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if coalesce((select auth.jwt()->>'role'), 'anon') <> 'service_role'
     and not (select public.is_super_admin()) then
    if new.status <> 'requested' or new.source <> 'public' or new.advance_paid <> 0
       or new.advance_ref is not null then
      raise exception 'Public booking requests must start unpaid and requested';
    end if;
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.guard_public_child_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare claim_role text;
begin
  claim_role := coalesce((select auth.jwt()->>'role'), 'anon');
  if claim_role <> 'service_role' and not (select public.is_super_admin()) then
    if tg_table_name = 'waitlist' and new.status <> 'pending' then
      raise exception 'New waitlist requests must start as pending';
    elsif tg_table_name = 'stylist_inquiries' and new.status <> 'new' then
      raise exception 'New stylist inquiries must start as new';
    elsif tg_table_name = 'service_reviews' and new.status <> 'pending' then
      raise exception 'New customer reviews must start as pending';
    end if;
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.guard_salon_version_state()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if (select auth.uid()) is null or (select public.is_super_admin()) then return new; end if;
  if tg_op = 'INSERT' and new.status <> 'pending' then
    raise exception 'New salon versions must be submitted as pending';
  end if;
  if tg_op = 'UPDATE' then
    raise exception 'Only a super admin may change a submitted version';
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.guard_salon_workflow_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if (select auth.uid()) is null or (select public.is_super_admin()) then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.status <> 'draft' or new.website_published or new.suspended or new.approved_at is not null then
      raise exception 'New salon records must start as unpublished drafts';
    end if;
  else
    if new.owner_id is distinct from old.owner_id
       or new.status is distinct from old.status
       or new.website_published is distinct from old.website_published
       or new.published_at is distinct from old.published_at
       or new.submitted_at is distinct from old.submitted_at
       or new.approved_at is distinct from old.approved_at
       or new.reviewed_at is distinct from old.reviewed_at
       or new.review_note is distinct from old.review_note
       or new.suspended is distinct from old.suspended
       or new.suspended_reason is distinct from old.suspended_reason
       or new.suspended_at is distinct from old.suspended_at then
      raise exception 'Salon approval, publishing and suspension fields are admin-controlled';
    end if;
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$function$
;

drop trigger if exists "on_auth_user_created" on "auth"."users";

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

drop trigger if exists "guard_public_booking_insert" on "public"."bookings";

CREATE TRIGGER guard_public_booking_insert BEFORE INSERT ON public.bookings FOR EACH ROW EXECUTE FUNCTION guard_public_booking_insert();

drop trigger if exists "guard_profile_identity_fields" on "public"."profiles";

CREATE TRIGGER guard_profile_identity_fields BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION guard_profile_identity_fields();

drop trigger if exists "prevent_profile_role_change" on "public"."profiles";

CREATE TRIGGER prevent_profile_role_change BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION private.prevent_profile_role_change();

drop trigger if exists "guard_salon_version_state" on "public"."salon_versions";

CREATE TRIGGER guard_salon_version_state BEFORE INSERT OR UPDATE ON public.salon_versions FOR EACH ROW EXECUTE FUNCTION guard_salon_version_state();

drop trigger if exists "guard_salon_workflow_fields" on "public"."salons";

CREATE TRIGGER guard_salon_workflow_fields BEFORE INSERT OR UPDATE ON public.salons FOR EACH ROW EXECUTE FUNCTION guard_salon_workflow_fields();

drop trigger if exists "guard_service_reviews_public_status" on "public"."service_reviews";

CREATE TRIGGER guard_service_reviews_public_status BEFORE INSERT ON public.service_reviews FOR EACH ROW EXECUTE FUNCTION guard_public_child_status();

drop trigger if exists "guard_stylist_inquiries_public_status" on "public"."stylist_inquiries";

CREATE TRIGGER guard_stylist_inquiries_public_status BEFORE INSERT ON public.stylist_inquiries FOR EACH ROW EXECUTE FUNCTION guard_public_child_status();

drop trigger if exists "guard_waitlist_public_status" on "public"."waitlist";

CREATE TRIGGER guard_waitlist_public_status BEFORE INSERT ON public.waitlist FOR EACH ROW EXECUTE FUNCTION guard_public_child_status();

alter table public."profiles" enable row level security;

alter table public."salons" enable row level security;

alter table public."salon_versions" enable row level security;

alter table public."services" enable row level security;

alter table public."staff" enable row level security;

alter table public."subscriptions" enable row level security;

alter table public."bookings" enable row level security;

alter table public."site_sections" enable row level security;

alter table public."gallery_items" enable row level security;

alter table public."salon_packages" enable row level security;

alter table public."videos" enable row level security;

alter table public."branches" enable row level security;

alter table public."waitlist" enable row level security;

alter table public."stylist_inquiries" enable row level security;

alter table public."service_reviews" enable row level security;

alter table public."loyalty_accounts" enable row level security;

alter table public."loyalty_transactions" enable row level security;

alter table public."loyalty_vouchers" enable row level security;

alter table public."platform_settings" enable row level security;

alter table public."audit_logs" enable row level security;

drop policy if exists "audit_logs_admin_select" on "public"."audit_logs";

create policy "audit_logs_admin_select" on "public"."audit_logs" as permissive for select to "authenticated" using (( SELECT private.is_super_admin() AS is_super_admin));

drop policy if exists "bookings_owner_admin_select" on "public"."bookings";

create policy "bookings_owner_admin_select" on "public"."bookings" as permissive for select to "authenticated" using ((( SELECT private.is_super_admin() AS is_super_admin) OR (EXISTS ( SELECT 1
   FROM salons s
  WHERE ((s.id = bookings.salon_id) AND (s.owner_id = ( SELECT auth.uid() AS uid)))))));

drop policy if exists "bookings_owner_admin_update" on "public"."bookings";

create policy "bookings_owner_admin_update" on "public"."bookings" as permissive for update to "authenticated" using ((( SELECT private.is_super_admin() AS is_super_admin) OR (EXISTS ( SELECT 1
   FROM salons s
  WHERE ((s.id = bookings.salon_id) AND (s.owner_id = ( SELECT auth.uid() AS uid))))))) with check ((( SELECT private.is_super_admin() AS is_super_admin) OR (EXISTS ( SELECT 1
   FROM salons s
  WHERE ((s.id = bookings.salon_id) AND (s.owner_id = ( SELECT auth.uid() AS uid)))))));

drop policy if exists "bookings_public_insert" on "public"."bookings";

create policy "bookings_public_insert" on "public"."bookings" as permissive for insert to "anon", "authenticated" with check (((status = 'requested'::text) AND (source = 'public'::text) AND (advance_paid = 0) AND ((created_by IS NULL) OR (created_by = ( SELECT auth.uid() AS uid))) AND (EXISTS ( SELECT 1
   FROM salons s
  WHERE ((s.id = bookings.salon_id) AND s.website_published AND (s.status = 'approved'::text) AND (NOT s.suspended)))) AND ((service_id IS NULL) OR (EXISTS ( SELECT 1
   FROM services sv
  WHERE ((sv.id = bookings.service_id) AND (sv.salon_id = bookings.salon_id) AND sv.active)))) AND ((staff_id IS NULL) OR (EXISTS ( SELECT 1
   FROM staff st
  WHERE ((st.id = bookings.staff_id) AND (st.salon_id = bookings.salon_id) AND st.active AND st.booking_enabled))))));

drop policy if exists "branches_owner_admin_delete" on "public"."branches";

create policy "branches_owner_admin_delete" on "public"."branches" as permissive for delete to "authenticated" using (((owner_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_super_admin() AS is_super_admin) OR (EXISTS ( SELECT 1
   FROM salons s
  WHERE ((s.id = branches.salon_id) AND (s.owner_id = ( SELECT auth.uid() AS uid)))))));

drop policy if exists "branches_owner_admin_insert" on "public"."branches";

create policy "branches_owner_admin_insert" on "public"."branches" as permissive for insert to "authenticated" with check (((owner_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_super_admin() AS is_super_admin) OR (EXISTS ( SELECT 1
   FROM salons s
  WHERE ((s.id = branches.salon_id) AND (s.owner_id = ( SELECT auth.uid() AS uid)))))));

drop policy if exists "branches_owner_admin_update" on "public"."branches";

create policy "branches_owner_admin_update" on "public"."branches" as permissive for update to "authenticated" using (((owner_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_super_admin() AS is_super_admin) OR (EXISTS ( SELECT 1
   FROM salons s
  WHERE ((s.id = branches.salon_id) AND (s.owner_id = ( SELECT auth.uid() AS uid))))))) with check (((owner_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_super_admin() AS is_super_admin) OR (EXISTS ( SELECT 1
   FROM salons s
  WHERE ((s.id = branches.salon_id) AND (s.owner_id = ( SELECT auth.uid() AS uid)))))));

drop policy if exists "branches_public_read" on "public"."branches";

create policy "branches_public_read" on "public"."branches" as permissive for select to "anon", "authenticated" using ((active AND (((salon_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM salons s
  WHERE ((s.id = branches.salon_id) AND s.website_published AND (s.status = 'approved'::text) AND (NOT s.suspended))))) OR ((owner_id IS NOT NULL) AND ( SELECT private.is_super_admin() AS is_super_admin)))));

drop policy if exists "gallery_items_owner_admin_delete" on "public"."gallery_items";

create policy "gallery_items_owner_admin_delete" on "public"."gallery_items" as permissive for delete to "authenticated" using (((owner_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_super_admin() AS is_super_admin) OR (EXISTS ( SELECT 1
   FROM salons s
  WHERE ((s.id = gallery_items.salon_id) AND (s.owner_id = ( SELECT auth.uid() AS uid)))))));

drop policy if exists "gallery_items_owner_admin_insert" on "public"."gallery_items";

create policy "gallery_items_owner_admin_insert" on "public"."gallery_items" as permissive for insert to "authenticated" with check (((owner_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_super_admin() AS is_super_admin) OR (EXISTS ( SELECT 1
   FROM salons s
  WHERE ((s.id = gallery_items.salon_id) AND (s.owner_id = ( SELECT auth.uid() AS uid)))))));

drop policy if exists "gallery_items_owner_admin_update" on "public"."gallery_items";

create policy "gallery_items_owner_admin_update" on "public"."gallery_items" as permissive for update to "authenticated" using (((owner_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_super_admin() AS is_super_admin) OR (EXISTS ( SELECT 1
   FROM salons s
  WHERE ((s.id = gallery_items.salon_id) AND (s.owner_id = ( SELECT auth.uid() AS uid))))))) with check (((owner_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_super_admin() AS is_super_admin) OR (EXISTS ( SELECT 1
   FROM salons s
  WHERE ((s.id = gallery_items.salon_id) AND (s.owner_id = ( SELECT auth.uid() AS uid)))))));

drop policy if exists "gallery_items_public_read" on "public"."gallery_items";

create policy "gallery_items_public_read" on "public"."gallery_items" as permissive for select to "anon", "authenticated" using ((active AND (((salon_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM salons s
  WHERE ((s.id = gallery_items.salon_id) AND s.website_published AND (s.status = 'approved'::text) AND (NOT s.suspended))))) OR ((owner_id IS NOT NULL) AND ( SELECT private.is_super_admin() AS is_super_admin)))));

drop policy if exists "loyalty_accounts_owner_delete" on "public"."loyalty_accounts";

create policy "loyalty_accounts_owner_delete" on "public"."loyalty_accounts" as permissive for delete to "authenticated" using (((owner_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_super_admin() AS is_super_admin)));

drop policy if exists "loyalty_accounts_owner_insert" on "public"."loyalty_accounts";

create policy "loyalty_accounts_owner_insert" on "public"."loyalty_accounts" as permissive for insert to "authenticated" with check (((owner_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_super_admin() AS is_super_admin)));

drop policy if exists "loyalty_accounts_owner_select" on "public"."loyalty_accounts";

create policy "loyalty_accounts_owner_select" on "public"."loyalty_accounts" as permissive for select to "authenticated" using (((owner_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_super_admin() AS is_super_admin)));

drop policy if exists "loyalty_accounts_owner_update" on "public"."loyalty_accounts";

create policy "loyalty_accounts_owner_update" on "public"."loyalty_accounts" as permissive for update to "authenticated" using (((owner_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_super_admin() AS is_super_admin))) with check (((owner_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_super_admin() AS is_super_admin)));

drop policy if exists "loyalty_transactions_owner_select" on "public"."loyalty_transactions";

create policy "loyalty_transactions_owner_select" on "public"."loyalty_transactions" as permissive for select to "authenticated" using ((( SELECT private.is_super_admin() AS is_super_admin) OR (EXISTS ( SELECT 1
   FROM loyalty_accounts a
  WHERE ((a.id = loyalty_transactions.account_id) AND (a.owner_id = ( SELECT auth.uid() AS uid)))))));

drop policy if exists "loyalty_vouchers_owner_manage" on "public"."loyalty_vouchers";

create policy "loyalty_vouchers_owner_manage" on "public"."loyalty_vouchers" as permissive for all to "authenticated" using ((( SELECT private.is_super_admin() AS is_super_admin) OR (EXISTS ( SELECT 1
   FROM loyalty_accounts a
  WHERE ((a.id = loyalty_vouchers.account_id) AND (a.owner_id = ( SELECT auth.uid() AS uid))))))) with check ((( SELECT private.is_super_admin() AS is_super_admin) OR (EXISTS ( SELECT 1
   FROM loyalty_accounts a
  WHERE ((a.id = loyalty_vouchers.account_id) AND (a.owner_id = ( SELECT auth.uid() AS uid)))))));

drop policy if exists "platform_settings_admin_all" on "public"."platform_settings";

create policy "platform_settings_admin_all" on "public"."platform_settings" as permissive for all to "authenticated" using (( SELECT private.is_super_admin() AS is_super_admin)) with check (( SELECT private.is_super_admin() AS is_super_admin));

drop policy if exists "profiles_select_self_or_admin" on "public"."profiles";

create policy "profiles_select_self_or_admin" on "public"."profiles" as permissive for select to "authenticated" using (((id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_super_admin() AS is_super_admin)));

drop policy if exists "profiles_update_self_or_admin" on "public"."profiles";

create policy "profiles_update_self_or_admin" on "public"."profiles" as permissive for update to "authenticated" using (((id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_super_admin() AS is_super_admin))) with check (((id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_super_admin() AS is_super_admin)));

drop policy if exists "salon_packages_owner_admin_delete" on "public"."salon_packages";

create policy "salon_packages_owner_admin_delete" on "public"."salon_packages" as permissive for delete to "authenticated" using (((owner_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_super_admin() AS is_super_admin) OR (EXISTS ( SELECT 1
   FROM salons s
  WHERE ((s.id = salon_packages.salon_id) AND (s.owner_id = ( SELECT auth.uid() AS uid)))))));

drop policy if exists "salon_packages_owner_admin_insert" on "public"."salon_packages";

create policy "salon_packages_owner_admin_insert" on "public"."salon_packages" as permissive for insert to "authenticated" with check (((owner_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_super_admin() AS is_super_admin) OR (EXISTS ( SELECT 1
   FROM salons s
  WHERE ((s.id = salon_packages.salon_id) AND (s.owner_id = ( SELECT auth.uid() AS uid)))))));

drop policy if exists "salon_packages_owner_admin_update" on "public"."salon_packages";

create policy "salon_packages_owner_admin_update" on "public"."salon_packages" as permissive for update to "authenticated" using (((owner_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_super_admin() AS is_super_admin) OR (EXISTS ( SELECT 1
   FROM salons s
  WHERE ((s.id = salon_packages.salon_id) AND (s.owner_id = ( SELECT auth.uid() AS uid))))))) with check (((owner_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_super_admin() AS is_super_admin) OR (EXISTS ( SELECT 1
   FROM salons s
  WHERE ((s.id = salon_packages.salon_id) AND (s.owner_id = ( SELECT auth.uid() AS uid)))))));

drop policy if exists "salon_packages_public_read" on "public"."salon_packages";

create policy "salon_packages_public_read" on "public"."salon_packages" as permissive for select to "anon", "authenticated" using ((active AND (((salon_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM salons s
  WHERE ((s.id = salon_packages.salon_id) AND s.website_published AND (s.status = 'approved'::text) AND (NOT s.suspended))))) OR ((owner_id IS NOT NULL) AND ( SELECT private.is_super_admin() AS is_super_admin)))));

drop policy if exists "salon_versions_admin_update" on "public"."salon_versions";

create policy "salon_versions_admin_update" on "public"."salon_versions" as permissive for update to "authenticated" using (( SELECT private.is_super_admin() AS is_super_admin)) with check (( SELECT private.is_super_admin() AS is_super_admin));

drop policy if exists "salon_versions_owner_admin_select" on "public"."salon_versions";

create policy "salon_versions_owner_admin_select" on "public"."salon_versions" as permissive for select to "authenticated" using ((( SELECT private.is_super_admin() AS is_super_admin) OR (EXISTS ( SELECT 1
   FROM salons s
  WHERE ((s.id = salon_versions.salon_id) AND (s.owner_id = ( SELECT auth.uid() AS uid)))))));

drop policy if exists "salon_versions_owner_insert" on "public"."salon_versions";

create policy "salon_versions_owner_insert" on "public"."salon_versions" as permissive for insert to "authenticated" with check ((EXISTS ( SELECT 1
   FROM salons s
  WHERE ((s.id = salon_versions.salon_id) AND (s.owner_id = ( SELECT auth.uid() AS uid))))));

drop policy if exists "salons_admin_delete" on "public"."salons";

create policy "salons_admin_delete" on "public"."salons" as permissive for delete to "authenticated" using (( SELECT private.is_super_admin() AS is_super_admin));

drop policy if exists "salons_owner_insert" on "public"."salons";

create policy "salons_owner_insert" on "public"."salons" as permissive for insert to "authenticated" with check (((owner_id = ( SELECT auth.uid() AS uid)) AND (NOT ( SELECT private.is_super_admin() AS is_super_admin))));

drop policy if exists "salons_owner_or_public_select" on "public"."salons";

create policy "salons_owner_or_public_select" on "public"."salons" as permissive for select to "anon", "authenticated" using (((website_published AND (status = 'approved'::text) AND (NOT suspended)) OR (owner_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_super_admin() AS is_super_admin)));

drop policy if exists "salons_owner_update" on "public"."salons";

create policy "salons_owner_update" on "public"."salons" as permissive for update to "authenticated" using (((owner_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_super_admin() AS is_super_admin))) with check (((owner_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_super_admin() AS is_super_admin)));

drop policy if exists "service_reviews_admin_update" on "public"."service_reviews";

create policy "service_reviews_admin_update" on "public"."service_reviews" as permissive for update to "authenticated" using (( SELECT private.is_super_admin() AS is_super_admin)) with check (( SELECT private.is_super_admin() AS is_super_admin));

drop policy if exists "service_reviews_public_approved_select" on "public"."service_reviews";

create policy "service_reviews_public_approved_select" on "public"."service_reviews" as permissive for select to "anon", "authenticated" using (((status = 'approved'::text) AND (EXISTS ( SELECT 1
   FROM salons s
  WHERE ((s.id = service_reviews.salon_id) AND s.website_published AND (s.status = 'approved'::text) AND (NOT s.suspended))))));

drop policy if exists "service_reviews_public_insert" on "public"."service_reviews";

create policy "service_reviews_public_insert" on "public"."service_reviews" as permissive for insert to "anon", "authenticated" with check ((EXISTS ( SELECT 1
   FROM salons s
  WHERE ((s.id = service_reviews.salon_id) AND s.website_published AND (s.status = 'approved'::text) AND (NOT s.suspended)))));

drop policy if exists "services_owner_admin_delete" on "public"."services";

create policy "services_owner_admin_delete" on "public"."services" as permissive for delete to "authenticated" using ((EXISTS ( SELECT 1
   FROM salons s
  WHERE ((s.id = services.salon_id) AND ((s.owner_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_super_admin() AS is_super_admin))))));

drop policy if exists "services_owner_admin_insert" on "public"."services";

create policy "services_owner_admin_insert" on "public"."services" as permissive for insert to "authenticated" with check ((EXISTS ( SELECT 1
   FROM salons s
  WHERE ((s.id = services.salon_id) AND ((s.owner_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_super_admin() AS is_super_admin))))));

drop policy if exists "services_owner_admin_update" on "public"."services";

create policy "services_owner_admin_update" on "public"."services" as permissive for update to "authenticated" using ((EXISTS ( SELECT 1
   FROM salons s
  WHERE ((s.id = services.salon_id) AND ((s.owner_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_super_admin() AS is_super_admin)))))) with check ((EXISTS ( SELECT 1
   FROM salons s
  WHERE ((s.id = services.salon_id) AND ((s.owner_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_super_admin() AS is_super_admin))))));

drop policy if exists "services_owner_or_public_select" on "public"."services";

create policy "services_owner_or_public_select" on "public"."services" as permissive for select to "anon", "authenticated" using (((active AND (EXISTS ( SELECT 1
   FROM salons s
  WHERE ((s.id = services.salon_id) AND s.website_published AND (s.status = 'approved'::text) AND (NOT s.suspended))))) OR (EXISTS ( SELECT 1
   FROM salons s
  WHERE ((s.id = services.salon_id) AND ((s.owner_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_super_admin() AS is_super_admin)))))));

drop policy if exists "site_sections_owner_delete" on "public"."site_sections";

create policy "site_sections_owner_delete" on "public"."site_sections" as permissive for delete to "authenticated" using (((owner_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_super_admin() AS is_super_admin)));

drop policy if exists "site_sections_owner_insert" on "public"."site_sections";

create policy "site_sections_owner_insert" on "public"."site_sections" as permissive for insert to "authenticated" with check (((owner_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_super_admin() AS is_super_admin)));

drop policy if exists "site_sections_owner_update" on "public"."site_sections";

create policy "site_sections_owner_update" on "public"."site_sections" as permissive for update to "authenticated" using (((owner_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_super_admin() AS is_super_admin))) with check (((owner_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_super_admin() AS is_super_admin)));

drop policy if exists "site_sections_public_read" on "public"."site_sections";

create policy "site_sections_public_read" on "public"."site_sections" as permissive for select to "anon", "authenticated" using ((is_published OR (owner_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_super_admin() AS is_super_admin)));

drop policy if exists "staff_owner_admin_delete" on "public"."staff";

create policy "staff_owner_admin_delete" on "public"."staff" as permissive for delete to "authenticated" using ((EXISTS ( SELECT 1
   FROM salons s
  WHERE ((s.id = staff.salon_id) AND ((s.owner_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_super_admin() AS is_super_admin))))));

drop policy if exists "staff_owner_admin_insert" on "public"."staff";

create policy "staff_owner_admin_insert" on "public"."staff" as permissive for insert to "authenticated" with check ((EXISTS ( SELECT 1
   FROM salons s
  WHERE ((s.id = staff.salon_id) AND ((s.owner_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_super_admin() AS is_super_admin))))));

drop policy if exists "staff_owner_admin_update" on "public"."staff";

create policy "staff_owner_admin_update" on "public"."staff" as permissive for update to "authenticated" using ((EXISTS ( SELECT 1
   FROM salons s
  WHERE ((s.id = staff.salon_id) AND ((s.owner_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_super_admin() AS is_super_admin)))))) with check ((EXISTS ( SELECT 1
   FROM salons s
  WHERE ((s.id = staff.salon_id) AND ((s.owner_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_super_admin() AS is_super_admin))))));

drop policy if exists "staff_owner_or_public_select" on "public"."staff";

create policy "staff_owner_or_public_select" on "public"."staff" as permissive for select to "anon", "authenticated" using (((active AND (EXISTS ( SELECT 1
   FROM salons s
  WHERE ((s.id = staff.salon_id) AND s.website_published AND (s.status = 'approved'::text) AND (NOT s.suspended))))) OR (EXISTS ( SELECT 1
   FROM salons s
  WHERE ((s.id = staff.salon_id) AND ((s.owner_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_super_admin() AS is_super_admin)))))));

drop policy if exists "stylist_inquiries_owner_admin_delete" on "public"."stylist_inquiries";

create policy "stylist_inquiries_owner_admin_delete" on "public"."stylist_inquiries" as permissive for delete to "authenticated" using ((( SELECT private.is_super_admin() AS is_super_admin) OR (EXISTS ( SELECT 1
   FROM salons s
  WHERE ((s.id = stylist_inquiries.salon_id) AND (s.owner_id = ( SELECT auth.uid() AS uid)))))));

drop policy if exists "stylist_inquiries_owner_admin_select" on "public"."stylist_inquiries";

create policy "stylist_inquiries_owner_admin_select" on "public"."stylist_inquiries" as permissive for select to "authenticated" using ((( SELECT private.is_super_admin() AS is_super_admin) OR (EXISTS ( SELECT 1
   FROM salons s
  WHERE ((s.id = stylist_inquiries.salon_id) AND (s.owner_id = ( SELECT auth.uid() AS uid)))))));

drop policy if exists "stylist_inquiries_owner_admin_update" on "public"."stylist_inquiries";

create policy "stylist_inquiries_owner_admin_update" on "public"."stylist_inquiries" as permissive for update to "authenticated" using ((( SELECT private.is_super_admin() AS is_super_admin) OR (EXISTS ( SELECT 1
   FROM salons s
  WHERE ((s.id = stylist_inquiries.salon_id) AND (s.owner_id = ( SELECT auth.uid() AS uid))))))) with check ((( SELECT private.is_super_admin() AS is_super_admin) OR (EXISTS ( SELECT 1
   FROM salons s
  WHERE ((s.id = stylist_inquiries.salon_id) AND (s.owner_id = ( SELECT auth.uid() AS uid)))))));

drop policy if exists "stylist_inquiries_public_insert" on "public"."stylist_inquiries";

create policy "stylist_inquiries_public_insert" on "public"."stylist_inquiries" as permissive for insert to "anon", "authenticated" with check ((EXISTS ( SELECT 1
   FROM salons s
  WHERE ((s.id = stylist_inquiries.salon_id) AND s.website_published AND (s.status = 'approved'::text) AND (NOT s.suspended)))));

drop policy if exists "subscriptions_admin_delete" on "public"."subscriptions";

create policy "subscriptions_admin_delete" on "public"."subscriptions" as permissive for delete to "authenticated" using (( SELECT private.is_super_admin() AS is_super_admin));

drop policy if exists "subscriptions_admin_insert" on "public"."subscriptions";

create policy "subscriptions_admin_insert" on "public"."subscriptions" as permissive for insert to "authenticated" with check (( SELECT private.is_super_admin() AS is_super_admin));

drop policy if exists "subscriptions_admin_update" on "public"."subscriptions";

create policy "subscriptions_admin_update" on "public"."subscriptions" as permissive for update to "authenticated" using (( SELECT private.is_super_admin() AS is_super_admin)) with check (( SELECT private.is_super_admin() AS is_super_admin));

drop policy if exists "subscriptions_owner_admin_select" on "public"."subscriptions";

create policy "subscriptions_owner_admin_select" on "public"."subscriptions" as permissive for select to "authenticated" using ((( SELECT private.is_super_admin() AS is_super_admin) OR (EXISTS ( SELECT 1
   FROM salons s
  WHERE ((s.id = subscriptions.salon_id) AND (s.owner_id = ( SELECT auth.uid() AS uid)))))));

drop policy if exists "videos_owner_admin_delete" on "public"."videos";

create policy "videos_owner_admin_delete" on "public"."videos" as permissive for delete to "authenticated" using (((owner_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_super_admin() AS is_super_admin) OR (EXISTS ( SELECT 1
   FROM salons s
  WHERE ((s.id = videos.salon_id) AND (s.owner_id = ( SELECT auth.uid() AS uid)))))));

drop policy if exists "videos_owner_admin_insert" on "public"."videos";

create policy "videos_owner_admin_insert" on "public"."videos" as permissive for insert to "authenticated" with check (((owner_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_super_admin() AS is_super_admin) OR (EXISTS ( SELECT 1
   FROM salons s
  WHERE ((s.id = videos.salon_id) AND (s.owner_id = ( SELECT auth.uid() AS uid)))))));

drop policy if exists "videos_owner_admin_update" on "public"."videos";

create policy "videos_owner_admin_update" on "public"."videos" as permissive for update to "authenticated" using (((owner_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_super_admin() AS is_super_admin) OR (EXISTS ( SELECT 1
   FROM salons s
  WHERE ((s.id = videos.salon_id) AND (s.owner_id = ( SELECT auth.uid() AS uid))))))) with check (((owner_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_super_admin() AS is_super_admin) OR (EXISTS ( SELECT 1
   FROM salons s
  WHERE ((s.id = videos.salon_id) AND (s.owner_id = ( SELECT auth.uid() AS uid)))))));

drop policy if exists "videos_public_read" on "public"."videos";

create policy "videos_public_read" on "public"."videos" as permissive for select to "anon", "authenticated" using ((active AND (((salon_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM salons s
  WHERE ((s.id = videos.salon_id) AND s.website_published AND (s.status = 'approved'::text) AND (NOT s.suspended))))) OR ((owner_id IS NOT NULL) AND ( SELECT private.is_super_admin() AS is_super_admin)))));

drop policy if exists "waitlist_owner_admin_delete" on "public"."waitlist";

create policy "waitlist_owner_admin_delete" on "public"."waitlist" as permissive for delete to "authenticated" using ((( SELECT private.is_super_admin() AS is_super_admin) OR (EXISTS ( SELECT 1
   FROM salons s
  WHERE ((s.id = waitlist.salon_id) AND (s.owner_id = ( SELECT auth.uid() AS uid)))))));

drop policy if exists "waitlist_owner_admin_select" on "public"."waitlist";

create policy "waitlist_owner_admin_select" on "public"."waitlist" as permissive for select to "authenticated" using ((( SELECT private.is_super_admin() AS is_super_admin) OR (EXISTS ( SELECT 1
   FROM salons s
  WHERE ((s.id = waitlist.salon_id) AND (s.owner_id = ( SELECT auth.uid() AS uid)))))));

drop policy if exists "waitlist_owner_admin_update" on "public"."waitlist";

create policy "waitlist_owner_admin_update" on "public"."waitlist" as permissive for update to "authenticated" using ((( SELECT private.is_super_admin() AS is_super_admin) OR (EXISTS ( SELECT 1
   FROM salons s
  WHERE ((s.id = waitlist.salon_id) AND (s.owner_id = ( SELECT auth.uid() AS uid))))))) with check ((( SELECT private.is_super_admin() AS is_super_admin) OR (EXISTS ( SELECT 1
   FROM salons s
  WHERE ((s.id = waitlist.salon_id) AND (s.owner_id = ( SELECT auth.uid() AS uid)))))));

drop policy if exists "waitlist_public_insert" on "public"."waitlist";

create policy "waitlist_public_insert" on "public"."waitlist" as permissive for insert to "anon", "authenticated" with check ((EXISTS ( SELECT 1
   FROM salons s
  WHERE ((s.id = waitlist.salon_id) AND s.website_published AND (s.status = 'approved'::text) AND (NOT s.suspended)))));

drop policy if exists "beautyzone_assets_owner_delete" on "storage"."objects";

create policy "beautyzone_assets_owner_delete" on "storage"."objects" as permissive for delete to "authenticated" using (((bucket_id = 'beautyzone-assets'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));

drop policy if exists "beautyzone_assets_owner_insert" on "storage"."objects";

create policy "beautyzone_assets_owner_insert" on "storage"."objects" as permissive for insert to "authenticated" with check (((bucket_id = 'beautyzone-assets'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));

drop policy if exists "beautyzone_assets_owner_update" on "storage"."objects";

create policy "beautyzone_assets_owner_update" on "storage"."objects" as permissive for update to "authenticated" using (((bucket_id = 'beautyzone-assets'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text))) with check (((bucket_id = 'beautyzone-assets'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));

drop policy if exists "beautyzone_assets_public_read" on "storage"."objects";

create policy "beautyzone_assets_public_read" on "storage"."objects" as permissive for select to "anon", "authenticated" using ((bucket_id = 'beautyzone-assets'::text));

CREATE INDEX IF NOT EXISTS salons_owner_id_idx ON public.salons USING btree (owner_id);

CREATE INDEX IF NOT EXISTS salons_published_idx ON public.salons USING btree (website_published, status, suspended);

CREATE UNIQUE INDEX IF NOT EXISTS salon_versions_one_pending_idx ON public.salon_versions USING btree (salon_id) WHERE (status = 'pending'::text);

CREATE INDEX IF NOT EXISTS salon_versions_reviewed_by_idx ON public.salon_versions USING btree (reviewed_by);

CREATE INDEX IF NOT EXISTS services_salon_idx ON public.services USING btree (salon_id, sort_order);

CREATE INDEX IF NOT EXISTS services_salon_fk_idx ON public.services USING btree (salon_id);

CREATE INDEX IF NOT EXISTS staff_salon_idx ON public.staff USING btree (salon_id, sort_order);

CREATE INDEX IF NOT EXISTS staff_salon_fk_idx ON public.staff USING btree (salon_id);

CREATE INDEX IF NOT EXISTS subscriptions_salon_fk_idx ON public.subscriptions USING btree (salon_id);

CREATE INDEX IF NOT EXISTS bookings_salon_date_idx ON public.bookings USING btree (salon_id, booking_date);

CREATE INDEX IF NOT EXISTS bookings_status_idx ON public.bookings USING btree (salon_id, status);

CREATE INDEX IF NOT EXISTS bookings_service_fk_idx ON public.bookings USING btree (service_id);

CREATE INDEX IF NOT EXISTS bookings_staff_fk_idx ON public.bookings USING btree (staff_id);

CREATE INDEX IF NOT EXISTS bookings_created_by_fk_idx ON public.bookings USING btree (created_by);

CREATE UNIQUE INDEX IF NOT EXISTS site_sections_global_key_idx ON public.site_sections USING btree (section_key) WHERE (owner_id IS NULL);

CREATE UNIQUE INDEX IF NOT EXISTS site_sections_owner_key_idx ON public.site_sections USING btree (owner_id, section_key) WHERE (owner_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS site_sections_owner_fk_idx ON public.site_sections USING btree (owner_id);

CREATE INDEX IF NOT EXISTS site_sections_updated_by_fk_idx ON public.site_sections USING btree (updated_by);

CREATE INDEX IF NOT EXISTS gallery_items_salon_idx ON public.gallery_items USING btree (salon_id, sort_order);

CREATE INDEX IF NOT EXISTS gallery_items_owner_fk_idx ON public.gallery_items USING btree (owner_id);

CREATE INDEX IF NOT EXISTS gallery_items_salon_fk_idx ON public.gallery_items USING btree (salon_id);

CREATE INDEX IF NOT EXISTS salon_packages_owner_fk_idx ON public.salon_packages USING btree (owner_id);

CREATE INDEX IF NOT EXISTS salon_packages_salon_fk_idx ON public.salon_packages USING btree (salon_id);

CREATE INDEX IF NOT EXISTS videos_owner_fk_idx ON public.videos USING btree (owner_id);

CREATE INDEX IF NOT EXISTS videos_salon_fk_idx ON public.videos USING btree (salon_id);

CREATE INDEX IF NOT EXISTS branches_owner_fk_idx ON public.branches USING btree (owner_id);

CREATE INDEX IF NOT EXISTS branches_salon_fk_idx ON public.branches USING btree (salon_id);

CREATE INDEX IF NOT EXISTS waitlist_salon_fk_idx ON public.waitlist USING btree (salon_id);

CREATE INDEX IF NOT EXISTS stylist_inquiries_salon_fk_idx ON public.stylist_inquiries USING btree (salon_id);

CREATE INDEX IF NOT EXISTS stylist_inquiries_stylist_fk_idx ON public.stylist_inquiries USING btree (stylist_id);

CREATE INDEX IF NOT EXISTS service_reviews_salon_fk_idx ON public.service_reviews USING btree (salon_id);

CREATE INDEX IF NOT EXISTS service_reviews_service_fk_idx ON public.service_reviews USING btree (service_id);

CREATE INDEX IF NOT EXISTS service_reviews_booking_fk_idx ON public.service_reviews USING btree (booking_id);

CREATE INDEX IF NOT EXISTS loyalty_accounts_owner_fk_idx ON public.loyalty_accounts USING btree (owner_id);

CREATE INDEX IF NOT EXISTS loyalty_transactions_account_fk_idx ON public.loyalty_transactions USING btree (account_id);

CREATE INDEX IF NOT EXISTS loyalty_transactions_booking_fk_idx ON public.loyalty_transactions USING btree (booking_id);

CREATE INDEX IF NOT EXISTS loyalty_transactions_salon_fk_idx ON public.loyalty_transactions USING btree (salon_id);

CREATE INDEX IF NOT EXISTS loyalty_vouchers_account_fk_idx ON public.loyalty_vouchers USING btree (account_id);

CREATE INDEX IF NOT EXISTS loyalty_vouchers_booking_fk_idx ON public.loyalty_vouchers USING btree (used_booking_id);

CREATE INDEX IF NOT EXISTS platform_settings_updated_by_fk_idx ON public.platform_settings USING btree (updated_by);

CREATE INDEX IF NOT EXISTS audit_logs_actor_fk_idx ON public.audit_logs USING btree (actor_id);

grant select, insert, update, delete on all tables in schema public to anon, authenticated;

grant usage, select on all sequences in schema public to anon, authenticated;

revoke all on function private.is_super_admin() from public;

grant execute on function private.is_super_admin() to anon, authenticated;

revoke all on function private.prevent_profile_role_change() from public, anon, authenticated;

revoke all on function public.handle_new_user() from public, anon, authenticated;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values ('beautyzone-assets','beautyzone-assets',true,10485760,array['image/png','image/jpeg','image/webp','image/gif']) on conflict (id) do update set public=true,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;
