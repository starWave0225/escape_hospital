"use strict";

const { scenes, start } = Hospital;
const get = (id) => document.getElementById(id);
const stage = get("stage");
const viewport = get("viewport");
const world = get("world");
const backdrop = get("backdrop");
const markers = get("markers");
const actor = get("player");
const body = get("player-body");
const playerArt = body.getContext("2d");
const characterButtons = [...document.querySelectorAll("[data-character]")];
const characterArt = new Map();
const map = get("map");
const backpack = get("backpack");
const deathDialog = get("death-dialog");
const statusHud = get("status-hud");
const sanityMeter = get("sanity");
const sanityNumber = get("sanity-number");
const staminaNumber = get("stamina-number");
const touchInteract = get("touch-interact");
const flashlightToggle = get("flashlight-toggle");
const flashlightStatus = get("flashlight-status");
const flashlightHint = get("flashlight-hint");
const batteryLevel = get("battery-level");
const music = new Audio();
music.loop = true;
music.volume = .47;
music.addEventListener("playing", () => { get("music-status").textContent = "背景音乐播放中"; });
music.addEventListener("pause", () => { get("music-status").textContent = "背景音乐已暂停"; });
const staminaMeter = get("stamina");
const movement = new Map([
  ["a", "left"], ["arrowleft", "left"], ["d", "right"], ["arrowright", "right"],
  ["w", "up"], ["arrowup", "up"], ["s", "down"], ["arrowdown", "down"],
]);
const keys = new Set();
const pointers = new Map();
const sprintKeys = new Set();
const backdrops = new Map();
const saveKey = "night-shift-hospital-map-v1";
const sceneHeight = 600;
const maxStamina = 100;
const maxSanity = 100;
const darknessDrain = 2;
const sprintDrain = 26;
const staminaRecovery = 22;
const sprintThreshold = 25;
const recoveryDelay = 0.6;
const attackCost = 18;
const attackDuration = .35;
const batteryLifetime = 180;
const backpackCapacity = 12;
const batteryItem = "battery";
const itemCatalog = {
  [batteryItem]: { name: "备用电池", description: "手电当前的电池耗尽时自动换上，可照明约 3 分钟。" },
};
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
let visited = new Set();
let sceneId = start;
let scene = scenes[start];
let markerButtons = new Map();
let player = { x: 385, y: 516, facing: 1, direction: 0 };
let stride = 0;
let gait = "idle";
let sprinting = false;
let stamina = maxStamina;
let sanity = maxSanity;
let attackTime = 0;
let recoveryTime = 0;
let exhausted = false;
let sprintReleased = true;
let nearby;
let sceneInteractions = [];
let starterBatteryTaken = false;
let spareBatteryTaken = false;
let inventory = [];
let drawerOpen = false;
let batterySeconds = 0;
let cabinetArt;
let flashlightOn = false;
let emptyFlashTimer;
let flashlightHintTimer;
let changingScene = false;
let destination;
let lastClickScene;
let mousePosition;
let frameTime;
let viewScale = 1;
let visibleWidth = 900;
let saveDelay;
let character;
let assetsReady = false;
let gameStarted = false;
let savedGame = false;
let startingNewGame = false;

function hasAmbientLight() {
  return scene.floor !== "3F";
}

function readSave() {
  try {
    const saved = JSON.parse(localStorage.getItem(saveKey));
    if (!saved || !Object.hasOwn(scenes, saved.scene)) return;
    savedGame = true;
    if (characterButtons.some((button) => button.dataset.character === saved.character)) {
      character = saved.character;
    }
    sceneId = saved.scene;
    if (Array.isArray(saved.visited)) {
      visited = new Set(saved.visited.filter((id) => Object.hasOwn(scenes, id)));
    }
    if (Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
      const width = scenes[sceneId].width;
      const previousWidth = saved.sceneWidth > 0 ? saved.sceneWidth : sceneId.endsWith("-hall") ? 1800 : width;
      player.x = clamp(saved.x * width / previousWidth, 33, width - 33);
      player.y = clamp(saved.y, scenes[sceneId].back, scenes[sceneId].front);
    }
    player.facing = saved.facing === -1 ? -1 : 1;
    player.direction = Number.isFinite(saved.direction) ? saved.direction : player.facing === 1 ? 0 : Math.PI;
    if (Number.isFinite(saved.stamina)) stamina = clamp(saved.stamina, 0, maxStamina);
    if (Number.isFinite(saved.sanity)) sanity = clamp(saved.sanity, 0, maxSanity);
    exhausted = Boolean(saved.exhausted) && stamina < sprintThreshold;
    starterBatteryTaken = saved.starterBatteryTaken === true || saved.hasBattery === true;
    spareBatteryTaken = saved.spareBatteryTaken === true;
    inventory = Array.isArray(saved.inventory)
      ? saved.inventory.filter((id) => typeof id === "string" && Object.hasOwn(itemCatalog, id)).slice(0, backpackCapacity)
      : saved.spareBattery === true ? [batteryItem] : [];
    drawerOpen = saved.drawerOpen === true || spareBatteryTaken;
    batterySeconds = Number.isFinite(saved.batterySeconds) ? clamp(saved.batterySeconds, 0, batteryLifetime)
      : starterBatteryTaken ? batteryLifetime : 0;
    flashlightOn = batterySeconds > 0 && saved.flashlightOn === true;
  } catch {
    // Storage may be unavailable in private browsing or a local file.
  }
}

