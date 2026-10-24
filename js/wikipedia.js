// Ultron Wikipedia Ingestion Matrix
class UltronWikipediaService {
  constructor() {
    this.apiBase = 'https://en.wikipedia.org/w/api.php';
    this.restBase = 'https://en.wikipedia.org/api/rest_v1/page/summary/';
  }

  // Searches Wikipedia for a query and retrieves the top article with its summary
  async searchAndSummarize(query) {
    try {
      // Step 1: Clean search term
      const cleanQuery = this.cleanSearchQuery(query);
      if (!cleanQuery) return null;

      // Step 2: Query MediaWiki search API
      const searchUrl = `${this.apiBase}?action=query&list=search&srsearch=${encodeURIComponent(cleanQuery)}&utf8=&format=json&origin=*&srlimit=3`;
      const res = await fetch(searchUrl);
      if (!res.ok) throw new Error(`Wikipedia search failed with status ${res.status}`);
      
      const data = await res.json();
      if (!data.query || !data.query.search || data.query.search.length === 0) {
        return null;
      }

      // Pick top result
      const topHit = data.query.search[0];
      const pageTitle = topHit.title;

      // Step 3: Fetch REST page summary for rich metadata (extract, thumbnail, description)
      const summaryUrl = `${this.restBase}${encodeURIComponent(pageTitle)}`;
      const summaryRes = await fetch(summaryUrl);
      
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        return {
          title: summaryData.title || pageTitle,
          extract: summaryData.extract || this.stripHtml(topHit.snippet),
          description: summaryData.description || 'Global Knowledge Archive',
          thumbnail: summaryData.thumbnail ? summaryData.thumbnail.source : null,
          url: summaryData.content_urls ? summaryData.content_urls.desktop.page : `https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}`,
          pageId: summaryData.pageid || topHit.pageid,
          source: 'WIKIPEDIA ARCHIVES'
        };
      }

      // Fallback if REST summary fails
      return {
        title: topHit.title,
        extract: this.stripHtml(topHit.snippet),
        description: 'Global Knowledge Archive',
        thumbnail: null,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(topHit.title)}`,
        pageId: topHit.pageid,
        source: 'WIKIPEDIA ARCHIVES'
      };
    } catch (err) {
      console.warn('Ultron Wikipedia Ingestion Warning:', err);
      return null;
    }
  }

  // Extracts the core subject from natural speech like "Ultron, tell me about Tony Stark" or "Who was Albert Einstein"
  cleanSearchQuery(query) {
    let q = query.trim();
    // Remove wake words & bot greetings
    q = q.replace(/^(hey\s+)?ultron[\s,:\.]*/i, '');
    // Remove inquiry preambles
    q = q.replace(/^(who is|who was|what is|what are|what was|tell me about|explain|search wikipedia for|search for|information on|lookup|analyze)\s+/i, '');
    // Remove punctuation
    q = q.replace(/[\?\!]+$/, '').trim();
    return q || query;
  }

  stripHtml(html) {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }
}

window.ultronWiki = new UltronWikipediaService();
