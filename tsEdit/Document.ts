interface Number {
    pad(size: number): string;
}

Number.prototype.pad = function (size: number): string { return ('000000000' + this.toString()).substr(-size); };

module tsEdit {

    export enum ContentType {
        DOCUMENT,
        PARAGRAPH,
        TABLE,
        IMAGE
    }

    export enum EditAction {
        REPLACE_RANGE,
        FORMAT
    }

    enum KeyboardKeys {
        Left = 37,
        Up = 38,
        Right = 39,
        Down = 40,
        Backspace = 8,
    }

    export class Guid {
        constructor(guidString?: string) {
            function s4() {
                return Math.floor((1 + Math.random()) * 0x10000)
                    .toString(16)
                    .substring(1);
            };

            this.guid = (guidString) ? guidString : s4() + s4() + '-' + s4() + '-' + s4()
            + '-' + s4() + '-' + s4() + s4() + s4();

        }
        toString(): string { return this.guid; }
        valueOf(): string { return this.guid; }
        equals(other: Guid): boolean {
            return (other) ? this.toString() == other.toString() : false;
        }
        private guid: string;
    }

    export class ContentNode {
        constructor(parent: ContentNode) {
            this.parent = parent;
        }
        id: Guid = new Guid();
        type: ContentType;
        contentSeries: ContentSeries;
        parent: ContentNode;
        getAtIndex(index: number): ContentNode {
            throw "NotImplementedException: ContentNode.getAtIndex";
        }
        hasIndex(index: number): boolean {
            throw "NotImplementedException: ContentNode.hasIndex";
        }
        maxIndex(): number {
            throw "NotImplementedException: ContentNode.hasIndex";
        }

    }

    export class Document extends ContentNode {
        type: ContentType = ContentType.DOCUMENT;
        constructor() {
            super(null);
            this.contentSeries = new ContentSeries(this);
            this.contentStore = new ContentStore(this);
            this.selection = new TextRange(new DocumentPosition(0, new DocumentPosition(0)), new DocumentPosition(0, new DocumentPosition(0)));
        }
        contentStore: ContentStore;
        selection: TextRange;

        private shift_state: string;

        getAtIndex(index: number): ContentNode {
            return this.contentSeries.getNode(index);
        }
        hasIndex(index: number): boolean {
            return this.contentSeries.hasIndex(index);
        }
        maxIndex(): number {
            return this.contentSeries.maxIndex();
        }

        locate(position: DocumentPosition): ContentNode {
            var indices: number[] = position.getDomTraversal();
            var current: ContentNode = this;
            var index: number;
            while ((index = indices.pop()) !== undefined) {
                current = current.getAtIndex(index);

                if (current === null || current === undefined)
                    return undefined;
            }
            return current;
        }

        private finalize_shift(shift: boolean, pos: DocumentPosition): void {
            if (shift) {
                var l = this.selection.startPosition;
                var r = this.selection.endPosition;
                switch (this.shift_state) {
                    case "l": l = pos; break;
                    case "r": r = pos; break;
                    default: throw "Unexpected shift_state " + this.shift_state;
                }
                this.selection = new TextRange(l, r);

            } else {
                this.selection = new TextRange(pos);
            }
        }

        selectRight(shift): void {
            var pos: DocumentPosition;

            if (this.selection.isCollapsed() === true) {
                this.shift_state = "";
            }
            if (this.shift_state === "l") {
                pos = this.selection.startPosition;
            } else {
                pos = this.selection.endPosition;
            }
            if (shift === false) {
                if (this.shift_state !== "") {
                    this.shift_state = "";
                }
                if (this.selection.isCollapsed() === false) {
                    this.selection = new TextRange(pos);
                    return;
                }
            }
            if (shift === true && this.shift_state === "") {
                this.shift_state = "r";
            }

            var node = this.locate(pos);
            if (node.hasIndex(pos.index + 1)) {
                pos = pos.getNext();
            } else {
                pos = pos.getParent().getNext().getChild();
                if (this.locate(pos) === undefined)
                    return;
            }
            this.finalize_shift(shift, pos);
        }

