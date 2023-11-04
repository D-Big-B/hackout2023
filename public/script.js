console.log("Hello");

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
  video.style.display = "none";

  videoGrid.append(video);
  video.addEventListener("play", function () {
    const width = video.videoWidth;
    const height = video.videoHeight;
    canvas.width = width;
    canvas.height = height;

    function processVideo() {
      if (!video.paused && !video.ended) {
        ctx.drawImage(video, 0, 0, width, height);

        // Capture the current frame
        const frameData = ctx.getImageData(0, 0, width, height);
        const frame = frameData.data;

        // Perform your custom background subtraction logic here
        // For simplicity, let's assume we're removing pixels with a certain color (e.g., green background)

        for (let i = 0; i < frame.length; i += 4) {
          const r = frame[i];
          const g = frame[i + 1];
          const b = frame[i + 2];

          if (g > r && g > b) {
            // This pixel is considered part of the background (e.g., it's green)
            frame[i] = frame[i + 1] = frame[i + 2] = frame[i + 3] = 0; // Set it to transparent
          }
        }

        // Put the modified frame back on the canvas
        ctx.putImageData(frameData, 0, 0);

        // Request the next animation frame
        requestAnimationFrame(processVideo);
      }
    }
    processVideo();
  });
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
