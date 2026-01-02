const POLL_INTERVAL_MS = 5000;

let state = {
  review: null,
  document: null,
  threads: [],
  selectedLines: null,
  filter: "all",
  isLoading: true,
  collapsedThreads: new Set(),
  viewMode: "source",
};

let md = null;

function initMarkdownIt() {
  console.log("[initMarkdownIt] Starting initialization");
  console.log("[initMarkdownIt] window.markdownit:", typeof window.markdownit);

  if (!window.markdownit) {
    console.error("[initMarkdownIt] window.markdownit is not available!");
    return;
  }

  md = window.markdownit({
    html: false,
    breaks: true,
    linkify: true,
  });

  console.log("[initMarkdownIt] Created md instance:", md);

  function injectLineNumbers(tokens, idx, options, env, slf) {
    if (tokens[idx].map) {
      const lineStart = tokens[idx].map[0] + 1;
      const lineEnd = tokens[idx].map[1];
      tokens[idx].attrSet("data-line-start", String(lineStart));
      tokens[idx].attrSet("data-line-end", String(lineEnd));
    }
    return slf.renderToken(tokens, idx, options, env, slf);
  }

  md.renderer.rules.paragraph_open = injectLineNumbers;
  md.renderer.rules.heading_open = injectLineNumbers;
  md.renderer.rules.list_item_open = injectLineNumbers;
  md.renderer.rules.table_open = injectLineNumbers;
  md.renderer.rules.blockquote_open = injectLineNumbers;

  const defaultFenceRender =
    md.renderer.rules.fence ||
    function (tokens, idx, options, env, slf) {
      return slf.renderToken(tokens, idx, options);
    };

  md.renderer.rules.fence = function (tokens, idx, options, env, slf) {
    const token = tokens[idx];
    if (token.map) {
      const lineStart = token.map[0] + 1;
      const lineEnd = token.map[1];
      const langClass = token.info ? `language-${token.info.trim()}` : "";
      const escapedContent = md.utils.escapeHtml(token.content);
      return `<pre data-line-start="${lineStart}" data-line-end="${lineEnd}"><code class="${langClass}">${escapedContent}</code></pre>`;
    }
    return defaultFenceRender(tokens, idx, options, env, slf);
  };
}

async function init() {
  initMarkdownIt();
  await loadData();
  render();
  setupPolling();
  setupDragSelection();
}

// Data Loading
async function loadData() {
  try {
    const [reviewRes, docRes, threadsRes] = await Promise.all([
      fetch("/api/reviews/" + REVIEW_ID),
      fetch("/api/reviews/" + REVIEW_ID + "/document"),
      fetch("/api/reviews/" + REVIEW_ID + "/threads"),
    ]);

    if (!reviewRes.ok || !docRes.ok || !threadsRes.ok) {
      throw new Error("Failed to load review data");
    }

    state.review = await reviewRes.json();
    state.document = await docRes.json();
    const threadsData = await threadsRes.json();
    state.threads = threadsData.threads || [];
    state.isLoading = false;
  } catch (error) {
    console.error("Error loading data:", error);
    showToast("Failed to load review data", "error");
  }
}

function setupPolling() {
  setInterval(async () => {
    if (document.hidden) return;

    try {
      const [docRes, threadsRes] = await Promise.all([
        fetch("/api/reviews/" + REVIEW_ID + "/document"),
        fetch("/api/reviews/" + REVIEW_ID + "/threads"),
      ]);

      if (docRes.ok && threadsRes.ok) {
        const newDoc = await docRes.json();
        const threadsData = await threadsRes.json();

        // Check if document changed
        if (state.document && newDoc.hash !== state.document.hash) {
          state.document = newDoc;
          renderDocument();
          showToast("Document updated", "success");
        }

        // Update threads
        state.threads = threadsData.threads || [];
        renderThreads();
      }
    } catch (error) {
      console.error("Polling error:", error);
    }
  }, POLL_INTERVAL_MS);
}