        selectDown(shift: boolean) {
            var pos: DocumentPosition;

            if (this.selection.isCollapsed() === true) {
                this.shift_state = "";
            }
            if (this.shift_state === "l") {
                pos = this.selection.startPosition;
            } else {
                pos = this.selection.endPosition;
            }
            if (shift === false) {
                if (this.shift_state !== "") {
                    this.shift_state = "";
                }
                if (this.selection.isCollapsed() === false) {
                    this.selection = new TextRange(pos);
                    return;
                }
            }
            if (shift === true && this.shift_state === "") {
                this.shift_state = "r";
            }

            var charIndex = pos.index;
            pos = pos.getParent();
            var node = this.locate(pos);
            if (node.parent.hasIndex(pos.index + 1)) {
                pos = pos.getNext().getChild();
                node = this.locate(pos);
                if (node.hasIndex(charIndex))
                    pos = new DocumentPosition(charIndex, pos.parent);
                else
                    pos = new DocumentPosition(node.maxIndex(), pos.parent);
            }
            else {
                pos = new DocumentPosition(0, pos);
                node = this.locate(pos);
                if (node === undefined)
                    return;
                pos = new DocumentPosition(node.maxIndex(), pos.parent);
            }
            this.finalize_shift(shift, pos);
        }

        selectUp(shift: boolean) {
            var pos: DocumentPosition;
            if (this.selection.isCollapsed() === true) {
                this.shift_state = "";
            }

            if (this.shift_state === "l" || this.shift_state === "") {
                pos = this.selection.startPosition;
            } else {
                pos = this.selection.endPosition;
            }
            if (shift === false) {
                if (this.shift_state !== "") {
                    this.shift_state = "";
                }
            }
            if (shift === true && this.shift_state === "") {
                this.shift_state = "l";
            }

            var charIndex = pos.index;
            pos = pos.getParent();
            var node = this.locate(pos);

            if (node.parent.hasIndex(pos.index - 1)) {
                pos = pos.getPrevious().getChild();
                node = this.locate(pos);
                if (node.hasIndex(charIndex))
                    pos = new DocumentPosition(charIndex, pos.parent);
                else
                    pos = new DocumentPosition(node.maxIndex(), pos.parent);
            }
            else {
                pos = new DocumentPosition(0, pos);
                node = this.locate(pos);
                if (node === undefined)
                    return;
            }

            this.finalize_shift(shift, pos);
        }

        selectLeft(shift: boolean) {
            var pos: DocumentPosition;
            if (this.selection.isCollapsed() === true) {
                this.shift_state = "";
            }

            if (this.shift_state === "l" || this.shift_state === "") {
                pos = this.selection.startPosition;
            } else {
                pos = this.selection.endPosition;
            }
            if (shift === false) {
                if (this.shift_state !== "") {
                    this.shift_state = "";
                }
                if (this.selection.isCollapsed() === false) {
                    this.selection = new TextRange(pos);
                    return;
                }
            }
            if (shift === true && this.shift_state === "") {
                this.shift_state = "l";
            }

            var node = this.locate(pos);
            if (node.hasIndex(pos.index - 1)) {
                pos = pos.getPrevious();
            }
            else {
                pos = pos.getParent().getPrevious().getChild();
                node = this.locate(pos);
                if (node === undefined)
                    return;
                pos = new DocumentPosition(node.maxIndex(), pos.parent);
            }

            this.finalize_shift(shift, pos);
        }

    };

    export class ContentSeries {
        contentNodes: ContentNode[] = [];
        doc: Document;

        constructor(doc: Document) {
            this.doc = doc;
        }
        getNode(index: number): ContentNode { return this.contentNodes[index]; }
        hasIndex(index: number): boolean { return (this.contentNodes[index]) ? true : false; }
        maxIndex(): number { return this.contentNodes.length - 1; }
        getIterator(): ContentIterator {
            return new ContentIterator(this.contentNodes.slice(0));
        }
        push(node: ContentNode): void {
            this.contentNodes.push(node);
            this.doc.contentStore.put(node);
        }
        indexOf(guid: Guid): number {
            return this.contentNodes.map(function (node, index) {
                return (node.id.equals(guid)) ? index : -1;
            }).filter(function (index) {
                    return index !== -1;
                })[0];
        }
    }

