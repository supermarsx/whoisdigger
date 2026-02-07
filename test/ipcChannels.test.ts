/**
 * Tests for app/ts/common/ipcChannels.ts — IpcChannel enum
 * Validates enum completeness and structural alignment with the tauri-shim.
 */
import { IpcChannel } from '../app/ts/common/ipcChannels.js';

describe('IpcChannel enum', () => {
  const allValues = Object.values(IpcChannel);

  test('all values are non-empty strings', () => {
    for (const v of allValues) {
      expect(typeof v).toBe('string');
      expect(v.length).toBeGreaterThan(0);
    }
  });

  test('has no duplicate values', () => {
    const unique = new Set(allValues);
    expect(unique.size).toBe(allValues.length);
  });

  test('all values use colon-separated namespacing', () => {
    for (const v of allValues) {
      // Every channel should have at least one colon (namespace:action) or dot
      expect(v).toMatch(/[:.]|^$/);
    }
  });

  // Exhaustive enumeration — one test per known channel
  const expectedChannels: Record<string, string> = {
    BulkwhoisLookup: 'bulkwhois:lookup',
    BulkwhoisLookupPause: 'bulkwhois:lookup.pause',
    BulkwhoisLookupContinue: 'bulkwhois:lookup.continue',
    BulkwhoisLookupStop: 'bulkwhois:lookup.stop',
    BulkwhoisInputFile: 'bulkwhois:input.file',
    BulkwhoisInputWordlist: 'bulkwhois:input.wordlist',
    BulkwhoisWordlistInputConfirmation: 'bulkwhois:wordlistinput.confirmation',
    BulkwhoisStatusUpdate: 'bulkwhois:status.update',
    BulkwhoisFileinputConfirmation: 'bulkwhois:fileinput.confirmation',
    BulkwhoisResultReceive: 'bulkwhois:result.receive',
    BulkwhoisExport: 'bulkwhois:export',
    BulkwhoisExportCancel: 'bulkwhois:export.cancel',
    BulkwhoisExportError: 'bulkwhois:export.error',
    BwaInputFile: 'bwa:input.file',
    BwaAnalyserStart: 'bwa:analyser.start',
    StatsStart: 'stats:start',
    StatsRefresh: 'stats:refresh',
    StatsStop: 'stats:stop',
    StatsGet: 'stats:get',
    StatsUpdate: 'stats:update',
    ProfilesList: 'profiles:list',
    ProfilesCreate: 'profiles:create',
    ProfilesRename: 'profiles:rename',
    ProfilesDelete: 'profiles:delete',
    ProfilesSetCurrent: 'profiles:set-current',
    ProfilesExport: 'profiles:export',
    ProfilesImport: 'profiles:import',
    ConfigExport: 'config:export',
    ConfigImport: 'config:import',
    DbPickFiles: 'db:pick-files',
    HistoryMerge: 'history:merge',
    CacheMerge: 'cache:merge',
    ToInputFile: 'to:input.file',
    ToProcess: 'to:process',
    SingleWhoisLookup: 'singlewhois:lookup',
    ParseCsv: 'csv:parse',
    AvailabilityCheck: 'availability:check',
    DomainParameters: 'availability:params',
    OpenPath: 'shell:openPath',
    OpenDataDir: 'app:open-data-dir',
    PathJoin: 'path:join',
    PathBasename: 'path:basename',
    GetBaseDir: 'app:get-base-dir',
    I18nLoad: 'i18n:load',
    BwFileRead: 'bw:file-read',
    BwaFileRead: 'bwa:file-read',
    MonitorStart: 'monitor:start',
    MonitorStop: 'monitor:stop',
    MonitorUpdate: 'monitor:update'
  };

  test.each(Object.entries(expectedChannels))(
    'IpcChannel.%s === "%s"',
    (key, value) => {
      expect((IpcChannel as any)[key]).toBe(value);
    }
  );

  test('enum count matches expected channels', () => {
    expect(allValues.length).toBe(Object.keys(expectedChannels).length);
  });
});
