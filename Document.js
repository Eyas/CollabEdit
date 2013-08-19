//#region VSDOC References
/// <reference path="http://code.jquery.com/jquery-2.0.3.min.js" />
/// <reference path="http://cdn.jsdelivr.net/rangy/1.2.3/rangy-core.js" />
/// <reference path="http://cdn.jsdelivr.net/rangy/1.2.3/rangy-cssclassapplier.js" />
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

var selectionApplier;
//#endregion

//#region Document Content Representation
var ContentNode = function (parent) {
    /// <summary>A general class describing a Content object</summary>

    /// <field name="id" type="Guid" />
    this.id = new Guid();

    /// <field name="type" />
    this.type = undefined;

    /// <field name="parent" />
    this.parent = parent;

}

var Document = function () {
    ///<summary>
    /// Representation of a jsEdit document
    ///</summary>
    ContentNode.call(this, null);

    this.type = ContentType.DOCUMENT;
    this.contentSeries = new ContentSeries(this);
    this.contentStore = new ContentStore(this);
    this.selection = new TextRange(new DocumentPosition(0), new DocumentPosition(0));
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
    ContentNode.call(this, parent);

    var _text;

    this.type = ContentType.PARAGRAPH;
    this.formatting = [new Formatting()];

    this.setText = function (text) {
        ///<summary>
        ///change the paragraph text
        ///</summary>
        ///<param name="text"></param>
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
    }

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
    ContentNode.call(this, parent);

};
Table.prototype = Object.create(ContentNode.prototype);
Table.prototype.constructor = Table;

var TableRow = function (parent) {
    ContentNode.call(this, parent);

};
TableRow.prototype = Object.create(ContentNode.prototype);
TableRow.prototype.constructor = TableRow;

var TableCell = function (parent) {
    ContentNode.call(this, parent);

};
TableCell.prototype = Object.create(ContentNode.prototype);
TableCell.prototype.constructor = TableCell;

var Image = function (parent) {
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
var DocumentPosition = function (index, subposition) {
    /// <signature>
    /// <param name="index" type="Number"></param>
    /// <param name="subposition" type="DocumentPosition"></param>
    /// </signature>
    /// <signature>
    /// <param name="index" type="Number"></param>
    /// </signature>

    /// <field name="index" type="Number"/>
    this.index = index;

    /// <field name="subposition" type="DocumentPosition"/>
    this.subposition = null;
    if (subposition) this.subposition = subposition;

    this.equals = function (other) {
        /// <summary>returns whether this DocumentPosition is equal to other</summary>
        /// <param name="other" type="DocumentPosition"/>
        if (other === undefined || other === null) return false;

        if (this.index != other.index)
            return false;

        if (this.subposition) {
            if (!other.subposition)
                return false;
            return this.subposition.equals(other.subposition);
        } else {
            return (!other.subposition);
        }
    };

    this.toString = function () {
        var text = index.toString();
        if (this.subposition)
            text += ">" + this.subposition.toString();
        return text;
    };

};

var TextRange = function (startPosition, endPosition) {
    /// <summary>Class representing a range of text and elements within a document</summary>
    /// <param name="startPosition" type="DocumentPosition" />
    /// <param name="endPosition" type="DocumentPosition" />

    /// <field name="startPosition" type="DocumentPosition" />
    this.startPosition = startPosition;

    /// <field name="endPosition" type="DocumentPosition" />
    this.endPosition = endPosition;

    this.isCollapsed = function () {
        /// <summary>Returns whether the current TextRange is collapsed</summary>
        /// <returns type="Boolean"></returns>
        return this.startPosition.equals(endPosition);
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

    _element.on("mouseup", function () {

        var s = window.getSelection();
        if (s.isCollapsed) {
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

    });

    this.Update = function() {
        _element.empty();
        var iterator = _doc.contentSeries.getIterator();

        while (contentNode = iterator.nextNode() )
        {
            switch (contentNode.type) {
                case ContentType.PARAGRAPH:
                    _element.append(_generateParagraph(contentNode))
                    break;
                case ContentType.TABLE:
                    _element.append(_generateTable(contentNode))
                    break;
                case ContentType.IMAGE:
                    _element.append(_generateImage(contentNode))
                    break;
            }
        }

    };

    var _generateParagraph = function (paragraph) {
        /// <param name="paragraph" type="Paragraph">
        var p = $('<p>');
        p.attr("id", paragraph.id.valueOf()).html(paragraph.getText());
        return p[0];
    };

    var _generateTable = function (table) {
        return document.createElement("table");
    };

    var _generateImage = function (image) {
        return document.createElement("img");
    };

    function getPos(marker, end) {

        // Calculate start positon
        var parent = marker.closest("*[id]");
        var nodeId = new Guid(parent.attr("id"));
        var search = [];
        var num = 0;

        for (i = 0; i < parent[0].childNodes.length; i++) {
            var node = parent[0].childNodes[i];
            if (node.nodeType == Node.TEXT_NODE) {
                num += node.length;
            } else { break; }
        }
        if (end)
            num += marker.text().length;

        var start = new DocumentPosition(num, start);

        var node;
        do {
            node = _doc.contentStore.get(nodeId);
            search.push(nodeId);
        }
        while (node.parent && (nodeId = new Guid(node.parent)));

        console.assert(_doc.id.equals(search.pop()), "Document ID mismatch");

        var contentSeries = _doc.contentSeries;
        var next;
        while (next = search.pop()) {
            num = contentSeries.indexOf(next);
            start = new DocumentPosition(num, start);
        }

        return start;
    }
}
//#endregion

//#region Initialization...
$(document).ready(function () {
    rangy.init();
    selectionApplier = rangy.createCssClassApplier("snew");
});
//#endregion
