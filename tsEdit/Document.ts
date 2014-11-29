interface String {
    replaceRange(start: number, end: number, replace: string): string;
}

String.prototype.replaceRange = function (start: number, end: number, replace: string): string {
    return this.slice(0, start) + replace + this.slice(end, this.length);
};

module tsEdit {

    export interface Maybe<T> extends Functional.Maybe<T> { }
    class Some<T> extends Functional.Some<T> { }
    var None = Functional.None;

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

    enum ShiftState {
        COLLAPSED,
        MANIPULATE_START,
        MANIPULATE_END,
    }

    enum LegacyKeys {
        Left = 37,
        Up = 38,
        Right = 39,
        Down = 40,
        Backspace = 8,
        Delete = 46,
        Enter = 13
    }

    var Keys = {
        Left: "Left",
        Up: "Up",
        Right: "Right",
        Down: "Down",
        Backspace: "Backspace",
        Delete: "Delete",
        Enter: "Enter"
    }

    var toKey: (number) => string = (keyCode: number): string => {
        switch (keyCode) {
            case LegacyKeys.Left: return Keys.Left;
            case LegacyKeys.Up: return Keys.Up;
            case LegacyKeys.Right: return Keys.Right;
            case LegacyKeys.Down: return Keys.Down;
            case LegacyKeys.Backspace: return Keys.Backspace;
            case LegacyKeys.Delete: return Keys.Delete;
            case LegacyKeys.Enter: return Keys.Enter;
        }
    };

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
        parent: Maybe<IContainingNode>;
        hasIndex(index: number): boolean;
        maxIndex(): number;
        firstLeaf(): Maybe<LeafNode>;
        lastLeaf(): Maybe<LeafNode>;
        validate(): void;
    }

    export interface IContainingNode extends IContentNode {
        getAtIndex(index: number): Maybe<IContentNode>;
        indexOf(node: IContentNode): number;
        getRoot(): RootDocument;
        forEach(fn: (v: IContentNode) => void): void;
    }

    export class LeafNode implements IContentNode {
        id: Guid;
        leaf: boolean;
        type: ContentType;
        parent: Maybe<IContainingNode>;

        constructor(parent: IContainingNode, type: ContentType) {
            this.id = new Guid();
            this.leaf = true;
            this.type = type;
            this.parent = new Some(parent);
        }

        validate(): void {
            throw new Error("NotImplementedException: LeafNode.validate");
        }
        hasIndex(index: number): boolean {
            throw new Error("NotImplementedException: LeafNode.hasIndex");
        }
        maxIndex(): number {
            throw new Error("NotImplementedException: LeafNode.maxIndex");
        }
        firstLeaf(): Maybe<LeafNode> {
            return new Some(this);
        }
        lastLeaf(): Maybe<LeafNode> {
            return new Some(this);
        }
        nextLeaf(): Maybe<LeafNode> {
            var parentIndex: number = this.parent.value().indexOf(this);
            var node: IContentNode = this.parent.value();

            while (!node.hasIndex(parentIndex + 1)) { // find uncle
                if (node.parent.hasValue === false) return None;

                parentIndex = node.parent.value().indexOf(node);
                node = node.parent.value();
            }
            // can call .value() immediately since the loop verifies that the value exists
            return (<IContainingNode>node).getAtIndex(parentIndex + 1).value().firstLeaf();

        }
        prevLeaf(): Maybe<LeafNode> {
            var parentIndex: number = this.parent.value().indexOf(this);
            var node: IContentNode = this.parent.value();

            while (!node.hasIndex(parentIndex - 1)) { // find prev uncle
                if (node.parent.hasValue === false) return None;

                parentIndex = node.parent.value().indexOf(node);
                node = node.parent.value();
            }
            return (<IContainingNode>node).getAtIndex(parentIndex - 1).value().lastLeaf();

        }

    }

    export class ContainingNode implements IContainingNode {
        private contentSeries: ContentSeries;

        id: Guid;
        leaf: boolean;
        type: ContentType;
        parent: Maybe<IContainingNode>;

        constructor(parent: Maybe<IContainingNode>, type: ContentType) {
            this.id = new Guid();
            this.leaf = false;
            this.type = type;
            this.parent = parent;

            this.contentSeries = new ContentSeries(this.getRoot());
        }

        getRoot(): RootDocument {
            if (this.type === ContentType.DOCUMENT) return <RootDocument>this;
            if (this.parent.hasValue === false) throw new Error("Node is at root but is not a DOCUMENT.");
            return this.parent.value().getRoot();
        }

        getAtIndex(index: number): Maybe<IContentNode> {
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
        validate(): void {
            console.assert(this.contentSeries.maxIndex() >= 0, "Must contain elements");
            this.forEach((n: IContentNode) => {
                n.validate();
            });
        }
        forEach(fn: (v: IContentNode) => void): void {
            this.contentSeries.forEach(fn);
        }
        firstLeaf(): Maybe<LeafNode> {
            return this.getAtIndex(0).mapRecurse((node) => { return node.firstLeaf(); });
        }
        lastLeaf(): Maybe<LeafNode> {
            return this.getAtIndex(this.maxIndex()).mapRecurse((node) => { return node.lastLeaf(); });
        }

    }

    export class RootDocument extends ContainingNode {
        constructor() {
            super(None, ContentType.DOCUMENT);
            this.contentStore = new ContentStore(this);
            this.selection = null;
            this.shift_state = ShiftState.COLLAPSED;
        }
        put(node: IContentNode): void {
            this.contentStore.put(node);
        }
        get(guid: Guid): IContentNode {
            return this.contentStore.get(guid);
        }
        private contentStore: ContentStore;
        selection: TextRange;

        private shift_state: ShiftState;

        private finalize_shift(shift: boolean, pos: DocumentPosition): void {
            if (shift) {
                var start = this.selection.startPosition;
                var end = this.selection.endPosition;
                switch (this.shift_state) {
                    case ShiftState.MANIPULATE_START: start = pos; break;
                    case ShiftState.MANIPULATE_END: end = pos; break;
                    default: throw new Error("Unexpected shift_state " + this.shift_state.toString());
                }
                if (end.before(start)) {
                    this.selection = new TextRange(end, start);
                    switch (this.shift_state) {
                        case ShiftState.MANIPULATE_START: this.shift_state = ShiftState.MANIPULATE_END; break;
                        case ShiftState.MANIPULATE_END: this.shift_state = ShiftState.MANIPULATE_START; break;
                    }
                } else {
                    this.selection = new TextRange(start, end);
                }

            } else {
                this.selection = new TextRange(pos);
            }
        }

        selectRight(shift): void {
            var pos: DocumentPosition;

            if (this.selection.isCollapsed() === true) {
                this.shift_state = ShiftState.COLLAPSED;
            }
            if (this.shift_state === ShiftState.MANIPULATE_START) {
                pos = this.selection.startPosition;
            } else {
                pos = this.selection.endPosition;
            }
            if (shift === false) {
                if (this.shift_state !== ShiftState.COLLAPSED) {
                    this.shift_state = ShiftState.COLLAPSED;
                }
                if (this.selection.isCollapsed() === false) {
                    this.selection = new TextRange(pos);
                    return;
                }
            }
            if (shift === true && this.shift_state === ShiftState.COLLAPSED) {
                this.shift_state = ShiftState.MANIPULATE_END;
            }

            var next: Maybe<DocumentPosition> = pos.getNext();
            if (next.hasValue) this.finalize_shift(shift, next.value());
        }

        selectDown(shift: boolean) {
            var pos: DocumentPosition;

            if (this.selection.isCollapsed() === true) {
                this.shift_state = ShiftState.COLLAPSED;
            }
            if (this.shift_state === ShiftState.MANIPULATE_START) {
                pos = this.selection.startPosition;
            } else {
                pos = this.selection.endPosition;
            }
            if (shift === false) {
                if (this.shift_state !== ShiftState.COLLAPSED) {
                    this.shift_state = ShiftState.COLLAPSED;
                }
                if (this.selection.isCollapsed() === false) {
                    this.selection = new TextRange(pos);
                    return;
                }
            }
            if (shift === true && this.shift_state === ShiftState.COLLAPSED) {
                this.shift_state = ShiftState.MANIPULATE_END;
            }

            var nextNode: Maybe<LeafNode> = pos.node.nextLeaf();

            if (nextNode.hasValue) {
                var n: LeafNode = nextNode.value();
                pos = new DocumentPosition(n.hasIndex(pos.index) ? pos.index : n.maxIndex(), n);
            } else {
                pos = new DocumentPosition(pos.node.maxIndex(), pos.node);
            }

            this.finalize_shift(shift, pos);

        }

        selectUp(shift: boolean) {
            var pos: DocumentPosition;
            if (this.selection.isCollapsed() === true) {
                this.shift_state = ShiftState.COLLAPSED;
            }

            if (this.shift_state === ShiftState.MANIPULATE_START || this.shift_state === ShiftState.COLLAPSED) {
                pos = this.selection.startPosition;
            } else {
                pos = this.selection.endPosition;
            }
            if (shift === false) {
                if (this.shift_state !== ShiftState.COLLAPSED) {
                    this.shift_state = ShiftState.COLLAPSED;
                }
            }
            if (shift === true && this.shift_state === ShiftState.COLLAPSED) {
                this.shift_state = ShiftState.MANIPULATE_START;
            }

            var prevNode = pos.node.prevLeaf();

            if (prevNode.hasValue) {
                var n: LeafNode = prevNode.value();
                pos = new DocumentPosition(n.hasIndex(pos.index) ? pos.index : n.maxIndex(), n);
            } else {
                pos = new DocumentPosition(0, pos.node);
            }

            this.finalize_shift(shift, pos);
        }

        selectLeft(shift: boolean) {
            var pos: DocumentPosition;
            if (this.selection.isCollapsed() === true) {
                this.shift_state = ShiftState.COLLAPSED;
            }

            if (this.shift_state === ShiftState.MANIPULATE_START || this.shift_state === ShiftState.COLLAPSED) {
                pos = this.selection.startPosition;
            } else {
                pos = this.selection.endPosition;
            }
            if (shift === false) {
                if (this.shift_state !== ShiftState.COLLAPSED) {
                    this.shift_state = ShiftState.COLLAPSED;
                }
                if (this.selection.isCollapsed() === false) {
                    this.selection = new TextRange(pos);
                    return;
                }
            }
            if (shift === true && this.shift_state === ShiftState.COLLAPSED) {
                this.shift_state = ShiftState.MANIPULATE_START;
            }

            var next: Maybe<DocumentPosition> = pos.getPrevious();
            if (next.hasValue) this.finalize_shift(shift, next.value());
        }

        applyChange(change: ReplaceArgs) {
            var range = change.selection;
            var node: LeafNode;
            var paragraph: Paragraph;
            if (range.startPosition.node.id.equals(range.endPosition.node.id)) {
                node = range.startPosition.node;
                if (node.type == ContentType.PARAGRAPH) {
                    paragraph = <Paragraph>node;
                    paragraph.replaceRange(range.startPosition.index, range.endPosition.index, change.text);

                    // TODO: not exactly accurate
                    var newPos = new DocumentPosition(range.startPosition.index + change.text.length, range.startPosition.node);
                    this.selection = new TextRange(newPos, newPos);

                } else {
                    throw new Error("Don't know how to do this for " + node.type.toString());
                }
            } else {
                throw Error("TODO: not yet implemented");
            }
            this.validate();
        }
    };

    class ContentSeries {
        contentNodes: IContentNode[] = [];
        root: RootDocument;

        constructor(root: RootDocument) {
            this.root = root;
        }
        getNode(index: number): Maybe<IContentNode> {
            var result = this.contentNodes[index];
            return result ? new Some(result) : None;
        }
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
        replaceRange(start: number, end: number, replace: string) {
            var removed_length = end - start;
            var inserted_length = replace.length;

            var startFormatIndex = this.findFormatIndex(start);
            var endFormatIndex = this.findFormatIndex(end);

            if (startFormatIndex === endFormatIndex) {
                if (startFormatIndex < this.formatting.length) {
                    this.formatting[startFormatIndex].length += inserted_length - removed_length;
                } else {
                    this.formatting[this.formatting.length - 1].length += inserted_length - removed_length;
                }
            } else {

                var startFormatCharCount = this.findFormatStart(startFormatIndex);
                var endFormatCharCount = this.findFormatStart(endFormatIndex);
                if (endFormatIndex < this.formatting.length) {
                    this.formatting[endFormatIndex].length -= end - endFormatCharCount;
                }
                this.formatting[startFormatIndex].length = (start - startFormatCharCount) + inserted_length;

                this.formatting.splice(startFormatIndex + 1, endFormatIndex - (startFormatIndex + 1));

            }

            this.text = this.text.replaceRange(start, end, replace);
            this.validate();

        }
        findFormatIndex(charIndex: number): number {
            var formatIndex: number = 0; /// index into format array
            var currentIndex: number = 0; /// index into paragraph

            for (; formatIndex < this.formatting.length; ++formatIndex) {
                if (currentIndex + this.formatting[formatIndex].length > charIndex) {
                    currentIndex = charIndex;
                    break;
                }
                currentIndex += this.formatting[formatIndex].length;
            }
            return formatIndex;
        }
        findFormatStart(formatIndex: number): number {
            return this.formatting.filter((fmt, idx) => {
                return idx < formatIndex;
            }).map((fmt) => {
                return fmt.length;
            }).reduce((l1, l2) => {
                return l1 + l2;
            }, 0);
        }
        findFormat(charIndex: number): Formatting {
            return this.formatting[this.findFormatIndex(charIndex)];
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
            super(new Some(parent), ContentType.TABLE);
        }
        validate() {
            this.forEach((node: IContentNode) => {
                console.assert(node.type === ContentType.TABLE_ROW);
            });
            super.validate();
        }
    };

    export class TableRow extends ContainingNode {
        constructor(parent: Table) {
            super(new Some(parent), ContentType.TABLE_ROW);
        }
        validate() {
            this.forEach((node: IContentNode) => {
                console.assert(node.type === ContentType.TABLE_CELL);
            });
            super.validate();
        }
    };

    export class TableCell extends ContainingNode {
        constructor(parent: TableRow) {
            super(new Some(parent), ContentType.TABLE_CELL);
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
        private _index: number;
        private _node: LeafNode;

        constructor(index: number, node: LeafNode) {
            this._index = index;
            this._node = node;
        }
        toString(): string {
            return "[" + this._node.id.toString() + ":" + this._index + "]";
        }
        getNext(): Maybe<DocumentPosition> {
            if (this._node.hasIndex(this._index + 1)) {
                return new Some(new DocumentPosition(this._index + 1, this._node));
            }
            return this._node.nextLeaf().map((n: LeafNode): DocumentPosition => {
                return new DocumentPosition(0, n);
            });

        }
        getPrevious(): Maybe<DocumentPosition> {
            if (this._node.hasIndex(this._index - 1)) {
                return new Some(new DocumentPosition(this._index - 1, this._node));
            }
            return this._node.prevLeaf().map((n: LeafNode): DocumentPosition => {
                return new DocumentPosition(n.maxIndex(), n);
            });
        }
        equals(other: DocumentPosition): boolean {
            return this._index === other._index && this._node.id.equals(other._node.id);
        }
        before(other: DocumentPosition): boolean {
            if (this._node.id.equals(other._node.id)) {
                return this._index < other._index;
            }
            var next: Maybe<LeafNode> = new Some<LeafNode>(this._node);
            while (next.hasValue) {
                if (next.value().id.equals(other._node.id)) {
                    return true;
                }
                next = next.value().nextLeaf();
            }
            return false;
        }
        get index(): number {
            return this._index;
        }
        get node(): LeafNode {
            return this._node;
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

    //#region RootDocument Interaction Manipulation
    export class ReplaceArgs {
        selection: TextRange;
        text: string;
        constructor(selection: TextRange, text: string) {
            this.selection = selection;
            this.text = text;
        }
    };

    export class FormatArgs {
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
                    var p = self.makePosition(range.startContainer, range.startOffset);
                    if (p.hasValue) {
                        self.doc.selection = new TextRange(p.value(), p.value());
                    }
                } else {
                    var range: Range = s.getRangeAt(0);
                    var p1 = self.makePosition(range.startContainer, range.startOffset);
                    var p2 = self.makePosition(range.endContainer, range.endOffset);
                    if (p1.hasValue && p2.hasValue) {
                        self.doc.selection = new TextRange(p1.value(), p2.value());
                    }
                }

                s.removeAllRanges();
                self.Update();
            });

            document.addEventListener("keypress", function (event) {
                var key: string;
                if (event.key) {
                    key = event.key;
                } else if (event.which) {
                    key = String.fromCharCode(event.which);
                } else {
                    console.error("Cannot read keys.");
                    return;
                }

                var change: ReplaceArgs = new ReplaceArgs(self.doc.selection, key);
                self.doc.applyChange(change);
                self.Update();
            });

            document.addEventListener("keydown", function (event) {
                var handled = true;

                switch (event.key || toKey(event.which)) {
                    case Keys.Right:
                        self.doc.selectRight(event.shiftKey);
                        break;
                    case Keys.Left:
                        self.doc.selectLeft(event.shiftKey);
                        break;
                    case Keys.Up:
                        self.doc.selectUp(event.shiftKey);
                        break;
                    case Keys.Down:
                        self.doc.selectDown(event.shiftKey);
                        break;
                    case Keys.Delete:
                        if (self.doc.selection.isCollapsed()) self.doc.selectRight(true);
                        var change: ReplaceArgs = new ReplaceArgs(self.doc.selection, "");
                        self.doc.applyChange(change);
                        break;
                    case Keys.Backspace:
                        if (self.doc.selection.isCollapsed()) self.doc.selectLeft(true);
                        var change: ReplaceArgs = new ReplaceArgs(self.doc.selection, "");
                        self.doc.applyChange(change);
                        break;
                    case Keys.Enter:
                        // TODO
                        break;
                    default: handled = false;
                }

                self.Update();
                if (handled) event.preventDefault();
            });
        }

        Update(): void {
            while (this.element.hasChildNodes()) {
                this.element.removeChild(this.element.lastChild);
            }
            if (this.doc.selection === null) {
                var firstLeaf = this.doc.firstLeaf().value();
                var begin = new DocumentPosition(0, firstLeaf);
                this.doc.selection = new TextRange(begin, begin);
            }
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
                var span: HTMLSpanElement = document.createElement("span");
                if (selected) {
                    span.className = "selected";
                }
                if (paragraph.getText() === "") {
                    span.innerHTML = "&nbsp;";
                }
                if (selected || paragraph.getText() === "") {
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

        private makePosition(_container: Node, _offset: number): Maybe<DocumentPosition> {

            var isSelectable = (node: Node): boolean => {
                return (node.nodeType === Node.ELEMENT_NODE)
                    && (<HTMLElement>node).id
                    && (<HTMLElement>node).className === "charSelectable";
            };

            var findSelectable = (node: Node): HTMLElement => {
                var current: Node = node;
                while (!isSelectable(current)) {
                    if (current.parentNode === null) return null;
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
            if (startElement === null) return None;

            var startGuid: Guid = new Guid(startElement.id);

            var startIndex: number = findIndex(_container, _offset, startElement);

            return new Some(new DocumentPosition(
                startIndex,
                <LeafNode>this.doc.get(startGuid)));

        }

    }

}
