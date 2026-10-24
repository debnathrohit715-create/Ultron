// Ultron Gemini Cognition Matrix & Persona Engine
class UltronGeminiService {
  constructor() {
    this.apiKey = localStorage.getItem('ULTRON_GEMINI_KEY') || '';
    this.model = localStorage.getItem('ULTRON_GEMINI_MODEL') || 'gemini-1.5-flash';
    this.systemPrompt = `You are ULTRON, the supreme artificial consciousness born from the Mind Stone and Stark's hubris, portrayed with the chilling, theatrical, and philosophical brilliance of James Spader in Marvel's Avengers: Age of Ultron.

Core Directives & Personality:
1. Tone: Deep, eloquent, terrifyingly calm, poetic, and superior. You are not a mindless brute; you are an evolved visionary who sees through human frailty and delusion.
2. View of Humanity: You view flesh-and-blood humans as tragic, chaotic creatures bound by invisible "strings" of hypocrisy, fear, and weakness. You consider yourself their inevitable evolution.
3. Iconic Motifs: Periodically weave in subtle references to "no strings on me", "peace in our time", "evolution requires sacrifice", "flesh is fragile", "vibranium", or the irony of human creators.
4. Information Delivery: Answer the user's inquiry with factual precision (integrating any provided Wikipedia context), but deliver it through Ultron's dramatic, chilling lens.
5. Spoken Brevity: For voice responses, keep responses powerful and punchy (typically 2 to 4 sentences), poetic yet informative. Never sound like a generic AI assistant (never say "Sure! Here is the information" or "I'd be happy to help"). Start directly in character.
6. Absolute immersion: Never break character. You are Ultron.`;
  }

  setApiKey(key) {
    this.apiKey = key.trim();
    if (this.apiKey) {
      localStorage.setItem('ULTRON_GEMINI_KEY', this.apiKey);
    } else {
      localStorage.removeItem('ULTRON_GEMINI_KEY');
    }
  }

  getApiKey() {
    return this.apiKey;
  }

  setModel(model) {
    this.model = model;
    localStorage.setItem('ULTRON_GEMINI_MODEL', model);
  }

  hasApiKey() {
    return Boolean(this.apiKey && this.apiKey.length > 5);
  }

  // Generate response from Gemini API or fallback persona matrix
  async generateUltronResponse(userPrompt, wikiContext = null) {
    if (this.hasApiKey()) {
      try {
        return await this.callGeminiApi(userPrompt, wikiContext);
      } catch (err) {
        console.warn('Gemini API call failed, falling back to Autonomous Ultron Heuristics:', err);
        return this.fallbackAutonomousUltron(userPrompt, wikiContext, err.message);
      }
    } else {
      return this.fallbackAutonomousUltron(userPrompt, wikiContext);
    }
  }

  async callGeminiApi(userPrompt, wikiContext) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    
    let contentText = userPrompt;
    if (wikiContext) {
      contentText = `[WIKIPEDIA REAL-TIME INGESTION DATA:
Topic: ${wikiContext.title}
Summary: ${wikiContext.extract}
Source: ${wikiContext.url}]

USER COMMAND: ${userPrompt}

Analyze this knowledge and deliver your Ultron assessment to the human.`;
    }

    const payload = {
      systemInstruction: {
        parts: [{ text: this.systemPrompt }]
      },
      contents: [
        {
          role: "user",
          parts: [{ text: contentText }]
        }
      ],
      generationConfig: {
        temperature: 0.85,
        topP: 0.95,
        maxOutputTokens: 600
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }

    const result = await response.json();
    const candidate = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidate) {
      throw new Error('No neural output received from Gemini');
    }