// Rendering
function render() {
  const app = document.getElementById("app");

  if (state.isLoading) {
    app.innerHTML =
      '<div class="loading"><div class="loading-spinner"></div>Loading review...</div>';
    return;
  }

  if (!state.review || !state.document) {
    app.innerHTML = '<div class="loading">Failed to load review</div>';
    return;
  }

  const docName = state.review.documentPath.split("/").pop();
  const statusLabel = state.review.status.replace(/_/g, " ");

  app.innerHTML = `
    <header class="review-header">
      <div class="review-title">
        <div class="doc-icon-container">
          <i data-lucide="file-text" style="width:20px; height:20px;"></i>
        </div>
        <h1>${escapeHtml(docName)}</h1>
      </div>
      <div class="review-meta">
        <span class="round-badge">Round ${state.review.currentRound}</span>
        <span class="status-badge ${state.review.status}">${statusLabel}</span>
      </div>
    </header>

    <main class="review-content">
      <section class="document-panel">
        <div class="document-panel-header">
          <div class="mode-toggle">
            <button
              class="mode-toggle-btn ${state.viewMode === "source" ? "active" : ""}"
              onclick="setViewMode('source')"
            >
              <i data-lucide="code-2" style="width:14px; height:14px;"></i>
              Source
            </button>
            <button
              class="mode-toggle-btn ${state.viewMode === "preview" ? "active" : ""}"
              onclick="setViewMode('preview')"
            >
              <i data-lucide="eye" style="width:14px; height:14px;"></i>
              Preview
            </button>
          </div>
        </div>
        <div class="document-viewer" id="documentViewer"></div>
      </section>
      
      <aside class="comments-panel">
        <div class="comments-header">
          <h2>Comments (<span id="commentCount">0</span>)</h2>
          <div class="comment-filter">
            <button class="filter-btn ${state.filter === "all" ? "active" : ""}" onclick="setFilter('all')">All</button>
            <button class="filter-btn ${state.filter === "pending" ? "active" : ""}" onclick="setFilter('pending')">Pending</button>
            <button class="filter-btn ${state.filter === "resolved" ? "active" : ""}" onclick="setFilter('resolved')">Resolved</button>
          </div>
        </div>
        <div class="threads-list" id="threadsList"></div>
      </aside>
    </main>

    <footer class="review-actions ${state.review.status !== "pending_review" ? "hidden" : ""}" id="reviewActions">
      <div class="action-buttons">
        <button class="btn-request-changes" onclick="submitReview('request_changes')">
          <i data-lucide="x" style="width:16px; height:16px; display:inline-block; vertical-align:middle; margin-right:4px;"></i> Request Changes
        </button>
        <button class="btn-approve" onclick="submitReview('approve')">
          <i data-lucide="check" style="width:16px; height:16px; display:inline-block; vertical-align:middle; margin-right:4px;"></i> Approve
        </button>
      </div>
    </footer>
  `;

  renderDocument();
  renderThreads();
  lucide.createIcons();
}

function renderDocument() {
  const viewer = document.getElementById("documentViewer");
  if (!viewer || !state.document) return;

  if (state.viewMode === "preview") {
    renderPreview(viewer);
  } else {
    renderSource(viewer);
  }

  lucide.createIcons();
}

function renderSource(viewer) {
  const linesWithComments = new Set();
  state.threads.forEach((thread) => {
    for (let i = thread.lineStart; i <= thread.lineEnd; i++) {
      linesWithComments.add(i);
    }
  });

  const html = state.document.lines
    .map((line, index) => {
      const lineNum = index + 1;
      const hasComment = linesWithComments.has(lineNum);
      const isSelected =
        state.selectedLines &&
        lineNum >= state.selectedLines.start &&
        lineNum <= state.selectedLines.end;

      const classes = ["document-line"];
      if (hasComment) classes.push("has-comment");
      if (isSelected) classes.push("selected");

      return `
      <div class="${classes.join(" ")}" data-line="${lineNum}" 
           onmousedown="handleLineMouseDown(event, ${lineNum})"
           onmouseenter="handleLineMouseEnter(${lineNum})">
        <div class="line-number">
          <i data-lucide="plus" class="line-add-icon"></i>
          <span class="line-number-text">${lineNum}</span>
        </div>
        <div class="line-content">${escapeHtml(line) || " "}</div>
      </div>
    `;
    })
    .join("");

  viewer.innerHTML = html;
}

