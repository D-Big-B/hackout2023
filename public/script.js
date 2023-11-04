const socket = io("/");
const videoGrid = document.getElementById("video-grid");
const myPeer = new Peer();

const myVideo = document.createElement("video");
myVideo.muted = true;

const peers = {};
let myVideoStream;

navigator.mediaDevices
  .getUserMedia({
    video: true,
    audio: true,
  })
  .then((stream) => {
    myVideoStream = stream;
    // addVideoStream(myVideo, stream);

    myPeer.on("call", (call) => {
      call.answer(stream);
      const video = document.createElement("video");
      call.on("stream", (userVideoStream) => {
        addVideoStream(video, userVideoStream);
      });
    });

    socket.on("user-connected", (userId) => {
      console.log(userId);
      connectToNewUser(userId, stream);
    });
  });

myPeer.on("open", (id) => {
  socket.emit("join-room", ROOM_ID, id);
});

function connectToNewUser(userId, stream) {
  const call = myPeer.call(userId, stream);
  const video = document.createElement("video");
  call.on("stream", (userVideoStream) => {
    addVideoStream(video, userVideoStream);
  });
  call.on("close", () => {
    video.remove();
  });

  peers[userId] = call;
}

socket.on("user-disconnected", (userId) => {
  if (peers[userId]) peers[userId].close();
});

const setMuteButton = () => {
  const html = `
    <i class="fas fa-microphone"></i>
    <span>Mute</span>
  `;
  document.querySelector(".main__mute_button").innerHTML = html;
};

const setUnmuteButton = () => {
  const html = `
    <i class="unmute fas fa-microphone-slash"></i>
    <span>Unmute</span>
  `;
  document.querySelector(".main__mute_button").innerHTML = html;
};

const setStopVideo = () => {
  const html = `
    <i class="fas fa-video"></i>
    <span>Stop Video</span>
  `;
  document.querySelector(".main__video_button").innerHTML = html;
};

const setPlayVideo = () => {
  const html = `
  <i class="stop fas fa-video-slash"></i>
    <span>Play Video</span>
  `;
  document.querySelector(".main__video_button").innerHTML = html;
};

const inputText = document.getElementById("chat_message");

window.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && inputText.value.length) {
    socket.emit("message", inputText.value);
    inputText.value = "";
  }
});

socket.on("createMessage", (message) => {
  console.log("message", message);
  document.querySelector(
    "ul"
  ).innerHTML += `<li class="message"><b>user</b><br/>${message}</li>`;
  scrollToBottom();
});

function addVideoStream(video, stream) {
  video.srcObject = stream;
  video.id = "video";
  video.addEventListener("loadedmetadata", () => {
    video.play();
  });
  videoGrid.append(video);
}

const scrollToBottom = () => {
  document
    .querySelector(".main__chat__window")
    .scrollTo(0, document.querySelector(".main__chat__window").scrollHeight);
};

const muteUnmute = () => {
  const enabled = myVideoStream.getAudioTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getAudioTracks()[0].enabled = false;
    setUnmuteButton();
  } else {
    setMuteButton();
    myVideoStream.getAudioTracks()[0].enabled = true;
  }
};

const playStop = () => {
  let enabled = myVideoStream.getVideoTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getVideoTracks()[0].enabled = false;
    setPlayVideo();
  } else {
    setStopVideo();
    myVideoStream.getVideoTracks()[0].enabled = true;
  }
};
