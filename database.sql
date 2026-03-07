-- 1) scores 테이블 생성
create table if not exists public.scores (
  user_id uuid primary key,
  username text not null,
  avatar_url text,
  best_score integer not null default 0 check (best_score >= 0),
  updated_at timestamptz not null default now()
);

-- 2) updated_at 자동 갱신용 함수
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 3) 트리거
 drop trigger if exists trg_scores_updated_at on public.scores;
create trigger trg_scores_updated_at
before update on public.scores
for each row
execute function public.handle_updated_at();

-- 4) RLS 활성화
alter table public.scores enable row level security;

-- 5) 모든 사용자 랭킹 읽기 허용
create policy "Public can read leaderboard"
on public.scores
for select
using (true);

-- 6) 로그인한 사용자는 자기 점수만 insert 가능
create policy "Users can insert own score"
on public.scores
for insert
with check (auth.uid() = user_id);

-- 7) 로그인한 사용자는 자기 점수만 update 가능
create policy "Users can update own score"
on public.scores
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
