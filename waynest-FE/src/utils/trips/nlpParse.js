const CURRENCY_SYMBOL_MAP = {
  "\u20AC": "EUR", "$": "USD", "\u00A3": "GBP", "\u00A5": "JPY",
  "\u20AA": "ILS", "\u20A9": "KRW", "\u20BD": "RUB", "\u20B9": "INR",
  "\u20AB": "VND", "\u20B1": "PHP", "\u0E3F": "THB", "\u20B4": "UAH",
};

const CURRENCY_WORD_MAP = {
  euro: "EUR", euros: "EUR", eur: "EUR",
  dollar: "USD", dollars: "USD", usd: "USD",
  pound: "GBP", pounds: "GBP", gbp: "GBP",
  yen: "JPY", jpy: "JPY",
  shekel: "ILS", shekels: "ILS", nis: "ILS", ils: "ILS", shek: "ILS",
};

/* ── Person-hint phrases ── */
const PERSON_PATTERNS = [
  { re: /(\d+)\s*(?:people|travelers?|persons?|pax|friends|adults?|guests?)\b/i, fn: (m) => parseInt(m[1]) },
  { re: /\b(?:just\s+)?(me|myself|solo|alone)\b/i,                                fn: () => 1 },
  { re: /\b(?:me\s+and\s+my\s+)(girlfriend|wife|partner|husband|boyfriend)\b/i,   fn: () => 2 },
  { re: /\b(?:me\s+and\s+my\s+)(family|friend|buddy|mate)\b/i,                     fn: () => 2 },
  { re: /\b(my\s+)?(girlfriend|wife|partner|husband|boyfriend)\s+and\s+i\b/i,      fn: () => 2 },
  { re: /\b(?:two\s+of\s+us|couple|both\s+of\s+us)\b/i,                            fn: () => 2 },
  { re: /\b(?:group\s+of|family\s+of)\s+(\d+)\b/i,                                 fn: (m) => parseInt(m[1]) },
  { re: /\b(with\s+)?friends\b/i,                                                   fn: () => 4 },
  { re: /\b(?:with\s+my\s+)?kids?\b/i,                                              fn: () => 4 },
  { re: /\bfamily\b/i,                                                              fn: () => 4 },
];

/* ── Duration hints ── */
const DURATION_MAP = {
  "a week": 7, "one week": 7, "for a week": 7,
  "a weekend": 2, "one weekend": 2,
  "a few days": 3, "couple of days": 2, "a couple days": 2, "a couple of days": 2,
  "a day": 1, "one day": 1,
  "two weeks": 14, "a fortnight": 14,
  "half week": 3, "half a week": 3,
  "a month": 14, "one month": 14,
};

/* ── Common stop-words (removed from interest candidates) ── */
const STOP_WORDS = new Set([
  "a","an","the","is","are","was","were","be","been","being","have","has","had",
  "do","does","did","will","would","could","should","may","might","shall","can",
  "to","for","of","in","on","at","by","with","from","as","into","through","during",
  "before","after","above","below","between","out","off","over","under","again",
  "further","then","once","here","there","when","where","why","how","all","each",
  "every","both","few","more","most","other","some","such","no","nor","not","only",
  "own","same","so","than","too","very","just","about","up","and","or","but","if",
  "because","until","while","that","this","these","those","it","its","i","me","my",
  "we","our","you","your","he","him","his","she","her","they","them","their","what",
  "which","who","whom","wants","want","need","needs","going","go","going to",
  "travel","trip","visit","travelling","traveling","plan","planning","looking",
  "like","love","enjoy","please","help","make","get","take","think","know","let",
  "also","really","quite","very","much","well","back","still","around","always",
  "never","ever","now","even","sure","new","next","first","last","long","day",
  "days","night","time","place","way","something","anything","everything","nothing",
  "said","say","says","tell","told","give","find","feeling","feel","felt",
  "maybe","perhaps","probably","basically","actually","definitely","absolutely",
  "thanks","thank","please","sorry","hello","hi","hey","dear","hey there",
]);

