import { debugFactory, errorFactory } from '../common/logger.js';

const debug = debugFactory('renderer');
const error = errorFactory('renderer');

export function sendDebug(message: string): void {
  debug(message);
}

export function sendError(message: string): void {
  error(message);
}