    export class Paragraph extends ContentNode {
        private text: string;
        formatting: Formatting[] = [new Formatting()];
        type: ContentType = ContentType.PARAGRAPH;
        contentSeries: ContentSeries = null;
        constructor(parent: ContentNode) {
            super(parent);
        }
        setText(text: string): void { this.text = text; }
        getText(): string { return this.text; }
        validate(): void {
            var expectedLength: number = this.text.length;
            var actualLength: number = 0;
            this.formatting.forEach(function (fmt) {
                actualLength += fmt.length;
            });
            console.assert(actualLength === expectedLength, "Expected paragraph length is " + expectedLength + " actual: " + actualLength);
        }
        getAtIndex(index: number): ContentNode { return this; }
        hasIndex(index: number): boolean {
            return (index >= 0 && index <= this.text.length)
        }
        maxIndex(): number {
            return this.text.length;
        }
    };

    export class Formatting {
        bold: boolean = false;
        italic: boolean = false;
        underline: boolean = false;
        size: string = "1.0em";
        color: string = "black";
        highlight: string = "transparent";
        pos: string = "baseline"; // sub, super, baseline
        length: number = 0;

        clone(): Formatting {
            var copy = new Formatting();
            copy.bold = this.bold;
            copy.italic = this.italic;
            copy.underline = this.underline;
            copy.size = this.size;
            copy.color = this.color;
            copy.highlight = this.highlight;
            copy.pos = this.pos;
            return copy;
        }
    }

    export class Table extends ContentNode { };
    export class TableRow extends ContentNode { };
    export class TableCell extends ContentNode { };

    export class Image extends ContentNode { };

    //#endregion

    //#region Content Access
    export class ContentStore {
        private contentNodes: { [guid: string]: ContentNode } = {};
        private doc: Document;

        constructor(doc: Document) {
            this.doc = doc;
            this.contentNodes[doc.id.toString()] = doc;
        }
        get(guid: Guid): ContentNode {
            return this.contentNodes[guid.toString()];
        }
        put(node: ContentNode): void {
            this.contentNodes[node.id.toString()] = node;
        }
    };

    export class ContentIterator {
        private array: ContentNode[];
        private index: number = 0;
        constructor(array: ContentNode[]) {
            this.array = array;
        }
        nextNode(): ContentNode {
            return this.array[this.index++];
        }
    }
    //#endregion

    //#region Document Interaction Representation
    export class DocumentPosition {
        index: number;
        parent: DocumentPosition;
        constructor(index: number, parent?: DocumentPosition) {
            this.index = index;
            this.parent = parent ? parent : null;
        }
        equals(other: DocumentPosition): boolean {
            if (other === undefined || other === null) return false;
            if (this.index !== other.index) return false;

            if (this.parent) {
                if (!other.parent)
                    return false;
                return this.parent.equals(other.parent);
            } else {
                return (!other.parent);
            }
        }
        toString(): string {
            var text = this.index.pad(7);
            if (this.parent) text = this.parent.toString() + ">" + text;
            return text;
        }
        hasParent(): boolean {
            return this.parent ? true : false;
        }
        getParent(): DocumentPosition {
            console.assert(this.hasParent(), "Calling getParent on top level element");
            return this.parent;
        }
        getNext(): DocumentPosition {
            return new DocumentPosition(this.index + 1, this.parent);
        }
        getPrevious(): DocumentPosition {
            return new DocumentPosition(this.index - 1, this.parent);
        }
        getChild(): DocumentPosition {
            return new DocumentPosition(0, this);
        }
        getDomTraversal(): number[] {
            var order: number[] = [];
            var at: DocumentPosition = this;
            do {
                order.push(at.index);
            } while (at = at.parent);
            return order;
        }
    }

    export class TextRange {
        startPosition: DocumentPosition;
        endPosition: DocumentPosition;
        constructor(startPosition: DocumentPosition, endPosition?: DocumentPosition) {
            this.startPosition = startPosition;
            this.endPosition = endPosition ? endPosition : startPosition;
        }
        isCollapsed(): boolean {
            return this.startPosition.equals(this.endPosition);
        }
    }

