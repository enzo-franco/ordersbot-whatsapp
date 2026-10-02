const test = require('node:test');
const assert = require('node:assert/strict');
const { WEEKDAYS, DEFAULT_WEEKDAY_MESSAGES, messageForDate } = require('./messages');

test('usa cinco mensagens distintas, uma para cada dia útil', () => {
  const dates = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09'];
  const messages = dates.map(date => messageForDate(date, DEFAULT_WEEKDAY_MESSAGES));
  assert.equal(new Set(messages).size, WEEKDAYS.length);
  for (const message of messages) {
    assert.match(message, /^Bom dia/);
    assert.match(message, /pedido/);
    assert.match(message, /senhor/);
    assert.equal(message.split('\n\n').length, 3);
  }
  assert.equal(messageForDate('2026-10-12', DEFAULT_WEEKDAY_MESSAGES), messages[0]);
  assert.throws(() => messageForDate('2026-10-10', DEFAULT_WEEKDAY_MESSAGES), /fim de semana/);
});
