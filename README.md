== Emerj.js, a 50-line answer to React ==

Emerj.js is a tiny JavaScript library to render live HTML/DOM updates efficiently and non-destructively, by merging an updated DOM tree into the live DOM, element-by-element, and only changing those elements that differ.

It solves the problem of rendering on-the-fly changes to your HTML/DOM webpage or UI. In most user-facing software, you want to keep the UI-rendering logic quite separate from the business logic, and not clutter your logic with all kinds of extra code to update the UI when the data is modified.

In traditional HTML/JavaScript, this can be tricky to do tidily, which is the main driver for the recentish proliferation of tools like Angular, React, Ractive, etc. However, these tools all require a moderately significant paradigm shift, and your code needs to adopt the framework from the ground up. They also come with a fair amount of hidden (and not-so-hidden) complexity.

Emerj.js aims to cut through all this complexity by doing just one thing, and using the native browser DOM APIs for all the heavy lifting. You provide an HTML string (or an out-of-document DOM tree) and emerj.js compares this to the live DOM (or a subset thereof) and updates just those elements and attributes that differ. To do this, emerj.js uses a similar method used by React described in its reconciliation algorithm: https://facebook.github.io/react/docs/reconciliation.html

== How to use Emerj.js ==

There are four basic steps:
  1. First set up your document, include the necessary files, and make sure there is an element ready to populate with some HTML.
  2. Create your data model. This could be as simple as `data = {shoppingCart: []}`
  3. Write some code to generate dynamic HTML based on that data. I recommend using your favourite template language, such as Handlebars or Nunjucks.
  4. Whenever you update your data, run the HTML-generating code, and use Emerj.js to update the live document.
  
I learn best by example, so here you are:

```
<!doctype html>
<html>
<head>
  <script type=text/javascript src='nunjucks.js'>
  <script type=text/javascript src='emerj.js'>
</head>
<body>
  <div id=root><!-- The live document will go here --></div>
  
  <script type=text/template name=todo>
    <!-- Your favourite template language. I like Nunjucks. -->
    <ul class='todo'>
      {% for item in todo %}
        <li><input type=checkbox {% if item.done %}checked{% endif %}> {{ item.text }}</li>
      {% else %}
        Add an item below
      {% endfor %}
      <li><input type=text name=new></li>
    </ul>
  </script>

  <script type=text/javascript>
    var data = {todo: []}

    // Set up nunjucks to find template code in <script> elements:
    var renderer = new nunjucks.Environment({getSource: function(template) {
        return {
          src: $('script[type="text/template"][name="'+template+'"]')[0].innerHTML,
          path: template
        }
    }})

    function dataUpdated() {
      var html = renderer.render('todo', data);
      emerj.merge(document.querySelector('#root'), html);
    })

    document.querySelector('[name=new]').addEventListener('change', function() {
      data.todo.append(this.value);
      dataUpdated();
    })

    dataUpdated();
  </script>
</body>
</html>
```

== Why Emerj.js ==

The DOM UI updating problem doesn't usually surface until the client-side of your web app reaches a certain level of complexity. If you've read this far, you'll probably be familiar with the traditional way of providing dynamic content in a web app:
  1. Some server-side code written in a language like Python grabs data from a database and does some magic with it.
  2. The resulting data is interpolated into some HTML using a template language like Jinja.
  3. This is sent to the web browser, which displays it to the user, beautifully formatted.
  4. The world stops turning until the user does something else. Even if the data changes, the user will see nothing different without reloading the web page or visiting a new one.

Add a little JavaScript, and things get more interesting. The user can do stuff without submitting a form to reload the view, and the server can send live updates, and you can update the view on the fly. The details are unimportant, but you'll probably have a reasonably coherent data model at this stage, and your code will be beautiful...

...until you add the bit that updates the UI. It normally ends up looking something like this:

```
var data = {
  todo: []
}
MyTodoApp.onTodoAdded = function(item) {
  data.todo.push(item);

  // Now update the UI:
  var $todo = $('ul.todo');
  $todo.empty();
  todo.map(function(item) {
    $todo.append('<li><input type=checkbox ' + (item.done? 'checked': '') + '> '+item.text+'</li>');
  })
}

```
The first line of that function looks pretty tidy. It's just manipulating simple data, which JavaScript is well-suited to. The rest is awful, even if you don't mind jQuery. Not only that, but it's ridiculously simplisitic, and doesn't catch half of the edge cases that even the simplest of todo apps would need. For example, you'd want to show a helpful message if the list is empty, and you'd probably not want to replace every single <li> every time you added an item. If you started to handle these cases, you'd quickly end up with a page of ugly code for even the simplest dynamic part of your app.

So, depending on the importance of the feature, you often just give up and keep it simple. There are obviously better ways than what I've shown above (for example, you'd probably want to factor the UI logic into a different function), but they don't really solve the underlying problem, and often come with their own complexity.

An elegant solution is to use a client-side template language like Nunjucks. Your code ends up looking something like this:
```
<div id=root></div>
----------------------------------------
<!-- Your favourite template language: -->
<script type=text/template name=todo>
  <ul class='todo'>
    {% for item in todo %}
      <li><input type=checkbox {% if item.done %}checked{% endif %}> {{ item.text }}</li>
    {% else %}
      Add an item below
    {% endfor %}
    <li><button>+</button></li>
  </ul>
</script>
----------------------------------------
MyTodoApp.on('todo:added', function(item) {
  data.todo.push(item);
  MyTodoApp.trigger('data:updated')
})
MyTodoApp.on('data:updated', function(data) {
   var html = template('todo').render(data);      // Your favorite template engine.
   document.querySelector('#root').innerHTML = html;
})
```

