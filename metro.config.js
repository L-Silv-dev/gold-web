const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Adicionar suporte para arquivos .cjs
config.resolver.sourceExts.push('cjs');

// Configurar resolver para lidar melhor com módulos
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Configurar transformer para lidar com TypeScript
config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
};

module.exports = config; 