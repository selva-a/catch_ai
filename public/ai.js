// ai.js - Complete 750+ Line Version with All Features
document.addEventListener('DOMContentLoaded', async () => {
  const waitForGlobals = () => {
    return new Promise(resolve => {
      const check = () => {
        if (window.utils && window.storage && window.ServiceManager && window.AIService) {
          resolve();
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    });
  };

  await waitForGlobals();

  const CONFIG = {
    API_KEY: "dummy_api_key",
    API_URL: "https://openrouter.ai/api/v1/chat/completions",
    MODEL: "openai/gpt-3.5-turbo",
    MAX_TOKENS: 1000,
    TEMPERATURE: 0.7,
    MAX_MESSAGES: 20,
    MAX_TOKENS_ESTIMATE: 3000
  };

  const LANGUAGE_MAPPING = {
    English: { code: 'en-US', ttsCode: 'en', ttsLang: 'en-US' },
    Hindi: { code: 'hi-IN', ttsCode: 'hi', ttsLang: 'hi-IN' },
    Tamil: { code: 'ta-IN', ttsCode: 'ta', ttsLang: 'ta-IN' },
    Spanish: { code: 'es-ES', ttsCode: 'es', ttsLang: 'es-ES' },
    French: { code: 'fr-FR', ttsCode: 'fr', ttsLang: 'fr-FR' },
    German: { code: 'de-DE', ttsCode: 'de', ttsLang: 'de-DE' },
    Japanese: { code: 'ja-JP', ttsCode: 'ja', ttsLang: 'ja-JP' },
    Chinese: { code: 'zh-CN', ttsCode: 'zh-CN', ttsLang: 'zh-CN' }
  };

  // 👇 Fix: attach globals
  const storage = window.storage;
  const utils = window.utils;

  if (!utils || !storage || !window.ServiceManager) {
    console.error('Critical dependencies missing');
    const errorMsg = document.createElement('div');
    errorMsg.className = 'system-error';
    errorMsg.textContent = '⚠️ System initialization failed. Please refresh.';
    document.body.prepend(errorMsg);
    return;
  }

  // 👇 Fix: instantiate from global scope
  const serviceManager = new window.ServiceManager();

  const registerServices = () => {
    try {
      serviceManager.registerService('normal', {
        name: "Normal Chat",
        icon: "💬",
        description: "Regular AI conversation",
        getSystemPrompt: () => "You are a helpful AI assistant.",
        activate: () => utils.appendMessage("system", "💬 Normal chat activated")
      });

      serviceManager.registerService('quiz', new window.QuizService());
      serviceManager.registerService('english-tutor', new window.EnglishTutorService());
      serviceManager.registerService('ai-tutor', new window.AITutorService());
      serviceManager.registerService('day-planner', new window.DayPlannerService());
      serviceManager.registerService('debater', new window.DebaterService());

      console.log('✅ All services registered');
    } catch (err) {
      console.error("Service registration failed:", err);
      utils.appendMessage("system", "⚠️ Service initialization failed");
    }
  };

  // ======================
  // 5. VOICE RECORDING SYSTEM
  // ======================
  const VoiceMessageSystem = {
    audioChunks: [],
    mediaRecorder: null,
    isRecording: false,
    audioContext: null,

    async checkMicrophonePermission() {
      try {
        const permission = await navigator.permissions.query({ name: 'microphone' });
        return permission.state;
      } catch (err) {
        return 'prompt';
      }
    },

    async startRecording() {
      try {
        const permissionState = await this.checkMicrophonePermission();
        if (permissionState === 'denied') {
          throw new Error('Microphone access denied by user');
        }

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("MediaDevices API not available");
        }

        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true
          },
          video: false
        });

        this.audioChunks = [];
        this.mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus',
          audioBitsPerSecond: 16000
        });

        this.mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) this.audioChunks.push(e.data);
        };

        this.mediaRecorder.onerror = (e) => {
          console.error("Recorder error:", e.error);
          this.stopRecording();
        };

        this.mediaRecorder.start(200);
        this.isRecording = true;
        return true;
      } catch (err) {
        console.error("Recording failed:", err);
        utils.appendMessage("system", `⚠️ Microphone error: ${err.message}`);
        this.cleanup();
        return false;
      }
    },

    async stopRecording() {
      return new Promise((resolve) => {
        if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
          resolve(null);
          return;
        }

        const onStop = () => {
          const audioBlob = new Blob(this.audioChunks, {
            type: 'audio/webm;codecs=opus'
          });
          this.cleanup();
          resolve(audioBlob);
        };

        this.mediaRecorder.addEventListener('stop', onStop, { once: true });
        this.mediaRecorder.stop();
      });
    },

    async blobToBase64(blob) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result;
          resolve(result.substring(result.indexOf(',') + 1));
        };
        reader.readAsDataURL(blob);
      });
    },

    cleanup() {
      if (this.mediaRecorder && this.mediaRecorder.stream) {
        this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
      }
      if (this.audioContext) {
        this.audioContext.close();
      }
      this.mediaRecorder = null;
      this.audioContext = null;
      this.isRecording = false;
    }
  };

  // ======================
  // 6. DOM MANAGEMENT
  // ======================
  const domElements = {
    servicesBtn: utils.getElement('servicesBtn'),
    servicesDropdown: utils.getElement('servicesDropdown'),
    sessionList: utils.getElement('sessionList'),
    userInput: utils.getElement('userInput'),
    sendBtn: utils.getElement('sendBtn'),
    micBtn: utils.getElement('micBtn'),
    stopBtn: utils.getElement('stopBtn'),
    themeToggle: utils.getElement('themeToggle'),
    newChatBtn: utils.getElement('newChatBtn'),
    languageSelect: utils.getElement('languageSelect'),
    typingIndicator: utils.getElement('typingIndicator'),
    listeningStatus: utils.getElement('listeningStatus'),
    chatBox: utils.getElement('chatBox'),
    currentServiceIcon: utils.getElement('currentServiceIcon'),
    currentServiceName: utils.getElement('currentServiceName')
  };

  const updateCurrentServiceUI = (serviceKey) => {
    const service = serviceManager.getActiveService();
    if (!service) return;

    if (domElements.currentServiceIcon) {
      domElements.currentServiceIcon.textContent = service.icon;
    }
    if (domElements.currentServiceName) {
      domElements.currentServiceName.textContent = service.name;
    }
  };

  const updateServicesDropdown = () => {
    if (!domElements.servicesDropdown) return;

    const services = serviceManager.getServicesList();
    domElements.servicesDropdown.innerHTML = services.map(service => `
      <a href="#" data-service="${service.key}" class="service-option">
        <span class="service-icon">${service.icon}</span>
        <span class="service-info">
          <span class="service-name">${service.name}</span>
          <span class="service-desc">${service.description}</span>
        </span>
      </a>
    `).join('');

    document.querySelectorAll('.service-option').forEach(option => {
      option.addEventListener('click', async (e) => {
        e.preventDefault();
        const serviceKey = option.getAttribute('data-service');
        await switchService(serviceKey);
        domElements.servicesDropdown.style.display = 'none';
      });
    });
  };

  const toggleServicesDropdown = () => {
    if (!domElements.servicesDropdown) return;

    if (domElements.servicesDropdown.style.display === 'block') {
      domElements.servicesDropdown.style.display = 'none';
    } else {
      domElements.servicesDropdown.style.display = 'block';
      document.addEventListener('click', function closeDropdown(e) {
        if (!domElements.servicesDropdown.contains(e.target) && 
            e.target !== domElements.servicesBtn) {
          domElements.servicesDropdown.style.display = 'none';
          document.removeEventListener('click', closeDropdown);
        }
      }, { once: true });
    }
  };

  // ======================
  // 7. CORE FUNCTIONALITY
  // ======================
  const switchService = async (serviceKey) => {
    try {
      if (activeService === serviceKey) return;

      // Start new chat session
      if (domElements.newChatBtn) {
        domElements.newChatBtn.click();
      }

      // Set new active service
      await serviceManager.setActiveService(serviceKey);
      activeService = serviceKey;
      updateCurrentServiceUI(serviceKey);

      // Show activation message
      const service = serviceManager.getActiveService();
      if (service) {
        utils.appendMessage("system", `${service.icon} ${service.name} activated`);
      }
    } catch (err) {
      console.error("Service switch failed:", err);
      utils.appendMessage("system", "⚠️ Failed to switch service");
    }
  };

  const processAIResponse = async (text) => {
    if (!text || !text.trim()) return;

    const selectedLang = domElements.languageSelect?.value || "English";
    const langConfig = LANGUAGE_MAPPING[selectedLang] || LANGUAGE_MAPPING['English'];

    if (domElements.typingIndicator) {
      domElements.typingIndicator.style.display = "block";
    }

    try {
      const conversationHistory = await conversationManager.buildOptimizedHistory();
      conversationHistory.push({
        role: "user",
        content: selectedLang !== "English" 
          ? `Please respond in ${selectedLang}:\n${text}` 
          : text
      });

      const response = await fetch(CONFIG.API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CONFIG.API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.href,
          "X-Title": "AI-Chat"
        },
        body: JSON.stringify({
          model: CONFIG.MODEL,
          messages: conversationHistory,
          max_tokens: CONFIG.MAX_TOKENS,
          temperature: CONFIG.TEMPERATURE
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API Error: ${response.status}`);
      }

      const data = await response.json();
      const aiReply = data?.choices?.[0]?.message?.content || "⚠️ No response received";

      utils.appendMessage("ai", aiReply);
      await storage.saveToDB("ai", aiReply);
      speak(aiReply, langConfig);

    } catch (err) {
      console.error("AI Error:", err);
      utils.appendMessage("ai", `⚠️ Failed to get AI response: ${err.message}`);
    } finally {
      if (domElements.typingIndicator) {
        domElements.typingIndicator.style.display = "none";
      }
    }
  };

  // ======================
  // 8. VOICE RECOGNITION
  // ======================
  let recognition;
  let transcriptFinal = "";
  let isListening = false;

  const startVoiceRecognition = () => {
    if (!domElements.listeningStatus || !domElements.micBtn || !domElements.stopBtn) {
      return;
    }

    domElements.listeningStatus.style.display = "block";
    domElements.micBtn.style.display = "none";
    domElements.stopBtn.style.display = "flex";
    isListening = true;
    domElements.userInput.placeholder = "Listening...";
    transcriptFinal = "";

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      utils.appendMessage("system", "Voice recognition not supported in your browser");
      return;
    }

    const selectedLang = domElements.languageSelect?.value || "English";
    const langConfig = LANGUAGE_MAPPING[selectedLang] || LANGUAGE_MAPPING['English'];

    recognition = new SpeechRecognition();
    recognition.lang = langConfig.code;
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (event) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          transcriptFinal += transcript + " ";
        } else {
          interimTranscript += transcript;
        }
      }
      if (domElements.userInput) {
        domElements.userInput.value = transcriptFinal + interimTranscript;
      }
    };

    recognition.onerror = (event) => {
      const errorMessages = {
        'no-speech': "No speech detected",
        'audio-capture': "No microphone found",
        'not-allowed': "Microphone access denied",
        'service-not-allowed': "Microphone access blocked",
        'network': "Network communication failed"
      };
      utils.appendMessage("system", 
        errorMessages[event.error] || `Voice error: ${event.error}`);
      stopVoiceRecognition();
    };

    recognition.onend = () => {
      if (isListening) {
        recognition.start();
      }
    };

    recognition.start();
  };

  const stopVoiceRecognition = () => {
    if (recognition) {
      recognition.stop();
      isListening = false;
    }

    if (domElements.listeningStatus) {
      domElements.listeningStatus.style.display = "none";
    }
    if (domElements.micBtn) {
      domElements.micBtn.style.display = "flex";
    }
    if (domElements.stopBtn) {
      domElements.stopBtn.style.display = "none";
    }
    if (domElements.userInput) {
      domElements.userInput.placeholder = "Type your message...";
    }
  };

  const getFinalTranscript = () => {
    const final = transcriptFinal.trim();
    transcriptFinal = "";
    return final;
  };

  // ======================
  // 9. TEXT-TO-SPEECH
  // ======================
  let currentAudio = null;

  const speak = (text, langConfig) => {
    if (!text || !text.trim()) return;

    // Cancel any ongoing speech
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }

    // Use browser TTS if available
    if (window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langConfig.ttsLang;
      utterance.rate = 0.9;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(v => 
        v.lang === langConfig.ttsLang || 
        v.lang.startsWith(langConfig.ttsCode)
      );

      if (voice) {
        utterance.voice = voice;
        window.speechSynthesis.speak(utterance);
        return;
      }
    }

    // Fallback to external TTS
    useExternalTTS(text, langConfig.ttsCode);
  };

  const useExternalTTS = (text, langCode) => {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${langCode}&client=tw-ob`;
    currentAudio = new Audio(url);
    currentAudio.play().catch(err => {
      console.error("TTS playback failed:", err);
      utils.appendMessage("system", "⚠️ Voice output unavailable");
    });
  };

  // ======================
  // 10. MAIN FUNCTIONS
  // ======================
  const sendMessage = async () => {
    try {
      const text = domElements.userInput?.value.trim();
      if (!text) return;

      utils.appendMessage("user", text);
      if (domElements.userInput) {
        domElements.userInput.value = "";
      }
      await storage.saveToDB("user", text);
      await processAIResponse(text);
    } catch (err) {
      console.error("Message send failed:", err);
      utils.appendMessage("system", "⚠️ Failed to send message");
    }
  };

  const toggleVoiceInput = async () => {
    try {
      if (VoiceMessageSystem.isRecording) {
        const audioBlob = await VoiceMessageSystem.stopRecording();
        stopVoiceRecognition();

        const finalTranscript = getFinalTranscript();
        if (finalTranscript) {
          const base64Audio = await VoiceMessageSystem.blobToBase64(audioBlob);
          const audioURL = URL.createObjectURL(audioBlob);

          utils.appendMessage("user", finalTranscript, base64Audio, audioURL);
          await storage.saveToDB("user", finalTranscript, {
            audio: base64Audio,
            type: "voice"
          });
          await processAIResponse(finalTranscript);
        }
      } else {
        const started = await VoiceMessageSystem.startRecording();
        if (started) {
          startVoiceRecognition();
        }
      }
    } catch (err) {
      console.error("Voice toggle failed:", err);
      utils.appendMessage("system", `⚠️ Voice error: ${err.message}`);
      stopVoiceRecognition();
      VoiceMessageSystem.cleanup();
    }
  };

  // ======================
  // 11. UI HELPERS
  // ======================
  const showLanguageSupportInfo = () => {
    const selectedLang = domElements.languageSelect?.value || "English";
    const langConfig = LANGUAGE_MAPPING[selectedLang];
    if (!langConfig) return;

    const support = {
      wellSupported: ['en-US', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP', 'zh-CN'],
      limitedSupport: ['hi-IN', 'ta-IN']
    };

    if (support.limitedSupport.includes(langConfig.code)) {
      const infoDiv = document.createElement('div');
      infoDiv.className = 'language-support-info';
      infoDiv.innerHTML = `
        <strong>📢 Voice Notice:</strong><br>
        ${selectedLang} has limited voice support. Try typing or use English voice input.
      `;
      if (domElements.userInput) {
        domElements.userInput.parentNode.prepend(infoDiv);
      }
      setTimeout(() => infoDiv.remove(), 8000);
    }
  };

  const updateLanguageSelectWithSupport = () => {
    if (!domElements.languageSelect) return;

    const support = {
      wellSupported: ['en-US', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP', 'zh-CN'],
      limitedSupport: ['hi-IN', 'ta-IN']
    };

    Array.from(domElements.languageSelect.options).forEach(option => {
      const langConfig = LANGUAGE_MAPPING[option.value];
      if (langConfig) {
        option.textContent = support.limitedSupport.includes(langConfig.code)
          ? `${option.value} (Limited)`
          : `${option.value} ✓`;
      }
    });
  };

  // ======================
  // 12. EVENT LISTENERS
  // ======================
  const setupEventListeners = () => {
    // Theme toggle
    if (domElements.themeToggle) {
      domElements.themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('light');
        localStorage.setItem('theme', 
          document.body.classList.contains('light') ? 'light' : 'dark'
        );
      });
    }

    // Services dropdown
    if (domElements.servicesBtn) {
      domElements.servicesBtn.addEventListener('click', toggleServicesDropdown);
    }

    // Language selection
    if (domElements.languageSelect) {
      domElements.languageSelect.addEventListener('change', showLanguageSupportInfo);
    }

    // Message input
    if (domElements.userInput) {
      domElements.userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      });

      // Auto-resize textarea
      domElements.userInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
      });
    }

    // Send button
    if (domElements.sendBtn) {
      domElements.sendBtn.addEventListener("click", sendMessage);
    }

    // Voice input buttons
    if (domElements.micBtn) {
      domElements.micBtn.addEventListener("click", toggleVoiceInput);
    }
    if (domElements.stopBtn) {
      domElements.stopBtn.addEventListener("click", toggleVoiceInput);
    }

    // New chat button
    if (domElements.newChatBtn) {
      domElements.newChatBtn.addEventListener("click", () => {
        switchService('normal');
      });
    }
  };

  // ======================
  // 13. INITIALIZATION
  // ======================
  const initializeApp = () => {
    // Set theme from localStorage
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.classList.toggle('light', savedTheme === 'light');

    // Register all services
    registerServices();

    // Setup UI components
    updateServicesDropdown();
    updateCurrentServiceUI(activeService);
    updateLanguageSelectWithSupport();

    // Load chat history
    if (domElements.sessionList) {
      storage.loadHistoryPanel();
    }

    // Setup event listeners
    setupEventListeners();

    // Initial system message
    utils.appendMessage("system", "AI Assistant initialized. How can I help you today?");
  };

  // Start the application
  initializeApp();
});
console.log("utils:", window.utils);
console.log("storage:", window.storage);

// Voice synthesis voices changed handler
if ('speechSynthesis' in window) {
  speechSynthesis.onvoiceschanged = function() {
    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) {
      const supportedLanguages = {
        'en-US': 'English',
        'hi-IN': 'Hindi',
        'ta-IN': 'Tamil',
        'es-ES': 'Spanish',
        'fr-FR': 'French',
        'de-DE': 'German',
        'ja-JP': 'Japanese',
        'zh-CN': 'Chinese'
      };
      
      const voices = speechSynthesis.getVoices();
      const availableLangs = new Set(voices.map(voice => voice.lang));
      
      Array.from(languageSelect.options).forEach(option => {
        const langCode = Object.entries(supportedLanguages).find(
          ([_, name]) => name === option.value
        )?.[0];
        
        if (langCode && !availableLangs.has(langCode)) {
          option.disabled = true;
          option.title = 'Voice not available for this language';
        }
      });
    }
  };
}
