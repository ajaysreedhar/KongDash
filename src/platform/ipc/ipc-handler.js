/**
 * Copyright (c) Ajay Sreedhar. All rights reserved.
 *
 * Licensed under the MIT License.
 * Please see LICENSE file located in the project root for more information.
 */

'use strict';

/**
 * @callback IPCEventCallback
 * @param {Electron.IpcRendererEvent} event - The event object.
 * @param {Object} payload - The event data payload.
 */

/**
 * The IPC Handler helper to be exposed using {@link Electron.contextBridge contextBridge}.
 *
 * @typedef {Object} IPCHandler
 * @property {(function(
 *      action: string,
 *      listener: IPCEventCallback): boolean
 *      )} onEventPush - Registers an event listener to handle asynchronous push events from main process.
 * @property {(function(
 *      action: string,
 *      listener: IPCEventCallback): boolean
 *      )} onRequestDone - Registers an event listener to handle successful event responses.
 * @property {(function(
 *      action: string,
 *      listener: IPCEventCallback): boolean
 *      )} onRequestFail - Registers an event listener to handle failed event responses.
 * @property {(function(action: string, payload: any): void)} sendRequest - Sends an event to the asynchronous event channel.
 * @property {(function(resource: string, payload: any): any)} sendQuery - Sends an event to the synchronous event channel.
 * @property {(function(channel: string|void): void)} cleanup - Cleans up the existing event listeners.
 */

const {ipcRenderer} = require('electron');

const registeredCallbacks = {};

function callbackWrapper(event, action, payload) {
    if (typeof this._channelName !== 'string') {
        this._channelName = '__none__';
    }

    if (typeof registeredCallbacks[this._channelName] === 'object') {
        for (let callback of registeredCallbacks[this._channelName][action]) {
            callback.apply({}, payload);
        }
    }
}

function registerCallback(channel, action, listener) {
    if (typeof registeredCallbacks[channel] === 'undefined') {
        registeredCallbacks[channel] = {};
        ipcRenderer.on(channel, callbackWrapper.bind({_channelName: channel}));
    }

    if (Array.isArray(registeredCallbacks[channel][action])) {
        registeredCallbacks[channel][action].push(listener);
        return true;
    }

    registeredCallbacks[channel][action] = [listener];
    return true;
}

/**
 *
 * @type {IPCHandler}
 */
const ipcHandler = {
    onEventPush(action, listener) {
        return registerCallback('workbench:AsyncEventPush', action, listener);
    },

    onRequestDone(action, listener) {
        return registerCallback('workbench:AsyncResponse', action, listener);
    },

    onRequestFail(action, listener) {
        return registerCallback('workbench:AsyncError', action, listener);
    },

    sendRequest(action, payload) {
        ipcRenderer.send('workbench:AsyncRequest', action, payload);
    },

    sendQuery(resource, payload) {
        return ipcRenderer.sendSync('workbench:SyncQuery', resource, payload);
    },

    cleanup() {
        const channels = Object.keys(registeredCallbacks);

        for (let channel of channels) {
            ipcRenderer.removeAllListeners(channel);

            let current = registeredCallbacks[channel];
            let actions = Object.keys(current);

            for (let action of actions) {
                current[action].splice(0);
            }

            delete registeredCallbacks[channel];
        }
    }
};

module.exports = {ipcHandler};