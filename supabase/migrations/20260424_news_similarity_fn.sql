-- RPC wrapper so Supabase clients can query pg_trgm similarity without raw SQL.
-- Used by api/_lib/news/dedupe.js to find near-duplicate titles within a 72h window.

create or replace function find_similar_news_articles(
  q_title text,
  q_pub_date timestamptz,
  window_hours int default 72,
  threshold float default 0.6
)
returns table (
  id uuid,
  source news_source,
  title text,
  pub_date timestamptz,
  originator_source news_source,
  dedupe_group_id uuid,
  sim real
)
language sql
stable
as $$
  select id, source, title, pub_date, originator_source, dedupe_group_id,
         similarity(title, q_title) as sim
  from news_articles
  where pub_date between q_pub_date - (window_hours || ' hours')::interval
                    and q_pub_date + (window_hours || ' hours')::interval
    and similarity(title, q_title) > threshold
  order by sim desc;
$$;
