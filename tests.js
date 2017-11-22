#!/usr/bin/env node
var assert = require('assert');
require('./emerj.js');

// Set up some test dummies and utils:

function deepEqual(obj1, obj2) {
    try {
        assert.deepEqual(obj1, obj2);
        return true;
    } catch (err) {
        return false;
    }
}

function inherit(proto, fields) {
    var object = Object.create(proto);
    if (!fields) return object;
    for (var k in fields) {
        object[k] = fields[k];
    }
    return object;
}

Attribute = {
    name: null,
    value: null
}

Node = {
    ELEMENT_NODE: 1,
    TEXT_NODE: 3,
    textContent: null,
    tagName: null,
    childNodes: null,
    nodeType: null,
    attributes: null,
    firstChild: null,
    lastChild: null,
    parentNode: null,
    init: function() {
        this.childNodes = [];
        this.attributes = [];
        return this;
    },
    isEqualNode: function(other) {
        if (this.tagName != other.tagName) return false;
        if (this.textContent != other.textContent) return false;
        if (this.nodeType != other.nodeType) return false;
        if (!deepEqual(this.attributes, other.attributes)) return false;
        if (this.childNodes.length != other.childNodes.length) return false;
        for (var i=0; i < this.childNodes.length; i++) {
            if (!this.childNodes[i].isEqualNode(other.childNodes[i])) return false;
        }
        return true;
    },
    reassignParent: function(parent) {
        if (this.parentNode) this.parentNode.removeChild(this);
        this.parentNode = parent;
    },
    setFirstAndLast: function() {
        this.firstChild = this.childNodes[0] || null;
        this.lastChild = this.childNodes[this.childNodes.length-1] || null;
    },
    appendChild: function(node) {
        node.reassignParent(this);
        this.childNodes.push(node);
        this.setFirstAndLast();
    },
    replaceChild: function(newNode, existing) {
        newNode.reassignParent(this);
        var index = this.childNodes.indexOf(existing);
        this.childNodes[index] = newNode;
        this.setFirstAndLast();
    },
    insertBefore: function(newNode, before) {
        newNode.reassignParent(this);
        this.childNodes.splice(this.childNodes.indexOf(before), 0, newNode);
        this.setFirstAndLast();
        return newNode;
    },
    removeChild: function(node) {
        this.childNodes.splice(this.childNodes.indexOf(node), 1);
        node.parentNode = null;
        this.setFirstAndLast();
        return node;
    },
    getAttributeNode: function(attr) {
        for (var i=0; i < this.attributes.length; i++) {
            if (this.attributes[i].name == attr) return this.attributes[i];
        }
    },
    getAttribute: function(attr) {
        var attrNode = this.getAttributeNode(attr);
        return attrNode? attrNode.value: null;
    },
    setAttribute: function(attr, value) {
        value = value.toString();
        var attrNode = this.getAttributeNode(attr);
        if (!attrNode) {
            attrNode = inherit(Attribute, {name: attr, value: value});
            this.attributes.push(attrNode);
        }
        attrNode.value = value;
        if (attr == 'id') this.id = value;
    },
    removeAttribute: function(attr) {
        var attrNode = this.getAttributeNode(attr);
        if (!attrNode) return;
        this.attributes.splice(this.attributes.indexOf(attrNode), 1);
    },
    toHtml: function() {
        if (this.textContent) return this.textContent;
        var attrs = this.attributes.map(function(a) { return a.name+'="'+a.value+'"'; }).join(' ');
        var children = this.childNodes.map(function(c) { return c.toHtml(); }).join('');
        return '<'+this.tagName+(attrs? (' '+attrs): '')+'>'+children+'</'+this.tagName+'>';
    },
    toString: function() {
        return this.toHtml();
    },
};
document = {
    createElement: function(tagName) {
        var element = inherit(Node, {tagName: tagName}).init();
        return element;
    },
}

