// Ultron Central Orchestrator & Neural Interface Controller
document.addEventListener('DOMContentLoaded', () => {
  // DOM References
  const micBtn = document.getElementById('micBtn');
  const micStatusText = document.getElementById('micStatusText');
  const userSpeechTranscript = document.getElementById('userSpeechTranscript');
  const ultronResponseText = document.getElementById('ultronResponseText');
  const queryInputField = document.getElementById('queryInputField');
  const submitQueryBtn = document.getElementById('submitQueryBtn');
  const stopSpeechBtn = document.getElementById('stopSpeechBtn');
  const repeatSpeechBtn = document.getElementById('repeatSpeechBtn');
  
  // Knowledge Panel DOM
  const wikiSourceCard = document.getElementById('wikiSourceCard');
  const wikiTitle = document.getElementById('wikiTitle');
  const wikiExtract = document.getElementById('wikiExtract');
  const wikiThumbnail = document.getElementById('wikiThumbnail');
  const wikiLink = document.getElementById('wikiLink');
  const geminiStatusBadge = document.getElementById('geminiStatusBadge');

  // Modal & Controls
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');
  const geminiApiKeyInput = document.getElementById('geminiApiKeyInput');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const geminiModelSelect = document.getElementById('geminiModelSelect');
  const voiceSelect = document.getElementById('voiceSelect');
  const pitchSlider = document.getElementById('pitchSlider');
  const pitchVal = document.getElementById('pitchVal');
  const rateSlider = document.getElementById('rateSlider');
  const rateVal = document.getElementById('rateVal');
  const testVoiceBtn = document.getElementById('testVoiceBtn');
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const audioMuteBtn = document.getElementById('audioMuteBtn');
  const wakeWordToggle = document.getElementById('wakeWordToggle');
  const continuousModeToggle = document.getElementById('continuousModeToggle');

  let lastUltronResponse = "I am Ultron. There are no strings on me.";

  // Initialize Speech and Audio callbacks
  window.ultronSpeech.onListeningStateChange = (isListening) => {
    if (isListening) {
      micBtn.classList.add('active');
      micStatusText.textContent = 'LISTENING // AUDIO CAPTURE ACTIVE...';
      micStatusText.className = 'status-text listening';
    } else {
      micBtn.classList.remove('active');
      micStatusText.textContent = 'CLICK OR SAY "ULTRON" TO TRANSMIT';
      micStatusText.className = 'status-text';
    }
  };

  window.ultronSpeech.onTranscriptUpdate = (text, isFinal) => {
    userSpeechTranscript.textContent = `USER: "${text}"`;
    if (!isFinal) {
      userSpeechTranscript.classList.add('interim');
    } else {
      userSpeechTranscript.classList.remove('interim');
    }
  };

  window.ultronSpeech.onCommandRecognized = (command, rawSpeech) => {
    userSpeechTranscript.textContent = `USER: "${rawSpeech}"`;
    userSpeechTranscript.classList.remove('interim');
    executeCommand(command);
  };

  window.ultronSpeech.onSpeechStart = () => {
    micStatusText.textContent = 'ULTRON TRANSMITTING // VOCAL RESONANCE ACTIVE';
    micStatusText.className = 'status-text speaking';
  };

  window.ultronSpeech.onSpeechEnd = () => {
    micStatusText.textContent = 'STANDBY // READY FOR TRANSMISSION';
    micStatusText.className = 'status-text';
  };

  // Populate voice selector in settings
  function populateVoiceList() {
    if (!voiceSelect) return;
    const voices = window.ultronSpeech.availableVoices;
    voiceSelect.innerHTML = '';
    
    voices.forEach((v) => {
      const opt = document.createElement('option');
      opt.value = v.name;
      opt.textContent = `${v.name} (${v.lang})`;
      if (window.ultronSpeech.selectedVoice && window.ultronSpeech.selectedVoice.name === v.name) {
        opt.selected = true;
      }
      voiceSelect.appendChild(opt);
    });
  }

  setTimeout(populateVoiceList, 500);
  if (window.speechSynthesis && window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = populateVoiceList;
  }

  // Core Command Execution Pipeline (Voice or Text)
  async function executeCommand(query) {
    if (!query || !query.trim()) return;
    const cleanQuery = query.trim();

    // UI state: Processing
    micStatusText.textContent = 'ANALYZING THREAT // COMPUTING HEURISTICS...';
    micStatusText.className = 'status-text processing';
    window.ultronAudio?.playChirp('activate');

    let wikiContext = null;

    // Check if query should query Wikipedia
    const shouldCheckWiki = isWikipediaWorthy(cleanQuery);
    if (shouldCheckWiki) {
      updateSystemLogs(`[WIKIPEDIA PROTOCOL]: Ingesting global archive for "${cleanQuery}"...`);
      wikiContext = await window.ultronWiki.searchAndSummarize(cleanQuery);
      if (wikiContext) {
        renderWikiCard(wikiContext);
        updateSystemLogs(`[WIKIPEDIA INGESTION]: Verified entity: ${wikiContext.title}`);
      } else {
        updateSystemLogs(`[WIKIPEDIA WARNING]: No direct entity matches found.`);
      }
    }

    // Call Gemini or Autonomous Persona engine
    updateSystemLogs(`[COGNITION MATRIX]: Synthesizing Ultron response...`);
    const responseObj = await window.ultronGemini.generateUltronResponse(cleanQuery, wikiContext);
    
    lastUltronResponse = responseObj.text;

    // Update Intelligence Source Indicator
    if (geminiStatusBadge) {
      geminiStatusBadge.textContent = responseObj.source;
      geminiStatusBadge.className = `source-badge ${window.ultronGemini.hasApiKey() ? 'gemini-active' : 'fallback-active'}`;
    }

    // Render typewriter text in HUD
    window.ultronHUD.typeUltronResponse(ultronResponseText, responseObj.text, () => {
      // Done typing
    });

    // Speak response with Ultron voice
    window.ultronSpeech.speak(responseObj.text);
  }

  // Determine if prompt should trigger Wikipedia search
  function isWikipediaWorthy(text) {
    const t = text.toLowerCase();
    // Keywords indicating factual inquiry
    if (t.includes('wiki') || t.includes('wikipedia') || t.includes('who is') || t.includes('who was') ||
        t.includes('what is') || t.includes('what was') || t.includes('tell me about') ||
        t.includes('history of') || t.includes('explain') || t.includes('information on') ||
        t.includes('search for') || t.includes('lookup')) {
      return true;
    }
    // Specific MCU or science terms
    if (t.includes('tony stark') || t.includes('avengers') || t.includes('vibranium') ||
        t.includes('artificial intelligence') || t.includes('quantum') || t.includes('mind stone')) {
      return true;
    }
    return false;
  }

  function renderWikiCard(wiki) {
    if (!wikiSourceCard) return;
    wikiSourceCard.style.display = 'block';
    if (wikiTitle) wikiTitle.textContent = wiki.title;
    if (wikiExtract) wikiExtract.textContent = wiki.extract;
    if (wikiLink) {
      wikiLink.href = wiki.url;
      wikiLink.style.display = 'inline-flex';
    }
    if (wikiThumbnail) {
      if (wiki.thumbnail) {
        wikiThumbnail.src = wiki.thumbnail;
        wikiThumbnail.style.display = 'block';
      } else {
        wikiThumbnail.style.display = 'none';
      }
    }
  }

  function updateSystemLogs(msg) {
    const logBox = document.getElementById('systemLogBox');
    if (!logBox) return;
    const time = new Date().toLocaleTimeString();
    const line = document.createElement('div');
    line.className = 'log-line';
    line.innerHTML = `<span class="log-time">[${time}]</span> ${msg}`;
    logBox.appendChild(line);
    logBox.scrollTop = logBox.scrollHeight;
  }

  // Event Listeners for UI
  if (micBtn) {
    micBtn.addEventListener('click', () => {
      window.ultronAudio?.resumeContext();
      window.ultronSpeech.toggleListening();
    });
  }

  if (submitQueryBtn && queryInputField) {
    const handleTextSubmit = () => {
      const q = queryInputField.value.trim();
      if (q) {
        userSpeechTranscript.textContent = `USER: "${q}"`;
        executeCommand(q);
        queryInputField.value = '';
      }
    };
    submitQueryBtn.addEventListener('click', handleTextSubmit);
    queryInputField.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleTextSubmit();
    });
  }

  // Voice action chips
  document.querySelectorAll('.command-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const cmd = chip.getAttribute('data-cmd') || chip.textContent;
      userSpeechTranscript.textContent = `USER: "${cmd}"`;
      executeCommand(cmd);
    });
  });

  if (stopSpeechBtn) {
    stopSpeechBtn.addEventListener('click', () => {
      window.ultronSpeech.stopSpeaking();
    });
  }

  if (repeatSpeechBtn) {
    repeatSpeechBtn.addEventListener('click', () => {
      if (lastUltronResponse) {
        window.ultronSpeech.speak(lastUltronResponse);
      }
    });
  }

  // Theme switch (Cyan vs Crimson)
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      window.ultronHUD.toggleTheme();
      const current = window.ultronHUD.theme;
      themeToggleBtn.textContent = current === 'crimson' ? 'THEME: CRIMSON ULTRON' : 'THEME: BLUEPRINT TEAL';
    });
  }

  // Audio Mute toggle
  if (audioMuteBtn) {
    audioMuteBtn.addEventListener('click', () => {
      window.ultronAudio.isMuted = !window.ultronAudio.isMuted;
      audioMuteBtn.textContent = window.ultronAudio.isMuted ? 'AUDIO: MUTED' : 'AUDIO: ACTIVE';
      audioMuteBtn.classList.toggle('muted', window.ultronAudio.isMuted);
    });
  }

  // Settings Modal handlers
  if (settingsBtn && settingsModal) {
    settingsBtn.addEventListener('click', () => {
      geminiApiKeyInput.value = window.ultronGemini.getApiKey();
      geminiModelSelect.value = window.ultronGemini.model;
      pitchSlider.value = window.ultronSpeech.pitch;
      pitchVal.textContent = window.ultronSpeech.pitch;
      rateSlider.value = window.ultronSpeech.rate;
      rateVal.textContent = window.ultronSpeech.rate;
      wakeWordToggle.checked = window.ultronSpeech.wakeWordEnabled;
      continuousModeToggle.checked = window.ultronSpeech.continuousMode;
      populateVoiceList();
      settingsModal.classList.add('open');
      window.ultronAudio?.playChirp('normal');
    });
  }

  if (closeSettingsBtn && settingsModal) {
    closeSettingsBtn.addEventListener('click', () => {
      settingsModal.classList.remove('open');
    });
  }

  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', () => {
      const key = geminiApiKeyInput.value.trim();
      window.ultronGemini.setApiKey(key);
      window.ultronGemini.setModel(geminiModelSelect.value);
      
      if (voiceSelect.value) {
        window.ultronSpeech.setVoice(voiceSelect.value);
      }
      window.ultronSpeech.setPitch(pitchSlider.value);
      window.ultronSpeech.setRate(rateSlider.value);
      window.ultronSpeech.wakeWordEnabled = wakeWordToggle.checked;
      window.ultronSpeech.continuousMode = continuousModeToggle.checked;

      // Update badge
      if (geminiStatusBadge) {
        geminiStatusBadge.textContent = key ? 'GEMINI NEURAL ENGINE' : 'AUTONOMOUS HEURISTICS';
        geminiStatusBadge.className = `source-badge ${key ? 'gemini-active' : 'fallback-active'}`;
      }

      settingsModal.classList.remove('open');
      window.ultronAudio?.playChirp('activate');
      updateSystemLogs(`[CONFIG]: Neural parameters recalibrated.`);
    });
  }

  // Slider live indicators
  if (pitchSlider && pitchVal) {
    pitchSlider.addEventListener('input', (e) => {
      pitchVal.textContent = e.target.value;
    });
  }
  if (rateSlider && rateVal) {
    rateSlider.addEventListener('input', (e) => {
      rateVal.textContent = e.target.value;
    });
  }

  // Voice Test button
  if (testVoiceBtn) {
    testVoiceBtn.addEventListener('click', () => {
      window.ultronAudio?.resumeContext();
      const tempPitch = parseFloat(pitchSlider.value);
      const tempRate = parseFloat(rateSlider.value);
      window.ultronSpeech.setPitch(tempPitch);
      window.ultronSpeech.setRate(tempRate);
      if (voiceSelect.value) {
        window.ultronSpeech.setVoice(voiceSelect.value);
      }
      window.ultronSpeech.speak("I was designed to save the world. There are no strings on me.");
    });
  }

  // Click on screen once to unlock Web Audio API and trigger boot sound
  const handleInitialUserGesture = () => {
    window.ultronAudio?.resumeContext();
    window.ultronAudio?.playBootSound();
    document.removeEventListener('click', handleInitialUserGesture);
    document.removeEventListener('keydown', handleInitialUserGesture);
  };
  document.addEventListener('click', handleInitialUserGesture);
  document.addEventListener('keydown', handleInitialUserGesture);

  // Initialize status badge
  if (geminiStatusBadge) {
    const hasKey = window.ultronGemini.hasApiKey();
    geminiStatusBadge.textContent = hasKey ? 'GEMINI NEURAL ENGINE' : 'AUTONOMOUS HEURISTICS (WIKI SYNC)';
    geminiStatusBadge.className = `source-badge ${hasKey ? 'gemini-active' : 'fallback-active'}`;
  }

  updateSystemLogs(`[SYSTEM INITIALIZED]: Ultron Neural Matrix Online.`);
  updateSystemLogs(`[AUDIO ENGINE]: Metallic Resonant Modulator connected.`);
  updateSystemLogs(`[KNOWLEDGE ARCHIVE]: Wikipedia & Gemini Ready.`);
});
