// server/db.js
const { MongoClient } = require('mongodb');

const url = 'mongodb://localhost:27017';
const client = new MongoClient(url);
const dbName = 'selvaAI'; // Database will be created automatically

async function connect() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    return client.db(dbName);
  } catch (err) {
    console.error('Connection error:', err);
    process.exit(1);
  }
}

module.exports = { connect };