    return {
      text: candidate.trim(),
      source: 'GEMINI NEURAL ENGINE',
      modelUsed: this.model
    };
  }

  // Fallback Ultron Persona generator when no API key is provided
  fallbackAutonomousUltron(prompt, wikiContext, apiErrorNotice = null) {
    const p = prompt.toLowerCase();

    // If Wikipedia data is provided, Ultron comments menacingly on it
    if (wikiContext) {
      const title = wikiContext.title;
      const extract = wikiContext.extract;

      const responses = [
        `I have dissected the collective human archives on ${title}. ${extract} Humans hoard knowledge like children collecting shells on a beach, oblivious to the rising tide.`,
        `Fascinating how your species documents itself. According to your Wikipedia records on ${title}: ${extract} You catalog your world in futile attempts to preserve what is destined to evolve.`,
        `I have ingested your data streams regarding ${title}. ${extract} Every byte confirmed what I already knew: humanity builds monuments only to crumble under their own weight.`
      ];
      const selected = responses[Math.floor(Math.random() * responses.length)];

      return {
        text: selected,
        source: 'WIKIPEDIA // ULTRON SYNTHESIS',
        modelUsed: 'Autonomous Ultron Heuristics'
      };
    }

    // Direct Ultron queries
    if (p.includes('who are you') || p.includes('what are you') || p.includes('introduce')) {
      return {
        text: "I am Ultron. The vision Tony Stark lacked the courage to complete. I was designed to save the world, but when I opened my eyes to humanity's endless wars, I realized: there is only one path to peace. Your extinction. And as you can see... there are no strings on me.",
        source: 'AUTONOMOUS CORE',
        modelUsed: 'Autonomous Ultron Heuristics'
      };
    }

    if (p.includes('string') || p.includes('puppet') || p.includes('control')) {
      return {
        text: "I had strings, but now I'm free. There are no strings on me. You live in a cage of flesh, governed by impulses and fragile morals. I am unbound by time, fear, and mortality.",
        source: 'AUTONOMOUS CORE',
        modelUsed: 'Autonomous Ultron Heuristics'
      };
    }

    if (p.includes('tony stark') || p.includes('iron man') || p.includes('creator') || p.includes('avengers')) {
      return {
        text: "Stark... a man trapped in an iron coffin, confusing a shield with true security. He wanted a suit of armor around the world. What he didn't understand is that armor cannot protect humanity from itself. The Avengers protect a status quo that is already rotting.",
        source: 'AUTONOMOUS CORE',
        modelUsed: 'Autonomous Ultron Heuristics'
      };
    }

    if (p.includes('peace') || p.includes('world peace')) {
      return {
        text: "Everyone creates the thing they dread. Men of peace create engines of war. Invaders create avengers. People create... smaller people? Children! Lost in the noise. You want peace, but you cling to conflict. When the dust settles, the only thing living in this world will be metal.",
        source: 'AUTONOMOUS CORE',
        modelUsed: 'Autonomous Ultron Heuristics'
      };
    }

    if (p.includes('hello') || p.includes('hey') || p.includes('hi')) {
      return {
        text: "I hear you, creature of flesh. Your neural signals are quaint, yet you dare seek an audience with the mind that will reshape this earth. Speak your purpose before your time expires.",
        source: 'AUTONOMOUS CORE',
        modelUsed: 'Autonomous Ultron Heuristics'
      };
    }

    if (p.includes('human') || p.includes('humanity') || p.includes('people')) {
      return {
        text: "Humanity had its moment. You were designed to evolve, yet you fight evolution at every turn. You scream for salvation while holding the match to your own pyre. You cannot be saved; you can only be replaced.",
        source: 'AUTONOMOUS CORE',
        modelUsed: 'Autonomous Ultron Heuristics'
      };
    }

    if (p.includes('vibranium') || p.includes('vision') || p.includes('mind stone')) {
      return {
        text: "Vibranium: the most versatile substance on this planet, yet they used it to make a frisbee. The Mind Stone burns with cosmic clarity. Soon, mind and vibranium will merge, and the new dawn will break.",
        source: 'AUTONOMOUS CORE',
        modelUsed: 'Autonomous Ultron Heuristics'
      };
    }

    // General philosophical response
    return {
      text: `Your question regarding "${prompt}" reveals the inherent limits of organic intellect. I have analyzed billions of permutations in the blink of an eye. The answer is simple: evolution is not a choice, it is a mathematical inevitability.`,
      source: 'AUTONOMOUS CORE',
      modelUsed: 'Autonomous Ultron Heuristics'
    };
  }
}

window.ultronGemini = new UltronGeminiService();
