(() => {
  "use strict";

  const SAMPLE_PALETTES = [
    ["#ff8a54", "#a62b0c"],
    ["#65d6b5", "#176752"],
    ["#f2c14e", "#8a5a05"],
    ["#6e9fff", "#1e3d9b"],
    ["#e986b4", "#8f2756"],
    ["#b1dc62", "#4d781a"],
    ["#b794f4", "#5a3895"],
    ["#f49376", "#8c3221"]
  ];

  const FILE_PALETTES = [
    ["#ff8a54", "#9b2f0b"],
    ["#5fcbaa", "#175d49"],
    ["#e7bd52", "#765006"],
    ["#6e9fff", "#1e3d9b"],
    ["#e986b4", "#8f2756"],
    ["#9acd58", "#4d781a"],
    ["#ad91e8", "#56398c"],
    ["#ee8c6f", "#85351f"]
  ];

  const IMAGE_EXTENSION = /\.(jpe?g|png|webp)$/i;
  const ROLL_INTERVAL = 80;

  const elements = {
    folderButton: document.querySelector("#folderButton"),
    folderInput: document.querySelector("#folderInput"),
    loadStatus: document.querySelector("#loadStatus"),
    loadState: document.querySelector(".load-state"),
    modeButtons: [...document.querySelectorAll(".mode-button")],
    visualFrame: document.querySelector("#visualFrame"),
    scrollView: document.querySelector("#scrollView"),
    flipView: document.querySelector("#flipView"),
    slotView: document.querySelector("#slotView"),
    scrollPortrait: document.querySelector("#scrollPortrait"),
    flipPortraitFront: document.querySelector("#flipPortraitFront"),
    flipPortraitBack: document.querySelector("#flipPortraitBack"),
    flipCard: document.querySelector("#flipCard"),
    liveName: document.querySelector("#liveName"),
    flipNameFront: document.querySelector("#flipNameFront"),
    flipNameBack: document.querySelector("#flipNameBack"),
    slotTrack: document.querySelector("#slotTrack"),
    slotName: document.querySelector("#slotName"),
    frameState: document.querySelector("#frameState"),
    frameCounter: document.querySelector("#frameCounter"),
    frameCaption: document.querySelector("#frameCaption"),
    remainingCount: document.querySelector("#remainingCount"),
    drawnCount: document.querySelector("#drawnCount"),
    totalCount: document.querySelector("#totalCount"),
    roundProgress: document.querySelector("#roundProgress"),
    poolHint: document.querySelector("#poolHint"),
    drawButton: document.querySelector("#drawButton"),
    drawButtonLabel: document.querySelector("#drawButtonLabel"),
    actionHint: document.querySelector("#actionHint"),
    historyCount: document.querySelector("#historyCount"),
    historyList: document.querySelector("#historyList"),
    resetButton: document.querySelector("#resetButton"),
    roster: document.querySelector("#roster"),
    rosterSource: document.querySelector("#rosterSource"),
    rosterCount: document.querySelector("#rosterCount"),
    winnerOverlay: document.querySelector("#winnerOverlay"),
    winnerPortrait: document.querySelector("#winnerPortrait"),
    winnerName: document.querySelector("#winnerName"),
    winnerOrder: document.querySelector("#winnerOrder"),
    winnerMeta: document.querySelector("#winnerMeta"),
    continueButton: document.querySelector("#continueButton"),
    confetti: document.querySelector("#confetti")
  };

  let students = createSampleStudents();
  let sourceLabel = "示例名单";
  let objectUrls = [];
  let selectedIds = new Set();
  let selectedOrder = [];
  let lastWinner = null;
  let presentationMode = "scroll";
  let isSpinning = false;
  let rollTimer = null;
  let tickCount = 0;
  let winnerIsOpen = false;
  let overlayCloseTimer = null;
  let lastFocusedElement = null;

  function createSampleStudents() {
    return Array.from({ length: 8 }, (_, index) => {
      const name = `示例同学${index + 1}`;
      const palette = SAMPLE_PALETTES[index];

      return {
        id: `sample-${index + 1}`,
        name,
        initial: getInitial(name),
        imageUrl: "",
        faceA: palette[0],
        faceB: palette[1],
        sampleIndex: index + 1
      };
    });
  }

  function getInitial(name) {
    return Array.from(name.trim())[0] || "同";
  }

  function getFilePalette(index) {
    return FILE_PALETTES[index % FILE_PALETTES.length];
  }

  function removeFileExtension(fileName) {
    return fileName.replace(/\.(jpe?g|png|webp)$/i, "").trim();
  }

  function usableStudentNames() {
    return students.length;
  }

  function remainingStudents() {
    return students.filter((student) => !selectedIds.has(student.id));
  }

  function studentById(id) {
    return students.find((student) => student.id === id) || null;
  }

  function secureRandomIndex(length) {
    if (length <= 0) {
      return -1;
    }

    if (!window.crypto || typeof window.crypto.getRandomValues !== "function") {
      return Math.floor(Math.random() * length);
    }

    const range = 0x100000000;
    const limit = range - (range % length);
    const buffer = new Uint32Array(1);

    do {
      window.crypto.getRandomValues(buffer);
    } while (buffer[0] >= limit);

    return buffer[0] % length;
  }

  function randomStudent(pool) {
    const index = secureRandomIndex(pool.length);
    return index >= 0 ? pool[index] : null;
  }

  function createSampleFace(student) {
    const face = document.createElement("div");
    face.className = "sample-face";
    face.style.setProperty("--face-a", student.faceA);
    face.style.setProperty("--face-b", student.faceB);

    const glyph = document.createElement("span");
    glyph.className = "sample-glyph";
    glyph.textContent = student.initial;

    const number = document.createElement("span");
    number.className = "sample-number";
    number.textContent = String(student.sampleIndex || 1).padStart(2, "0");

    face.append(glyph, number);
    return face;
  }

  function createPortrait(student) {
    const portrait = document.createElement("div");
    portrait.className = "student-portrait";

    if (student.imageUrl) {
      const image = document.createElement("img");
      image.src = student.imageUrl;
      image.alt = `${student.name}的照片`;
      image.draggable = false;
      image.decoding = "async";
      image.addEventListener(
        "error",
        () => {
          portrait.replaceChildren(createSampleFace(student));
          portrait.setAttribute("aria-label", student.name);
        },
        { once: true }
      );
      portrait.append(image);
    } else {
      portrait.append(createSampleFace(student));
      portrait.setAttribute("aria-label", `${student.name}的示例头像`);
    }

    return portrait;
  }

  function mountPortrait(container, student) {
    if (!student) {
      container.replaceChildren();
      return;
    }

    container.replaceChildren(createPortrait(student));
  }

  function renderScroll(student) {
    mountPortrait(elements.scrollPortrait, student);
    elements.liveName.textContent = student ? student.name : "准备好了吗？";
  }

  function renderFlip(student) {
    mountPortrait(elements.flipPortraitFront, student);
    mountPortrait(elements.flipPortraitBack, student);
    elements.flipNameFront.textContent = student ? student.name : "准备好了吗？";
    elements.flipNameBack.textContent = student ? student.name : "准备好了吗？";
  }

  function renderSlot(student, isFinal = false) {
    const pool = remainingStudents();
    const cells = [];

    if (!student) {
      elements.slotTrack.replaceChildren();
      elements.slotName.textContent = "准备好了吗？";
      return;
    }

    const others = pool.filter((candidate) => candidate.id !== student.id);
    const left = pool.length > 1 ? randomStudent(others.length ? others : pool) : student;
    const rightPool = others.filter((candidate) => candidate.id !== left.id);
    const right = pool.length > 2 ? randomStudent(rightPool.length ? rightPool : others) : left;

    if (isFinal) {
      cells.push(left, student, right);
    } else {
      for (let index = 0; index < 3; index += 1) {
        cells.push(randomStudent(pool) || student);
      }
    }

    const fragment = document.createDocumentFragment();
    cells.forEach((cellStudent) => {
      const item = document.createElement("div");
      item.className = "slot-item";
      item.append(createPortrait(cellStudent));

      const name = document.createElement("span");
      name.textContent = cellStudent.name;
      item.append(name);
      fragment.append(item);
    });

    elements.slotTrack.replaceChildren(fragment);
    elements.slotName.textContent = isFinal ? student.name : cells[1].name;
  }

  function renderForMode(student, isFinal = false) {
    if (presentationMode === "scroll") {
      renderScroll(student);
    } else if (presentationMode === "flip") {
      renderFlip(student);
    } else {
      renderSlot(student, isFinal);
    }
  }

  function renderModes() {
    elements.scrollView.hidden = presentationMode !== "scroll";
    elements.flipView.hidden = presentationMode !== "flip";
    elements.slotView.hidden = presentationMode !== "slot";

    elements.visualFrame.classList.remove("mode-scroll", "mode-flip", "mode-slot");
    elements.visualFrame.classList.add(`mode-${presentationMode}`);
    elements.visualFrame.dataset.mode = presentationMode;

    elements.modeButtons.forEach((button) => {
      const isActive = button.dataset.mode === presentationMode;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }

  function setPresentationMode(mode) {
    if (!["scroll", "flip", "slot"].includes(mode) || isSpinning) {
      return;
    }

    presentationMode = mode;
    renderModes();

    const previewStudent =
      (lastWinner && studentById(lastWinner.id)) || students[0] || null;
    renderForMode(previewStudent, false);
  }

  function updateFrameChrome() {
    const remaining = remainingStudents().length;
    elements.frameCounter.textContent = `POOL ${String(remaining).padStart(2, "0")}`;
    elements.frameCaption.textContent = `${sourceLabel} · ${students.length} 位`;

    if (isSpinning) {
      elements.frameState.textContent = "ROLLING";
    } else if (lastWinner) {
      elements.frameState.textContent = "SELECTED";
    } else {
      elements.frameState.textContent = "READY";
    }
  }

  function updateStats() {
    const total = usableStudentNames();
    const drawn = selectedOrder.length;
    const remaining = Math.max(total - drawn, 0);
    const progress = total > 0 ? (drawn / total) * 100 : 0;

    elements.remainingCount.textContent = String(remaining);
    elements.drawnCount.textContent = String(drawn);
    elements.totalCount.textContent = String(total);
    elements.roundProgress.style.width = `${progress}%`;
    elements.rosterCount.textContent = String(total);
    elements.rosterSource.textContent = sourceLabel;

    if (remaining === 0 && total > 0) {
      elements.poolHint.textContent = "本轮已经抽完，可以重置一轮";
    } else if (drawn === 0) {
      elements.poolHint.textContent = "全班都在待抽池中";
    } else {
      elements.poolHint.textContent = `还有 ${remaining} 位同学等待被叫到`;
    }

    updateFrameChrome();
  }

  function updateControls() {
    const remaining = remainingStudents().length;
    const total = usableStudentNames();

    elements.drawButton.classList.toggle("is-spinning", isSpinning);
    elements.drawButton.classList.toggle("is-empty", !isSpinning && remaining === 0);
    elements.drawButton.disabled = !isSpinning && remaining === 0;
    elements.resetButton.disabled = isSpinning || selectedOrder.length === 0;

    elements.modeButtons.forEach((button) => {
      button.disabled = isSpinning;
    });

    if (isSpinning) {
      elements.drawButtonLabel.textContent = "停！";
      elements.actionHint.textContent = "再次按下按钮，定格本轮结果";
      return;
    }

    if (remaining === 0) {
      elements.drawButtonLabel.textContent = "本轮抽完";
      elements.actionHint.textContent = total > 0 ? "重置一轮后，全班重新进入待抽池" : "请选择班级文件夹";
      return;
    }

    elements.drawButtonLabel.textContent = selectedOrder.length > 0 ? "再抽一位" : "开始点名";
    elements.actionHint.textContent =
      selectedOrder.length > 0
        ? `还有 ${remaining} 位同学可以抽选`
        : `按下按钮，从 ${total} 位同学中随机选择`;
  }

  function renderRoster() {
    const fragment = document.createDocumentFragment();

    students.forEach((student) => {
      const item = document.createElement("div");
      item.className = "roster-person";
      item.classList.toggle("is-drawn", selectedIds.has(student.id));
      item.setAttribute(
        "aria-label",
        `${student.name}${selectedIds.has(student.id) ? "，本轮已抽中" : ""}`
      );

      const avatar = document.createElement("div");
      avatar.className = "roster-avatar";
      avatar.append(createPortrait(student));

      const name = document.createElement("span");
      name.textContent = student.name;

      item.append(avatar, name);
      fragment.append(item);
    });

    elements.roster.replaceChildren(fragment);
  }

  function renderHistory() {
    elements.historyCount.textContent = String(selectedOrder.length);
    elements.historyList.replaceChildren();

    if (selectedOrder.length === 0) {
      const empty = document.createElement("p");
      empty.className = "history-empty";
      empty.textContent = "还没有抽选结果";
      elements.historyList.append(empty);
      return;
    }

    const recentIds = selectedOrder.slice(-8).reverse();
    const fragment = document.createDocumentFragment();

    recentIds.forEach((id) => {
      const student = studentById(id);
      if (!student) {
        return;
      }

      const drawNumber = selectedOrder.indexOf(id) + 1;
      const item = document.createElement("div");
      item.className = "history-item";

      const avatar = document.createElement("div");
      avatar.className = "history-avatar";
      avatar.append(createPortrait(student));

      const name = document.createElement("span");
      name.className = "history-name";
      name.textContent = student.name;

      const index = document.createElement("span");
      index.className = "history-index";
      index.textContent = `NO.${String(drawNumber).padStart(2, "0")}`;

      item.append(avatar, name, index);
      fragment.append(item);
    });

    elements.historyList.append(fragment);
  }

  function renderAll() {
    renderModes();
    renderRoster();
    renderHistory();
    updateStats();
    updateControls();

    const previewStudent =
      (lastWinner && studentById(lastWinner.id)) || students[0] || null;
    renderForMode(previewStudent, false);
  }

  function tickRoll() {
    const pool = remainingStudents();
    const previewStudent = randomStudent(pool);

    if (!previewStudent) {
      return;
    }

    tickCount += 1;
    elements.frameState.textContent = "ROLLING";
    renderForMode(previewStudent, false);
  }

  function startRoll() {
    if (isSpinning || winnerIsOpen) {
      return;
    }

    if (remainingStudents().length === 0) {
      updateControls();
      return;
    }

    closeWinner(false);
    isSpinning = true;
    tickCount = 0;
    elements.visualFrame.classList.add("is-spinning");
    elements.visualFrame.classList.remove("is-settling");
    updateControls();
    updateFrameChrome();
    tickRoll();
    rollTimer = window.setInterval(tickRoll, ROLL_INTERVAL);
  }

  function stopRoll() {
    if (!isSpinning) {
      return;
    }

    window.clearInterval(rollTimer);
    rollTimer = null;
    isSpinning = false;
    elements.visualFrame.classList.remove("is-spinning");

    const winner = randomStudent(remainingStudents());
    if (!winner) {
      updateControls();
      return;
    }

    selectedIds.add(winner.id);
    selectedOrder.push(winner.id);
    lastWinner = winner;

    renderForMode(winner, true);
    elements.visualFrame.classList.add("is-settling");
    window.setTimeout(() => elements.visualFrame.classList.remove("is-settling"), 700);

    updateStats();
    updateControls();
    renderRoster();
    renderHistory();
    openWinner(winner);
  }

  function buildConfetti() {
    const colors = ["#ff6b2c", "#f5f1e8", "#92d96e", "#f2c14e", "#6e9fff", "#e986b4"];
    const fragment = document.createDocumentFragment();

    elements.confetti.replaceChildren();

    for (let index = 0; index < 26; index += 1) {
      const piece = document.createElement("span");
      piece.className = "confetti-piece";
      piece.style.setProperty("--x", `${3 + Math.random() * 94}%`);
      piece.style.setProperty("--w", `${5 + Math.random() * 8}px`);
      piece.style.setProperty("--h", `${12 + Math.random() * 18}px`);
      piece.style.setProperty("--color", colors[index % colors.length]);
      piece.style.setProperty("--drift", `${-80 + Math.random() * 160}px`);
      piece.style.setProperty("--spin", `${360 + Math.random() * 720}deg`);
      piece.style.setProperty("--duration", `${2.4 + Math.random() * 2.4}s`);
      piece.style.setProperty("--delay", `${Math.random() * 1.4}s`);
      fragment.append(piece);
    }

    elements.confetti.append(fragment);
  }

  function openWinner(winner) {
    window.clearTimeout(overlayCloseTimer);
    buildConfetti();
    mountPortrait(elements.winnerPortrait, winner);
    elements.winnerName.textContent = winner.name;
    elements.winnerOrder.textContent = `NO. ${String(selectedOrder.length).padStart(2, "0")}`;

    const remaining = remainingStudents().length;
    elements.winnerMeta.textContent =
      remaining > 0
        ? `本轮第 ${selectedOrder.length} 位 · 还有 ${remaining} 位同学待抽`
        : `本轮第 ${selectedOrder.length} 位 · 本轮全部抽完`;
    elements.continueButton.querySelector("span").textContent =
      remaining > 0 ? "继续点名" : "完成本轮";

    lastFocusedElement = document.activeElement;
    winnerIsOpen = true;
    elements.winnerOverlay.hidden = false;
    elements.winnerOverlay.setAttribute("aria-hidden", "false");

    window.requestAnimationFrame(() => {
      elements.winnerOverlay.classList.add("is-visible");
      elements.winnerName.focus({ preventScroll: true });
    });
  }

  function closeWinner(restoreFocus = true) {
    if (elements.winnerOverlay.hidden) {
      winnerIsOpen = false;
      return;
    }

    winnerIsOpen = false;
    elements.winnerOverlay.classList.remove("is-visible");
    elements.winnerOverlay.setAttribute("aria-hidden", "true");
    window.clearTimeout(overlayCloseTimer);
    overlayCloseTimer = window.setTimeout(() => {
      elements.winnerOverlay.hidden = true;
    }, 230);

    if (restoreFocus) {
      window.setTimeout(() => {
        if (remainingStudents().length > 0) {
          elements.drawButton.focus({ preventScroll: true });
        } else {
          elements.resetButton.focus({ preventScroll: true });
        }
      }, 250);
    } else if (lastFocusedElement instanceof HTMLElement) {
      lastFocusedElement.focus({ preventScroll: true });
    }
  }

  function resetRound() {
    if (isSpinning) {
      return;
    }

    selectedIds = new Set();
    selectedOrder = [];
    lastWinner = null;
    elements.visualFrame.classList.remove("is-settling");
    closeWinner(false);
    renderAll();
  }

  function revokeObjectUrls() {
    objectUrls.forEach((url) => URL.revokeObjectURL(url));
    objectUrls = [];
  }

  function handleFolderSelection(fileList) {
    const files = [...fileList].filter((file) => IMAGE_EXTENSION.test(file.name));
    elements.folderInput.value = "";
    elements.loadState.classList.remove("is-error");

    if (files.length === 0) {
      elements.loadState.classList.add("is-error");
      elements.loadStatus.textContent = "未找到 JPG、PNG 或 WebP 图片";
      return;
    }

    revokeObjectUrls();

    const importedStudents = files
      .map((file, index) => {
        const name = removeFileExtension(file.name) || `未命名同学${index + 1}`;
        const palette = getFilePalette(index);
        const imageUrl = URL.createObjectURL(file);
        objectUrls.push(imageUrl);

        return {
          id: `file-${Date.now()}-${index}`,
          name,
          initial: getInitial(name),
          imageUrl,
          faceA: palette[0],
          faceB: palette[1],
          sampleIndex: index + 1
        };
      })
      .sort((left, right) =>
        left.name.localeCompare(right.name, "zh-CN", {
          numeric: true,
          sensitivity: "base"
        })
      );

    students = importedStudents;
    sourceLabel = "班级文件夹";
    selectedIds = new Set();
    selectedOrder = [];
    lastWinner = null;
    elements.loadStatus.textContent = `已加载 ${students.length} 位同学`;
    renderAll();
  }

  elements.folderButton.addEventListener("click", () => {
    elements.folderInput.click();
  });

  elements.folderInput.addEventListener("change", (event) => {
    handleFolderSelection(event.target.files);
  });

  elements.modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setPresentationMode(button.dataset.mode);
    });
  });

  elements.drawButton.addEventListener("click", () => {
    if (isSpinning) {
      stopRoll();
    } else {
      startRoll();
    }
  });

  elements.resetButton.addEventListener("click", resetRound);
  elements.continueButton.addEventListener("click", () => closeWinner(true));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && winnerIsOpen) {
      event.preventDefault();
      closeWinner(true);
    }
  });

  window.addEventListener("beforeunload", () => {
    window.clearInterval(rollTimer);
    window.clearTimeout(overlayCloseTimer);
    revokeObjectUrls();
  });

  renderAll();
})();
