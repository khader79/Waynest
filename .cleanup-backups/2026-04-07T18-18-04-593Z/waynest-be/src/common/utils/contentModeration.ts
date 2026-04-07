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

const normalizeText = (raw: string) =>
  raw
    .toLowerCase()
    .replace(/[0]/g, 'o')
    .replace(/[1]/g, 'i')
    .replace(/[3]/g, 'e')
    .replace(/[4]/g, 'a')
    .replace(/[5]/g, 's')
    .replace(/[7]/g, 't')
    .replace(/[_\-./\\|*+~`^]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const includesBlockedWord = (text: string) => {
  const normalized = normalizeText(text);
  const englishHit = ENGLISH_BLOCKLIST.some((word) =>
    new RegExp(`\\b${word}\\b`, 'i').test(normalized),
  );
  if (englishHit) {
    return true;
  }
  return ARABIC_BLOCKLIST.some((word) => normalized.includes(word));
};

export const assertNoAbusiveContent = (text: string, fieldName = 'content') => {
  if (!text || !text.trim()) {
    return;
  }
  if (includesBlockedWord(text)) {
    throw new BadRequestException(
      `${fieldName} contains abusive language and cannot be submitted.`,
    );
  }
};
