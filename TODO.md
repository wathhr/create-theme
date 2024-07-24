# TODO

## Ideas
- ✅ Implemented but not forced
  - (template) Use a JSON file for the CSS variables
    - PRO: Easier to implement stylus variables
      - (how would I even implement stylus variables with base CSS?)
    - PRO: Removes a hardcoded file path (for styles)
    - CON: Adds another file in the root
    - CON: Decouples all the CSS variables from CSS

## Template
- [x] Don't bundle TS scripts somehow
- [x] Add proper watch support for replugged
- [x] Add aliases for both Sass & Css
  - https://sass-lang.com/documentation/js-api/interfaces/importer/
  - https://lightningcss.dev/bundling.html#custom-resolvers
- [x] Figure out a good way to integrate splash screen support
- [x] Make the client exports not be functions, instead just declare the variables in the file itself
  - [ ] ~~(?) Undo, instead add extras like process exports~~
    - CON: Can't really import the client exports and use their values (like in [replugged.js](./templates/base/scripts/utils/replugged.js))
    - PRO: Can change logic depending on ie if the `watch` argument is set to true
- [x] Reduce the extras for the process exports
- [ ] Support stylus variables (https://github.com/openstyles/stylus/wiki/Writing-UserCSS#var)
  - ❗ This added another (optional[^1]) configuration file to the root of the project
  - [ ] Maybe use this approach? https://github.com/Cynosphere/w9x/blob/master/build.mjs
  - [x] Make it so variables don't get added when by the preprocessor when building stylus
  - [ ] Fix variables not getting added on the CSS template because of (pre|post)processing
    - [ ] Maybe hard-code adding the variables and add an option to emit them for client exports?

## Sass Template
  - [x] (?) Change to using the deprecated [`render`](https://sass-lang.com/documentation/js-api/functions/render/) instead of [`compile`](https://sass-lang.com/documentation/js-api/functions/compile/)
    - PRO: More extensible
      - Can implement global variables
      - Can implement file globbing
    - CON: Deprecated (?)
  - [ ] Figure out a better way to create functions using `render`

## Main
- [ ] Add support for arrays in meta replacing (ie multiple authors)
- [x] Use [clack](https://github.com/natemoo-re/clack/) instead of readline
  - [ ] Replace clack with something else (possibly something custom?)
- [ ] ~~Use patch files instead of overwriting~~
- [ ] Optimize file structure depending on if the template is generated in a client theme folder
- [ ] ~~Add tests for everything 😵‍💫~~
  - Overly complex for this project


[^1]: The file can be omitted and its functionality can be replaced by the `props` (optional) key in the original config file (`theme.config.json`). If neither exist no changes will be made.
