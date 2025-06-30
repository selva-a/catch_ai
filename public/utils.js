// utils.js
window.utils = {
  getElement(id) {
    return document.getElementById(id);
  },

  appendMessage(role, content, audioBase64 = null, audioURL = null) {
    const chatBox = document.getElementById("chatBox");
    if (!chatBox) return;

    const messageWrapper = document.createElement("div");
    messageWrapper.className = `message ${role}`;

    const messageText = document.createElement("div");
    messageText.className = "message-text";
    messageText.textContent = content;

    messageWrapper.appendChild(messageText);

    if (audioURL) {
      const audio = document.createElement("audio");
      audio.controls = true;
      audio.src = audioURL;
      audio.className = "audio-player";
      messageWrapper.appendChild(audio);
    }

    chatBox.appendChild(messageWrapper);
    chatBox.scrollTop = chatBox.scrollHeight;
  }
};
