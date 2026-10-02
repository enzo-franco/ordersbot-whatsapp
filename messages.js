const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

const DEFAULT_WEEKDAY_MESSAGES = {
  Mon: 'Bom dia, tudo bem?\n\nGostaria de saber se o senhor deseja fazer algum pedido hoje.\n\nFico à disposição para ajudar.',
  Tue: 'Bom dia! Espero que esteja bem.\n\nO senhor gostaria de fazer algum pedido para hoje?\n\nSe precisar, estou à disposição.',
  Wed: 'Bom dia, como vai?\n\nPasso para saber se o senhor precisa fazer algum pedido hoje.\n\nSerá um prazer atendê-lo.',
  Thu: 'Bom dia! Espero que sua manhã esteja indo bem.\n\nGostaria de verificar se o senhor tem algum pedido para hoje.\n\nFico à disposição para ajudar no que precisar.',
  Fri: 'Bom dia, tudo certo?\n\nGostaria de saber se o senhor deseja fazer algum pedido antes do fim da semana.\n\nEstou à disposição para atender.'
};

function weekdayForDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Data inválida para a mensagem.');
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  return ['Sun', ...WEEKDAYS, 'Sat'][weekday];
}

function messageForDate(date, weekdayMessages) {
  const weekday = weekdayForDate(date);
  if (!WEEKDAYS.includes(weekday)) throw new Error('Não há mensagem agendada no fim de semana.');
  return weekdayMessages[weekday];
}

module.exports = { WEEKDAYS, DEFAULT_WEEKDAY_MESSAGES, weekdayForDate, messageForDate };
