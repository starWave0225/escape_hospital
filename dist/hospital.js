/*
 * Every portal names its destination scene and the matching arrival portal.
 * Door x coordinates are in scene pixels. Depth is measured at the player's feet.
 */
const Hospital = (() => {
  const floors = [
    { id: "3F", name: "三层", rooms: ["301 室", "302 室", "303 室"] },
    { id: "2F", name: "二层", rooms: ["201 病房", "202 室", "203 室"] },
    { id: "1F", name: "一层", rooms: ["101 室", "102 室", "103 室"] },
    { id: "B1", name: "地下室", rooms: ["B01 室", "B02 室", "B03 室"] },
  ];
  const scenes = {};
  const start = "2F-room-1";
  // Threshold and frame height are measured in the rendered 600px-high scene.
  const geometry = {
    corridor: {
      floorY: 444, doorHeight: 260,
      outlines: {
        "room-1": [66, 190, 123, 252],
        "room-2": [651, 170, 219, 272],
        "room-3": [930, 170, 219, 272],
        stairs: [1611, 190, 123, 252],
      },
    },
    ward: { floorY: 456, doorHeight: 264, outlines: { return: [713, 188, 148, 265] } },
    room: { floorY: 483, doorHeight: 332, outlines: { return: [96, 152, 128, 332] } },
    stairs: {
      floorY: 459, doorHeight: 335,
      outlines: { hall: [382, 117, 155, 340], down: [71, 122, 181, 335], up: [655, 123, 194, 334] },
    },
  };
  const door = (id, x, label, target, arrival, verb = "开门") =>
    ({ id, x, label, target, arrival, verb });

  floors.forEach((floor, index) => {
    const { id, rooms } = floor;
    const hall = id + "-hall";
    const stairs = id + "-stairs";
    const doors = rooms.map((label, slot) =>
      door("room-" + (slot + 1), [128, 766, 1035][slot], label, id + "-room-" + (slot + 1), "return")
    );
    doors.push(door("stairs", 1672, "楼梯间", stairs, "hall"));
    scenes[hall] = { floor: id, name: "走廊", art: "corridor", width: 1800, doors };

    rooms.forEach((name, slot) => {
      const roomId = id + "-room-" + (slot + 1);
      const ward = roomId === start;
      scenes[roomId] = {
        floor: id, name, art: ward ? "ward" : "room", width: 900,
        doors: [door("return", ward ? 787 : 160, "返回走廊", hall, "room-" + (slot + 1))],
      };
    });

    const stairDoors = [door("hall", 458, "返回走廊", hall, "stairs")];
    const upper = floors[index - 1];
    const lower = floors[index + 1];
    if (upper) stairDoors.push(door("up", 750, "上楼 · " + upper.id, upper.id + "-stairs", "down", "上楼"));
    if (lower) stairDoors.push(door("down", 167, "下楼 · " + lower.id, lower.id + "-stairs", "up", "下楼"));
    scenes[stairs] = { floor: id, name: "楼梯间", art: "stairs", width: 900, doors: stairDoors };
  });

  for (const scene of Object.values(scenes)) {
    Object.assign(scene, geometry[scene.art]);
    scene.back = scene.floorY + (scene.art === "ward" ? 16 : 8);
    scene.front = 552;
    for (const portal of scene.doors) {
      portal.y = scene.back + 9;
      portal.outline = scene.outlines[portal.id];
    }
  }

  return { floors, scenes, start };
})();
