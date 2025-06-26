import { ipcMain } from 'electron';
import debugModule from 'debug';
import { settings } from '../common/settings';
import { downloadModel } from '../ai/modelDownloader';

const debug = debugModule('main.ai');

ipcMain.handle('ai:download-model', async () => {
  const url = settings.ai.modelURL;
  if (!url) throw new Error('Model URL not configured');
  try {
    await downloadModel(url, settings.ai.modelPath);
    debug('Model downloaded');
  } catch (e) {
    debug(`Download failed: ${e}`);
    throw e;
  }
});
