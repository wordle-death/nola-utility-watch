-- News feed: articles ingested twice daily from Verite, Lens, WWNO, and TP/Advocate.
-- See memory/feature_news_feed.md for the full feature plan.

create extension if not exists pg_trgm;

create type news_source as enum ('tp', 'verite', 'lens', 'wwno');
create type news_fetch_status as enum ('ok', 'headline_only', 'failed');

create table news_articles (
  id uuid primary key default gen_random_uuid(),
  url text not null unique,
  source news_source not null,
  title text not null,
  author text,
  pub_date timestamptz not null,
  ingested_at timestamptz not null default now(),

  raw_excerpt text,
  raw_body text,
  fetch_status news_fetch_status not null default 'ok',

  is_relevant boolean not null default false,
  utility_tag text[] not null default '{}',
  summary text,
  consumer_implication text,

  originator_source news_source,
  original_reporting_score int,
  dedupe_group_id uuid,

  approved_for_display boolean not null default false
);

create index news_articles_display_idx
  on news_articles (approved_for_display, pub_date desc)
  where approved_for_display = true;

create index news_articles_pub_date_idx on news_articles (pub_date desc);
create index news_articles_dedupe_group_idx on news_articles (dedupe_group_id);
create index news_articles_title_trgm_idx on news_articles using gin (title gin_trgm_ops);
