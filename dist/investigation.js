"use strict";

const page = document.querySelector("#case-page");
const notebook = document.querySelector("#case-records");
const progress = document.querySelector("#case-progress");
const notesToggle = document.querySelector("#browser-notes-toggle");
const notesPanel = document.querySelector("#case-sidebar");
const stateKey = "escape-hospital-web-case-v2";
const helpThread = {
  id: "help", author: HospitalForum.author, title: HospitalForum.title,
  category: "求证", posts: [[HospitalForum.author, HospitalForum.post]],
};
const familyRumor = {
  id: "lin-family-rumor",
  title: "又有人说林家是家族诅咒了",
  author: "好好睡觉",
  category: "旧闻",
  posts: [
    ["好好睡觉", "先是**王多丽**没了，五月又听说**林海**和几个孩子都住了院。我妈还说他们老宅有东西，我去晚报翻了半天，只看见说是家里人接去休养。"],
    ["午休别找我", "都没说住哪家医院，怎么就传成一家人得了同一种病？"],
  ],
};
const forumThreads = [ForumLegends[0], helpThread, familyRumor, ...ForumLegends.slice(1)];
const forumCategories = [...new Set(forumThreads.map(thread => thread.category))];
const featuredThreads = new Set(["ferry-last-stop", "library-receipt", "bridge-sound"]);
const forumViews = { all: "看帖", featured: "精品", photos: "图片" };
const threadById = new Map(forumThreads.map((thread, index) => [thread.id, { ...thread,
  activity: ["23:51", "23:47", "23:40", "23:32", "23:08", "22:54", "22:13", "21:36"][index],
}]));
const desktop = document.querySelector("#desktop-view");
const browser = document.querySelector("#browser-view");
const startMenu = document.querySelector("#desktop-start");
const startMenuButton = document.querySelector("#start-menu-button");
const taskbarEdge = document.querySelector("#taskbar-edge");
const backButton = document.querySelector("#browser-back");
const forwardButton = document.querySelector("#browser-forward");
const omnibox = document.querySelector("#browser-omnibox");
const browserAddress = document.querySelector("#browser-address");
const tabStrip = document.querySelector("#browser-tab-strip");
const followButton = document.querySelector("#forum-follow");
let currentAddressText = "";
let lastRenderedHash;
const browserTabs = [];
let activeTab;
const sections = {
  start: "Microsoft Edge",
  search: "京海搜索",
  map: PostcodeMap.region + "地图",
  forum: HospitalForum.name + " · 本地怪谈",
  thread: HospitalForum.name + " · 都市传说板",
  profile: HospitalForum.name + " · 账号发帖记录",
  inbox: HospitalForum.name + " · 站内私信",
  career: "LinkedIn · 公开档案",
  directory: "京海市立医院 · 院区信息",
  ...Object.fromEntries(Object.entries(webSites).map(([route, site]) => [route, site.title])),
};
const virtualSites = {
  "jinghai-bbs.local": ["forum", "thread", "profile", "inbox"],
  "jinghai-hospital.local": ["directory"],
  "jinghai-search.local": ["search"],
  "maps.local": ["map"],
  "linkedin.local": ["career"],
  ...Object.fromEntries(Object.entries(webSites).map(([route, site]) => [site.domain, [route]])),
};
const legacyRoutes = {
  family: "press/lin-family", news: "press", relay: "contacts/katty", report: "contacts/report",
  airport: "evidence/pickup", hospital: "directory", messages: "evidence", group: "company",
};
const linYiProfile = {
  name: "林一（Lin Yi）",
  description: "京海 · 2026 届硕士毕业生 · 求职中",
  keywords: "领英 公开档案 求职 京海 回国 留学 海外硕士 林一京海 海岬大学 国际企业管理硕士",
};
const nursePosts = [
  ["松桥路哪家店清早开门？", "我在**松桥路**倒夜班。从**住院部**出来快七点了，哪儿还能买到热包子？"],
  ["六月夜班", "今晚上接了个留学生。**刚读完海外硕士，六月回的京海**。行李箱还在护士站，他一直问能不能给家里打个电话。"],
];
const forumPages = new Set(["forum", "thread", "profile", "inbox"]);
const savedPages = new Map();
const pingClues = new Set();
const contactMessages = Object.create(null);
let forumStep = 0;
let forumFollowed = false;
let ending;
let endingContact;
let reportComplete = false;

