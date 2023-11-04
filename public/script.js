console.log("Hello");
class VRButton {
  static createButton(renderer) {
    const button = document.createElement("button");

    function showEnterVR(/*device*/) {
      let currentSession = null;

      async function onSessionStarted(session) {
        session.addEventListener("end", onSessionEnded);

        await renderer.xr.setSession(session);
        button.textContent = "EXIT VR";

        currentSession = session;
      }

      function onSessionEnded(/*event*/) {
        currentSession.removeEventListener("end", onSessionEnded);

        button.textContent = "ENTER VR";

        currentSession = null;
      }

      //

      button.style.display = "";

      button.style.cursor = "pointer";
      button.style.left = "calc(50% - 50px)";
      button.style.width = "100px";

      button.textContent = "ENTER VR";

      button.onmouseenter = function () {
        button.style.opacity = "1.0";
      };

      button.onmouseleave = function () {
        button.style.opacity = "0.5";
      };

      button.onclick = function () {
        if (currentSession === null) {
          // WebXR's requestReferenceSpace only works if the corresponding feature
          // was requested at session creation time. For simplicity, just ask for
          // the interesting ones as optional features, but be aware that the
          // requestReferenceSpace call will fail if it turns out to be unavailable.
          // ('local' is always available for immersive sessions and doesn't need to
          // be requested separately.)

          const sessionInit = {
            optionalFeatures: [
              "local-floor",
              "bounded-floor",
              "hand-tracking",
              "layers",
            ],
          };
          navigator.xr
            .requestSession("immersive-vr", sessionInit)
            .then(onSessionStarted);
        } else {
          currentSession.end();
        }
      };
    }

    function disableButton() {
      button.style.display = "";

      button.style.cursor = "auto";
      button.style.left = "calc(50% - 75px)";
      button.style.width = "150px";

      button.onmouseenter = null;
      button.onmouseleave = null;

      button.onclick = null;
    }

    function showWebXRNotFound() {
      disableButton();

      button.textContent = "VR NOT SUPPORTED";
    }

    function showVRNotAllowed(exception) {
      disableButton();

      console.warn(
        "Exception when trying to call xr.isSessionSupported",
        exception
      );

      button.textContent = "VR NOT ALLOWED";
    }

    function stylizeElement(element) {
      element.style.position = "absolute";
      element.style.bottom = "20px";
      element.style.padding = "12px 6px";
      element.style.border = "1px solid #fff";
      element.style.borderRadius = "4px";
      element.style.background = "rgba(0,0,0,0.1)";
      element.style.color = "#fff";
      element.style.font = "normal 13px sans-serif";
      element.style.textAlign = "center";
      element.style.opacity = "0.5";
      element.style.outline = "none";
      element.style.zIndex = "999";
    }

    if ("xr" in navigator) {
      button.id = "VRButton";
      button.style.display = "none";

      stylizeElement(button);

      navigator.xr
        .isSessionSupported("immersive-vr")
        .then(function (supported) {
          supported ? showEnterVR() : showWebXRNotFound();

          if (supported && VRButton.xrSessionIsGranted) {
            button.click();
          }
        })
        .catch(showVRNotAllowed);

      return button;
    } else {
      const message = document.createElement("a");

      if (window.isSecureContext === false) {
        message.href = document.location.href.replace(/^http:/, "https:");
        message.innerHTML = "WEBXR NEEDS HTTPS"; // TODO Improve message
      } else {
        message.href = "https://immersiveweb.dev/";
        message.innerHTML = "WEBXR NOT AVAILABLE";
      }

      message.style.left = "calc(50% - 90px)";
      message.style.width = "180px";
      message.style.textDecoration = "none";

      stylizeElement(message);

      return message;
    }
  }

  static registerSessionGrantedListener() {
    if (typeof navigator !== "undefined" && "xr" in navigator) {
      // WebXRViewer (based on Firefox) has a bug where addEventListener
      // throws a silent exception and aborts execution entirely.
      if (/WebXRViewer\//i.test(navigator.userAgent)) return;

      navigator.xr.addEventListener("sessiongranted", () => {
        VRButton.xrSessionIsGranted = true;
      });
    }
  }
}

VRButton.xrSessionIsGranted = false;
VRButton.registerSessionGrantedListener();
const VRObject = new VRButton();
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
