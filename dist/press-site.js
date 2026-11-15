const pressSections = [
  { id: "local", name: "本地", stories: ["lin-family"] },
  { id: "business", name: "财经", stories: ["lin-hai", "feng-ru"] },
  { id: "people", name: "人物", stories: ["lin-family", "lin-chen", "lin-xinyu", "lin-hua"] },
];

const linHuaAlumniPhoto = ["lin-hua-alumni-interview", "2023 年海外校友活动上，林画接受学生采访。"];
const pressPhotos = {
  "lin-hai": [["lin-hai-forum", "林海在往届行业交流会上发言（资料图）。"]],
  "feng-ru": [["feng-ru-interview", "冯如在如初文化的活动空间接受京海晚报采访。"]],
  "wang-duoli": [["wang-duoli-id-bw", "王多丽的黑白证件照。", [1122, 1402]]],
  "lin-family": [
    ["family-alumni-2024", "2024 年京海海外校友交流会，左为林海，右为林一。"],
    ["family-community-day-v2", "海外社区公益日。从左到右是王多丽、林晨、林心雨和林画。"],
  ],
  "lin-chen": [["lin-chen-charity", "社区义卖当天，林晨把纸箱搬进会场。"]],
  "lin-xinyu": [["lin-xinyu-plants", "校园开放日上，林心雨展示她整理的植物标本。"]],
  "lin-hua": [linHuaAlumniPhoto],
  "lin-hua-interview": [linHuaAlumniPhoto],
  alumni: [["alumni-open-day", "2023 年海外校友开放日会场。活动由 Katty 协办。"]],
};

function pressCategory(id) {
  if (id === "wang-duoli") return pressSections[0];
  if (id === "lin-hua-interview" || id === "alumni") return pressSections[2];
  if (id === "lin-family") return pressSections[2];
  return pressSections.find(section => section.stories.includes(id));
}

function pressArticleParts(article) {
  const [first, ...rest] = article.blocks;
  const byline = first?.[0] === "p" && first[1].startsWith("京海晚报") && first[1].includes(" · ") ? first[1] : "";
  const blocks = byline ? rest : article.blocks;
  const summary = blocks.find(([type]) => type === "p" || type === "quote")?.[1] ?? "";
  return { byline, blocks, summary };
}

function pressByline(byline, category) {
  const meta = node("p", "", "press-byline");
  const parts = byline ? byline.split(" · ") : ["京海晚报", category?.name].filter(Boolean);
  for (const text of parts) {
    const date = text.match(/^(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日$/u);
    if (date) {
      const time = node("time", text);
      time.dateTime = [date[1], date[2].padStart(2, "0"), date[3].padStart(2, "0")].join("-");
      meta.append(time);
    } else meta.append(node("span", text));
  }
  return meta;
}

function pressTitle(text) {
  const title = node("h1", text, "press-page-title");
  title.tabIndex = -1;
  return title;
}

function pressPhoto([asset, description, size = [1536, 1024]], caption = "", enlarge = false) {
  const figure = node("figure", "", "press-photo");
  const image = node("img");
  image.alt = description;
  [image.width, image.height] = size;
  image.decoding = "async";
  image.loading = caption && !enlarge ? "eager" : "lazy";
  const placement = enlarge ? pressPhotoZoom(image, caption, description) : image;
  image.addEventListener("error", () => { (caption ? placement : figure).hidden = true; }, { once: true });
  image.src = `assets/press/${asset}.webp`;
  figure.append(placement);
  if (caption) figure.append(marked("figcaption", caption));
  return figure;
}

function pressPhotoZoom(image, caption, description) {
  const wrapper = node("div");
  const trigger = button("");
  trigger.className = "press-photo-zoom";
  trigger.append(image, node("span", "查看原图"));
  trigger.setAttribute("aria-haspopup", "dialog");
  const dialog = node("dialog", "", "press-photo-viewer");
  dialog.setAttribute("aria-label", description);
  const close = button("关闭原图");
  close.className = "press-photo-close";
  close.autofocus = true;
  const enlarged = node("img");
  enlarged.alt = description;
  trigger.addEventListener("click", () => {
    if (!enlarged.src) enlarged.src = image.src;
    dialog.showModal();
  });
  close.addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => trigger.focus());
  const photo = node("figure", "", "press-photo");
  photo.append(enlarged, marked("figcaption", caption));
  dialog.append(close, photo);
  wrapper.append(trigger, dialog);
  return wrapper;
}

