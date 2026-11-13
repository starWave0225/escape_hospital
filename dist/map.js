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
    const cells = [{ id: hallId, x: 15, y: 100, width: 482, height: 48 }];
    for (const door of hall.doors) {
      const x = 15 + 482 * door.x / hall.width;
      const stairs = door.id === "stairs";
      cells.push({ id: door.target, x: x - 29, y: 35, width: 58, height: 46, stairs, doorX: x });
    }
    return cells;
  }

  function draw(id, visited, player) {
    const scene = scenes[id];
    const cells = plan(scene.floor);
    const selected = cells.find((cell) => cell.id === id);
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

    for (const cell of cells) {
      const active = cell === selected;
      const seen = visited.has(cell.id);
      context.fillStyle = active ? "#375448" : seen ? "#233930" : "#14231d";
      context.strokeStyle = active ? "#9bc8a8" : seen ? "#638370" : "#415d50";
      context.lineWidth = 2;
      if (cell.doorX !== undefined) {
        context.beginPath();
        context.moveTo(cell.doorX, cell.y + cell.height);
        context.lineTo(cell.doorX, cells[0].y + 2);
        context.stroke();
      }
      context.fillRect(cell.x, cell.y, cell.width, cell.height);
      context.strokeRect(cell.x, cell.y, cell.width, cell.height);
      if (cell.doorX !== undefined) {
        context.fillStyle = cell.stairs ? "#e4b879" : "#a0b8a6";
        context.fillRect(cell.doorX - 5, cells[0].y - 4, 10, 8);
      }
      if (cell.stairs) {
        context.fillStyle = "#e4b879";
        context.textAlign = "center";
        context.font = "20px sans-serif";
        context.fillText("↑↓", cell.doorX, cell.y + 29);
      }
    }

    const x = selected.x + 9 + (selected.width - 18) * player.x / scene.width;
    const y = selected.y + 9 + (selected.height - 18) * player.depth;
    context.save();
    context.translate(x, y);
    context.rotate(player.direction);
    context.beginPath();
    context.moveTo(15, 0);
    context.lineTo(-10, 11);
    context.lineTo(-6, 0);
    context.lineTo(-10, -11);
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
    label.textContent = scene.floor + " / " + scene.name;
    const sections = floors.map((floor) => {
      const section = document.createElement("section");
      section.className = "map-floor";
      section.classList.toggle("current", scene.floor === floor.id);
      const heading = document.createElement("h3");
      heading.textContent = floor.name;
      const code = document.createElement("span");
      code.textContent = floor.id;
      heading.append(code);
      const row = document.createElement("div");
      row.className = "map-rooms";
      const cells = plan(floor.id);
      cells.slice(1).forEach((cell) => row.append(mapCell(cell.id, cell.stairs ? "↑↓ 楼梯" : scenes[cell.id].name)));
      const hall = mapCell(cells[0].id, "走廊");
      hall.classList.add("map-hall");
      section.append(heading, row, hall);
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