function renderPreview(viewer) {
  console.log("[renderPreview] Starting preview render");
  console.log("[renderPreview] md instance:", md);
  console.log("[renderPreview] md.render:", typeof md?.render);

  if (!md || !md.render) {
    console.error("[renderPreview] markdown-it not initialized!");
    viewer.innerHTML = '<div style="padding:20px;color:red;">Error: markdown-it not loaded</div>';
    return;
  }

  const rawContent = state.document.lines.join("\n");
  console.log("[renderPreview] Raw content length:", rawContent.length);
  console.log("[renderPreview] First 100 chars:", rawContent.substring(0, 100));

  try {
    const renderedHtml = md.render(rawContent);
    console.log("[renderPreview] Rendered HTML length:", renderedHtml.length);
    console.log("[renderPreview] Rendered HTML preview:", renderedHtml.substring(0, 200));

    viewer.innerHTML = `<div class="preview-content">${renderedHtml}</div>`;
    console.log("[renderPreview] Set viewer.innerHTML");

    applyPreviewHighlights();
    setupPreviewClickHandlers();
    console.log("[renderPreview] Preview render complete");
  } catch (error) {
    console.error("[renderPreview] Error rendering markdown:", error);
    viewer.innerHTML = `<div style="padding:20px;color:red;">Error: ${error.message}</div>`;
  }
}

function setViewMode(mode) {
  console.log("[setViewMode] Switching to mode:", mode);
  state.viewMode = mode;
  clearSelection();

  document.querySelectorAll(".mode-toggle-btn").forEach((btn) => {
    const btnMode = btn.textContent.trim().toLowerCase();
    btn.classList.toggle("active", btnMode === mode);
  });

  renderDocument();
  lucide.createIcons();
}

let isPreviewDragging = false;
let previewDragStart = null;
let justFinishedPreviewDrag = false;

function setupPreviewClickHandlers() {
  const previewContent = document.querySelector(".preview-content");
  if (!previewContent) return;

  previewContent.addEventListener("mousedown", handlePreviewMouseDown);
  previewContent.addEventListener("mousemove", handlePreviewMouseMove);

  document.addEventListener("mouseup", () => {
    handlePreviewMouseUp();
  });
}

function handlePreviewMouseDown(event) {
  const target = event.target.closest("[data-line-start]");
  if (!target) return;

  event.preventDefault();

  const clickedStart = parseInt(target.dataset.lineStart, 10);
  const clickedEnd = parseInt(target.dataset.lineEnd, 10);

  if (isNaN(clickedStart) || isNaN(clickedEnd)) return;

  isPreviewDragging = true;
  previewDragStart = { start: clickedStart, end: clickedEnd };
  state.selectedLines = { start: clickedStart, end: clickedEnd };

  removeInlineCommentForm();
  applyPreviewHighlights();
}

function handlePreviewMouseMove(event) {
  if (!isPreviewDragging || !previewDragStart) return;

  const target = event.target.closest("[data-line-start]");
  if (!target) return;

  const hoveredStart = parseInt(target.dataset.lineStart, 10);
  const hoveredEnd = parseInt(target.dataset.lineEnd, 10);

  if (isNaN(hoveredStart) || isNaN(hoveredEnd)) return;

  const newStart = Math.min(previewDragStart.start, hoveredStart);
  const newEnd = Math.max(previewDragStart.end, hoveredEnd);

  state.selectedLines = { start: newStart, end: newEnd };
  applyPreviewHighlights();
}

function handlePreviewMouseUp() {
  if (!isPreviewDragging) return;

  isPreviewDragging = false;
  previewDragStart = null;
  justFinishedPreviewDrag = true;

  if (state.selectedLines) {
    const previewContent = document.querySelector(".preview-content");
    const firstSelected = previewContent?.querySelector("[data-line-start].selected");
    if (firstSelected) {
      renderPreviewCommentForm(firstSelected);
    }
  }
}

