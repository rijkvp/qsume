// Converts HTML to a plain text string
export function htmlToText(text: string, contentType: DOMParserSupportedType) {
    const parser = new DOMParser();
    const document = parser.parseFromString(text, contentType);
    return document.body.textContent || "";
}

// Converts plain text to an array of words
export function textToWords(text: string) {
    return text.split(/([\n\r\s]+)/g).map(item => item.trim()).filter(word => word != "");
}
