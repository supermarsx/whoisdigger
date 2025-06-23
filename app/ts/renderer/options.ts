import $ from 'jquery';
import { settings, saveSettings } from '../common/settings';

function getValue(path: string): any {
  return path.split('.').reduce((obj: any, key: string) => (obj ? obj[key] : undefined), settings);
}

function setValue(path: string, value: any): void {
  const keys = path.split('.');
  let obj: any = settings;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (!(k in obj)) obj[k] = {};
    obj = obj[k];
  }
  obj[keys[keys.length - 1]] = value;
}

function parseValue(val: string): any {
  if (val === 'true') return true;
  if (val === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(val)) return Number(val);
  return val;
}

function showSaved(): void {
  const indicator = $('#opSavedIndicator');
  indicator.removeClass('is-hidden');
  setTimeout(() => indicator.addClass('is-hidden'), 1500);
}

$(document).ready(() => {
  const container = $('#opEntry');
  container.find('input[id], select[id]').each((_, el) => {
    const $el = $(el);
    const id = $el.attr('id');
    if (!id) return;
    const path = id.replace(/^appSettings\./, 'app.');
    const val = getValue(path);
    if (val !== undefined) {
      if ($el.is(':checkbox')) {
        $el.prop('checked', Boolean(val));
      } else {
        $el.val(String(val));
      }
    }
  });

  container.on('change', 'input[id], select[id]', function () {
    const $el = $(this);
    const id = $el.attr('id');
    if (!id) return;
    const path = id.replace(/^appSettings\./, 'app.');
    const raw = $el.is(':checkbox') ? $el.prop('checked') : $el.val();
    const val = typeof raw === 'string' ? parseValue(raw) : raw;
    setValue(path, val);
    void saveSettings(settings).then(showSaved);
  });
});
