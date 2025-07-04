jest.mock('../app/vendor/change-case.js', () => ({
  camelCase: (input: string) => {
    const parts = input.replace(/^[^a-zA-Z0-9]+/, '').split(/[^a-zA-Z0-9]+/);
    return parts
      .map((p, i) => (i === 0 ? p.toLowerCase() : p.charAt(0).toUpperCase() + p.slice(1)))
      .join('');
  }
}));

jest.mock('../app/vendor/html-entities/index.js', () => ({
  decode: (input: string) => input
}));