/* ── Phrases that introduce interests ── */
const INTEREST_TRIGGERS = [
  /\b(?:i\s+)?(?:love|enjoy|like|into|interested\s+in|care\s+about|want\s+to\s+try|looking\s+for|prefer|fancy)\b/i,
  /\b(?:we\s+)?(?:love|enjoy|like|into|interested\s+in|care\s+about|want\s+to\s+try|looking\s+for|prefer|fancy)\b/i,
  /\b(?:i\s+)?(?:hate|don't\s+like|dislike|avoid)\b/i,
  /\b(?:focus\s+on|prioritize|mainly|mostly|especially|particularly)\b/i,
];

export function parseTripQuery(input) {
  const text = input.trim();
  if (!text) return null;

  const result = {};
  let remaining = text;

  /* ── Helpers ── */
  const eat = (pattern, replacement = " ") => {
    const m = remaining.match(pattern);
    if (m) remaining = remaining.replace(m[0], replacement);
    return m;
  };

  const clearFiller = () => {
    remaining = remaining
      .replace(/\b(i\s+wanna|i\s+want\s+to|i\s+need\s+to|i\s+would\s+like\s+to|i'd\s+like\s+to|i'm\s+planning\s+to|i'm\s+looking\s+to|i'm\s+going\s+to|we\s+want\s+to|we're\s+planning\s+to|we're\s+going\s+to|we'd\s+like\s+to)\b/gi, "")
      .replace(/\b(can\s+you|please|help\s+me|make\s+me|give\s+me|create\s+a|generate\s+a|build\s+me|plan\s+a|plan\s+an)\b/gi, "")
      .replace(/\b(hello|hi\s+there|hey|dear|thanks|thank\s+you)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  /* ── 1. Extract days (explicit) ── */
  let m = eat(/(\d+)\s*d(?:ays?)?\b/i);
  if (m) result.days = Math.min(14, Math.max(1, parseInt(m[1], 10)));

  /* ── 2. Extract days (vague) ── */
  if (!result.days) {
    for (const [phrase, val] of Object.entries(DURATION_MAP)) {
      const idx = remaining.toLowerCase().indexOf(phrase);
      if (idx !== -1) {
        result.days = val;
        remaining = remaining.slice(0, idx) + remaining.slice(idx + phrase.length);
        break;
      }
    }
  }

  /* ── 3. Extract persons ── */
  for (const { re, fn } of PERSON_PATTERNS) {
    const match = remaining.match(re);
    if (match) {
      const val = fn(match);
      if (!result.persons || val > result.persons) result.persons = Math.min(20, Math.max(1, val));
    }
  }

  /* ── 4. Extract budget with currency ── */
  m = eat(/([$\u20AC\u00A3\u00A5\u20AA\u20A9\u20BD\u20B9\u20AB\u20B1\u0E3F\u20B4])\s*(\d[\d,.]*)/);
  if (m) {
    result.currencyCode = CURRENCY_SYMBOL_MAP[m[1]] || "USD";
    result.budget = parseFloat(m[2].replace(/,/g, ""));
  }

  if (!result.budget) {
    m = eat(/(\d[\d,.]*)\s*(euros?|dollars?|pounds?|yen|shekels?|nis|eur|usd|gbp|jpy|ils)\b/i);
    if (m) {
      result.budget = parseFloat(m[1].replace(/,/g, ""));
      result.currencyCode = CURRENCY_WORD_MAP[m[2].toLowerCase()];
    }
  }

  if (!result.budget) {
    m = eat(/\b(euros?|dollars?|usd|eur|gbp|ils)\s+(\d[\d,.]*)/i);
    if (m) {
      result.budget = parseFloat(m[2].replace(/,/g, ""));
      result.currencyCode = CURRENCY_WORD_MAP[m[1].toLowerCase()];
    }
  }

  if (!result.budget) {
    m = eat(/(\d[\d,.]*)\s*([$\u20AC\u00A3\u00A5\u20AA])/);
    if (m) {
      result.budget = parseFloat(m[1].replace(/,/g, ""));
      result.currencyCode = CURRENCY_SYMBOL_MAP[m[2]];
    }
  }

  /* ── 5. Extract budget with vague words: "budget", "around", "about" ── */
  if (!result.budget) {
    m = eat(/\b(?:budget|spend|spending|around|about|roughly|approx(?:imately)?)\s+(\d[\d,.]*)\b/i);
    if (m) result.budget = parseFloat(m[1].replace(/,/g, ""));
  }

  if (!result.budget) {
    m = eat(/(\d[\d,.]*)\s*(?:budget|bucks)\b/i);
    if (m) result.budget = parseFloat(m[1].replace(/,/g, ""));
  }

  /* ── 6. Extract budget tiers (no number -> map to median anchor) ── */
  if (!result.budget) {
    if (/\b(budget|cheap|cheapest|low\s*cost|backpacker|frugal)\b/i.test(remaining)) result.budgetTier = "budget";
    else if (/\b(luxury|luxurious|premium|high.?end|5\s*star|five\s*star|fancy|deluxe|posh|exclusive)\b/i.test(remaining)) result.budgetTier = "comfort";
    else if (/\b(moderate|mid.?range|comfortable|average|standard|normal|decent|reasonable|medium)\b/i.test(remaining)) result.budgetTier = "moderate";
  }

  /* ── 7. Clean filler words ── */
  clearFiller();

  /* ── 8. Extract interest candidates ── */
  const interestCandidates = [];
  const sentences = remaining.split(/[,.;!?]+/);

  for (const sentence of sentences) {
    for (const trigger of INTEREST_TRIGGERS) {
      const tMatch = sentence.match(trigger);
      if (tMatch) {
        let after = sentence.slice(tMatch.index + tMatch[0].length).trim();
        after = after.replace(/\b(and|or|but|also|as\s+well|too|especially|particularly|mostly|mainly)\b/gi, " ").trim();
        const words = after.split(/\s+/).filter((w) => w.length > 2 && !STOP_WORDS.has(w.toLowerCase()));
        interestCandidates.push(...words);
      }
    }
  }

  /* ── 9. Extract remaining as place query ── */
  remaining = remaining
    .replace(/\b(budget|cheap|cheapest|low\s*cost|backpacker|frugal|moderate|mid.?range|comfortable|average|standard|normal|decent|reasonable|medium|luxury|luxurious|premium|high.?end|5\s*star|five\s*star|fancy|deluxe|posh|exclusive)\b/gi, "")
    .replace(/\b(in|at|for|to|a|the|of|near|around|about|with|and|or|trip|going|visit|travell?ing|travell?er|want|need|please|help|make|get|take|like|love|enjoy|plan|planner|generate|create|build)\b/gi, " ")
    .replace(/\b(i|me|my|we|our|us|you|your|he|she|it|they|them)\b/gi, " ")
    .replace(/[,.;:!?()]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const placeQuery = remaining;

  /* ── Build result ── */
  if (result.days) result.days = Math.min(14, Math.max(1, result.days));
  if (result.persons) result.persons = Math.min(20, Math.max(1, result.persons));
  if (result.budget) result.budget = Math.max(0, result.budget);
  if (interestCandidates.length > 0) result.interestWords = [...new Set(interestCandidates.map((w) => w.toLowerCase()))];
  if (placeQuery) result.placeQuery = placeQuery;

  return Object.keys(result).length > 0 ? result : null;
}
