emerj = {
    attrs: function(elem) {
        var attrs = {};
        for (var i=0; i < elem.attributes.length; i++) {
            var attr = elem.attributes[i];
            attrs[attr.name] = attr.value;
        }
        return attrs;
    },
    nodesByKey: function(parent, key) {
        var map = {};
        for (var j=0; j < parent.childNodes.length; j++) {
            map[key(parent.childNodes[j])] = parent.childNodes[j];
        }
        return map;
    },
    merge: function(base, modified, opts) {
        /* Merge any differences between base and modified back into base.
         *
         * Operates only the children nodes, and does not change the root node or its
         * attributes.
         *
         * Conceptually similar to React's reconciliation algorithm:
         * https://facebook.github.io/react/docs/reconciliation.html
         *
         * I haven't thoroughly tested performance to compare to naive DOM updates (i.e.
         * just updating the entire DOM from a string using .innerHTML), but some quick
         * tests on a basic DOMs were twice as fast -- so at least it's not slower in
         * a simple scenario -- and it's definitely "fast enough" for responsive UI and
         * even smooth animation.
         *
         * The real advantage for me is not so much performance, but that state & identity
         * of existing elements is preserved -- text typed into an <input>, an open
         * <select> dropdown, scroll position, ad-hoc attached events, canvas paint, etc,
         * are preserved as long as an element's identity remains.
         *
         * See https://korynunn.wordpress.com/2013/03/19/the-dom-isnt-slow-you-are/
         */
        opts = opts || {};
        opts.key = opts.key || function(node) { return node.id; }

        if (typeof modified == 'string') {
            var html = modified;
            // Make sure the parent element of the provided HTML is of the same type as
            // `base`'s parent. This matters when the HTML contains fragments that are
            // only valid inside certain elements, eg <td>s, which must have a <tr>
            // parent.
            modified = document.createElement(base.tagName);
            modified.innerHTML = html;
        }

        // Naively recurse into the children, if any, replacing or updating new
        // elements that are in the same position as old, deleting trailing elements
        // when the new list contains fewer children, or appending new elements if
        // it contains more children.
        //
        // For re-ordered children, the `id` attribute can be used to preserve identity.
        
        // Loop through .childNodes, not just .children, so we compare text nodes (and
        // comment nodes, fwiw) too.

        var nodesByKey;
        if (modified.firstChild && opts.key(modified.firstChild)) {  // If the first node doesn't have a key, don't bother trying to retain identity. You either care or not; you don't half-care.
            nodesByKey = {old: emerj.nodesByKey(base, opts.key),
                          new: emerj.nodesByKey(modified, opts.key)};
        }

        for (var idx=0; modified.firstChild; idx++) {
            var newNode = modified.removeChild(modified.firstChild);
            if (idx >= base.childNodes.length) {
                // It's a new node. Append it.
                base.appendChild(newNode);
                continue;
            }
            
            var baseNode = base.childNodes[idx];
            
            // If the children are indexed, then make sure to retain their identity in
            // the new order.
            if (nodesByKey) {
                var key = opts.key(newNode);
                var match = nodesByKey.old[key] || ((opts.key(baseNode) in nodesByKey.new)? newNode: baseNode);
                if (match != baseNode) {
                    baseNode = base.insertBefore(match, baseNode);
                }
            }
            
            if (baseNode.nodeType != newNode.nodeType || baseNode.tagName != newNode.tagName) {
                // Completely different node types. Just update the whole subtree, like React does.
                base.replaceChild(newNode, baseNode);
            } else if ([Node.TEXT_NODE, Node.COMMENT_NODE].indexOf(baseNode.nodeType) >= 0) {
                // This is the terminating case of the merge() recursion.
                if (baseNode.textContent == newNode.textContent) continue;  // Don't write if we don't need to.
                baseNode.textContent = newNode.textContent;
            } else if (baseNode != newNode) {   // Only need to update if we haven't just inserted the newNode in.
                // It's an existing node with the same tag name. Update only what's necessary.
                // First, make dicts of attributes, for fast lookup:
                var attrs = {base: emerj.attrs(baseNode), new: emerj.attrs(newNode)};
                for (var attr in attrs.base) {
                    // Remove any missing attributes.
                    if (attr in attrs.new) continue;
                    baseNode.removeAttribute(attr);
                }
                for (var attr in attrs.new) {
                    // Add and update any new or modified attributes.
                    if (attr in attrs.base && attrs.base[attr] == attrs.new[attr]) continue;
                    baseNode.setAttribute(attr, attrs.new[attr]);
                }
                // Now, recurse into the children. If the only children are text, this will
                // be the final recursion on this node.
                emerj.merge(baseNode, newNode);
            }
        }
        while (base.childNodes.length > idx) {
            // If base has more children than modified, delete the extras.
            base.removeChild(base.lastChild);
        }
    },
}