(function () {
  const PAGE_SIZE = 40;
  let state = { query: "", make: "", brand: "", page: 1 };

  const els = {};

  function init() {
    els.searchInput = document.getElementById("catalogSearch");
    els.makeSelect = document.getElementById("makeFilter");
    els.brandSelect = document.getElementById("brandFilter");
    els.count = document.getElementById("resultCount");
    els.pagination = document.getElementById("pagination");
    els.clearBtn = document.getElementById("clearFilters");
    els.tableWrap = document.getElementById("tableWrap");

    populateMakes();

    els.searchInput.addEventListener("input", debounce(() => {
      state.query = els.searchInput.value.trim().toUpperCase();
      state.page = 1;
      render();
    }, 180));

    els.makeSelect.addEventListener("change", () => {
      state.make = els.makeSelect.value;
      state.page = 1;
      render();
    });

    els.brandSelect.addEventListener("change", () => {
      state.brand = els.brandSelect.value;
      state.page = 1;
      render();
    });

    els.clearBtn.addEventListener("click", () => {
      state = { query: "", make: "", brand: "", page: 1 };
      els.searchInput.value = "";
      els.makeSelect.value = "";
      els.brandSelect.value = "";
      render();
    });

    document.querySelectorAll("[data-cat-filter]").forEach((card) => {
      card.addEventListener("click", () => {
        const kw = card.getAttribute("data-cat-filter");
        state.query = kw.toUpperCase();
        state.make = "";
        state.brand = "";
        state.page = 1;
        els.searchInput.value = kw;
        els.makeSelect.value = "";
        els.brandSelect.value = "";
        document.getElementById("catalog").scrollIntoView({ behavior: "smooth" });
        render();
      });
    });

    render();
  }

  function populateMakes() {
    const makes = [...new Set(CATALOG.map((i) => i.make))].sort();
    makes.forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m;
      opt.textContent = m;
      els.makeSelect.appendChild(opt);
    });
  }

  function filtered() {
    return CATALOG.filter((item) => {
      if (state.make && item.make !== state.make) return false;
      if (state.brand && item.brand !== state.brand) return false;
      if (state.query) {
        const hay = (item.itemId + " " + item.description + " " + item.category + " " + (item.oem || "")).toUpperCase();
        if (!hay.includes(state.query)) return false;
      }
      return true;
    });
  }

  function render() {
    const results = filtered();
    els.count.textContent = results.length.toLocaleString() + " part" + (results.length === 1 ? "" : "s") + " found";

    const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
    if (state.page > totalPages) state.page = totalPages;
    const start = (state.page - 1) * PAGE_SIZE;
    const pageItems = results.slice(start, start + PAGE_SIZE);

    if (pageItems.length === 0) {
      els.tableWrap.innerHTML = "";
      els.tableWrap.style.display = "none";
      els.pagination.innerHTML = "";
      if (!els.noResults) {
        els.noResults = document.createElement("div");
        els.noResults.className = "no-results";
        els.noResults.id = "noResultsBox";
        els.tableWrap.parentNode.insertBefore(els.noResults, els.pagination);
      }
      els.noResults.textContent = "No matching parts. Try a different search term or clear filters.";
      els.noResults.style.display = "block";
      return;
    } else if (els.noResults) {
      els.noResults.style.display = "none";
      els.tableWrap.style.display = "grid";
    }

    const placeholderIcon = `<svg class="ph-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></svg>`;

    els.tableWrap.innerHTML = pageItems
      .map((item) => {
        const thumb = item.image
          ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.description)}" loading="lazy">`
          : placeholderIcon;
        return `
      <div class="product-card">
        <div class="product-thumb">
          ${thumb}
          <span class="watermark ${item.brand}">${item.brand}</span>
          <span class="badge ${item.brand}">${item.brand}</span>
        </div>
        <div class="product-body">
          <div class="pid">#${escapeHtml(item.itemId)}</div>
          <div class="pdesc">${escapeHtml(item.description)}</div>
          <div class="pcat">${escapeHtml(item.category)}</div>
          ${item.oem ? `<div class="poem">OEM: ${escapeHtml(item.oem)}</div>` : ""}
        </div>
      </div>`;
      })
      .join("");

    renderPagination(totalPages);
  }

  function renderPagination(totalPages) {
    if (totalPages <= 1) {
      els.pagination.innerHTML = "";
      return;
    }
    let html = "";
    html += `<button ${state.page === 1 ? "disabled" : ""} data-page="${state.page - 1}">&larr;</button>`;

    const windowSize = 2;
    for (let p = 1; p <= totalPages; p++) {
      if (p === 1 || p === totalPages || Math.abs(p - state.page) <= windowSize) {
        html += `<button class="${p === state.page ? "active" : ""}" data-page="${p}">${p}</button>`;
      } else if (Math.abs(p - state.page) === windowSize + 1) {
        html += `<span style="padding:8px 4px;color:#999;">&hellip;</span>`;
      }
    }
    html += `<button ${state.page === totalPages ? "disabled" : ""} data-page="${state.page + 1}">&rarr;</button>`;
    els.pagination.innerHTML = html;

    els.pagination.querySelectorAll("button[data-page]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.page = parseInt(btn.getAttribute("data-page"), 10);
        render();
        document.getElementById("catalog").scrollIntoView({ behavior: "smooth" });
      });
    });
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c]));
  }

  function debounce(fn, delay) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  }

  // Mobile nav toggle
  function initNav() {
    const toggle = document.getElementById("navToggle");
    const nav = document.getElementById("mainNav");
    if (!toggle || !nav) return;
    toggle.addEventListener("click", () => nav.classList.toggle("open"));
    nav.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => nav.classList.remove("open"))
    );
  }

  document.addEventListener("DOMContentLoaded", () => {
    init();
    initNav();
  });
})();
