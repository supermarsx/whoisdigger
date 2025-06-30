import fs from 'fs';
import path from 'path';
import '../test/electronMock';
import dns from 'dns/promises';
import { mockGetPath } from '../test/electronMock';

import { convertDomain } from '../app/ts/common/lookup';
import { nsLookup } from '../app/ts/common/dnsLookup';
import { loadSettings, saveSettings, settings } from '../app/ts/renderer/settings-renderer';

describe('settings reload', () => {
  test('convertDomain reflects saved settings', async () => {
    const tmpDir = fs.mkdtempSync(path.join(__dirname, 'config'));
    mockGetPath.mockReturnValue(tmpDir);
    const originalAlg = settings.lookupConversion.algorithm;
    const configName = 'reload.json';
    settings.customConfiguration.filepath = configName;

    await loadSettings();
    settings.lookupConversion.algorithm = 'ascii';
    await saveSettings(settings);

    const result = convertDomain('t\u00E4st.de');
    expect(result).toBe('tst.de');

    settings.lookupConversion.algorithm = originalAlg;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('nsLookup uses updated settings from file', async () => {
    const tmpDir = fs.mkdtempSync(path.join(__dirname, 'config'));
    mockGetPath.mockReturnValue(tmpDir);
    const originalPsl = settings.lookupGeneral.psl;
    const originalPath = settings.customConfiguration.filepath;
    const configName = 'settings.json';
    settings.customConfiguration.filepath = configName;

    await loadSettings();
    settings.lookupGeneral.psl = false;
    await saveSettings(settings);

    const resolveMock = jest.spyOn(dns, 'resolve').mockResolvedValue([]);
    await nsLookup('sub.example.com');
    expect(resolveMock).toHaveBeenCalledWith('sub.example.com', 'NS');
    resolveMock.mockRestore();

    settings.lookupGeneral.psl = originalPsl;
    settings.customConfiguration.filepath = originalPath;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
