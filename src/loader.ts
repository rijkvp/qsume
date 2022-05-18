import { ZipReader, BlobReader, TextWriter, TextReader, Writer } from "@zip.js/zip.js";
const fileReader = new FileReader();

export class Chapter {
    filename: string;
    name: string;
    words: string[];

    constructor(filename: string, title: string, words: string[]) {
        this.filename = filename;
        this.name = title;
        this.words = words;
    }
}

export class Book {
    filename: string;
    title: string;
    author: string;
    chapters: Array<Chapter>;

    constructor(filename: string, title: string, author: string, chapters: Chapter[]) {
        this.filename = filename;
        this.title = title;
        this.author = author;
        this.chapters = chapters;
    }
}

export class FileLoader {
    onFileLoaded: (file: Book) => void;

    constructor(onFileLoaded: (file: Book) => void) {
        this.onFileLoaded = onFileLoaded;
    }

    loadFile(inputFile: File) {
        fileReader.readAsArrayBuffer(inputFile);
        fileReader.addEventListener('load', async (e: any) => {
            const buff: ArrayBuffer = e.target!.result;
            const blob = new Blob([buff]);
            const zipReader = new ZipReader(new BlobReader(blob));
            const entries = await zipReader.getEntries();
            await zipReader.close();

            const opfEntry = entries.find(e => e.filename == "OEBPS/content.opf");
            if (!opfEntry) {
                throw new Error("no OPF file found");
            }
            const opfText = await opfEntry.getData!(new TextWriter());
            console.log(opfText)
            const parser = new DOMParser();
            const opfDoc = parser.parseFromString(opfText, "application/xml");
            // 1. Parse the metadata
            // TODO: Parse metadata
            // 2. Create a map of files from the manifest
            const files = new Map<string, string>();
            const manifest = opfDoc.getElementsByTagName("manifest")[0];
            for (let child of manifest.children) {
                if (child.nodeName == "item") {
                    const id = child.getAttribute("id");
                    const href = child.getAttribute("href");
                    if (!id || !href) {
                        throw new Error("item missing id or href");
                    }
                    files.set(id, href);
                }
            }
            // 3. Parse the spine
            const spineIds = new Array<string>();
            const spine = opfDoc.getElementsByTagName("spine")[0];
            for (let child of spine.children) {
                if (child.nodeName == "itemref") {
                    const idref = child.getAttribute("idref");
                    if (!idref) {
                        throw new Error("itemref missing idref");
                    }
                    spineIds.push(idref);
                }
            }
            // 4. Load the document files and put them together
            const chapters = new Array<Chapter>();
            for (let id of spineIds) {
                const fileName = files.get(id);
                if (!fileName) {
                    throw new Error(`no file in manifest for spine id ${id}`);
                }
                const filePath = "OEBPS/" + fileName;
                const fileEntry = entries.find(e => e.filename == filePath);
                if (!fileEntry) {
                    throw new Error(`missing file ${filePath} specified in spine`);
                }
                const fileText = await fileEntry.getData!(new TextWriter());
                const fileContent = htmlToText(fileText);
                const words = textToWords(fileContent);
                const chapter = new Chapter(fileName, "Unkown Chapter", words);
                chapters.push(chapter);
            }
            console.log(chapters);

            const book = new Book(inputFile.name, "Unkown Book", "Unkown Author", chapters);
            this.onFileLoaded(book);
        });
    }
}

// Converts HTML to a plain text string
function htmlToText(text: string) {
    return text;
}

// Converts plain text to an array of words
function textToWords(text: string) {
    return text.split(/([\n\r\s]+)/g).map(item => item.trim()).filter(word => word != "");
}
