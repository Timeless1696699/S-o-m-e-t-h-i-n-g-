(function (global) {
  "use strict";

  const encoder = new TextEncoder();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const storagePrefix = "base64:";
  const storageKeys = Object.freeze({
    bookmarks: "orbit.bookmarks.v1",
    history: "orbit.history.v1",
    theme: "orbit.theme.v1",
    engine: "orbit.engine.v1",
    tabs: "orbit.tabs.v1",
    activeTab: "orbit.activeTab.v1",
    proxy: "orbit.proxy.v1"
  });

  function encode(value) {
    const bytes = encoder.encode(value);
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    }
    return btoa(binary);
  }

  function decode(value) {
    const binary = atob(value);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return decoder.decode(bytes);
  }

  function readStorage(key, fallback) {
    try {
      const value = global.localStorage.getItem(key);
      if (!value) return fallback;
      const json = value.startsWith(storagePrefix)
        ? decode(value.slice(storagePrefix.length))
        : value;
      return JSON.parse(json);
    } catch {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    const json = JSON.stringify(value);
    global.localStorage.setItem(key, storagePrefix + encode(json));
  }

  global.Base64 = Object.freeze({
    encode,
    decode,
    storage: Object.freeze({ keys: storageKeys, read: readStorage, write: writeStorage })
  });
})(globalThis);
