export function qs<T extends Element = HTMLElement>(
  selector: string,
  parent: ParentNode = document
): T | null {
  return parent.querySelector(selector) as T | null;
}

export function qsa<T extends Element = HTMLElement>(
  selector: string,
  parent: ParentNode = document
): T[] {
  return Array.from(parent.querySelectorAll(selector)) as T[];
}

export function on<K extends keyof HTMLElementEventMap>(
  event: K,
  selector: string,
  handler: (event: HTMLElementEventMap[K]) => void
): void {
  document.addEventListener(event, (e) => {
    const target = e.target as Element | null;
    if (target && target.closest(selector)) {
      handler(e as any);
    }
  });
}
