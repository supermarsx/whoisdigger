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
});

test('handles empty dataset without errors', async () => {
  await renderAnalyser({ data: [] });
  expect(document.querySelector('#bwaAnalyserTableThead')!.children.length).toBe(0);
  expect(document.querySelector('#bwaAnalyserTableTbody')!.children.length).toBe(0);
  expect(document.querySelector('#bwaAnalyser')!.classList.contains('is-hidden')).toBe(false);
  expect(document.querySelector('#bwaFileinputconfirm')!.classList.contains('is-hidden')).toBe(
    true
  );
});

test('escapes html values in table', async () => {
  await renderAnalyser({ data: [{ name: '<b>bold</b>' }] });
  const cell = document.querySelector('#bwaAnalyserTableTbody td')!;
  expect(cell.textContent).toBe('<b>bold</b>');
  expect(cell.innerHTML).toBe('&lt;b&gt;bold&lt;/b&gt;');
});
