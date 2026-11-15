"use strict";

const transferPassengers = ["林海", "林晨", "林心雨", "林画", "林一"];
const transferRows = PostcodeMap.destinations.map((destination, index) => ({
  ...destination, passenger: transferPassengers[index],
}));
const transferCode = transferRows.map(({ postal }) => postal).join("");

function normalizeTransferCode(query) {
  return query.normalize("NFKC").replace(/\s+/gu, "");
}

const contactIds = ["group", "mother", "ping", "katty", "police", "report"];
const webSites = {
  ...WebPublicSites,
  ...WebEvidenceSites,
  transfer: {
    title: "转运回执", domain: "transfer.local", description: "按同批回执查询原始联络点。",
    keywords: ["转运回执 校验 邮编 联络点"], pages: Object.fromEntries(
      [["", "转运回执查询"], ...transferRows.map(({ passenger }, index) => ["0" + (index + 1), passenger + " · 转运回执"])]
        .map(([id, title]) => [id, { title }]),
    ),
  },
  contacts: {
    title: "京海警方与联络", domain: "contact.local", description: "京海警方公开求助与收证入口。",
    keywords: ["警方 报警 求助 收证"], pages: Object.fromEntries(
      [["", "京海警方 · 联系入口"], ...contactIds.map(id => [id, WebContacts[id].title])]
        .map(([id, title]) => [id, { title }]),
    ),
  },
  endings: {
    title: "消息回执", domain: "outcome.local", searchable: false,
    pages: Object.fromEntries(Object.entries(WebContacts.endings).map(([id, { title }]) => [id, { title }])),
  },
};

function marked(tag, text, className) {
  const element = node(tag, "", className);
  for (const [index, part] of text.split("**").entries()) {
    element.append(index % 2 === 1 ? node("strong", part) : document.createTextNode(part));
  }
  return element;
}

function siteLink(label, destination, section) {
  return (destination.split("/")[0] === section ? link : tabLink)(label, destination);
}

function createDiaryTalisman() {
  const stage = node("div", "", "diary-talisman-stage");
  const inscription = node("div", "", "diary-under-ink");
  inscription.id = "diary-talisman-inscription";
  inscription.hidden = true;
  inscription.append(node("span", "林海"), node("span", "林海"));

  const lift = button("");
  lift.className = "diary-talisman-lift";
  lift.setAttribute("aria-controls", inscription.id);
  lift.setAttribute("aria-expanded", "false");
  const paper = node("img", "", "diary-talisman-paper");
  paper.alt = "";
  paper.width = 750;
  paper.height = 2097;
  paper.decoding = "async";
  paper.src = "assets/diary/folded-talisman-night.webp";
  const label = node("span", "掀开符纸", "diary-talisman-action");
  lift.append(paper, label);
  lift.addEventListener("click", () => {
    const lifted = inscription.hidden;
    inscription.hidden = !lifted;
    stage.toggleAttribute("data-lifted", lifted);
    lift.setAttribute("aria-expanded", String(lifted));
    label.textContent = lifted ? "放回符纸" : "掀开符纸";
  });
  stage.append(inscription, lift);
  return stage;
}

function renderWebBlocks(body, blocks, section) {
  for (const [type, text, detail] of blocks) {
    if (type === "link") body.append(siteLink(text, detail, section));
    else if (type === "h") body.append(marked("h3", text));
    else if (type === "quote") body.append(marked("blockquote", text));
    else if (type === "diary-note") body.append(marked("p", text, "diary-note"));
    else if (type === "diary-photo") {
      const photo = node("figure", "", "diary-snapshot");
      photo.dataset.photo = text;
      const image = node("img");
      image.alt = "";
      [image.width, image.height] = text === "floral-dress" ? [1122, 1402] : [1536, 1024];
      image.decoding = "async";
      image.src = `assets/diary/${text}.webp`;
      photo.append(image, marked("figcaption", detail));
      body.append(photo);
    } else if (type === "scene") {
      const scene = node("figure", "", "web-scene");
      scene.dataset.scene = text;
      if (text === "talisman") {
        scene.append(createDiaryTalisman());
      } else if (text === "altar") {
        scene.append(node("span", "祭", "web-scene-mark"));
        const candles = node("div", "", "web-candles");
        candles.setAttribute("aria-hidden", "true");
        candles.append(node("span"), node("span"), node("span"));
        scene.append(candles);
      }
      scene.append(marked("figcaption", detail));
      body.append(scene);
    } else body.append(marked("p", text));
  }
}

