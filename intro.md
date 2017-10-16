== Emerj.js: efficient live HTML DOM rendering, in 50 lines ==

<note>
Emerj.js is a tiny library I wrote, inspired by, and to solve roughly the same core problem as, Facebook's React. Find it _here on GitHub_. I think React is pretty cool, but its size and JSX language is not to my taste. A stray comment on Hacker News got me thinking, and I figured out a way to achieve React's DOM diff/merge technique using builtin browser APIs in a way that works well for me. Here's how I got there.
</note>

HTML-based software has moved quickly in the last five years, from primarily static apps served with server-side-rendered HTML and maybe a light seasoning of JavaScript (think the oldest versions of Hotmail), to fully client-side apps that render the entire HTML in the browser on the fly, and just pull raw data from a server via a web API (think modern Facebook).

As a result, the challenges of coding web UI have changed considerably. Traditionally, you'd pull some data from the database and populate this into an HTML template on the server side, and send this as an entire web page to the browser. You could make some amazing apps this way. And when your customers failed to be impressed, you would add some JavaScript to the page to do cool things like make a sidebar slide in when you clicked the menu icon.

When AJAX hit the streets, things got cooler. The user could push a button to add something to their shopping cart, and it would just /zip/ into the cart without even reloading the page. You'd write some JavaScript to bump the number of items on the top-right, and the shopper would be so impressed they'd add a few more just to watch the number change before their eyes. Your code would look something like this:

```
<body>
  <div class='num-in-cart'>0</div>
  <ul class='cart'></ul>
  <button name=add value='product-42'>+</button>
</body>
----------------------------------------
var num_in_cart = 0;
$('button[name=add]').on('click', function() {
  var button = this;
  $.ajax('/cart/add', function() {
    num_in_cart++;
    $('.num-in-cart').text(num_in_cart);
    $('.cart').append('<li>'+button.value+'</li>');
  })
})
```

That was great, and websites started to feel more like software and less like pages, and we started calling them “apps”.

The trouble is, this way of doing dynamic UIs doesn't scale very well. Note how most of the update function is DOM manipulation and ad-hoc HTML construction. And this is an overly simplistic example—I've left out loads of important edge cases and usability niceties.

If you've just got a number or two you need to update, that's fine. But if you have a screen full of, say, posts from friends, little status icons, message alerts, ads, and loads else changing dynamically, imagine how that innocent-looking `$('.num-in-cart').text()` will explode into a thousand strings of spaghetti. Not only that, but suddenly you'll be writing your HTML in two places—once to generate it in the first place, server-side, and once to update it when your data changes.

A moderately elegant solution to this is to pull in a client-side template language, like Handlebars or Nunjucks (my favourite). Your code might look a bit more like this:

```
<script type=text/template name='cart.html'>
  <div class='num-in-cart'>{{ cart|length }}</div>
  <ul>{% for item in cart %}<li>{{ item }}</li>{% endfor %}</ul>
  <button name=add value='product-42'>+</button>
</script>
----------------------------------------
var data = {cart: []};

$('button[name=add]').on('click', function() {
  $.ajax('/cart/add', function() {
    data.cart.push(button.value);
    dispatchEvent(new Event('data:updated'));
  })
})

addEventListener('data:updated', function() {
  var html = nunjucks.render('script[name="cart.html"]', data);
  document.body.innerHTML = html;
})

dispatchEvent(new Event('data:updated'));
```

It's a bit more code for this tiny example, but the code complexity scales exponentially better: you can have an arbitrarily complex a data structure, and as fancy a DOM as you like, and you only need to write your HTML once, cleanly, in a language much more suited to creating complex HTML than JavaScript is.

=== But wait. ===

This works well. But there's one massive problem: every single element (within the portion of the page that you're updating) is replaced with an entirely new one, whether it's changed or not. This is majorly problematic for two reasons:
  1. It's not very performant. DOM rendering is among the slowest things a web browser does, and replacing all the elements triggers a complete re-rerender. However, it's still waay faster than reloading the page, so this is a net win over server-side rendering.
  2. More importantly, you completely lose any element state. If the user had scrolled partway down a page or within an element, or typed some input, selected a dropdown option, or whatever, that disappears completely every time you re-render. Super annoying, and utterly non-functional.