function save() {
  clearTimeout(saveDelay);
  if (!gameStarted) return;
  try {
    localStorage.setItem(saveKey, JSON.stringify({
      scene: sceneId,
      sceneWidth: scene.width,
      visited: [...visited],
      x: player.x,
      y: player.y,
      facing: player.facing,
      direction: player.direction,
      stamina,
      sanity,
      exhausted,
      starterBatteryTaken,
      spareBatteryTaken,
      inventory,
      drawerOpen,
      batterySeconds,
      flashlightOn,
      character,
    }));
  } catch {
    // The current session can continue without storage.
  }
}

function updateViewSize() {
  viewScale = Math.max(viewport.clientHeight / sceneHeight, viewport.clientWidth / scene.width) || 1;
  visibleWidth = viewport.clientWidth / viewScale;
  render();
}

function render() {
  const maxCamera = Math.max(0, scene.width - visibleWidth);
  const camera = clamp(player.x - visibleWidth / 2, 0, maxCamera);
  const top = viewport.clientHeight - sceneHeight * viewScale;
  world.style.transform = "translate(" + (-camera * viewScale) + "px," + top + "px) scale(" + viewScale + ")";
  actor.style.left = player.x + "px";
  actor.style.top = player.y + "px";
  const depth = (player.y - scene.back) / (scene.front - scene.back);
  const height = scene.doorHeight * (character === "man" ? .80 : .76) * (1 + (player.y - scene.floorY) / 1000);
  actor.style.height = height + "px";
  actor.style.width = height * 272 / 256 + "px";
  drawCharacter(playerArt, character, gait, sprinting, stride, player.facing, player.direction);
  HospitalMap.draw(sceneId, visited, { x: player.x, depth, direction: player.direction });
  const aim = player.direction;
  Lighting.draw({
    dark: !hasAmbientLight(),
    enabled: flashlightOn || emptyFlashTimer !== undefined,
    x: player.x + Math.cos(aim) * height * .15,
    y: player.y - height * (sprinting ? .66 : .60) + Math.sin(aim) * height * .09,
    direction: aim,
  });

  const next = sceneInteractions
    .filter((interaction) => Math.abs(interaction.x - player.x) <= (interaction.kind === "item" ? 55 : 82) &&
      Math.abs(interaction.y - player.y) <= (interaction.side ? 32 : 46))
    .sort((a, b) => Math.abs(a.x - player.x) - Math.abs(b.x - player.x))[0];
  if (next !== nearby) showInteractionCue(next);
  updateCursor();
}

function drawCharacter(context, id, pose, running = false, distance = 0, facing = 1, direction = 0) {
  const { width, height } = context.canvas;
  const walkCycle = [1, 2, 3, 2];
  const view = pose === "idle"
    ? Math.abs(Math.sin(direction)) > .92 ? (direction < 0 ? "back" : "front") : "side"
    : pose;
  const row = { side: 0, front: 1, back: 2 }[view];
  const frame = Math.floor(distance / (view === "side" ? (running ? 45 : 29) : (running ? 27 : 20))) % 4;
  const column = pose === "idle" ? 0 : running ? frame : walkCycle[frame];
  const image = characterArt.get(id + "-" + (running ? "run" : "walk"));
  context.clearRect(0, 0, width, height);
  context.save();
  if (view === "side" && facing < 0) {
    context.translate(width, 0);
    context.scale(-1, 1);
  }
  context.drawImage(image, column * width, row * height, width, height, 0, 0, width, height);
  if (pose !== "idle" && !running) {
    const hip = Math.round(height * .53);
    context.clearRect(0, 0, width, hip);
    context.drawImage(image, width, row * height, width, hip, 0, 0, width, hip);
  }
  context.restore();
}

