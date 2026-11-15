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
const sanityFigure = get("sanity-figure");
const figureArt = sanityFigure.getContext("2d");
const ghosts = [
  { art: "ghost-patient", height: .93 },
  { art: "ghost-gown", height: 1.04 },
  { art: "ghost-shroud", height: .94 },
  { art: "ghost-hollow", height: 1.08 },
  { art: "ghost-crooked", height: 1.23 },
  { art: "ghost-crawling", height: .65 },
];
const ghostArt = new Map();
const playerCharacter = "man";
const characterArt = new Map();
// Hip positions in the four running frames, in 272 px sprite coordinates.
const runHips = {
  side: [110, 118, 104, 116],
  front: [129, 142, 130, 144],
  back: [141, 128, 138, 132],
};
const map = get("map");
const backpack = get("backpack");
const documentJournal = get("documents");
const inspection = get("inspection");
const inspectionView = get("inspection-view");
const inspectionItems = get("inspection-items");
const inspectionStatus = get("inspection-status");
const storyDialog = get("story-dialog");
const wardIntro = get("ward-intro");
const wardView = get("ward-view");
const wardIntroAction = get("ward-intro-action");
const openingScene = get("opening-scene");
const openingLine = get("opening-line");
const openingNext = get("opening-next");
const skipOpening = get("skip-opening");
const wardQte = get("ward-qte");
const wardQteAction = get("ward-qte-action");
const wardQteTrack = get("ward-qte-track");
const wardQteRounds = [
  { from: .34, to: .66, speed: .65 },
  { from: .18, to: .45, speed: .76 },
  { from: .54, to: .77, speed: .86 },
];
let wardPhase;
let openingSeen = true;
let openingIndex = 0;
let openingRemaining = 0;
let wardQteHits = 0;
let wardQteTravel = 0;
let wardQteCooldown = 0;
const deathDialog = get("death-dialog");
const deathSequence = get("death-sequence");
const reachingHands = [new Image(), new Image()];
const deathDuration = 3400;
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
const cleanBackdrops = new Map();
const saveKey = "night-shift-hospital-map-v1";
const sceneHeight = 600;
const maxStamina = 100;
const maxSanity = 100;
const sanityDrain = 0.2;
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
const medicineItem = "medicine";
const medicineRecovery = 30;
const itemCatalog = {
  [batteryItem]: { name: "备用电池", description: "手电当前的电池耗尽时自动换上，可照明约 3 分钟。" },
  [medicineItem]: { name: "安神药", description: "使用后恢复 " + medicineRecovery + " 点理智。" },
};
const supplyItems = {
  battery: { type: batteryItem, name: "手电电池" },
  "spare-battery": { type: batteryItem, name: "备用电池" },
  "medicine-1F-room-2": { type: medicineItem, name: itemCatalog[medicineItem].name },
  "medicine-2F-room-3": { type: medicineItem, name: itemCatalog[medicineItem].name },
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
let sanityStage = "clear";
let untilStumble = 0;
let stumbleTime = 0;
let untilFigure = 0;
let figure;
let lastGhost;
let attackTime = 0;
let recoveryTime = 0;
let exhausted = false;
let sprintReleased = true;
let nearby;
let sceneInteractions = [];
let starterBatteryTaken = false;
let spareBatteryTaken = false;
let inventory = [];
let pickedMedicine = new Set();
let selectedBackpackSlot = -1;
let batterySeconds = 0;
let cabinetArt;
let flashlightOn = false;
let emptyFlashTimer;
let flashlightHintTimer;
let changingScene = false;
let destination;
let hiddenAt;
let lastClickScene;
let mousePosition;
let frameTime;
let viewScale = 1;
let visibleWidth = 900;
let saveDelay;
let assetsReady = false;
let gameStarted = false;
let enteringGame = false;
let savedGame = false;

function hasAmbientLight() {
  return scene.floor !== "3F" || HospitalStory.hasPower();
}

function readSave() {
  try {
    const saved = JSON.parse(localStorage.getItem(saveKey));
    if (!saved || !Object.hasOwn(scenes, saved.scene)) return;
    openingSeen = saved.openingSeen !== false;
    HospitalStory.read(saved.story);
    savedGame = true;
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
    if (scenes[sceneId].hallucination && sanity >= 20) {
      const exit = scenes[sceneId].doors[0];
      sceneId = exit.target;
      const entrance = scenes[sceneId].doors.find((portal) => portal.id === exit.arrival);
      player.x = entrance.x;
      player.y = entrance.landingY;
    }
    scene = scenes[sceneId];
    exhausted = Boolean(saved.exhausted) && stamina < sprintThreshold;
    starterBatteryTaken = saved.starterBatteryTaken === true || saved.hasBattery === true;
    spareBatteryTaken = saved.spareBatteryTaken === true;
    inventory = Array.isArray(saved.inventory)
      ? saved.inventory.filter((id) => typeof id === "string" && Object.hasOwn(itemCatalog, id)).slice(0, backpackCapacity)
      : saved.spareBattery === true ? [batteryItem] : [];
    if (Array.isArray(saved.pickedMedicine)) {
      pickedMedicine = new Set(saved.pickedMedicine.filter((id) => typeof id === "string"));
    }
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
      openingSeen,
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
      pickedMedicine: [...pickedMedicine],
      batterySeconds,
      flashlightOn,
      story: HospitalStory.data(),
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
  const height = scene.doorHeight * .85;
  actor.style.height = height + "px";
  actor.style.width = height * 272 / 256 + "px";
  drawCharacter(playerArt, playerCharacter, gait, sprinting, stride, player.facing, player.direction);
  HospitalMap.draw(sceneId, visited, { x: player.x, depth, direction: player.direction });
  const aim = player.direction;
  Lighting.draw({
    dark: !hasAmbientLight(),
    enabled: flashlightOn || emptyFlashTimer !== undefined,
    x: player.x + Math.cos(aim) * height * .15,
    y: player.y - height * (sprinting ? .52 : .60) + Math.sin(aim) * height * .09,
    direction: aim,
  });

  const next = hiddenAt ?? sceneInteractions
    .filter((interaction) => Math.abs(interaction.x - player.x) <= (interaction.kind ? 55 : 82) &&
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
  const side = view === "side";
  const stepLength = running ? (side ? 36 : 22) : (side ? 29 : 20);
  const frame = Math.floor(distance / stepLength) % walkCycle.length;
  const image = characterArt.get(running ? id + "-run" : id);
  context.clearRect(0, 0, width, height);
  context.save();
  if (side && facing < 0) {
    context.translate(width, 0);
    context.scale(-1, 1);
  }
  if (pose === "idle") {
    context.drawImage(image, 0, row * height, width, height, 0, 0, width, height);
  } else if (running) {
    const scale = .82;
    const hipX = runHips[view][frame];
    const lift = side && frame % 2 === 1 ? 5 : 0;
    context.drawImage(image, frame * width, row * height, width, height,
      width / 2 - hipX * scale, height * (1 - scale) - lift, width * scale, height * scale);
  } else {
    const hip = Math.round(height * .53);
    context.drawImage(image, width, row * height, width, hip, 0, 0, width, hip);
    context.drawImage(image, walkCycle[frame] * width, row * height + hip, width, height - hip,
      0, hip, width, height - hip);
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
  if (meter.value === value) return false;
  meter.value = value;
  number.textContent = value;
  meter.parentElement.style.setProperty("--level", (value / maximum * 100) + "%");
  return true;
}

function renderSanity() {
  const value = sanity > 0 ? Math.max(1, Math.floor(sanity)) : 0;
  return renderResource(sanityMeter, sanityNumber, value, maxSanity);
}

function updateSanity(elapsed) {
  if (elapsed === 0) return;
  const drain = !hasAmbientLight() && !flashlightOn ? darknessDrain : sanityDrain;
  loseSanity(drain * elapsed);
}

function loseSanity(amount) {
  sanity = Math.max(0, sanity - amount);
  const valueChanged = renderSanity();
  const portalsChanged = updateSanityStage();
  if (portalsChanged && scene.doors.some((portal) => portal.hallucination)) {
    buildInteractionCues();
    render();
  }
  if (sanity === 0) showDeath();
  if (valueChanged || portalsChanged) save();
}

function updateSanityStage() {
  const next = sanity < 20 ? "visions" : sanity < 50 ? "unstable" : sanity < 70 ? "decay" : "clear";
  if (stage.dataset.sanity === next) return false;
  const portalsChanged = (next === "visions") !== (sanityStage === "visions");
  if (next === "clear" || next === "decay") {
    clearSanityEffects();
    Quake.clearAir();
  } else if (portalsChanged) {
    removeFigure();
  }
  sanityStage = next;
  stage.dataset.sanity = next;
  untilStumble = next === "clear" || next === "decay" ? 0 : 2;
  untilFigure = next === "clear" ? 0 : next === "visions" ? .5 : 2;
  return portalsChanged;
}

function updateSanityEffects(elapsed) {
  if (sanityStage === "clear") return;

  if (sanityStage === "unstable" || sanityStage === "visions") {
    untilStumble -= elapsed;
    if (untilStumble <= 0) {
      stumbleTime = .28 + Math.random() * .17;
      untilStumble = 8 + Math.random() * 6;
      world.classList.add("stumbling");
      const left = clamp(player.x - visibleWidth / 2, 0, Math.max(0, scene.width - visibleWidth));
      const top = Math.max(0, sceneHeight - viewport.clientHeight / viewScale);
      Quake.shake({
        left, right: Math.min(scene.width, left + visibleWidth),
        ceiling: top + 34, floor: scene.floorY,
        playerX: player.x, strength: sanityStage === "visions" ? 1.2 : 1,
      });
    } else if (stumbleTime > 0) {
      stumbleTime = Math.max(0, stumbleTime - elapsed);
      if (stumbleTime === 0) world.classList.remove("stumbling");
    }
  }
  Quake.update(elapsed);

  untilFigure -= elapsed;
  if (untilFigure <= 0) {
    spawnFigure();
  } else if (figure) {
    figure.age += elapsed;
    if (figure.age >= figure.duration) {
      removeFigure();
      return;
    }
    if (figure.ghost && figure.age >= .36 && !figure.touched) {
      const dx = player.x - figure.x;
      const dy = player.y - figure.y;
      const distance = Math.hypot(dx, dy);
      const step = Math.min(distance, figure.speed * elapsed);
      if (step > 0) {
        figure.x += dx * step / distance;
        figure.y += dy * step / distance;
      }
    }
    renderFigure();
  }
}

function spawnFigure() {
  const ghost = sanityStage === "visions";
  const reach = Math.min(visibleWidth * .29, ghost ? 174 : 325);
  const offset = Math.cos(player.direction) < 0 ? -reach : reach;
  const camera = clamp(player.x - visibleWidth / 2, 0, Math.max(0, scene.width - visibleWidth));
  const left = Math.max(40, camera + visibleWidth * .09);
  const right = Math.min(scene.width - 40, camera + visibleWidth * .91);
  let x = clamp(player.x + offset, left, right);
  if (Math.abs(x - player.x) < reach * .65) x = clamp(player.x - offset, left, right);

  const severity = sanity < 6 ? 2 : sanity < 13 ? 1 : 0;
  figure = { x, y: scene.back + 7, age: 0, duration: 1.65, ghost };
  let height = scene.doorHeight * .85;
  if (ghost) {
    const pool = severity === 2 ? [3, 4, 5] : severity === 1 ? [2, 3, 4] : [0, 1, 2];
    const choices = pool.filter((index) => index !== lastGhost);
    lastGhost = choices[Math.floor(Math.random() * choices.length)];
    const variant = ghosts[lastGhost];
    const image = ghostArt.get(variant.art);
    height = scene.doorHeight * variant.height;
    Object.assign(figure, {
      y: clamp(player.y + (Math.random() - .5) * 40, scene.back + 3, scene.front),
      duration: 3 + severity * .4,
      speed: 42 + severity * 17,
      severity,
      touched: false,
    });
    const { width, height: canvasHeight } = sanityFigure;
  const scale = Math.min(width / image.naturalWidth, canvasHeight / image.naturalHeight);
    const spriteWidth = image.naturalWidth * scale;
    const spriteHeight = image.naturalHeight * scale;
    figureArt.clearRect(0, 0, width, canvasHeight);
    figureArt.drawImage(image, (width - spriteWidth) / 2, canvasHeight - spriteHeight, spriteWidth, spriteHeight);
  } else {
    drawCharacter(figureArt, playerCharacter, "idle", false, 0, 1, Math.PI / 2);
  }
  sanityFigure.style.height = height + "px";
  sanityFigure.style.width = height * 272 / 256 + "px";
  sanityFigure.dataset.figure = ghost ? "ghost" : "patient";
  untilFigure = figure.duration + (ghost ? 2.4 - severity * .5 : 7.5) + Math.random() * 3;
  renderFigure();
}

function renderFigure() {
  sanityFigure.style.left = figure.x + "px";
  sanityFigure.style.top = figure.y + "px";
  const peak = figure.ghost ? (hasAmbientLight() ? .88 : .58) : .72;
  sanityFigure.style.opacity = peak * Math.min(1, figure.age / .36, (figure.duration - figure.age) / .42);
}

function checkGhostContact() {
  if (!figure?.ghost || figure.touched || figure.age < .36 || figure.duration - figure.age < .22) return;
  if (Math.abs(player.x - figure.x) > 27 || Math.abs(player.y - figure.y) > 20) return;

  const severity = figure.severity;
  figure.touched = true;
  figure.age = Math.max(figure.age, figure.duration - .36);
  stamina = Math.max(0, stamina - (18 + severity * 5));
  recoveryTime = 1.6;
  if (stamina === 0) {
    exhausted = true;
    sprintReleased = false;
  }
  renderStamina();
  get("combat-status").textContent = "鬼影接触，理智和体力下降。";
  loseSanity(3 + severity);
  save();
}

function removeFigure() {
  figure = undefined;
  delete sanityFigure.dataset.figure;
  sanityFigure.style.opacity = "0";
}

function clearSanityEffects() {
  stumbleTime = 0;
  world.classList.remove("stumbling");
  removeFigure();
}

function showDeath() {
  if (!deathSequence.hidden || deathDialog.open) return;
  if (hiddenAt) leaveHideout();
  clearMovement();
  clearSanityEffects();
  Quake.clearAir();
  setAttackTime(0);
  statusHud.dataset.dead = "true";
  world.classList.add("player-dead");
  music.pause();
  get("combat-status").textContent = "理智耗尽。";
  get("restart-game").textContent = HospitalStory.hasRescue() ? "从求援检查点继续" : "重新开始";
  playDeathSequence();
}

function playDeathSequence() {
  const crowd = [
    [-8, 32, 4, 38, -.1], [107, 40, 94, 43, .1], [50, -24, 54, 22, .05], [34, 123, 41, 82, .35],
    [-11, 80, 19, 69, .25], [111, 85, 81, 73, .35], [18, -19, 25, 28, .22], [82, -28, 77, 30, .31],
    [-15, 10, 13, 14, .53], [118, 13, 92, 19, .48], [62, 129, 61, 86, .61], [40, -32, 47, 50, .59],
    [-9, 108, 10, 91, .79], [116, 111, 89, 93, .72], [52, -20, 52, 44, .88], [74, 124, 73, 84, .91],
  ];
  const ghostsOnScreen = crowd.map(([fromX, fromY, toX, toY, delay], index) =>
    deathSprite(ghostArt.get(ghosts[index % ghosts.length].art), "death-ghost",
      { fromX, fromY, toX, toY, delay, angle: (index % 5 - 2) * 6 }));
  const handsOnScreen = [
    [1, 103, 29, 50, 1.08, -30], [108, 111, 77, 54, 1.34, 27], [75, -28, 57, 39, 1.55, 151],
    [-14, 47, 20, 36, 1.7, -64], [99, 1, 83, 25, 1.9, 82], [47, 124, 52, 61, 2.04, -7],
  ].map(([fromX, fromY, toX, toY, delay, angle], index) =>
    deathSprite(reachingHands[index % reachingHands.length], "death-hand",
      { fromX, fromY, toX, toY, delay, angle }));

  deathSequence.replaceChildren(...ghostsOnScreen, ...handsOnScreen);
  deathSequence.hidden = false;
  viewport.inert = true;
  setTimeout(() => {
    deathSequence.hidden = true;
    deathSequence.replaceChildren();
    deathDialog.showModal();
  }, deathDuration);
}

function deathSprite(source, className, { fromX, fromY, toX, toY, delay, angle }) {
  const sprite = source.cloneNode();
  sprite.className = className;
  sprite.alt = "";
  sprite.style.left = toX + "%";
  sprite.style.top = toY + "%";
  sprite.style.setProperty("--start-x", (fromX - toX) + "vw");
  sprite.style.setProperty("--start-y", (fromY - toY) + "dvh");
  sprite.style.setProperty("--angle", angle + "deg");
  sprite.style.animationDelay = Math.max(0, delay) + "s";
  return sprite;
}

function setAttackTime(time) {
  attackTime = time;
  actor.classList.toggle("attacking", time > 0);
}

function attack() {
  if (hiddenAt || gameMenuOpen() || changingScene || attackTime > 0) return;
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
  if (hiddenAt || changingScene || gameMenuOpen()) return;
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
  const previousScene = sceneId;
  if (hiddenAt) leaveHideout();
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
  clearSanityEffects();
  get("location").textContent = "住院部 / " + scene.name;
  world.style.width = scene.width + "px";
  world.classList.toggle("dark", !hasAmbientLight());
  Lighting.resize(scene.width, sceneHeight);
  Quake.enter(id, scene.width, sceneHeight);
  backdrop.dataset.floor = scene.floor;
  backdrop.dataset.art = scene.art;
  backdrop.classList.toggle("mirrored", Boolean(scene.mirrored));
  const clean = cleanBackdrops.get(scene.art);
  backdrop.replaceChildren(image, ...(clean ? [clean] : []));

  updateSanityStage();
  HospitalStory.newScene(previousScene, arrival);
  buildInteractionCues();
  HospitalMap.update(sceneId, visited, HospitalStory.lockedAreas());
  updateViewSize();
  renderStamina();
  renderSanity();
  if (HospitalStory.isFinished()) HospitalStory.showEnding();
  else if (sanity === 0) showDeath();
  else if (id === start && HospitalStory.canCollect("knife")) openWardIntro();
  save();
}

function showWardPhase(phase) {
  wardPhase = phase;
  wardView.dataset.phase = phase;
  wardIntroAction.hidden = phase === "qte";
  wardQte.hidden = phase !== "qte";
  if (phase === "search") {
    get("ward-intro-hint").textContent = "林一睁开眼，发现自己的双手被绑在床上。右手边的床垫有一角翘起。";
    wardIntroAction.setAttribute("aria-label", "查看床垫");
    wardIntroAction.removeAttribute("title");
    wardIntroAction.textContent = "查看床垫";
  } else if (phase === "knife") {
    get("ward-intro-hint").textContent = "床垫缝里露出一截刀柄。";
    wardIntroAction.setAttribute("aria-label", "拿起餐刀");
    wardIntroAction.title = "拿起餐刀";
    wardIntroAction.replaceChildren(createItemIcon("knife"));
  } else {
    get("ward-intro-hint").textContent = "游标进入浅色目标区时，点击或按 E、空格。";
    updateWardQteRound();
    wardQteAction.focus();
  }
}

function openWardIntro() {
  clearMovement();
  wardQteHits = 0;
  wardQteTravel = 0;
  wardQteCooldown = 0;
  get("ward-qte-feedback").textContent = "";
  if (openingSeen) {
    finishWardWake();
    wardIntro.showModal();
    wardIntroAction.focus();
    return;
  }
  wardPhase = "opening";
  wardIntro.dataset.phase = wardPhase;
  wardIntro.setAttribute("aria-label", "林一的开场自白");
  wardIntro.removeAttribute("aria-describedby");
  wardView.hidden = true;
  get("ward-intro-caption").hidden = true;
  openingScene.hidden = false;
  skipOpening.hidden = false;
  openingIndex = 0;
  showOpeningLine();
  wardIntro.showModal();
  openingNext.focus();
}

function showOpeningLine() {
  const { shot, seconds, text } = HospitalCase.opening[openingIndex];
  openingScene.dataset.shot = shot;
  openingRemaining = seconds;
  openingLine.textContent = text;
}

function advanceOpening() {
  if (wardPhase !== "opening" || !wardIntro.open) return;
  openingIndex += 1;
  if (openingIndex === HospitalCase.opening.length) beginWardWake();
  else showOpeningLine();
}

function beginWardWake() {
  wardPhase = "wake";
  wardIntro.dataset.phase = wardPhase;
  wardView.dataset.phase = wardPhase;
  wardIntro.setAttribute("aria-label", "林一醒来");
  openingScene.hidden = true;
  wardIntroAction.hidden = true;
  wardView.hidden = false;
  openingSeen = true;
  save();
  skipOpening.focus();
}

function finishWardWake() {
  openingScene.hidden = true;
  skipOpening.hidden = true;
  wardView.hidden = false;
  get("ward-intro-caption").hidden = false;
  wardIntro.dataset.phase = "bedside";
  wardIntro.setAttribute("aria-label", "201 病房");
  wardIntro.setAttribute("aria-describedby", "ward-intro-hint");
  showWardPhase("search");
  if (wardIntro.open) wardIntroAction.focus();
}

function updateWardQteRound() {
  const { from, to } = wardQteRounds[wardQteHits];
  wardQteTrack.style.setProperty("--target-start", `${from * 100}%`);
  wardQteTrack.style.setProperty("--target-width", `${(to - from) * 100}%`);
  get("ward-qte-progress").textContent = `已磨开 ${wardQteHits} / ${wardQteRounds.length}`;
  wardQteTrack.style.setProperty("--cursor-position", "0%");
}

function wardCursorPosition() {
  return wardQteTravel <= 1 ? wardQteTravel : 2 - wardQteTravel;
}

function animateWardQte(elapsed) {
  if (wardQteCooldown > 0) {
    wardQteCooldown = Math.max(0, wardQteCooldown - elapsed);
    return;
  }
  wardQteTravel = (wardQteTravel + elapsed * wardQteRounds[wardQteHits].speed) % 2;
  wardQteTrack.style.setProperty("--cursor-position", `${wardCursorPosition() * 100}%`);
}

wardIntro.addEventListener("cancel", (event) => event.preventDefault());
openingNext.addEventListener("click", advanceOpening);
skipOpening.addEventListener("click", () => {
  if (wardPhase === "opening") beginWardWake();
  else if (wardPhase === "wake") finishWardWake();
});
wardView.querySelector(".ward-eyelids").addEventListener("animationend", () => {
  if (wardPhase === "wake") finishWardWake();
});
wardIntroAction.addEventListener("click", () => {
  if (!wardIntro.open) return;
  if (wardPhase === "search") showWardPhase("knife");
  else if (wardPhase === "knife") showWardPhase("qte");
});
wardQteAction.addEventListener("click", () => {
  if (!wardIntro.open || wardPhase !== "qte" || wardQteCooldown > 0) return;
  const { from, to } = wardQteRounds[wardQteHits];
  const cursor = wardCursorPosition();
  const feedback = get("ward-qte-feedback");
  if (cursor < from || cursor > to) {
    wardQteCooldown = .30;
    feedback.textContent = "没对准，再试一次。";
    return;
  }
  wardQteHits += 1;
  if (wardQteHits < wardQteRounds.length) {
    wardQteTravel = 0;
    wardQteCooldown = .32;
    feedback.textContent = "束缚松了一截。";
    updateWardQteRound();
    return;
  }
  wardIntro.close();
  if (HospitalStory.collectItem("knife")) {
    get("story-notice").textContent = "束缚已磨开，餐刀已放入背包。";
  }
});

function buildInteractionCues() {
  const itemSprites = [];
  const containers = HospitalCase.storage[sceneId] ?? [];
  for (const { art, cabinet, outline } of containers) {
    if (!cabinet && art === "drawer") continue;
    const fixture = document.createElement("span");
    if (cabinet) {
      fixture.className = "battery-cabinet";
      fixture.append(cabinetArt);
    } else {
      fixture.className = "storage-prop";
      fixture.dataset.prop = art;
    }
    fixture.setAttribute("aria-hidden", "true");
    positionOutline(fixture, cabinet ?? outline);
    itemSprites.push(fixture);
  }
  const items = containers.filter(({ requires }) => !requires || HospitalStory.hasRecord(requires))
    .map((container) => ({
      ...container, kind: "item", x: container.outline[0] + container.outline[2] / 2, y: scene.back + 30,
    }));
  if (scene.art.startsWith("stairs-")) {
    const plate = document.createElement("span");
    plate.className = "stair-floor-plate";
    plate.textContent = scene.floor;
    plate.setAttribute("aria-hidden", "true");
    itemSprites.push(plate);
  }
  const doors = scene.doors.filter((portal) => !portal.hallucination || sanityStage === "visions");
  const storySpots = HospitalStory.hotspots(sceneId, scene.back + 30);
  const linHua = LinHua.create(sceneId, scene, storySpots, HospitalStory.hasRecord("wristHua"), drawCharacter);
  if (linHua) itemSprites.push(linHua);
  sceneInteractions = [...doors, ...items, ...storySpots];
  if (scene.hideout) {
    const { type, outline } = scene.hideout;
    sceneInteractions.push({
      id: "hideout", kind: "hideout", type, outline, x: outline[0] + outline[2] / 2,
      y: scene.back + 35, label: type === "bed" ? "躲进床底" : "躲进高柜",
    });
    if (hiddenAt) hiddenAt = sceneInteractions.at(-1);
  }
  for (const spot of storySpots) {
    if (spot.avatar) continue;
    const symbol = document.createElement("span");
    symbol.className = "story-spot";
    if (spot.memory) {
      symbol.classList.add("memory-spot");
      symbol.append(createItemIcon("memory"));
    } else {
      symbol.textContent = spot.icon;
    }
    symbol.setAttribute("aria-hidden", "true");
    positionOutline(symbol, spot.outline);
    itemSprites.push(symbol);
  }
  markerButtons = new Map(sceneInteractions.map((interaction) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "interaction-cue";
    button.dataset.interaction = interaction.memory ? "item" : interaction.kind || "transition";
    if (interaction.memory) button.dataset.memory = "";
    if (interaction.avatar) button.dataset.avatar = "";
    if (interaction.kind === "story" && !interaction.memory) {
      const label = document.createElement("span");
      label.className = "story-spot-label";
      label.textContent = interaction.label;
      button.append(label);
    }
    if (interaction.side) button.dataset.side = interaction.side;
    positionOutline(button, interaction.outline);
    const locked = HospitalStory.needsKey(interaction);
    const label = interaction.verb === "开门" ? "开门 · " + interaction.label : interaction.label;
    const name = hiddenAt === interaction ? (interaction.type === "bed" ? "离开床底" : "离开高柜") : label;
    button.setAttribute("aria-label", locked ? name + " · 上锁" : name);
    if (locked) {
      const hint = document.createElement("span");
      hint.className = "story-spot-label";
      hint.textContent = interaction.label + " · 上锁";
      button.append(hint);
    }
    button.addEventListener("click", (event) => {
      if (event.detail === 0 && nearby === interaction) interact(interaction);
    });
    return [interaction.id, button];
  }));
  const thresholds = doors.filter((door) => door.side === "south").map(({ outline, hallucination }) => {
    const threshold = document.createElement("span");
    threshold.className = "foreground-threshold";
    if (hallucination) threshold.classList.add("hallucination-threshold");
    threshold.setAttribute("aria-hidden", "true");
    positionOutline(threshold, outline);
    const sill = document.createElement("span");
    sill.className = "threshold-sill";
    threshold.append(sill);
    return threshold;
  });
  markers.replaceChildren(...thresholds, ...itemSprites, ...markerButtons.values());
  showInteractionCue(undefined);
}

function positionOutline(element, [left, top, width, height]) {
  Object.assign(element.style, {
    left: left + "px", top: top + "px", width: width + "px", height: height + "px",
  });
}

function enterHideout(interaction) {
  clearMovement();
  hiddenAt = interaction;
  player.x = interaction.x;
  player.y = interaction.y;
  viewport.dataset.hiding = interaction.type;
  const leaveLabel = interaction.type === "bed" ? "离开床底" : "离开高柜";
  markerButtons.get(interaction.id)?.setAttribute("aria-label", leaveLabel);
  get("hiding-status").textContent = leaveLabel === "离开床底" ? "已躲在床底" : "已躲在高柜内";
  if (flashlightOn) {
    flashlightOn = false;
    updateFlashlightStatus("躲藏时已关闭手电。");
  }
  render();
  save();
}

function leaveHideout() {
  clearMovement();
  markerButtons.get(hiddenAt.id)?.setAttribute("aria-label", hiddenAt.label);
  hiddenAt = undefined;
  delete viewport.dataset.hiding;
  get("hiding-status").textContent = "";
  render();
}

async function interact(interaction = nearby) {
  if (gameMenuOpen() || changingScene || attackTime > 0 || !sceneInteractions.includes(interaction)) return;
  destination = undefined;
  if (hiddenAt) {
    if (interaction === hiddenAt) leaveHideout();
    return;
  }
  if (interaction.kind === "hideout") {
    enterHideout(interaction);
    return;
  }
  if (interaction.kind === "story") {
    HospitalStory.interactWith(interaction.id);
    return;
  }
  if (interaction.kind === "item") {
    clearMovement();
    get("inspection-title").textContent = interaction.label;
    inspectionView.dataset.art = interaction.art;
    inspectionView.style.backgroundImage = 'url("assets/inspect-' + interaction.art + '.webp")';
    renderInspection(interaction);
    inspection.showModal();
    return;
  }
  if (!HospitalStory.allowDoor(interaction)) return;
  const { target, arrival } = interaction;
  changingScene = true;
  try {
    const image = await prepareBackdrop(scenes[target].art);
    if (image) showScene(target, image, arrival);
  } finally {
    changingScene = false;
  }
}

function createItemIcon(id) {
  const type = supplyItems[id]?.type ?? HospitalCase.icons[id] ?? (id === medicineItem ? medicineItem : "document");
  const icon = document.createElement("span");
  icon.className = type === medicineItem ? "inventory-icon medicine-pack" : "inventory-icon";
  icon.dataset.item = type;
  icon.setAttribute("aria-hidden", "true");
  return icon;
}

function storedItemAvailable(id) {
  if (id === "battery") return !starterBatteryTaken;
  if (id === "spare-battery") return !spareBatteryTaken;
  if (supplyItems[id]) return !pickedMedicine.has(id);
  return HospitalStory.canCollect(id);
}

function collectStoredItem(id, name) {
  if (!supplyItems[id]) {
    if (!HospitalStory.collectItem(id)) return;
    return name + (HospitalStory.items[id] ? "已放入背包。" : "已收入文档栏。");
  }
  const { type } = supplyItems[id];
  const install = type === batteryItem && batterySeconds <= 0;
  if (!install && inventory.length >= backpackCapacity) return "背包已满。";
  if (id === "battery") starterBatteryTaken = true;
  else if (id === "spare-battery") spareBatteryTaken = true;
  else pickedMedicine.add(id);
  let message = name + "已放入背包。";
  if (install) {
    batterySeconds = batteryLifetime;
    flashlightOn = true;
    clearTimeout(emptyFlashTimer);
    emptyFlashTimer = undefined;
    clearTimeout(flashlightHintTimer);
    flashlightHint.textContent = "";
    message = "已装上电池，手电已开启。按 T 可开关。";
  } else {
    inventory.push(type);
  }
  updateFlashlightStatus(message);
  render();
  save();
  return message;
}

function renderInspection(container, message) {
  const buttons = [];
  container.contents.forEach((id, index) => {
    if (!storedItemAvailable(id)) return;
    const name = supplyItems[id]?.name ?? HospitalStory.items[id]?.name ?? HospitalCase.documents[id][0];
    const button = document.createElement("button");
    button.type = "button";
    button.className = "inspection-item";
    button.dataset.pickup = id;
    button.style.gridColumn = index + 1;
    button.setAttribute("aria-label", "拾取" + name);
    button.title = name;
    button.append(createItemIcon(id));
    button.addEventListener("click", () => {
      if (!inspection.open || !storedItemAvailable(id)) return;
      const result = collectStoredItem(id, name);
      if (storedItemAvailable(id)) {
        inspectionStatus.textContent = result;
      } else {
        renderInspection(container, result);
        (inspectionItems.querySelector("button") ?? get("close-inspection")).focus({ preventScroll: true });
      }
    });
    buttons.push(button);
  });
  inspectionItems.style.gridTemplateColumns = "repeat(" + container.contents.length + ", minmax(0, 1fr))";
  inspectionItems.replaceChildren(...buttons);
  inspectionStatus.textContent = message ?? (buttons.length ? "" : "里面已经空了。");
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
    ? (interaction.memory || interaction.kind === "hideout" ? "item" : interaction.kind || "transition")
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
  if (hiddenAt) {
    if (interaction === hiddenAt) interact(interaction);
    return;
  }
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
  if (!document.hidden && wardIntro.open) {
    if (wardPhase === "opening") {
      openingRemaining -= elapsed;
      if (openingRemaining <= 0) advanceOpening();
    } else if (wardPhase === "qte") animateWardQte(elapsed);
  }
  if (!document.hidden && !gameMenuOpen() && !changingScene) {
    drainBattery(elapsed);
    updateSanity(elapsed);
    if (sanity > 0) {
      updateSanityEffects(elapsed);
      if (attackTime > 0) setAttackTime(Math.max(0, attackTime - elapsed));
      updateMovement(elapsed, time);
      if (!gameMenuOpen() && !changingScene) HospitalStory.tick(elapsed);
    }
  }
  requestAnimationFrame(animate);
}

function updateMovement(elapsed, time) {
  if (hiddenAt) {
    updateStamina(elapsed, false, false);
    return;
  }
  const canMove = attackTime === 0 && stumbleTime === 0;
  const directions = new Set();
  if (canMove) {
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
  if (destination && canMove) {
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
  checkGhostContact();
  if (sanity === 0) return;
  const previousStamina = stamina;
  updateStamina(elapsed, holdingSprint, sprinting);
  if (exhausted && destination) destination.sprint = false;
  if (moving || previousStamina !== stamina) {
      clearTimeout(saveDelay);
      saveDelay = setTimeout(save, 200);
  }
  if (moving || facingChanged || dx || dy) render();
  if (destination && canMove && x === destination.x && y === destination.y && time >= destination.enterAfter) {
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
  if (wardIntro.open) {
    if (wardPhase === "opening" || wardPhase === "wake") {
      if (key === "e") {
        event.preventDefault();
        if (!event.repeat) {
          if (wardPhase === "opening") advanceOpening();
          else finishWardWake();
        }
      }
      return;
    }
    if (key === "e" || key === " " || key === "enter") {
      event.preventDefault();
      if (!event.repeat) (wardPhase === "qte" ? wardQteAction : wardIntroAction).click();
    }
    return;
  }
  if ((key === "m" || key === "i" || key === "n") && !event.repeat) {
    event.preventDefault();
    if (inspection.open && key === "n") inspection.close();
    if (key === "m") toggleGameMenu(map);
    else toggleGameMenu(key === "i" ? backpack : documentJournal);
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
  return wardIntro.open || map.open || backpack.open || documentJournal.open || inspection.open ||
    storyDialog.open || deathDialog.open || !deathSequence.hidden;
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
  if (dialog === documentJournal) HospitalStory.showJournal();
  if (dialog === map) HospitalMap.update(sceneId, visited, HospitalStory.lockedAreas());
  dialog.showModal();
}

function renderBackpack(message) {
  const slots = get("backpack-slots");
  const detail = get("backpack-detail");
  const use = get("backpack-use");
  selectedBackpackSlot = -1;
  use.hidden = true;
  get("backpack-capacity").textContent = inventory.length + " / " + backpackCapacity;
  const equipment = HospitalStory.equipment();
  detail.textContent = message ?? (inventory.length || equipment.length ? "选择物品查看详情" : "背包是空的");
  const equipmentList = get("story-equipment");
  equipmentList.hidden = !equipment.length;
  equipmentList.replaceChildren(...equipment.map((id) => {
    const item = HospitalStory.items[id];
    const row = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    row.className = "backpack-slot";
    button.setAttribute("aria-label", item.name);
    button.setAttribute("aria-pressed", "false");
    button.title = item.name;
    button.append(createItemIcon(id));
    button.addEventListener("click", () => {
      backpack.querySelector('.backpack-slot [aria-pressed="true"]')?.setAttribute("aria-pressed", "false");
      button.setAttribute("aria-pressed", "true");
      use.hidden = true;
      selectedBackpackSlot = -1;
      const name = document.createElement("strong");
      name.textContent = item.name;
      detail.replaceChildren(name, document.createTextNode(item.description));
    });
    row.append(button);
    return row;
  }));
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
    button.title = item.name;
    button.append(createItemIcon(id));
    button.addEventListener("click", () => {
      backpack.querySelector('.backpack-slot [aria-pressed="true"]')?.setAttribute("aria-pressed", "false");
      button.setAttribute("aria-pressed", "true");
      const name = document.createElement("strong");
      name.textContent = item.name;
      selectedBackpackSlot = index;
      use.hidden = id !== medicineItem;
      use.disabled = sanity >= maxSanity;
      const description = id === medicineItem && use.disabled ? "理智已满。" : item.description;
      detail.replaceChildren(name, document.createTextNode(description));
    });
    slot.append(button);
    return slot;
  });
  slots.replaceChildren(...entries);
}

get("backpack-use").addEventListener("click", async () => {
  const slot = selectedBackpackSlot;
  if (!backpack.open || changingScene || inventory[slot] !== medicineItem || sanity <= 0 || sanity >= maxSanity) return;

  const nextSanity = Math.min(maxSanity, sanity + medicineRecovery);
  const exit = scene.hallucination && nextSanity >= 20 ? scene.doors[0] : undefined;
  let image;
  if (exit) {
    changingScene = true;
    try {
      image = await prepareBackdrop(scenes[exit.target].art);
    } finally {
      changingScene = false;
    }
    if (!backpack.open || selectedBackpackSlot !== slot) return;
    if (!image) {
      get("backpack-detail").textContent = "走廊暂未加载，请重试。";
      return;
    }
  }

  inventory.splice(slot, 1);
  const restored = Math.min(medicineRecovery, maxSanity - Math.floor(sanity));
  sanity = nextSanity;
  if (exit) {
    showScene(exit.target, image, exit.arrival);
  } else {
    renderSanity();
    if (updateSanityStage() && scene.doors.some((portal) => portal.hallucination)) buildInteractionCues();
    render();
    save();
  }
  renderBackpack("已使用安神药，恢复 " + restored + " 点理智。" + (exit ? "幻觉消退，已回到走廊。" : ""));
  (get("backpack-slots").querySelector("button") ?? get("close-backpack")).focus();
});

get("minimap").addEventListener("click", () => toggleGameMenu(map));
get("close-map").addEventListener("click", () => map.close());
get("open-backpack").addEventListener("click", () => toggleGameMenu(backpack));
get("close-backpack").addEventListener("click", () => backpack.close());
get("close-inspection").addEventListener("click", () => inspection.close());
get("open-documents").addEventListener("click", () => toggleGameMenu(documentJournal));
get("close-documents").addEventListener("click", () => documentJournal.close());
get("document-tab").addEventListener("click", () => HospitalStory.showJournal());
get("truth-tab").addEventListener("click", () => HospitalStory.showJournal("truth"));
get("memory-tab").addEventListener("click", () => HospitalStory.showJournal("memories"));
get("close-story").addEventListener("click", () => storyDialog.close());
storyDialog.addEventListener("cancel", (event) => {
  if (HospitalStory.isFinished()) event.preventDefault();
});
deathDialog.addEventListener("cancel", (event) => event.preventDefault());
get("restart-game").addEventListener("click", async () => {
  if (!HospitalStory.hasRescue()) return restartFromEnding();
  const id = "3F-room-3";
  const image = await prepareBackdrop(scenes[id].art);
  if (!image || !deathDialog.open) return;
  sanity = maxSanity;
  stamina = maxStamina;
  exhausted = false;
  resumeAfterDeath(deathDialog);
  showScene(id, image, "return");
  playMusic();
});

function resumeAfterDeath(dialog) {
  world.classList.remove("player-dead");
  delete statusHud.dataset.dead;
  get("combat-status").textContent = "";
  get("story-notice").textContent = "";
  dialog.close();
  viewport.inert = false;
}

async function restartFromEnding() {
  const dialog = deathDialog.open ? deathDialog : storyDialog;
  const image = await prepareBackdrop(scenes[start].art);
  if (!image || !dialog.open) return;
  resetGame();
  resumeAfterDeath(dialog);
  showScene(start, image);
  updateFlashlightStatus("手电没有电");
  playMusic();
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
  lastGhost = undefined;
  Quake.reset();
  HospitalStory.stopPursuit();
  HospitalStory.read();
  setAttackTime(0);
  recoveryTime = 0;
  exhausted = false;
  sprintReleased = true;
  starterBatteryTaken = spareBatteryTaken = flashlightOn = false;
  inventory = [];
  pickedMedicine.clear();
  batterySeconds = 0;
}

async function prepareCharacter(id, running = false) {
  const key = running ? id + "-run" : id;
  if (characterArt.has(key)) return characterArt.get(key);
  const image = new Image();
  image.src = "assets/" + id + (running ? "-run-clean.webp" : "-walk.webp");
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
  assets.push(...HospitalStory.preloadPatrolArt());
  for (const art of arts) {
    if (!art.startsWith("vision-")) {
      assets.push(prepareBackdrop("clean-" + art).then((image) => {
        if (image) {
          image.classList.add("clean-panel");
          cleanBackdrops.set(art, image);
        }
        return image;
      }));
    }
  }
  music.src = "assets/bach-bwv1007-prelude.mp3";
  assets.push(prepareCabinet(), prepareTitleArtwork(), ...Array.from(wardIntro.querySelectorAll("img"), async (image) => {
    await image.decode();
    return image;
  }));
  const closeups = new Set(Object.values(HospitalCase.storage).flat().map(({ art }) => art));
  for (const art of closeups) assets.push(prepareBackdrop("inspect-" + art));
  for (const { art } of ghosts) {
    const image = new Image();
    image.src = "assets/" + art + ".webp";
    assets.push(image.decode().then(() => ghostArt.set(art, image)));
  }
  reachingHands.forEach((image, index) => {
    if (!image.src) image.src = "assets/ghost-hand-" + (index + 1) + ".webp";
    assets.push(image.decode().then(() => image));
  });
  assets.push(prepareCharacter(playerCharacter), prepareCharacter(playerCharacter, true), prepareCharacter("woman"));
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

async function enterGame(newGame = false) {
  if (!assetsReady || gameStarted || enteringGame) return;
  enteringGame = true;
  playMusic();
  const image = await prepareBackdrop(scenes[newGame ? start : sceneId].art);
  enteringGame = false;
  if (!image) return;
  if (newGame) {
    resetGame();
    openingSeen = false;
  }
  for (const dialog of document.querySelectorAll("#home dialog[open]")) dialog.close();
  gameStarted = true;
  get("home").hidden = true;
  stage.hidden = false;
  updateFlashlightStatus(batterySeconds > 0 ? (flashlightOn ? "手电已开启" : "手电已关闭") : "手电没有电");
  showScene(sceneId, image);
  new ResizeObserver(updateViewSize).observe(viewport);
  requestAnimationFrame(animate);
}

function continueGame() {
  if (savedGame) enterGame();
}

get("new-game").addEventListener("click", () => enterGame(true));
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

get("retry-assets").addEventListener("click", loadAssets);
HospitalStory.read();
readSave();
updateTitleMenu();
loadAssets();
