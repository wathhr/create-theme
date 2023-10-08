# TODO

## Template
- [x] Don't bundle TS scripts somehow
- [x] Add proper watch support for replugged
- [x] Add aliases for both Sass & Css
  - https://sass-lang.com/documentation/js-api/interfaces/importer/
  - https://lightningcss.dev/bundling.html#custom-resolvers
- [x] Figure out a good way to integrate splash screen support
- [x] Make the client exports not be functions, instead just declare the variables in the file itself
  - [ ] (?) Undo, instead add extras like process exports
    - CON: Can't really import the client exports and use their values (like in [replugged.js](./templates/base/scripts/utils/replugged.js))
    - PRO: Can change logic depending on ie if the `watch` argument is set to true
- [x] Reduce the extras for the process exports

## Main
- [ ] Add support for arrays in meta replacing (ie multiple authors)
- [x] Use [clack](https://github.com/natemoo-re/clack/) instead of readline
- [x] ~~Use patch files instead of overwriting~~