    //#endregion

    //#region Document Interaction Manipulation
    class ReplaceArgs {
        selection: TextRange;
        text: string;
        constructor(selection: TextRange, text: string) {
            this.selection = selection;
            this.text = text;
        }
    };

    class FormatArgs {
        selection: TextRange;
        formatting: Formatting;
        constructor(selection: TextRange, formatting: Formatting) {
            this.selection = selection;
            this.formatting = formatting;
        }
    }
    //#endregion

    //#region Document Display
    class UpdateState {
        currentPosition: DocumentPosition = new DocumentPosition(0);
        selectionOngoing: boolean = false;
    };

    export class Display {
        private element: HTMLElement;
        private html: string = "";
        private doc: Document;

        constructor(id: string, doc: Document) {
            var self = this;
            self.doc = doc;

            self.element = document.getElementById(id);

            self.element.addEventListener("mouseup", function () {

                var s: Selection = window.getSelection();
                if (s.isCollapsed) {
                    var range: Range = s.getRangeAt(0);
                    var p: DocumentPosition = self.makePosition(range.startContainer, range.startOffset);
                    self.doc.selection = new TextRange(p, p);
                } else {
                    var range: Range = s.getRangeAt(0);
                    var p1: DocumentPosition = self.makePosition(range.startContainer, range.startOffset);
                    var p2: DocumentPosition = self.makePosition(range.endContainer, range.endOffset);
                    self.doc.selection = new TextRange(p1, p2);
                }

                s.removeAllRanges();
                self.Update();
            });

            document.addEventListener("keydown", function (event) {
                switch (event.which) {
                    case KeyboardKeys.Right:
                        self.doc.selectRight(event.shiftKey);
                        break;
                    case KeyboardKeys.Left:
                        self.doc.selectLeft(event.shiftKey);
                        break;
                    case KeyboardKeys.Up:
                        self.doc.selectUp(event.shiftKey);
                        break;
                    case KeyboardKeys.Down:
                        self.doc.selectDown(event.shiftKey);
                        break;
                }

                self.Update();
                event.preventDefault();
            });
        }

        Update(): void {
            while (this.element.hasChildNodes()) {
                this.element.removeChild(this.element.lastChild);
            }

            var iterator: ContentIterator = this.doc.contentSeries.getIterator();

            var state: UpdateState = new UpdateState();
            var contentNode: ContentNode;

            while ((contentNode = iterator.nextNode()) !== undefined) {
                switch (contentNode.type) {
                    case ContentType.PARAGRAPH:
                        this.element.appendChild(this.generateParagraph(<Paragraph>contentNode, state))
                    break;
                    case ContentType.TABLE:
                        this.element.appendChild(this.generateTable(<Table>contentNode, state))
                    break;
                    case ContentType.IMAGE:
                        this.element.appendChild(this.generateImage(<Image>contentNode, state))
                    break;
                }
                state.currentPosition = state.currentPosition.getNext();
            }
        }

        private formatSpan(span: HTMLSpanElement, format: Formatting): void {
            if (format.bold) span.style.fontWeight = "bold";
            if (format.italic) span.style.fontStyle = "italic";
            if (format.underline) span.style.textDecoration = "underline";
            span.style.backgroundColor = format.highlight;
            span.style.color = format.color;
            span.style.fontSize = format.size;
            span.style.verticalAlign = format.pos;
        }