function updateStamina(elapsed, holdingSprint, running) {
  if (!holdingSprint) sprintReleased = true;
  if (running) {
    stamina = Math.max(0, stamina - sprintDrain * elapsed);
    recoveryTime = recoveryDelay;
    if (stamina === 0) {
      exhausted = true;
      sprintReleased = false;
    }
  } else {
    recoveryTime = Math.max(0, recoveryTime - elapsed);
    if (recoveryTime === 0) stamina = Math.min(maxStamina, stamina + staminaRecovery * elapsed);
    if (exhausted && sprintReleased && stamina >= sprintThreshold) exhausted = false;
  }
  renderStamina();
}

function renderStamina() {
  renderResource(staminaMeter, staminaNumber, stamina, maxStamina);
}

function renderResource(meter, number, amount, maximum) {
  const value = Math.ceil(amount);
  if (meter.value === value) return;
  meter.value = value;
  number.textContent = value;
  meter.parentElement.style.setProperty("--level", (value / maximum * 100) + "%");
}

function updateSanity(elapsed) {
  if (hasAmbientLight() || flashlightOn || elapsed === 0) return;
  const previousValue = Math.ceil(sanity);
  sanity = Math.max(0, sanity - darknessDrain * elapsed);
  renderResource(sanityMeter, sanityNumber, sanity, maxSanity);
  if (sanity === 0) showDeath();
  if (Math.ceil(sanity) !== previousValue) save();
}

function showDeath() {
  clearMovement();
  setAttackTime(0);
  statusHud.dataset.dead = "true";
  world.classList.add("player-dead");
  music.pause();
  deathDialog.showModal();
}

function setAttackTime(time) {
  attackTime = time;
  actor.classList.toggle("attacking", time > 0);
}

function attack() {
  if (gameMenuOpen() || changingScene || attackTime > 0) return;
  const combatStatus = get("combat-status");
  if (stamina < attackCost) {
    combatStatus.textContent = "体力不足，无法攻击。";
    return;
  }
  stamina = Math.max(0, stamina - attackCost);
  recoveryTime = recoveryDelay;
  destination = undefined;
  gait = "idle";
  sprinting = false;
  actor.style.setProperty("--attack-angle", player.direction + "rad");
  setAttackTime(attackDuration);
  combatStatus.textContent = "攻击";
  renderStamina();
  render();
  save();
}

function showInteractionCue(next) {
  nearby = next;
  markerButtons.forEach((button, id) => {
    button.hidden = id !== next?.id;
  });
  touchInteract.disabled = !next;
}

function updateFlashlightStatus(message) {
  const percent = Math.ceil(batterySeconds / batteryLifetime * 100);
  const spares = inventory.filter((id) => id === batteryItem).length;
  const text = percent + "%" + (spares ? " +" + spares : "");
  if (batteryLevel.textContent !== text) batteryLevel.textContent = text;
  batteryLevel.classList.toggle("low", percent <= 15);
  flashlightToggle.dataset.powered = String(batterySeconds > 0);
  flashlightToggle.setAttribute("aria-pressed", String(flashlightOn));
  if (message) flashlightStatus.textContent = message;
}

function drainBattery(elapsed) {
  if (!flashlightOn || !elapsed) return;
  const oldPercent = Math.ceil(batterySeconds / batteryLifetime * 100);
  batterySeconds = Math.max(0, batterySeconds - elapsed);
  if (batterySeconds === 0) {
    const spareIndex = inventory.indexOf(batteryItem);
    if (spareIndex !== -1) {
      inventory.splice(spareIndex, 1);
      batterySeconds = batteryLifetime;
      updateFlashlightStatus("已换上备用电池。");
    } else {
      flashlightOn = false;
      updateFlashlightStatus("电池已耗尽。");
      render();
    }
    save();
  } else if (oldPercent !== Math.ceil(batterySeconds / batteryLifetime * 100)) {
    updateFlashlightStatus();
    save();
  }
}

function toggleFlashlight() {
  if (changingScene || gameMenuOpen()) return;
  if (!batterySeconds) {
    if (emptyFlashTimer !== undefined) return;
    emptyFlashTimer = setTimeout(() => {
      emptyFlashTimer = undefined;
      render();
    }, 160);
    clearTimeout(flashlightHintTimer);
    flashlightHint.textContent = starterBatteryTaken || spareBatteryTaken ? "手电没电了" : "手电缺少电池";
    flashlightHintTimer = setTimeout(() => { flashlightHint.textContent = ""; }, 2600);
    render();
    return;
  }
  flashlightOn = !flashlightOn;
  updateFlashlightStatus(flashlightOn ? "手电已开启" : "手电已关闭");
  render();
  save();
}

