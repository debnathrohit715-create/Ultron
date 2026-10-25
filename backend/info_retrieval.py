import re
import wikipedia

from backend.config import USER_NAME, BOT_NAME

class InfoRetriever:
    """
    Wikipedia information scraper and summarizer with custom User-Agent
    and robust error recovery.
    """
    def __init__(self):
        # Configure English Wikipedia & Custom User-Agent to satisfy WMF API policy
        wikipedia.set_lang("en")
        wikipedia.set_user_agent(f"{BOT_NAME}-DevAssistant/2.0 (contact@developer.ai; personal assistant)")

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
            return f"Hey {USER_NAME}, what topic would you like me to look up?"

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
                return f"Here is what I found regarding {first_choice}: {self._format_summary(summary)}"
            except Exception:
                opts_str = ", ".join(options)
                return f"'{clean_query}' matches several topics including {opts_str}. Could you be a bit more specific?"
        except wikipedia.exceptions.PageError:
            # Try search queries
            try:
                search_results = wikipedia.search(clean_query, results=3)
                if search_results:
                    summary = wikipedia.summary(search_results[0], sentences=sentences, auto_suggest=False)
                    return f"According to Wikipedia on {search_results[0]}: {self._format_summary(summary)}"
            except Exception:
                pass
            return f"I searched Wikipedia but couldn't find an exact entry for '{clean_query}', {USER_NAME}."
        except Exception as e:
            return f"I ran into an issue while searching Wikipedia: {str(e)[:100]}."

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
