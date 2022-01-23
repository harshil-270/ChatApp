const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const socketio = require("socket.io");
const http = require("http");
const path = require("path");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const { CLIENT_URL } = require("./config/config");
var io = socketio(server, {
    cors: {
        origin: CLIENT_URL,
        credentials: true,
    },
});

io.on("connection", (socket) => {
    socket.on("join", ({ rooms }) => {
        socket.join(rooms);
    });
    socket.on("sendMessage", (data) => {
        io.to(data.room).emit("message", data);
    });
    socket.on("typing", (data) => {
        io.to(data.room).emit("typingDisplay", data);
    });
});

app.use("/uploads", express.static("uploads"));
app.use(express.json());
app.use(cors());

const userRouter = require("./routes/userRouter");
const messageRouter = require("./routes/messageRouter");
app.use("/users", userRouter);
app.use("/messages", messageRouter);

// Serve static assets if in production
if (process.env.NODE_ENV === "production") {
    app.use(express.static("frontend/build"));
    app.get("*", (req, res) => {
        res.sendFile(path.resolve(__dirname, "frontend", "build", "index.html"));
    });
}

mongoose.connect(
    process.env.MONGO_URI,
    { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true, useFindAndModify: false },
    (err) => {
        if (err) throw err;
        console.log("MongoDB is connected");
    }
);

const port = process.env.PORT || 5000;
server.listen(port, () => {
    console.log(`Server is up and running at port: ${port}`);
});
