/**
 * Intelligent Keyword Extraction
 *
 * Multi-strategy approach:
 * 1. Regex + Stopword filtering (fast, reliable)
 * 2. TF-IDF (better relevance ranking)
 * 3. Transformer NER (future: optional, advanced)
 */

import type {
  ExtractedKeyword,
  KeywordExtractionOptions,
  KeywordExtractionResult,
} from './types';

const COMMON_STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
  'any', 'are', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below',
  'between', 'both', 'but', 'by', 'can', 'could', 'did', 'do', 'does', 'doing',
  'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have',
  'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how',
  'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'might', 'more',
  'most', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'only', 'or', 'other', 'out',
  'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than', 'that', 'the',
  'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this',
  'those', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what',
  'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'will', 'with', 'you',
  'your', 'yours', 'yourself', 'yourselves', 'would', 'also', 'see', 'like', 'just',
  'get', 'go', 'make', 'take', 'come', 'want', 'think', 'use', 'show', 'know', 'try',
  'feel', 'give', 'work', 'call', 'put', 'mean', 'keep', 'let', 'begin', 'seem', 'help',
  'talk', 'turn', 'start', 'find', 'tell', 'ask', 'need', 'feel', 'try', 'leave',
  'put', 'say', 'must', 'can', 'may', 'shall', 'should', 'would', 'could', 'might',
]);

export class KeywordExtractor {
  private minFrequency: number = 1;
  private minLength: number = 3;
  private maxKeywords: number = 10;
  private excludeStopwords: boolean = true;

  constructor(options?: Partial<KeywordExtractionOptions>) {
    if (options?.minFrequency) this.minFrequency = options.minFrequency;
    if (options?.minLength) this.minLength = options.minLength;
    if (options?.maxKeywords) this.maxKeywords = options.maxKeywords;
    if (options?.excludeStopwords !== undefined) {
      this.excludeStopwords = options.excludeStopwords;
    }
  }

  /**
   * Extract keywords using specified strategy
   */
  async extract(
    text: string,
    strategy: 'regex' | 'tfidf' | 'transformer' = 'tfidf'
  ): Promise<KeywordExtractionResult> {
    if (!text || text.trim().length === 0) {
      return {
        keywords: [],
        totalWords: 0,
        language: 'en',
        confidence: 0,
      };
    }

    const cleanText = this.normalizeText(text);
    const words = cleanText.split(/\s+/);
    const totalWords = words.length;

    let keywords: ExtractedKeyword[] = [];

    switch (strategy) {
      case 'regex':
        keywords = this.extractViaRegex(cleanText);
        break;
      case 'tfidf':
        keywords = this.extractViaTfIdf(words);
        break;
      case 'transformer':
        keywords = await this.extractViaTransformer(text);
        break;
      default:
        keywords = this.extractViaTfIdf(words);
    }

    // Filter by minimum frequency and length
    keywords = keywords.filter(
      (k) =>
        k.frequency >= this.minFrequency &&
        k.text.length >= this.minLength
    );

    // Sort by score descending
    keywords.sort((a, b) => b.score - a.score);

    // Limit to maxKeywords
    keywords = keywords.slice(0, this.maxKeywords);

    const confidence =
      keywords.length > 0
        ? keywords.reduce((sum, k) => sum + k.score, 0) / keywords.length
        : 0;

    return {
      keywords,
      totalWords,
      language: 'en',
      confidence: Math.min(1, confidence),
    };
  }

  /**
   * Fast regex-based extraction (fallback)
   * Matches capitalized words, proper nouns, quoted phrases
   */
  private extractViaRegex(text: string): ExtractedKeyword[] {
    const keywords = new Map<string, number>();

    // Extract capitalized words (proper nouns)
    const capitalizedMatches = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
    capitalizedMatches.forEach((match) => {
      const key = match.toLowerCase();
      if (!this.excludeStopwords || !COMMON_STOPWORDS.has(key)) {
        keywords.set(key, (keywords.get(key) || 0) + 2); // Higher weight
      }
    });

    // Extract quoted phrases
    const quotedMatches = text.match(/'([^']+)'|"([^"]+)"/g) || [];
    quotedMatches.forEach((match) => {
      const key = match.slice(1, -1).toLowerCase();
      if (key.length >= this.minLength) {
        keywords.set(key, (keywords.get(key) || 0) + 1.5);
      }
    });

