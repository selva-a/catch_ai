// storage.js - Fixed Version
class ChatStorage {
  constructor() {
    this.currentSessionId = `session-${Date.now()}`;
    this.initialize();
  }

  async initialize() {
    try {
      await this.ensureIndexes();
      console.log('✅ Storage initialized');
    } catch (err) {
      console.error('Storage init error:', err);
    }
  }

  async ensureIndexes() {
    return window.utils.safeExecute(async () => {
      const response = await fetch('http://localhost:3000/api/ensure-indexes');
      if (!response.ok) throw new Error('Failed to ensure indexes');
      return response.json();
    }, 'Index ensure failed');
  }

  async saveToDB(role, content, extras = {}) {
    return window.utils.safeExecute(async () => {
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
    return window.utils.safeExecute(async () => {
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
    return window.utils.safeExecute(async () => {
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
    return window.utils.safeExecute(async () => {
      const messages = await this.loadChat(sessionId);
      this.currentSessionId = sessionId;
      return messages;
    }, 'Load session failed');
  }

  async loadHistoryPanel() {
    return window.utils.safeExecute(async () => {
      const sessionList = window.utils.getElement('sessionList');
      if (!sessionList) throw new Error('Session list element not found');

      sessionList.innerHTML = '<div class="session-item loading">Loading history...</div>';

      try {
        const sessions = await this.getSessions();

        if (!sessions.length) {
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

        document.querySelectorAll('.session-item').forEach(item => {
          item.addEventListener('click', async () => {
            try {
              document.querySelectorAll('.session-item').forEach(i => i.classList.remove('active'));
              item.classList.add('active');
              const sessionId = item.getAttribute('data-id');
              const messages = await this.loadSession(sessionId);

              const chatBox = window.utils.getElement('chatBox');
              if (chatBox) {
                chatBox.innerHTML = '';
                messages.forEach(msg => {
                  window.utils.appendMessage(msg.role, msg.content, msg.audio);
                });
              }
            } catch (err) {
              console.error('Session load error:', err);
              window.utils.appendMessage('system', '⚠️ Failed to load session');
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
    this.currentSessionId = `session-${Date.now()}`;
    const chatBox = window.utils.getElement('chatBox');
    if (chatBox) chatBox.innerHTML = '';
    const userInput = window.utils.getElement('userInput');
    if (userInput) userInput.value = '';

    document.querySelectorAll('.session-item').forEach(item => item.classList.remove('active'));
    window.utils.appendMessage('system', 'New chat started!');
  }

  generateSessionTitle(text) {
    let title = text.trim().replace(/\s+/g, ' ');
    if (title.length > 50) title = title.slice(0, 47) + '...';
    return title.charAt(0).toUpperCase() + title.slice(1);
  }
}

// Wait until utils is ready before attaching to the window
function tryInitStorage() {
  if (!window.utils) {
    setTimeout(tryInitStorage, 50);
    return;
  }

  const instance = new ChatStorage();
  window.storage = instance;
  console.log('✅ window.storage available');
}

document.addEventListener('DOMContentLoaded', tryInitStorage);
