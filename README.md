# Emerj.js, a 60-line answer to React

Emerj is a tiny JavaScript library to render live HTML/DOM updates efficiently and non-destructively, by merging an updated DOM tree into the live DOM, element-by-element, and only changing those elements that differ.

It solves the problem of rendering on-the-fly changes to your HTML/DOM webpage or UI. In most user-facing software, you want to keep the UI-rendering logic quite separate from the business logic, and not clutter your logic with all kinds of extra code to update the UI when the data is modified.

In traditional HTML/JavaScript, this can be tricky to do tidily, which is the main driver for the recentish proliferation of tools like Angular, React, Ractive, etc. However, these tools all require a moderately significant paradigm shift, and your code needs to adopt the framework from the ground up. They also come with a fair amount of hidden (and not-so-hidden) complexity.

Emerj aims to cut through all this complexity by doing just one thing, and using the native browser DOM APIs for all the heavy lifting. You provide an HTML string (or an out-of-document DOM tree) and Emerj compares this to the live DOM and updates just those elements and attributes that differ. To do this, Emerj uses a similar method used by React described in its [reconciliation algorithm](https://facebook.github.io/react/docs/reconciliation.html).

For an extended explanation of the thinking behind Emerj, and the design decisions I made along the way, see [the introductory blog post](http://blog.brush.co.nz/2017/10/emerj-js-efficient-html-ui-in-60-lines/).

## How to use Emerj

There are four basic steps:
  1. Set up your document, include the necessary scripts, and an empty element ready to fill with some content.
  2. Create your data model. This could be as simple as `data = {todo: []}`
  3. Write some code to generate HTML based on that data. You could try [Nunjucks](https://mozilla.github.io/nunjucks/) or anything you like.
  4. Whenever you update your data, regenerate your HTML, and use Emerj to update the live document.
  
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
  
  <script type=text/template name='todo.html'>
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

    var template = nunjucks.compile(document.querySelector('[name="todo.html"]').innerHTML);
    
    addEventListener('data:updated', function () {    // Use your preferred event system.
      // You could use requestAnimationFrame() here for better performance.
      var html = template.render(data);
      emerj.merge(document.querySelector('#root'), html);
    })

    document.querySelector('[name=new]').addEventListener('change', function() {
      data.todo.append(this.value);
      dispatchEvent(new Event('data:updated'));
    })

    dispatchEvent(new Event('data:updated'));
  </script>
</body>
</html>
```

## Why and how

If you need to create dynamic HTML on-the-fly in the browser, based on some data, and you want something lightweight but powerful and adaptable, and/or Preact/React isn't your cup of tea, then (particularly if you like generating HTML from moustachioed templates, but can't accept the brokenness of overwriting your entire document every render), Emerj might be your answer.

For more, see [the introductory blog post](http://blog.brush.co.nz/2017/10/emerj-js-efficient-html-ui-in-60-lines/). But here's the short version:

After becoming frustrated with the horribleness of ad-hoc DOM manipulation, and the problems with plain template rendering, I grew attracted to React's clever idea of comparing two virtual DOMs and just updating the differences in the live document. But I couldn't abide JSX, and any solution I adopt needs to retrofit into sizeable existing applications, without requiring a complete overhaul of the UI templates.

A comment on Hacker News made me realise how useful it would be to have the virtual-DOM concept of React, but without being locked into JSX. A few things fell nicely into place, and Emerj was the result.

Emerj is based on three primary concepts:
  1. Be unopinionated about how the HTML or DOM is generated. Just use any plain HTML or DOM that is passed in, and let the user create it however they like.
  2. Realise that every browser has a perfectly functional virtual DOM built in. Any out-of-document element will do. The browser also provides a functional API to parse an HTML string into a virtual DOM: `element.innerHTML = html`. So use it.
  3. Using this virtual DOM, merge it with the live DOM in the approximate manner described in [React's reconciliation algorithm](https://facebook.github.io/react/docs/reconciliation.html).

There's not really much more to say. It's that simple. The code is simple enough to refer you to it for any more details.

## Isn't the DOM super slow?

No. See the [blog post](http://blog.brush.co.nz/2017/10/emerj-js-efficient-html-ui-in-60-lines/#performance).

Parsing HTML is more slow. But not nearly enough to justify the slow sad shake of your head you're doing right now. Don't forget your real bottleneck is probably the server round-trip for your API calls.

## Ok, so basically Emerj does nothing, and Nunjucks does all the real work?

Yep. The best code is [no code](https://blog.codinghorror.com/the-best-code-is-no-code-at-all/).

But, in case you completely missed the whole point, Nunjucks on its own (or whatever template language you use) will blow away and rerender your DOM on every update, losing all document state (scroll position, input state, etc) and sucking your CPU.

## Performance

See the [performance section in the introductory blog post](http://blog.brush.co.nz/2017/10/emerj-js-efficient-html-ui-in-60-lines/#performance).
In short, Emerj+Nunjucks is within cooee of React for a typical modern web app (what's that?!). But test it out for your own needs, and if it's not performant enough for you, either build a component system on top of it, or use something else.

## Try it!

Download [emerj.js](https://github.com/bryhoyt/emerj/blob/master/emerj.js) and get started. Feel free to post issues or questions as they come up.

