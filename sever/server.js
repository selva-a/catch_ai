const express = require('express');
const { connect } = require('./db');
const cors = require('cors');
const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('../public'));

// Database connection
let db;
(async () => {
  db = await connect();
})();

// Helper function to generate session title from first user message
function generateSessionTitle(firstMessage) {
  if (!firstMessage) return 'New Chat';

  // Clean and truncate the message
  let title = firstMessage.trim();

  // Remove extra whitespace and newlines
  title = title.replace(/\s+/g, ' ');

  // Truncate to reasonable length (like ChatGPT does)
  if (title.length > 50) {
    title = title.substring(0, 47) + '...';
  }

  // Capitalize first letter
  title = title.charAt(0).toUpperCase() + title.slice(1);

  return title || 'New Chat';
}

// Messages endpoints
// Existing POST /api/messages endpoint - MODIFY to accept audio
app.post('/api/messages', async (req, res) => {
  const { sessionId, role, content, audio, type } = req.body;

  await db.collection('messages').insertOne({
    sessionId,
    role,
    content,
    audio: audio || null, // New optional field
    type: type || "text", // New field
    timestamp: new Date()
  });

  res.status(201).send();
});

app.get('/api/messages/:sessionId', async (req, res) => {
  try {
    const messages = await db.collection('messages')
      .find({ sessionId: req.params.sessionId })
      .sort({ timestamp: 1 })
      .toArray();
    res.json(messages);
  } catch (err) {
    console.error('Load error:', err);
    res.status(500).send('Error loading messages');
  }
});

// Sessions endpoint with optimized query
// Update the /api/sessions endpoint
// Modify the sessions endpoint to handle empty cases
app.get('/api/sessions', async (req, res) => {
  try {
    const sessions = await db.collection('messages').aggregate([
      {
        $match: { content: { $exists: true } } // Add this to filter empty messages
      },
      // ... rest of the aggregation
    ]).toArray();

    if (!sessions || sessions.length === 0) {
      return res.json([]); // Return empty array instead of error
    }
    // ... rest of the code
  } catch (err) {
    console.error("Error in /api/sessions:", err);
    res.status(500).json({ error: "Failed to fetch sessions", details: err.message });
  }
});
// Optional: Add endpoint to update session title manually
app.put('/api/sessions/:sessionId/title', async (req, res) => {
  const { title } = req.body;
  const { sessionId } = req.params;

  try {
    await db.collection('sessionTitles').updateOne(
      { sessionId },
      { $set: { title, updatedAt: new Date() } },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating session title:', err);
    res.status(500).json({ error: 'Failed to update title' });
  }
});

// Endpoint to ensure indexes are created
app.get('/api/ensure-indexes', async (req, res) => {
  try {
    await db.collection('messages').createIndex({ sessionId: 1 });
    await db.collection('messages').createIndex({ timestamp: 1 });
    res.json({ success: true });
  } catch (err) {
    console.error('Error creating indexes:', err);
    res.status(500).json({ error: 'Failed to create indexes' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});