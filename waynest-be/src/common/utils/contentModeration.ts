import { BadRequestException } from '@nestjs/common';

const ENGLISH_BLOCKLIST = [
  'fuck',
  'fucking',
  'shit',
  'bitch',
  'asshole',
  'bastard',
  'motherfucker',
  'dick',
  'slut',
  'whore',
];

const ARABIC_BLOCKLIST = [
  'خرا',
  'حمار',
  'كلب',
  'قذر',
  'زبالة',
  'يلعن',
  'لعنة',
  'متخلف',
];

const HOMOGLYPH_MAP: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '8': 'b',
  '9': 'g',
  '@': 'a',
  '!': 'i',
  '$': 's',
  '+': 't',
  '(': 'c',
  '<': 'c',
  '>': 'c',
  '|': 'l',
  '/': 'l',
  '\\': 'l',
  '*': 'o',
  '~': 'o',
  '^': 'a',
  '&': 'g',
  '%': 'x',
  '#': 'h',
  'а': 'a',
  'е': 'e',
  'о': 'o',
  'р': 'p',
  'с': 'c',
  'х': 'x',
};

const normalizeText = (raw: string): string => {
  let text = raw.toLowerCase();

  text = text
    .split('')
    .map((char) => HOMOGLYPH_MAP[char] ?? char)
    .join('');

  text = text.replace(/[\s_\-./\\|*+~`^,;:!?]+/g, ' ');

  text = text.replace(/([a-z])\1{2,}/g, '$1$1');

  return text.trim();
};

const includesBlockedWord = (text: string): boolean => {
  const normalized = normalizeText(text);

  const englishHit = ENGLISH_BLOCKLIST.some((word) => {
    const pattern = new RegExp(`\\b${word}\\b`, 'i');
    if (pattern.test(normalized)) return true;

    const spacedPattern = new RegExp(word.split('').join('\\s*'), 'i');
    return spacedPattern.test(normalized);
  });

  if (englishHit) return true;

  return ARABIC_BLOCKLIST.some((word) => normalized.includes(word));
};

export const assertNoAbusiveContent = (
  text: string,
  fieldName = 'content',
) => {
  if (!text || !text.trim()) {
    return;
  }
  if (includesBlockedWord(text)) {
    throw new BadRequestException(
      `${fieldName} contains abusive language and cannot be submitted.`,
    );
  }
};
