const mockDb = {
  query: async () => ({ rows: [], rowCount: 0 }),
  none: async () => ({}),
  many: async () => [],
  one: async () => null,
  oneOrNone: async () => null,
  any: async () => []
};

const db = {
  query: mockDb.query,
  none: mockDb.none,
  many: mockDb.many,
  one: mockDb.one,
  oneOrNone: mockDb.oneOrNone,
  any: mockDb.any
};

function initDatabase() {
  return Promise.resolve(db);
}

function closeDatabase() {
  return Promise.resolve();
}

module.exports = { initDatabase, closeDatabase, db, default: db };