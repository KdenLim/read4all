document.documentElement.classList.add("js");

const header = document.querySelector("[data-header]");
const navToggle = document.querySelector("[data-nav-toggle]");
const navMenu = document.querySelector("[data-nav-menu]");
const navLinks = Array.from(document.querySelectorAll(".nav-links a"));
const samePageNavLinks = navLinks.filter((link) => {
  const href = link.getAttribute("href");
  return href && href.startsWith("#");
});
const sections = samePageNavLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

function setMenuState(isOpen) {
  navToggle.setAttribute("aria-expanded", String(isOpen));
  navToggle.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
  navMenu.classList.toggle("is-open", isOpen);
  document.body.classList.toggle("nav-open", isOpen);
}

navToggle.addEventListener("click", () => {
  const isOpen = navToggle.getAttribute("aria-expanded") === "true";
  setMenuState(!isOpen);
});

navLinks.forEach((link) => link.addEventListener("click", () => setMenuState(false)));

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setMenuState(false);
  }
});

function updateHeader() {
  header.classList.toggle("is-scrolled", window.scrollY > 8);
}

updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

const currentPage = location.pathname.split("/").pop() || "index.html";

navLinks.forEach((link) => {
  const linkPage = new URL(link.href).pathname.split("/").pop() || "index.html";
  link.classList.toggle("is-active", linkPage === currentPage);
});

if (sections.length > 0 && "IntersectionObserver" in window) {
  const activeSectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        samePageNavLinks.forEach((link) => {
          const isMatch = link.getAttribute("href") === `#${entry.target.id}`;
          link.classList.toggle("is-active", isMatch);
        });
      });
    },
    { rootMargin: "-45% 0px -50% 0px", threshold: 0.01 },
  );

  sections.forEach((section) => activeSectionObserver.observe(section));
}

const revealTargets = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.14 },
  );

  revealTargets.forEach((target) => revealObserver.observe(target));
} else {
  revealTargets.forEach((target) => target.classList.add("is-visible"));
}

const resourceFinder = document.querySelector("[data-resource-finder]");

if (resourceFinder) {
  initResourceFinder(resourceFinder);
}

function initResourceFinder(finder) {
  const csvPath = "assets/read4all_free_reading_resources.csv";
  const searchInput = finder.querySelector("[data-resource-search]");
  const clearButton = finder.querySelector("[data-resource-clear]");
  const status = finder.querySelector("[data-resource-status]");
  const results = finder.querySelector("[data-resource-results]");
  const toggleButton = finder.querySelector("[data-resource-toggle]");
  const allPanel = finder.querySelector("[data-resource-all-panel]");
  const allList = finder.querySelector("[data-resource-all-list]");
  const allCount = finder.querySelector("[data-resource-all-count]");
  const chips = Array.from(finder.querySelectorAll("[data-filter-value]"));
  const activeFilters = {
    best: new Set(),
    level: new Set(),
  };

  const bestForPresets = {
    children: ["children", "kids", "early literacy", "read-aloud", "young readers"],
    english: ["english", "esl", "vocabulary", "grammar", "comprehension"],
    languages: ["foreign-language", "language", "multilingual", "graded readers", "vocabulary"],
    students: ["student", "classroom", "text sets", "comprehension", "practice"],
    textbooks: ["textbook", "course", "structured learning", "oer", "course notes"],
    classics: ["free books", "classic", "public domain", "digital library", "ebooks"],
    stem: ["science", "stem", "math", "coding", "technology", "data"],
    research: ["research", "papers", "journals", "theses", "scholarly"],
  };
  const levelPresets = {
    kids: ["kids", "children", "young readers", "early readers", "parents"],
    teens: ["teens", "teen", "students"],
    adults: ["adults", "adult"],
    academic: ["academic", "research", "university", "college"],
    "all ages": ["all ages"],
  };

  let resources = [];

  fetch(csvPath)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Could not load resource CSV.");
      }

      return response.text();
    })
    .then((csvText) => {
      resources = parseCsv(csvText).map(normalizeResource);
      renderAllResources(resources);
      updateResults();
    })
    .catch(() => {
      status.textContent = "Resource list could not be loaded. Please open this page through Live Server.";
      results.innerHTML = '<p class="resource-error">The CSV file is available in the project, but the browser blocked loading it.</p>';
      allCount.textContent = "List unavailable";
    });

  searchInput.addEventListener("input", updateResults);

  clearButton.addEventListener("click", () => {
    searchInput.value = "";
    chips.forEach((chip) => chip.classList.remove("is-active"));
    Object.values(activeFilters).forEach((set) => set.clear());
    updateResults();
    searchInput.focus();
  });

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const group = chip.closest("[data-filter-group]").dataset.filterGroup;
      const value = chip.dataset.filterValue;
      const filterSet = activeFilters[group];

      if (filterSet.has(value)) {
        filterSet.delete(value);
        chip.classList.remove("is-active");
      } else {
        filterSet.add(value);
        chip.classList.add("is-active");
      }

      updateResults();
    });
  });

  toggleButton.addEventListener("click", () => {
    const isExpanded = toggleButton.getAttribute("aria-expanded") === "true";
    toggleButton.setAttribute("aria-expanded", String(!isExpanded));
    toggleButton.textContent = isExpanded ? "View all resources" : "Hide all resources";
    allPanel.hidden = isExpanded;
  });

  function updateResults() {
    if (resources.length === 0) return;

    const query = searchInput.value.trim().toLowerCase();
    const tokens = query.split(/\s+/).filter(Boolean);
    const hasFilters = Object.values(activeFilters).some((set) => set.size > 0);
    const ranked = resources
      .filter((resource) => matchesFilters(resource))
      .map((resource) => ({
        resource,
        score: scoreResource(resource, tokens) + filterScore(resource),
      }))
      .filter((item) => tokens.length === 0 || item.score > 0)
      .sort((a, b) => b.score - a.score || Number(a.resource.id) - Number(b.resource.id));

    const visible = ranked.slice(0, 12);
    const mode = tokens.length > 0 || hasFilters ? "matching" : "recommended";

    status.textContent = `${visible.length} ${mode} resource${visible.length === 1 ? "" : "s"} shown from ${resources.length}.`;

    if (visible.length === 0) {
      results.innerHTML = '<p class="resource-empty">No close matches yet. Try a broader word like books, science, kids, language, or research.</p>';
      return;
    }

    results.innerHTML = visible.map(({ resource }) => renderResourceCard(resource)).join("");
  }

  function matchesFilters(resource) {
    if (activeFilters.best.size > 0 && !Array.from(activeFilters.best).some((value) => matchesBestPreset(resource, value))) {
      return false;
    }

    if (activeFilters.level.size > 0 && !Array.from(activeFilters.level).some((value) => matchesLevelPreset(resource, value))) {
      return false;
    }

    return true;
  }

  function filterScore(resource) {
    let score = 0;

    activeFilters.best.forEach((value) => {
      if (matchesBestPreset(resource, value)) score += 10;
    });

    activeFilters.level.forEach((value) => {
      if (matchesLevelPreset(resource, value)) score += 6;
    });

    return score;
  }

  function matchesBestPreset(resource, value) {
    return bestForPresets[value].some((term) => resource.searchText.includes(term));
  }

  function matchesLevelPreset(resource, value) {
    return levelPresets[value].some((term) => resource.searchText.includes(term));
  }

  function renderAllResources(items) {
    allCount.textContent = `${items.length} resources in the CSV`;
    allList.innerHTML = items
      .map(
        (resource) => `
          <article class="resource-all-item">
            <div>
              <strong>${escapeHtml(resource.name)}</strong>
              <span>${escapeHtml(resource.bestFor || resource.category)}</span>
            </div>
            <a href="${escapeAttribute(resource.url)}" target="_blank" rel="noreferrer">Visit</a>
          </article>
        `,
      )
      .join("");
  }
}

