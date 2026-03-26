## One **entry**, one layout


By default, every **entry** uses the same layout.  
But sometimes one page needs to be special: a landing page, a gallery, a custom “about” page…

So **webette** lets you override the layout for a single **entry**.

## Where the override lives

Open the site config:

```
website-example/webette.config.ts
```

Then go to:

`templates.custom.entry`

This map uses keys like:

`<collection>/<entry>`

For this page, the key is:

`playground/custom-layout-for-an-entry`

## Try it!

Keep **webette** running in `serve` mode and open this page in the browser.

Now:

1) Open 
```
website-example/webette.config.ts
```
2) Find this line:

`"playground/custom-layout-for-an-entry": ""`

3) Replace the empty string with this layout path:

`"layout/playground-custom-entry.hbs"`

4) Save the config, then just wait: live reload should refresh the page automatically.

You should now see a “Custom layout” badge at the top of the page.

Bonus:

Open the layout file and change the badge text:

```
website-example/_templates/layout/playground-custom-entry.hbs
```

Then save, and wait for live reload again.

<!--
Solution:

In website-example/webette.config.ts:

templates: {
  ...
  custom: {
    entry: {
      "playground/custom-layout-for-an-entry": "layout/playground-custom-entry.hbs",
    },
  },
}
-->