try {
  const saved = JSON.parse(localStorage.getItem(stateKey));
  if (saved) {
    forumStep = saved.forumStep > 0 ? 1 : 0;
    forumFollowed = saved.forumFollowed === true;
    for (const clue of saved.pingClues ?? []) {
      if (["diary", "receipt", "room"].includes(clue)) pingClues.add(clue);
    }
    for (const [route, title] of saved.savedPages ?? []) {
      if (typeof route === "string" && typeof title === "string") savedPages.set(route, title);
    }
    for (const id of contactIds) {
      const entry = saved.contactMessages?.[id];
      if (typeof entry?.message === "string" && typeof entry.reply === "string") contactMessages[id] = entry;
    }
    if (Object.hasOwn(WebContacts.endings, saved.ending)) ending = saved.ending;
    if (contactIds.includes(saved.endingContact)) endingContact = saved.endingContact;
    reportComplete = saved.reportComplete === true;
  }
} catch {}

function save() {
  try {
    localStorage.setItem(stateKey, JSON.stringify({
      forumStep, forumFollowed, savedPages: [...savedPages], pingClues: [...pingClues],
      contactMessages, ending, endingContact, reportComplete,
    }));
  } catch {}
}

function node(tag, value, className) {
  const element = document.createElement(tag);
  if (value) element.textContent = value;
  if (className) element.className = className;
  return element;
}

function link(label, destination, className = "lead-card") {
  const element = node("a", label, className);
  element.href = "#" + destination;
  return element;
}

function tabLink(label, destination, className) {
  const element = link(label, destination, className);
  element.dataset.newTab = "";
  return element;
}

function button(label, type = "button") {
  const element = node("button", label);
  element.type = type;
  return element;
}

function addPortrait(avatar, person) {
  const photo = node("img", "", "profile-portrait");
  photo.alt = "";
  photo.addEventListener("error", () => photo.remove(), { once: true });
  photo.src = "assets/portraits/" + person + ".webp";
  avatar.append(photo);
}

function getRoute() {
  const [path, query] = location.hash.slice(1).split("?");
  const [section, id] = (Object.hasOwn(legacyRoutes, path) ? legacyRoutes[path] : path).split("/");
  if (!section || section === "desktop") return { section: "desktop" };
  return {
    section: Object.hasOwn(sections, section) ? section : "start",
    id,
    params: new URLSearchParams(query),
  };
}

function domainFor(section) {
  return Object.keys(virtualSites).find(site => virtualSites[site].includes(section));
}

function addressFor(section, id, params) {
  const domain = domainFor(section);
  if (!domain) return "";
  const query = params.toString();
  return domain + "/" + section + (id ? "/" + id : "") + (query ? "?" + query : "");
}

