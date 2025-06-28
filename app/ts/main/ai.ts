import { ipcMain } from 'electron';
import debugModule from 'debug';
import { settings } from '../common/settings.js';
import { downloadModel } from '../ai/modelDownloader.js';
import { suggestWords } from '../ai/openaiSuggest.js';

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

ipcMain.handle('ai:suggest', async (_event, prompt: string, count: number) => {
  try {
    return await suggestWords(prompt, count);
  } catch (e) {
    debug(`Suggest failed: ${e}`);
    throw e;
  }
});
