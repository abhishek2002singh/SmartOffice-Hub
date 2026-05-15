// Runs in each test worker before test files load.
// Ensures process.env.MONGODB_URI points to the in-memory server.
const fs = require('fs');
const path = require('path');

const uriFile = path.join(__dirname, '.test-mongo-uri');
if (fs.existsSync(uriFile)) {
  const uri = fs.readFileSync(uriFile, 'utf8').trim();
  // Override before test files can set their own URI
  Object.defineProperty(process.env, 'MONGODB_URI', {
    get: () => uri,
    set: () => {},   // ignore test-file overrides
    configurable: true,
  });
}