function addressRoute(value) {
  const match = /^(?:https?:\/\/)?([a-z.-]+)(?:\/([a-z0-9/-]+))?\/?(\?[^#]*)?$/i.exec(value);
  if (!match) return undefined;
  const domain = match[1].toLowerCase();
  if (!Object.hasOwn(virtualSites, domain)) return undefined;
  const routes = virtualSites[domain];
  const [section, id, extra] = (match[2] ?? routes[0]).replace(/\/$/, "").toLowerCase().split("/");
  if (!routes.includes(section) || extra) return undefined;
  const query = match[3] ?? "";
  if (!id) return section + query;
  if (section === "thread" && threadById.has(id)) return section + "/" + id + query;
  if (section === "career" && id === "lin-yi") return "career/lin-yi" + query;
  if (webSites[section] && Object.hasOwn(webSites[section].pages, id)) return section + "/" + id + query;
  return undefined;
}

function normalizeSearch(text) {
  return text.normalize("NFKC").trim().toLowerCase();
}

function textMatches(text, terms) {
  const normalized = normalizeSearch(text);
  return terms.every(term => normalized.includes(term));
}

function forumThreadKeywords(thread) {
  return [thread.title, thread.author, thread.category, ...thread.posts.map(([, text]) => text)].join(" ");
}

function nurseProfileKeywords() {
  return [HospitalForum.author, ...nursePosts.flat()].join(" ");
}

function isPublished(thread) {
  return thread.id !== helpThread.id || forumStep === 0;
}

function searchResults(query) {
  const sites = [
    ["forum", HospitalForum.name, "京海本地论坛，讨论灵异经历、旧闻和都市传说。", [
      ...forumThreads.filter(isPublished).map(forumThreadKeywords),
      nurseProfileKeywords(),
    ]],
    ["career", "LinkedIn", "职业社交网站，可查找个人公开档案和职业动态。", [
      [linYiProfile.name, linYiProfile.description, linYiProfile.keywords].join(" "),
    ]],
    ["directory", "京海市立医院", "市立医院的院区与门诊信息。", ["住院部 东院区 西院区 松桥路 榕安路"]],
    ["map", PostcodeMap.region + "地图", "查询岛内街道地址和六位邮编。", PostcodeMap.keywords],
    ...Object.entries(webSites).filter(([, site]) => site.searchable !== false)
      .map(([route, site]) => [route, site.title, site.description, site.keywords ?? []]),
  ];
  const terms = normalizeSearch(query).split(/\s+/u);
  return sites.map(([destination, title, description, keywords]) => {
    const domain = domainFor(destination);
    const heading = normalizeSearch(title);
    const siteText = [title, domain, description].join(" ");
    const score = [siteText, ...keywords.map(text => siteText + " " + text)].some(text => textMatches(text, terms))
      ? terms.reduce((total, term) => total + (heading.includes(term) ? 3 : 1), 0)
      : 0;
    return { destination, title, description, domain, score };
  }).filter(result => result.score > 0).sort((a, b) => b.score - a.score);
}

function showSearch(body, query) {
  const heading = node("h2", "京海搜索", "edge-search-title");
  heading.tabIndex = -1;
  body.append(heading);
  const results = query ? searchResults(query) : [];
  body.append(node("p", query ? `「${query}」 · ${results.length} 条结果` : "在地址栏输入要搜索的内容。", "search-count"));
  if (!query) return;
  if (!results.length) {
    body.append(node("p", "没有找到相关网站。可以换个关键词，再试一次。"));
    return;
  }
  const list = node("ol", "", "search-results");
  for (const { destination, title, description, domain } of results) {
    const row = node("li");
    row.append(node("p", domain, "record-origin"),
      tabLink(title, destination, "search-result-link"), node("p", description, "search-excerpt"));
    list.append(row);
  }
  body.append(list);
}

function searchRoute(query) {
  return "search?" + new URLSearchParams({ q: query });
}

function showStart(body) {
  const heading = node("h2", "京海搜索", "edge-start-title");
  heading.tabIndex = -1;
  const form = node("form", "", "start-search lookup-form");
  const label = node("label", "在京海搜索");
  const input = node("input");
  input.id = "start-search";
  label.htmlFor = input.id;
  input.type = "search";
  input.maxLength = 160;
  input.required = true;
  input.placeholder = "搜索关键词";
  form.append(label, input, button("搜索", "submit"));
  form.addEventListener("submit", event => {
    event.preventDefault();
    const query = input.value.trim();
    if (query) location.hash = searchRoute(query);
  });
  const shortcuts = node("nav", "", "edge-shortcuts");
  shortcuts.setAttribute("aria-label", "常用网站");
  for (const [label, route, mark] of [
    ["京海街坊 · 都市传说板", "forum", "怪"], ["京海晚报", "press", "晚"],
    ["LinkedIn", "career", "in"], ["地图 · 地址与邮编查询", "map", "图"],
  ]) {
    const shortcut = tabLink(label, route, "edge-shortcut");
    shortcut.dataset.shortcut = route;
    const icon = node("span", mark, "edge-shortcut-icon");
    icon.setAttribute("aria-hidden", "true");
    shortcut.prepend(icon);
    shortcuts.append(shortcut);
  }
  body.append(heading, form, shortcuts);
}

function updateNotebook() {
  progress.replaceChildren();
  if (ending) progress.append(link(WebContacts.endings[ending].title, "endings/" + ending, "record-link"));
  else if (forumStep) progress.textContent = "求助帖已删除，发出的私信还在。";
  notebook.replaceChildren();
  if (!savedPages.size) notebook.append(node("li", "可以把有用的网页记在这里。"));
  for (const [route, title] of savedPages) {
    const item = node("li");
    item.append(tabLink(title, route, "record-link"));
    notebook.append(item);
  }
}

function offerBookmark(body, section, id, title, params) {
  if (!(webSites[section] || (section === "career" && id) || (section === "thread" && id === "help" && !forumStep) || section === "directory") ||
      ["endings", "contacts"].includes(section)) return;
  let query = "";
  if (section === "transfer" && !id && params.has("code")) {
    if (normalizeTransferCode(params.get("code")) !== transferCode) return;
    title = "林一 · 原始联络点";
    query = "?code=" + transferCode;
  }
  const route = section + (id ? "/" + id : "") + query;
  const bookmark = button(savedPages.has(route) ? "移出调查笔记" : "记下这页");
  bookmark.className = "web-note-action";
  bookmark.addEventListener("click", () => {
    if (savedPages.has(route)) savedPages.delete(route);
    else savedPages.set(route, title);
    bookmark.textContent = savedPages.has(route) ? "移出调查笔记" : "记下这页";
    save();
    updateNotebook();
  });
  body.append(bookmark);
}

function boardRoute(category, query = "", view = "all") {
  const params = new URLSearchParams();
  if (view !== "all") params.set("view", view);
  if (category) params.set("category", category);
  if (query) params.set("q", query);
  return "forum" + (params.size ? "?" + params.toString() : "");
}

function showForumBoard(body, params) {
  const category = params.get("category");
  const query = (params.get("q") ?? "").trim();
  const requestedView = params.get("view");
  const view = Object.hasOwn(forumViews, requestedView) ? requestedView : "all";
  const toolbar = node("div", "", "forum-board-tools");
  const views = node("nav", "", "forum-view-tabs");
  views.setAttribute("aria-label", "帖子视图");
  for (const [value, label] of Object.entries(forumViews)) {
    const tab = link(label, boardRoute("", "", value), "forum-view-tab");
    if (value === view) tab.setAttribute("aria-current", "page");
    views.append(tab);
  }
  const filters = node("nav", "", "forum-filters");
  filters.setAttribute("aria-label", "按主题筛选");
  for (const name of ["", ...forumCategories]) {
    const tab = link(name || "全部主题", boardRoute(name, query, view), "forum-filter");
    if ((!category && !name) || category === name) tab.setAttribute("aria-current", "true");
    filters.append(tab);
  }
  const form = node("form", "", "forum-search");
  form.setAttribute("role", "search");
  const search = node("input");
  search.type = "search";
  search.setAttribute("aria-label", "搜索帖子");
  search.placeholder = "吧内搜索";
  search.maxLength = 60;
  search.value = query;
  form.append(search, button("搜索", "submit"));
  form.addEventListener("submit", event => {
    event.preventDefault();
    location.hash = boardRoute(category, search.value.trim(), view);
  });
  toolbar.append(views, form, filters);
  const list = node("ul", "", "forum-thread-list");
  list.dataset.view = view;
  const terms = query ? normalizeSearch(query).split(/\s+/u) : [];
  const accountMatch = terms.length && !category && view === "all" && textMatches(nurseProfileKeywords(), terms);
  const matches = [...threadById.values()].filter(thread =>
    isPublished(thread) &&
    (view === "all" || (view === "featured" && featuredThreads.has(thread.id)) ||
      (view === "photos" && Boolean(thread.attachment))) &&
    (!category || thread.category === category) &&
    textMatches(forumThreadKeywords(thread), terms));
  for (const thread of matches) {
    const row = node("li", "", "forum-row");
    const count = thread.posts.length - 1;
    const badge = node("span", String(count), "forum-reply-count");
    badge.setAttribute("role", "img");
    badge.setAttribute("aria-label", count + " 条回复");
    badge.title = count + " 条回复";
    const detail = node("div", "", "forum-row-main");
    const title = link(thread.title, "thread/" + thread.id, "forum-thread-title");
    const heading = node("div", "", "forum-row-title");
    heading.append(title, node("span", thread.category, "forum-category"));
    const content = thread.posts[0][1].replaceAll("**", "").replace(/\s+/gu, " ");
    const previewLength = thread.id === helpThread.id ? 20 : 70;
    detail.append(heading, node("p",
      content.length > previewLength ? content.slice(0, previewLength) + "…" : content, "forum-thread-preview"));
    if (thread.attachment) {
      const thumbnail = node("img", "", "forum-thumb");
      thumbnail.src = thread.attachment.src;
      thumbnail.alt = "";
      thumbnail.loading = "lazy";
      const preview = link("", "thread/" + thread.id, "forum-thumb-link");
      preview.setAttribute("aria-label", "查看配图：" + thread.title);
      preview.append(thumbnail);
      detail.append(preview);
    }
    const activity = node("span", "", "forum-meta forum-activity");
    activity.append(node("span", thread.author), node("time", thread.activity));
    row.append(badge, detail, activity);
    list.append(row);
  }
  body.append(toolbar);
  if (accountMatch) body.append(link("用户 · " + HospitalForum.author, "profile"));
  if (matches.length) body.append(list);
  else if (!accountMatch) body.append(node("p", "没有符合条件的帖子。"), link("查看全部帖子", "forum"));
}

function showThread(body, id, params) {
  const tools = node("div", "", "forum-thread-tools");
  tools.append(link("‹ 返回都市传说板", "forum", "forum-back"));
  body.append(tools);
  const thread = threadById.get(id);
  if (!thread) {
    body.append(node("p", "这条帖子找不到了。"));
    return;
  }
  if (id === helpThread.id && forumStep >= 1) {
    const notice = node("section", "", "forum-topic forum-deleted");
    notice.append(node("p", "该帖已被发帖人删除。"), link("查看发帖人资料", "profile"), link("打开站内私信", "inbox"));
    body.append(notice);
    return;
  }
  const originalOnly = params.get("see_lz") === "1";
  if (thread.posts.length > 1) {
    const toggle = link(originalOnly ? "查看全部楼层" : "只看楼主",
      "thread/" + id + (originalOnly ? "" : "?see_lz=1"), "forum-floor-filter");
    tools.append(toggle);
  }
  thread.posts.forEach(([author, text], index) => {
    if (originalOnly && author !== thread.author) return;
    const post = node("article", "", "forum-topic forum-floor");
    const authorPanel = node("div", "", "forum-author");
    const avatar = node("span", Array.from(author)[0], "forum-avatar");
    avatar.setAttribute("aria-hidden", "true");
    const authorName = id === helpThread.id ? link(author, "profile", "forum-user") : node("span", author, "forum-user");
    if (id === helpThread.id) {
      const avatarLink = link("", "profile", "forum-avatar-link");
      avatarLink.setAttribute("aria-label", "查看" + author + "的资料");
      avatarLink.append(avatar);
      authorPanel.append(avatarLink, authorName);
    } else authorPanel.append(avatar, authorName);
    if (index === 0) authorPanel.append(node("span", "楼主", "forum-author-role"));
    const content = node("div", "", "forum-post-content");
    for (const paragraph of text.split("\n")) {
      const copy = id === helpThread.id ? paragraph.replace("京海的林一", "**京海的林一**") : paragraph;
      content.append(marked("p", copy, id === helpThread.id ? "forum-quote" : undefined));
    }
    if (index === 0 && thread.attachment) {
      const figure = node("figure", "", "forum-attachment");
      const photo = node("img");
      photo.src = thread.attachment.src;
      photo.alt = thread.attachment.alt;
      figure.append(photo, node("figcaption", "楼主上传的照片"));
      content.append(figure);
    }
    const floorInfo = node("footer", "", "forum-floor-meta");
    floorInfo.append(node("span", (index + 1) + " 楼"));
    if (index === 0) floorInfo.append(node("time", id === helpThread.id ? "2026-06-20 23:47" : thread.activity));
    content.append(floorInfo);
    post.append(authorPanel, content);
    body.append(post);
  });
  if (id === helpThread.id) {
    const actions = node("div", "", "forum-thread-actions");
    actions.append(link("查看楼主以前的帖子", "profile"), link("私信楼主", "inbox"));
    body.append(actions);
  }
}

function updateBoardSidebar(board) {
  const sidebar = document.querySelector("#forum-sidebar");
  sidebar.hidden = !board;
  if (!board) return;
  const stats = node("dl", "", "forum-side-stats");
  const replyCount = forumThreads.reduce((total, thread) => total + thread.posts.length - 1, 0);
  for (const [label, count] of [["主题", forumThreads.length - Number(forumStep >= 1)], ["回复", replyCount]]) {
    const pair = node("div");
    pair.append(node("dt", label), node("dd", String(count)));
    stats.append(pair);
  }
  const links = node("ul", "", "record-list forum-side-index");
  for (const category of forumCategories) {
    const item = node("li");
    item.append(link(category, boardRoute(category), "record-link"));
    links.append(item);
  }
  sidebar.replaceChildren(node("h2", "本吧信息"), stats,
    node("h3", "按分类看帖"), links);
}

function updateFollowButton() {
  followButton.setAttribute("aria-pressed", String(forumFollowed));
  followButton.textContent = forumFollowed ? "已关注" : "关注";
}

function showProfile(body) {
  const account = node("div", "", "forum-account");
  const avatar = node("span", "茶", "forum-avatar");
  avatar.setAttribute("aria-hidden", "true");
  addPortrait(avatar, "night-nurse");
  const details = node("div");
  details.append(node("strong", HospitalForum.author), node("p", "公开动态", "record-origin"));
  account.append(avatar, details);
  body.append(
    account,
    ...nursePosts.flatMap(([title, text]) => [node("h3", title), marked("p", text)]),
    link("打开站内私信", "inbox"),
    tabLink("在新标签页打开京海搜索", "search"),
  );
  if (forumStep === 0) body.append(link("回到求助帖", "thread/help"));
  else body.append(link("打开医院院区目录", "directory"));
}

function showInbox(body) {
  body.append(node("p", "你与「" + HospitalForum.author + "」之间的站内消息。", "record-origin"));
  const message = "你好，你是**京海**的**林一**吗？能看见医院名字吗？";
  const original = node("details");
  original.append(node("summary", "查看求助原文"),
    marked("blockquote", HospitalForum.post.replace("京海的林一", "**京海的林一**")));
  body.append(original);
  if (forumStep === 0) {
    const ask = button("发送私信");
    ask.addEventListener("click", () => {
      forumStep = 1;
      save();
      render(true);
    });
    body.append(marked("p", message, "forum-outgoing"), ask);
    return;
  }
  body.append(
    marked("p", message, "forum-outgoing"),
    node("p", "已读 · 尚无回复", "record-origin"),
    node("p", "关联帖子已被发帖人删除。", "forum-deleted"),
    link("查看发帖人资料", "profile"),
  );
}

function showCareerHome(body, query) {
  const home = node("section", "", "professional-section");
  const heading = node("h2", "查找公开档案");
  heading.tabIndex = -1;
  const form = node("form", "", "lookup-form professional-search");
  const label = node("label", "姓名或关键词");
  const input = node("input");
  input.id = "career-search";
  label.htmlFor = input.id;
  input.type = "search";
  input.placeholder = "输入姓名、城市或学历";
  input.maxLength = 160;
  input.required = true;
  input.value = query;
  form.append(label, input, button("站内搜索", "submit"));
  form.addEventListener("submit", event => {
    event.preventDefault();
    const name = input.value.trim();
    goBrowser("#career" + (name ? "?" + new URLSearchParams({ q: name }) : ""));
  });
  home.append(heading, form);
  if (query) {
    const terms = normalizeSearch(query).split(/\s+/u);
    const profileText = [linYiProfile.name, linYiProfile.description, linYiProfile.keywords].join(" ");
    if (textMatches(profileText, terms)) {
      const result = node("article", "", "professional-search-result");
      const avatar = node("span", "LY", "professional-mini-avatar");
      avatar.setAttribute("aria-hidden", "true");
      addPortrait(avatar, "lin-yi");
      const details = node("div");
      details.append(link(linYiProfile.name, "career/lin-yi", "record-link"), node("p", linYiProfile.description));
      result.append(avatar, details);
      home.append(result);
    } else {
      home.append(node("p", "没有找到对应的公开档案。"));
    }
  }
  body.append(home);
}

function showCareer(body) {
  const hero = node("section", "", "professional-hero");
  const cover = node("div", "", "professional-cover");
  cover.setAttribute("aria-hidden", "true");
  const summary = node("div", "", "professional-summary");
  const avatar = node("span", "LY", "professional-avatar");
  avatar.setAttribute("aria-hidden", "true");
  addPortrait(avatar, "lin-yi");
  const name = node("h2", "林一 · Lin Yi");
  name.tabIndex = -1;
  summary.append(avatar, name, node("p", "2026 届硕士毕业生 · 求职中"), node("p", "中国 · 京海", "record-origin"));
  hero.append(cover, summary);
  const education = node("section", "", "professional-section");
  education.append(node("h3", "教育经历"),
    marked("p", "**海岬大学** · **国际企业管理硕士**"),
    node("p", "2024 年秋 — 2026 年 6 月"),
    tabLink("海岬大学官网", "university"),
    marked("p", "国内本科 · 2019 年 — 2023 年"));
  const activity = node("section", "", "professional-section");
  activity.append(node("h3", "近期动态"), marked("p", "毕业了，**六月回京海**。想找企业管理方向的工作，有合适的岗位欢迎联系。"));
  body.append(hero, education, activity);
}

function showDirectory(body) {
  body.append(node("p", "院区信息 · 更新于 2026 年 3 月", "record-origin"));
  for (const [title, address] of [
    ["西院区住院部", "榕安路 36 号。"],
    ["东院区住院部", "**松桥路 18 号**。住院探视请从东门登记。"],
    ["松桥路社区门诊", "**松桥路 66 号**。只看门诊，没有住院床位。"],
  ]) {
    body.append(node("h3", title), marked("p", address));
  }
}

function syncTabs(route, title) {
  if (!activeTab) {
    activeTab = { history: [], position: -1, title };
    browserTabs.push(activeTab);
  }
  if (activeTab.history[activeTab.position] !== route) {
    activeTab.history.splice(++activeTab.position, activeTab.history.length, route);
  }
  activeTab.title = title;
  backButton.disabled = activeTab.position <= 0;
  forwardButton.disabled = activeTab.position >= activeTab.history.length - 1;
  tabStrip.replaceChildren();
  for (const tab of browserTabs) {
    const selected = tab === activeTab;
    const tabRow = node("div", "", "browser-tab" + (selected ? " active" : ""));
    const select = button(tab.title);
    select.className = "browser-tab-title";
    select.title = tab.title;
    select.setAttribute("aria-pressed", String(selected));
    select.addEventListener("click", () => {
      if (tab === activeTab) return;
      activeTab = tab;
      goBrowser(tab.history[tab.position]);
    });
    const close = button("×");
    close.className = "browser-tab-close";
    close.setAttribute("aria-label", "关闭标签页：" + tab.title);
    close.addEventListener("click", () => closeTab(tab));
    tabRow.append(select, close);
    tabStrip.append(tabRow);
  }
  tabStrip.querySelector(".active")?.scrollIntoView({ block: "nearest", inline: "nearest" });
}

function goBrowser(route) {
  if (location.hash === route) render(true);
  else location.hash = route;
}

function openTab(destination = "start") {
  const route = "#" + destination;
  activeTab = { history: [route], position: 0, title: "新标签页" };
  browserTabs.push(activeTab);
  goBrowser(route);
}

function closeTab(tab) {
  const index = browserTabs.indexOf(tab);
  browserTabs.splice(index, 1);
  if (tab === activeTab) activeTab = browserTabs[index] ?? browserTabs.at(-1);
  goBrowser(activeTab?.history[activeTab.position] ?? "#desktop");
}

function changeBrowserHistory(direction) {
  const next = activeTab.position + direction;
  if (!activeTab.history[next]) return;
  activeTab.position = next;
  goBrowser(activeTab.history[next]);
}

function render(focusHeading = false) {
  const routeChanged = location.hash !== lastRenderedHash;
  lastRenderedHash = location.hash;
  const { section, id, params } = getRoute();
  desktop.hidden = section !== "desktop";
  browser.hidden = !desktop.hidden;
  taskbarEdge.setAttribute("aria-pressed", String(!browser.hidden));
  taskbarEdge.setAttribute("aria-label", browser.hidden ? "打开 Microsoft Edge" : "最小化 Microsoft Edge");
  if (section === "desktop") {
    document.title = "地狱无门 · 桌面";
    if (focusHeading) desktop.querySelector("[data-open-browser]").focus();
    return;
  }

  const query = (params.get("q") ?? "").trim().slice(0, 160);
  const sitePages = webSites[section]?.pages;
  const webPage = sitePages && Object.hasOwn(sitePages, id ?? "") ? sitePages[id ?? ""] : undefined;
  const inPress = section === "press" && webPage;
  const inInstitution = institutionSections.has(section) && (webPage || section === "directory");
  const title = section === "endings" && !canViewEnding(id) ? "消息回执" : webPage?.title ?? {
    start: "新标签页",
    search: "搜索结果",
    map: "地址与邮编查询",
    forum: "都市传说板",
    thread: id === helpThread.id && forumStep ? "帖子已删除" : threadById.get(id)?.title ?? "帖子不存在",
    profile: HospitalForum.author + " · 个人主页",
    inbox: "站内私信",
    career: id === "lin-yi" ? linYiProfile.name : "LinkedIn",
    directory: "查找院区",
  }[section] ?? "页面未找到";

  syncTabs(location.hash, section === "search" && query ? query + " · 搜索" : title);
  document.title = title + " · " + sections[section];
  currentAddressText = section === "search" && query ? query : addressFor(section, id, params);
  browserAddress.value = currentAddressText;
  const header = node("header", "", "source-header");
  const heading = node("h2", title);
  heading.tabIndex = -1;
  header.append(node("p", sections[section]), heading);
  const body = node("div", "", "source-body");
  page.dataset.section = section;
  const onForum = forumPages.has(section);
  const edgeHome = section === "start" || section === "search";
  browser.classList.toggle("forum-window", onForum);
  browser.classList.toggle("edge-home", edgeHome);
  browser.classList.toggle("professional-window", section === "career");
  browser.classList.toggle("press-window", Boolean(inPress));
  browser.classList.toggle("institution-window", Boolean(inInstitution));
  browser.classList.toggle("map-window", section === "map");
  browser.classList.toggle("story-web-window", Boolean(webSites[section]) && !inPress && !inInstitution);

  const publicBoard = section === "forum" || (section === "thread" && id !== helpThread.id);
  browser.classList.toggle("single-site-window", !publicBoard && !edgeHome);
  let focusTarget = heading;
  if (inPress) {
    const newsroom = node("div");
    page.replaceChildren(newsroom);
    renderPressSite(newsroom, id ?? "", params);
    focusTarget = newsroom.querySelector(".press-page-title");
  } else if (inInstitution) {
    page.replaceChildren();
    focusTarget = renderInstitutionSite(page, section, id, params, content => {
      if (section === "directory") showDirectory(content);
      else renderWebPage(content, section, id, params);
      offerBookmark(content, section, id, title, params);
    });
  } else {
    renderStandardPage(body, section, id, query, params, webPage);
    if (webPage || !webSites[section]) offerBookmark(body, section, id, title, params);
    if (section === "career" || section === "map" || edgeHome) {
      page.replaceChildren(body);
      focusTarget = body.querySelector("h2");
    } else {
      page.replaceChildren(header, body);
      if (section === "diary" && webPage) focusTarget = body.querySelector(".diary-page-title");
    }
  }
  for (const tab of document.querySelectorAll("[data-page]")) {
    if (tab.dataset.page === (onForum ? "forum" : section)) tab.setAttribute("aria-current", "page");
    else tab.removeAttribute("aria-current");
  }
  updateNotebook();
  updateBoardSidebar(publicBoard);
  updateFollowButton();
  if (focusHeading) {
    if (routeChanged) window.scrollTo(0, 0);
    focusTarget?.focus({ preventScroll: true });
  }
}

function renderStandardPage(body, section, id, query, params, webPage) {
  if (section === "start") showStart(body);
  else if (section === "search") showSearch(body, query);
  else if (section === "map") {
    PostcodeMap.mount(body, query, value => {
      goBrowser("#map" + (value ? "?" + new URLSearchParams({ q: value }) : ""));
    });
  } else if (section === "career") {
    if (id === "lin-yi") showCareer(body);
    else showCareerHome(body, query);
  } else if (section === "forum") showForumBoard(body, params);
  else if (section === "thread") showThread(body, id, params);
  else if (section === "profile") showProfile(body);
  else if (section === "inbox") showInbox(body);
  else if (section === "diary" && webPage) renderDiaryBook(body, id);
  else if (webPage) renderRecordsSite(body, section, id, params, content => renderWebPage(content, section, id, params));
  else body.append(node("p", "找不到这个地址。"));
}

function setStartMenu(open) {
  startMenu.hidden = !open;
  startMenuButton.setAttribute("aria-expanded", String(open));
}

function setNotes(open) {
  notesPanel.hidden = !open;
  notesToggle.setAttribute("aria-expanded", String(open));
}

startMenuButton.addEventListener("click", () => setStartMenu(startMenu.hidden));
notesToggle.addEventListener("click", () => setNotes(notesPanel.hidden));
document.addEventListener("click", event => {
  if (!event.target.closest("#desktop-start, #start-menu-button")) setStartMenu(false);
  if (!event.target.closest("#case-sidebar, #browser-notes-toggle") || event.target.closest("#case-sidebar a")) setNotes(false);
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !startMenu.hidden) {
    setStartMenu(false);
    startMenuButton.focus();
  }
  if (event.key === "Escape" && !notesPanel.hidden) {
    setNotes(false);
    notesToggle.focus();
  }
});
taskbarEdge.addEventListener("click", () => {
  if (browser.hidden) goBrowser(activeTab?.history[activeTab.position] ?? "#start");
  else goBrowser("#desktop");
});
for (const shortcut of document.querySelectorAll("[data-open-browser]")) {
  shortcut.addEventListener("click", () => {
    setStartMenu(false);
    goBrowser(activeTab?.history[activeTab.position] ?? "#start");
  });
}
for (const shortcut of document.querySelectorAll("[data-open-map]")) {
  shortcut.addEventListener("click", () => {
    setStartMenu(false);
    const existingMap = browserTabs.find(tab => /^#map(?:\?|$)/.test(tab.history[tab.position]));
    if (existingMap) {
      activeTab = existingMap;
      goBrowser(activeTab.history[activeTab.position]);
    } else openTab("map");
  });
}
document.querySelector("#browser-close").addEventListener("click", () => goBrowser("#desktop"));
followButton.addEventListener("click", () => {
  forumFollowed = !forumFollowed;
  save();
  updateFollowButton();
});
document.querySelector("#browser-new-tab").addEventListener("click", () => openTab());
backButton.addEventListener("click", () => changeBrowserHistory(-1));
forwardButton.addEventListener("click", () => changeBrowserHistory(1));
browser.addEventListener("click", event => {
  const anchor = event.target.closest("a[data-new-tab]");
  if (!anchor || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  event.preventDefault();
  openTab(anchor.hash.slice(1));
});
omnibox.addEventListener("submit", event => {
  event.preventDefault();
  const input = browserAddress.value.trim();
  if (input) goBrowser("#" + (addressRoute(input) ?? searchRoute(input)));
});
browserAddress.addEventListener("focus", () => browserAddress.select());
browserAddress.addEventListener("keydown", event => {
  if (event.key === "Escape") browserAddress.value = currentAddressText;
});
document.addEventListener("keydown", event => {
  if (!browser.hidden && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "l") {
    event.preventDefault();
    browserAddress.focus();
    browserAddress.select();
  }
});

window.addEventListener("hashchange", () => render(true));
render();