function el(tagName, attrs, content) {
    /* Shorthand for create DOMs. */
    var elem = document.createElement(tagName);
    if (typeof content == 'string') {
        var textNode = document.createElement();
        textNode.textContent = content;
        textNode.nodeType = Node.TEXT_NODE;
        elem.appendChild(textNode);
    } else if (content instanceof Array) {
        content.map(function(c) { elem.appendChild(c); })
    } else if (content) {
        elem.appendChild(content);
    }
    if (attrs) {
        for (var k in attrs) {
            elem.setAttribute(k, attrs[k]);
        }
    }
    return elem;
}

/* === Do the actual tests: === */

// Test create from scratch:
var vdom = el('body', {},
    el('ul', {}, [el('li', {}, "Item 1")])
)
var body = document.body = el('body');
emerj.merge(body, vdom);
assert(body.isEqualNode(el('body', {},
    el('ul', {}, [el('li', {}, "Item 1")])
)), "Document body created successfully");


// Test that merging identical content does not change element identity:
vdom = el('body', {},
    el('ul', {}, [el('li', {}, "Item 1")])
);
emerj.merge(body, vdom);

// Test adding a list item inserts new node, but does not change identity of others:
var parent = body.childNodes[0], items = body.childNodes[0].childNodes;
var orig = [items[0]];
vdom = el('body', {},
    el('ul', {}, [el('li', {}, "Item 1"), el('li', {}, "Item 2")])
);
emerj.merge(body, vdom);
items = body.childNodes[0].childNodes;
assert(body.childNodes[0] == parent, "Parent retains identity");
assert(items.length == 2, "Two items in list");
assert(items[0] == orig[0], "First item retains identity");
assert(items[0].isEqualNode(el('li', {}, "Item 1")), "First item is unchanged");
assert(items[1].isEqualNode(el('li', {}, "Item 2")), "Second child is what we expected");


// Test adding list item at start:
// First add IDs:
vdom = el('body', {},
    el('ul', {}, [el('li', {id: 1}, "Item 1"), el('li', {id: 2}, "Item 2")])
);
emerj.merge(body, vdom);

var parent = body.childNodes[0], items = body.childNodes[0].childNodes;
var orig = [items[0], items[1]];
vdom = el('body', {},
    el('ul', {}, [el('li', {id: 0}, "Item 0"), el('li', {id: 1}, "Item 1"), el('li', {id: 2}, "Item 2")])
);
emerj.merge(body, vdom);
items = body.childNodes[0].childNodes;
assert(items.length == 3, "Three items in list");
assert(body.childNodes[0] == parent, "Parent retains identity");
assert(orig[0] == items[1] && orig[1] == items[2], "Original two items retain identity");
assert(items[1].isEqualNode(el('li', {id: 1}, "Item 1")), "Original first item is unchanged");
assert(items[2].isEqualNode(el('li', {id: 2}, "Item 2")), "Original second item is unchanged");
assert(items[0].isEqualNode(el('li', {id: 0}, "Item 0")), "New first item is what we expected");


// Test adding list item in middle:
var parent = body.childNodes[0], items = body.childNodes[0].childNodes;
var orig = [items[0], items[1], items[2]];
vdom = el('body', {},
    el('ul', {}, [el('li', {id: 0}, "Item 0"), el('li', {id: 1}, "Item 1"), el('li', {id: '1b'}, "Item 1b"), el('li', {id: 2}, "Item 2")])
);
emerj.merge(body, vdom);
items = body.childNodes[0].childNodes;
assert(items.length == 4, "Four items in list");
assert(body.childNodes[0] == parent, "Parent retains identity");
assert(items[0] == orig[0] && items[1] == orig[1], "Preceding items retain identity");
assert(items[2] != orig[2], "New item has new identity");
assert(items[3] == orig[2], "Original third item retains identity");
assert(items[0].isEqualNode(el('li', {id: 0}, "Item 0")), "Original first item is unchanged");
assert(items[1].isEqualNode(el('li', {id: 1}, "Item 1")), "Original second item is unchanged");
assert(items[2].isEqualNode(el('li', {id: '1b'}, "Item 1b")), "New item is what we expected");
assert(items[3].isEqualNode(el('li', {id: 2}, "Item 2")), "Original third item is unchanged");


