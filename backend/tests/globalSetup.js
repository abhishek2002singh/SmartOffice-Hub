const { MongoMemoryServer } = require('mongodb-memory-server');
const fs = require('fs');
const path = require('path');

module.exports = async () => {
  const mongod = await MongoMemoryServer.create({
    instance: { port: 27017 },
    // Binary already downloaded — increase startup timeout
    spawn: { timeout: 60000 },
  });
  global.__MONGOD__ = mongod;
  // Write URI to temp file so setupFiles can read it in worker processes
  const uri = mongod.getUri();
  fs.writeFileSync(path.join(__dirname, '.test-mongo-uri'), uri);
  console.log('\n  MongoDB Memory Server started at', uri);
};