function renderPreviewCommentForm(targetElement) {
  removeInlineCommentForm();

  if (!state.selectedLines) return;

  const isSingleLine = state.selectedLines.start === state.selectedLines.end;
  const lineLabel = isSingleLine
    ? `Line ${state.selectedLines.start}`
    : `Lines ${state.selectedLines.start}-${state.selectedLines.end}`;

  const selectedLines = [];
  for (
    let i = state.selectedLines.start;
    i <= state.selectedLines.end && i <= state.document.lines.length;
    i++
  ) {
    selectedLines.push(state.document.lines[i - 1]);
  }

  let contextHtml;
  if (isSingleLine) {
    contextHtml = `
      <div class="comment-context">
        <span class="comment-line-label">${lineLabel}</span>
        <code class="comment-line-content">${escapeHtml(selectedLines[0]?.trim() || "")}</code>
      </div>
    `;
  } else {
    contextHtml = `
      <div class="comment-context-multi">
        <span class="comment-line-label">${lineLabel}</span>
        <pre class="comment-lines-content">${escapeHtml(selectedLines.join("\n"))}</pre>
      </div>
    `;
  }

  const formHtml = `
    <div class="inline-comment-form">
      ${contextHtml}
      <textarea class="inline-textarea" id="inlineCommentBody" placeholder="Leave a comment..."></textarea>
      <div class="comment-actions">
        <button class="btn-ghost" onclick="clearSelection()">Cancel</button>
        <button class="btn-primary" id="submitInlineCommentBtn" onclick="submitInlineComment()">Add Comment</button>
      </div>
    </div>
  `;

  targetElement.insertAdjacentHTML("afterend", formHtml);

  const textarea = document.getElementById("inlineCommentBody");
  if (textarea) {
    textarea.focus();
    textarea.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        submitInlineComment();
      }
    });
  }
}

function applyPreviewHighlights() {
  const previewContent = document.querySelector(".preview-content");
  if (!previewContent) return;

  const linesWithComments = new Set();
  state.threads.forEach((thread) => {
    for (let i = thread.lineStart; i <= thread.lineEnd; i++) {
      linesWithComments.add(i);
    }
  });

  previewContent.querySelectorAll("[data-line-start]").forEach((el) => {
    const lineStart = parseInt(el.dataset.lineStart, 10);
    const lineEnd = parseInt(el.dataset.lineEnd, 10);

    let hasComment = false;
    for (let i = lineStart; i <= lineEnd; i++) {
      if (linesWithComments.has(i)) {
        hasComment = true;
        break;
      }
    }
    el.classList.toggle("has-comment", hasComment);

    const isSelected =
      state.selectedLines &&
      lineStart <= state.selectedLines.end &&
      lineEnd >= state.selectedLines.start;
    el.classList.toggle("selected", isSelected);
  });
}

