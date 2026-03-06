import { listen } from '../../common/bridge/core.js';
import type { BulkWhoisResults } from '../../common/bulkwhois/types.js';

let bulkResults: BulkWhoisResults | null = null;

export function registerResultListener(): void {
  void listen<BulkWhoisResults>('bulk:result', (results) => {
    bulkResults = results;
  });
}

export function getBulkResults(): BulkWhoisResults | null {
  return bulkResults;
}
