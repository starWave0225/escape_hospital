"use strict";

const Quake = (() => {
  const canvas = document.getElementById("quake");
  const context = canvas.getContext("2d");
  const cracksByScene = new Map();
  let cracks = [];
  let debris = [];
  let dust = [];
  let width = 0;
  let height = 0;
  const between = (min, max) => min + Math.random() * (max - min);

  function enter(id, sceneWidth, sceneHeight) {
    width = sceneWidth;
    height = sceneHeight;
    canvas.width = width;
    canvas.height = height;
    if (!cracksByScene.has(id)) cracksByScene.set(id, []);
    cracks = cracksByScene.get(id);
    for (const crack of cracks) crack.age = .4;
    debris = [];
    dust = [];
    draw();
  }

  function reset() {
    cracksByScene.clear();
    cracks = [];
    clearAir();
  }

  function clearAir() {
    debris = [];
    dust = [];
    for (const crack of cracks) crack.age = .4;
    draw();
  }

  function fracture(x, y, strength) {
    const length = between(105, 165) * strength;
    const onFloor = (value) => Math.max(y - 25, Math.min(y + 30, value));
    const points = [[x - length / 2, y + between(-11, 11)]];
    for (let i = 1; i <= 14; i++) {
      const [previousX, previousY] = points.at(-1);
      points.push([previousX + length * between(.04, .1), onFloor(previousY + between(-9, 9))]);
    }
    const branches = [3, 7, 10].map((index) => {
      const [startX, startY] = points[index];
      const side = index === 7 ? 1 : -1;
      return [points[index], [startX + between(9, 20), onFloor(startY + side * 11)],
        [startX + between(22, 35), onFloor(startY + side * 17)]];
    });
    cracks.push({ points, branches, age: 0 });
    if (cracks.length > 14) cracks.shift();
  }

  function shake({ left, right, ceiling, floor, playerX, strength }) {
    const span = right - left;
    const spaceLeft = playerX - left;
    const side = spaceLeft > span - spaceLeft ? -1 : 1;
    const x = Math.min(right - span * .16, Math.max(left + span * .16, playerX + side * span * .23));
    fracture(x, floor + 30, strength);

    for (const center of [left + span * .28, x, left + span * .76]) {
      for (let i = 0; i < 8; i++) {
        debris.push({
          x: center + between(-55, 55), y: ceiling - between(6, 30), floor: floor + between(-5, 45),
          vx: between(-38, 38), vy: between(36, 125), size: between(1.5, 6) * strength,
          angle: between(0, Math.PI), spin: between(-8, 8), delay: between(0, .16),
        });
      }
    }
    draw();
  }

  function update(elapsed) {
    if (!debris.length && !dust.length && !cracks.some((crack) => crack.age < .4)) return;
    for (const crack of cracks) crack.age = Math.min(.4, crack.age + elapsed);
    debris = debris.filter((chip) => {
      chip.delay -= elapsed;
      if (chip.delay > 0) return true;
      chip.vy += 1100 * elapsed;
      chip.y += chip.vy * elapsed;
      chip.x += chip.vx * elapsed;
      chip.angle += chip.spin * elapsed;
      if (chip.y < chip.floor) return true;
      dust.push({ x: chip.x, y: chip.floor, age: 0, size: chip.size });
      return false;
    });
    for (const puff of dust) puff.age += elapsed;
    dust = dust.filter((puff) => puff.age < .42);
    draw();
  }

  function draw() {
    context.clearRect(0, 0, width, height);
    context.lineJoin = "round";
    for (const { points, branches, age } of cracks) {
      const last = Math.min(points.length, 2 + Math.floor(age / .4 * points.length));
      const paths = [points.slice(0, last), ...branches.filter((branch) => points.indexOf(branch[0]) < last - 1)];
      trace(paths, 1);
      context.strokeStyle = "#a8a28c68";
      context.lineWidth = 1.5;
      context.stroke();
      trace(paths, 0);
      context.strokeStyle = "#111410c9";
      context.lineWidth = 1.8;
      context.stroke();
    }
    for (const { x, y, angle, size, delay } of debris) {
      if (delay > 0) continue;
      context.save();
      context.translate(x, y);
      context.rotate(angle);
      context.beginPath();
      context.moveTo(-size, -size * .3);
      context.lineTo(size * .25, -size);
      context.lineTo(size, size * .6);
      context.lineTo(-size * .5, size * .8);
      context.closePath();
      context.fillStyle = "#ada795";
      context.strokeStyle = "#514b40";
      context.lineWidth = 1.1;
      context.fill();
      context.stroke();
      context.restore();
    }
    for (const { x, y, age, size } of dust) {
      context.fillStyle = "rgba(174, 166, 146," + (.22 * (1 - age / .42)) + ")";
      context.beginPath();
      context.ellipse(x, y, size + age * 22, size * .45 + age * 6, 0, 0, Math.PI * 2);
      context.fill();
    }
  }

  function trace(paths, offset) {
    context.beginPath();
    for (const [start, ...points] of paths) {
      context.moveTo(start[0], start[1] + offset);
      for (const [x, y] of points) context.lineTo(x, y + offset);
    }
  }

  return { enter, reset, clearAir, shake, update };
})();
