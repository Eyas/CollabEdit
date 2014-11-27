interface Number {
    pad(size: number): string;
}

Number.prototype.pad = function (size: number): string { return ('000000000' + this.toString()).substr(-size); };

module tsEdit {

    export enum ContentType {
        DOCUMENT,
        PARAGRAPH,
        TABLE,
        TABLE_ROW,
        TABLE_CELL,
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
            if (guidString) {
                this.guid = guidString;
                return;
            }

            // guid v4 compliant code thanks to broofa @ StackOverflow
            this.guid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });

        }
        toString(): string { return this.guid; }
        valueOf(): string { return this.guid; }
        equals(other: Guid): boolean {
            return (other) ? this.toString() == other.toString() : false;
        }
        private guid: string;
    }

    export interface IContentNode {
        id: Guid;
        leaf: boolean;
        type: ContentType;
        parent: IContainingNode;
        hasIndex(index: number): boolean;
        maxIndex(): number;
    }

    export interface IContainingNode extends IContentNode {
        getAtIndex(index: number): IContentNode;
        indexOf(node: IContentNode): number;
        getRoot(): RootDocument;
        forEach(fn: (v: IContentNode) => void): void;
    }

    export class LeafNode implements IContentNode {
        id: Guid;
        leaf: boolean;
        type: ContentType;
        parent: IContainingNode;

        constructor(parent: IContainingNode, type: ContentType) {
            this.id = new Guid();
            this.leaf = true;
            this.type = type;
            this.parent = parent;
        }

        hasIndex(index: number): boolean {
            throw new Error("NotImplementedException: ContentNode.hasIndex");
        }
        maxIndex(): number {
            throw new Error("NotImplementedException: ContentNode.hasIndex");
        }

        nextLeaf(): LeafNode {
            var parentIndex: number = this.parent.indexOf(this);
            var node: IContentNode = this.parent;

            while (!node.hasIndex(parentIndex + 1)) { // find uncle
                if (node.parent === null) return null;

                parentIndex = node.parent.indexOf(node);
                node = node.parent;
            }
            node = (<IContainingNode>node).getAtIndex(parentIndex + 1);

            while (!node.leaf) { // find first leaf
                node = (<IContainingNode>node).getAtIndex(0);
            }

            return <LeafNode>node;
        }
        prevLeaf(): LeafNode {
            var parentIndex: number = this.parent.indexOf(this);
            var node: IContentNode = this.parent;

            while (!node.hasIndex(parentIndex - 1)) { // find prev uncle
                if (node.parent === null) return null;

                parentIndex = node.parent.indexOf(node);
                node = node.parent;
            }
            node = (<IContainingNode>node).getAtIndex(parentIndex - 1);

            while (!node.leaf) { // find first leaf
                node = (<IContainingNode>node).getAtIndex(node.maxIndex());
            }

            return <LeafNode>node;
        }

    }

    export class ContainingNode implements IContainingNode {
        private contentSeries: ContentSeries;

        id: Guid;
        leaf: boolean;
        type: ContentType;
        parent: IContainingNode;

        constructor(parent: IContainingNode, type: ContentType) {
            this.id = new Guid();
            this.leaf = false;
            this.type = type;
            this.parent = parent;

            this.contentSeries = new ContentSeries(this.getRoot());
        }

        getRoot() {
            if (this.type === ContentType.DOCUMENT) return <RootDocument>this;
            return this.parent.getRoot();
        }

        getAtIndex(index: number): IContentNode {
            return this.contentSeries.getNode(index);
        }
        indexOf(node: IContentNode): number {
            return this.contentSeries.indexOf(node.id);
        }
        hasIndex(index: number): boolean {
            return this.contentSeries.hasIndex(index);
        }
        maxIndex(): number {
            return this.contentSeries.maxIndex();
        }
        forEach(fn: (v: IContentNode) => void): void {
            this.contentSeries.forEach(fn);
        }

        begin(): DocumentPosition {
            var node: IContentNode = this.getAtIndex(0);
            do {
                if (node === null) return null;
                if (node.leaf) return new DocumentPosition(0, <LeafNode>node);
                node = (<IContainingNode>node).getAtIndex(0);
            } while (true);
        }
    }

    export class RootDocument extends ContainingNode {
        constructor() {
            super(null, ContentType.DOCUMENT);
            this.contentStore = new ContentStore(this);
            this.selection = null;
        }
        put(node: IContentNode): void {
            this.contentStore.put(node);
        }
        get(guid: Guid): IContentNode {
            return this.contentStore.get(guid);
        }
        private contentStore: ContentStore;
        selection: TextRange;

        private shift_state: string;

        private finalize_shift(shift: boolean, pos: DocumentPosition): void {
            if (shift) {
                var l = this.selection.startPosition;
                var r = this.selection.endPosition;
                switch (this.shift_state) {
                    case "l": l = pos; break;
                    case "r": r = pos; break;
                    default: throw new Error("Unexpected shift_state " + this.shift_state);
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

            pos = pos.getNext();
            if (pos) this.finalize_shift(shift, pos);
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

            var nextNode = pos.node.nextLeaf();

            if (nextNode) {
                pos = new DocumentPosition(nextNode.hasIndex(pos.index) ? pos.index : nextNode.maxIndex(), nextNode);
            } else {
                pos.index = pos.node.maxIndex();
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

            var prevNode = pos.node.prevLeaf();

            if (prevNode) {
                pos = new DocumentPosition(prevNode.hasIndex(pos.index) ? pos.index : prevNode.maxIndex(), prevNode);
            } else {
                pos.index = 0;
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

            pos = pos.getPrevious();
            if (pos) this.finalize_shift(shift, pos);
        }

    };

    class ContentSeries {
        contentNodes: IContentNode[] = [];
        root: RootDocument;

        constructor(root: RootDocument) {
            this.root = root;
        }
        getNode(index: number): IContentNode { return this.contentNodes[index]; }
        hasIndex(index: number): boolean { return (this.contentNodes[index]) ? true : false; }
        maxIndex(): number { return this.contentNodes.length - 1; }
        forEach(fn: (v: IContentNode) => void): void {
            this.contentNodes.forEach(fn);
        }
        push(node: IContentNode): void {
            this.contentNodes.push(node);
            this.root.put(node);
        }
        indexOf(guid: Guid): number {
            return this.contentNodes.map(function (node, index) {
                return (node.id.equals(guid)) ? index : -1;
            }).filter(function (index) {
                    return index !== -1;
                })[0];
        }
    }

    export class Paragraph extends LeafNode {
        private text: string;
        formatting: Formatting[] = [new Formatting()];

        constructor(parent: ContainingNode) {
            super(parent, ContentType.PARAGRAPH);
        }
        setText(text: string): void { this.text = text; }
        getText(): string { return this.text; }
        validate(): void {
            var expectedLength: number = this.text.length;
            var actualLength: number = this.formatting.map((fmt) => { return fmt.length }).reduce((a, b) => { return a + b });
            console.assert(actualLength === expectedLength, "Expected paragraph length is " + expectedLength + " actual: " + actualLength);
        }
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

    export class Table extends ContainingNode {
        constructor(parent: ContainingNode) {
            super(parent, ContentType.TABLE);
        }
    };

    export class TableRow extends ContainingNode {
        constructor(parent: Table) {
            super(parent, ContentType.TABLE_ROW);
        }
    };

    export class TableCell extends ContainingNode {
        constructor(parent: TableRow) {
            super(parent, ContentType.TABLE_CELL);
        }
    };

    export class Image extends LeafNode { };

    //#endregion

    //#region Content Access
    class ContentStore {
        private contentNodes: { [guid: string]: IContentNode } = {};
        private doc: RootDocument;

        constructor(doc: RootDocument) {
            this.doc = doc;
            this.contentNodes[doc.id.toString()] = doc;
        }
        get(guid: Guid): IContentNode {
            return this.contentNodes[guid.toString()];
        }
        put(node: IContentNode): void {
            this.contentNodes[node.id.toString()] = node;
        }
    };

    //#endregion

    //#region RootDocument Interaction Representation
    export class DocumentPosition {
        index: number;
        node: LeafNode;

        constructor(index: number, node: LeafNode) {
            this.index = index;
            this.node = node;
        }
        toString(): string {
            return "[" + this.node.id.toString() + ":" + this.index.pad(7) + "]";
        }
        getNext(): DocumentPosition {
            if (this.node.hasIndex(this.index + 1)) {
                return new DocumentPosition(this.index + 1, this.node);
            }
            var node: LeafNode = this.node.nextLeaf();
            return node ? new DocumentPosition(0, node) : null;
        }
        getPrevious(): DocumentPosition {
            if (this.node.hasIndex(this.index - 1)) {
                return new DocumentPosition(this.index - 1, this.node);
            }
            var prevNode: LeafNode = this.node.prevLeaf();
            return prevNode ? new DocumentPosition(prevNode.maxIndex(), prevNode) : null;
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
            return this.startPosition.index === this.endPosition.index && this.startPosition.node.id.equals(this.endPosition.node.id);
        }
    }

    //#endregion

    //#region RootDocument Interaction Manipulation
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

    //#region RootDocument Display
    class UpdateState {
        selectionOngoing: boolean = false;
    };

    export class Display {
        private element: HTMLElement;
        private html: string = "";
        private doc: RootDocument;

        constructor(id: string, doc: RootDocument) {
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
            if (this.doc.selection === null) this.doc.selection = new TextRange(this.doc.begin(), this.doc.begin());
            var state: UpdateState = new UpdateState();
            var self = this;

            this.doc.forEach((contentNode: IContentNode): void => {
                self.element.appendChild(self.generate(contentNode, state));
            });

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

        private generate(contentNode: IContentNode, state: UpdateState): HTMLElement {
            var e: HTMLElement;

            switch (contentNode.type) {
                case ContentType.PARAGRAPH:
                    e = this.generateParagraph(<Paragraph>contentNode, state);
                    break;
                case ContentType.TABLE:
                    e = this.generateTable(<Table>contentNode, state);
                    break;
                case ContentType.TABLE_ROW:
                    e = this.generateTableRow(<TableRow>contentNode, state);
                    break;
                case ContentType.TABLE_CELL:
                    e = this.generateTableCell(<TableCell>contentNode, state);
                    break;
                case ContentType.IMAGE:
                    e = this.generateImage(<Image>contentNode, state);
                    break;
                default: throw new Error("Invalid ContentNode Type");
            }
            return e;
        }

        private generateParagraph(paragraph: Paragraph, state: UpdateState): HTMLParagraphElement {

            var i: number = 0;

            var paragraphElement: HTMLParagraphElement = document.createElement("p");
            paragraphElement.className = "charSelectable";
            paragraphElement.id = paragraph.id.valueOf();

            if (paragraph.id.equals(this.doc.selection.startPosition.node.id)) {
                this.renderText(paragraph, paragraphElement, 0, this.doc.selection.startPosition.index, false);
                state.selectionOngoing = true;
                i = this.doc.selection.startPosition.index;
            }

            if (paragraph.id.equals(this.doc.selection.endPosition.node.id)) {
                this.renderText(paragraph, paragraphElement, i, this.doc.selection.endPosition.index, state.selectionOngoing);
                state.selectionOngoing = false;
                i = this.doc.selection.endPosition.index;
            }

            this.renderText(paragraph, paragraphElement, i, paragraph.getText().length, state.selectionOngoing);

            return paragraphElement;
        }

        private generateTable(table: Table, state: UpdateState): HTMLTableElement {
            var element: HTMLTableElement = document.createElement("table");
            element.id = table.id.valueOf();

            var self = this;

            table.forEach((contentNode: IContentNode): void => {
                element.appendChild(self.generate(contentNode, state));
            });

            return element;
        }

        private generateTableRow(row: TableRow, state: UpdateState): HTMLTableRowElement {
            var element: HTMLTableRowElement = document.createElement("tr");
            element.id = row.id.valueOf();

            var self = this;

            row.forEach((contentNode: IContentNode): void => {
                element.appendChild(self.generate(contentNode, state));
            });

            return element;
        }

        private generateTableCell(cell: TableCell, state: UpdateState): HTMLTableDataCellElement {
            var element: HTMLTableDataCellElement = document.createElement("td");
            element.id = cell.id.valueOf();

            var self = this;

            cell.forEach((contentNode: IContentNode): void => {
                element.appendChild(self.generate(contentNode, state));
            });

            return element;
        }

        private generateImage(image: Image, state: UpdateState): HTMLImageElement {
            return document.createElement("img");
        }

        private makePosition(_container: Node, _offset: number): DocumentPosition {

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
                <LeafNode>this.doc.get(startGuid));

        }

    }

}
