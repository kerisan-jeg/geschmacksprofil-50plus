import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apiHeaders } from './headers.js';
import { createSync, SYNC_STATES } from './sync.js';

test('Publishable- und Secret-Schlüssel werden nur als apikey gesendet, Legacy-JWTs auch als Bearer', () => {
  for (const key of ['sb_publishable_test', 'sb_secret_test']) {
    assert.deepEqual(apiHeaders(key), { apikey: key });
  }
  const legacy = 'eyJhbGciOiJIUzI1NiJ9.test.signature';
  assert.deepEqual(apiHeaders(legacy), { apikey: legacy, Authorization: `Bearer ${legacy}` });
});

test('Eine Sitzung lässt sich mit einem Publishable Key ohne JWT-Authorization übertragen', async () => {
  const sync = createSync({
    url: 'https://db.example.org',
    key: 'sb_publishable_test',
    store: null,
    fetchFn: async (_url, { headers }) => ({ ok: headers.apikey === 'sb_publishable_test' && !('Authorization' in headers), status: 401 }),
  });
  try {
    const status = await sync.flush({ sessionId: 'test', syncToken: 'token', events: [] });
    assert.equal(status.state, SYNC_STATES.OK);
  } finally {
    sync.stop();
  }
});
