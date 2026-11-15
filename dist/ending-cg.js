const EndingCG = (() => {
  const dialog = document.getElementById("ending-cg");
  const video = document.getElementById("ending-cg-video");
  const title = document.getElementById("ending-cg-title");
  const status = document.getElementById("ending-cg-status");
  let playback;

  function play(ending, endingTitle, options) {
    if (dialog.open) return;
    const baseSource = `assets/endings/${ending}.mp4`;
    const fullSource = options.complete && ending === "rescued" ? video.dataset.completeSource : undefined;
    const request = { options, baseSource, source: fullSource || baseSource };
    playback = request;
    title.textContent = endingTitle;
    video.setAttribute("aria-label", endingTitle + "结局动画");
    video.volume = options.volume;
    status.hidden = true;
    dialog.showModal();
    options.pauseMusic();
    load(request);
  }

  function load(request) {
    video.src = request.source;
    video.play().catch((error) => {
      if (playback !== request || error.name !== "NotAllowedError") return;
      status.textContent = "点击视频中的播放按钮，或跳过动画。";
      status.hidden = false;
    });
  }

  function close() {
    if (!dialog.open) return;
    dialog.close();
    const request = playback;
    playback = undefined;
    video.pause();
    video.removeAttribute("src");
    video.load();
    request?.options.resumeMusic();
  }

  video.addEventListener("playing", () => { status.hidden = true; });
  video.addEventListener("ended", close);
  video.addEventListener("error", () => {
    if (!playback || !dialog.open) return;
    if (playback.source !== playback.baseSource) {
      playback.source = playback.baseSource;
      load(playback);
    } else {
      status.textContent = "动画暂时无法播放。你可以跳过动画查看结局。";
      status.hidden = false;
    }
  });
  document.getElementById("skip-ending-cg").addEventListener("click", close);
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    close();
  });

  return { play };
})();
