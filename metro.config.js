const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add 'mjs' to Metro's recognizable source extensions
config.resolver.sourceExts.push('mjs');

module.exports = config;