function pressStoryCard(id, stories, featured = false) {
  const article = stories[id];
  const { byline, summary } = pressArticleParts(article);
  const preview = node("article", "", featured ? "press-story press-story-featured" : "press-story");
  const heading = node("h2");
  heading.append(link(article.title, "press/" + id, "press-story-link"));
  const text = node("div", "", "press-story-text");
  text.append(pressByline(byline, pressCategory(id)), heading);
  if (summary) text.append(marked("p", summary, "press-story-summary"));
  if (pressPhotos[id]) preview.append(pressPhoto(pressPhotos[id][0]));
  preview.append(text);
  return preview;
}

function renderPressSite(container, id = "", params = new URLSearchParams()) {
  const { title, pages } = webSites.press;
  const query = (params.get("q") ?? "").trim().slice(0, 100);
  const selected = pressSections.find(section => section.id === params.get("section"));
  const category = id ? pressCategory(id) : selected;
  container.classList.add("press-site");

  const masthead = node("header", "", "press-masthead");
  const mastheadRow = node("div", "", "press-wrap press-masthead-row");
  const wordmark = link(title, "press", "press-wordmark");
  const form = node("form", "", "press-search");
  form.setAttribute("role", "search");
  const label = node("label", "搜索京海晚报", "press-visually-hidden");
  label.htmlFor = "press-search-input";
  const input = node("input");
  input.id = label.htmlFor;
  input.type = "search";
  input.placeholder = "搜索人名、企业或报道";
  input.value = query;
  input.maxLength = 100;
  input.required = true;
  form.append(label, input, button("搜索", "submit"));
  form.addEventListener("submit", event => {
    event.preventDefault();
    const search = input.value.trim();
    if (search) goBrowser("#press?" + new URLSearchParams({ q: search }));
  });
  mastheadRow.append(wordmark, form);

  const nav = node("nav", "", "press-wrap press-navigation");
  nav.setAttribute("aria-label", "晚报频道");
  const home = link("首页", "press", "press-nav-link");
  if (!id && !query && !selected) home.setAttribute("aria-current", "page");
  nav.append(home);
  for (const section of pressSections) {
    const item = link(section.name, "press?section=" + section.id, "press-nav-link");
    if (!query && category === section) item.setAttribute("aria-current", id ? "location" : "page");
    nav.append(item);
  }
  masthead.append(mastheadRow, nav);
  container.append(masthead);

  const content = node("div", "", "press-wrap press-content");
  if (id && !Object.hasOwn(pages, id)) {
    content.append(pressTitle("找不到这篇报道"), link("返回京海晚报首页", "press", "press-inline-link"));
  } else if (id) {
    renderPressArticle(content, id, pages, category, params);
  } else if (query) {
    renderPressSearchResults(content, query, pages);
  } else if (selected) {
    const list = node("div", "", "press-story-list");
    for (const story of selected.stories) list.append(pressStoryCard(story, pages));
    content.append(pressTitle(selected.name), list);
  } else {
    renderPressHome(content, pages);
  }

  const footer = node("footer", "", "press-footer");
  const footerRow = node("div", "", "press-wrap press-footer-row");
  footerRow.append(link(title, "press", "press-inline-link"));
  footer.append(footerRow);
  container.append(content, footer);
}

