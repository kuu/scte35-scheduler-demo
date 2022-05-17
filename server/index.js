const path = require('path');
const fs = require('fs');
const http = require('http');
const {WebSocketServer} = require('ws');
const {createScheduler, deleteScheduler} = require('./scheduler.js');

function requestHander(relativePath, mimeType, res) {
  fs.readFile(path.join(__dirname, relativePath), (err, data) => {
    if (err) {
      console.error(err.stack);
      res.writeHead(500);
      return res.end();
    }
    res.setHeader('Content-Type', mimeType);
    res.writeHead(200);
    res.end(data);
  });
}

const hServer = http.createServer((req, res) => {
  console.log(`[${req.method}] ${req.url}`);
  if (req.url === '/' || req.url === '/index.html') {
    return requestHander('../demo.html', 'text/html', res);
  } else if (req.url === '/dist/bundle.js') {
    return requestHander('../dist/bundle.js', 'application/javascript', res);
  }
  res.writeHead(400);
  res.end();
});

hServer.listen(8000);

const wServer = new WebSocketServer({port: 5001});

function parse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

wServer.on('connection', ws => {
  let context = null;
  ws.on('message', message => {
    console.log(`Received: ${message}`);
    const data = parse(message);
    if (!data) {
      return ws.close('Only accepts JSON string');
    }
    const {command, region, channelId, timeline, timelineLen} = data;
    if (command === 'start') {
      context = createScheduler(region, channelId, timeline, timelineLen, message => {
        ws.send(message);
      });
    } else if (command === 'stop') {
      deleteScheduler(context);
      context = null;
    } else {
      ws.close(`Unsupported command: ${command}`);
    }
  });
});