function renderRegistrySearch(body, query) {
  const form = node("form", "", "lookup-form web-site-search");
  const label = node("label", "查询企业");
  label.htmlFor = "web-site-search";
  const input = node("input");
  input.id = label.htmlFor;
  input.type = "search";
  input.value = query;
  input.maxLength = 100;
  input.placeholder = "输入企业名称";
  form.append(label, input, button("站内搜索", "submit"));
  form.addEventListener("submit", event => {
    event.preventDefault();
    const text = input.value.trim();
    goBrowser("#registry" + (text ? "?" + new URLSearchParams({ q: text }) : ""));
  });
  body.append(form);
  if (!query) return;

  const terms = normalizeSearch(query).split(/\s+/u);
  const results = Object.entries(webSites.registry.pages).filter(([id, page]) => {
    if (!id) return false;
    const bodyText = page.blocks.filter(([type]) => type !== "link").map(([, text]) => text).join(" ");
    return textMatches(page.title + " " + bodyText.replaceAll("**", ""), terms);
  });
  if (!results.length) body.append(node("p", "没有找到相关资料。"));
  for (const [id, { title }] of results) body.append(link(title, "registry/" + id));
}

function canViewEnding(id) {
  return Boolean(ending) && (ending === id || (ending === "truth" && id === "rescued"));
}

function renderTransfer(body, id, params) {
  if (id) {
    const { passenger, name, postal, address } = transferRows[Number(id) - 1];
    const fields = node("dl", "", "web-record");
    for (const [label, value] of [
      ["项目", "院外康复转运"], ["批次", "JH-0620"], ["回执序号", id],
      ["姓名", "**" + passenger + "**"], ["纸面目的地", "**" + name + "**"],
      ["目的地地址", address], ["目的地邮编", "**" + postal + "**"],
    ]) {
      fields.append(node("dt", label), marked("dd", value));
    }
    body.append(fields, tabLink("在地图查这个邮编", "map?" + new URLSearchParams({ q: postal })),
      link("打开同批回执查询", "transfer"));
    return;
  }

  const form = node("form", "", "lookup-form");
  const label = node("label", "同批回执号码");
  label.htmlFor = "transfer-code";
  const input = node("input");
  input.id = label.htmlFor;
  input.inputMode = "numeric";
  input.autocomplete = "off";
  input.maxLength = 48;
  const query = params.get("code") ?? "";
  input.value = query;
  form.append(label, input, button("查询", "submit"));
  form.addEventListener("submit", event => {
    event.preventDefault();
    goBrowser("#transfer?" + new URLSearchParams({ code: normalizeTransferCode(input.value) }));
  });
  body.append(marked("p", "按回执编号 **01 至 05** 抄下目的地邮编，连续输入，共 **30 位**。"), form);
  if (!params.has("code")) return;
  const normalized = normalizeTransferCode(query);
  if (normalized !== transferCode) {
    const text = /^\d{30}$/.test(normalized) ? "查不到这批回执。看一下编号顺序。" : "请填齐同批五张回执上的 30 位号码。";
    const feedback = node("p", text, "feedback");
    feedback.setAttribute("role", "status");
    body.append(feedback);
    return;
  }
  const lastPostal = transferRows.at(-1).postal;
  body.append(node("h3", "05 · 原始联络点"),
    marked("p", "姓名 **林一**。内部地址码 **" + lastPostal + "**。接转地点为 **京海市立医院东院区住院部，松桥路 18 号**。", "complete-note"),
    marked("p", "求助时可附上这条查询结果的地址。"),
    tabLink("查京海市立医院的公开名录", "directory"),
    tabLink("京海警方求助入口", "contacts/police"));
}

