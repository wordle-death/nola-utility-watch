#!/usr/bin/env node
// Local driver for api/news-ingest.js — invokes the handler with a fake req/res
// so we can smoke-test the full pipeline end-to-end without deploying.
//
// Usage: (with SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY set)
//   node scripts/runIngest.mjs

import handler from '../api/news-ingest.js';

const req = { headers: {}, method: 'GET' };

let body;
const res = {
  status(code) { this._code = code; return this; },
  json(payload) { body = { code: this._code, payload }; return this; },
};

await handler(req, res);

console.log(`HTTP ${body.code}`);
console.log(JSON.stringify(body.payload, null, 2));
