#!/bin/false
// @ts-check

import WebSocket from 'ws';
import { replugged } from '../helpers/clients.js';
import log from './logger.js';

/**
 * @param {WebSocket.RawData | string} text
 * @returns {object?}
 */
function parse(text) {
  try {
    return JSON.parse(text.toString());
  } catch {
    log.warn('Invalid JSON:', text);
    return null;
  }
}

export const RepluggedSocket = await new class RepluggedSocket {
  #minPort = 6463;
  #maxPort = 6472;
  #num = 0;
  /** @type {WebSocket?} */
  #ws;

  async start() {
    for (let port = this.#minPort; port <= this.#maxPort; port++) {
      try {
        this.#ws = await this.#tryPort(port);
      } catch {/* Omitted */}
    }

    if (this.#ws?.readyState !== WebSocket.OPEN) throw new Error('Failed to connect to WebSocket.');
    return this;
  }

  close() {
    this.#ws?.close();
  }

  /** @param {number} port */
  #tryPort(port) {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/?v=1&client_id=REPLUGGED-${this.#num++}`);
    return new Promise((resolve, reject) => {
      // TODO: Remove event listener when done.
      ws.on('message', (data) => {
        const message = parse(data);
        if (message?.evt !== 'READY') return;

        resolve(ws);
      });

      // 🧌
      ws.onerror = ws.onclose = reject;
    });
  }

  async reload() {
    const ws = this.#ws;
    if (!ws) {
      log.warn('Not connected to a WebSocket.');
      return;
    }

    ws.send(
      JSON.stringify({
        cmd: 'REPLUGGED_ADDON_WATCHER',
        args: {
          id: replugged.fileName.slice(0, -4),
        },
        nonce: this.#num,
      }),
    );

    /** @param {WebSocket.RawData} data */
    const handleMessage = (data) => {
      const message = parse(data);
      if (message.nonce !== this.#num) return;
      ws.off('message', handleMessage);

      if (message.data.success) return;
      /** @type {string} */
      const errorCode = message.data.error;
      const error = errorCode[0] + errorCode.slice(1)
        .toLowerCase()
        .replace(/_/g, ' ');

      throw new Error(error);
    };

    ws.on('message', handleMessage);
  }
}().start();

export default RepluggedSocket;
