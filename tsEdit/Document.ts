//#region VSDOC References
/// <reference path="./Scripts/typings/jquery/jquery.d.ts" />
/// TODO: rangy-core
/// TODO: rangy-cssclassapplier
//#endregion

//#region Globals and Enums
var ContentType = {
    DOCUMENT: "DOCUMENT",
    PARAGRAPH: "PARAGRAPH",
    TABLE: "TABLE",
    IMAGE: "MAGE"
};

var EditAction = {
    REPLACE_RANGE: "REPLACE_RANGE",
    FORMAT: "FORMAT"
};

var KeyboardKeys = {
    Left: 37,
    Up: 38,
    Right: 39,
    Down: 40,
    Backspace: 8,
}

var selectionApplier;
//#endregion

//#region Document Content Representation
var ContentNode = function (parent) {
    /// <summary>A general class describing a Content object</summary>
    // <param name="parent" type="ContentNode" />

    /// <field name="id" type="Guid" />
    this.id = new Guid();

    /// <field name="type" />
    this.type = undefined;

    /// <field name="parent" type="ContentNode" />
    this.parent = parent;

    /// <field name="contentSeries" type="ContentSeries" />
    this.contentSeries = undefined;

    this.getAtIndex = function (index) {
        ///<param name="index" type="Number"/>
        ///<returns type="ContentNode"/>
        throw "NotImplementedException: ContentNode.getAtIndex";
    };

    this.hasIndex = function (index) {
        ///<param name="index" type="Number"/>
        ///<returns type="Boolean"/>
        throw "NotImplementedException: ContentNode.hasIndex";
    };

    this.maxIndex = function () {
        ///<returns type="Number"/>
        throw "NotImplementedException: ContentNode.hasIndex";
    };

}

