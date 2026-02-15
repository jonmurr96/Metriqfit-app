const Metro = require('metro');
const { getDefaultConfig } = require('expo/metro-config');

async function main() {
  console.log('[1] Getting config...');
  const config = getDefaultConfig(__dirname);

  config.resolver = {
    ...config.resolver,
    resolveRequest: (context, moduleName, platform) => {
      if (moduleName === 'tslib' || moduleName.startsWith('tslib/')) {
        return { filePath: require.resolve('tslib'), type: 'sourceFile' };
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  };

  console.log('[2] Starting Metro on port 8081...');
  await Metro.runServer(config, { host: 'localhost', port: 8081 });
  console.log('[3] Metro running at http://localhost:8081');
}

main().catch(e => { console.error(e); process.exit(1); });