function prepareBackdrop(art) {
  if (backdrops.has(art)) return backdrops.get(art);

  const image = new Image();
  image.className = "panel";
  image.alt = "";
  image.draggable = false;
  image.src = "assets/" + art + ".webp";
  const ready = image.decode().then(
    () => image,
    (error) => {
      backdrops.delete(art);
      console.error("Could not load scene backdrop:", art, error);
      return null;
    }
  );
  backdrops.set(art, ready);
  return ready;
}

function showScene(id, image, arrival) {
  sceneId = id;
  scene = scenes[id];
  visited.add(id);
  if (arrival) {
    const entrance = scene.doors.find((door) => door.id === arrival);
    player.x = entrance.x;
    player.y = entrance.landingY;
    player.facing = 1;
    player.direction = entrance.heading;
  }
  gait = "idle";
  stride = 0;
  sprinting = false;
  get("location").textContent = "住院部 / " + scene.name;
  world.style.width = scene.width + "px";
  world.classList.toggle("dark", !hasAmbientLight());
  Lighting.resize(scene.width, sceneHeight);
  backdrop.dataset.floor = scene.floor;
  backdrop.dataset.art = scene.art;
  backdrop.classList.toggle("mirrored", Boolean(scene.mirrored));
  backdrop.replaceChildren(image);

  buildInteractionCues();
  HospitalMap.update(sceneId, visited);
  updateViewSize();
  renderStamina();
  renderResource(sanityMeter, sanityNumber, sanity, maxSanity);
  if (sanity === 0) showDeath();
  save();
}

function buildInteractionCues() {
  const items = [];
  const itemSprites = [];
  for (const item of scene.items || []) {
    if (item.id === "drawer") {
      const [x, y, width, height] = item.sprite;
      const cabinet = document.createElement("span");
      cabinet.className = "battery-cabinet";
      cabinet.classList.toggle("open", drawerOpen);
      Object.assign(cabinet.style, { left: x + "px", top: y + "px", width: width + "px", height: height + "px" });
      cabinet.setAttribute("aria-hidden", "true");
      cabinet.append(cabinetArt);
      itemSprites.push(cabinet);
      if (!drawerOpen) items.push(item);
      else if (!spareBatteryTaken) items.push(item.contents);
    } else if (!starterBatteryTaken) {
      items.push(item);
    }
  }
  if (scene.art.startsWith("stairs-")) {
    const plate = document.createElement("span");
    plate.className = "stair-floor-plate";
    plate.textContent = scene.floor;
    plate.setAttribute("aria-hidden", "true");
    itemSprites.push(plate);
  }
  sceneInteractions = [...scene.doors, ...items];
  for (const { id, outline: [x, y] } of items) {
    if (id === "drawer") continue;
    const sprite = document.createElement("span");
    sprite.className = "battery";
    sprite.setAttribute("aria-hidden", "true");
    sprite.style.left = (x + 2) + "px";
    sprite.style.top = (y + 1) + "px";
    itemSprites.push(sprite);
  }
  markerButtons = new Map(sceneInteractions.map((interaction) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "interaction-cue";
    button.dataset.interaction = interaction.kind || "transition";
    if (interaction.side) button.dataset.side = interaction.side;
    positionOutline(button, interaction.outline);
    button.setAttribute("aria-label", interaction.verb === "开门" ? "开门 · " + interaction.label : interaction.label);
    button.addEventListener("click", (event) => {
      if (event.detail === 0 && nearby === interaction) interact(interaction);
    });
    return [interaction.id, button];
  }));
  markers.replaceChildren(buildForegroundWall(), ...itemSprites, ...markerButtons.values());
  showInteractionCue(undefined);
}

function buildForegroundWall() {
  const foreground = document.createElement("div");
  foreground.className = "foreground-wall";
  foreground.setAttribute("aria-hidden", "true");
  const doors = scene.doors.filter((door) => door.side === "south").sort((a, b) => a.x - b.x);
  let wallStart = 0;
  for (const { outline } of doors) {
    const [left, , width] = outline;
    addWallSegment(left);
    const doorway = document.createElement("span");
    doorway.className = "foreground-door";
    positionOutline(doorway, outline);
    const recess = document.createElement("span");
    recess.className = "door-recess";
    doorway.append(recess);
    foreground.append(doorway);
    wallStart = left + width;
  }
  addWallSegment(scene.width);
  return foreground;

  function addWallSegment(end) {
    if (end <= wallStart) return;
    const wall = document.createElement("span");
    wall.className = "wall-section";
    wall.style.left = wallStart + "px";
    wall.style.width = (end - wallStart) + "px";
    foreground.append(wall);
  }
}

