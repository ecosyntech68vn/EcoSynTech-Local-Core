const mockFeatures = {
  applyProfile: async () => ({ memoryMB: 256, profile: 'low-memory' }),
  getMemoryEstimate: () => 256,
  getConfig: () => ({})
};

module.exports = mockFeatures;