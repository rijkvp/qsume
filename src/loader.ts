const reader = new FileReader();

export class Book {
    fileName: string;
    words: string[];

    constructor(fileName: string, words: string[]) {
        this.fileName = fileName;
        this.words = words;
    }
}

export class FileLoader {
    onFileLoaded: (file: Book) => void;

    constructor(onFileLoaded: (file: Book) => void) {
        this.onFileLoaded = onFileLoaded;
    }

    loadFile(inputFile: File) {
        reader.readAsText(inputFile);
        reader.addEventListener('load', (e: any) => {
            var contents = e.target?.result;
            var book = new Book(inputFile.name, wordsFromText(contents));
            this.onFileLoaded(book);
        });
    }
}

function wordsFromText(text: string) {
    return text.split(/([\n\r\s]+)/g).map(item => item.trim()).filter(word => word != "");
}