        private renderText(paragraph: Paragraph, container: HTMLElement, startIndex: number, endIndex: number, selected: boolean): void {
            if (startIndex === endIndex) {
                if (selected) {
                    var span: HTMLSpanElement = document.createElement("span");
                    span.className = "selected";
                    container.appendChild(span);
                }
                return;
            }

            var formatIndex: number = 0; /// index into format array
            var currentIndex: number = 0; /// index into paragraph
            var formatRemaining: number = -1; /// number of characters remaining in current format

            for (; formatIndex < paragraph.formatting.length; ++formatIndex) {
                if (currentIndex + paragraph.formatting[formatIndex].length > /* or >= */ startIndex) {
                    formatRemaining = paragraph.formatting[formatIndex].length - (startIndex - currentIndex);
                    currentIndex = startIndex;
                    break;
                }
                currentIndex += paragraph.formatting[formatIndex].length;
            }

            console.assert(formatRemaining !== -1, "Format Remaining must be accurate.");

            while (currentIndex < endIndex)
                (() => { // function to keep variable scope in block
                    var format: Formatting = paragraph.formatting[formatIndex];
                    var span: HTMLSpanElement = document.createElement("span");
                    this.formatSpan(span, format);
                    if (selected) span.className = "selected";

                    var end: number;
                    if (currentIndex + formatRemaining >= endIndex) {
                        end = endIndex;
                    } else {
                        end = currentIndex + formatRemaining;
                    }

                    span.textContent = paragraph.getText().substring(currentIndex, end);
                    container.appendChild(span);

                    ++formatIndex;
                    if (formatIndex < paragraph.formatting.length) {
                        formatRemaining = paragraph.formatting[formatIndex].length;
                    }
                    currentIndex = end;
                })();

        }

        private generateParagraph(paragraph: Paragraph, state: UpdateState): HTMLParagraphElement {

            var i: number = 0;

            var paragraphElement: HTMLParagraphElement = document.createElement("p");
            paragraphElement.className = "charSelectable";
            paragraphElement.id = paragraph.id.valueOf();

            if (state.currentPosition.equals(this.doc.selection.startPosition.getParent())) {
                this.renderText(paragraph, paragraphElement, 0, this.doc.selection.startPosition.index, false);
                state.selectionOngoing = true;
                i = this.doc.selection.startPosition.index;
            }

            if (state.currentPosition.equals(this.doc.selection.endPosition.getParent())) {
                this.renderText(paragraph, paragraphElement, i, this.doc.selection.endPosition.index, state.selectionOngoing);
                state.selectionOngoing = false;
                i = this.doc.selection.endPosition.index;
            }

            this.renderText(paragraph, paragraphElement, i, paragraph.getText().length, state.selectionOngoing);

            return paragraphElement;
        }

        private generateTable(table: Table, state: UpdateState): HTMLTableElement {
            return document.createElement("table");
        }

        private generateImage(image: Image, state: UpdateState): HTMLImageElement {
            return document.createElement("img");
        }

        private makePosition(_container: Node, _offset: number): DocumentPosition {

            var nodePosition = (node: ContentNode): DocumentPosition => {
                if (node.parent.type === ContentType.DOCUMENT) {
                    return new DocumentPosition(node.parent.contentSeries.indexOf(node.id));
                }
                return new DocumentPosition(node.parent.contentSeries.indexOf(node.id), nodePosition(node.parent));
            };

            var isSelectable = (node: Node): boolean => {
                return (node.nodeType === Node.ELEMENT_NODE)
                    && (<HTMLElement>node).id
                    && (<HTMLElement>node).className === "charSelectable";
            };

            var findSelectable = (node: Node): HTMLElement => {
                var current: Node = node;
                while (!isSelectable(current)) {
                    console.assert(current.parentNode ? true : false, "Parent node must exist.");
                    current = current.parentNode;
                }
                return <HTMLElement>current;
            };

            var findIndex = (container: Node, index: number, from: Node): number => {
                if (container.isEqualNode(from)) { return index; }
                return index + charactersUntil(container, from);
            };

            var charactersUntil = (container: Node, from: Node): number => {
                var current: Node = container;
                var parent: Node = container.parentNode;
                var acc: number = 0;

                        do {
                    while (current = current.previousSibling) {
                        acc += current.textContent.length;
                    }
                    current = parent;
                    parent = current.parentNode;
                } while (!current.isEqualNode(from))

                        return acc;
            };

            var startElement: HTMLElement = findSelectable(_container);
            var startGuid: Guid = new Guid(startElement.id);

            var startIndex: number = findIndex(_container, _offset, startElement);

            return new DocumentPosition(
                startIndex,
                nodePosition(this.doc.contentStore.get(startGuid)));

        }

    }

}
