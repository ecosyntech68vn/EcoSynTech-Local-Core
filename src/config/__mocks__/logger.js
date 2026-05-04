const mockLogger = {
  error: () => {},
  warn: () => {},
  info: () => {},
  debug: () => {},
  verbose: () => {},
  silly: () => {},
  log: function() { return this },
  profile: () => {},
  add: () => {},
  remove: () => {},
  clearContext: () => {},
  setContext: () => {}
};

module.exports = mockLogger;