function renderPressHome(content, pages) {
  const front = node("div", "", "press-front");
  const lead = node("section", "", "press-front-lead");
  lead.append(pressTitle("焦点报道"), pressStoryCard("lin-hai", pages, true));

  const local = node("section", "", "press-front-side");
  local.append(node("h2", "本地", "press-section-title"), pressStoryCard("lin-family", pages));
  const features = node("section", "", "press-front-more");
  features.append(node("h2", "人物与访谈", "press-section-title"));
  const featureList = node("div", "", "press-feature-list");
  featureList.append(pressStoryCard("feng-ru", pages));
  features.append(featureList);

  const archive = node("section", "", "press-archive");
  archive.append(node("h2", "报道存档", "press-section-title"));
  renderWebBlocks(archive, pages[""].blocks, "press");
  front.append(lead, local);
  content.append(front, features, archive);
}

function renderPressSearchResults(content, query, pages) {
  const terms = normalizeSearch(query).split(/\s+/u);
  const articleIds = [...new Set(pressSections.flatMap(section => section.stories))];
  const matching = articleIds.filter(id => {
    const { title, blocks } = pages[id];
    const text = blocks.filter(([type]) => type !== "link").map(([, value]) => value).join(" ");
    return textMatches(title + " " + text.replaceAll("**", ""), terms);
  }).sort((left, right) => Number(textMatches(pages[right].title, terms)) - Number(textMatches(pages[left].title, terms)));

  content.append(pressTitle("站内搜索"), node("p", `「${query}」 · ${matching.length} 条结果`, "press-result-count"));
  if (!matching.length) {
    content.append(node("p", "没有找到相关报道。试试完整人名、公司名称，或新闻标题里的词。", "press-empty"));
    return;
  }
  const list = node("div", "", "press-story-list");
  for (const id of matching) list.append(pressStoryCard(id, pages));
  content.append(list);
}

function renderPressArticle(content, id, pages, category, params) {
  const article = pages[id];
  const { byline, blocks } = pressArticleParts(article);
  const crumbs = node("nav", "", "press-breadcrumbs");
  crumbs.setAttribute("aria-label", "当前位置");
  crumbs.append(link("首页", "press", "press-inline-link"));
  if (category) crumbs.append(node("span", "›"), link(category.name, "press?section=" + category.id, "press-inline-link"));
  content.append(crumbs);

  const layout = node("div", "", "press-reading-layout");
  const story = node("article", "", "press-article");
  const header = node("header", "", "press-article-header");
  header.append(pressTitle(article.title), pressByline(byline, category));
  const body = node("div", "", "press-article-body");
  const photos = pressPhotos[id] ?? [];
  if (id === "lin-family") {
    let nextPhoto = 0;
    for (const block of blocks) {
      const [type, text] = block;
      if (type === "p" && text.startsWith("图注：") && photos[nextPhoto]) {
        body.append(pressPhoto(photos[nextPhoto], text, true));
        nextPhoto++;
      } else renderWebBlocks(body, [block], "press");
    }
  } else if (id === "wang-duoli") {
    const [lead, ...remaining] = blocks;
    const [portrait] = photos;
    renderWebBlocks(body, [lead], "press");
    const identification = pressPhoto(portrait, portrait[1]);
    identification.classList.add("press-id-photo");
    body.append(identification);
    renderWebBlocks(body, remaining, "press");
  } else {
    if (photos.length) body.append(pressPhoto(photos[0], photos[0][1]));
    renderWebBlocks(body, blocks, "press");
  }
  const actions = node("div", "", "press-article-actions");
  offerBookmark(actions, "press", id, article.title, params);
  story.append(header, body, actions);
  layout.append(story);

  const otherStories = category?.stories.filter(storyId => storyId !== id) ?? [];
  if (otherStories.length) {
    const related = node("aside", "", "press-related");
    related.setAttribute("aria-label", "同频道报道");
    related.append(node("h2", "同频道报道", "press-section-title"));
    const links = node("ul");
    for (const storyId of otherStories) {
      const item = node("li");
      item.append(link(pages[storyId].title, "press/" + storyId, "press-inline-link"));
      links.append(item);
    }
    related.append(links);
    layout.append(related);
  }
  content.append(layout);
}
