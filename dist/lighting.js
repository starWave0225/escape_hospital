"use strict";

const Lighting = (() => {
  const canvas = document.getElementById("lighting");
  const context = canvas.getContext("2d");
  const resolution = .5;

  function resize(width, height) {
    canvas.width = Math.max(1, Math.ceil(width * resolution));
    canvas.height = Math.max(1, Math.ceil(height * resolution));
  }

  function cone(length, angle, stops) {
    const gradient = context.createRadialGradient(0, 0, 0, 0, 0, length);
    for (const [position, color] of stops) gradient.addColorStop(position, color);
    context.fillStyle = gradient;
    context.beginPath();
    context.moveTo(0, 0);
    context.arc(0, 0, length, -angle, angle);
    context.closePath();
    context.fill();
  }

  function draw({ dark, enabled, x, y, direction }) {
    canvas.hidden = !dark && !enabled;
    if (canvas.hidden) return;

    const { width, height } = canvas;
    context.clearRect(0, 0, width, height);
    if (dark) {
      context.fillStyle = "rgba(2, 7, 10, .977)";
      context.fillRect(0, 0, width, height);
    }

    context.save();
    context.translate(x * resolution, y * resolution);
    context.scale(resolution, resolution);
    if (dark) {
      // A trace of ambient light at arm's reach keeps the player's silhouette readable.
      const ambient = context.createRadialGradient(0, 18, 4, 0, 18, 109);
      ambient.addColorStop(0, "rgba(0,0,0,.30)");
      ambient.addColorStop(1, "transparent");
      context.globalCompositeOperation = "destination-out";
      context.fillStyle = ambient;
      context.fillRect(-109, -91, 218, 218);
    }

    if (enabled) {
      context.rotate(direction);
      const length = 450 - 200 * Math.abs(Math.sin(direction));
      if (dark) {
        for (const angle of [.37, .31, .25]) {
          cone(length, angle, [[0, "rgba(0,0,0,.52)"], [.45, "rgba(0,0,0,.46)"], [1, "transparent"]]);
        }
      }
      context.globalCompositeOperation = "source-over";
      cone(length, .27, [[0, "rgba(255,237,189,.17)"], [.36, "rgba(246,232,193,.10)"], [1, "transparent"]]);
      const lens = context.createRadialGradient(0, 0, 0, 0, 0, 15);
      lens.addColorStop(0, "rgba(255,248,212,.9)");
      lens.addColorStop(.25, "rgba(255,240,192,.55)");
      lens.addColorStop(1, "transparent");
      context.fillStyle = lens;
      context.fillRect(-15, -15, 30, 30);
    }
    context.restore();
  }

  return { resize, draw };
})();