function positionOutline(element, [left, top, width, height]) {
  Object.assign(element.style, {
    left: left + "px", top: top + "px", width: width + "px", height: height + "px",
  });
}

async function interact(interaction = nearby) {
  if (gameMenuOpen() || changingScene || attackTime > 0 || !interaction) return;
  destination = undefined;
  if (interaction.kind === "item") {
    let message;
    if (interaction.id === "drawer") {
      drawerOpen = true;
      message = "抽屉已打开。";
    } else {
      if (batterySeconds > 0 && inventory.length >= backpackCapacity) {
        updateFlashlightStatus("背包已满。");
        return;
      }
      if (interaction.id === "battery") starterBatteryTaken = true;
      else spareBatteryTaken = true;
      if (batterySeconds > 0) {
        inventory.push(batteryItem);
        message = "已拾取备用电池。";
      } else {
        batterySeconds = batteryLifetime;
        flashlightOn = true;
        clearTimeout(emptyFlashTimer);
        emptyFlashTimer = undefined;
        clearTimeout(flashlightHintTimer);
        flashlightHint.textContent = "";
        message = "已装上电池，手电已开启。按 T 可开关。";
      }
    }
    buildInteractionCues();
    updateFlashlightStatus(message);
    render();
    save();
    return;
  }
  const { target, arrival } = interaction;
  changingScene = true;
  try {
    const image = await prepareBackdrop(scenes[target].art);
    if (image) showScene(target, image, arrival);
  } finally {
    changingScene = false;
  }
}

function clearMovement() {
  keys.clear();
  sprintKeys.clear();
  pointers.clear();
  destination = undefined;
  if (gait !== "idle") {
    gait = "idle";
    stride = 0;
    sprinting = false;
    render();
  }
}

function worldPoint(clientX, clientY) {
  const bounds = world.getBoundingClientRect();
  return { x: (clientX - bounds.left) / viewScale, y: (clientY - bounds.top) / viewScale };
}

function interactionAt({ x, y }) {
  return sceneInteractions.find(({ outline: [left, top, width, height] }) =>
    x >= left && x <= left + width && y >= top && y <= top + height
  );
}

function updateCursor() {
  if (!mousePosition) return;
  const point = worldPoint(mousePosition.x, mousePosition.y);
  const interaction = interactionAt(point);
  const discoverable = hasAmbientLight() || interaction === nearby;
  const cursor = interaction && discoverable
    ? interaction.kind || "transition"
    : point.y >= scene.floorY ? "move" : "default";
  if (viewport.dataset.cursor !== cursor) viewport.dataset.cursor = cursor;
}

function aimAtClick(event) {
  if (event.detail === 0 || gameMenuOpen() || changingScene || event.target.closest(".minimap, .flashlight-control")) return;
  if (event.detail === 1) lastClickScene = sceneId;
  if (lastClickScene !== sceneId) return;

  const point = worldPoint(event.clientX, event.clientY);
  const { x, y } = point;
  const interaction = interactionAt(point);
  if (!interaction && y < scene.floorY) return;
  destination = {
    x: interaction?.x ?? clamp(x, 33, scene.width - 33),
    y: interaction ? (interaction.landingY ?? interaction.y + 24) : clamp(y, scene.back, scene.front),
    interaction,
    sprint: event.detail >= 2 && (hasAmbientLight() || flashlightOn),
    // Allow a second click before switching through a nearby doorway.
    enterAfter: performance.now() + (event.detail === 1 ? 320 : 0),
  };
}

function animate(time) {
  const elapsed = Math.min((time - (frameTime ?? time)) / 1000, 0.05);
  frameTime = time;
  if (!gameMenuOpen() && !changingScene) {
    drainBattery(elapsed);
    updateSanity(elapsed);
    if (sanity > 0) {
      if (attackTime > 0) setAttackTime(Math.max(0, attackTime - elapsed));
      updateMovement(elapsed, time);
    }
  }
  requestAnimationFrame(animate);
}

