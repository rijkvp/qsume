export class FileSection {
    filename: string | null;
    title: string | null;
    words: string[];

    constructor(filename: string | null, title: string | null, words: string[]) {
        this.filename = filename;
        this.title = title;
        this.words = words;
    }
}

export class ReadableFile {
    filename: string;
    title: string | null;
    author: string | null;
    sections: Array<FileSection>;

    constructor(filename: string, title: string | null, author: string | null, sections: FileSection[]) {
        this.filename = filename;
        this.title = title;
        this.author = author;
        this.sections = sections;
    }

    wordCount(until: number = -1): number {
        let count = 0;
        for (let i = 0; i < this.sections.length; i++) {
            if (until >= 0 && i >= until) {
                break;
            }
            count += this.sections[i].words.length;
        }
        return count;
    }
}