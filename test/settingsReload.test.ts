import fs from 'fs';
import path from 'path';
import '../test/electronMock';
import dns from 'dns/promises';
import { mockGetPath } from '../test/electronMock';

import { convertDomain } from '../app/ts/common/lookup';
import { nsLookup } from '../app/ts/common/dnsLookup';
import { loadSettings, saveSettings, settings } from '../app/ts/common/settings';

describe('settings reload', () => {
  test('convertDomain reflects saved settings', async () => {
    const tmpDir = fs.mkdtempSync(path.join(__dirname, 'config'));
    mockGetPath.mockReturnValue(tmpDir);
    const originalAlg = settings['lookup.conversion'].algorithm;
    const configName = 'reload.json';
    settings['custom.configuration'].filepath = configName;

    await loadSettings();
    settings['lookup.conversion'].algorithm = 'ascii';
    await saveSettings(settings);

    const result = convertDomain('t\u00E4st.de');
    expect(result).toBe('tst.de');

    settings['lookup.conversion'].algorithm = originalAlg;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('nsLookup uses updated settings from file', async () => {
    const tmpDir = fs.mkdtempSync(path.join(__dirname, 'config'));
    mockGetPath.mockReturnValue(tmpDir);
    const originalPsl = settings['lookup.general'].psl;
    const originalPath = settings['custom.configuration'].filepath;
    const configName = 'dns.json';
    settings['custom.configuration'].filepath = configName;

    await loadSettings();
    settings['lookup.general'].psl = false;
    await saveSettings(settings);

    const resolveMock = jest.spyOn(dns, 'resolve').mockResolvedValue([]);
    await nsLookup('sub.example.com');
    expect(resolveMock).toHaveBeenCalledWith('sub.example.com', 'NS');
    resolveMock.mockRestore();

    settings['lookup.general'].psl = originalPsl;
    settings['custom.configuration'].filepath = originalPath;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
