// storage.js - Complete Fixed Version
class ChatStorage {
  constructor() {
    this.currentSessionId = `session-${Date.now()}`;
    this.initialize();
  }

  async initialize() {
    try {
      await this.ensureIndexes();
      console.log('Storage initialized');
    } catch (err) {
      console.error('Storage init error:', err);
    }
  }

  async ensureIndexes() {
    return utils.safeExecute(async () => {
      const response = await fetch('http://localhost:3000/api/ensure-indexes');
      if (!response.ok) throw new Error('Failed to ensure indexes');
      return response.json();
    }, 'Index ensure failed');
  }

  async saveToDB(role, content, extras = {}) {
    return utils.safeExecute(async () => {
      const payload = {
        sessionId: this.currentSessionId,
        role,
        content,
        timestamp: new Date().toISOString(),
        ...extras
      };

      const response = await fetch('http://localhost:3000/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(`Save failed: ${response.status}`);
      return response.json();
    }, 'Save to DB failed');
  }

  async loadChat(sessionId) {
    return utils.safeExecute(async () => {
      const response = await fetch(`http://localhost:3000/api/messages/${sessionId}`);
      if (!response.ok) throw new Error(`Load failed: ${response.status}`);

      const messages = await response.json();
      return messages.map(msg => ({
        ...msg,
        audioURL: msg.audio && msg.type === 'voice' 
          ? `data:audio/webm;base64,${msg.audio}` 
          : null
      }));
    }, 'Load chat failed');
  }

  async getSessions() {
    return utils.safeExecute(async () => {
      const response = await fetch('http://localhost:3000/api/sessions');
      if (!response.ok) throw new Error(`Session fetch failed: ${response.status}`);

      const sessions = await response.json();
      if (!Array.isArray(sessions)) throw new Error('Invalid sessions data');

      return sessions.map(session => ({
        id: session._id || session.id,
        title: this.generateSessionTitle(session.firstMessage || ''),
        date: session.lastTimestamp || session.date,
        count: session.messageCount || session.count || 0
      }));
    }, 'Get sessions failed');
  }

  async loadSession(sessionId) {
    return utils.safeExecute(async () => {
      const messages = await this.loadChat(sessionId);
      this.currentSessionId = sessionId;
      return messages;
    }, 'Load session failed');
  }

  async loadHistoryPanel() {
    return utils.safeExecute(async () => {
      const sessionList = utils.getElement('sessionList');
      if (!sessionList) throw new Error('Session list element not found');

      sessionList.innerHTML = '<div class="session-item loading">Loading history...</div>';

      try {
        const sessions = await this.getSessions();
        
        if (!sessions || sessions.length === 0) {
          sessionList.innerHTML = '<div class="session-item empty">No chat history yet</div>';
          return;
        }

        sessionList.innerHTML = sessions.map(session => `
          <div class="session-item" data-id="${session.id}">
            <div class="session-title">${session.title}</div>
            <div class="session-date">${new Date(session.date).toLocaleString()}</div>
            <div class="session-count">${session.count} messages</div>
          </div>
        `).join('');

        // Add click handlers
        document.querySelectorAll('.session-item').forEach(item => {
          item.addEventListener('click', async () => {
            try {
              document.querySelectorAll('.session-item').forEach(i => 
                i.classList.remove('active'));
              item.classList.add('active');
              
              const sessionId = item.getAttribute('data-id');
              const messages = await this.loadSession(sessionId);
              
              const chatBox = utils.getElement('chatBox');
              if (chatBox) {
                chatBox.innerHTML = '';
                messages.forEach(msg => {
                  utils.appendMessage(msg.role, msg.content, msg.audio);
                });
              }
            } catch (err) {
              console.error('Session load error:', err);
              utils.appendMessage('system', '⚠️ Failed to load session');
            }
          });
        });

      } catch (err) {
        console.error('History load error:', err);
        sessionList.innerHTML = `
          <div class="session-item error">
            ⚠️ Error loading history: ${err.message}
          </div>
        `;
        throw err;
      }
    }, 'Load history panel failed');
  }

  newChat() {
    utils.safeExecute(() => {
      this.currentSessionId = `session-${Date.now()}`;
      
      const chatBox = utils.getElement('chatBox');
      if (chatBox) chatBox.innerHTML = '';
      
      const userInput = utils.getElement('userInput');
      if (userInput) userInput.value = '';
      
      document.querySelectorAll('.session-item').forEach(item => {
        item.classList.remove('active');
      });
      
      utils.appendMessage('system', 'New chat started!');
    }, 'New chat initialization failed');
  }

  generateSessionTitle(firstMessage) {
    if (!firstMessage) return 'New Chat';
    let title = firstMessage.trim();
    title = title.replace(/\s+/g, ' ');
    if (title.length > 50) {
      title = title.substring(0, 47) + '...';
    }
    return title.charAt(0).toUpperCase() + title.slice(1) || 'New Chat';
  }
}

// Initialize after DOM and utils are ready
function initializeStorage() {
  if (!window.utils) {
    console.error('Shared utilities not loaded');
    return null;
  }

  const storage = new ChatStorage();
  
  // Export interface
  window.storage = storage;
  window.saveToDB = storage.saveToDB.bind(storage);
  window.loadChat = storage.loadChat.bind(storage);
  window.getSessions = storage.getSessions.bind(storage);
  window.loadSession = storage.loadSession.bind(storage);
  window.loadHistoryPanel = storage.loadHistoryPanel.bind(storage);
  window.currentSessionId = () => storage.currentSessionId;

  return storage;
}

// Start initialization when both DOM and utils are ready
document.addEventListener('DOMContentLoaded', () => {
  if (window.utils) {
    initializeStorage();
  } else {
    document.addEventListener('UtilitiesLoaded', initializeStorage);
  }
});

// New chat button event (safe binding)
utils.safeExecute(() => {
  const newChatBtn = utils.getElement('newChatBtn');
  if (newChatBtn) {
    newChatBtn.addEventListener('click', () => {
      if (window.storage) {
        window.storage.newChat();
      }
    });
  }
}, 'New chat button binding failed');