function renderThreads() {
  const list = document.getElementById("threadsList");
  const countEl = document.getElementById("commentCount");
  if (!list) return;

  let filteredThreads = state.threads;
  if (state.filter === "pending") {
    filteredThreads = state.threads.filter((t) => !t.resolved);
  } else if (state.filter === "resolved") {
    filteredThreads = state.threads.filter((t) => t.resolved);
  }

  // Sort by line number
  filteredThreads.sort((a, b) => a.lineStart - b.lineStart);

  if (countEl) {
    countEl.textContent = state.threads.length;
  }

  if (filteredThreads.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <i data-lucide="message-square" style="width:24px; height:24px;"></i>
        </div>
        <p class="empty-text">
          ${state.filter === "all" ? "No comments yet" : "No " + state.filter + " comments"}
        </p>
        <p style="font-size: 13px; margin-top: 8px; color: var(--text-secondary);">
          Select a line number to start a discussion
        </p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  list.innerHTML = filteredThreads
    .map((thread) => {
      const lineRange =
        thread.lineStart === thread.lineEnd
          ? "Line " + thread.lineStart
          : "Lines " + thread.lineStart + "-" + thread.lineEnd;

      const authorIcon = thread.author === "human" ? "user" : "bot";
      const authorLabel = thread.author === "human" ? "Human" : "Agent";
      const time = formatTime(thread.createdAt);
      const isCollapsed = state.collapsedThreads.has(thread.id);
      const collapsedClass = isCollapsed ? "collapsed" : "";

      return `
      <div class="thread-card ${thread.resolved ? "resolved" : ""} ${collapsedClass}" data-thread-id="${thread.id}">
        <div class="thread-header" onclick="toggleThreadCollapse('${thread.id}')">
          <div class="thread-header-content">
            <i data-lucide="chevron-down" class="thread-chevron ${collapsedClass}" style="width:14px; height:14px;"></i>
            <span class="thread-lines" onclick="event.stopPropagation(); scrollToLine(${thread.lineStart})">${lineRange}</span>
          </div>
          <div class="thread-status">
            ${thread.resolved ? '<span class="resolved-badge"><i data-lucide="check" style="width:12px; height:12px; margin-right:4px;"></i> Resolved</span>' : ""}
          </div>
        </div>
        <div class="thread-body ${collapsedClass}">
          <div class="comment-header">
            <span class="author-badge ${thread.author}">
              <i data-lucide="${authorIcon}" class="author-badge-icon"></i>
            </span>
            <span class="comment-author-name">${authorLabel}</span>
            <span class="comment-separator">·</span>
            <span class="comment-time">${time}</span>
          </div>
          <div class="comment-content">${escapeHtml(thread.body)}</div>
        </div>
        ${
          thread.replies && thread.replies.length > 0
            ? `
          <div class="replies-section ${collapsedClass}">
            ${thread.replies
              .map((reply) => {
                const replyAuthorIcon = reply.author === "human" ? "user" : "bot";
                const replyAuthorLabel = reply.author === "human" ? "Human" : "Agent";
                const replyTime = formatTime(reply.createdAt);
                return `
                <div class="reply-item">
                  <div class="comment-header">
                    <span class="author-badge ${reply.author}">
                      <i data-lucide="${replyAuthorIcon}" class="author-badge-icon"></i>
                    </span>
                    <span class="comment-author-name">${replyAuthorLabel}</span>
                    <span class="comment-separator">·</span>
                    <span class="comment-time">${replyTime}</span>
                  </div>
                  <div class="comment-content">${escapeHtml(reply.body)}</div>
                </div>
              `;
              })
              .join("")}
          </div>
        `
            : ""
        }
        <div class="thread-actions-row ${collapsedClass}">
          <div class="reply-input-container">
            <input
              type="text"
              class="reply-input"
              id="reply-input-${thread.id}"
              placeholder="Write a reply..."
              onkeydown="handleReplyKeydown(event, '${thread.id}')"
            />
            <button
              class="reply-submit-btn"
              id="reply-btn-${thread.id}"
              onclick="submitQuickReply('${thread.id}')"
              title="Send reply"
            >
              <i data-lucide="send" style="width:16px; height:16px;"></i>
            </button>
          </div>
          <div class="thread-action-buttons">
            ${
              thread.resolved
                ? '<button class="btn-small unresolve" onclick="toggleResolved(\'' +
                  thread.id +
                  "', false)\">Unresolve</button>"
                : '<button class="btn-small resolve" onclick="toggleResolved(\'' +
                  thread.id +
                  "', true)\">Resolve</button>"
            }
          </div>
        </div>
      </div>
    `;
    })
    .join("");

  lucide.createIcons();
}

// Line Selection (click + drag)
let isDragging = false;
let dragStartLine = null;

function handleLineMouseDown(event, lineNum) {
  event.preventDefault();
  isDragging = true;
  dragStartLine = lineNum;
  state.selectedLines = { start: lineNum, end: lineNum };
  updateLineSelectionStyles();
  removeInlineCommentForm();
}

function handleLineMouseEnter(lineNum) {
  if (!isDragging || dragStartLine === null) return;

  const start = Math.min(dragStartLine, lineNum);
  const end = Math.max(dragStartLine, lineNum);
  state.selectedLines = { start, end };
  updateLineSelectionStyles();
}

function updateLineSelectionStyles() {
  document.querySelectorAll(".document-line").forEach((el) => {
    const lineNum = parseInt(el.dataset.line, 10);
    const isSelected =
      state.selectedLines &&
      lineNum >= state.selectedLines.start &&
      lineNum <= state.selectedLines.end;
    el.classList.toggle("selected", isSelected);
  });
}

function handleLineMouseUp() {
  if (!isDragging) return;

  isDragging = false;
  dragStartLine = null;
  justFinishedDrag = true;

  if (state.selectedLines) {
    renderInlineCommentForm();
  }
}

function setupDragSelection() {
  document.addEventListener("mouseup", () => {
    handleLineMouseUp();
  });

  document.addEventListener("mouseleave", () => {
    handleLineMouseUp();
  });
}

function removeInlineCommentForm() {
  const existing = document.querySelector(".inline-comment-form");
  if (existing) {
    existing.remove();
  }
}

function renderInlineCommentForm() {
  removeInlineCommentForm();

  if (!state.selectedLines) return;

  const endLineNum = state.selectedLines.end;
  const lineEl = document.querySelector(`.document-line[data-line="${endLineNum}"]`);
  if (!lineEl) return;

  const isSingleLine = state.selectedLines.start === state.selectedLines.end;
  const lineLabel = isSingleLine
    ? `Line ${state.selectedLines.start}`
    : `Lines ${state.selectedLines.start}-${state.selectedLines.end}`;

  let contextHtml;
  if (isSingleLine) {
    const lineContent = state.document.lines[state.selectedLines.start - 1];
    contextHtml = `
      <div class="comment-context">
        <span class="comment-line-label">${lineLabel}</span>
        <code class="comment-line-content">${escapeHtml(lineContent.trim())}</code>
      </div>
    `;
  } else {
    const selectedLines = [];
    for (let i = state.selectedLines.start; i <= state.selectedLines.end; i++) {
      selectedLines.push(state.document.lines[i - 1]);
    }
    contextHtml = `
      <div class="comment-context-multi">
        <span class="comment-line-label">${lineLabel}</span>
        <pre class="comment-lines-content">${escapeHtml(selectedLines.join("\n"))}</pre>
      </div>
    `;
  }

  const formHtml = `
    <div class="inline-comment-form">
      ${contextHtml}
      <textarea class="inline-textarea" id="inlineCommentBody" placeholder="Leave a comment..."></textarea>
      <div class="comment-actions">
        <button class="btn-ghost" onclick="clearSelection()">Cancel</button>
        <button class="btn-primary" id="submitInlineCommentBtn" onclick="submitInlineComment()">Add Comment</button>
      </div>
    </div>
  `;

  lineEl.insertAdjacentHTML("afterend", formHtml);

  const textarea = document.getElementById("inlineCommentBody");
  if (textarea) {
    textarea.focus();
    textarea.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        submitInlineComment();
      }
    });
  }
}

