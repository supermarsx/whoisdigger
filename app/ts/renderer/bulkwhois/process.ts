import { debugFactory } from '../../common/logger.js';
import { registerResultListener, getBulkResults } from './state.js';
import { registerStatusUpdates } from './status-handler.js';
import { bindProcessingEvents } from './event-bindings.js';

const electron = (window as any).electron as {
  send: (channel: string, ...args: any[]) => void;
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  on: (channel: string, listener: (...args: any[]) => void) => void;
};

const debug = debugFactory('bulkwhois.process');
debug('loaded');

export { getBulkResults };

export function initialize(): void {
  registerResultListener(electron);
  registerStatusUpdates(electron);
  bindProcessingEvents(electron);
}