const reportRequirements = [
  ["archive/transfer", "evidence/admissions", "evidence/handover", "evidence/pickup", "evidence/consent"],
  ["archive/medicine", "evidence/dispatch", "evidence/lab"],
  ["archive/surgery", "archive/control", "evidence/operation", "evidence/payment", "evidence/escort"],
  ["archive/letter", "evidence/board"],
];
const reportSubjects = ["送院与交班", "补品的发放和检验", "王多丽的手术与冯如签字", "接班安排"];

function evidenceLinks(message) {
  return new Set(message.split(/[\s,，;；、]+/u).map(part => {
    const clean = part.replace(/^[（(【\[]+|[）)】\]。]+$/gu, "");
    const hash = clean.includes("#") ? clean.slice(clean.indexOf("#") + 1) : "";
    const route = hash || addressRoute(clean) || clean;
    return route.split("?")[0];
  }));
}

function hasEastCampus(text) {
  return text.includes("东院区") || text.includes("松桥路18号");
}

function hasNamedRoom(text) {
  return text.includes("林一") && /(?<!\d)201(?!\d)/u.test(text);
}

function hasOriginalPost(text) {
  return (text.includes("我是京海的林一") && text.includes("我被困在一处医院")) ||
    /(?:#|jinghai-bbs\.local\/)thread\/help\b/u.test(text);
}

function hasTransferProof(text) {
  const receipt = new RegExp("transfer\\?code=" + transferCode + "(?!\\d)", "u");
  const code = new RegExp("(?<!\\d)" + transferCode + "(?!\\d)", "u");
  return receipt.test(text) || (code.test(text) && hasEastCampus(text));
}

function replyFromPing(text) {
  if (pingClues.has("diary") && hasTransferProof(text)) {
    pingClues.add("room");
    return "我问到了。东院区住院部，**201**。直接发给警方吧。别在消息里写我的名字。";
  }
  if (pingClues.has("diary") && text.includes("院外康复转运")) {
    pingClues.add("receipt");
    return "这张是 **05**，我藏了一份。付款单也在下面。日记上三处页脚的字是我留的，顺序在最后一页。";
  }
  if (hasOriginalPost(text)) {
    pingClues.add("diary");
    return WebContacts.ping.success;
  }
  return pingClues.has("diary")
    ? "有项目名字或者查到的原始联络点吗？把你查到的那页发我。" : WebContacts.ping.blocked;
}

function renderContacts(body, id) {
  if (!id) {
    body.append(link("提交紧急求助", "contacts/police"), link("补交调查材料", "contacts/report"));
    return;
  }
  const contact = WebContacts[id];
  body.append(marked("p", contact.summary), marked("p", contact.initial, "web-reply"));
  const received = contactMessages[id];
  if (received) {
    body.append(node("p", received.message, "forum-outgoing"),
      marked("p", received.reply, "web-reply"));
  }
  if (id === "ping") {
    if (pingClues.has("diary")) body.append(tabLink("冯如的日记副本", "diary"));
    if (pingClues.has("receipt")) body.append(tabLink("05 号回执", "transfer/05"), tabLink("付款单", "evidence/payment"));
    if (pingClues.has("room")) body.append(marked("p", "补充地址：东院区住院部 **201**。"));
  }
  if (ending === "group" || ending === "mother" || ending === "truth") {
    body.append(link("查看消息回执", "endings/" + ending));
    return;
  }
  if (ending === "rescued") body.append(link("查看救援回执", "endings/rescued"), link("补交调查材料", "contacts/report"));
  if (ending === "rescued" && ["group", "mother"].includes(id)) return;

  const form = node("form", "", "case-message-form");
  const label = node("label", id === "report" ? "说明与证据链接" : "消息正文");
  label.htmlFor = "contact-message";
  const message = node("textarea");
  message.id = label.htmlFor;
  message.rows = 4;
  message.maxLength = 8000;
  message.required = true;
  if (id === "report") {
    message.placeholder = "写下情况，附相关网页链接，每行一条。";
    if (received && !reportComplete) message.value = received.message;
  }
  form.append(label, message, button(contact.action, "submit"));
  form.addEventListener("submit", event => {
    event.preventDefault();
    const text = message.value.trim();
    if (!text) {
      message.focus();
      return;
    }
    const compact = text.normalize("NFKC").replace(/\s+/gu, "");
    let reply = contact.blocked;
    let outcome;
    if (id === "ping") {
      reply = replyFromPing(compact);
    } else if (id === "report") {
      const links = evidenceLinks(text);
      const missing = reportSubjects.filter((_, index) => reportRequirements[index].some(item => !links.has(item)));
      if (!missing.length) {
        reportComplete = true;
        if (ending === "rescued") {
          reply = contact.success;
          outcome = "truth";
        } else reply = "材料收到了。若林一还有危险，请从紧急求助入口提交地址。";
      } else reply = "还要补交这几项的原件或录音：**" + missing.join("、") + "**。";
    } else if (["group", "mother"].includes(id) && (hasEastCampus(compact) || hasNamedRoom(compact))) {
      reply = contact.success;
      outcome = id;
    } else if (["katty", "police"].includes(id) && hasOriginalPost(compact) && hasTransferProof(compact) &&
        (id === "katty" || (pingClues.has("room") && hasNamedRoom(compact)))) {
      reply = contact.success;
      outcome = reportComplete ? "truth" : "rescued";
    }
    contactMessages[id] = { message: text, reply };
    if (outcome) {
      ending = outcome;
      endingContact = id;
    }
    save();
    if (outcome) goBrowser("#endings/" + outcome);
    else render(true);
  });
  if (savedPages.size && ["report", "police", "katty", "ping"].includes(id)) form.append(buttonForNotes(message));
  body.append(form);
}

function buttonForNotes(message) {
  const attach = button("附上调查笔记里的链接");
  attach.className = "web-note-action";
  attach.addEventListener("click", () => {
    const lines = [...savedPages.keys()].map(route => {
      const [path, query] = route.split("?");
      const [section, id] = path.split("/");
      return addressFor(section, id, new URLSearchParams(query)) || "#" + route;
    });
    message.value = [...new Set([...message.value.trim().split("\n"), ...lines].filter(Boolean))].join("\n");
    message.focus();
  });
  return attach;
}

function renderWebPage(body, section, id, params) {
  if (section === "transfer") renderTransfer(body, id, params);
  else if (section === "contacts") renderContacts(body, id);
  else if (section === "endings") {
    const result = WebContacts.endings[id];
    if (result && canViewEnding(id)) {
      const received = ending === id && contactMessages[endingContact];
      if (received) body.append(marked("p", received.reply, "web-reply"));
      body.append(marked("p", result.text, "complete-note"));
      if (id === "rescued" || id === "truth") body.append(
        tabLink("查看救援记录", "evidence/rescue"), link("警方收证", "contacts/report"),
      );
      body.append(tabLink("返回京海街坊", "forum"));
      const restart = button("从求救帖重来");
      restart.className = "web-note-action";
      restart.addEventListener("click", () => {
        forumStep = 0;
        savedPages.clear();
        pingClues.clear();
        for (const id of contactIds) delete contactMessages[id];
        ending = undefined;
        endingContact = undefined;
        reportComplete = false;
        save();
        goBrowser("#forum");
      });
      body.append(restart);
    } else body.append(node("p", "还没有收到这条回执。"));
  } else {
    const query = (params.get("q") ?? "").trim().slice(0, 100);
    if (!id && section === "registry") {
      renderRegistrySearch(body, query);
      if (query) return;
    }
    renderWebBlocks(body, webSites[section].pages[id ?? ""].blocks, section);
    if (id && section === "registry") body.append(link("返回站内搜索", section));
  }
}
