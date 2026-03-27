// server.js
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// Configurăm Socket.io cu CORS (ca să permită conexiuni de la telefon)
const io = new Server(server, {
    cors: {
        origin: "*", // Permite orice conexiune (bun pentru hackathon)
        methods: ["GET", "POST"]
    }
});

let drawingHistory = []; // Păstrăm tot graffiti-ul aici

io.on('connection', (socket) => {
    console.log('Un utilizator s-a conectat: ' + socket.id);

    // Când un user se conectează, îi trimitem istoricul desenului existent
    socket.emit('initHistory', drawingHistory);

    // Ascultăm când cineva termină de desenat o linie nouă
    socket.on('sendLine', (newLine) => {
        // Salvăm linia în istoric
        drawingHistory.push(newLine);
        // Trimitem linia TUTUROR celorlalți utilizatori conectați (broadcast)
        socket.broadcast.emit('newLine', newLine);
        console.log('Linie nouă primită și trimisă mai departe.');
    });

    // Gestionăm curățarea ecranului
    socket.on('requestClear', () => {
        drawingHistory = [];
        io.emit('clearCanvas'); // Anunțăm pe toată lumea să șteargă
        console.log('Canvas-ul a fost șters de un utilizator.');
    });

    socket.on('disconnect', () => {
        console.log('Un utilizator s-a deconectat.');
    });
});

// Pornim serverul pe portul 3000
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Serverul iTEC:OVERRIDE rulează pe http://localhost:${PORT}`);
});