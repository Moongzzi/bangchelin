create extension if not exists "pgcrypto";

create table if not exists public.guide_documents (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  content jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guide_documents_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]*$'),
  constraint guide_documents_content_array check (jsonb_typeof(content) = 'array')
);

comment on table public.guide_documents is 'Guide page documents rendered as a 1-depth document tree.';
comment on column public.guide_documents.slug is 'Stable frontend document id used by the guide tree.';
comment on column public.guide_documents.content is 'Guide categories and leaf sections as JSONB.';

create index if not exists guide_documents_public_order_idx
  on public.guide_documents (is_published, sort_order, created_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_guide_documents_updated_at on public.guide_documents;
create trigger set_guide_documents_updated_at
before update on public.guide_documents
for each row
execute function public.set_updated_at();

create or replace function public.set_guide_document_editor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by = coalesce(new.created_by, auth.uid());
  end if;

  new.updated_by = auth.uid();
  return new;
end;
$$;

drop trigger if exists set_guide_document_editor on public.guide_documents;
create trigger set_guide_document_editor
before insert or update on public.guide_documents
for each row
execute function public.set_guide_document_editor();

create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  result boolean;
begin
  if auth.uid() is null then
    return false;
  end if;

  if to_regclass('public.profiles') is null then
    return false;
  end if;

  execute 'select exists(select 1 from public.profiles where id = $1 and role = ''admin'')'
    into result
    using auth.uid();

  return coalesce(result, false);
end;
$$;

alter table public.guide_documents enable row level security;

drop policy if exists "Published guide documents are readable" on public.guide_documents;
create policy "Published guide documents are readable"
on public.guide_documents
for select
to anon, authenticated
using (is_published = true or public.is_admin());

drop policy if exists "Admins can insert guide documents" on public.guide_documents;
create policy "Admins can insert guide documents"
on public.guide_documents
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update guide documents" on public.guide_documents;
create policy "Admins can update guide documents"
on public.guide_documents
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete guide documents" on public.guide_documents;
create policy "Admins can delete guide documents"
on public.guide_documents
for delete
to authenticated
using (public.is_admin());

grant select on public.guide_documents to anon, authenticated;
grant insert, update, delete on public.guide_documents to authenticated;

insert into public.guide_documents (slug, title, sort_order, is_published, published_at, content)
values
  (
    'chat-room-guide',
    '채팅방 이용',
    10,
    true,
    now(),
    '[
      {
        "id": "chat-room-basic",
        "title": "기본 원칙",
        "sections": [
          {
            "id": "chat-room-basic-introduction",
            "title": "기본 원칙",
            "body": [
              "방첼린 가이드 채팅방은 방탈출을 좋아하는 성인 이용자가 서로 정보를 나누고 약속을 조율하는 커뮤니티입니다.",
              "모든 이용자는 서로의 취향과 일정, 플레이 경험을 존중하며 과도한 비방이나 분쟁 유발 발언을 피해야 합니다."
            ]
          },
          {
            "id": "chat-room-basic-profile",
            "title": "프로필",
            "body": [
              "닉네임은 채팅방과 서비스에서 식별 가능한 이름으로 사용됩니다.",
              "중복되거나 혼동을 줄 수 있는 닉네임은 운영진 안내에 따라 조정될 수 있습니다."
            ]
          }
        ]
      },
      {
        "id": "chat-room-account",
        "title": "계정",
        "sections": [
          {
            "id": "chat-room-account-signup",
            "title": "회원가입",
            "body": [
              "회원가입에는 아이디, 비밀번호, 닉네임이 필요하며 생일, 소개, 활동 지역, 이메일은 선택 입력 항목입니다."
            ]
          },
          {
            "id": "chat-room-account-login",
            "title": "로그인",
            "body": [
              "로그인 후 캘린더, 문의/제보, 프로필 관리처럼 인증이 필요한 기능을 사용할 수 있습니다."
            ]
          },
          {
            "id": "chat-room-account-profile-edit",
            "title": "정보수정",
            "body": [
              "프로필 정보는 본인 계정에서만 수정할 수 있으며, 권한 검증은 Supabase RLS 정책을 기준으로 처리합니다."
            ]
          }
        ]
      }
    ]'::jsonb
  ),
  (
    'discord-guide',
    '디스코드 이용',
    20,
    true,
    now(),
    '[
      {
        "id": "discord-entry",
        "title": "입장 안내",
        "sections": [
          {
            "id": "discord-entry-link",
            "title": "참여 링크",
            "body": [
              "초대 링크는 운영진 또는 공식 공지 채널을 통해서만 배포합니다."
            ]
          },
          {
            "id": "discord-entry-rules",
            "title": "음성 채널 예절",
            "body": [
              "음성 채널에서는 진행 중인 대화와 플레이 스포일러를 방해하지 않도록 배려가 필요합니다."
            ]
          }
        ]
      }
    ]'::jsonb
  ),
  (
    'community-policy',
    '커뮤니티 운영 원칙',
    30,
    true,
    now(),
    '[
      {
        "id": "community-policy-report",
        "title": "문의 및 제보",
        "sections": [
          {
            "id": "community-policy-report-evidence",
            "title": "증거 원칙",
            "body": [
              "운영진은 제보 내용과 증거 자료를 함께 확인한 뒤 공식 절차에 따라 처리합니다."
            ]
          },
          {
            "id": "community-policy-report-response",
            "title": "응답 범위",
            "body": [
              "응답 시간과 처리 범위는 운영진 상황, 제보 내용의 긴급도, 정책 우선순위에 따라 달라질 수 있습니다."
            ]
          }
        ]
      }
    ]'::jsonb
  )
on conflict (slug) do update
set
  title = excluded.title,
  sort_order = excluded.sort_order,
  is_published = excluded.is_published,
  published_at = coalesce(public.guide_documents.published_at, excluded.published_at),
  content = excluded.content,
  updated_at = now();
