const HospitalStory = (() => {
  const { documents, tools, findings, locations, memories, nursePhonePin } = HospitalCase;
  const items = Object.fromEntries(Object.entries(tools).map(([id, [name, description]]) =>
    [id, { name, description }]
  ));
  const endings = {
    captured: ["遗传灾厄", "林一被押回 201。几周后，林晨、林心雨和林一先后死在院里。林画后来独自逃出，得到的却只有家人早已离院的答复。媒体镜头前，冯如痛哭。林博览站在她身后。冯如死后，集团再没有对外提起这所医院。\n2035 年秋，二十八岁的冯萍走进集团会议室。董事会说，她会是林博览的接班人。"],
    home: ["入虎穴，进肚子", "冯如替林一关好车门。一路上，他问过两次父亲在哪里，母亲都说，博览会照顾他。\n他回到熟悉的家，在自己的床上沉沉睡去。从那以后，他再也没有醒来。"],
    rescued: ["恶意", "警车和救护车赶到东侧后勤门。林一把房号交给救援人员，与林画留在院外。林晨和林海被送往另一家医院。林心雨未能获救。\n电话那头，Katty 听见林画叫了一声‘妈’。这一次，她们可以慢慢说话了。"],
  };
  const memorySanityFloor = 18;
  const patrolRoles = { "1F": "doctor", "2F": "nurse", "3F": "nurse", B1: "doctor" };
  const patrolForms = ["normal", "distorted", "ghost"];
  let records;
  let remembered;
  let equipment;
  let calledHome;
  let powerOn;
  let basementOpened;
  let ending;
  let epilogue;
  let pursuit;
  let guard;
  let feedbackTimer;

  function preloadPatrolArt() {
    return [...new Set(Object.values(patrolRoles))].flatMap((role) =>
      patrolForms.map((form) => prepareBackdrop("patrol-" + role + "-" + form)));
  }

  function read(data = {}) {
    data = data ?? {};
    records = new Set(Array.isArray(data.documents) ? data.documents.filter((id) => Object.hasOwn(documents, id)) : []);
    remembered = new Set(Array.isArray(data.memories) ? data.memories.filter((id) => Object.hasOwn(memories, id)) : []);
    equipment = new Set(Array.isArray(data.equipment) ? data.equipment.filter((id) => Object.hasOwn(tools, id)) : []);
    calledHome = data.calledHome === true;
    powerOn = data.powerOn === true;
    basementOpened = data.basementOpened === true;
    ending = Object.hasOwn(endings, data.ending) ? data.ending : undefined;
    epilogue = ["report", "confront"].includes(data.epilogue) ? data.epilogue : undefined;
    pursuit = undefined;
  }

  function data() {
    return { documents: [...records], memories: [...remembered], equipment: [...equipment], calledHome, powerOn, basementOpened, ending, epilogue };
  }

  function getObjective() {
    if (ending) return "本次调查已结束";
    if (availableMemory(sceneId)) return "查看房间里的记忆碎片";
    if (!equipment.has("knife")) return "检查 201 病房的床垫";
    if (!records.has("wristHua")) return "离开 201，查看二楼走廊";
    if (records.has("call")) {
      if (!basementOpened && !equipment.has("basementKey")) return "到 101 找地下室钥匙，再去接应救援";
      if (!equipment.has("exitKey")) return "从一楼下地下室，到 B03 找后勤门钥匙";
      return "从 B02 后勤门接应救援，或折返补查证据";
    }
    if (records.has("forumPost")) {
      if (records.has("transfer")) return "用 303 的手机给 Katty 打电话，报出地址和房号";
      if (equipment.has("archiveKey")) return "到 302 找转送单，查清医院地址和病房号";
      return "到 202 找档案室钥匙，再查医院地址和病房号";
    }
    if (records.has("nurseBirthday") || records.has("transfer")) return "去 303 与林画会合，查看护士留下的手机";
    if (calledHome) return "冯如在 103 等你，也可以继续找家人";
    if (equipment.has("archiveKey")) return "上三楼查档案，或用 202 的电话求助";
    return "到 202 找电话和钥匙，或下楼查看正门";
  }

  function objective() {
    get("story-objective").textContent = getObjective();
    get("document-count").textContent = records.size;
    get("open-documents").setAttribute("aria-label", `打开文档，已收集 ${records.size} 份`);
    get("memory-tab").textContent = remembered.size ? `林一的记忆 · ${remembered.size}` : "林一的记忆";
  }

  function notify(message) {
    const status = get("story-notice");
    status.textContent = message;
    clearTimeout(feedbackTimer);
    feedbackTimer = setTimeout(() => { status.textContent = ""; }, 4400);
  }

  function refresh() {
    objective();
    buildInteractionCues();
    render();
    save();
  }

  function collect(...ids) {
    for (const id of ids) records.add(id);
  }

  function panel(title, body, choices, locked = false) {
    const dialog = get("story-dialog");
    clearMovement();
    get("story-title").textContent = title;
    get("story-body").textContent = body;
    get("close-story").hidden = locked;
    const buttons = choices.map(([label, action]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "quiet";
      button.textContent = label;
      button.addEventListener("click", action);
      return button;
    });
    get("story-actions").replaceChildren(...buttons);
    if (!dialog.open) dialog.showModal();
    buttons[0]?.focus();
  }

  function openRecord(id) {
    const [title, source, content] = documents[id];
    panel(title, `${source}\n\n${content}`, [["收好文档", () => get("story-dialog").close()]]);
  }

  function callKatty() {
    panel("拨给 Katty", "林画报出母亲在集团海外办公室的号码。林一拨通电话，把手机递给林画。\n‘妈，我在医院。我哥也在这儿。去接 301 的林晨，还有 303 的爸爸。’\n林一接过电话，摊开转送单。", [["报上地址和房号", () => {
      collect("call", "board");
      get("story-dialog").close();
      stopPursuit();
      refresh();
      notify("Katty 联系了警察和救护车。去 B02 东侧后勤门接应，董事会纪要已收入文档。");
    }]]);
  }

  function showPostedForum() {
    const hasTransfer = records.has("transfer");
    const nextStep = hasTransfer
      ? ["给 Katty 打电话", callKatty]
      : ["继续找转送单", () => get("story-dialog").close()];
    const plan = hasTransfer
      ? "林画说，直接打给她妈妈 Katty，再把转送单上的地址和房号报过去。"
      : "林画说，还得直接打给她妈妈 Katty。先去 302 找转送单，把院区地址和病房号查清楚。";
    panel("求救帖已发布", `「${HospitalForum.post}」\n\n${plan}`, [nextStep]);
    const link = document.createElement("a");
    link.className = "quiet forum-thread-link";
    link.href = HospitalForum.thread;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "查看主线论坛";
    link.setAttribute("aria-label", "查看主线论坛（在新标签页打开）");
    get("story-actions").append(link);
  }

  function openNurseForum() {
    panel(HospitalForum.name, `发帖账号　${HospitalForum.author}\n${HospitalForum.title}\n\n${HospitalForum.post}`, [["发布求救帖", () => {
      collect("forumPost");
      refresh();
      showPostedForum();
    }]]);
  }

  function useNursePhone() {
    if (records.has("forumPost")) return showPostedForum();
    const lockHint = records.has("nurseBirthday")
      ? "林一想起 202 值班室抽屉里的交班便笺。"
      : "护士在走廊另一头交班。202 值班室可能留着她的东西。";
    panel("护士的手机", `推车上的手机还连着充电线。屏幕亮起，锁屏提示写着「生日（月日）」。\n${lockHint}`, []);
    const form = document.createElement("form");
    form.className = "phone-unlock";
    form.noValidate = true;
    const label = document.createElement("label");
    label.htmlFor = "nurse-phone-pin";
    label.textContent = "四位锁屏密码";
    const input = document.createElement("input");
    input.id = label.htmlFor;
    input.className = "phone-pin";
    input.type = "password";
    input.inputMode = "numeric";
    input.autocomplete = "off";
    input.maxLength = 4;
    input.setAttribute("aria-describedby", "phone-feedback");
    const button = document.createElement("button");
    button.type = "submit";
    button.className = "quiet";
    button.textContent = "解锁";
    const feedback = document.createElement("p");
    feedback.id = "phone-feedback";
    feedback.className = "phone-feedback";
    feedback.setAttribute("role", "status");
    form.append(label, input, button, feedback);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const pin = input.value.normalize("NFKC").trim();
      if (pin === nursePhonePin) {
        panel("手机已解锁", `屏幕上还开着护士常逛的本地论坛「${HospitalForum.name}」，账号仍处于登录状态。`, [["进入她常逛的论坛", openNurseForum]]);
        return;
      }
      feedback.textContent = /^[0-9]{4}$/.test(pin) ? "密码不对，再试一次。" : "请输入四位数字。";
      input.setAttribute("aria-invalid", "true");
      input.focus();
      input.select();
    });
    input.addEventListener("input", () => input.removeAttribute("aria-invalid"));
    get("story-actions").append(form);
    input.focus();
  }

  function interactWith(id) {
    if (id === "memory") {
      const fragment = availableMemory(sceneId);
      if (!fragment) return;
      remembered.add(sceneId);
      sanity = Math.max(sanity, memorySanityFloor);
      renderSanity();
      refresh();
      const memoryId = sceneId;
      const close = () => get("story-dialog").close();
      panel(fragment.title, fragment.detail, [
        ["查看解锁的人物关系", () => {
          close();
          showJournal("memories", memoryId);
          get("documents").showModal();
        }],
        ["继续探索", close],
      ]);
      return;
    }
    if (Object.hasOwn(documents, id)) {
      if (collectItem(id)) openRecord(id);
      return;
    }
    const close = () => get("story-dialog").close();
    switch (id) {
      case "meet":
        panel("楼梯口的女孩", "她盯着林一的腕带。\n‘你是林一？爸爸给我看过你的毕业照。我叫林画。五月他们把我们四个人都送来了，我有一阵子没见到林晨和林心雨了。’\n她把自己的腕带解下来递给他。\n‘要找人接我们，就打给集团海外办公室的 Katty。她是我妈。我去 301 找林晨，等会儿在 303 碰头。’", [["收好腕带，去找电话", () => {
          collect("wristHua");
          close();
          refresh();
        }]]);
        break;
      case "phone":
        if (!equipment.has("phoneKey")) return notify("通讯室锁着。钥匙应该在 202 值班室的抽屉里。");
        if (!records.has("contacts")) return notify("先在 202 找到值班号码簿。");
        if (records.has("call")) return notify("救援已经出发。东侧后勤门在 B02。");
        if (calledHome) return notify("冯如已在 103 等候。你还能去查家人所在的病房。");
        panel("通讯室", "号码簿上有冯如、林博览和集团海外办公室的联系方式。这部座机只能拨本地号码。", [["打给冯如", () => {
          calledHome = true;
          refresh();
          panel("冯如的电话", "‘你回来了？在 103 等我，别去找你爸。博览说你只需要休息两天。我开车来接你。’\n林一挂断电话，才意识到自己始终没说这里是哪家医院。", [["放下电话", close]]);
        }], ["继续调查", close]]);
        break;
      case "front":
        if (records.has("call")) return notify("冯如已经离开。去 B02 后勤门见接应的人。");
        if (!calledHome) return notify("正门只让家属来接。可去 202 打电话，或到 101 找后勤入口的线索。");
        panel("母亲在车里等你", "冯如摇下车窗，伸手替林一掸掉袖口的灰。\n‘上车吧。你表叔会照顾你爸。’\n上车后，你将离开医院。", [["回去找家人", close], ["上冯如的车", () => finish("home")]]);
        break;
      case "power":
        if (!equipment.has("fuse")) return notify("配电柜缺少应急照明备件。去 B03 设备间找一找。");
        equipment.delete("fuse");
        powerOn = true;
        refresh();
        notify("三楼应急灯已亮。可以在灯下查档和行动。");
        break;
      case "rescue":
        if (!records.has("wristHua")) return notify("先在二楼楼梯口找到林画。");
        useNursePhone();
        break;
      case "exit":
        if (!equipment.has("exitKey")) return notify("后勤门上了锁。备用钥匙在隔壁 B03 设备间。");
        if (!records.has("call")) return notify("外面只有卸货通道。先让院外的人知道家人的房号。可去 303 与林画求援。");
        panel("东侧后勤门", completeFindings().length === findings.length
          ? "门外传来接应的车声。你手上的材料已经足以还原全部经过。开门后将进入尾声。"
          : "门外传来接应的车声。你可以现在出去救人，也可以趁还有机会回去查阅剩下的证据。", [["回医院补查", close], ["开门接应救援", () => finish("rescued")]]);
        break;
    }
  }

  function isAvailable(id) {
    if (equipment.has(id) || records.has(id)) return false;
    if (id === "meet") return !records.has("wristHua");
    if (id === "power") return !powerOn;
    if (id === "fuse") return !powerOn;
    if (id === "surgery") return records.has("wristHua");
    if (id === "rescue") return !records.has("call");
    return true;
  }

  function canCollect(id) {
    return (Object.hasOwn(tools, id) || Object.hasOwn(documents, id)) && isAvailable(id);
  }

  function collectItem(id) {
    if (!canCollect(id)) return false;
    if (Object.hasOwn(tools, id)) equipment.add(id);
    else collect(id);
    refresh();
    return true;
  }

  function availableMemory(id) {
    return sanityStage === "visions" && !remembered.has(id) ? memories[id] : undefined;
  }

  function hotspots(id, y) {
    const fragment = availableMemory(id);
    const spots = (locations[id] ?? []).filter((spot) => isAvailable(spot.id));
    if (fragment) spots.push({ id: "memory", label: "拾取记忆碎片 · " + fragment.object, x: fragment.x, top: fragment.top, memory: true });
    return spots.map((spot) => ({
      ...spot,
      label: spot.id === "rescue" && records.has("forumPost") ? "再次查看护士的手机" : spot.label,
      y, kind: "story", outline: [spot.x - 22, spot.top, 44, 38],
    }));
  }

  function needsKey(door) {
    return Boolean(door.lock) && !(door.lock === "basementKey" && basementOpened) && !equipment.has(door.lock);
  }

  function lockedAreas() {
    return new Set(Object.values(Hospital.scenes).flatMap((room) => room.doors
      .filter(needsKey)
      .map((door) => door.lock === "basementKey" ? "B1" : door.target)));
  }

  function allowDoor(door) {
    if (sceneId === Hospital.start && !equipment.has("knife")) {
      notify("手还被绑着。先检查床垫。");
      return false;
    }
    if (sceneId === "2F-hall" && door.id === "stairs" && !records.has("wristHua")) {
      interactWith("meet");
      return false;
    }
    if (needsKey(door)) {
      notify(door.lock === "basementKey" ? "地下室铁门锁着。去 101 检查室找钥匙。" : "302 档案室锁着。去 202 值班室找钥匙。");
      return false;
    }
    return true;
  }

  function newScene(previousScene, arrival) {
    if (sceneId.startsWith("B1-")) basementOpened = true;
    const follower = guard && previousScene?.endsWith("-hall") && scene.hideout ? pursuit.role : undefined;
    stopPursuit();
    if (follower && arrival) {
      const entry = scene.doors.find((door) => door.id === arrival);
      pursuit = { role: follower, delay: 1.05, x: entry.x, entryX: entry.x, room: true, searchTime: 0 };
      const warning = get("pursuit-status");
      warning.textContent = "脚步声跟到门口了。";
      warning.hidden = false;
    } else if (!ending && records.has("wristHua") && !records.has("call") && sceneId.endsWith("-hall")) {
      const side = player.x > scene.width / 2 ? -1 : 1;
      pursuit = { role: patrolRoles[scene.floor], delay: 12, x: clamp(player.x + side * 530, 35, scene.width - 35) };
    }
    objective();
  }

  function stopPursuit() {
    pursuit = undefined;
    guard?.remove();
    guard = undefined;
    get("pursuit-status").hidden = true;
  }

  function movePatrol(toward, elapsed, speed) {
    const distance = toward - pursuit.x;
    const direction = Math.sign(distance);
    pursuit.x += direction * Math.min(Math.abs(distance), elapsed * speed);
    guard.style.left = `${pursuit.x}px`;
    if (direction) guard.style.setProperty("--facing", direction);
    guard.classList.toggle("walking", Math.abs(distance) > .5);
  }

  function tick(elapsed) {
    if (!pursuit || sanity <= 0 || ending) return;
    pursuit.delay -= elapsed;
    if (pursuit.delay > 3) return;
    const warning = get("pursuit-status");
    if (pursuit.delay > 0) {
      if (warning.hidden) {
        warning.textContent = "走廊里有脚步声。可以进房间躲避。";
        warning.hidden = false;
      }
      return;
    }
    if (!guard) {
      guard = document.createElement("div");
      guard.className = "story-guard";
      guard.setAttribute("aria-hidden", "true");
      guard.style.height = scene.doorHeight * .84 + "px";
      guard.style.top = scene.back + 76 + "px";
      for (const form of patrolForms) {
        const image = new Image();
        image.src = "assets/patrol-" + pursuit.role + "-" + form + ".webp";
        image.alt = "";
        image.dataset.form = form;
        guard.append(image);
      }
      world.append(guard);
      warning.textContent = pursuit.room ? "巡查进房间了。" : "巡查发现了你！";
      warning.hidden = false;
    }
    if (pursuit.room && hiddenAt) {
      pursuit.searchTime += elapsed;
      const [left, , width] = scene.hideout.outline;
      const side = left + width / 2 < pursuit.entryX ? -1 : 1;
      const inspectX = clamp(pursuit.entryX + side * 170, 35, scene.width - 35);
      const target = pursuit.searchTime < 1.85 ? inspectX : pursuit.entryX;
      movePatrol(target, elapsed, 124);
      if (pursuit.searchTime >= 1.85 && pursuit.x === pursuit.entryX) {
        stopPursuit();
        notify("脚步声远了。");
      }
      return;
    }
    if (pursuit.room) pursuit.searchTime = 0;
    const distance = player.x - pursuit.x;
    if (Math.abs(distance) < 34) return finish("captured");
    movePatrol(player.x, elapsed, pursuit.room ? 152 : 270);
  }

  function completeFindings() {
    return findings.filter((finding) => finding.documents.every((id) => records.has(id)));
  }

  function showJournal(mode = "documents", selection) {
    const entries = get("document-entries");
    const detail = get("document-detail");
    const docs = get("document-tab");
    const truth = get("truth-tab");
    docs.setAttribute("aria-pressed", mode === "documents");
    truth.setAttribute("aria-pressed", mode === "truth");
    get("memory-tab").setAttribute("aria-pressed", mode === "memories");
    get("document-layout").dataset.mode = mode;
    entries.replaceChildren();
    detail.replaceChildren();
    if (mode === "truth") {
      for (const finding of findings) {
        const missing = finding.documents.filter((id) => !records.has(id));
        const heading = document.createElement("h3");
        heading.textContent = `${finding.title} · ${missing.length ? "待核实" : "已查明"}`;
        const body = document.createElement("p");
        body.textContent = missing.length
          ? "下一处可以查 " + documents[missing[0]][1] + "，找「" + documents[missing[0]][0] + "」。"
          : finding.conclusion;
        detail.append(heading, body);
      }
      return;
    }
    const memoryMode = mode === "memories";
    const collected = memoryMode ? remembered : records;
    if (!collected.size) {
      detail.textContent = memoryMode ? "理智低于 20 时，留意走廊里陌生的门。拾取门后的碎片，找回林一记得的人物关系。" : "在病房和各楼层搜集文件、证词和通话记录。";
      return;
    }
    const selected = collected.has(selection) ? selection : [...collected].at(-1);
    for (const id of collected) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "quiet";
      button.dataset.document = id;
      const name = document.createElement("span");
      name.textContent = memoryMode ? memories[id].title : documents[id][0];
      button.append(createItemIcon(memoryMode ? "memory" : id));
      button.append(name);
      button.setAttribute("aria-pressed", id === selected);
      button.addEventListener("click", () => {
        showJournal(mode, id);
        entries.querySelector(`[data-document="${id}"]`).focus();
      });
      entries.append(button);
    }
    if (memoryMode) {
      renderMemory(detail, memories[selected]);
      return;
    }
    const [title, source, content] = documents[selected];
    const heading = document.createElement("h3");
    const location = document.createElement("p");
    const body = document.createElement("p");
    heading.textContent = title;
    location.className = "document-source";
    location.textContent = source;
    body.textContent = content;
    detail.append(heading, location, body);
  }

  function renderMemory(detail, fragment) {
    const heading = document.createElement("h3");
    heading.textContent = fragment.title;
    const label = document.createElement("p");
    label.className = "document-source";
    label.textContent = "林一当时的印象";
    const relations = document.createElement("dl");
    relations.className = "memory-relations";
    for (const [person, role, recollection] of fragment.relations) {
      const entry = document.createElement("div");
      const term = document.createElement("dt");
      const roleLabel = document.createElement("span");
      roleLabel.textContent = role;
      term.append(person, roleLabel);
      const description = document.createElement("dd");
      description.textContent = recollection;
      entry.append(term, description);
      relations.append(entry);
    }
    const passage = document.createElement("p");
    passage.className = "memory-passage";
    passage.textContent = fragment.detail;
    detail.append(heading, label, relations, passage);
  }

  function finish(id) {
    if (ending) return;
    ending = id;
    stopPursuit();
    objective();
    save();
    showEnding();
    playEndingCG();
  }

  function playEndingCG() {
    const wasPlaying = !music.paused;
    EndingCG.play(ending, endings[ending][0], {
      complete: completeFindings().length === findings.length,
      volume: music.volume,
      pauseMusic: () => music.pause(),
      resumeMusic: () => { if (wasPlaying) playMusic(); },
    });
  }

  function showEnding() {
    if (!ending) return;
    const [title, opening] = endings[ending];
    const replay = ["重播结局动画", playEndingCG];
    const restart = ["重新开始", () => restartFromEnding()];
    const review = ["回看文档", () => {
      showJournal();
      get("documents").showModal();
    }];
    if (ending !== "rescued") return panel(title, opening, [replay, review, restart], true);
    const confirmed = completeFindings();
    const summary = confirmed.length === findings.length ? "完整真相已查明" : `已查明 ${confirmed.length} / ${findings.length} 组真相`;
    if (!epilogue) {
      const choose = (choice) => { epilogue = choice; save(); showEnding(); };
      return panel(title, `${opening}\n\n${summary}`, [["检举林博览和冯如", () => choose("report")], ["与林博览对质", () => choose("confront")], replay], true);
    }
    const response = epilogue === "report"
      ? "林一把带出来的材料逐份交给调查人员。轮到那条接机记录时，他停了片刻，才说出签字人的名字。"
      : "隔着探视室的玻璃，林一问林博览：‘你以前来接我放学的时候，也想过会有今天吗？’对方抬了一下眼睛，没有回答。";
    const known = confirmed.map(({ title, conclusion }) => `${title}\n${conclusion}`);
    const unknown = findings.filter((finding) => !confirmed.includes(finding)).map((finding) => finding.title);
    panel(title, [response, summary, ...known, unknown.length ? "仍待查证：" + unknown.join("、") : "", "送行录像的最后几秒，林一听见那首歌还在唱。"].filter(Boolean).join("\n\n"), [replay, review, restart], true);
  }

  return { read, data, items, canCollect, collectItem, hasRecord: (id) => records.has(id),
    equipment: () => [...equipment], hasPower: () => powerOn, hasRescue: () => records.has("call"),
    hotspots, interactWith, allowDoor, needsKey, lockedAreas, newScene, tick, stopPursuit, preloadPatrolArt,
    showJournal, showEnding, isFinished: () => Boolean(ending) };
})();