function parseCsv(csvText) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const nextChar = csvText[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") index += 1;
      row.push(field);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  row.push(field);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);

  const headers = rows.shift().map((header) => header.trim());

  return rows.map((cells) =>
    headers.reduce((record, header, index) => {
      record[header] = (cells[index] || "").trim();
      return record;
    }, {}),
  );
}

function normalizeResource(record) {
  const resource = {
    id: record.ID,
    name: record["Resource Name"],
    url: record.URL,
    category: record["Primary Category"],
    subcategory: record.Subcategory,
    level: record["Target Age/Level"],
    language: record["Main Language(s)"],
    access: record["Access Type"],
    bestFor: record["Best For"],
    keywords: record.Keywords,
    notes: record.Notes,
  };

  resource.levelText = resource.level.toLowerCase();
  resource.accessText = resource.access.toLowerCase();
  resource.searchText = [
    resource.name,
    resource.category,
    resource.subcategory,
    resource.level,
    resource.language,
    resource.access,
    resource.bestFor,
    resource.keywords,
    resource.notes,
  ]
    .join(" ")
    .toLowerCase();

  return resource;
}

function scoreResource(resource, tokens) {
  if (tokens.length === 0) {
    return Math.max(1, 500 - Number(resource.id || 0));
  }

  const weightedFields = [
    [resource.name, 10],
    [resource.bestFor, 8],
    [resource.category, 6],
    [resource.subcategory, 6],
    [resource.keywords, 6],
    [resource.level, 3],
    [resource.language, 3],
    [resource.access, 3],
    [resource.notes, 1],
  ];

  return tokens.reduce((total, token) => {
    const tokenScore = weightedFields.reduce((sum, [value, weight]) => {
      return String(value || "").toLowerCase().includes(token) ? sum + weight : sum;
    }, 0);

    return total + tokenScore;
  }, 0);
}

function renderResourceCard(resource) {
  return `
    <article class="resource-result-card">
      <div class="resource-meta-row">
        <span class="resource-meta">${escapeHtml(resource.category)}</span>
        <span class="resource-meta">${escapeHtml(resource.language)}</span>
      </div>
      <h3>${escapeHtml(resource.name)}</h3>
      <p>${escapeHtml(resource.bestFor)}</p>
      <p>${escapeHtml(resource.notes)}</p>
      <a href="${escapeAttribute(resource.url)}" target="_blank" rel="noreferrer">Visit resource</a>
    </article>
  `;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
