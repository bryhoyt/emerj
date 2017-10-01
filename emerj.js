emerj = {
    attr_dict: function(elem) {
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
            var _modified = modified;
            // Make sure the parent element of the provided HTML is of the same type as
            // `base`'s parent. This matters when the HTML contains fragments that are
            // only valid inside certain elements, eg <td>s, which must have a <tr>
            // parent.
            modified = document.createElement(base.tagName);
            modified.innerHTML = _modified;
        }

        // Naively recurse into the children, if any, replacing or updating new
        // elements that are in the same position as old, deleting trailing elements
        // when the new list contains fewer children, or appending new elements if
        // it contains more children.
        //
        // We don't try and preserve identity of elements beyond that. Nothing like
        // React's `key` attribute is provided.
        
        // Loop through .childNodes, not just .children, so we compare text nodes (and comment nodes, fwiw) too.
        var new_children = [].slice.call(modified.childNodes);  // Make a copy of the node list, because the `modified` tree changes as we transfer nodes from it into the base.
        for (var i=0; i < new_children.length; i++) {
            var new_node = new_children[i];
            if (i >= base.childNodes.length) {
                // It's a new node. Append it.
                base.appendChild(new_node);
                continue;
            }
            var existing = base.childNodes[i];
            if (existing.nodeType != new_node.nodeType || existing.tagName != new_node.tagName) {
                // Completely different node types. Just update the whole subtree, like React does.
                base.replaceChild(new_node, existing);
            } else if ([Node.TEXT_NODE, Node.COMMENT_NODE].indexOf(existing.nodeType) >= 0) {
                // This is the terminating case of the merge_dom() recursion.
                if (existing.textContent == new_node.textContent) continue;
                existing.textContent = new_node.textContent;
            } else {
                // It's an existing node with the same tag name. Update only what's necessary.
                // First, make dicts of attributes, for fast lookup:
                var base_attrs = emerj.attr_dict(existing);
                var modified_attrs = emerj.attr_dict(new_node);
                for (var attr in base_attrs) {
                    // Remove any missing attributes.
                    if (attr in modified_attrs) continue;
                    existing.removeAttribute(attr);
                }
                for (var attr in modified_attrs) {
                    // Add and update any new or modified attributes.
                    if (attr in base_attrs && base_attrs[attr] == modified_attrs[attr]) continue;
                    existing.setAttribute(attr, modified_attrs[attr]);
                }
                // Now, recurse into the children. If the only children are text
                emerj.merge(existing, new_node);
            }
        }
        while (base.childNodes.length > new_children.length) {
            // If base has more children than modified, delete the extras.
            base.removeChild(base.lastChild);
        }
    },
}