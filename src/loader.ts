import { ZipReader, BlobReader, TextWriter, TextReader, Writer } from "@zip.js/zip.js";
import { DocumentSection, ReadableFile } from "./readable";
import { htmlToText, textToWords } from "./util";

const fileReader = new FileReader();

export class FileLoader {
    onFileLoaded: (file: ReadableFile) => void;

    constructor(onFileLoaded: (file: ReadableFile) => void) {
        this.onFileLoaded = onFileLoaded;
    }

    loadFile(inputFile: File) {
        switch (inputFile.type) {
            // TODO: Support more file types
            case "application/epub+zip":
                fileReader.readAsArrayBuffer(inputFile);
                fileReader.addEventListener('load', async (e: any) => {
                    console.log(inputFile);
                    const selectedFile = e.target!;
                    const buff: ArrayBuffer = selectedFile.result;
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
                    // 4. Load the sections
                    const sections = new Array<DocumentSection>();
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
                        // TODO: parse content type of file
                        const fileContent = htmlToText(fileText, "application/xhtml+xml");
                        const words = textToWords(fileContent);
                        const section = new DocumentSection(fileName, "Unkown Chapter", words);
                        sections.push(section);
                    }
                    console.log(sections);
                    const result = new ReadableFile(inputFile.name, "Unkown Book", "Unkown Author", sections);
                    this.onFileLoaded(result);
                });
                break;
            case "text/plain":
                // TODO: Load plain text files
                break;
            default:
                throw new Error(`Unkown file type ${inputFile.type}`);
        }
    }
}
