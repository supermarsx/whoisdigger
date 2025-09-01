/** @jest-environment jsdom */

let renderAnalyser: (contents: any) => Promise<void>;

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
  ({ renderAnalyser } = require('../app/ts/renderer/bwa/analyser'));
});

afterEach(() => {
  delete (window as any).electron;
  delete (window as any).DataTable;
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