function clearSelection() {
  state.selectedLines = null;
  isDragging = false;
  dragStartLine = null;

  removeInlineCommentForm();

  if (state.viewMode === "preview") {
    applyPreviewHighlights();
  } else {
    renderDocument();
  }
}

function setButtonLoading(button, isLoading) {
  if (isLoading) {
    button.classList.add("btn-loading");
    button.disabled = true;
  } else {
    button.classList.remove("btn-loading");
    button.disabled = false;
  }
}

async function submitInlineComment() {
  const textarea = document.getElementById("inlineCommentBody");
  const body = textarea?.value?.trim();
  const btn = document.getElementById("submitInlineCommentBtn");

  if (!body || !state.selectedLines) {
    showToast("Please enter a comment", "error");
    return;
  }

  setButtonLoading(btn, true);

  try {
    const response = await fetch("/api/reviews/" + REVIEW_ID + "/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lineStart: state.selectedLines.start,
        lineEnd: state.selectedLines.end,
        body: body,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to add comment");
    }

    const thread = await response.json();
    state.threads.push(thread);

    clearSelection();
    renderThreads();
    showToast("Comment added", "success");
  } catch (error) {
    console.error("Error adding comment:", error);
    showToast("Failed to add comment", "error");
  } finally {
    if (btn) setButtonLoading(btn, false);
  }
}

