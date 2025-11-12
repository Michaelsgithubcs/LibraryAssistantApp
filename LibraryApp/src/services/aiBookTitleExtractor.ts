import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { AI_CONFIG } from '../config/ai';

// Initialize AI clients
let genAI: GoogleGenerativeAI | null = null;
let openai: OpenAI | null = null;

// Initialize Gemini if API key is available
if (AI_CONFIG.GEMINI_API_KEY && AI_CONFIG.GEMINI_API_KEY !== 'your-gemini-api-key-here' && AI_CONFIG.GEMINI_API_KEY !== 'AIzaSyD-example-key-here') {
  console.log('🤖 Initializing Gemini AI with key starting with:', AI_CONFIG.GEMINI_API_KEY.substring(0, 10) + '...');
  genAI = new GoogleGenerativeAI(AI_CONFIG.GEMINI_API_KEY);
  console.log('🤖 Gemini AI initialized successfully');
} else {
  console.log('🤖 Gemini AI not configured');
}

// Initialize OpenAI if API key is available
if (AI_CONFIG.OPENAI_API_KEY && AI_CONFIG.OPENAI_API_KEY !== 'your-openai-api-key-here') {
  console.log('🤖 Initializing OpenAI with key starting with:', AI_CONFIG.OPENAI_API_KEY.substring(0, 10) + '...');
  openai = new OpenAI({
    apiKey: AI_CONFIG.OPENAI_API_KEY,
  });
  console.log('🤖 OpenAI initialized successfully');
} else {
  console.log('🤖 OpenAI not configured');
}

export interface BookTitleExtraction {
  title: string;
  confidence: number;
  error?: string;
}

/**
 * Uses AI to extract book title from OCR text
 * @param ocrText The raw text extracted from OCR
 * @returns Promise<BookTitleExtraction> with the extracted title and confidence score
 */
