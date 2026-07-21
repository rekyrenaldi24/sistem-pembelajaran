-- =========================================================
-- SKEMA DATABASE — Sistem Pembelajaran (Guru Mapel & Wali Kelas)
-- Jalankan seluruh file ini di Supabase → SQL Editor → Run
-- =========================================================

create extension if not exists "pgcrypto";

-- ============ PROFIL PENGGUNA ============
-- Satu baris per akun login, dibuat otomatis saat mendaftar dari aplikasi.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null check (role in ('guru','wali_kelas')),
  subject text,                 -- mapel yang diampu (khusus role guru)
  created_at timestamptz default now()
);

-- ============ KELAS & SISWA ============
create table classes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  wali_kelas_id uuid references profiles(id),
  created_at timestamptz default now()
);

create table students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  class_id uuid references classes(id) on delete cascade,
  created_at timestamptz default now()
);

-- kelas mana saja yang diajar seorang guru mapel
create table guru_classes (
  guru_id uuid references profiles(id) on delete cascade,
  class_id uuid references classes(id) on delete cascade,
  primary key (guru_id, class_id)
);

-- ============ ABSENSI PER MATA PELAJARAN (oleh Guru Mapel) ============
create table attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  guru_id uuid references profiles(id) on delete cascade,
  subject text not null,
  date date not null,
  status text not null check (status in ('Hadir','Izin','Sakit','Alpa')),
  created_at timestamptz default now(),
  unique (student_id, guru_id, subject, date)
);

-- ============ POIN KARAKTER + CATATAN (oleh Guru Mapel) ============
create table points (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  guru_id uuid references profiles(id) on delete cascade,
  type text not null check (type in ('plus','minus')),
  category text not null,
  note text,
  date date not null default current_date,
  created_at timestamptz default now()
);

-- ============ NILAI PRAKTEK HARIAN (banyak entri, dirata-rata) ============
create table practice_scores (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  guru_id uuid references profiles(id) on delete cascade,
  subject text not null,
  date date not null default current_date,
  score numeric not null check (score >= 0 and score <= 100),
  note text,
  created_at timestamptz default now()
);

-- ============ NILAI UJIAN AKHIR (satu nilai per siswa per mapel) ============
create table final_exam_scores (
  student_id uuid references students(id) on delete cascade,
  guru_id uuid references profiles(id) on delete cascade,
  subject text not null,
  score numeric not null check (score >= 0 and score <= 100),
  updated_at timestamptz default now(),
  primary key (student_id, guru_id, subject)
);

-- ============ BOBOT NILAI AKHIR (diatur masing-masing Guru) ============
create table grade_weights (
  guru_id uuid primary key references profiles(id) on delete cascade,
  w_absensi numeric not null default 20,
  w_praktek numeric not null default 40,
  w_ujian numeric not null default 30,
  w_poin numeric not null default 10
);

-- ============ CATATAN WALI KELAS ============
create table notes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  wali_kelas_id uuid references profiles(id) on delete cascade,
  date date not null default current_date,
  content text not null,
  created_at timestamptz default now()
);

-- ============ ABSENSI HARIAN KELAS (oleh Wali Kelas) ============
create table homeroom_attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  wali_kelas_id uuid references profiles(id) on delete cascade,
  date date not null,
  status text not null check (status in ('Hadir','Izin','Sakit','Alpa')),
  created_at timestamptz default now(),
  unique (student_id, date)
);

-- ============ TABUNGAN SISWA (oleh Wali Kelas) ============
create table savings (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  wali_kelas_id uuid references profiles(id) on delete cascade,
  date date not null default current_date,
  type text not null check (type in ('setor','tarik')),
  category text not null,
  amount numeric not null check (amount >= 0),
  note text,
  created_at timestamptz default now()
);

-- =========================================================
-- KEAMANAN (Row Level Security)
-- Model: sekolah kecil saling percaya — roster kelas & siswa boleh
-- dilihat/diubah semua akun yang login; data absensi/nilai/poin/
-- catatan/tabungan hanya bisa diubah oleh pemiliknya sendiri.
-- =========================================================

alter table profiles enable row level security;
alter table classes enable row level security;
alter table students enable row level security;
alter table guru_classes enable row level security;
alter table attendance enable row level security;
alter table points enable row level security;
alter table practice_scores enable row level security;
alter table final_exam_scores enable row level security;
alter table grade_weights enable row level security;
alter table notes enable row level security;
alter table homeroom_attendance enable row level security;
alter table savings enable row level security;

create policy "profiles_select_all" on profiles for select using (auth.role() = 'authenticated');
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);

create policy "classes_all" on classes for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "students_all" on students for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "guru_classes_all" on guru_classes for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "attendance_owner" on attendance for all using (auth.uid() = guru_id) with check (auth.uid() = guru_id);
create policy "points_owner" on points for all using (auth.uid() = guru_id) with check (auth.uid() = guru_id);
create policy "practice_owner" on practice_scores for all using (auth.uid() = guru_id) with check (auth.uid() = guru_id);
create policy "exam_owner" on final_exam_scores for all using (auth.uid() = guru_id) with check (auth.uid() = guru_id);
create policy "weights_owner" on grade_weights for all using (auth.uid() = guru_id) with check (auth.uid() = guru_id);

create policy "notes_owner" on notes for all using (auth.uid() = wali_kelas_id) with check (auth.uid() = wali_kelas_id);
create policy "homeroom_owner" on homeroom_attendance for all using (auth.uid() = wali_kelas_id) with check (auth.uid() = wali_kelas_id);
create policy "savings_owner" on savings for all using (auth.uid() = wali_kelas_id) with check (auth.uid() = wali_kelas_id);
