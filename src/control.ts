export enum ControlType {
    Checkbox,
    Range,
}

export class Control {
    id: string;
    type: ControlType;
    value: any;
    inputElement: HTMLInputElement;
    labelElement: HTMLElement;
    prefix: string;
    suffix: String;
    onChange: (value: any) => void;

    constructor(id: string, type: ControlType, defaultValue: any, prefix: string = "", suffix: string = "", onChange: (value: any) => void = () => { }) {
        this.id = id;
        this.type = type;
        this.value = defaultValue;
        this.prefix = prefix;
        this.suffix = suffix;
        this.inputElement = <HTMLInputElement>document.getElementById(`${id}-input`);
        this.labelElement = document.getElementById(`${id}-label`)!;
        this.onChange = onChange;

        if (type == ControlType.Checkbox) {
            this.inputElement.addEventListener('change', () => this.onInput());
        } else if (type == ControlType.Range) {
            this.inputElement.addEventListener('input', () => this.onInput());
        }

        this.setInitial();
        this.updateLabel();
    }

    setInitial() {
        if (this.type == ControlType.Checkbox) {
            this.inputElement.checked = this.value;
        } else if (this.type == ControlType.Range) {
            this.inputElement.value = this.value;
        }
        this.onChange(this.value);
    }

    onInput() {
        if (this.type == ControlType.Checkbox) {
            this.value = this.inputElement.checked;
        } else if (this.type == ControlType.Range) {
            this.value = this.inputElement.value;
        }
        this.updateLabel();
        this.onChange(this.value);
    }

    updateLabel() {
        this.labelElement.innerHTML = this.prefix + (this.type == ControlType.Range ? this.value.toString() : "") + this.suffix;
    }
}