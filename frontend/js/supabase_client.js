/**
 * JARVIS Supabase Cloud Client
 * Connects frontend HUD directly to Supabase project for persistent cloud memory & real-time sync.
 */

const SUPABASE_URL = "https://wyowtjeiyupqpsfuvjlg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5b3d0amVpeXVwcXBzZnV2amxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4NTk2MzUsImV4cCI6MjEwODQzNTYzNX0.7VCd6ADDTOhG5kngsy9UHZImVDhMdjtaWoofAlny2kg";

class JarvisSupabaseService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this._init();
  }

  _init() {
    if (window.supabase && typeof window.supabase.createClient === "function") {
      try {
        this.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        this.isConnected = true;
        console.log("[SUPABASE] Client initialized successfully.");
      } catch (e) {
        console.warn("[SUPABASE] Initialization error:", e);
      }
    } else {
      // Fallback REST client using standard fetch
      this.isConnected = true;
    }
  }

  async logEvent(tag, message, level = "INFO") {
    try {
      if (this.client) {
        await this.client.from("jarvis_logs").insert([{ tag, message, level }]);
      } else {
        await fetch(`${SUPABASE_URL}/rest/v1/jarvis_logs`, {
          method: "POST",
          headers: {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
          },
          body: JSON.stringify({ tag, message, level })
        });
      }
    } catch (e) {
      console.warn("[SUPABASE] logEvent error:", e);
    }
  }

  async saveConversation(query, response, source = "text") {
    try {
      if (this.client) {
        await this.client.from("jarvis_conversations").insert([{
          user_query: query,
          jarvis_response: response,
          source: source,
          state: "COMPLETED"
        }]);
      } else {
        await fetch(`${SUPABASE_URL}/rest/v1/jarvis_conversations`, {
          method: "POST",
          headers: {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
          },
          body: JSON.stringify({
            user_query: query,
            jarvis_response: response,
            source: source,
            state: "COMPLETED"
          })
        });
      }
    } catch (e) {
      console.warn("[SUPABASE] saveConversation error:", e);
    }
  }

  async queueDirective(command) {
    try {
      const payload = {
        command: command,
        status: "PENDING",
        result: "Queued for local execution"
      };

      if (this.client) {
        const { data } = await this.client.from("jarvis_directives").insert([payload]).select();
        return data ? data[0] : null;
      } else {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/jarvis_directives`, {
          method: "POST",
          headers: {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
            "Prefer": "return=representation"
          },
          body: JSON.stringify(payload)
        });
        return await res.json();
      }
    } catch (e) {
      console.warn("[SUPABASE] queueDirective error:", e);
      return null;
    }
  }

  async getRecentLogs(limit = 6) {
    try {
      if (this.client) {
        const { data } = await this.client
          .from("jarvis_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(limit);
        return data || [];
      } else {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/jarvis_logs?select=*&order=created_at.desc&limit=${limit}`, {
          headers: {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
          }
        });
        return await res.json();
      }
    } catch (e) {
      return [];
    }
  }
}

window.jarvisSupabase = new JarvisSupabaseService();
