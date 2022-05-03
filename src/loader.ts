import { ZipReader, BlobReader, TextWriter } from "@zip.js/zip.js";
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
        reader.readAsBinaryString(inputFile);
        reader.addEventListener('load', async (e: any) => {
            var contents = e.target?.result;
            const reader = new ZipReader(new BlobReader(contents));
            var entries = [];
            entries = await reader.getEntries();
            if (entries.length) {
                // get first entry content as text by using a TextWriter
                const text = await entries[0].getData(
                    // writer
                    new TextWriter(),
                    // options
                    {
                        onprogress: (index, max) => {
                            // onprogress callback
                        }
                    }
                );
                // text contains the entry data as a String
                console.log(text);
            }
            await reader.close();

            var book = new Book(inputFile.name, wordsFromText(contents));
            this.onFileLoaded(book);
        });
    }
}

function wordsFromText(text: string) {
    return text.split(/([\n\r\s]+)/g).map(item => item.trim()).filter(word => word != "");
}
