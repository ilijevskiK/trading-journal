// Shared WebSocket connection to Finnhub's real-time trade stream.
//
// One socket multiplexes every subscribed symbol (Finnhub's API is designed
// for this) rather than each chart opening its own connection. The module
// keeps a single connection + a symbol -> Set<callback> registry: it lazily
// connects on the first subscriber, re-subscribes everything on (re)connect,
// and closes once the last subscriber unsubscribes. Auto-reconnects with
// backoff if the socket drops while there are still subscribers.
//
// Free tier: real-time trades for up to 50 symbols on one connection — see
// https://finnhub.io/pricing. Only US-listed symbols stream trades; other
// tickers (or a closed market) simply produce no messages, which callers
// should treat as "no live data right now," not an error.

const WS_URL = "wss://ws.finnhub.io";
const MAX_RECONNECT_DELAY_MS = 30000;
// Finnhub allows only one open connection per API key. React's Strict Mode
// (dev only) deliberately mounts -> cleans up -> mounts every effect once,
// synchronously, to catch exactly this kind of bug: without a grace period,
// the cleanup would close the shared socket and the immediate remount would
// open a new one before Finnhub had processed the first close, and the
// second connection could get rejected by the one-per-key limit. Delaying
// the close and canceling it if a new subscriber shows up first (as Strict
// Mode's remount does) avoids that race, and also lets a real "navigate
// away and back" within the window reuse the same connection.
const CLOSE_GRACE_MS = 300;

let socket = null;
let currentApiKey = null;
let reconnectAttempt = 0;
let reconnectTimer = null;
let closeTimer = null;
let intentionalClose = false;

// symbol -> Set<(tick: { price, timestamp }) => void>
const listeners = new Map();

function send(message) {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

function scheduleReconnect(apiKey) {
  if (intentionalClose || listeners.size === 0) return;
  const delay = Math.min(MAX_RECONNECT_DELAY_MS, 1000 * 2 ** reconnectAttempt);
  reconnectAttempt += 1;
  console.info(`[finnhub] reconnecting in ${delay}ms (attempt ${reconnectAttempt})`);
  reconnectTimer = setTimeout(() => connect(apiKey), delay);
}

function scheduleClose() {
  if (closeTimer) clearTimeout(closeTimer);
  closeTimer = setTimeout(() => {
    closeTimer = null;
    if (listeners.size === 0 && socket) {
      intentionalClose = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket.close();
      socket = null;
      currentApiKey = null;
    }
  }, CLOSE_GRACE_MS);
}

function connect(apiKey) {
  if (typeof window === "undefined") return;

  intentionalClose = false;
  currentApiKey = apiKey;
  socket = new WebSocket(`${WS_URL}?token=${apiKey}`);

  socket.onopen = () => {
    reconnectAttempt = 0;
    console.info("[finnhub] connected");
    listeners.forEach((_, symbol) => send({ type: "subscribe", symbol }));
  };

  socket.onmessage = (event) => {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch (e) {
      console.warn("[finnhub] unparseable message", event.data);
      return;
    }

    if (msg.type === "trade" && Array.isArray(msg.data)) {
      msg.data.forEach((trade) => {
        const callbacks = listeners.get(trade.s);
        if (!callbacks) return;
        callbacks.forEach((cb) => cb({ price: trade.p, timestamp: trade.t }));
      });
      return;
    }

    // Anything else (an error message, an unrecognized type) is worth
    // seeing rather than silently dropping — this is exactly the kind of
    // failure that would otherwise be invisible.
    if (msg.type !== "ping") {
      console.warn("[finnhub] unexpected message", msg);
    }
  };

  socket.onclose = (event) => {
    console.warn(
      `[finnhub] connection closed (code ${event.code}${
        event.reason ? `: ${event.reason}` : ""
      })`
    );
    socket = null;
    scheduleReconnect(apiKey);
  };

  socket.onerror = (event) => {
    console.warn("[finnhub] connection error", event);
    socket?.close();
  };
}

// Subscribes `callback` to live trades for `symbol`. Returns an unsubscribe
// function — always call it on cleanup (e.g. effect teardown), or the
// connection and its subscriptions leak.
export function subscribeTrades(symbol, apiKey, callback) {
  if (!symbol || !apiKey) return () => {};

  // A new subscriber cancels any pending "last listener left" teardown —
  // this is what makes Strict Mode's mount -> cleanup -> mount safe (see
  // CLOSE_GRACE_MS above): the remount arrives well within the grace window
  // and the in-flight/open connection is reused instead of torn down.
  if (closeTimer) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }

  if (!socket || currentApiKey !== apiKey) {
    if (socket) {
      intentionalClose = true;
      socket.close();
    }
    listeners.clear();
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectAttempt = 0;
    connect(apiKey);
  }

  const isNewSymbol = !listeners.has(symbol);
  if (isNewSymbol) listeners.set(symbol, new Set());
  listeners.get(symbol).add(callback);
  if (isNewSymbol) send({ type: "subscribe", symbol });

  return function unsubscribe() {
    const callbacks = listeners.get(symbol);
    if (!callbacks) return;
    callbacks.delete(callback);
    if (callbacks.size === 0) {
      listeners.delete(symbol);
      send({ type: "unsubscribe", symbol });
    }
    if (listeners.size === 0) {
      // No listeners left — cancel any reconnect a prior drop scheduled
      // (otherwise it'd open a fresh connection with nobody subscribed to
      // it), then tear down the live connection, if any, after the grace
      // window.
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (socket) scheduleClose();
    }
  };
}