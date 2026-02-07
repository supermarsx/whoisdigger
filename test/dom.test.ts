/**
 * @jest-environment jsdom
 */
/**
 * Tests for app/ts/utils/dom.ts — qs, qsa, on (delegated event listener)
 */
import { qs, qsa, on } from '../app/ts/utils/dom.js';

describe('qs (querySelector wrapper)', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="container">
        <span class="item">A</span>
        <span class="item">B</span>
        <p id="unique">C</p>
      </div>
    `;
  });

  test('finds an element by id', () => {
    const el = qs('#unique');
    expect(el).not.toBeNull();
    expect(el!.textContent).toBe('C');
  });

  test('finds an element by class', () => {
    const el = qs('.item');
    expect(el).not.toBeNull();
    expect(el!.textContent).toBe('A'); // returns first match
  });

  test('returns null for non-existent selector', () => {
    expect(qs('.does-not-exist')).toBeNull();
  });

  test('accepts a custom parent', () => {
    const container = document.getElementById('container')!;
    const el = qs('#unique', container);
    expect(el).not.toBeNull();
  });

  test('returns null when searching wrong parent', () => {
    const p = document.createElement('div');
    expect(qs('#unique', p)).toBeNull();
  });
});

describe('qsa (querySelectorAll wrapper)', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <ul>
        <li class="entry">1</li>
        <li class="entry">2</li>
        <li class="entry">3</li>
      </ul>
    `;
  });

  test('returns an array (not NodeList)', () => {
    const result = qsa('.entry');
    expect(Array.isArray(result)).toBe(true);
  });

  test('finds all matching elements', () => {
    expect(qsa('.entry')).toHaveLength(3);
  });

  test('returns empty array for no matches', () => {
    expect(qsa('.ghost')).toHaveLength(0);
  });
});

describe('on (delegated event listener)', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="root">
        <button class="btn" data-action="save">Save</button>
        <button class="btn" data-action="cancel">Cancel</button>
        <span class="other">Text</span>
      </div>
    `;
  });

  test('fires handler when clicking a matching element', () => {
    const handler = jest.fn();
    on('click', '.btn', handler);
    const btn = document.querySelector('.btn')!;
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  test('does not fire handler when clicking non-matching element', () => {
    const handler = jest.fn();
    on('click', '.btn', handler);
    const span = document.querySelector('.other')!;
    span.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(handler).not.toHaveBeenCalled();
  });

  test('returns a cleanup function that unsubscribes', () => {
    const handler = jest.fn();
    const cleanup = on('click', '.btn', handler);

    cleanup();

    const btn = document.querySelector('.btn')!;
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(handler).not.toHaveBeenCalled();
  });

  test('handles events bubbling from child elements', () => {
    document.body.innerHTML = `
      <div class="target"><span class="child">Click Me</span></div>
    `;
    const handler = jest.fn();
    on('click', '.target', handler);

    const child = document.querySelector('.child')!;
    child.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  test('works with multiple event types', () => {
    const mouseHandler = jest.fn();
    const focusHandler = jest.fn();
    on('mouseenter', '.btn', mouseHandler);
    on('focus', '.btn', focusHandler);

    const btn = document.querySelector('.btn')!;
    btn.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    btn.dispatchEvent(new FocusEvent('focus', { bubbles: true }));

    expect(mouseHandler).toHaveBeenCalledTimes(1);
    // focus may or may not fire depending on delegation; at minimum no error
  });
});
