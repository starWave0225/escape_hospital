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
const touchInteract = get("touch-interact");
const touchFlashlight = get("touch-flashlight");
const flashlightStatus = get("flashlight-status");
const staminaMeter = get("stamina");
const staminaDisplay = get("stamina-display");
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
const sprintDrain = 26;
const staminaRecovery = 22;
const sprintThreshold = 25;
const recoveryDelay = 0.6;
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
let recoveryTime = 0;
let exhausted = false;
let sprintReleased = true;
let nearby;
let sceneInteractions = [];
let hasBattery = false;
let flashlightOn = false;
let changingScene = false;
let destination;
let lastClickScene;
let frameTime;
let viewScale = 1;
let visibleWidth = 900;
let saveDelay;
let character;
let assetsReady = false;
let gameStarted = false;
let savedGame = false;

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
      player.x = clamp(saved.x, 33, scenes[sceneId].width - 33);
      player.y = clamp(saved.y, scenes[sceneId].back, scenes[sceneId].front);
    }
    player.facing = saved.facing === -1 ? -1 : 1;
    player.direction = Number.isFinite(saved.direction) ? saved.direction : player.facing === 1 ? 0 : Math.PI;
    if (Number.isFinite(saved.stamina)) stamina = clamp(saved.stamina, 0, maxStamina);
    exhausted = Boolean(saved.exhausted) && stamina < sprintThreshold;
    hasBattery = saved.hasBattery === true;
    flashlightOn = hasBattery && saved.flashlightOn === true;
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
      visited: [...visited],
      x: player.x,
      y: player.y,
      facing: player.facing,
      direction: player.direction,
      stamina,
      exhausted,
      hasBattery,
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
  Lighting.resize(viewport.clientWidth, viewport.clientHeight);
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
    dark: scene.floor === "3F",
    enabled: flashlightOn,
    x: (player.x - camera + Math.cos(aim) * height * .15) * viewScale,
    y: top + (player.y - height * (sprinting ? .66 : .60) + Math.sin(aim) * height * .09) * viewScale,
    direction: aim,
    scale: viewScale,
  });

  const next = sceneInteractions
    .filter((interaction) => Math.abs(interaction.x - player.x) <= (interaction.kind === "item" ? 55 : 82) &&
      Math.abs(interaction.y - player.y) <= 46)
    .sort((a, b) => Math.abs(a.x - player.x) - Math.abs(b.x - player.x))[0];
  if (next !== nearby) showInteractionCue(next);
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
  const percent = Math.round(stamina);
  if (staminaMeter.value !== percent) staminaMeter.value = percent;
  staminaDisplay.hidden = stamina >= maxStamina && !sprinting;
  staminaDisplay.classList.toggle("exhausted", exhausted);
}

function showInteractionCue(next) {
  nearby = next;
  markerButtons.forEach((button, id) => {
    button.hidden = id !== next?.id;
  });
  touchInteract.disabled = !next;
}

function updateFlashlightStatus(message) {
  touchFlashlight.hidden = !hasBattery;
  touchFlashlight.setAttribute("aria-pressed", String(flashlightOn));
  flashlightStatus.textContent = message || (flashlightOn ? "手电已开启" : "手电已关闭");
}

function toggleFlashlight() {
  if (changingScene || map.open) return;
  if (!hasBattery) {
    updateFlashlightStatus("手电缺少电池。201 病房的床头柜上有电池。");
    return;
  }
  flashlightOn = !flashlightOn;
  updateFlashlightStatus();
  render();
  save();
}

function prepareBackdrop(art) {
  if (backdrops.has(art)) return backdrops.get(art);

  const panels = Array.from({ length: art === "corridor" ? 2 : 1 }, () => {
    const image = new Image();
    image.className = "panel";
    image.alt = "";
    image.draggable = false;
    image.src = "assets/" + art + ".webp";
    return image;
  });
  const ready = Promise.all(panels.map((image) => image.decode())).then(
    () => panels,
    (error) => {
      backdrops.delete(art);
      console.error("Could not load scene backdrop:", art, error);
      return null;
    }
  );
  backdrops.set(art, ready);
  return ready;
}

function showScene(id, panels, arrival) {
  sceneId = id;
  scene = scenes[id];
  visited.add(id);
  if (arrival) {
    const entrance = scene.doors.find((door) => door.id === arrival);
    player.x = entrance.x;
    player.y = entrance.y + 24;
    player.facing = player.x > scene.width / 2 ? -1 : 1;
    player.direction = player.facing === 1 ? 0 : Math.PI;
  }
  gait = "idle";
  stride = 0;
  sprinting = false;
  get("location").textContent = "住院部 / " + scene.name;
  world.style.width = scene.width + "px";
  backdrop.dataset.floor = scene.floor;
  backdrop.dataset.art = scene.art;
  backdrop.replaceChildren(...panels);

  buildInteractionCues();
  HospitalMap.update(sceneId, visited);
  updateViewSize();
  renderStamina();
  save();
}

function buildInteractionCues() {
  const items = (scene.items || []).filter((item) => item.id !== "battery" || !hasBattery);
  sceneInteractions = [...scene.doors, ...items];
  const itemSprites = items.map(({ outline: [x, y] }) => {
    const sprite = document.createElement("span");
    sprite.className = "battery";
    sprite.setAttribute("aria-hidden", "true");
    sprite.style.left = (x + 2) + "px";
    sprite.style.top = (y + 1) + "px";
    return sprite;
  });
  markerButtons = new Map(sceneInteractions.map((interaction) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "interaction-cue";
    button.dataset.interaction = interaction.kind || "transition";
    const [left, top, width, height] = interaction.outline;
    button.style.left = left + "px";
    button.style.top = top + "px";
    button.style.width = width + "px";
    button.style.height = height + "px";
    button.setAttribute("aria-label", interaction.verb === "开门" ? "开门 · " + interaction.label : interaction.label);
    button.addEventListener("click", (event) => {
      if (event.detail === 0 && nearby === interaction) interact(interaction);
    });
    return [interaction.id, button];
  }));
  markers.replaceChildren(...itemSprites, ...markerButtons.values());
  showInteractionCue(undefined);
}

