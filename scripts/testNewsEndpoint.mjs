#!/usr/bin/env node
// Local invocation of api/news.js — confirms the endpoint returns the current
// approved articles straight from Supabase.

import handler from '../api/news.js';

const req = { headers: {}, method: 'GET' };

let body;
const res = {
  status(code) { this._code = code; return this; },
  json(payload) { body = { code: this._code, payload }; return this; },
  end() { body = { code: this._code, payload: null }; return this; },
  setHeader() { return this; },
};

await handler(req, res);
console.log(`HTTP ${body.code}`);
console.log(`articles: ${body.payload?.articles?.length ?? 0}`);
for (const a of body.payload?.articles ?? []) {
  console.log(`  [${a.source}] ${a.pub_date.slice(0, 10)}  ${a.title}`);
}
