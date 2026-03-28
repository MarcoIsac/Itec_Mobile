const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// Acum stocăm istoricul pe camere (ex: { "PARTER-01": [linie1, linie2], "ETAJ-02": [linie1] })
let roomsHistory = {};

io.on('connection', (socket) => {
    console.log('User conectat: ' + socket.id);

    // 1. Userul cere să intre într-o cameră (afiș)
    socket.on('joinRoom', (roomId) => {
        socket.join(roomId);
        console.log(`Userul ${socket.id} a intrat în camera/afișul: ${roomId}`);

        // Dacă afișul nu există în memorie, îl creăm
        if (!roomsHistory[roomId]) {
            roomsHistory[roomId] = [];
        }

        // Îi trimitem DOAR istoricul acelui afiș
        socket.emit('initHistory', roomsHistory[roomId]);
    });

    // 2. Userul desenează ceva pe afișul lui
    socket.on('sendLine', (data) => {
        // data conține { line: newLine, roomId: "PARTER-01" }
        const { line, roomId } = data;

        if (roomsHistory[roomId]) {
            roomsHistory[roomId].push(line);
            // Trimitem linia DOAR celorlalți useri din aceeași cameră (socket.to)
            socket.to(roomId).emit('newLine', line);
        }
    });

    // 3. Userul șterge afișul
    socket.on('requestClear', (roomId) => {
        roomsHistory[roomId] = [];
        io.to(roomId).emit('clearCanvas');
        console.log(`Afișul ${roomId} a fost șters.`);
    });

    socket.on('disconnect', () => {
        console.log('User deconectat: ' + socket.id);
    });
});

server.listen(3000, () => {
    console.log(`Serverul iTEC cu ROOMS rulează pe http://localhost:3000`);
});