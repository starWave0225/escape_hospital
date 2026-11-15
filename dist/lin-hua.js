"use strict";

const LinHua = (() => {
  function create(sceneId, scene, storySpots, hasMet, drawCharacter) {
    const meeting = sceneId === "2F-hall" && storySpots.find((spot) => spot.id === "meet");
    const inObservationRoom = sceneId === "3F-room-3" && hasMet;
    if (!meeting && !inObservationRoom) return;

    const interaction = meeting || storySpots.find((spot) => spot.id === "surgery");
    // Leave space on either side for the bedside cabinet and the nurse's phone cue.
    const x = meeting ? meeting.x : 638;
    const y = scene.back + 30;
    const height = scene.doorHeight * .81;
    const canvas = document.createElement("canvas");
    canvas.id = "lin-hua";
    canvas.className = "actor lin-hua";
    canvas.width = 272;
    canvas.height = 256;
    canvas.setAttribute("aria-hidden", "true");
    Object.assign(canvas.style, {
      left: x + "px", top: y + "px", width: height * canvas.width / canvas.height + "px", height: height + "px",
    });
    drawCharacter(canvas.getContext("2d"), "woman", "idle", false, 0, 1, Math.PI / 2);

    if (interaction) {
      const width = height * .32;
      interaction.x = x;
      interaction.outline = [x - width / 2, y - height, width, height];
      interaction.avatar = true;
    }
    return canvas;
  }

  return { create };
})();
