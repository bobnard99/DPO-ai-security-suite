const rwandaNationalIdRegex = /(?<!\d)(?:[12]\s?\d{4}\s?[78]\s?\d{7}\s?\d\s?\d{2})(?!\d)/g;
const genericNationalIdRegex = /(?<!\d)\d{16}(?!\d)/g;
const rwandaPhoneRegex = /(?<!\d)(?:\+250[\s-]*|0)?7[2389](?:[\s-]?\d){7}(?!\d)/g;
const emailRegex = /\b[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+\b/g;
const creditCardRegex = /(?<!\d)(?:\d[ -]?){13,19}(?!\d)/g;

const createTokenReplacer = (prefix, tokenMap, counters) => (value) => {
    if (!tokenMap.has(value)) {
        counters[prefix] += 1;
        tokenMap.set(value, `[${prefix}_${counters[prefix]}]`);
    }
    return tokenMap.get(value);
};

export const anonymizeTextWithMap = (rawText) => {
    if (rawText === null || rawText === undefined) return { text: '', piMap: new Map() };

    let cleanedText = String(rawText);
    const tokenMap = new Map();
    const counters = { NATIONAL_ID: 0, PHONE: 0, EMAIL: 0, CARD: 0 };
    const replaceNationalId = createTokenReplacer('NATIONAL_ID', tokenMap, counters);
    const replacePhone = createTokenReplacer('PHONE', tokenMap, counters);
    const replaceEmail = createTokenReplacer('EMAIL', tokenMap, counters);
    const replaceCard = createTokenReplacer('CARD', tokenMap, counters);

    // National IDs must be replaced before the broad card-number pattern.
    cleanedText = cleanedText.replace(rwandaNationalIdRegex, replaceNationalId);
    cleanedText = cleanedText.replace(genericNationalIdRegex, replaceNationalId);
    cleanedText = cleanedText.replace(rwandaPhoneRegex, replacePhone);
    cleanedText = cleanedText.replace(emailRegex, replaceEmail);
    cleanedText = cleanedText.replace(creditCardRegex, replaceCard);

    return { text: cleanedText, piMap: new Map([...tokenMap].map(([value, token]) => [token, value])) };
};

export const anonymizeText = (rawText) => anonymizeTextWithMap(rawText).text;

export const deanonymizeText = (text, piMap) => {
    if (typeof text !== 'string' || !(piMap instanceof Map)) return text || '';

    return text.replace(/\[(?:NATIONAL_ID|PHONE|EMAIL|CARD)_\d+\]/g, (token) => piMap.get(token) || token);
};
