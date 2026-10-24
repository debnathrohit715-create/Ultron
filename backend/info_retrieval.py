import re
import wikipedia

class InfoRetriever:
    """
    Wikipedia information scraper and summarizer with custom User-Agent
    and robust error recovery.
    """
    def __init__(self):
        # Configure English Wikipedia & Custom User-Agent to satisfy WMF API policy
        wikipedia.set_lang("en")
        wikipedia.set_user_agent("JARVIS-StarkIndustries/2.0 (mark7@stark.ai; personal desktop assistant)")

    def search_and_summarize(self, query: str, sentences: int = 2) -> str:
        """
        Scrape Wikipedia for topic and return a clean, speech-friendly summary.
        """
        clean_query = query.strip()
        # Remove common voice command prefixes
        for prefix in ["who is", "what is", "tell me about", "wikipedia", "search for", "lookup", "look up", "research"]:
            if clean_query.lower().startswith(prefix):
                clean_query = clean_query[len(prefix):].strip()

        if not clean_query:
            return "Sir, please specify the subject you wish for me to research in the archives."

        try:
            # First attempt: exact search without faulty auto_suggest
            summary = wikipedia.summary(clean_query, sentences=sentences, auto_suggest=False)
            return self._format_summary(summary)
        except wikipedia.exceptions.DisambiguationError as e:
            # Grab top alternative
            options = e.options[:3]
            try:
                first_choice = options[0]
                summary = wikipedia.summary(first_choice, sentences=sentences, auto_suggest=False)
                return f"Sir, multiple records exist. Regarding {first_choice}: {self._format_summary(summary)}"
            except Exception:
                opts_str = ", ".join(options)
                return f"Sir, '{clean_query}' refers to several topics, including {opts_str}. Please specify further."
        except wikipedia.exceptions.PageError:
            # Try search queries
            try:
                search_results = wikipedia.search(clean_query, results=3)
                if search_results:
                    summary = wikipedia.summary(search_results[0], sentences=sentences, auto_suggest=False)
                    return f"Sir, according to public archives on {search_results[0]}: {self._format_summary(summary)}"
            except Exception:
                pass
            return f"Sir, I searched public archives but could not locate an entry for '{clean_query}'."
        except Exception as e:
            return f"Sir, an anomaly occurred while accessing the public archive: {str(e)[:100]}."

    def _format_summary(self, text: str) -> str:
        """Strip citations, brackets, and phonetic guides for clean vocal delivery."""
        # Remove citations like [1], [2], [citation needed]
        text = re.sub(r"\[\d+\]", "", text)
        text = re.sub(r"\[.*?\]", "", text)
        # Remove pronunciation parenthesis like (/wɪkɪ.../)
        text = re.sub(r"\(\/[^\/]+\/\)", "", text)
        # Normalize whitespace
        text = re.sub(r"\s+", " ", text).strip()
        return text