// Test adding list item at end:
var parent = body.childNodes[0], items = body.childNodes[0].childNodes;
var orig = [items[0], items[1], items[2], items[3]];
vdom = el('body', {},
    el('ul', {}, [el('li', {id: 0}, "Item 0"), el('li', {id: 1}, "Item 1"), el('li', {id: '1b'}, "Item 1b"), el('li', {id: 2}, "Item 2"), el('li', {id: 3}, "Item 3")])
);
emerj.merge(body, vdom);
items = body.childNodes[0].childNodes;
assert(items.length == 5, "Five items in list");
assert(body.childNodes[0] == parent, "Parent retains identity");
assert(items[0] == orig[0] && items[1] == orig[1] && items[2] == orig[2] && items[3] == orig[3],
       "Preceding items retain identity");
assert(items[0].isEqualNode(el('li', {id: 0}, "Item 0")), "Original first item is unchanged");
assert(items[1].isEqualNode(el('li', {id: 1}, "Item 1")), "Original second item is unchanged");
assert(items[2].isEqualNode(el('li', {id: '1b'}, "Item 1b")), "Original third item is unchanged");
assert(items[3].isEqualNode(el('li', {id: 2}, "Item 2")), "Original fourth item is unchanged");
assert(items[4].isEqualNode(el('li', {id: 3}, "Item 3")), "New item is what we expected");


// Test changing order of list items:
var parent = body.childNodes[0], items = body.childNodes[0].childNodes;
var orig = [items[0], items[1], items[2], items[3], items[4]];
vdom = el('body', {},
    el('ul', {}, [el('li', {id: 3}, "Item 3"), el('li', {id: 2}, "Item 2"), el('li', {id: '1b'}, "Item 1b"),  el('li', {id: 1}, "Item 1"), el('li', {id: 0}, "Item 0")])
);
emerj.merge(body, vdom);
items = body.childNodes[0].childNodes;
assert(items.length == 5, "Five items in list");
assert(body.childNodes[0] == parent, "Parent retains identity");
assert(items[0] == orig[4] && items[1] == orig[3] && items[2] == orig[2] && items[3] == orig[1] && items[4] == orig[0],
       "Original items retain identity");

assert(items[0].isEqualNode(el('li', {id: 3}, "Item 3")) &&
       items[1].isEqualNode(el('li', {id: 2}, "Item 2")) &&
       items[2].isEqualNode(el('li', {id: '1b'}, "Item 1b")) &&
       items[3].isEqualNode(el('li', {id: 1}, "Item 1")) &&
       items[4].isEqualNode(el('li', {id: 0}, "Item 0")), "Actual content of items is reversed");


// Test removing first couple list items:
var parent = body.childNodes[0], items = body.childNodes[0].childNodes;
var orig = [items[0], items[1], items[2], items[3], items[4]];
vdom = el('body', {},
    el('ul', {}, [el('li', {id: '1b'}, "Item 1b"),  el('li', {id: 1}, "Item 1"), el('li', {id: 0}, "Item 0")])
);
emerj.merge(body, vdom);
items = body.childNodes[0].childNodes;
assert(items.length == 3, "Three items in list");
assert(body.childNodes[0] == parent, "Parent retains identity");
assert(items[0] == orig[2] && items[1] == orig[3] && items[2] == orig[4], "Remaining items retain identity");
assert(items[0].isEqualNode(el('li', {id: '1b'}, "Item 1b")) &&
       items[1].isEqualNode(el('li', {id: 1}, "Item 1")) &&
       items[2].isEqualNode(el('li', {id: 0}, "Item 0")), "Correct content remains");


