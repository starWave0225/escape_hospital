/*
 * Every portal names its destination scene and the matching arrival portal.
 * Door x coordinates are in scene pixels. Depth is measured at the player's feet.
 */
const Hospital = (() => {
  const floors = [
    { id: "3F", name: "三层", rooms: ["301 旧病房", "302 档案室", "303 观察室"] },
    { id: "2F", name: "二层", rooms: ["201 病房", "202 值班室", "203 处置室"] },
    { id: "1F", name: "一层", rooms: ["101 检查室", "102 药房", "103 挂号室"] },
    { id: "B1", name: "地下室", rooms: ["B01 配电室", "B02 洗衣房", "B03 设备间"] },
  ];
  const scenes = {};
  const start = "2F-room-1";
  const corridorArtWidth = 1800;
  const corridorWidth = 2040;
  // Threshold and frame height are measured in the rendered 600px-high scene.
  const geometry = {
    ward: { floorY: 456, doorHeight: 264 },
    stairs: {
      floorY: 459, doorHeight: 335,
      outlines: { down: [71, 122, 181, 335], up: [655, 123, 194, 334] },
    },
  };
  const door = (id, x, side, label, target, arrival, verb = "开门") =>
    ({ id, x, side, label, target, arrival, verb });
  const artworkGeometry = {
    "corridor-1f": { floorY: 448, doorHeight: 257, outlines: { "room-1": [65, 190, 163, 257], stairs: [1575, 190, 163, 257] } },
    "corridor-2f": { floorY: 472, doorHeight: 266, outlines: { "room-1": [50, 200, 184, 269], stairs: [1583, 200, 187, 269] } },
    "corridor-3f": { floorY: 459, doorHeight: 256, outlines: { "room-1": [62, 201, 185, 257], stairs: [1554, 201, 185, 257] } },
    "corridor-b1": { floorY: 460, doorHeight: 230, outlines: { "room-1": [61, 228, 187, 232], stairs: [1551, 228, 188, 232] } },
    "room-101": { floorY: 455, doorHeight: 295 },
    "room-102": { floorY: 471, doorHeight: 341, outlines: { return: [134, 129, 124, 342] } },
    "room-103": { floorY: 470, doorHeight: 347, outlines: { return: [112, 120, 128, 350] } },
    "room-202": { floorY: 477, doorHeight: 354, outlines: { return: [111, 105, 135, 370] } },
    "room-203": { floorY: 462, doorHeight: 366, outlines: { return: [103, 93, 144, 368] } },
    "room-301": { floorY: 465, doorHeight: 300 },
    "room-302": { floorY: 478, doorHeight: 324, outlines: { return: [113, 149, 132, 326] } },
    "room-303": { floorY: 471, doorHeight: 320, outlines: { return: [122, 148, 123, 322] } },
    "room-b01": { floorY: 468, doorHeight: 295 },
    "room-b02": { floorY: 464, doorHeight: 329, outlines: { return: [116, 131, 134, 329] } },
    "room-b03": { floorY: 469, doorHeight: 340, outlines: { return: [120, 126, 126, 340] } },
  };

  floors.forEach((floor, index) => {
    const { id, rooms } = floor;
    const hall = id + "-hall";
    const stairs = id + "-stairs";
    const hallArt = "corridor-" + id.toLowerCase();
    const hallGeometry = artworkGeometry[hallArt];
    const corridorScale = corridorWidth / corridorArtWidth;
    const doorCenter = (key) => {
      const [left, , width] = hallGeometry.outlines[key];
      return left + width / 2;
    };
    const doors = rooms.map((label, slot) =>
      door("room-" + (slot + 1), [doorCenter("room-1"), 665, 1135][slot] * corridorScale, slot === 0 ? "north" : "south",
        label, id + "-room-" + (slot + 1), "return")
    );
    doors.push(door("stairs", doorCenter("stairs") * corridorScale, "north", "楼梯间", stairs, "hall"));
    scenes[hall] = { floor: id, name: "走廊", art: hallArt, width: corridorWidth, doors };

    rooms.forEach((name, slot) => {
      const roomId = id + "-room-" + (slot + 1);
      const ward = roomId === start;
      const roomArt = ward ? "ward-inward" : "room-" + name.split(" ")[0].toLowerCase();
      const outline = artworkGeometry[roomArt]?.outlines?.return;
      scenes[roomId] = {
        floor: id, name, art: roomArt, width: 900,
        doors: [door("return", slot === 0 ? 450 : outline[0] + outline[2] / 2, slot === 0 ? "south" : "north",
          "返回走廊", hall, "room-" + (slot + 1))],
        items: ward ? [{
          id: "battery", kind: "item", label: "拾取电池",
          x: 349, y: 490, outline: [336, 346, 28, 17],
        }] : id === "1F" && slot === 0 ? [{
          id: "drawer", kind: "item", label: "打开柜子抽屉",
          x: 573, y: 490, outline: [529, 338, 88, 27],
          sprite: [521, 311, 104, 153],
          contents: {
            id: "spare-battery", kind: "item", label: "拾取备用电池",
            x: 573, y: 490, outline: [555, 343, 28, 17],
          },
        }] : [],
      };
    });

    const stairDoors = [door("hall", 450, "south", "返回走廊", hall, "stairs")];
    const upper = floors[index - 1];
    const lower = floors[index + 1];
    // Alternating landings align each flight with its matching opening on the next floor.
    const mirrored = index % 2 === 1;
    if (upper) stairDoors.push(door("up", mirrored ? 160 : 740, "north", "上楼 · " + upper.id, upper.id + "-stairs", "down", "上楼"));
    if (lower) stairDoors.push(door("down", mirrored ? 740 : 160, "north", "下楼 · " + lower.id, lower.id + "-stairs", "up", "下楼"));
    scenes[stairs] = {
      floor: id, name: "楼梯间",
      art: !upper ? "stairs-top" : !lower ? "stairs-base" : "stairs-landing",
      width: 900, doors: stairDoors, mirrored,
    };
  });

  for (const scene of Object.values(scenes)) {
    const art = scene.art.split("-")[0];
    Object.assign(scene, geometry[art], artworkGeometry[scene.art]);
    scene.back = scene.floorY + (art === "ward" ? 16 : 8);
    scene.front = 572;
    for (const portal of scene.doors) {
      const south = portal.side === "south";
      portal.y = south ? scene.front : scene.back;
      portal.outline = south ? [portal.x - 73, 554, 146, 46] : scene.outlines[portal.id];
      if (art === "corridor" && !south) {
        const [left, top, width, height] = portal.outline;
        const scale = scene.width / corridorArtWidth;
        portal.outline = [left * scale, top, width * scale, height];
      }
      if (scene.mirrored && !south) {
        const [left, top, width, height] = portal.outline;
        portal.outline = [scene.width - left - width, top, width, height];
      }
      portal.landingY = portal.y + (south ? -28 : 25);
      portal.heading = south ? -Math.PI / 2 : Math.PI / 2;
    }
  }

  return { floors, scenes, start };
})();
