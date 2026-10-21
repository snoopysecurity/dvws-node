const { WebSocketServer, WebSocket } = require('ws');
const jwt = require('jsonwebtoken');
const { listForUser, markRead } = require('./notifications');

const jwtOptions = {
  expiresIn: '2d',
  issuer: 'https://github.com/snoopysecurity',
  algorithms: ['HS256', 'none'],
  ignoreExpiration: true
};
const clients = new Map();

function cookieValue(header, name) {
  const item = (header || '').split(';').map((value) => value.trim()).find((value) => value.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : null;
}

function send(websocket, message) {
  if (websocket.readyState === WebSocket.OPEN) websocket.send(JSON.stringify(message));
}

function broadcast(username, message) {
  for (const websocket of clients.get(username) || []) send(websocket, message);
}

function attachNotificationWebSocket(server) {
  const wss = new WebSocketServer({ noServer: true });
  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname !== '/ws/notifications') return;

    let identity;
    try {
      const token = cookieValue(request.headers.cookie, 'auth_token');
      identity = jwt.verify(token, process.env.JWT_SECRET, jwtOptions);
      if (!identity || typeof identity.user !== 'string') throw new Error('Invalid token');
    } catch (_error) {
      socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }

    // Deliberately vulnerable: the authenticated upgrade does not validate
    // request.headers.origin, allowing a cross-site WebSocket handshake.
    wss.handleUpgrade(request, socket, head, (websocket) => {
      wss.emit('connection', websocket, request, identity.user);
    });
  });

  wss.on('connection', async (websocket, _request, username) => {
    const userClients = clients.get(username) || new Set();
    userClients.add(websocket);
    clients.set(username, userClients);
    websocket.on('close', () => {
      const sockets = clients.get(username);
      if (!sockets) return;
      sockets.delete(websocket);
      if (sockets.size === 0) clients.delete(username);
    });
    try {
      send(websocket, { type: 'snapshot', notifications: await listForUser(username) });
    } catch (_error) {
      websocket.close(1011, 'Could not load notifications');
      return;
    }

    websocket.on('message', async (raw) => {
      let message;
      try { message = JSON.parse(raw.toString()); } catch (_error) { return; }
      if (message.type !== 'mark-read' || typeof message.id !== 'string') return;

      const notification = await markRead(username, message.id);
      if (!notification) {
        return send(websocket, { type: 'read', id: message.id, success: false });
      }
      broadcast(username, { type: 'notification-updated', notification });
      send(websocket, { type: 'read', id: notification._id.toString(), success: true });
    });
  });
}

module.exports = { attachNotificationWebSocket, broadcast };