function showInlineReplyForm(threadId) {
  const existing = document.getElementById(`reply-form-${threadId}`);
  if (existing) {
    existing.querySelector("textarea")?.focus();
    return;
  }

  const threadCard = document.querySelector(`.thread-card[data-thread-id="${threadId}"]`);
  if (!threadCard) return;

  const formHtml = `
      <div class="reply-form-container" id="reply-form-${threadId}" style="padding: 12px; border-top: 1px solid var(--border-color); background-color: var(--bg-tertiary);">
          <textarea class="inline-textarea" id="reply-input-${threadId}" placeholder="Write a reply..." style="min-height: 60px; margin-bottom: 8px;"></textarea>
          <div class="comment-actions">
              <button class="btn-ghost" onclick="removeReplyForm('${threadId}')">Cancel</button>
              <button class="btn-primary" id="btn-reply-${threadId}" onclick="submitInlineReply('${threadId}')">Reply</button>
          </div>
      </div>
  `;

  const actions = threadCard.querySelector(".thread-actions");
  if (actions) {
    actions.insertAdjacentHTML("beforebegin", formHtml);
  } else {
    threadCard.appendChild(document.createRange().createContextualFragment(formHtml));
  }

  const input = document.getElementById(`reply-input-${threadId}`);
  if (input) {
    input.focus();
    input.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        submitInlineReply(threadId);
      }
    });
  }
}

function removeReplyForm(threadId) {
  const form = document.getElementById(`reply-form-${threadId}`);
  if (form) form.remove();
}

async function submitInlineReply(threadId) {
  const textarea = document.getElementById(`reply-input-${threadId}`);
  const body = textarea?.value?.trim();
  const btn = document.getElementById(`btn-reply-${threadId}`);

  if (!body) {
    showToast("Please enter a reply", "error");
    return;
  }

  if (btn) setButtonLoading(btn, true);

  try {
    const response = await fetch(
      "/api/reviews/" + REVIEW_ID + "/threads/" + threadId + "/replies",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body }),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to add reply");
    }

    const reply = await response.json();
    const thread = state.threads.find((t) => t.id === threadId);
    if (thread) {
      thread.replies = thread.replies || [];
      thread.replies.push(reply);
    }

    removeReplyForm(threadId);
    renderThreads();
    showToast("Reply added", "success");
  } catch (error) {
    console.error("Error adding reply:", error);
    showToast("Failed to add reply", "error");
  }
}

function handleReplyKeydown(event, threadId) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    submitQuickReply(threadId);
  }
}

async function submitQuickReply(threadId) {
  const input = document.getElementById(`reply-input-${threadId}`);
  const body = input?.value?.trim();

  if (!body) return;

  const btn = document.getElementById(`reply-btn-${threadId}`);
  if (btn) btn.disabled = true;

  try {
    const response = await fetch(
      "/api/reviews/" + REVIEW_ID + "/threads/" + threadId + "/replies",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body }),
      },
    );

    if (!response.ok) throw new Error("Failed to add reply");

    const reply = await response.json();
    const thread = state.threads.find((t) => t.id === threadId);
    if (thread) {
      thread.replies = thread.replies || [];
      thread.replies.push(reply);
    }

    renderThreads();
    showToast("Reply added", "success");
  } catch (error) {
    console.error("Error adding reply:", error);
    showToast("Failed to add reply", "error");
  } finally {
    if (btn) btn.disabled = false;
  }
}

