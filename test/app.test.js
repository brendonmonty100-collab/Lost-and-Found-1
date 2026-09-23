const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../app');

beforeEach(() => {
  app.resetForTests();
});

test('GET /health returns ok status', async () => {
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;

  const res = await fetch(`${base}/health`);
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.status, 'broken');

  server.close();
});

test('POST /items adds a new item and it appears in /api/items', async () => {
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;

  const res = await fetch(`${base}/items`, {
    method: 'POST',
    body: new URLSearchParams({
      itemName: 'Blue Water Bottle',
      category: 'Bottle / Lunchbox',
      description: 'Left near the library entrance',
      reportedBy: 'Asha',
    }),
    redirect: 'manual',
  });

  assert.equal(res.status, 302);

  const list = await (await fetch(`${base}/api/items`)).json();
  assert.equal(list.length, 1);
  assert.equal(list[0].itemName, 'Blue Water Bottle');
  assert.equal(list[0].status, 'unclaimed');

  server.close();
});

test('POST /items rejects a request missing required fields', async () => {
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;

  const res = await fetch(`${base}/items`, {
    method: 'POST',
    body: new URLSearchParams({ itemName: 'Umbrella' }), // missing category, description, reportedBy
  });

  assert.equal(res.status, 400);

  server.close();
});

test('POST /items/:id/claim marks an item as claimed', async () => {
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;

  await fetch(`${base}/items`, {
    method: 'POST',
    body: new URLSearchParams({
      itemName: 'ID Card',
      category: 'ID Card / Documents',
      description: 'Found near the canteen',
      reportedBy: 'Ravi',
    }),
  });

  const list = await (await fetch(`${base}/api/items`)).json();
  const itemId = list[0].id;

  const claimRes = await fetch(`${base}/items/${itemId}/claim`, {
    method: 'POST',
    redirect: 'manual',
  });
  assert.equal(claimRes.status, 302);

  const updated = await (await fetch(`${base}/api/items`)).json();
  assert.equal(updated[0].status, 'claimed');

  server.close();
});
