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
    section: number = 0;
    word: number = 0;

    constructor() {
        this.wordContainer = document.getElementById("word")!;
        this.statusContainer = document.getElementById("status")!;

        this.wpmControl = new Control("wpm", ControlType.Range, 400, "Speed ", " WPM");
        this.fontSizeControl = new Control("fontsize", ControlType.Range, 3, "Font size ", " rem", (value: any) => {
            document.getElementById("word")!.style.fontSize = value.toString() + "rem";
        });
        this.lowerCaseControl = new Control("lowercase", ControlType.Checkbox, false, "Lowercase ");
        this.charThickeningControl = new Control("charthickening", ControlType.Checkbox, true, "Char thickening ");

        const fileLoader = new FileLoader((doc: ReadableFile) => {
            this.file = doc;
            this.section = 0;
            this.word = 0;
        });
        document.getElementById('file-picker')?.addEventListener('change', (e: any) => {
            let file = e.target!.files[0];
            fileLoader.loadFile(file);
        });

        document.getElementById("play-button")!.addEventListener('click', () => {
            this.isRunning = !this.isRunning;
            document.getElementById("play-button")!.innerHTML = this.isRunning ? "Pause" : "Resume";
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
                if (r.section < r.file.sections.length) {
                    const section = r.file.sections[r.section];
                    if (r.word < section.words.length) {
                        r.wordContainer.innerHTML = r.renderWord();
                        r.word++;
                        var progress = (r.word / section.words.length * 100).toFixed(2);
                        var wordsLeft = section.words.length - r.word;
                        var secondsLeft = wordsLeft * delay;
                        var hoursLeft = secondsLeft / 3600
                        var timeLeft: string;
                        if (hoursLeft >= 0.1) {
                            timeLeft = `${hoursLeft.toFixed(2)} hours`;
                        } else {
                            timeLeft = `${Math.ceil(secondsLeft).toString()} seconds`;
                        }
                        r.statusContainer.innerHTML = `${r.file.title} - ${r.word}/${section.words.length}  ${progress}%    ${timeLeft}`;
                    } else {
                        r.section++;
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
        var text = this.file.sections[this.section].words[this.word];
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
            let thickPart = text.substring(0, thickLetters);
            let normalPart = text.substring(thickLetters);
            text = `<strong>${thickPart}</strong>${normalPart}`;
        }
        return text;
    }
}
