"use strict";

const HospitalMap = (() => {
  const { floors, scenes } = Hospital;
  const canvas = document.getElementById("map-canvas");
  const context = canvas.getContext("2d");
  const label = document.getElementById("map-position");
  const floorList = document.getElementById("floors");

  function plan(floorId) {
    const hallId = floorId + "-hall";
    const hall = scenes[hallId];
    const cells = [{ id: hallId, x: 15, y: 68, width: 482, height: 40 }];
    for (const door of hall.doors) {
      if (door.hallucination) continue;
      const x = 24 + 464 * door.x / hall.width;
      const stairs = door.id === "stairs";
      const north = door.side === "north";
      const room = scenes[door.target];
      const entrance = room.doors.find((portal) => portal.id === door.arrival);
      cells.push({
        id: door.target, x: x - (9 + 50 * entrance.x / room.width), y: north ? 10 : 124,
        width: 68, height: 42, stairs, doorX: x, north,
        stairDirections: room.doors.filter((portal) => portal.verb !== "开门").map((portal) => portal.id === "up" ? "↑" : "↓").join(""),
      });
    }
    return cells;
  }

  function draw(id, visited, player) {
    const scene = scenes[id];
    const cells = plan(scene.floor);
    const selected = scene.hallucination
      ? { id, x: 154, y: 35, width: 204, height: 106 }
      : cells.find((cell) => cell.id === id);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "#a9cfb014";
    context.lineWidth = 1;
    context.beginPath();
    for (let x = 16; x < canvas.width; x += 16) {
      context.moveTo(x, 0);
      context.lineTo(x, canvas.height);
    }
    for (let y = 16; y < canvas.height; y += 16) {
      context.moveTo(0, y);
      context.lineTo(canvas.width, y);
    }
    context.stroke();

    for (const cell of scene.hallucination ? [selected] : cells) {
      const active = cell === selected;
      const seen = visited.has(cell.id);
      context.fillStyle = scene.hallucination ? "#35262e" : active ? "#375448" : seen ? "#233930" : "#14231d";
      context.strokeStyle = scene.hallucination ? "#9b707c" : active ? "#9bc8a8" : seen ? "#638370" : "#415d50";
      context.lineWidth = 2;
      const hallEdge = cell.north ? cells[0].y : cells[0].y + cells[0].height;
      const roomEdge = cell.north ? cell.y + cell.height : cell.y;
      if (cell.doorX !== undefined) {
        context.beginPath();
        context.moveTo(cell.doorX, roomEdge);
        context.lineTo(cell.doorX, hallEdge);
        context.stroke();
      }
      context.fillRect(cell.x, cell.y, cell.width, cell.height);
      context.strokeRect(cell.x, cell.y, cell.width, cell.height);
      if (cell.doorX !== undefined) {
        context.fillStyle = cell.stairs ? "#e4b879" : "#a0b8a6";
        context.fillRect(cell.doorX - 5, hallEdge - 3, 10, 6);
        context.fillRect(cell.doorX - 4, roomEdge - 2, 8, 4);
      }
      if (cell.stairs) {
        context.fillStyle = "#e4b879";
        context.textAlign = "center";
        context.font = "20px sans-serif";
        context.fillText(cell.stairDirections, cell.doorX, cell.y + 26);
      }
    }

    const x = selected.x + 9 + (selected.width - 18) * player.x / scene.width;
    const y = selected.y + 9 + (selected.height - 18) * player.depth;
    context.save();
    context.translate(x, y);
    context.rotate(player.direction);
    context.beginPath();
    context.moveTo(12, 0);
    context.lineTo(-8, 8);
    context.lineTo(-5, 0);
    context.lineTo(-8, -8);
    context.closePath();
    context.lineWidth = 3;
    context.strokeStyle = "#141b13";
    context.fillStyle = "#ffe2a7";
    context.stroke();
    context.fill();
    context.restore();
  }

  function update(id, visited) {
    const scene = scenes[id];
    label.textContent = (scene.hallucination ? "？" : scene.floor) + " / " + scene.name;
    const sections = floors.map((floor) => {
      const section = document.createElement("section");
      section.className = "map-floor";
      section.classList.toggle("current", scene.floor === floor.id);
      const heading = document.createElement("h3");
      heading.textContent = floor.name;
      const code = document.createElement("span");
      code.textContent = floor.id;
      heading.append(code);
      const cells = plan(floor.id);
      const north = document.createElement("div");
      const south = document.createElement("div");
      north.className = "map-rooms north";
      south.className = "map-rooms south";
      cells.slice(1).forEach((cell, index) => {
        const entry = mapCell(cell.id, cell.stairs ? cell.stairDirections + " 楼梯" : scenes[cell.id].name);
        entry.style.gridColumn = index + 1;
        (cell.north ? north : south).append(entry);
      });
      const hall = mapCell(cells[0].id, "走廊");
      hall.classList.add("map-hall");
      section.append(heading, north, hall, south);
      return section;
    });
    floorList.replaceChildren(...sections);

    function mapCell(cellId, name) {
      const cell = document.createElement("span");
      cell.className = "map-cell";
      cell.textContent = name;
      cell.classList.toggle("visited", visited.has(cellId));
      if (cellId === id) {
        cell.classList.add("here");
        cell.setAttribute("aria-current", "location");
      }
      return cell;
    }
  }

  return { draw, update };
})();
