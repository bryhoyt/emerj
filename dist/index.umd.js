!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?module.exports=t():"function"==typeof define&&define.amd?define(t):e.emerj=t()}(this,function(){return{attrs:function(e){for(var t={},n=0;n<e.attributes.length;n++){var i=e.attributes[n];t[i.name]=i.value}return t},nodesByKey:function(e,t){for(var n={},i=0;i<e.childNodes.length;i++){var o=t(e.childNodes[i]);o&&(n[o]=e.childNodes[i])}return n},merge:function(e,t,n){if((n=n||{}).key=n.key||function(e){return e.id},"string"==typeof t){var i=t;(t=document.createElement(e.tagName)).innerHTML=i}var o,r={old:this.nodesByKey(e,n.key),new:this.nodesByKey(t,n.key)};for(o=0;t.firstChild;o++){var d=t.removeChild(t.firstChild);if(o>=e.childNodes.length)e.appendChild(d);else{var s=e.childNodes[o],a=n.key(d);if(n.key(s)||a){var f=a&&a in r.old?r.old[a]:d;f!==s&&(s=e.insertBefore(f,s))}if(s.nodeType!==d.nodeType||s.tagName!==d.tagName)e.replaceChild(d,s);else if([Node.TEXT_NODE,Node.COMMENT_NODE].indexOf(s.nodeType)>=0){if(s.textContent===d.textContent)continue;s.textContent=d.textContent}else if(s!==d){var l={base:this.attrs(s),new:this.attrs(d)};for(var h in l.base)h in l.new||s.removeAttribute(h);for(var u in l.new)u in l.base&&l.base[u]===l.new[u]||s.setAttribute(u,l.new[u]);this.merge(s,d)}}}for(;e.childNodes.length>o;)e.removeChild(e.lastChild)}}});