function updateMovement(elapsed, time) {
  const directions = new Set();
  if (attackTime === 0) {
      for (const key of keys) directions.add(movement.get(key));
      for (const direction of pointers.values()) directions.add(direction);
  }
  let dx = Number(directions.has("right")) - Number(directions.has("left"));
  let dy = Number(directions.has("down")) - Number(directions.has("up"));
  const diagonal = dx && dy ? Math.SQRT1_2 : 1;
  const holdingSprint = sprintKeys.size > 0 || directions.has("sprint") || Boolean(destination?.sprint);
  const canSprint = holdingSprint && (hasAmbientLight() || flashlightOn) && !exhausted && stamina > 0;
  const speedX = canSprint ? 378 : 224;
  const speedY = canSprint ? 204 : 132;
  let x = clamp(player.x + dx * speedX * elapsed * diagonal, 33, scene.width - 33);
  let y = clamp(player.y + dy * speedY * elapsed * diagonal, scene.back, scene.front);
  if (destination && attackTime === 0) {
      const distanceX = destination.x - player.x;
      const distanceY = destination.y - player.y;
      const travelTime = Math.hypot(distanceX / speedX, distanceY / speedY);
      const fraction = travelTime > elapsed ? elapsed / travelTime : 1;
      x = fraction === 1 ? destination.x : player.x + distanceX * fraction;
      y = fraction === 1 ? destination.y : player.y + distanceY * fraction;
      dx = Math.sign(distanceX);
      dy = Math.sign(distanceY);
  }
  const moving = player.x !== x || player.y !== y;
  const nextGait = moving ? (x !== player.x ? "side" : dy < 0 ? "back" : "front") : "idle";
  const nextSprinting = moving && canSprint;
  const facingChanged = gait !== nextGait || (dx && dx !== player.facing);
  if (gait !== nextGait || sprinting !== nextSprinting) stride = 0;
  gait = nextGait;
  sprinting = nextSprinting;
  if (moving) stride += Math.hypot(x - player.x, y - player.y);
  if (dx) player.facing = dx;
  if (dx || dy) player.direction = Math.atan2(dy, dx);
  player.x = x;
  player.y = y;
  const previousStamina = stamina;
  updateStamina(elapsed, holdingSprint, sprinting);
  if (exhausted && destination) destination.sprint = false;
  if (moving || previousStamina !== stamina) {
      clearTimeout(saveDelay);
      saveDelay = setTimeout(save, 200);
  }
  if (moving || facingChanged || dx || dy) render();
  if (destination && attackTime === 0 && x === destination.x && y === destination.y && time >= destination.enterAfter) {
      const { interaction } = destination;
      destination = undefined;
      if (interaction) interact(interaction);
  }
}

window.addEventListener("keydown", (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (!gameStarted) {
    navigateTitleMenu(event);
    return;
  }
  const key = event.key.toLowerCase();
  if ((key === "m" || key === "i") && !event.repeat) {
    event.preventDefault();
    if (key === "m") toggleGameMenu(map);
    else toggleGameMenu(backpack);
    return;
  }
  if (gameMenuOpen()) return;
  if (key === "f" && !event.repeat) {
    const action = document.fullscreenElement ? document.exitFullscreen?.() : stage.requestFullscreen?.();
    action?.catch(() => {
      // Embedded browsers may only support the full-window layout.
    });
    return;
  }
  if (key === "shift") {
    sprintKeys.add(event.code);
    return;
  }
  if (movement.has(key)) {
    event.preventDefault();
    destination = undefined;
    keys.add(key);
    return;
  }
  if (event.repeat) return;
  if (key === "e") interact();
  if (key === "t") toggleFlashlight();
  if (key === "j") attack();
  if (key === "b") {
    if (music.paused) playMusic();
    else music.pause();
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
  sprintKeys.delete(event.code);
});
window.addEventListener("blur", clearMovement);
window.addEventListener("pagehide", save);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    clearMovement();
    save();
  }
});

for (const button of document.querySelectorAll("[data-move]")) {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    if (button.dataset.move !== "sprint") destination = undefined;
    button.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, button.dataset.move);
  });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
    button.addEventListener(type, (event) => pointers.delete(event.pointerId));
  }
}
viewport.addEventListener("click", aimAtClick);
viewport.addEventListener("pointermove", (event) => {
  if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
  mousePosition = { x: event.clientX, y: event.clientY };
  updateCursor();
});
viewport.addEventListener("pointerleave", () => {
  mousePosition = undefined;
  delete viewport.dataset.cursor;
});
touchInteract.addEventListener("click", () => interact());
get("touch-attack").addEventListener("click", attack);
flashlightToggle.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleFlashlight();
});
function gameMenuOpen() {
  return map.open || backpack.open || deathDialog.open;
}

function toggleGameMenu(dialog) {
  if (dialog.open) {
    dialog.close();
    return;
  }
  if (changingScene) return;
  if (gameMenuOpen()) return;
  clearMovement();
  if (dialog === backpack) renderBackpack();
  dialog.showModal();
}