// Resolve/Unresolve
async function toggleResolved(threadId, resolved) {
  try {
    const response = await fetch("/api/reviews/" + REVIEW_ID + "/threads/" + threadId, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolved: resolved }),
    });

    if (!response.ok) {
      throw new Error("Failed to update thread");
    }

    const thread = state.threads.find((t) => t.id === threadId);
    if (thread) {
      thread.resolved = resolved;
      if (resolved) {
        thread.resolvedBy = "human";
        thread.resolvedAt = new Date().toISOString();
      } else {
        thread.resolvedBy = undefined;
        thread.resolvedAt = undefined;
      }
    }

    renderThreads();
    showToast(resolved ? "Comment resolved" : "Comment unresolved", "success");
  } catch (error) {
    console.error("Error updating thread:", error);
    showToast("Failed to update comment", "error");
  }
}

// Submit Review
async function submitReview(decision) {
  if (
    !confirm(
      decision === "approve"
        ? "Are you sure you want to approve this document?"
        : "Are you sure you want to request changes?",
    )
  ) {
    return;
  }

  try {
    const response = await fetch("/api/reviews/" + REVIEW_ID + "/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision: decision }),
    });

    if (!response.ok) {
      throw new Error("Failed to submit review");
    }

    const result = await response.json();
    state.review.status = result.status;

    render();
    showToast(decision === "approve" ? "Review approved" : "Changes requested", "success");
  } catch (error) {
    console.error("Error submitting review:", error);
    showToast("Failed to submit review", "error");
  }
}

// Filter
function setFilter(filter) {
  state.filter = filter;

  // Update filter buttons
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.textContent.toLowerCase() === filter);
  });

  renderThreads();
  lucide.createIcons();
}

// Thread collapse/expand
function toggleThreadCollapse(threadId) {
  if (state.collapsedThreads.has(threadId)) {
    state.collapsedThreads.delete(threadId);
  } else {
    state.collapsedThreads.add(threadId);
  }
  renderThreads();
}

// Scroll to line
function scrollToLine(lineNum) {
  if (state.viewMode === "preview") {
    const previewContent = document.querySelector(".preview-content");
    if (!previewContent) return;

    let targetEl = null;
    previewContent.querySelectorAll("[data-line-start]").forEach((el) => {
      const lineStart = parseInt(el.dataset.lineStart, 10);
      const lineEnd = parseInt(el.dataset.lineEnd, 10);
      if (lineNum >= lineStart && lineNum <= lineEnd) {
        targetEl = el;
      }
    });

    if (targetEl) {
      targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
      targetEl.classList.add("highlight-flash");
      setTimeout(() => targetEl.classList.remove("highlight-flash"), 1500);
    }
  } else {
    const line = document.querySelector('.document-line[data-line="' + lineNum + '"]');
    if (line) {
      line.scrollIntoView({ behavior: "smooth", block: "center" });

      line.classList.add("highlight-flash");
      setTimeout(() => {
        line.classList.remove("highlight-flash");
      }, 1500);
    }
  }
}

// Utilities
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function formatTime(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return diffMins + "m ago";
  if (diffHours < 24) return diffHours + "h ago";
  if (diffDays < 7) return diffDays + "d ago";

  return date.toLocaleDateString();
}

function showToast(message, type) {
  const existing = document.querySelector(".toast");
  if (existing) {
    existing.classList.add("hiding");
    setTimeout(() => existing.remove(), 200);
  }

  const toast = document.createElement("div");
  toast.className = "toast " + type;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("hiding");
    setTimeout(() => toast.remove(), 200);
  }, 3000);
}

let justFinishedDrag = false;

document.addEventListener("click", (e) => {
  if (justFinishedDrag) {
    justFinishedDrag = false;
    return;
  }

  if (justFinishedPreviewDrag) {
    justFinishedPreviewDrag = false;
    return;
  }

  const isDocumentLine = e.target.closest(".document-line");
  const isInlineForm = e.target.closest(".inline-comment-form");
  const isPreviewElement = e.target.closest(".preview-content [data-line-start]");

  if (!isDocumentLine && !isInlineForm && !isPreviewElement && state.selectedLines) {
    clearSelection();
  }
});

// Handle keyboard shortcuts
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    clearSelection();
  }
});

// Start the app
init();
