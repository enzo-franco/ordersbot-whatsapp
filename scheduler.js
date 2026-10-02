const TIME_ZONE = 'America/Sao_Paulo';
const formatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23'
});

function localDate(now) {
  const parts = Object.fromEntries(
    formatter.formatToParts(now).map(({ type, value }) => [type, value])
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function scheduledDate(now) {
  const parts = Object.fromEntries(
    formatter.formatToParts(now).map(({ type, value }) => [type, value])
  );
  if (!['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(parts.weekday)) return null;
  if (parts.hour !== '09' || parts.minute !== '00') return null;
  return `${parts.year}-${parts.month}-${parts.day}`;
}

module.exports = { TIME_ZONE, localDate, scheduledDate };
