jest.mock('change-case', () => ({
  camelCase: (input: string) => {
    const parts = input
      .replace(/^[^a-zA-Z0-9]+/, '')
      .split(/[^a-zA-Z0-9]+/);
    return parts
      .map((p, i) =>
        i === 0 ? p.toLowerCase() : p.charAt(0).toUpperCase() + p.slice(1)
      )
      .join('');
  }
}));

jest.mock('html-entities', () => ({
  XmlEntities: class {
    decode(input: string): string {
      return input;
    }
  }
}));