var Document = function () {
    ///<summary>
    /// Representation of a jsEdit document
    ///</summary>
    ContentNode.call(this, null);

    this.type = ContentType.DOCUMENT;
    this.contentSeries = new ContentSeries(this);
    this.contentStore = new ContentStore(this);
    this.selection = new TextRange(new DocumentPosition(0, new DocumentPosition(0)), new DocumentPosition(0, new DocumentPosition(0)));

    // private state:
    var shift_state = "";

    this.getAtIndex = function (index) {
        ///<param name="index" type="Number"/>
        ///<returns type="ContentNode"/>
        return this.contentSeries.getNode(index);
    };

    this.hasIndex = function (index) {
        ///<param name="index" type="Number"/>
        ///<returns type="Boolean"/>
        return this.contentSeries.hasIndex(index);
    };

    this.maxIndex = function () {
        ///<returns type="Number"/>
        return this.contentSeries.maxIndex();
    };

    this.locate = function (position) {
        ///<summary>returns the ContentNode that contains the given position</summary>
        ///<param name="position" type="DocumentPosition"/>
        ///<returns type="ContentNode"/>
        var indices = position.getDomTraversal();
        var current = this;
        var index;
        while ((index = indices.pop()) !== undefined) {
            current = current.getAtIndex(index);

            if (current === null || current === undefined)
                return undefined;
        }
        return current;
    };

    var finalize_shift = function (shift, pos) {
        if (shift) {
            var l = this.selection.startPosition;
            var r = this.selection.endPosition;
            switch (shift_state) {
                case "l": l = pos; break;
                case "r": r = pos; break;
                default: throw "Unexpected shift_state " + shift_state;
            }
            this.selection = new TextRange(l, r);

        } else {
            this.selection = new TextRange(pos);
        }
    };

    this.selectRight = function (shift) {
        var pos;

        if (this.selection.isCollapsed() === true) {
            shift_state = "";
        }
        if (shift_state === "l") {
            pos = this.selection.startPosition;
        } else {
            pos = this.selection.endPosition;
        }
        if (shift === false) {
            if (shift_state !== "") {
                shift_state = "";
            }
            if (this.selection.isCollapsed() === false) {
                this.selection = new TextRange(pos);
                return;
            }
        }
        if (shift === true && shift_state === "") {
            shift_state = "r";
        }

        var node = this.locate(pos);
        if (node.hasIndex(pos.index + 1)) {
            pos = pos.getNext();
        } else {
            pos = pos.getParent().getNext().getChild();
            if (this.locate(pos) === undefined)
                return;
        }
        finalize_shift.call(this, shift, pos);
    };

    this.selectDown = function (shift) {
        var pos;

        if (this.selection.isCollapsed() === true) {
            shift_state = "";
        }
        if (shift_state === "l") {
            pos = this.selection.startPosition;
        } else {
            pos = this.selection.endPosition;
        }
        if (shift === false) {
            if (shift_state !== "") {
                shift_state = "";
            }
            if (this.selection.isCollapsed() === false) {
                this.selection = new TextRange(pos);
                return;
            }
        }
        if (shift === true && shift_state === "") {
            shift_state = "r";
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
        finalize_shift.call(this, shift, pos);
    };

    this.selectUp = function (shift) {
        var pos;
        if (this.selection.isCollapsed() === true) {
            shift_state = "";
        }

        if (shift_state === "l" || shift_state === "") {
            pos = this.selection.startPosition;
        } else {
            pos = this.selection.endPosition;
        }
        if (shift === false) {
            if (shift_state !== "") {
                shift_state = "";
            }
        }
        if (shift === true && shift_state === "") {
            shift_state = "l";
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

        finalize_shift.call(this, shift, pos);
    };

    this.selectLeft = function (shift) {
        var pos;
        if (this.selection.isCollapsed() === true) {
            shift_state = "";
        }

        if (shift_state === "l" || shift_state === "") {
            pos = this.selection.startPosition;
        } else {
            pos = this.selection.endPosition;
        }
        if (shift === false) {
            if (shift_state !== "") {
                shift_state = "";
            }
            if (this.selection.isCollapsed() === false) {
                this.selection = new TextRange(pos);
                return;
            }
        }
        if (shift === true && shift_state === "") {
            shift_state = "l";
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

        finalize_shift.call(this, shift, pos);
    };


};
Document.prototype = Object.create(ContentNode.prototype);
Document.prototype.constructor = Document;

var ContentSeries = function (doc) {
    /// <param name="doc" type="Document" />

    var contentNodes = [];
    var _doc = doc;

    this.getNode = function (index) {
        /// <summary>Returns the ContentNode at a given position</summary>
        /// <param name="index" type="Number" />
        /// <returns type="ContentNode" />
        return contentNodes[index];
    };

    this.hasIndex = function (index) {
        ///<param name="index" type="Number"/>
        ///<returns type="Boolean"/>
        return (contentNodes[index]) ? true : false;
    };

    this.maxIndex = function () {
        ///<returns type="Number"/>
        return contentNodes.length - 1;
    };

    this.getIterator = function() {
        /// <returns type="ContentIterator"/>
        return new ContentIterator(contentNodes.slice(0));
    };

    this.push = function (node) {
        /// <param name="node" type="ContentNode" />
        contentNodes.push(node);
        doc.contentStore.put(node);
    };

    this.indexOf = function (guid) {
        ///<param name="guid" type="Guid" />
        ///<returns type="Number"/>
        var i = -1;
        contentNodes.forEach(function (node, index) {
            if (node.id.equals(guid))
                i = index;
        });
        console.assert(i != -1, "Element not found");
        return i;
    };
};

var Guid = function (guidString) {
    /// <signature>
    /// <summary>Generates a new GUID</summary>
    /// </signature>
    /// <signature>
    /// <summary>Creates a new GUID from a given string</summary>
    /// <param name="guidString" type="String">formatted GUID string</param>
    /// </signature>
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
                   .toString(16)
                   .substring(1);
    };

    var guid = (guidString) ? guidString : s4() + s4() + '-' + s4() + '-' + s4()
        + '-' + s4() + '-' + s4() + s4() + s4();

    this.guid = guid;
    this.toString = function () { return guid; };
    this.valueOf = function () { return guid; }

    this.equals = function (other) {
        /// <param name="other" type="Guid"/>
        return (other) ? this.toString() == other.toString() : false;
    };
}

var Paragraph = function (parent) {
    /// <param name="parent" type="ContentNode"/>
    ContentNode.call(this, parent);

    var _text;

    this.type = ContentType.PARAGRAPH;
    this.formatting = [new Formatting()];

    this.setText = function (text) {
        ///<summary>
        ///change the paragraph text
        ///</summary>
        ///<param name="text" type="String"></param>
        _text = text;
    };

    this.getText = function () {
        ///<returns type="string">text</returns>
        return _text;
    };

    this.validate = function () {
        var expectedLength = _text.length;
        var actualLength = 0;
        this.formatting.forEach(function (fmt) {
            actualLength += fmt.length;
        });

        if (actualLength !== expectedLength) {
            alert("Expected Paragraph Length is " + expectedLength + " actual: " + actualLength);
        }
    };

    this.getAtIndex = function (index) {
        return this;
    };

    this.hasIndex = function (index) {
        ///<param name="index" type="Number"/>
        ///<returns type="Boolean"/>
        return (index >= 0 && index <= _text.length)
    };

    this.maxIndex = function () {
        return _text.length;
    };

};
Paragraph.prototype = Object.create(ContentNode.prototype);
Paragraph.prototype.constructor = Paragraph;

var Formatting = function () {
    this.bold = false;
    this.italic = false;
    this.underline = false;
    this.size = "1.0em";
    this.color = "black";
    this.highlight = "transparent";
    this.pos = "normal"; // sub, sup, normal
    this.length = 0;

    this.copy = function () {
        ///<summary>
        ///copies the current formatting object and all its
        ///properties (except for length) to a new object
        ///</summary>
        ///<returns type="Formatting">the copy formatting object</returns>
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

var Table = function (parent) {
    /// <param name="parent" type="ContentNode"/>
    ContentNode.call(this, parent);

};
Table.prototype = Object.create(ContentNode.prototype);
Table.prototype.constructor = Table;

var TableRow = function (parent) {
    /// <param name="parent" type="ContentNode"/>
    ContentNode.call(this, parent);

};
TableRow.prototype = Object.create(ContentNode.prototype);
TableRow.prototype.constructor = TableRow;

var TableCell = function (parent) {
    /// <param name="parent" type="ContentNode"/>
    ContentNode.call(this, parent);

};
TableCell.prototype = Object.create(ContentNode.prototype);
TableCell.prototype.constructor = TableCell;

var Image = function (parent) {
    /// <param name="parent" type="ContentNode"/>
    ContentNode.call(this, parent);

};
Image.prototype = Object.create(ContentNode.prototype);
Image.prototype.constructor = Image;

//#endregion

//#region Content Access
var ContentStore = function (doc) {
    /// <param name="doc" type="Document" />

    var contentNodes = {};
    var _doc = doc;
    contentNodes[doc.id.toString()] = doc;

    this.get = function (guid) {
        /// <param name="guid" type="Guid" />
        /// <returns type="ContentNode">
        return contentNodes[guid.toString()];
    };
    this.put = function (node) {
        /// <param name="node" type="ContentNode" />
        contentNodes[node.id.toString()] = node;
    };

};

var ContentIterator = function (array) {
    var _array = array;
    var _index = 0;
    this.nextNode = function () {
        /// <returns type="ContentNode" />
        return _array[_index++];
    };
};
//#endregion

//#region Document Interaction Representation
var DocumentPosition = function (index, parent) {
    /// <signature>
    /// <param name="index" type="Number"></param>
    /// <param name="parent" type="DocumentPosition"></param>
    /// </signature>
    /// <signature>
    /// <param name="index" type="Number"></param>
    /// </signature>

    /// <field name="index" type="Number"/>
    this.index = index;

    /// <field name="parent" type="DocumentPosition"/>
    this.parent = null;
    if (parent) this.parent = parent;

    this.equals = function (other) {
        /// <summary>returns whether this DocumentPosition is equal to other</summary>
        /// <param name="other" type="DocumentPosition"/>
        if (other === undefined || other === null) return false;

        if (this.index != other.index)
            return false;

        if (this.parent) {
            if (!other.parent)
                return false;
            return this.parent.equals(other.parent);
        } else {
            return (!other.parent);
        }
    };

    this.toString = function () {
        ///<returns type="String"/>
        var text = index.pad(7);
        if (this.parent)
            text = this.parent.toString() + ">" + text;
        return text;
    };

    this.hasParent = function () {
        ///<returns type="Boolean"/>
        return (this.parent !== undefined) ? true : false;
    };

    this.getParent = function () {
        console.assert(this.hasParent(), "Calling getParent on top level element");
        return this.parent;
    };

    this.getNext = function () {
        return new DocumentPosition(this.index + 1, this.parent);
    };

    this.getPrevious = function () {
        return new DocumentPosition(this.index - 1, this.parent);
    };

    this.getChild = function () {
        return new DocumentPosition(0, this);
    };

    this.getDomTraversal = function () {
        ///<remarks>access from parent-to-child through pop</remarks>
        ///<returns type="Array"/>
        var order = [];
        var at = this;
        do {
            order.push(at.index);
        } while (at = at.parent);
        return order;
    }
};

var TextRange = function (startPosition, endPosition) {
    /// <signature>
    /// <summary>Class representing a range of text and elements within a document</summary>
    /// <param name="startPosition" type="DocumentPosition" />
    /// <param name="endPosition" type="DocumentPosition" />
    /// </signature>
    /// <signature>
    /// <summary>Class representing a range of text and elements within a document</summary>
    /// <param name="startPosition" type="DocumentPosition" />
    /// </signature>

    /// <field name="startPosition" type="DocumentPosition" />
    this.startPosition = startPosition;

    /// <field name="endPosition" type="DocumentPosition" />
    this.endPosition = (endPosition) ? endPosition : startPosition;

    this.isCollapsed = function () {
        /// <summary>Returns whether the current TextRange is collapsed</summary>
        /// <returns type="Boolean"></returns>
        return this.startPosition.equals(this.endPosition);
    };
};
//#endregion

//#region Document Interaction Manipulation
var ReplaceArgs = function (selection, text) {
    /// <param name="selection" type="TextRange" />
    /// <param name="text" type="String" />

    // <field name="selection" type="TextRange" />
    this.selection = selection;

    // <field name="text" type="String" />
    this.text = text;
};

var FormatArgs = function (selection, formatting) {
    /// <param name="selection" type="TextRange" />
    /// <param name="formatting" type="Formatting" />

    /// <field name="selection" type="TextRange" />
    this.selection = selection;

    /// <field name="formatting" type="Formatting" />
    this.formatting = formatting;
}
//#endregion

//#region Document Display
var Display = function (id, doc) {
    /// <param name="id" type="String" />
    /// <param name="doc" type="Document" />
    var _element = $("#" + id);
    var _html = "";
    var _doc = doc;
    var _self = this;

    _element.on("mouseup", function () {

        var s = window.getSelection();
        if (s.isCollapsed ) {
            var range = s.getRangeAt(0);
            var container = range.startContainer;
            var parent = container.parentNode;

            if (container.nodeType != Node.TEXT_NODE) {
                parent = container;
                container = container.childNodes[1];
            }

            var replacement = container.splitText(range.startOffset);
            var selector = $("<span>").addClass("snew")[0];
            parent.insertBefore(selector, replacement);

        } else {
            selectionApplier.applyToSelection();
        }

        $(".selected").contents().unwrap();
        $(".selected").remove();
        $(".snew").removeClass("snew").addClass("selected");

        s.empty();

        var selFirst = $(".selected").first();
        var selLast = $(".selected").last();

        var p1 = getPos(selFirst, false);
        var p2 = getPos(selLast, true);

        _doc.selection = new TextRange(p1, p2);
        _self.Update();
    });

    $(document).keydown(function (event) {
        switch (event.which)
        {
            case KeyboardKeys.Right:
                _doc.selectRight(event.shiftKey);
                break;
            case KeyboardKeys.Left:
                _doc.selectLeft(event.shiftKey);
                break;
            case KeyboardKeys.Up:
                _doc.selectUp(event.shiftKey);
                break;
            case KeyboardKeys.Down:
                _doc.selectDown(event.shiftKey);
                break;
        }

        _self.Update();
        event.preventDefault();
    });

    var UpdateState = function () {
        this.currentPosition = new DocumentPosition(0);
        this.selectionOngoing = false;
    };

    this.Update = function() {
        _element.empty();
        var iterator = _doc.contentSeries.getIterator();

        var state = new UpdateState();
        while ( (contentNode = iterator.nextNode()) !== undefined )
        {
            switch (contentNode.type) {
                case ContentType.PARAGRAPH:
                    _element.append(_generateParagraph(contentNode, state))
                    break;
                case ContentType.TABLE:
                    _element.append(_generateTable(contentNode, state))
                    break;
                case ContentType.IMAGE:
                    _element.append(_generateImage(contentNode, state))
                    break;
            }
            state.currentPosition = state.currentPosition.getNext();
        }

    };

    var _generateParagraph = function (paragraph, state) {
        /// <param name="paragraph" type="Paragraph"/>
        /// <param name="state" type="UpdateState"/>
        var p = $('<p>');
        p.addClass("charSelectable");
        p.attr("id", paragraph.id.valueOf());
        var text = paragraph.getText();
        var html = "";
        var i = 0;

        if (state.currentPosition.equals(_doc.selection.startPosition.getParent())) {
            html += text.substring(0, _doc.selection.startPosition.index);
            state.selectionOngoing = true;
            i = _doc.selection.startPosition.index;
        }

        if (state.selectionOngoing) {
            html += "<span class='selected'>";
        }

        if (state.currentPosition.equals(_doc.selection.endPosition.getParent())) {
            html += text.substring(i, _doc.selection.endPosition.index);
            html += "</span>";
            state.selectionOngoing = false;
            i = _doc.selection.endPosition.index;
        }

        html += text.substring(i);

        if (state.selectionOngoing) html += "</span>";
        p.html(html);

        return p[0];
    };

    var _generateTable = function (table, currentPosition) {
        return document.createElement("table");
    };

    var _generateImage = function (image, currentPosition) {
        return document.createElement("img");
    };

    function getPos(marker, end) {

        // Calculate start positon
        var parent = marker.closest(".charSelectable[id]");
        var nodeId = new Guid(parent.attr("id"));
        var search = [];
        var num = 0;

        for (i = 0; i < parent[0].childNodes.length; i++) {
            var node = parent[0].childNodes[i];
            if (node.nodeType == Node.TEXT_NODE) {
                num += node.length;
            } else {
                if (node.isSameNode(marker[0]))
                    break;

                num += node.innerText.length;
            }
        }
        if (end)
            num += marker.text().length;

        var position = new DocumentPosition(num);
        var start = position;

        var node;
        do {
            node = _doc.contentStore.get(nodeId);
            search.push(nodeId);
        }
        while (node.parent && (nodeId = node.parent.id));

        console.assert(_doc.id.equals(search.pop()), "Document ID mismatch");

        var contentSeries = _doc.contentSeries;
        var next;
        while (next = search.pop()) {
            num = contentSeries.indexOf(next);
            start.parent = new DocumentPosition(num);
            start = start.parent;
        }

        return position;
    }
}
//#endregion

//#region Initialization...
$(document).ready(function () {
    rangy.init();
    selectionApplier = rangy.createCssClassApplier("snew");
});

Number.prototype.pad = function(size) { return ('000000000' + this.toString()).substr(-size); };
//#endregion
