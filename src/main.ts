import { Control, ControlType } from "./control";
import { FileLoader } from "./loader";
import { FileSection, ReadableFile } from "./readable";
import { textToWords } from "./util";

let r: Reader;

window.addEventListener('load', () => {
    r = new Reader();
    r.start();
});

class Reader {
    // Containers
    wordContainer: HTMLElement;
    statusContainer1: HTMLElement;
    statusContainer2: HTMLElement;
    sectionsContainer: HTMLElement;

    playButton: HTMLElement;
    // Controls
    wpmControl: Control;
    fontSizeControl: Control;
    lowerCaseControl: Control;
    charThickeningControl: Control;

    // Reading
    isRunning: boolean = false;
    file: ReadableFile | null = null;
    previoudsFrame: number = 0;
    timer: number = 0;
    currentSection: number = 0;
    word: number = 0;

    constructor() {
        this.wordContainer = document.getElementById("word")!;
        this.statusContainer1 = document.getElementById("status1")!;
        this.statusContainer2 = document.getElementById("status2")!;
        this.sectionsContainer = document.getElementById("sections")!;

        this.wpmControl = new Control("wpm", ControlType.Range, 300, "Speed ", " WPM");
        this.fontSizeControl = new Control("fontsize", ControlType.Range, 42, "Font size ", "px", (value: any) => {
            document.getElementById("word")!.style.fontSize = value.toString() + "px";
        });
        this.lowerCaseControl = new Control("lowercase", ControlType.Checkbox, false, "Lowercase");
        this.charThickeningControl = new Control("charthickening", ControlType.Checkbox, true, "Char thickening");

        const fileLoader = new FileLoader((file: ReadableFile) => {
            this.setFile(file);
        });
        document.getElementById('file-input')!.addEventListener('change', (e: any) => {
            const file = e.target!.files[0];
            fileLoader.loadFile(file);
        });
        document.getElementById('manual-input-submit')!.addEventListener('click', (e: any) => {
            const text = (<HTMLInputElement>document.getElementById('manual-input')!).value;
            const file = new ReadableFile("(manual input)", null, null, [new FileSection("-", "-", textToWords(text))]);
            this.setFile(file);
        });

        this.playButton = document.getElementById("play-btn")!;
        this.playButton.addEventListener('click', () => this.toggleRunning());
        let previousSectionButton = document.getElementById("previous-section-btn")!;
        let nextSectionButton = document.getElementById("next-section-btn")!;
        previousSectionButton.addEventListener('click', () => this.addSection(-1));
        nextSectionButton.addEventListener('click', () => this.addSection(1));
    }

    private setFile(file: ReadableFile) {
        this.file = file;
        this.isRunning = false;
        this.timer = 0;
        this.currentSection = 0;
        this.word = 0;
        this.wordContainer.innerHTML = this.file.title ?? this.file.filename;
        this.playButton.removeAttribute("disabled");
        this.playButton.innerHTML = "▶️";
        this.updateSections();
    }

    private updateSections() {
        let counter = 0;
        this.sectionsContainer.innerHTML = '';
        for (let section of this.file!.sections) {
            let label = section.title ?? `Section ${counter + 1} (${section.filename})` ?? `Section ${counter + 1}`;
            let element = document.createElement("li");
            const sectionNumber = counter;
            element.addEventListener('click', () => this.goToSection(sectionNumber));
            element.className = 'section-nav';
            element.innerText = label;
            this.sectionsContainer.appendChild(element);
            counter++;
        }
    }

    start() {
        window.requestAnimationFrame(Reader.loop);
    }

    toggleRunning() {
        this.timer = 0;
        this.isRunning = !this.isRunning;
        this.playButton.innerText = this.isRunning ? "⏸️" : "▶️";
    }

    goToSection(section: number) {
        this.currentSection = section;
        this.word = 0;
    }

    addSection(offset: number) {
        // TODO: Validate offset
        this.goToSection(this.currentSection + offset);
    }

    private static loop(time: DOMHighResTimeStamp) {
        if (!r.file) {
            r.wordContainer.innerHTML = "no file loaded";
        }
        else if (r.isRunning) {
            const dt = (time - r.previoudsFrame) / 1000;
            r.previoudsFrame = time;
            r.timer += dt;
            const delay = 60 / r.wpmControl.value;
            if (r.timer >= delay) {
                r.timer = 0;
                if (r.currentSection < r.file.sections.length) {
                    const section = r.file.sections[r.currentSection];
                    if (r.word < section.words.length) {
                        r.wordContainer.innerHTML = r.renderWord();
                        r.word++;
                        const totalWords = r.file.wordCount();
                        const wordNumber = r.file.wordCount(r.currentSection) + r.word;
                        const progress = (wordNumber / totalWords * 100).toFixed(2);
                        const wordsLeft = totalWords - wordNumber;
                        const timeLeft = new Date(wordsLeft * delay * 1000).toISOString().substring(11, 19)

                        // Update status
                        r.statusContainer1.innerHTML = `<td>${r.file.title ?? r.file.filename}</td><td>${wordNumber}/${totalWords}</td><td>${progress}%</td><td>${timeLeft}</td>`;
                        if (r.file.sections.length > 1) {
                            const sectionProgress = (r.word / section.words.length * 100).toFixed(2);
                            const sectionWordsLeft = section.words.length - r.word;
                            const sectionTimeLeft = new Date(sectionWordsLeft * delay * 1000).toISOString().substring(11, 19)
                            r.statusContainer2.innerHTML = `<td>${section.title ?? section.filename ?? "(section)"} (${r.currentSection + 1}/${r.file.sections.length})</td>
                            <td>${r.word}/${section.words.length}</td><td>${sectionProgress}%</td><td>${sectionTimeLeft}</td>`;
                        }
                    } else {
                        r.currentSection++;
                        r.word = 0;
                    }
                } else {
                    r.wordContainer.innerHTML = "Done";
                }
            }
        }
        window.requestAnimationFrame(Reader.loop);
    }

    renderWord() {
        if (this.file == null) {
            throw new Error("no file loaded");
        }
        let text = this.file.sections[this.currentSection].words[this.word];
        if (this.lowerCaseControl.value) {
            text = text.toLowerCase();
        }
        if (this.charThickeningControl.value) {
            let thickLetters;
            if (text.length <= 3) {
                thickLetters = 1;
            } else if (text.length == 4) {
                thickLetters = 2;
            } else {
                thickLetters = Math.round(text.length * 0.4);
            }
            const thickPart = text.substring(0, thickLetters);
            const normalPart = text.substring(thickLetters);
            text = `<strong>${thickPart}</strong>${normalPart}`;
        }
        return text;
    }
}
