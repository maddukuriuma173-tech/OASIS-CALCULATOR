// OASIS Calculator - Local Hosting Server (Zero-Dependency Node.js)
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8000;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.png': 'image/png',
    '.txt': 'text/plain',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    // Decode URI to support spaces or special characters in filenames
    const decodedUrl = decodeURIComponent(req.url);
    let filePath = path.join(PUBLIC_DIR, decodedUrl === '/' ? 'index.html' : decodedUrl);
    
    // Prevent directory traversal exploits (security standard)
    if (!filePath.startsWith(PUBLIC_DIR)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Access Denied');
        return;
    }
    
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    
    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('404 File Not Found');
            } else {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end(`500 Server Error: ${err.code}`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`\n====================================================`);
    console.log(`OASIS Calculator Server is now running!`);
    console.log(`URL: http://localhost:${PORT}/ or http://127.0.0.1:${PORT}/`);
    console.log(`Press Ctrl+C in your command line window to stop.`);
    console.log(`====================================================\n`);
});
