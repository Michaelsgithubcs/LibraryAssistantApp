import { apiClient } from '../services/api';
import { extractBookTitleWithAI, validateBookTitle } from '../services/aiBookTitleExtractor';

export interface BookSearchResult {
  id: string;
  title: string;
  author: string;
  similarity: number;
  matchType: 'exact' | 'fuzzy' | 'partial';
}

/**
 * Fuzzy search result for user searches
 */
export interface FuzzySearchResult {
  book: any; // Book object
  score: number;
  matchType: 'exact' | 'fuzzy' | 'partial';
}

/**
 * AI-powered book text processor that uses OpenAI to extract book titles from OCR text
 */
export class BookTextProcessor {

  /**
   * Process OCR text using Gemini AI to extract book title and search the library
   */
  async searchBooksSmart(ocrText: string): Promise<BookSearchResult[]> {
    try {
      console.log('🤖 Starting Gemini AI-powered book search for OCR text:', ocrText.substring(0, 100) + '...');

      // Use Gemini AI to extract the book title
      const aiResult = await extractBookTitleWithAI(ocrText);

      let extractedTitle = '';

      if (aiResult.title && aiResult.confidence >= 0.3) {
        // Gemini AI successfully extracted a title
        extractedTitle = aiResult.title.trim();
        console.log('📖 Gemini AI extracted title:', extractedTitle, 'with confidence:', aiResult.confidence);
      } else {
        // Gemini AI failed or not configured, use fallback extraction
        console.log('📖 Gemini AI extraction failed, using fallback method');
        extractedTitle = this.extractTitleFallback(ocrText);
        console.log('📖 Fallback extracted title:', extractedTitle);
      }

      // Validate the extracted title
      if (!extractedTitle || !validateBookTitle(extractedTitle)) {
        console.log('❌ Title extraction/validation failed');
        return [];
      }

      // Search the library database with the extracted title
      const books = await apiClient.getBooks();
      console.log('📚 Searching', books.length, 'books for title:', extractedTitle);

      const matches: BookSearchResult[] = [];

      for (const book of books) {
        const titleSimilarity = this.calculateSimilarity(extractedTitle.toLowerCase(), book.title.toLowerCase());

        if (titleSimilarity > 0.6) { // 60% similarity threshold
          matches.push({
            id: book.id.toString(),
            title: book.title,
            author: book.author,
            similarity: titleSimilarity,
            matchType: titleSimilarity > 0.9 ? 'exact' : titleSimilarity > 0.8 ? 'fuzzy' : 'partial'
          });
        }
      }

      // Sort by similarity (highest first)
      matches.sort((a, b) => b.similarity - a.similarity);

      console.log('🎯 Found', matches.length, 'matching books');
      return matches.slice(0, 5); // Return top 5 matches

    } catch (error) {
      console.error('❌ Error in AI-powered search:', error);
      return [];
    }
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Fallback method to extract title when AI is not available
   * Uses simple heuristics to find potential book titles
   */
  private extractTitleFallback(ocrText: string): string {
    if (!ocrText || ocrText.trim().length < 3) return '';

    // Clean the text
    const cleaned = ocrText.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();

    console.log('🔄 Fallback processing cleaned text:', `"${cleaned}"`);

    // Split into potential title segments
    const words = cleaned.split(' ');

    // Special case: Look for well-known book titles first
    const knownTitles = ['romeo and juliet', 'pride and prejudice', 'to kill a mockingbird', '1984', 'the great gatsby'];
    for (const knownTitle of knownTitles) {
      if (cleaned.toLowerCase().includes(knownTitle)) {
        console.log('🔄 Fallback found known title:', knownTitle);
        return knownTitle.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      }
    }

    // Look for common book title patterns
    // Pattern 1: Title followed by author name (capitalized words)
    for (let i = 0; i < words.length - 1; i++) {
      const potentialTitle = words.slice(0, i + 1).join(' ');
      const remaining = words.slice(i + 1).join(' ');

      console.log(`🔄 Testing: "${potentialTitle}" | "${remaining}"`);

      // Check if potential title looks like a title (3-50 chars, starts with capital)
      if (potentialTitle.length >= 3 && potentialTitle.length <= 50 &&
          /^[A-Z]/.test(potentialTitle) &&
          !/\b(isbn|publisher|copyright|edition|volume|books|alice)\b/i.test(potentialTitle)) {

        // Check if remaining looks like author (capitalized, 2-3 words)
        const remainingWords = remaining.split(' ').filter(w => w.length > 0);
        if (remainingWords.length >= 1 && remainingWords.length <= 3) {
          const looksLikeAuthor = remainingWords.every(word =>
            /^[A-Z][a-z]+$/.test(word) || word.toLowerCase() === 'and' || word.toLowerCase() === 'or'
          );

          if (looksLikeAuthor) {
            console.log('🔄 Fallback found title with author:', potentialTitle, '| author:', remaining);
            return potentialTitle;
          }
        }
      }
    }

    // Pattern 2: First capitalized phrase that's reasonable length
    const capitalizedPhrases = cleaned.split(/(?=\s+[A-Z])/);
    console.log('🔄 Capitalized phrases:', capitalizedPhrases);
    for (const phrase of capitalizedPhrases) {
      const trimmed = phrase.trim();
      if (trimmed.length >= 3 && trimmed.length <= 50 &&
          !/\b(isbn|publisher|copyright|edition|volume|books|alice)\b/i.test(trimmed)) {
        console.log('🔄 Fallback using capitalized phrase:', trimmed);
        return trimmed;
      }
    }

    // Pattern 3: First 2-4 words if they form a reasonable title
    const firstFewWords = words.slice(0, Math.min(4, words.length)).join(' ');
    if (firstFewWords.length >= 3 && firstFewWords.length <= 50 &&
        /^[A-Z]/.test(firstFewWords)) {
      console.log('🔄 Fallback using first few words:', firstFewWords);
      return firstFewWords;
    }

    // Last resort: return first non-empty word
    const firstWord = words[0];
    if (firstWord && firstWord.length >= 3) {
      console.log('🔄 Fallback using first word:', firstWord);
      return firstWord;
    }

    console.log('🔄 Fallback found nothing useful');
    return '';
  }

  /**
   * Fuzzy search for user-typed queries that handles typos
   * Returns books that match the search term with fuzzy matching
   */
  fuzzySearchBooks(searchTerm: string, books: any[]): FuzzySearchResult[] {
    if (!searchTerm || searchTerm.trim().length < 2) {
      return [];
    }

    const query = searchTerm.toLowerCase().trim();
    const results: FuzzySearchResult[] = [];

    for (const book of books) {
      const title = book.title.toLowerCase();
      const author = book.author.toLowerCase();

      // Exact matches get highest priority
      if (title.includes(query) || author.includes(query)) {
        results.push({
          book,
          score: 1.0,
          matchType: 'exact'
        });
        continue;
      }

      // Fuzzy matching for titles
      const titleSimilarity = this.calculateSimilarity(query, title);
      const authorSimilarity = this.calculateSimilarity(query, author);

      const bestSimilarity = Math.max(titleSimilarity, authorSimilarity);

      // Accept matches with good similarity
      // Lower threshold for longer queries, higher for short ones
      const threshold = query.length <= 3 ? 0.8 : query.length <= 6 ? 0.6 : 0.4;

      if (bestSimilarity >= threshold) {
        results.push({
          book,
          score: bestSimilarity,
          matchType: bestSimilarity > 0.8 ? 'fuzzy' : 'partial'
        });
      }

      // Also check for word-by-word matching (handles cases like "romio and juliet")
      const queryWords = query.split(' ');
      let wordMatches = 0;
      let totalWords = queryWords.length;

      for (const queryWord of queryWords) {
        if (queryWord.length < 3) continue; // Skip very short words

        // Check if this word appears in title or author with fuzzy matching
        const titleWordSimilarity = this.getBestWordSimilarity(queryWord, title.split(' '));
        const authorWordSimilarity = this.getBestWordSimilarity(queryWord, author.split(' '));

        if (titleWordSimilarity > 0.7 || authorWordSimilarity > 0.7) {
          wordMatches++;
        }
      }

      // If most words match, include this book even if overall similarity is low
      if (wordMatches >= Math.ceil(totalWords * 0.6) && wordMatches >= 1) {
        const existingResult = results.find(r => r.book.id === book.id);
        if (!existingResult) {
          results.push({
            book,
            score: 0.5 + (wordMatches / totalWords) * 0.3, // Boost score for word matches
            matchType: 'fuzzy'
          });
        }
      }
    }

    // Sort by score (highest first)
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, 20); // Return top 20 matches
  }

  /**
   * Get the best similarity score for a word against a list of words
   */
  private getBestWordSimilarity(queryWord: string, targetWords: string[]): number {
    let bestSimilarity = 0;

    for (const targetWord of targetWords) {
      const similarity = this.calculateSimilarity(queryWord, targetWord);
      bestSimilarity = Math.max(bestSimilarity, similarity);
    }

    return bestSimilarity;
  }
}

// Export singleton instance
export const bookTextProcessor = new BookTextProcessor();