function renderBackpack() {
  const slots = get("backpack-slots");
  const detail = get("backpack-detail");
  get("backpack-capacity").textContent = inventory.length + " / " + backpackCapacity;
  detail.textContent = inventory.length ? "选择物品查看详情" : "背包是空的";
  const entries = Array.from({ length: backpackCapacity }, (_, index) => {
    const slot = document.createElement("li");
    const id = inventory[index];
    if (!id) {
      slot.className = "backpack-slot empty";
      slot.setAttribute("aria-label", "空格");
      return slot;
    }
    slot.className = "backpack-slot";
    const item = itemCatalog[id];
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", item.name);
    button.setAttribute("aria-pressed", "false");
    const icon = document.createElement("span");
    icon.className = "inventory-icon";
    icon.dataset.item = id;
    icon.setAttribute("aria-hidden", "true");
    button.append(icon);
    button.addEventListener("click", () => {
      slots.querySelector('[aria-pressed="true"]')?.setAttribute("aria-pressed", "false");
      button.setAttribute("aria-pressed", "true");
      const name = document.createElement("strong");
      name.textContent = item.name;
      detail.replaceChildren(name, document.createTextNode(item.description));
    });
    slot.append(button);
    return slot;
  });
  slots.replaceChildren(...entries);
}

get("minimap").addEventListener("click", () => toggleGameMenu(map));
get("close-map").addEventListener("click", () => map.close());
get("open-backpack").addEventListener("click", () => toggleGameMenu(backpack));
get("close-backpack").addEventListener("click", () => backpack.close());
deathDialog.addEventListener("cancel", (event) => event.preventDefault());
get("restart-game").addEventListener("click", async () => {
  const image = await prepareBackdrop(scenes[start].art);
  if (!image || !deathDialog.open) return;
  resetGame();
  world.classList.remove("player-dead");
  delete statusHud.dataset.dead;
  deathDialog.close();
  showScene(start, image);
  updateFlashlightStatus("手电没有电");
  playMusic();
});

function selectCharacter(id) {
  character = id;
  for (const button of characterButtons) {
    button.setAttribute("aria-pressed", String(button.dataset.character === id));
  }
  get("enter-game").disabled = !assetsReady || !character;
}

function navigateTitleMenu(event) {
  const menu = get("title-menu");
  const focused = document.activeElement;
  if (document.querySelector("#home dialog[open]") ||
      (focused !== document.body && !menu.contains(focused))) return;
  const entries = [...menu.querySelectorAll("button:not(:disabled)")];
  const preferred = entries.find((entry) => entry.classList.contains("preferred")) ?? entries[0];
  if (!preferred) return;
  if (event.key === "Enter" && focused === document.body && !event.repeat) {
    event.preventDefault();
    preferred.click();
  }
  if (event.key === "ArrowUp" || event.key === "ArrowDown") {
    event.preventDefault();
    const direction = event.key === "ArrowDown" ? 1 : -1;
    const index = entries.indexOf(focused);
    const next = index < 0 ? preferred : entries[(index + direction + entries.length) % entries.length];
    next.focus();
  }
}

function updateTitleMenu() {
  get("new-game").disabled = !assetsReady;
  get("continue-game").disabled = !assetsReady || !savedGame;
  get("load-game").disabled = !assetsReady;
  get("new-game").classList.toggle("preferred", !savedGame);
  get("continue-game").classList.toggle("preferred", savedGame);
  get("load-slot").hidden = !savedGame;
  get("no-save").hidden = savedGame;
  if (savedGame) get("save-location").textContent = scene.floor + " / " + scene.name;
}

function resetGame() {
  sceneId = start;
  scene = scenes[start];
  visited = new Set();
  player = { x: 385, y: 516, facing: 1, direction: 0 };
  stamina = maxStamina;
  sanity = maxSanity;
  setAttackTime(0);
  recoveryTime = 0;
  exhausted = false;
  sprintReleased = true;
  starterBatteryTaken = spareBatteryTaken = drawerOpen = flashlightOn = false;
  inventory = [];
  batterySeconds = 0;
}

async function prepareCharacter(id, pace) {
  const key = id + "-" + pace;
  if (characterArt.has(key)) return characterArt.get(key);
  const image = new Image();
  image.src = "assets/" + key + (pace === "run" ? "-clean" : "") + ".webp";
  await image.decode();
  characterArt.set(key, image);
  return image;
}

