"use strict";

let diaryArrival;

async function turnDiaryPage(leaf, direction, destination) {
  const from = location.hash;
  leaf.dataset.turning = direction;
  const rotation = direction === "forward" ? -86 : 49;
  const turn = leaf.animate([
    { transform: "rotateY(0deg)", opacity: 1 },
    { transform: `rotateY(${rotation * 0.44}deg)`, opacity: 1, offset: 0.46 },
    { transform: `rotateY(${rotation}deg)`, opacity: 0.82 },
  ], { duration: 350, easing: "cubic-bezier(.45,.06,.64,1)", fill: "forwards" });

  try {
    await turn.finished;
  } catch {
    return;
  } finally {
    delete leaf.dataset.turning;
  }
  if (!leaf.isConnected || location.hash !== from) return;
  diaryArrival = { destination, direction };
  goBrowser(destination);
}

function finishDiaryTurn(leaf, direction) {
  const rotation = direction === "forward" ? 22 : -72;
  leaf.dataset.turning = direction;
  const settle = leaf.animate([
    { transform: `rotateY(${rotation}deg)`, opacity: 0.84 },
    { transform: "rotateY(0deg)", opacity: 1 },
  ], { duration: 300, easing: "cubic-bezier(.16,.64,.3,1)" });
  const clearTurn = () => { delete leaf.dataset.turning; };
  settle.finished.then(clearTurn, clearTurn);
}

function addDiaryTurn(control, leaf, direction) {
  control.addEventListener("click", event => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (!leaf.animate || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    event.preventDefault();
    if (!leaf.dataset.turning) turnDiaryPage(leaf, direction, control.hash);
  });
}

function renderDiaryBook(container, id = "") {
  const pages = webSites.diary.pages;
  const pageIds = Object.keys(pages);
  const pageIndex = pageIds.indexOf(id);
  const { title, blocks } = pages[id];
  const book = node("article", "", "records-site diary-book");
  book.dataset.records = "diary";
  book.dataset.recordId = id || "cover";

  const spread = node("div", "", "diary-spread");
  const facing = node("aside", "", "diary-facing");
  facing.setAttribute("aria-hidden", "true");
  const previous = pageIds[pageIndex - 1];
  const pastPage = pages[previous];
  const pastTitle = pastPage?.title.replace(/^日记 · /u, "") ?? "冯如";
  facing.append(node("p", pastTitle, "diary-facing-title"));
  const pastEntry = pastPage?.blocks.find(([type]) => type === "p" || type === "quote");
  if (pastEntry) facing.append(marked("p", pastEntry[1], "diary-facing-excerpt"));

  const stack = node("div", "", "diary-stack");
  const leaf = node("section", "", "diary-leaf");
  const header = node("header", "", "diary-leaf-header");
  const heading = node("h2", title.replace(/^日记 · /u, ""), "diary-page-title");
  heading.tabIndex = -1;
  header.append(heading);
  if (pageIndex) header.append(node("span", `${pageIndex} / ${pageIds.length - 1}`, "diary-folio"));

  const writing = node("div", "", "records-content diary-writing");
  const next = blocks.find(([type, , target]) => type === "link" && target.startsWith("diary/"));
  renderWebBlocks(writing, blocks.filter(block => block !== next), "diary");
  leaf.append(header, writing);
  stack.append(leaf);
  spread.append(facing, stack);

  const controls = node("nav", "", "diary-controls");
  controls.setAttribute("aria-label", "日记翻页");
  if (previous !== undefined) {
    const back = link(previous ? "上一页" : "回到封面", previous ? "diary/" + previous : "diary", "diary-prev");
    addDiaryTurn(back, leaf, "backward");
    controls.append(back);
  }
  if (next) {
    const [, label, target] = next;
    const forward = link(label, target, "diary-next");
    addDiaryTurn(forward, leaf, pageIndex === pageIds.length - 1 ? "backward" : "forward");
    controls.append(forward);
  }
  book.append(spread, controls);
  container.append(book);

  const arrival = diaryArrival;
  diaryArrival = undefined;
  if (arrival?.destination === location.hash && leaf.animate && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    finishDiaryTurn(leaf, arrival.direction);
  }
}
