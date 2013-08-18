//#region Common Enumerations
var ContentType = {
    PARAGRAPH: "PARAGRAPH",
    TABLE: "TABLE",
    IMAGE: "MAGE"
};

var EditAction = {
    REPLACE_RANGE: "REPLACE_RANGE",
    FORMAT: "FORMAT"
};
//#endregion

//#region Document Content Representation
var Document = function () {
    ///<summary>
    /// Representation of a jsEdit document
    ///</summary>
    this.contentSeries = new ContentSeries(this);
    this.contentStore = new ContentStore(this);
    this.selection = null;
};

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

    this.push = function(node) {
        /// <param name="node" type="ContentNode" />
        contentNodes.push(node);
        doc.contentStore.put(node);
    }
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

    var guid = s4() + s4() + '-' + s4() + '-' + s4()
        + '-' + s4() + '-' + s4() + s4() + s4();

    this.guid = guid;
    this.toString = function () { return guid; };
    this.valueOf = function () { return guid; }

    this.equals = function (other) {
        /// <param name="other" type="Guid"/>
        return (other) ? this.toString == other.toString : false;
    };
}

var ContentNode = function () {
    /// <summary>A general class describing a Content object</summary>
    /// <field name="id" type="Guid" />
    this.id = new Guid();
    /// <field name="type" />
    this.type = undefined;
}

var Paragraph = function () {
    ContentNode.call(this);

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

var Table = function () {
    ContentNode.call(this);

};
Table.prototype = Object.create(ContentNode.prototype);
Table.prototype.constructor = Table;

var TableRow = function () {
    ContentNode.call(this);

};
TableRow.prototype = Object.create(ContentNode.prototype);
TableRow.prototype.constructor = TableRow;

var TableCell = function () {
    ContentNode.call(this);

};
TableCell.prototype = Object.create(ContentNode.prototype);
TableCell.prototype.constructor = TableCell;

var Image = function () {
    ContentNode.call(this);

};
Image.prototype = Object.create(ContentNode.prototype);
Image.prototype.constructor = Image;

//#endregion

//#region Content Access
var ContentStore = function (doc) {
    /// <param name="doc" type="Document" />

    var contentNodes = {};
    var _doc = doc;
    this.get = function (guid) {
        /// <param name="guid" type="Guid" />
        /// <returns type="ContentNode">
        return contentNodes[guid];
    };
    this.put = function (node) {
        /// <param name="node" type="ContentNode" />
        contentNodes[node.id] = node;
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
    var _element = document.getElementById(id);
    var _html = "";
    var _doc = doc;

    this.Update = function() {
        _element.innerHTML = "";
        var iterator = _doc.contentSeries.getIterator();

        while (contentNode = iterator.nextNode() )
        {
            switch (contentNode.type) {
                case ContentType.PARAGRAPH:
                    _element.innerHTML += _generateParagraph(contentNode);
                    break;
                case ContentType.TABLE:
                    _element.innerHTML += _generateTable(contentNode);
                    break;
                case ContentType.IMAGE:
                    _element.innerHTML += _generateImage(contentNode);
                    break;
            }
        }

    };

    var _generateParagraph = function (paragraph) {
        return "<p>" + paragraph.getText() + "</p>";
    };

    var _generateTable = function (table) {
        return "";
    };

    var _generateImage = function (image) {
        return "";
    };
}
//#endregion