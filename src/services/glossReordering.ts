import { TranslationResult } from '../types';

export class GlossReorderingService {
  /**
   * Reorders an array of recognized ISL glosses into grammatical English and Hindi sentences.
   * Can call backend API (with Gemini LLM assistance) or execute pure client-side rules.
   */
  async translateGlosses(
    glosses: string[],
    preferAI: boolean = false
  ): Promise<TranslationResult> {
    if (!glosses || glosses.length === 0) {
      return {
        glosses: [],
        english: '',
        hindi: '',
        grammarNote: 'No signs detected yet',
        engine: 'idle',
        timestamp: Date.now(),
      };
    }

    // If preferAI is requested, attempt backend AI endpoint
    if (preferAI) {
      try {
        const response = await fetch('/api/translate-gloss', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ glosses, preferAI: true }),
        });

        if (response.ok) {
          const data = await response.json();
          return {
            glosses,
            english: data.english,
            hindi: data.hindi,
            grammarNote: data.grammarNote,
            engine: data.engine || 'server-gemini',
            timestamp: Date.now(),
          };
        }
      } catch (err) {
        // Silent fallback to client-side rule engine
      }
    }

    // Client-side rule engine fallback
    const { english, hindi, grammarNote } = this.applyClientISLRules(glosses);
    return {
      glosses,
      english,
      hindi,
      grammarNote,
      engine: 'isl-rule-engine-client',
      timestamp: Date.now(),
    };
  }

  /**
   * Comprehensive rule-based translation transforming ISL Topic-Comment into English SVO and Hindi SOV.
   */
  public applyClientISLRules(glosses: string[]): {
    english: string;
    hindi: string;
    grammarNote: string;
  } {
    const rawTokens = glosses.map((g) => g.toUpperCase().trim()).filter(Boolean);
    if (rawTokens.length === 0) {
      return { english: '', hindi: '', grammarNote: 'Empty sequence' };
    }

    // Deduplicate consecutive identical tokens
    const tokens: string[] = [];
    for (let i = 0; i < rawTokens.length; i++) {
      if (i === 0 || rawTokens[i] !== rawTokens[i - 1]) {
        tokens.push(rawTokens[i]);
      }
    }

    const set = new Set(tokens);

    // Rule 1: Fingerspelled word (single letters)
    const isAllSingleChars = tokens.every((t) => t.length === 1 && /^[A-Z0-9]$/.test(t));
    if (isAllSingleChars) {
      const word = tokens.join('');
      return {
        english: word,
        hindi: word,
        grammarNote: `ISL Fingerspelling concatenation (${tokens.length} manual alphabet signs)`,
      };
    }

    // Rule 2: Interrogatives & WH-Questions (ISL places WH words at sentence-end: [TOPIC] [WH-WORD])
    if (set.has('WHAT') || set.has('WHERE') || set.has('HOW') || set.has('TIME')) {
      if (tokens.includes('YOU') && tokens.includes('NAME') && tokens.includes('WHAT')) {
        return {
          english: 'What is your name?',
          hindi: 'आपका नाम क्या है?',
          grammarNote: 'ISL topic-comment [YOU NAME WHAT] inverted to standard WH-interrogative SVO',
        };
      }
      if (tokens.includes('NAME') && tokens.includes('WHAT')) {
        return {
          english: 'What is your name?',
          hindi: 'आपका नाम क्या है?',
          grammarNote: 'Omitted subject restored; interrogative moved sentence-initial',
        };
      }
      if (tokens.includes('WHERE')) {
        const topicWord = tokens.find((t) => t !== 'WHERE' && t !== 'YOU' && t !== 'ME') || 'place';
        const engTopic = topicWord.toLowerCase();
        const hinTopic = this.toHindiWord(topicWord);
        return {
          english: `Where is the ${engTopic}?`,
          hindi: `${hinTopic} कहाँ है?`,
          grammarNote: 'Sentence-final question particle [WHERE] fronted with copula verb insertion',
        };
      }
      if (tokens.includes('TIME') && tokens.includes('WHAT')) {
        return {
          english: 'What time is it now?',
          hindi: 'अभी क्या समय हुआ है?',
          grammarNote: 'Interrogative time inquiry converted to polite spoken sentence',
        };
      }
    }

    // Rule 3: Greetings and Polite Formulations
    if (tokens.includes('NAMASTE') || tokens.includes('HELLO')) {
      if (tokens.includes('NICE') && tokens.includes('MEET')) {
        return {
          english: 'Hello, nice to meet you!',
          hindi: 'नमस्ते, आपसे मिलकर बहुत खुशी हुई!',
          grammarNote: 'Greeting combined with courteous introductory idiom',
        };
      }
      return {
        english: 'Namaste! Warm greetings.',
        hindi: 'नमस्ते! प्रणाम।',
        grammarNote: 'Traditional ISL two-handed prayer greeting translated with honorific tone',
      };
    }

    if (tokens.includes('HELP') && tokens.includes('PLEASE')) {
      return {
        english: 'Please help me.',
        hindi: 'कृपया मेरी मदद करें।',
        grammarNote: 'Imperative polite request with fronted honorific [PLEASE]',
      };
    }

    if (tokens.includes('THANK') || tokens.includes('THANK YOU')) {
      return {
        english: 'Thank you very much.',
        hindi: 'आपका बहुत-बहुत धन्यवाद।',
        grammarNote: 'Formal gratitude expression with respectful phrasing',
      };
    }

    // Rule 4: Needs, Essentials, and Emergencies
    if (tokens.includes('WATER') && (tokens.includes('ME') || tokens.includes('I') || tokens.includes('NEED') || tokens.includes('PLEASE'))) {
      return {
        english: 'I need drinking water, please.',
        hindi: 'मुझे पीने के लिए पानी चाहिए।',
        grammarNote: 'ISL topic [WATER] reordered into subject-first need expression',
      };
    }

    if (tokens.includes('FOOD') && (tokens.includes('ME') || tokens.includes('I') || tokens.includes('WANT'))) {
      return {
        english: 'I would like some food to eat.',
        hindi: 'मुझे खाना खाना है / मुझे भूख लगी है।',
        grammarNote: 'Topic-comment transformed into polite hunger declaration',
      };
    }

    if (tokens.includes('DOCTOR') || tokens.includes('HOSPITAL')) {
      return {
        english: 'I need to see a doctor immediately.',
        hindi: 'मुझे तत्काल डॉक्टर की आवश्यकता है।',
        grammarNote: 'Medical emergency sign converted to urgent spoken verb phrase',
      };
    }

    if (tokens.includes('NICE') && tokens.includes('MEET')) {
      return {
        english: 'It is a pleasure to meet you.',
        hindi: 'आपसे मिलकर बहुत प्रसन्नता हुई।',
        grammarNote: 'Reciprocal social encounter signs mapped to natural spoken phrasing',
      };
    }

    if (tokens.includes('HOUSE') || tokens.includes('HOME')) {
      if (tokens.includes('ME') || tokens.includes('I')) {
        return {
          english: 'I am going to my house.',
          hindi: 'मैं अपने घर जा रहा हूँ।',
          grammarNote: 'Locative sign combined with first-person directional verb',
        };
      }
    }

    // Rule 5: Generalized mapping
    const engWords = tokens.map((t) => this.toEnglishWord(t));
    const capitalized = engWords.join(' ').replace(/^\w/, (c) => c.toUpperCase()) + '.';

    const hinWords = tokens.map((t) => this.toHindiWord(t)).join(' ') + '।';

    return {
      english: capitalized,
      hindi: hinWords,
      grammarNote: 'Linear gloss mapping with contextual grammatical expansion',
    };
  }

  private toEnglishWord(token: string): string {
    const map: Record<string, string> = {
      ME: 'I',
      YOU: 'you',
      WATER: 'water',
      FOOD: 'food',
      HOUSE: 'home',
      SCHOOL: 'school',
      WORK: 'work',
      GOOD: 'good',
      BAD: 'bad',
      HELP: 'help',
      PLEASE: 'please',
      NAMASTE: 'namaste',
      HELLO: 'hello',
      THANK: 'thank you',
      WHERE: 'where',
      WHAT: 'what',
      NAME: 'name',
      YES: 'yes',
      NO: 'no',
      STOP: 'stop',
      TIME: 'time',
      FAMILY: 'family',
      DOCTOR: 'doctor',
    };
    return map[token] || token.toLowerCase();
  }

  private toHindiWord(token: string): string {
    const map: Record<string, string> = {
      WATER: 'पानी',
      FOOD: 'खाना',
      DOCTOR: 'डॉक्टर',
      SCHOOL: 'विद्यालय',
      WORK: 'काम',
      HOUSE: 'घर',
      HELP: 'मदद',
      PLEASE: 'कृपया',
      NAMASTE: 'नमस्ते',
      HELLO: 'नमस्ते',
      THANK: 'धन्यवाद',
      WHERE: 'कहाँ',
      WHAT: 'क्या',
      NAME: 'नाम',
      YOU: 'आप',
      ME: 'मैं',
      YES: 'हाँ',
      NO: 'नहीं',
      GOOD: 'अच्छा',
      BAD: 'खराब',
      TIME: 'समय',
      FAMILY: 'परिवार',
      STOP: 'रुकें',
    };
    return map[token] || token;
  }
}

export const glossReorderingService = new GlossReorderingService();
