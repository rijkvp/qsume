import { ZipReader, BlobReader, TextWriter } from "@zip.js/zip.js";
import { FileSection, ReadableFile } from "./readable";
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
                    const selectedFile = e.target!;
                    const buff: ArrayBuffer = selectedFile.result;
                    const blob = new Blob([buff]);
                    const zipReader = new ZipReader(new BlobReader(blob));
                    const entries = await zipReader.getEntries();
                    await zipReader.close();

                    const parser = new DOMParser();

                    // 1. Read container.xml meta
                    const containerEntry = entries.find(e => e.filename == "META-INF/container.xml");
                    if (!containerEntry) {
                        throw new Error("no container.xml file found");
                    }
                    const conainerText = await containerEntry.getData!(new TextWriter());
                    const containerDoc = parser.parseFromString(conainerText, "application/xml");
                    // NOTE: Only one rootfile is supported for now
                    const rootFile = containerDoc.getElementsByTagName("rootfile")[0];
                    const rootFilePath = rootFile.getAttribute("full-path")!;
                    let rootDir = rootFilePath.split("/").slice(0,-1).join("/") + "/";
                    if (rootDir == "/") {
                        rootDir = "";
                    }

                    // 2. Read opf file
                    const opfEntry = entries.find(e => e.filename == rootFilePath);
                    if (!opfEntry) {
                        throw new Error("no OPF file found");
                    }
                    const opfText = await opfEntry.getData!(new TextWriter());
                    const opfDoc = parser.parseFromString(opfText, "application/xml");

                    // 3. Parse the metadata
                    const metadataElement = opfDoc.getElementsByTagName("metadata")[0];
                    const titleMeta = metadataElement.getElementsByTagName("dc:title")[0].innerHTML;
                    const creatorMeta = metadataElement.getElementsByTagName("dc:creator")[0].innerHTML;

                    // 4. Create a map of files from the manifest
                    const manifestElement = opfDoc.getElementsByTagName("manifest")[0];
                    const manifest = new Map<string, Array<string>>();
                    for (let child of manifestElement.children) {
                        if (child.nodeName == "item") {
                            const id = child.getAttribute("id");
                            const href = child.getAttribute("href");
                            const mediaType = child.getAttribute("media-type");
                            if (!id || !href || !mediaType) {
                                throw new Error(`missing required attrbute id, href or mediatype on manifest item: ${child.outerHTML}`);
                            }
                            manifest.set(id, [href, mediaType]);
                        }
                    }

                    // 5. Parse the spine
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

                    // 6. Parse the table of contents (NCX file)
                    const tocId = spine.getAttribute("toc")!;
                    const [tocFileName, tocMediaType] = manifest.get(tocId)!;
                    const toc = new Map<string, string>();
                    // Only read TOC files NCX media type
                    if (tocMediaType == "application/x-dtbncx+xml") {
                        const tocPath = rootDir + tocFileName;
                        const tocEntry = entries.find(e => e.filename == tocPath);
                        if (!tocEntry) {
                            throw new Error(`missing TOC file '${tocEntry}' specified in manifest & spine`);
                        }
                        const tocText = await tocEntry.getData!(new TextWriter());
                        const tocDoc = parser.parseFromString(tocText, "application/xhtml+xml");
                        const navMap = tocDoc.getElementsByTagName("navMap")[0];
                        for (let child of navMap.children) {
                            if (child.nodeName == "navPoint") {
                                const navLabel = child.getElementsByTagName("navLabel")[0];
                                const content = child.getElementsByTagName("content")[0];
                                // TODO: Add support for nested navPoints. A navPoint optionally has navPoint children.
                                if (!navLabel || !content) {
                                    throw new Error(`missing required attrbute navLabel or conent on navPoint: ${child.outerHTML}`);
                                }
                                const labelText = navLabel.getElementsByTagName("text")[0];
                                if (!labelText) {
                                    throw new Error(`missing required text child on navLabel: ${navLabel.outerHTML}`);
                                }
                                let contentSource = content.getAttribute("src")!;
                                // Remove the id part after #
                                contentSource = contentSource.split("#", 2)[0];
                                toc.set(contentSource, labelText.innerHTML);
                            }
                        }
                    }

                    // 7. Load the sections
                    const sections = new Array<FileSection>();
                    for (let id of spineIds) {
                        const [fileName, mediaType] = manifest.get(id)!;
                        if (!fileName) {
                            throw new Error(`no item in manifest for spine id ${id}`);
                        }
                        const filePath = rootDir + fileName;
                        const fileEntry = entries.find(e => e.filename == filePath);
                        if (!fileEntry) {
                            throw new Error(`missing file ${filePath} specified in spine`);
                        }
                        const fileText = await fileEntry.getData!(new TextWriter());
                        const fileContent = htmlToText(fileText, mediaType as DOMParserSupportedType);
                        const words = textToWords(fileContent);
                        const title = toc.get(fileName) ?? null;
                        const section = new FileSection(fileName, title, words);
                        sections.push(section);
                    }
                    const result = new ReadableFile(inputFile.name, titleMeta, creatorMeta, sections);
                    this.onFileLoaded(result);
                });
                break;
            case "text/plain":
                fileReader.readAsText(inputFile);
                fileReader.addEventListener('load', async (e: any) => {
                    const text = e.target!.result;
                    const sections = [new FileSection(null, null, textToWords(text))];
                    const result = new ReadableFile(inputFile.name, null, null, sections);
                    this.onFileLoaded(result);
                });
                break;
            default:
                throw new Error(`Unkown file type ${inputFile.type}`);
        }
    }
}