    // Extract content words (nouns and adjectives - simple heuristic)
    const wordMatches = text.match(/\b[a-z]+(?:['-][a-z]+)*\b/g) || [];
    wordMatches.forEach((word) => {
      if (
        word.length >= this.minLength &&
        (!this.excludeStopwords || !COMMON_STOPWORDS.has(word))
      ) {
        keywords.set(word, (keywords.get(word) || 0) + 1);
      }
    });

    return Array.from(keywords.entries()).map(([text, frequency]) => ({
      text,
      frequency,
      score: Math.min(1, frequency / 5), // Normalize to 0-1
      type: this.guessWordType(text),
    }));
  }

  /**
   * TF-IDF-based extraction (better relevance)
   * Balances term frequency with inverse document frequency
   */
  private extractViaTfIdf(words: string[]): ExtractedKeyword[] {
    const wordFreq = new Map<string, number>();
    const uniqueWords = new Set<string>();

    // Calculate term frequency
    words.forEach((word) => {
      const clean = word.toLowerCase().replace(/[^\w'-]/g, '');
      if (
        clean.length >= this.minLength &&
        (!this.excludeStopwords || !COMMON_STOPWORDS.has(clean))
      ) {
        wordFreq.set(clean, (wordFreq.get(clean) || 0) + 1);
        uniqueWords.add(clean);
      }
    });

    const totalWords = words.length;
    const uniqueCount = uniqueWords.size;

    // Calculate TF-IDF scores
    const tfidfScores: ExtractedKeyword[] = Array.from(wordFreq.entries()).map(
      ([text, frequency]) => {
        const tf = frequency / totalWords; // Term frequency
        const idf = Math.log(totalWords / frequency); // Inverse document frequency
        const tfidf = tf * idf;

        return {
          text,
          frequency,
          score: Math.min(1, tfidf), // Normalize
          type: this.guessWordType(text),
        };
      }
    );

    return tfidfScores;
  }

  /**
   * Advanced transformer-based extraction (future implementation)
   * Requires optional model loading
   */
  private async extractViaTransformer(text: string): Promise<ExtractedKeyword[]> {
    try {
      // TODO: Load transformer model (e.g., @xenova/transformers)
      // For now, fall back to TF-IDF
      console.warn('Transformer extraction not yet implemented, falling back to TF-IDF');
      const words = text.split(/\s+/);
      return this.extractViaTfIdf(words);
    } catch (error) {
      console.error('Transformer extraction failed:', error);
      return [];
    }
  }

  /**
   * Normalize text for processing
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFKD')
      .trim()
      .replace(/\s+/g, ' ');
  }

  /**
   * Simple part-of-speech guessing
   */
  private guessWordType(
    word: string
  ): 'noun' | 'verb' | 'adjective' | 'unknown' {
    // Very simple heuristic - in production, use actual POS tagger
    if (word.endsWith('ing') || word.endsWith('ed')) return 'verb';
    if (word.endsWith('ly')) return 'adjective';
    if (word.endsWith('tion') || word.endsWith('ment')) return 'noun';
    return 'noun'; // Default to noun (most searchable)
  }

  /**
   * Merge multiple extraction results (for ensemble approach)
   */
  static mergeResults(results: KeywordExtractionResult[]): KeywordExtractionResult {
    if (results.length === 0) {
      return { keywords: [], totalWords: 0, language: 'en', confidence: 0 };
    }

    const keywordMap = new Map<string, ExtractedKeyword>();

    // Combine results, averaging scores
    results.forEach((result) => {
      result.keywords.forEach((keyword) => {
        if (keywordMap.has(keyword.text)) {
          const existing = keywordMap.get(keyword.text)!;
          existing.score = (existing.score + keyword.score) / 2;
          existing.frequency += keyword.frequency;
        } else {
          keywordMap.set(keyword.text, { ...keyword });
        }
      });
    });

    const mergedKeywords = Array.from(keywordMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    const avgConfidence =
      results.reduce((sum, r) => sum + r.confidence, 0) / results.length;

    return {
      keywords: mergedKeywords,
      totalWords: results[0].totalWords,
      language: 'en',
      confidence: avgConfidence,
    };
  }
}

/**
 * Convenience function for quick extraction
 */
export async function extractKeywords(
  text: string,
  options?: Partial<KeywordExtractionOptions>
): Promise<KeywordExtractionResult> {
  const extractor = new KeywordExtractor(options);
  return extractor.extract(text, options?.strategy || 'tfidf');
}
