jest.mock('html-entities', () => ({
  decode: (input) => input
}));