Notice how we've factored the UI display code into its own place, in a language that's much more expressive for generating HTML, and without much mess have added a couple edge cases the the previous code couldn't do very nicely. Also, the data handling function is focused just on what it does. We've also separated out the concern of directly rendering the UI, by using a loosely-coupled event, which is arguably a better way to do it. And we've done penance for introducing a dependency on Nunjucks by eliminating the heftier jQuery.

Although it's a bit more overhead in this extremely simple one-field scenario (although some of the overhead is actually UI features we've added, like the '+' button and empty-loop text), the rendering code will work from anywhere, for all your data. And your rendering code renders all your HTML, not just the bits you update from JavaScript. So it scales much better than the custom DOM-constructing JavaScript, which explodes almost exponentially.

This works well. But there's one massive problem: every single element (within the portion of your page that you're updating) is replaced with an entirely new one, whether it's changed or not. This is majorly problematic for two reasons:
  1. It's not very performant. DOM rendering is among the slowest things a web browser does, and replacing all the elements triggers a complete re-rerender. However, it's still waay faster than reloading the page, so this is a net win over server-side rendering.
  2. More importantly, you completely lose any element state. If the user had scrolled partway down a page or within an element, or typed some input, selected a dropdown option, or whatever, that disappears completely every time you re-render. Super annoying, and utterly non-functional.

This is where frameworks and libraries like Angular, React, or Ractive come in. They keep track of each component and make sure to only update the parts of the page that have changed. They're great, and work well, but they come with significant complexity, and they're harder to retro-fit to an existing app.

React improves on Angular by being less of a does-everything framework, and more just a library to render some HTML. The React folks have also invented a clever method of updating the live DOM, which was my inspiration for Emerj.js. I don't particularly care for React's JSX language (the HTML-interpolated-with-code reminds me a lot of the bad old days of PHP), and even if I did, I maintain a number of existing web applications that can't just switch to an entirely new way of rendering HTML at the drop of a hat. A comment on Hacker News made me realise how useful it would be to be able to use the virtual-DOM concept of React, but with your favorite template language.

A few things fell nicely into place, and Emerj.js was the result. Here's how you would render a UI update using Emerj.js:

```
<div id=root></div>
----------------------------------------
<!-- Your favourite template language: -->
<script type=text/template name=todo>
  <ul class='todo'>
    {% for item in todo %}
      <li><input type=checkbox {% if item.done %}checked{% endif %}> {{ item.text }}</li>
    {% else %}
      Add an item below
    {% endfor %}
    <li><button>+</button></li>
  </ul>
</script>
----------------------------------------
MyTodoApp.on('todo:added', function(item) {
  data.todo.push(item);
  MyTodoApp.trigger('data:updated')
})
MyTodoApp.on('data:updated', function(data) {
  var html = template('todo').render(data);     // Your favourite template engine.
  emerj.merge(document.querySelector('#root'), html);
})
```

Notice how it's line-for-line identical to the just-nunjucks example, except for the final line where you merge the HTML into the live DOM, instead of just replacing it. Since it can work equally well with an HTML string or an out-of-document DOM tree, you can generate your HTML/DOM however you like. You could use Handlebars, string-interpolation, direct DOM construction. You could probably also do crazy things like use JSX, or render your templates server-side and render them client-side without a page refresh.

== How it works, and how it's possible ==

Emerj.js is based on three primary concepts:
  1. Be unopinionated about how the HTML or DOM is generated. Just use any plain HTML or DOM that is passed in, and let the user create it however they like.
  2. Realise that every browser has a perfectly functional virtual DOM built in. Any out-of-document element will do. The browser also provides a perfectly functional API to parse an HTML string into a virtual DOM: `element.innerHTML = html`. So use it.
  3. Using this virtual DOM, merge it with the live DOM in the manner described in React's reconciliation algorithm.

There's not really much more to say. It's that simple. The code is simple enough to refer you to it for any more details.

== Isn't the DOM super slow? ==

And isn't this why React had to create their own virtual version?

Well, I'm not 100% certain of all the reasons the React team had, but I know for a fact that the DOM is not slow. This is a common misperception, stemming from the fact that DOM /rendering/ is slow. If your DOM root is connected to the document, then any changes to DOM properties which affect layout will trigger either a reflow or relayout. A common bottleneck in UI code is to update a DOM property, and then request a different DOM property, often in a loop (for example, when animating). This will trigger hundreds of reflows in the space of a few milliseconds, and yes, your CPU will feel it, and your animations won't be buttery smooth.

If your DOM root is not connected to the live document, then (barring some inevitable edge cases) there is nothing preventing it from being as fast, possibly faster, than any virtual DOM implemented with vanilla JavaScript objects. In my experiments, this has proven to be true, at least to within the level of performance I care about.

Rendering a Nunjucks template every single render looks like it should be slow, but it also is not a major bottleneck, since you can easily tell Nunjucks to precompile your templates (even if you just use the client-side version), and no parsing is involved.

The slowest part of all this is typically rendering the HTML string to a DOM on every single update. However, even this is super fast -- we're talking a few milliseconds even for a relatively complex document. If you really care (for 95% of use cases I think you shouldn't), then the beauty of Emerj.js is that you don't have to actually use HTML if you don't want to -- you can merge pure DOMs. I don't know how React works under the hood, but I'm guessing they try to avoid an intermediate HTML stage when converting their JSX to a DOM tree, and I don't see any theoretical reason you couldn't use a JSX-like language to create a DOM tree instead of HTML, if you wanted. But I find template languages to be the most natural way to generate HTML and DOM trees, so I'm happy to have the slight potential performance hit.
