// Direct Metro web server startup, bypassing Expo CLI startup bugs
const Metro = require('metro');
const { mergeConfig, loadConfig } = require('metro-config');
const http = require('http');
const path = require('path');

const projectRoot = __dirname;

async function start() {
  console.log('Loading Metro config...');

  // Load the project's Metro config
  const metroConfig = await loadConfig({
    cwd: projectRoot,
    projectRoot,
  });

  console.log('Creating Metro server...');

  const server = await Metro.runServer(metroConfig, {
    host: 'localhost',
    port: 8085,
    hasReducedPerformance: false,
  });

  console.log('Metro web server running on http://localhost:8085');
}

start().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});
