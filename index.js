var textElement = document.querySelector(".content");

var textContent =
  "Please log in\n\n\n\nUser: ****\nPass: *************\n\n...\n\nAuthorization level C2\n\n\nAll activities are monitored\n\n\n\n$ sudo mkdir /mnt/usb1\n\n$ sudo mount -a\n\n$ /mnt/usb1/rootK17.sh\nPatching kernel...\nPatching gcc...........\nPatching sshd.....\nPatching /dev/urandom..\n\n∞ K17 All Access Pass active! ∞\n\n$ /mnt/usb1/bnet.sh\n\nConnecting to swarm.....................\nOK!\n\nNew swarmlet registered.\n\n\n$ ssh 192.168.0.254                              \n\n\n\n\n".split(
    ""
  );

var frameIndex = 0;
var drawIndex = 0;

function draw(time) {
  window.requestAnimationFrame(draw);
  if (frameIndex % Math.floor(Math.random() * 4 + 4) === 0) {
    textElement.innerHTML =
      textElement.innerHTML + textContent[drawIndex % textContent.length];
    if (textElement.innerHTML.length > 60) {
      textElement.innerHTML = textElement.innerHTML.substr(
        textElement.innerHTML.indexOf("\n") + 1
      );
    }
    drawIndex++;
  }
  frameIndex += 1;
}

draw();
