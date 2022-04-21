import { Control, ControlType } from "./control.js";
import { Book, FileLoader } from "./loader.js";


// Controls

var wpmControl: Control;
var fontSizeControl: Control;
var lowerCaseControl: Control;
var charThickeningControl: Control;

const wordContainer = document.getElementById("word")!;
const statusContainer = document.getElementById("status")!;


// Reading

var oldTime = 0;
var timer = 0;

// var words: Array<string> = ["No", "File", "Loaded", "Yet"];
var currentBook: Book;
var currentWord = 0;

const fileLoader = new FileLoader((book: Book) => {
    currentBook = book;
    currentWord = 0;
});

var isRunning = false;
document.getElementById("play-button")!.addEventListener('click', () => {
    isRunning = !isRunning;
    document.getElementById("play-button")!.innerHTML = isRunning ? "Pause" : "Resume";
    timer = 0;
});

function generateWords() {
    var text = currentBook.words[currentWord];
    if (lowerCaseControl.value) {
        text = text.toLowerCase();
    }
    if (charThickeningControl.value) {
        let boldLetters;
        if (text.length <= 3) {
            boldLetters = 1;
        } else if (text.length == 4) {
            boldLetters = 2;
        } else {
            boldLetters = Math.round(text.length * 0.4);
        }
        let boldPart = text.substring(0, boldLetters);
        let normalPart = text.substring(boldLetters);
        text = `<strong>${boldPart}</strong>${normalPart}`;
    }

    return text;
}

function appLoop(currentTime: DOMHighResTimeStamp) {
    const dt = (currentTime - oldTime) / 1000;
    oldTime = currentTime;
    const fps = Math.round(1 / dt);

    if (isRunning) {
        timer += dt;
    }

    const delay = 60 / wpmControl.value;

    if (timer >= delay) {
        if (currentWord < currentBook.words.length) {
            wordContainer.innerHTML = generateWords();
            timer = 0;
            currentWord++;
            var progress = (currentWord / currentBook.words.length * 100).toFixed(2);
            var wordsLeft = currentBook.words.length - currentWord;
            var secondsLeft = wordsLeft * delay;
            var hoursLeft = secondsLeft / 3600
            var timeLeft: string;
            if (hoursLeft >= 0.1) {
                timeLeft = `${hoursLeft.toFixed(2)} hours`;
            } else {
                timeLeft = `${Math.ceil(secondsLeft).toString()} seconds`;
            }
            statusContainer.innerHTML = `${currentBook.fileName} - ${currentWord}/${currentBook.words.length}  ${progress}%    ${timeLeft}`;
        } else {
            wordContainer.innerHTML = "...";
        }
    }


    window.requestAnimationFrame(appLoop);
}

function init() {
    wpmControl = new Control("wpm", ControlType.Range, 400, "Speed ", " WPM");
    fontSizeControl = new Control("fontsize", ControlType.Range, 3, "Font size ", " rem", (value: any) => {
        document.getElementById("word")!.style.fontSize = value.toString() + "rem";
    });
    lowerCaseControl = new Control("lowercase", ControlType.Checkbox, false, "Lowercase ");
    charThickeningControl = new Control("charthickening", ControlType.Checkbox, true, "Char thickening ");

    window.requestAnimationFrame(appLoop);
    document.getElementById('file-picker')?.addEventListener('change', (e: any) => {
        let file = e.target!.files[0];
        fileLoader.loadFile(file);
    });
}

window.addEventListener('load', init);