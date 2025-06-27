// shared.js - New utility file
const utilities = {
  // Safe DOM element access
  getElement: (id) => {
    const el = document.getElementById(id);
    if (!el) console.warn(`Element #${id} not found`);
    return el;
  },

  // Safe message appending
  appendMessage: (role, content, audioBase64 = null, audioURL = null) => {
    const chatBox = document.getElementById('chatBox');
    if (!chatBox) return;

    const wrapper = document.createElement("div");
    wrapper.className = `message ${role}`;
    
    // ... (rest of your existing appendMessage implementation) ...
    chatBox.appendChild(wrapper);
    chatBox.scrollTop = chatBox.scrollHeight;
  },

  // Error handling wrapper
  safeExecute: (fn, errorMessage = '') => {
    try {
      return fn();
    } catch (err) {
      console.error(errorMessage || 'Error:', err);
      return null;
    }
  }
};

window.utils = utilities;