// Test removing final list item:
var parent = body.childNodes[0], items = body.childNodes[0].childNodes;
var orig = [items[0], items[1], items[2]];
vdom = el('body', {},
    el('ul', {}, [el('li', {id: '1b'}, "Item 1b"),  el('li', {id: 1}, "Item 1")])
);
emerj.merge(body, vdom);
items = body.childNodes[0].childNodes;
assert(items.length == 2, "Two items in list");
assert(body.childNodes[0] == parent, "Parent retains identity");
assert(items[0] == orig[0] && items[1] == orig[1], "Remaining items retain identity");
assert(items[0].isEqualNode(el('li', {id: '1b'}, "Item 1b")) &&
       items[1].isEqualNode(el('li', {id: 1}, "Item 1")), "Correct content remains");


// Test changing attributes updates element without changing identity:
var parent = body.childNodes[0], items = body.childNodes[0].childNodes;
var orig = [items[0], items[1], items[2]];
vdom = el('body', {},
    el('ul', {attr: 'test'}, [el('li', {id: '1b'}, "Item 1b"),  el('li', {id: 1}, "Item 1")])
);
emerj.merge(body, vdom);
items = body.childNodes[0].childNodes;
assert(items.length == 2, "Two items in list");
assert(body.childNodes[0] == parent, "Parent retains identity");
assert(!body.childNodes[0].isEqualNode(el('ul', {}, [el('li', {id: '1b'}, "Item 1b"),  el('li', {id: 1}, "Item 1")])),
       "Parent is changed");
assert(body.childNodes[0].getAttribute('attr') == 'test', "Parent has expected attributes");
assert(items[0] == orig[0] && items[1] == orig[1], "List items retain identity");
assert(items[0].isEqualNode(el('li', {id: '1b'}, "Item 1b")) &&
       items[1].isEqualNode(el('li', {id: '1'}, "Item 1")), "Correct list content remains");


// Test removing an attribute:
var parent = body.childNodes[0], items = body.childNodes[0].childNodes;
var orig = [items[0], items[1], items[2]];
vdom = el('body', {},
    el('ul', {}, [el('li', {id: '1b'}, "Item 1b"),  el('li', {id: 1}, "Item 1")])
);
emerj.merge(body, vdom);
items = body.childNodes[0].childNodes;
assert(items.length == 2, "Two items in list");
assert(body.childNodes[0] == parent, "Parent retains identity");
assert(body.childNodes[0].getAttribute('attr') != 'test', "Parent does not have attribute");
assert(body.childNodes[0].isEqualNode(el('ul', {}, [el('li', {id: '1b'}, "Item 1b"),  el('li', {id: 1}, "Item 1")])),
       "Parent content is what we expected");
assert(items[0] == orig[0] && items[1] == orig[1], "Children retain identity");
assert(items[0].isEqualNode(el('li', {id: '1b'}, "Item 1b")) &&
       items[1].isEqualNode(el('li', {id: 1}, "Item 1")), "Correct content remains");


// Test changing tagName changes element identity:
var parent = body.childNodes[0], items = body.childNodes[0].childNodes;
var orig = [items[0], items[1], items[2]];
vdom = el('body', {},
    el('div', {}, [el('li', {id: '1b'}, "Item 1b"),  el('li', {id: 1}, "Item 1")])
);
emerj.merge(body, vdom);
items = body.childNodes[0].childNodes;
assert(items.length == 2, "Two items in list");
assert(body.childNodes[0] != parent, "Parent has new identity");
assert(body.childNodes[0].isEqualNode(el('div', {}, [el('li', {id: '1b'}, "Item 1b"),  el('li', {id: 1}, "Item 1")])),
       "Parent content is what we expected");
assert(items[0] != orig[0] && items[1] != orig[1], "Children have new identity");
assert(items[0].isEqualNode(el('li', {id: '1b'}, "Item 1b")) &&
       items[1].isEqualNode(el('li', {id: 1}, "Item 1")), "Correct content remains");

