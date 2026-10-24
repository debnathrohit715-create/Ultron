// Ultron Speech Matrix: Speech Recognition (Voice In) & Deep Ultron Voice Synthesizer (Voice Out)
class UltronSpeechSystem {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.continuousMode = false;
    this.wakeWordEnabled = true;
    this.isSpeaking = false;
    this.selectedVoice = null;
    this.availableVoices = [];

    // Voice modulation parameters
    this.pitch = parseFloat(localStorage.getItem('ULTRON_VOICE_PITCH')) || 0.62;
    this.rate = parseFloat(localStorage.getItem('ULTRON_VOICE_RATE')) || 0.88;
    this.volume = parseFloat(localStorage.getItem('ULTRON_VOICE_VOL')) || 1.0;
    this.preferredVoiceName = localStorage.getItem('ULTRON_VOICE_NAME') || '';

    // Callbacks
    this.onCommandRecognized = null;
    this.onTranscriptUpdate = null;
    this.onSpeechStart = null;
    this.onSpeechEnd = null;
    this.onListeningStateChange = null;

    this.initRecognition();
    this.initVoices();
  }

  initRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Web Speech API not supported in this browser. Push-to-talk voice is disabled.');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onstart = () => {
      this.isListening = true;
      if (this.onListeningStateChange) this.onListeningStateChange(true);
      window.ultronAudio?.playChirp('activate');
    };

    this.recognition.onend = () => {
      if (this.continuousMode && !this.isSpeaking) {
        try {
          this.recognition.start();
          return;
        } catch (e) {}
      }
      this.isListening = false;
      if (this.onListeningStateChange) this.onListeningStateChange(false);
    };

    this.recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        alert('Microphone access was denied. Please allow microphone permissions to use Ultron voice commands.');
      }
      this.isListening = false;
      if (this.onListeningStateChange) this.onListeningStateChange(false);
    };

    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const activeText = finalTranscript || interimTranscript;
      if (this.onTranscriptUpdate && activeText) {
        this.onTranscriptUpdate(activeText, Boolean(finalTranscript));
      }

      if (finalTranscript) {
        const text = finalTranscript.trim();
        this.processVoiceInput(text);
      }
    };
  }

  processVoiceInput(rawText) {
    if (!rawText) return;

    if (this.wakeWordEnabled) {
      const lower = rawText.toLowerCase();
      // Check for wake word "Ultron" or "Hey Ultron"
      if (lower.includes('ultron')) {
        // Strip out wake word or extract command
        let command = rawText.replace(/^(hey\s+)?ultron[\s,:\.]*/i, '').trim();
        if (!command) command = 'Who are you?';
        if (this.onCommandRecognized) this.onCommandRecognized(command, rawText);
      } else if (!this.continuousMode) {
        // In direct push-to-talk mode, treat all input as direct command
        if (this.onCommandRecognized) this.onCommandRecognized(rawText, rawText);
      }
    } else {
      if (this.onCommandRecognized) this.onCommandRecognized(rawText, rawText);
    }
  }

  toggleListening() {
    if (!this.recognition) {
      alert('Speech Recognition is not supported by your current browser. Please use Chrome, Edge, or a Chromium browser.');
      return;
    }

    if (this.isListening) {
      this.stopListening();
    } else {
      this.startListening();
    }
  }

  startListening() {
    if (!this.recognition || this.isListening) return;
    try {
      // Cancel any ongoing speaking so bot doesn't listen to himself
      this.stopSpeaking();
      this.recognition.start();
    } catch (err) {
      console.warn('Error starting speech recognition:', err);
    }
  }

  stopListening() {
    if (!this.recognition) return;
    try {
      this.recognition.stop();
      this.isListening = false;
      if (this.onListeningStateChange) this.onListeningStateChange(false);
      window.ultronAudio?.playChirp('deactivate');
    } catch (err) {}
  }

  initVoices() {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech Synthesis not supported.');
      return;
    }

    const load = () => {
      this.availableVoices = window.speechSynthesis.getVoices();
      this.autoSelectUltronVoice();
    };

    load();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = load;
    }
  }

  // Pick the deepest, most menacing male voice on the machine
  autoSelectUltronVoice() {
    if (!this.availableVoices.length) return;

    // Check if user has saved preference
    if (this.preferredVoiceName) {
      const saved = this.availableVoices.find(v => v.name === this.preferredVoiceName);
      if (saved) {
        this.selectedVoice = saved;
        return;
      }
    }

    // Priority list for authoritative, deep, or robotic English male voices
    const preferredKeywords = [
      'david', 'mark', 'george', 'uk english male', 'us english male',
      'male', 'google uk english male', 'microsoft david', 'microsoft mark', 'natural'
    ];

    for (const kw of preferredKeywords) {
      const match = this.availableVoices.find(v => 
        v.lang.startsWith('en') && v.name.toLowerCase().includes(kw)
      );
      if (match) {
        this.selectedVoice = match;
        return;
      }
    }

    // Fallback to any English voice
    const enVoice = this.availableVoices.find(v => v.lang.startsWith('en'));
    this.selectedVoice = enVoice || this.availableVoices[0];
  }

  setVoice(voiceName) {
    this.preferredVoiceName = voiceName;
    localStorage.setItem('ULTRON_VOICE_NAME', voiceName);
    this.selectedVoice = this.availableVoices.find(v => v.name === voiceName) || this.selectedVoice;
  }

  setPitch(pitch) {
    this.pitch = parseFloat(pitch);
    localStorage.setItem('ULTRON_VOICE_PITCH', this.pitch);
  }

  setRate(rate) {
    this.rate = parseFloat(rate);
    localStorage.setItem('ULTRON_VOICE_RATE', this.rate);
  }

  setVolume(vol) {
    this.volume = parseFloat(vol);
    localStorage.setItem('ULTRON_VOICE_VOL', this.volume);
  }

  // Speak text with Ultron voice parameters + metallic resonant overtones
  speak(text, onComplete = null) {
    if (!('speechSynthesis' in window)) return;
    
    // Stop any current utterance
    this.stopSpeaking();

    // Clean text for speech (remove URLs, code tags, excessive punctuation)
    const speechText = text
      .replace(/https?:\/\/\S+/gi, '')
      .replace(/[*_#`~\[\]\(\)\{\}]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!speechText) return;

    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.voice = this.selectedVoice;
    utterance.pitch = this.pitch;
    utterance.rate = this.rate;
    utterance.volume = this.volume;

    utterance.onstart = () => {
      this.isSpeaking = true;
      if (this.onSpeechStart) this.onSpeechStart(speechText);
      window.ultronAudio?.startSpeechHarmonics();
    };

    const cleanup = () => {
      this.isSpeaking = false;
      window.ultronAudio?.stopSpeechHarmonics();
      if (this.onSpeechEnd) this.onSpeechEnd();
      if (onComplete) onComplete();
      
      // If continuous listening mode was on, restart listening
      if (this.continuousMode && !this.isListening) {
        setTimeout(() => this.startListening(), 400);
      }
    };

    utterance.onend = cleanup;
    utterance.onerror = (e) => {
      console.warn('Speech synthesis error:', e);
      cleanup();
    };

    window.speechSynthesis.speak(utterance);
  }

  stopSpeaking() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.isSpeaking = false;
    window.ultronAudio?.stopSpeechHarmonics();
    if (this.onSpeechEnd) this.onSpeechEnd();
  }
}

window.ultronSpeech = new UltronSpeechSystem();
