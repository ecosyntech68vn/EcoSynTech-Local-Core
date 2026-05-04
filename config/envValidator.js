const mockValidator = {
  validate: async () => ({ valid: true }),
  validateSync: () => ({ valid: true })
};

module.exports = mockValidator;