async function prepareCabinet() {
  if (cabinetArt) return cabinetArt;
  const image = new Image();
  image.alt = "";
  image.draggable = false;
  image.src = "assets/battery-cabinet.webp";
  await image.decode();
  cabinetArt = image;
  return image;
}

async function prepareTitleArtwork() {
  const image = new Image();
  image.src = "assets/hospital-title.webp";
  await image.decode();
  return image;
}

async function prepareMusic() {
  if (music.src) return music;
  const response = await fetch("assets/night-ward.wav");
  if (!response.ok) throw new Error("Music unavailable");
  music.src = URL.createObjectURL(await response.blob());
  return music;
}

function playMusic() {
  music.play().catch((error) => {
    get("music-status").textContent = "背景音乐播放失败，按 B 重试。";
    console.warn("Background music could not start:", error);
  });
}

async function loadAssets() {
  const progress = get("asset-progress");
  const status = get("asset-status");
  const retry = get("retry-assets");
  retry.hidden = true;
  const arts = new Set(Object.values(scenes).map((entry) => entry.art));
  const assets = [...arts].map(prepareBackdrop);
  assets.push(prepareCabinet(), prepareMusic(), prepareTitleArtwork());
  for (const button of characterButtons) {
    const id = button.dataset.character;
    assets.push(prepareCharacter(id, "walk").then((image) => {
      const canvas = button.querySelector("canvas");
      canvas.getContext("2d").drawImage(image, 0, canvas.height, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
      return image;
    }), prepareCharacter(id, "run"));
  }
  progress.max = assets.length;
  progress.value = 0;
  status.textContent = "正在加载游戏素材";
  const results = await Promise.allSettled(assets.map(async (asset) => {
    const ready = await asset;
    if (!ready) throw new Error("Asset unavailable");
    progress.value++;
    status.textContent = "正在加载游戏素材 " + Math.round(progress.value / progress.max * 100) + "%";
  }));
  assetsReady = results.every((result) => result.status === "fulfilled");
  if (assetsReady) {
    get("asset-loading").hidden = true;
    updateTitleMenu();
  } else {
    status.textContent = "部分素材加载失败";
    retry.hidden = false;
  }
}

async function enterGame() {
  if (!assetsReady || !character || gameStarted) return;
  get("enter-game").disabled = true;
  if (startingNewGame) resetGame();
  for (const dialog of document.querySelectorAll("#home dialog[open]")) dialog.close();
  playMusic();
  const image = await prepareBackdrop(scenes[sceneId].art);
  gameStarted = true;
  get("home").hidden = true;
  stage.hidden = false;
  updateFlashlightStatus(batterySeconds > 0 ? (flashlightOn ? "手电已开启" : "手电已关闭") : "手电没有电");
  showScene(sceneId, image);
  new ResizeObserver(updateViewSize).observe(viewport);
  requestAnimationFrame(animate);
}

function chooseCharacter(newGame) {
  startingNewGame = newGame;
  selectCharacter(character);
  get("new-game-warning").hidden = !newGame || !savedGame;
  get("enter-game").textContent = newGame ? "进入医院" : "继续游戏";
  get("character-select").showModal();
}

function continueGame() {
  if (!savedGame) return;
  startingNewGame = false;
  get("load-dialog").close();
  if (character) enterGame();
  else chooseCharacter(false);
}

get("enter-game").addEventListener("click", enterGame);
get("new-game").addEventListener("click", () => chooseCharacter(true));
get("continue-game").addEventListener("click", continueGame);
get("load-game").addEventListener("click", () => get("load-dialog").showModal());
get("load-slot").addEventListener("click", continueGame);
get("open-settings").addEventListener("click", () => get("settings-dialog").showModal());
for (const button of document.querySelectorAll(".title-dialog .dialog-close")) {
  button.addEventListener("click", () => button.closest("dialog").close());
}

const volumeInput = get("music-volume");
function updateMusicVolume(value) {
  volumeInput.value = value;
  get("volume-value").value = value + "%";
  music.volume = value / 100;
}
try {
  const stored = localStorage.getItem("night-shift-music-volume");
  if (stored !== null && Number.isFinite(Number(stored))) updateMusicVolume(clamp(Number(stored), 0, 100));
} catch {}
volumeInput.addEventListener("input", () => {
  const value = Number(volumeInput.value);
  updateMusicVolume(value);
  try { localStorage.setItem("night-shift-music-volume", String(value)); } catch {}
});

for (const button of characterButtons) {
  button.addEventListener("click", () => selectCharacter(button.dataset.character));
}
get("retry-assets").addEventListener("click", loadAssets);
readSave();
selectCharacter(character);
updateTitleMenu();
loadAssets();
