"use strict";

const institutionSites = {
  university: {
    brand: "海岬大学", mark: "海", detail: "HAIJIAO UNIVERSITY",
    navigation: [["研究生院", "university"], ["研究生项目", "university/project"], ["合作伙伴与奖助", "university/sponsorship"]],
  },
  company: {
    brand: "林氏集团", mark: "林", detail: "LIN GROUP",
    navigation: [["集团首页", "company"], ["公司公告", "company/health"], ["项目归档", "company/transport"], ["联系我们", "contacts/group"]],
  },
  registry: {
    brand: "企查查", mark: "查", detail: "企业信息查询",
    navigation: [["查企业", "registry"]],
  },
  directory: {
    brand: "京海市立医院", mark: "+", detail: "JINGHAI MUNICIPAL HOSPITAL",
    navigation: [["院区导航", "directory"]],
  },
  feng: {
    brand: "如初文化", mark: "如", detail: "京海如初文化传播有限公司",
    navigation: [["关于我们", "feng"], ["节目作品", "parenting"], ["创办人联系", "contacts/mother"]],
  },
  parenting: {
    brand: "京海生活台", mark: "生", detail: "家庭与生活栏目",
    navigation: [["育儿经", "parenting"], ["嘉宾机构", "feng"]],
  },
};

const institutionSections = new Set(Object.keys(institutionSites));

const institutionHomeTitles = {
  university: "研究生院",
  company: "林氏集团",
  registry: "查企业",
  directory: "院区导航",
  feng: "关于如初文化",
  parenting: "《育儿经》｜冯如谈家里两个孩子",
};

function buildInstitutionHeader(section, id, theme) {
  const bar = node("header", "", "institution-bar");
  const inner = node("div", "", "institution-inner institution-bar-inner");
  const brand = link("", section, "institution-brand");
  const mark = node("span", theme.mark, "institution-mark");
  mark.setAttribute("aria-hidden", "true");
  const wordmark = node("span", "", "institution-wordmark");
  wordmark.append(node("strong", theme.brand), node("small", theme.detail));
  brand.append(mark, wordmark);

  const navigation = node("nav", "", "institution-nav");
  navigation.setAttribute("aria-label", theme.brand + "站内导航");
  const activeRoute = section + (id ? "/" + id : "");
  for (const [label, route] of theme.navigation) {
    const anchor = route.split("/")[0] === section ? link(label, route, "institution-nav-link") : tabLink(label, route, "institution-nav-link");
    if (route === activeRoute) anchor.setAttribute("aria-current", "page");
    else if (section === "company" && id === "representative" && route === "company/health") anchor.setAttribute("aria-current", "location");
    navigation.append(anchor);
  }
  inner.append(brand, navigation);
  bar.append(inner);
  return bar;
}

function buildInstitutionHeading(section, id, title, query) {
  const hero = node("header", "", "institution-hero");
  const inner = node("div", "", "institution-inner institution-hero-inner");
  const copy = node("div", "", "institution-hero-copy");
  if (id || (section === "registry" && query)) {
    const path = node("nav", "", "institution-crumbs");
    path.setAttribute("aria-label", "当前位置");
    const current = node("span", title);
    current.setAttribute("aria-current", "page");
    path.append(link(institutionHomeTitles[section], section, "institution-crumb-home"), current);
    copy.append(path);
  }

  const heading = node("h2", title, "institution-heading");
  heading.tabIndex = -1;
  copy.append(heading);
  inner.append(copy);
  if (section === "parenting" || section === "feng") inner.append(buildFounderPortrait(section));
  hero.append(inner);
  return { hero, heading, copy };
}

function buildFounderPortrait(section) {
  const portrait = node("figure", "", "institution-portrait");
  const frame = node("div", "", "institution-portrait-frame");
  const monogram = node("span", "如", "institution-portrait-monogram");
  monogram.setAttribute("aria-hidden", "true");
  const image = document.createElement("img");
  image.alt = "";
  image.hidden = true;
  image.addEventListener("load", () => { image.hidden = false; }, { once: true });
  image.addEventListener("error", () => image.remove(), { once: true });
  image.src = "assets/portraits/feng-ru.webp";
  frame.append(monogram, image);
  portrait.append(frame, node("figcaption", section === "feng" ? "冯如 · 创办人" : "冯如 · 嘉宾"));
  return portrait;
}

const institutionAnnouncements = {
  "#company/health": ["2026-05-13", "05 / 13"],
  "#company/representative": ["2026-05-26", "05 / 26"],
};

function formatInstitutionAnnouncements(body) {
  for (const anchor of body.querySelectorAll(":scope > a")) {
    const date = institutionAnnouncements[anchor.getAttribute("href")];
    if (!date) continue;
    const time = node("time", date[1], "institution-announcement-date");
    time.dateTime = date[0];
    anchor.classList.add("institution-announcement");
    anchor.prepend(time);
  }
}

function formatInstitutionDirectory(body) {
  const headings = [...body.querySelectorAll(":scope > h3")];
  if (!headings.length) return;
  const addresses = node("ul", "", "institution-directory");
  headings[0].before(addresses);
  for (const title of headings) {
    const description = title.nextElementSibling;
    const card = node("li", "", "institution-address");
    const symbol = node("span", "", "institution-location-pin");
    symbol.setAttribute("aria-hidden", "true");
    card.append(symbol, title);
    if (description?.tagName === "P") card.append(description);
    addresses.append(card);
  }
}

function renderInstitutionSite(container, section, id, params, renderContent) {
  const theme = institutionSites[section];
  const query = params.get("q")?.trim();
  const title = id ? webSites[section]?.pages[id]?.title : institutionHomeTitles[section];
  const visibleTitle = !id && section === "registry" && query ? "企业查询结果" : title ?? "页面未找到";
  const site = node("div", "", "institution-site");
  site.dataset.site = section;
  site.dataset.page = id || (section === "registry" && query ? "results" : "home");
  const bar = buildInstitutionHeader(section, id, theme);
  const { hero, heading, copy } = buildInstitutionHeading(section, id, visibleTitle, query);
  const body = node("div", "", "source-body institution-content institution-inner");
  renderContent(body);
  if (section === "university" && !id) {
    const introduction = body.querySelector(":scope > p");
    if (introduction) {
      introduction.classList.add("institution-description");
      copy.append(introduction);
    }
    body.prepend(node("h3", "研究生项目"));
  }
  if (section === "company" && !id) formatInstitutionAnnouncements(body);
  if (section === "directory") formatInstitutionDirectory(body);
  site.append(bar, hero, body);
  container.replaceChildren(site);
  return heading;
}
