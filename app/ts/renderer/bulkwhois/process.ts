import { debugFactory } from '../../common/logger.js';
import { registerResultListener, getBulkResults } from './state.js';
import { registerStatusUpdates } from './status-handler.js';
import { bindProcessingEvents } from './event-bindings.js';
import type { RendererElectronAPI } from '../../../../types/renderer-electron-api.js';

const electron = (window as any).electron as RendererElectronAPI;

const debug = debugFactory('bulkwhois.process');
debug('loaded');

export { getBulkResults };

export function initialize(): void {
  registerResultListener(electron);
  registerStatusUpdates(electron);
  bindProcessingEvents(electron);
}