You can avoid the second problem to an arbitrary extent by breaking your templates into smaller sub-templates and only updating portions of the page. For example, if you're just updating a scrollable list of products, just render the products.html template. But the problem keeps hitting you early and frequently (if you update just the product list, you still end up zapping the radio button they selected beside Product 3 to choose the striped pink fabric print), and pretty soon your micro-factorised templates and the code to render them becomes as crazy as the original problem you're trying to avoid.


=== So... use HTML as the semantic language it is? ===

A little aside here. Another quite real solution to all this is to use valid HTML itself as your templating language. Using class names, or custom attributes, you can make your HTML reference your data structure in meaningful ways, allowing your JavaScript to populate it seamlessly. The advantage is that you don't need to replace entire portions of your document, but you still get to use HTML the way God intended. The concept looks something like this, in theory:

```
<body>
  <div class='num_in_cart'></div>
  <ul class='cart'><li class='items'></li></ul>
  <button name=add class=product_add value=''>+</button>
</body>
----------------------------------------
var data = {cart: {items: []}, num_in_cart: 0, 'product_add.value': 'product-42'};

...

addEventListener('data:updated', function() {
  // Loops through all elements and finds the fields in `data` with keys matching the
  // class names of the elements.
  magicallyUpdateElementContent(document.body, data);
})
```

This almost works. I've written code to do it myself, with middling success, and there are other templating libraries out there that work like this (eg _plates.js_).

But as seductive as the idea is, it's basically broken -- there are so many special cases that you need to either handle specifically in your JavaScript code, or have awkward HTML constructs for, or both, that you end up with your UI elements peppered through your JavaScript, and a messy data structure built to accommodate the limitations of your HTML model. For example, how do you represent an attribute content (like the URL of an <a href=''>) in your data structure? What if only the final part of an href is pulled from your data? How do you handle repeated blocks? This solution is actually clumsier than ad-hoc JavaScript DOM manipulation.

=== Reacting to the problem ===

This problem of rendering data seamlessly into your UI without a whole bunch of ad-hoc code, is (I believe) the basic problem that has driven the proliferation of frameworks and UI engines in the last few years, like Angular, React, and Ractive.js. It's among the trickiest bits of writing UI frontends in vanilla HTML/JavaScript. And some excellent solutions have been uncovered.

Facebook's React and the React-inspired Ractive.js are my picks for the best of the bunch. For one thing, they just focus on rendering UI. They're libraries, not kitchen-sink frameworks, and I believe that's a Good Thing.

The React folks also hit on a great solution to the problem of replacing your entire DOM—instead of overwriting it, React renders to a “virtual DOM” and diffs it against the live DOM, updating only those parts that differ. They describe how this works in their reconciliation algorithm: https://facebook.github.io/react/docs/reconciliation.html

To write the UI code in the first place, React provides a custom language called JSX, which I don't particularly care for (it reminds me a lot of the bad old days when we mixed PHP into our HTML like we thought we were James Bond). A React convert is quick to tell you “Hey, don't feel you have to use JSX if you don't like it; Just write your components in plain JavaScript. JSX is just syntax sugar.” But it's a clayton's choice, because even if you're not in love with JSX, the plain JavaScript way is an objectively much worse way to write HTML or UI components.

I like Ractive.js a bit better, because they ran with the diffing-and-merging concept but used a Handlebars-like template language instead. It still leaves me a little uninspired, though. I maintain a lot of web UI code written in Jinja/Nunjucks, and it's infeasible to just convert it all to Handlebars or JSX. And I'd rather not be forced to make a choice of template language if I don't have to.


=== Why can't R[e]act[ive] be language-agnostic? ===

