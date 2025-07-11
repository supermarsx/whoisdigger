import $ from '../../../vendor/jquery.js';
import * as conversions from '../../common/conversions.js';
import type { FileStats } from '../../common/fileStats.js';
import { formatString } from '../../common/stringformat.js';

export function renderStats(stats: FileStats): void {
  $('#bwFileTdName').text(String(stats.filename));
  $('#bwFileTdLastmodified').text(conversions.getDate(stats.mtime) ?? '');
  $('#bwFileTdLastaccess').text(conversions.getDate(stats.atime) ?? '');
  $('#bwFileTdFilesize').text(
    String(stats.humansize) + formatString(' ({0} line(s))', String(stats.linecount))
  );
  $('#bwFileTdFilepreview').text(String(stats.filepreview) + '...');
}

export function renderEstimates(min: string, max?: string): void {
  if (max) {
    $('#bwFileSpanTimebetweenmin').text(min);
    $('#bwFileSpanTimebetweenmax').text(max);
    $('#bwFileTdEstimate').text(formatString('{0} to {1}', min, max));
  } else {
    $('#bwFileSpanTimebetweenminmax').addClass('is-hidden');
    $('#bwFileSpanTimebetweenmin').text(min);
    $('#bwFileTdEstimate').text(formatString('> {0}', min));
  }
}

export function initDragAndDrop(electron: {
  send: (channel: string, ...args: any[]) => void;
}): void {
  $(document).ready(() => {
    const holder = document.getElementById('bulkwhoisMainContainer') as HTMLElement | null;
    if (!holder) return;
    holder.ondragover = () => false;
    holder.ondragleave = () => false;
    holder.ondragend = () => false;
    holder.ondrop = (event) => {
      event.preventDefault();
      for (const f of Array.from(event.dataTransfer!.files)) {
        const file = f as any;
        electron.send('ondragstart', file.path);
      }
      return false;
    };
  });

  $('#bulkwhoisMainContainer').on('drop', function (event) {
    event.preventDefault();
    for (const f of Array.from((event as any).originalEvent.dataTransfer.files)) {
      const file = f as any;
      electron.send('ondragstart', file.path);
    }
    return false;
  });
}
