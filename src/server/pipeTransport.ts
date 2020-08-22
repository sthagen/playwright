/**
 * Copyright 2018 Google Inc. All rights reserved.
 * Modifications copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { helper, RegisteredListener, debugLogger } from '../helper';
import { ConnectionTransport, ProtocolRequest, ProtocolResponse } from '../transport';

export class PipeTransport implements ConnectionTransport {
  private _pipeWrite: NodeJS.WritableStream;
  private _pendingMessage = '';
  private _eventListeners: RegisteredListener[];
  private _waitForNextTask = helper.makeWaitForNextTask();
  private _closed = false;

  onmessage?: (message: ProtocolResponse) => void;
  onclose?: () => void;

  constructor(pipeWrite: NodeJS.WritableStream, pipeRead: NodeJS.ReadableStream) {
    this._pipeWrite = pipeWrite;
    this._eventListeners = [
      helper.addEventListener(pipeRead, 'data', buffer => this._dispatch(buffer)),
      helper.addEventListener(pipeRead, 'close', () => {
        this._closed = true;
        helper.removeEventListeners(this._eventListeners);
        if (this.onclose)
          this.onclose.call(null);
      }),
      helper.addEventListener(pipeRead, 'error', e => debugLogger.log('error', e)),
      helper.addEventListener(pipeWrite, 'error', e => debugLogger.log('error', e)),
    ];
    this.onmessage = undefined;
    this.onclose = undefined;
  }

  send(message: ProtocolRequest) {
    if (this._closed)
      throw new Error('Pipe has been closed');
    this._pipeWrite.write(JSON.stringify(message));
    this._pipeWrite.write('\0');
  }

  close() {
    throw new Error('unimplemented');
  }

  _dispatch(buffer: Buffer) {
    let end = buffer.indexOf('\0');
    if (end === -1) {
      this._pendingMessage += buffer.toString();
      return;
    }
    const message = this._pendingMessage + buffer.toString(undefined, 0, end);
    this._waitForNextTask(() => {
      if (this.onmessage)
        this.onmessage.call(null, JSON.parse(message));
    });

    let start = end + 1;
    end = buffer.indexOf('\0', start);
    while (end !== -1) {
      const message = buffer.toString(undefined, start, end);
      this._waitForNextTask(() => {
        if (this.onmessage)
          this.onmessage.call(null, JSON.parse(message));
      });
      start = end + 1;
      end = buffer.indexOf('\0', start);
    }
    this._pendingMessage = buffer.toString(undefined, start);
  }
}
