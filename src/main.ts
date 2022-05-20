import { Control, ControlType } from "./control";
import { ReadableFile, FileLoader } from "./loader";

let r: Reader;

window.addEventListener('load', () => {
    r = new Reader();
    r.start();
});

class Reader {
    // Containers
    wordContainer: HTMLElement;
    statusContainer: HTMLElement;

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
        this.statusContainer = document.getElementById("status")!;

        this.wpmControl = new Control("wpm", ControlType.Range, 300, "Speed ", " WPM");
        this.fontSizeControl = new Control("fontsize", ControlType.Range, 64, "Font size ", "px", (value: any) => {
            document.getElementById("word")!.style.fontSize = value.toString() + "px";
        });
        this.lowerCaseControl = new Control("lowercase", ControlType.Checkbox, false, "Lowercase");
        this.charThickeningControl = new Control("charthickening", ControlType.Checkbox, true, "Char thickening");

        const fileLoader = new FileLoader((doc: ReadableFile) => {
            this.file = doc;
            this.isRunning = false;
            this.timer = 0;
            this.currentSection = 0;
            this.word = 0;
            this.wordContainer.innerHTML = this.file.title;
            this.playButton.removeAttribute("disabled");
            this.playButton.innerHTML = "Start";
        });
        document.getElementById('file-picker')?.addEventListener('change', (e: any) => {
            const file = e.target!.files[0];
            fileLoader.loadFile(file);
        });

        this.playButton = document.getElementById("play-button")!;
        this.playButton.addEventListener('click', () => {
            this.isRunning = !this.isRunning;
            this.playButton.innerText = this.isRunning ? "Pause" : "Resume";
            this.timer = 0;
        });
    }

    start() {
        window.requestAnimationFrame(Reader.loop);
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
                        r.statusContainer.innerHTML = `${r.file.title} - ${wordNumber}/${totalWords} - ${progress}% - ${timeLeft}`;
                        if (r.file.sections.length > 1) {
                            const sectionProgress = (r.word / section.words.length * 100).toFixed(2);
                            const sectionWordsLeft = section.words.length - r.word;
                            const sectionTimeLeft = new Date(sectionWordsLeft * delay * 1000).toISOString().substring(11, 19)
                            r.statusContainer.innerHTML += `<br>${section.title} (${r.currentSection + 1}/${r.file.sections.length}) - ${r.word}/${section.words.length} - ${sectionProgress}% - ${sectionTimeLeft}`;
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
