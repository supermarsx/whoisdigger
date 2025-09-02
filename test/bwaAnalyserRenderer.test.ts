/** @jest-environment jsdom */

let renderAnalyser: (contents: any) => Promise<void>;
let originalAlert: any;

beforeEach(() => {
  jest.resetModules();
  document.body.innerHTML = `
    <div id="bwaFileinputconfirm"></div>
    <div id="bwaAnalyser" class="is-hidden">
      <table id="bwaAnalyserTable">
        <thead id="bwaAnalyserTableThead"></thead>
        <tbody id="bwaAnalyserTableTbody"></tbody>
      </table>
    </div>
  `;
  (window as any).electron = {};
  originalAlert = (window as any).alert;
  ({ renderAnalyser } = require('../app/ts/renderer/bwa/analyser'));
});

afterEach(() => {
  (window as any).alert = originalAlert;
  delete (window as any).electron;
  delete (window as any).DataTable;
  delete (window as any).hacked;
});

test('handles empty dataset without errors', async () => {
  const dtMock = Object.assign(jest.fn(), {
    isDataTable: jest.fn().mockReturnValue(false)
  });
  (window as any).DataTable = dtMock;
  await renderAnalyser({ data: [] });
  expect(document.querySelector('#bwaAnalyserTableThead')!.children.length).toBe(0);
  expect(document.querySelector('#bwaAnalyserTableTbody')!.children.length).toBe(0);
  expect(document.querySelector('#bwaAnalyser')!.classList.contains('is-hidden')).toBe(false);
  expect(document.querySelector('#bwaFileinputconfirm')!.classList.contains('is-hidden')).toBe(
    true
  );
  expect(dtMock.isDataTable).toHaveBeenCalledWith('#bwaAnalyserTable');
  expect(dtMock).not.toHaveBeenCalled();
});

test('destroys existing DataTable when dataset becomes empty', async () => {
  const destroyMock = jest.fn();
  const dtMock = Object.assign(jest.fn().mockReturnValue({ destroy: destroyMock }), {
    isDataTable: jest.fn().mockReturnValue(true)
  });
  (window as any).DataTable = dtMock;
  await renderAnalyser({ data: [] });
  expect(dtMock.isDataTable).toHaveBeenCalledWith('#bwaAnalyserTable');
  expect(dtMock).toHaveBeenCalledWith('#bwaAnalyserTable');
  expect(destroyMock).toHaveBeenCalled();
});

test('escapes html values in table', async () => {
  const dtMock = Object.assign(jest.fn(), {
    isDataTable: jest.fn().mockReturnValue(false)
  });
  (window as any).DataTable = dtMock;
  await renderAnalyser({ data: [{ name: '<b>bold</b>' }] });
  const cell = document.querySelector('#bwaAnalyserTableTbody td')!;
  expect(cell.textContent).toBe('<b>bold</b>');
  expect(cell.innerHTML).toBe('&lt;b&gt;bold&lt;/b&gt;');
  expect(dtMock.isDataTable).toHaveBeenCalledWith('#bwaAnalyserTable');
  expect(dtMock).toHaveBeenCalledTimes(1);
});

test('does not execute scripts from malicious input', async () => {
  const dtMock = Object.assign(jest.fn(), {
    isDataTable: jest.fn().mockReturnValue(false)
  });
  (window as any).DataTable = dtMock;
  const alertMock = jest.fn();
  (window as any).alert = alertMock;
  await renderAnalyser({
    data: [{ a: '<script>window.hacked=true</script>', b: '<img src=x onerror="alert(1)">' }]
  });
  expect(alertMock).not.toHaveBeenCalled();
  expect((window as any).hacked).toBeUndefined();
  expect(document.querySelector('script')).toBeNull();
  expect(dtMock.isDataTable).toHaveBeenCalledWith('#bwaAnalyserTable');
  expect(dtMock).toHaveBeenCalledTimes(1);
});