export const extractBookTitleWithAI = async (ocrText: string): Promise<BookTitleExtraction> => {
  try {
    console.log('🤖 extractBookTitleWithAI called with text:', ocrText);

    if (!ocrText || ocrText.trim().length < 3) {
      console.log('🤖 OCR text too short or empty');
      return {
        title: '',
        confidence: 0,
        error: 'OCR text is too short or empty'
      };
    }

    // Try Gemini AI first
    if (genAI) {
      try {
        console.log('🤖 Trying Gemini AI first...');
        const geminiResult = await tryGeminiAI(ocrText);
        if (geminiResult.title) {
          console.log('✅ Gemini AI succeeded:', geminiResult.title);
          return geminiResult;
        }
      } catch (error) {
        console.log('❌ Gemini AI failed:', error);
      }
    }

    // Try OpenAI as fallback
    if (openai) {
      try {
        console.log('🤖 Trying OpenAI as fallback...');
        const openaiResult = await tryOpenAI(ocrText);
        if (openaiResult.title) {
          console.log('✅ OpenAI succeeded:', openaiResult.title);
          return openaiResult;
        }
      } catch (error) {
        console.log('❌ OpenAI failed:', error);
      }
    }

    // Both AI services failed
    console.log('❌ Both AI services failed, using fallback');
    return {
      title: '',
      confidence: 0,
      error: 'All AI services failed. Please check your API keys.'
    };

  } catch (error) {
    console.error('🤖 AI extraction error:', error);
    return {
      title: '',
      confidence: 0,
      error: `AI extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

/**
 * Try to extract book title using Gemini AI
 */
const tryGeminiAI = async (ocrText: string): Promise<BookTitleExtraction> => {
  // Try different Gemini models in order of preference
  const modelsToTry = ['gemini-pro', 'gemini-1.5-flash', 'gemini-1.0-pro'];
  let model;
  let lastError;

  for (const modelName of modelsToTry) {
    try {
      console.log(`🤖 Testing Gemini model: ${modelName}`);
      model = genAI!.getGenerativeModel({ model: modelName });

      // Test the model with a simple request
      const testResult = await model.generateContent('Hello');
      await testResult.response; // This will throw if the model doesn't work
      console.log(`✅ Gemini model ${modelName} works!`);
      break; // If we get here without error, use this model
    } catch (error) {
      console.log(`❌ Gemini model ${modelName} failed:`, error);
      lastError = error;
      continue;
    }
  }

  if (!model) {
    throw new Error(`No available Gemini models. Last error: ${lastError}`);
  }

  const prompt = `Extract the book title from this OCR text. Return ONLY the book title, nothing else. If no clear book title is found, return "NO_TITLE_FOUND".

OCR Text:
${ocrText}

Book Title:`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const extractedTitle = response.text().trim();

  console.log('🤖 Gemini raw response:', extractedTitle);

  if (!extractedTitle || extractedTitle === 'NO_TITLE_FOUND') {
    throw new Error('No book title found in the text');
  }

  // Calculate confidence based on response characteristics
  let confidence = 0.8; // Base confidence for successful extraction with Gemini

  // Reduce confidence if title is very short (might be a fragment)
  if (extractedTitle.length < 3) {
    confidence = 0.4;
  }
  // Reduce confidence if title is very long (might include extra text)
  else if (extractedTitle.length > 100) {
    confidence = 0.6;
  }
  // Increase confidence if title looks like a proper book title (has some structure)
  else if (extractedTitle.includes(' ') && extractedTitle.length > 5) {
    confidence = 0.9;
  }

  return {
    title: extractedTitle,
    confidence
  };
};

/**
 * Try to extract book title using OpenAI
 */
const tryOpenAI = async (ocrText: string): Promise<BookTitleExtraction> => {
  const prompt = `Extract the book title from this OCR text. Return ONLY the book title, nothing else. If no clear book title is found, return "NO_TITLE_FOUND".

OCR Text:
${ocrText}

Book Title:`;

  const completion = await openai!.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: 'You are a book title extraction expert. Your task is to identify and extract only the book title from OCR text, ignoring all other text like author names, publishers, descriptions, or irrelevant content.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    max_tokens: 100,
    temperature: 0.1, // Low temperature for consistent results
  });

  const extractedTitle = completion.choices[0]?.message?.content?.trim() || '';

  console.log('🤖 OpenAI raw response:', extractedTitle);

  if (!extractedTitle || extractedTitle === 'NO_TITLE_FOUND') {
    throw new Error('No book title found in the text');
  }

  // Calculate confidence based on response characteristics
  let confidence = 0.8; // Base confidence for successful extraction with OpenAI

  // Reduce confidence if title is very short (might be a fragment)
  if (extractedTitle.length < 3) {
    confidence = 0.4;
  }
  // Reduce confidence if title is very long (might include extra text)
  else if (extractedTitle.length > 100) {
    confidence = 0.6;
  }
  // Increase confidence if title looks like a proper book title (has some structure)
  else if (extractedTitle.includes(' ') && extractedTitle.length > 5) {
    confidence = 0.9;
  }

  return {
    title: extractedTitle,
    confidence
  };
};
/**
 * Validates if the extracted title looks like a real book title
 * @param title The extracted title
 * @returns boolean indicating if the title is valid
 */
export const validateBookTitle = (title: string): boolean => {
  if (!title || title.length < 2) return false;

  // Check for common OCR artifacts that aren't book titles
  const invalidPatterns = [
    /^https?:\/\//i,  // URLs
    /^\d{10,13}$/,    // ISBN-like numbers
    /^[A-Z]{2,}$/,    // All caps short words
    /^[^\w\s]+$/,     // Only symbols
    /price|buy|sale|discount/i,  // Commercial text
    /copyright|isbn|edition/i,    // Publishing metadata
  ];

  return !invalidPatterns.some(pattern => pattern.test(title));
};
