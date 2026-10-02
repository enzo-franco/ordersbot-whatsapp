const test = require('node:test');
const assert = require('node:assert/strict');
const { localDate, scheduledDate } = require('./scheduler');

test('envia às 9h de segunda a sexta no horário de São Paulo', () => {
  assert.equal(scheduledDate(new Date('2026-10-02T12:00:00Z')), '2026-10-02');
  assert.equal(scheduledDate(new Date('2026-10-05T12:00:00Z')), '2026-10-05');
  assert.equal(scheduledDate(new Date('2026-10-03T12:00:00Z')), null);
  assert.equal(scheduledDate(new Date('2026-10-04T12:00:00Z')), null);
  assert.equal(scheduledDate(new Date('2026-10-02T11:59:00Z')), null);
  assert.equal(scheduledDate(new Date('2026-10-02T12:01:00Z')), null);
});

test('data local do envio imediato segue o horário de São Paulo', () => {
  assert.equal(localDate(new Date('2026-10-03T01:00:00Z')), '2026-10-02');
});
