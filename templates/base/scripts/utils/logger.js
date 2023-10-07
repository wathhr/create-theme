#!/bin/false
// @ts-check

/**
 * @param {string|number} r
 * @param {string|number} g
 * @param {string|number} b
 * @param {string[]} message
 * @returns {string}
 */
const colorize = (r, g, b, ...message) => `\x1b[38;2;${r};${g};${b}m${message.join(' ')}\x1b[0m`;

/** @param {any[]} message */
export function log(...message) {
  console.log(...message);
}

//? This uses the one dark color scheme :)
/** @param {any[]} message */
log.info = (...message) => console.log(colorize(87, 173, 234, 'i', ...message));
/** @param {any[]} message */
log.success = (...message) => console.log(colorize(147, 193, 125, '✔', ...message));
/** @param {any[]} message */
log.warn = (...message) => console.log(colorize(230, 190, 128, '⚠', ...message));
/** @param {any[]} message */
log.error = (...message) => console.log(colorize(229, 106, 117, '✘', ...message));

export default log;
