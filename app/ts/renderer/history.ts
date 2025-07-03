import $ from '../../vendor/jquery.js';
const electron = (window as any).electron as {
  invoke: (channel: string, ...args: any[]) => Promise<any>;
};
import { debugFactory } from '../common/logger.js';

const debug = debugFactory('renderer.history');
debug('loaded');

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString();
}

function loadHistory(): void {
  electron.invoke('history:get').then((entries: any[]) => {
    const tbody = $('#historyTable tbody');
    tbody.empty();
    if (!entries.length) {
      $('#historyEmpty').removeClass('is-hidden');
      return;
    }
    $('#historyEmpty').addClass('is-hidden');
    for (const e of entries) {
      const row = $('<tr>');
      row.append($('<td>').text(e.domain));
      row.append($('<td>').text(e.status));
      row.append($('<td>').text(formatDate(e.timestamp)));
      tbody.append(row);
    }
  });
}

$(() => {
  loadHistory();
  $('#clearHistory').on('click', async () => {
    await electron.invoke('history:clear');
    loadHistory();
  });
});

export const _test = { loadHistory };
