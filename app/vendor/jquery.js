function $(selector) {
  if (typeof selector === 'function') {
    return $.ready(selector);
  }
  let elements = [];
  if (typeof selector === 'string') {
    elements = Array.from(document.querySelectorAll(selector));
  } else if (selector instanceof Element || selector === document || selector === window) {
    elements = [selector];
  } else if (selector instanceof NodeList || Array.isArray(selector)) {
    elements = Array.from(selector);
  }
  const api = {
    elements,
    length: elements.length,
    0: elements[0],
    each(cb) {
      api.elements.forEach((el, i) => cb.call(el, i, el));
      return api;
    },
    on(event, selOrHandler, handler) {
      api.elements.forEach((el) => {
        if (typeof selOrHandler === 'string') {
          el.addEventListener(event, (e) => {
            if ((e.target && e.target.closest(selOrHandler))) {
              handler.call(e.target, e);
            }
          });
        } else {
          el.addEventListener(event, selOrHandler);
        }
      });
      return api;
    },
    click(handler) { return api.on('click', handler); },
    keyup(handler) { return api.on('keyup', handler); },
    addClass(cls) { api.elements.forEach(el => el.classList.add(...cls.split(' '))); return api; },
    removeClass(cls) { api.elements.forEach(el => el.classList.remove(...cls.split(' '))); return api; },
    toggleClass(cls, state) { api.elements.forEach(el => el.classList.toggle(cls, state)); return api; },
    hasClass(cls) { return api.elements[0]?.classList.contains(cls) || false; },
    is(sel) {
      const el = api.elements[0];
      if (!el) return false;
      if (sel === ':checked') return el.checked;
      return el.matches(sel);
    },
    val(value) {
      if (value === undefined) {
        return api.elements[0]?.value;
      }
      api.elements.forEach(el => { el.value = value; });
      return api;
    },
    text(value) {
      if (value === undefined) return api.elements.map(el => el.textContent || '').join('');
      api.elements.forEach(el => { el.textContent = value; });
      return api;
    },
    html(value) {
      if (value === undefined) return api.elements.map(el => el.innerHTML).join('');
      api.elements.forEach(el => { el.innerHTML = value; });
      return api;
    },
    append(content) {
      api.elements.forEach(el => {
        if (typeof content === 'string') el.insertAdjacentHTML('beforeend', content);
        else el.append(content);
      });
      return api;
    },
    empty() { api.elements.forEach(el => el.innerHTML = ''); return api; },
    show() { api.elements.forEach(el => el.classList.remove('is-hidden')); return api; },
    hide() { api.elements.forEach(el => el.classList.add('is-hidden')); return api; },
    toggle(state) {
      api.elements.forEach(el => {
        const hide = state !== undefined ? !state : el.classList.contains('is-hidden');
        el.classList.toggle('is-hidden', hide);
      });
      return api;
    },
    find(sel) { return $(api.elements.flatMap(el => Array.from(el.querySelectorAll(sel)))); },
    closest(sel) { return $(api.elements.map(el => el.closest(sel)).filter(Boolean)); },
    trigger(evt) { api.elements.forEach(el => el.dispatchEvent(new Event(evt, { bubbles: true }))); return api; },
    fadeOut(duration = 400, cb) {
      api.elements.forEach(el => {
        el.style.transition = `opacity ${duration}ms`;
        el.style.opacity = '0';
        setTimeout(() => { el.remove(); if (cb) cb(); }, duration);
      });
      return api;
    }
  };
  return api;
}

$.ready = function(cb) {
  if (document.readyState !== 'loading') cb();
  else document.addEventListener('DOMContentLoaded', cb);
  return $;
};

export default $;
