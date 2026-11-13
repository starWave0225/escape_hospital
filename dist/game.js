"use strict";

const { scenes, start } = Hospital;
const get = (id) => document.getElementById(id);
const stage = get("stage");
const viewport = get("viewport");
const world = get("world");
const backdrop = get("backdrop");
const markers = get("markers");
const actor = get("player");
const body = actor.querySelector(".player-body");
const map = get("map");
const touchInteract = get("touch-interact");
const staminaMeter = get("stamina");
const staminaDisplay = get("stamina-display");
const movement = new Map([
  ["a", "left"], ["arrowleft", "left"], ["d", "right"], ["arrowright", "right"],
  ["w", "up"], ["arrowup", "up"], ["s", "down"], ["arrowdown", "down"],
]);
const keys = new Set();
const pointers = new Map();
const sprintKeys = new Set();
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
let frameTime;
let viewScale = 1;
let visibleWidth = 900;
let saveDelay;

function readSave() {
  try {
    const saved = JSON.parse(localStorage.getItem(saveKey));
    if (!saved || !Object.hasOwn(scenes, saved.scene)) return;
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
  } catch {
    // Storage may be unavailable in private browsing or a local file.
  }
}

function save() {
  clearTimeout(saveDelay);
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
  const height = scene.doorHeight * 0.76 * (1 + (player.y - scene.floorY) / 1000);
  actor.style.height = height + "px";
  actor.style.width = height * 272 / 256 + "px";
  const frames = gait === "side" ? 8 : 4;
  const stepLength = gait === "side" ? (sprinting ? 25 : 17) : (sprinting ? 18 : 14);
  const index = Math.floor(stride / stepLength) % frames;
  body.dataset.gait = gait;
  body.dataset.sprinting = String(sprinting);
  body.style.backgroundPosition = gait === "idle" ? "center bottom" : (100 * index / (frames - 1)) + "% center";
  body.style.transform = gait === "front" || gait === "back" ? "" : "scaleX(" + player.facing + ")";
  HospitalMap.draw(sceneId, visited, { x: player.x, depth, direction: player.direction });

  const next = scene.doors
    .filter((door) => Math.abs(door.x - player.x) <= 82 && Math.abs(door.y - player.y) <= 46)
    .sort((a, b) => Math.abs(a.x - player.x) - Math.abs(b.x - player.x))[0];
  if (next !== nearby) showInteractionCue(next);
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

function portalText(portal) {
  return portal.verb === "开门" ? "开门 · " + portal.label : portal.label;
}

function showScene(id, arrival) {
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
  backdrop.replaceChildren();
  if (scene.art === "corridor") {
    for (let i = 0; i < 2; i++) {
      const panel = document.createElement("div");
      panel.className = "panel";
      panel.style.backgroundImage = "url(assets/corridor.webp)";
      backdrop.append(panel);
    }
    backdrop.style.backgroundImage = "";
  } else {
    backdrop.style.backgroundImage = "url(assets/" + scene.art + ".webp)";
  }

  markerButtons = new Map(scene.doors.map((door) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "interaction-cue";
    button.dataset.interaction = "transition";
    const [left, top, width, height] = door.outline;
    button.style.left = left + "px";
    button.style.top = top + "px";
    button.style.width = width + "px";
    button.style.height = height + "px";
    button.setAttribute("aria-label", portalText(door));
    button.addEventListener("click", () => {
      if (nearby === door) interact();
    });
    return [door.id, button];
  }));
  markers.replaceChildren(...markerButtons.values());
  showInteractionCue(undefined);
  HospitalMap.update(sceneId, visited);
  updateViewSize();
  renderStamina();
  save();
}

function interact() {
  if (map.open || !nearby) return;
  showScene(nearby.target, nearby.arrival);
}

function clearMovement() {
  keys.clear();
  sprintKeys.clear();
  pointers.clear();
  if (gait !== "idle") {
    gait = "idle";
    stride = 0;
    sprinting = false;
    render();
  }
}

function animate(time) {
  const elapsed = Math.min((time - (frameTime ?? time)) / 1000, 0.05);
  frameTime = time;
  if (!map.open) {
    const directions = new Set([...keys].map((key) => movement.get(key)));
    for (const direction of pointers.values()) directions.add(direction);
    const dx = Number(directions.has("right")) - Number(directions.has("left"));
    const dy = Number(directions.has("down")) - Number(directions.has("up"));
    const diagonal = dx && dy ? Math.SQRT1_2 : 1;
    const holdingSprint = sprintKeys.size > 0 || directions.has("sprint");
    const canSprint = holdingSprint && !exhausted && stamina > 0;
    const speedX = canSprint ? 378 : 224;
    const speedY = canSprint ? 204 : 132;
    const x = clamp(player.x + dx * speedX * elapsed * diagonal, 33, scene.width - 33);
    const y = clamp(player.y + dy * speedY * elapsed * diagonal, scene.back, scene.front);
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
    if (moving || previousStamina !== stamina) {
      clearTimeout(saveDelay);
      saveDelay = setTimeout(save, 200);
    }
    if (moving || facingChanged || dx || dy) render();
  }
  requestAnimationFrame(animate);
}

window.addEventListener("keydown", (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
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
    keys.add(key);
    return;
  }
  if (event.repeat) return;
  if (key === "e") interact();
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
    button.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, button.dataset.move);
  });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
    button.addEventListener(type, (event) => pointers.delete(event.pointerId));
  }
}
touchInteract.addEventListener("click", interact);
function openMap() {
  clearMovement();
  map.showModal();
}
get("minimap").addEventListener("click", openMap);
get("close-map").addEventListener("click", () => map.close());

readSave();
showScene(sceneId);
for (const pace of ["walk", "run"]) {
  for (const direction of ["side", "front", "back"]) {
    const image = new Image();
    image.src = "assets/" + pace + "-" + direction + ".webp";
  }
}
new ResizeObserver(updateViewSize).observe(viewport);
requestAnimationFrame(animate);
