const rwandaNationalIdRegex = /(?<!\d)(?:[12]\s?\d{4}\s?[78]\s?\d{7}\s?\d\s?\d{2})(?!\d)/g;
const genericNationalIdRegex = /(?<!\d)\d{16}(?!\d)/g;
const rwandaPhoneRegex = /(?<!\d)(?:\+250[\s-]*|0)?7[2389](?:[\s-]?\d){7}(?!\d)/g;
const emailRegex = /\b[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+\b/g;
const creditCardRegex = /(?<!\d)(?:\d[ -]?){13,19}(?!\d)/g;

export const anonymizeText = (rawText) => {
    if (rawText === null || rawText === undefined) return "";

    let cleanedText = String(rawText);
    cleanedText = cleanedText.replace(rwandaNationalIdRegex, "[REDACTED_NATIONAL_ID]");
    cleanedText = cleanedText.replace(rwandaPhoneRegex, "[REDACTED_PHONE_NUMBER]");
    cleanedText = cleanedText.replace(emailRegex, "[REDACTED_EMAIL]");
    cleanedText = cleanedText.replace(creditCardRegex, "[REDACTED_CARD_NUMBER]");
    cleanedText = cleanedText.replace(genericNationalIdRegex, "[REDACTED_NATIONAL_ID]");

    return cleanedText;
};