async function interact(interaction = nearby) {
  if (map.open || changingScene || !interaction) return;
  destination = undefined;
  if (interaction.id === "battery" && !hasBattery) {
    hasBattery = true;
    flashlightOn = true;
    buildInteractionCues();
    updateFlashlightStatus("已装上电池，手电已开启。按 L 可开关。");
    render();
    save();
    return;
  }
  const { target, arrival } = interaction;
  changingScene = true;
  try {
    const panels = await prepareBackdrop(scenes[target].art);
    if (panels) showScene(target, panels, arrival);
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

function aimAtClick(event) {
  if (event.detail === 0 || map.open || changingScene || event.target.closest(".minimap")) return;
  if (event.detail === 1) lastClickScene = sceneId;
  if (lastClickScene !== sceneId) return;

  const bounds = world.getBoundingClientRect();
  const x = (event.clientX - bounds.left) / viewScale;
  const y = (event.clientY - bounds.top) / viewScale;
  const interaction = sceneInteractions.find(({ outline: [left, top, width, height] }) =>
    x >= left && x <= left + width && y >= top && y <= top + height
  );
  if (!interaction && y < scene.floorY) return;
  destination = {
    x: interaction?.x ?? clamp(x, 33, scene.width - 33),
    y: interaction ? interaction.y + 24 : clamp(y, scene.back, scene.front),
    interaction,
    sprint: event.detail >= 2,
    // Allow a second click before switching through a nearby doorway.
    enterAfter: performance.now() + (event.detail === 1 ? 320 : 0),
  };
}

function animate(time) {
  const elapsed = Math.min((time - (frameTime ?? time)) / 1000, 0.05);
  frameTime = time;
  if (!map.open && !changingScene) {
    const directions = new Set([...keys].map((key) => movement.get(key)));
    for (const direction of pointers.values()) directions.add(direction);
    let dx = Number(directions.has("right")) - Number(directions.has("left"));
    let dy = Number(directions.has("down")) - Number(directions.has("up"));
    const diagonal = dx && dy ? Math.SQRT1_2 : 1;
    const holdingSprint = sprintKeys.size > 0 || directions.has("sprint") || Boolean(destination?.sprint);
    const canSprint = holdingSprint && !exhausted && stamina > 0;
    const speedX = canSprint ? 378 : 224;
    const speedY = canSprint ? 204 : 132;
    let x = clamp(player.x + dx * speedX * elapsed * diagonal, 33, scene.width - 33);
    let y = clamp(player.y + dy * speedY * elapsed * diagonal, scene.back, scene.front);
    if (destination) {
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
    if (destination && x === destination.x && y === destination.y && time >= destination.enterAfter) {
      const { interaction } = destination;
      destination = undefined;
      if (interaction) interact(interaction);
    }
  }
  requestAnimationFrame(animate);
}

window.addEventListener("keydown", (event) => {
  if (!gameStarted || event.ctrlKey || event.metaKey || event.altKey) return;
  const key = event.key.toLowerCase();
  if (key === "m" && !event.repeat) {
    event.preventDefault();
    if (map.open) map.close();
    else openMap();
    return;
  }
  if (map.open) return;
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
  if (key === "l") toggleFlashlight();
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
touchInteract.addEventListener("click", () => interact());
touchFlashlight.addEventListener("click", toggleFlashlight);
function openMap() {
  if (changingScene) return;
  clearMovement();
  map.showModal();
}
get("minimap").addEventListener("click", openMap);
get("close-map").addEventListener("click", () => map.close());

function selectCharacter(id) {
  character = id;
  for (const button of characterButtons) {
    button.setAttribute("aria-pressed", String(button.dataset.character === id));
  }
  get("enter-game").disabled = !assetsReady || !character;
}

async function prepareCharacter(id, pace) {
  const key = id + "-" + pace;
  if (characterArt.has(key)) return characterArt.get(key);
  const image = new Image();
  image.src = "assets/" + key + ".webp";
  await image.decode();
  characterArt.set(key, image);
  return image;
}

async function loadAssets() {
  const progress = get("asset-progress");
  const status = get("asset-status");
  const retry = get("retry-assets");
  retry.hidden = true;
  const arts = new Set(Object.values(scenes).map((entry) => entry.art));
  const assets = [...arts].map(prepareBackdrop);
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
    get("enter-game").disabled = !character;
  } else {
    status.textContent = "部分素材加载失败";
    retry.hidden = false;
  }
}

get("enter-game").addEventListener("click", async () => {
  if (!assetsReady || !character || gameStarted) return;
  get("enter-game").disabled = true;
  const panels = await prepareBackdrop(scenes[sceneId].art);
  gameStarted = true;
  get("home").hidden = true;
  stage.hidden = false;
  updateFlashlightStatus(hasBattery ? undefined : "手电缺少电池");
  showScene(sceneId, panels);
  new ResizeObserver(updateViewSize).observe(viewport);
  requestAnimationFrame(animate);
});
for (const button of characterButtons) {
  button.addEventListener("click", () => selectCharacter(button.dataset.character));
}
get("retry-assets").addEventListener("click", loadAssets);
readSave();
if (savedGame) get("enter-game").textContent = "继续游戏";
selectCharacter(character);
loadAssets();
