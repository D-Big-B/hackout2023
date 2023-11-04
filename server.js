// const express = require("express");
import express from "express";

const app = express();
import httpserver from "http";
const server = httpserver.Server(app);
// const server = require("http").Server(app);
// const io = require("socket.io")(server);
// import ioModule from "socket.io";
// const io = ioModule(server);
import { Server } from "socket.io";

const io = new Server(server);
import { ExpressPeerServer } from "peer";
// const { ExpressPeerServer } = require("peer");
const peerServer = ExpressPeerServer(server, {
  debug: true,
});
import { VRButton } from "three/addons/webxr/VRButton.js";
// const {
//   VRButton,
// } = require("./node_modules/three/examples/jsm/webxr/VRButton.js");
// const { v4: uuidV4 } = require("uuid");
import { v4 as uuidV4 } from "uuid";
app.use("/peerjs", peerServer);

app.set("view engine", "ejs");
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.redirect(`/${uuidV4()}`);
});

app.get("/:room", (req, res) => {
  res.render("room", { roomId: req.params.room, VRButton });
});

io.on("connection", (socket) => {
  socket.on("join-room", (roomId, userId) => {
    socket.join(roomId);
    socket.broadcast.emit("user-connected", userId);

    socket.on("message", (message) => {
      io.to(roomId).emit("createMessage", message);
    });

    socket.on("disconnect", () => {
      socket.broadcast.emit("user-disconnected", userId);
    });
  });
});

server.listen(process.env.PORT || 3030);
