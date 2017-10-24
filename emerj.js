emerj = {
    attrs: function(elem) {
        var attrs = {};
        for (var i=0; i < elem.attributes.length; i++) {
            var attr = elem.attributes[i];
            attrs[attr.name] = attr.value;
        }
        return attrs;
    },
    merge: function(base, modified) {
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
        // We don't try and preserve identity of elements beyond that. Nothing like
        // React's `key` attribute is provided.
        
        // Loop through .childNodes, not just .children, so we compare text nodes (and
        // comment nodes, fwiw) too.
        // First make a copy of the node list to loop through, because the `modified` tree
        // changes as we transfer nodes from it into the base.
        var newChildren = [].slice.call(modified.childNodes);
        for (var i=0; i < newChildren.length; i++) {
            var newNode = newChildren[i];
            if (i >= base.childNodes.length) {
                // It's a new node. Append it.
                base.appendChild(newNode);
                continue;
            }
            var existing = base.childNodes[i];
            if (existing.nodeType != newNode.nodeType || existing.tagName != newNode.tagName) {
                // Completely different node types. Just update the whole subtree, like React does.
                base.replaceChild(newNode, existing);
            } else if ([Node.TEXT_NODE, Node.COMMENT_NODE].indexOf(existing.nodeType) >= 0) {
                // This is the terminating case of the merge() recursion.
                if (existing.textContent == newNode.textContent) continue;
                existing.textContent = newNode.textContent;
            } else {
                // It's an existing node with the same tag name. Update only what's necessary.
                // First, make dicts of attributes, for fast lookup:
                var attrs = {base: emerj.attrs(existing), modified: emerj.attrs(newNode)};
                for (var attr in attrs.base) {
                    // Remove any missing attributes.
                    if (attr in attrs.modified) continue;
                    existing.removeAttribute(attr);
                }
                for (var attr in attrs.modified) {
                    // Add and update any new or modified attributes.
                    if (attr in attrs.base && attrs.base[attr] == attrs.modified[attr]) continue;
                    existing.setAttribute(attr, attrs.modified[attr]);
                }
                // Now, recurse into the children. If the only children are text, this will
                // be the final recursion on this node.
                emerj.merge(existing, newNode);
            }
        }
        while (base.childNodes.length > newChildren.length) {
            // If base has more children than modified, delete the extras.
            base.removeChild(base.lastChild);
        }
    },
}