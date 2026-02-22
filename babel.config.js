module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './',
            '@components': './components',
            '@screens': './screens',
            '@contexts': './contexts',
            '@hooks': './hooks',
            '@utils': './utils',
            '@styles': './styles',
            '@constants': './constants',
          },
          extensions: [
            '.ios.js',
            '.android.js',
            '.js',
            '.ts',
            '.tsx',
            '.json',
          ],
        },
      ],
      '@babel/plugin-transform-runtime',
      '@babel/plugin-transform-flow-strip-types',
      'react-native-reanimated/plugin'
    ],
  };
}; 