Why can't React and Ractive let you write HTML however you like? Well, I'm not 100% certain of all their reasons, but React has a significant investment in their component architecture (which also works outside an HTML context, eg React Native for mobile apps), and both render to a virtual DOM, not the browser DOM, which means HTML would be an extra thing they'd need a custom parser for.

But there's the rub. Every browser has an excellent HTML parser built in, and every browser has this excellent virtual document model called ... you guessed it ... the DOM. If you create a DOM element (`document.createElement('div')`) and don't insert it into your document (a perfectly legitimate thing to do), then it's virtual. Not real.

Let's quickly get one myth out of the way: the DOM is not slow. This is a common misperception (and one which I suspect might be partly behind React's choice to build their own), stemming from the fact that DOM /rendering/ is slow. If your DOM root is connected to the document, then any changes to DOM properties which affect layout will trigger either a reflow or relayout. A common bottleneck in UI code is to update a DOM property, and then request a different DOM property, often in a loop (for example, when animating). This will trigger hundreds of reflows in the space of a few milliseconds, and yes, your CPU will feel it, and your animations won't be buttery smooth.

If your DOM root is not connected to the live document, then (barring some inevitable edge cases) there is nothing preventing it from being as fast, possibly faster, than any virtual DOM implemented with vanilla JavaScript objects. In my experiments, this has proven to be true, at least to within the level of performance I care about.

== The emerjent solution ==

So that's pretty much how Emerj.js works. You render some HTML or construct an out-of-document DOM however you like (Emerj doesn't even need to know you exist at this stage), and then call Emerj's single function to update your DOM. Here's what the function does:
  1. Converts your HTML to a “virtual” DOM, if you haven't already. This is easy:
  var vdom = document.createElement('div');
  vdom.innerHTML = html;
  2. Loops through the top-level children of the virtual DOM and compare each one to the top-level child in the same position of the live DOM.
  3. For each node, if it differs, updates it with fairly simple logic, mostly borrowed from React: if the tag name has changed, consider it a completely new element and replace it; if it's a text node, update it if it differs; remove any missing attributes; add any new attributes; update any altered attributes
  4. Recurses into any children from step 2.
  5. Removes or adds any missing or extra children.
  
Your DOMs are now identical, and you've only modified the bare minimum.

=== Hey, you're cheating! ===

“You're cheating. React gives you a way to create HTML, composable components, etc, and Emerj just hands the problem off to a template language. That's at least 50kb right there, and you haven't really solved anything.”

Yeah. I'd like to quibble that React's way of creating HTML isn't all that exciting, and string concatenation doesn't look too much worse than JSX. But I'm speaking from the sidelines: I'm not a React convert.

However, I'm not really trying to pitch Emerj as solving all the same problems that React solves. It doesn't. React has loads more features out-of-the-box, is way more industry-tested, and provides a broader set of UI concepts and philosophies to build a UI around.

I'm also grateful to React for being a sensible solution to a single real problem in a world where everything else is a kitchen-sink framework.

Furthermore, Emerj wouldn't exist without React. React is what triggered the idea to start with.

All I'm saying is, for me, and I hope others, Emerj addresses the basic problem that would drive me to React in the first place: updating an HTML UI from data on-the-fly, efficiently, without zapping document state, and without a whole bunch of nasty ad-hoc DOM manipulation. As for the rest of React, I've either found other solutions I'm happy with, or I've just never run into the problem that particular piece solves.

=== Performance ===

I've tested Emerj in [Chrome, Firefox, IE11, and Edge], and it performs admirably, in my opinion.

Specifically, the template _demo.html_ can be rendered more than [50] times per second in all those browsers, on an ordinary modern laptop CPU, with all data fields updated each frame.

In many scenarios, it's quick enough to do animation with, though don't really recommend using Emerj for animation. In most cases, CSS transitions will be simpler and better, and where CSS transitions won't do, direct DOM manipulation (possibly with a library) may be a better idea than trying to trick Emerj into animating an element by animating your state, because at the bare minimum, Emerj has to loop through every single element and attribute in your document, for every animation frame.

