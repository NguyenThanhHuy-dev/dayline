import { TYPES } from './parser.js';
import { getLang, translator } from './i18n.js';

export const buildPrompt = (lang = getLang()) => translator(lang)('prompt', { types: TYPES.join(', ') });
