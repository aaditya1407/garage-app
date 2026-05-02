const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add 'mjs' to Metro's recognizable source extensions
config.resolver.sourceExts.push('mjs');

// ── Inline Requires ──────────────────────────────────────────────────
// Transform all top-level `import` statements into lazy `require()` calls
// that only execute when the imported binding is first USED, not when the
// importing module is loaded.
//
// This is CRITICAL for iOS Safari which has a tiny call stack limit
// (~500-1 000 frames on mobile).  Without this, the synchronous module
// initialisation chain (1 300+ modules) overflows Safari's stack,
// producing a blank white screen ("Maximum call stack size exceeded").
//
// Facebook uses the same transform for all React Native apps at scale.
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

module.exports = config;