In actual fact, most of that time is spent parsing the HTML into a DOM using .innerHTML. If you use a different, native-JavaScript method of producing a DOM, instead of a string-producing template engine, you can dramatically improve the speed on large complex documents.

I haven't compared performance with React, because I'm not feeling overly competitive – as long as a single typical render is below the threshold of perceptibility, around 10-20ms, it'll hardly matter except for animation.

Again, I believe the real advantage is not so much performance, but that state & identity of existing elements is preserved – text typed into an <input>, an open <select> dropdown, scroll position, ad-hoc attached events, canvas paint, etc, are preserved as long as an element remains.

=== Shortfalls and improvements ===

There are a few minor pitfalls with this model, some of which React also has, but provides ways around.

First, third-party or non-emerjent code that manipulates the on-page DOM will interfere with Emerj -- any changes made will get overwritten in the next render.  The ideal solution is to use Emerj for everything, but that's not always feasible, sometimes because you really need the third-party component, and sometimes because interacting with the DOM directly *is* actually the right thing to do. Also, non-CSS animations are probably more advisable to do by direct DOM manipulation than by "animating" your data to hack Emerj into doing an animation. I plan to introduce two solutions for this, but need to spend time testing them in real life: 1) an "emerj:ignore" attribute on the element, causing Emerj to skip updating the element, and 2) an option to compare the virtual DOM with the previous virtual DOM, and only updating the live DOM where the two virtual DOMs differ.

Second, React allows you to provide a key[https://facebook.github.io/react/docs/reconciliation.html#keys] for an element (typically in a list of elements), so that if the list changes order, the unchanged elements don't get overwritten. Emerj doesn't provide this. I'm waiting to run into an actual problem with it in real life before I solve it in the abstract. Currently I feel the feature adds unnecessary weight.

Third, Emerj makes no attempt to solve the inverse problem: updating your data model when on-page widgets are changed (eg, the user types into an input field). Ractive does this. React does not. Kitchen-sink frameworks like Angular do. I believe it's a separate, though admittedly closely-related, problem, that should be solved separately. And, if you use _delegated events_ (you must!), the vanilla JavaScript way of doing it is not unpleasant, at least if your app's interaction:information ratio is lowish.

Fourth, if you use Emerj with a template language (my preference), as opposed to some DOM-based component architecture (I don't know any; do you?), the very minimum that needs to happen in a render is to parse the HTML into a DOM structure (and then loop through that DOM structure, but React must do this too). Hopefully .innerHTML is highly-optimised compiled C code, given it's what web browsers do for a living, so it's probably not terrible, but it's certainly not free, either. React doesn't have this problem, since it deals in objects, not text. Note this is not a limitation of Emerj as much as it is of whatever method you use to produce your DOM.

Fifth, there's not much to help you with really complex components that have zillions of sub-elements or for some other reason are particularly slow to construct. React provides `shouldComponentUpdate()` for this purpose – if you know that a component doesn't need to rerender, then save your cycles. However, Emerj has no way of doing this, because it doesn't know anything about your components or DOM until after you've rendered. Emerj's take on this is that that is your problem. But there are relatively simple solutions. If you're using a template library like Nunjucks, a simple cache-on-state tag might do the trick.

Sixth, my next reusable component will be an <ol> with English text for bullets. Seriously, React provides a pretty good attempt at a composable component architecture, something that, if you can figure out what those words mean, any good UI library should do. If you have a fancy date widget, but need one with a year selector, just subclass it. The sky's the limit! Emerj doesn't provide anything like this. That said, it also doesn't need to: if you have a semi-decent way of producing HTML, part of that is bound to involve reusability in one form or another. My favourite, Nunjucks, has macros, which make for excellent reusable components. If you wanted, you could also do some pretty powerful things using native DOM instead rendering an HTML string.

                                        ---

If you like the concept, then grab yourself _a copy of Emerj here_ and start coding!
