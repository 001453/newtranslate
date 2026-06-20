(function () {
  const ROOT_ID = "gb-live-caption-root";

  if (document.getElementById(ROOT_ID)) return;

  const root = document.createElement("div");
  root.id = ROOT_ID;
  root.setAttribute("aria-live", "polite");
  root.innerHTML = `
    <div class="gb-cap-box">
      <div class="gb-cap-text"></div>
      <div class="gb-cap-original"></div>
    </div>
  `;
  document.documentElement.appendChild(root);

  const textEl = root.querySelector(".gb-cap-text");
  const origEl = root.querySelector(".gb-cap-original");

  function showCaption(payload) {
    if (!payload?.translated) {
      root.classList.remove("gb-visible");
      return;
    }
    textEl.textContent = payload.translated + (payload.is_final === false ? " …" : "");
    if (payload.original && payload.original !== payload.translated) {
      origEl.textContent = payload.original;
      origEl.hidden = false;
    } else {
      origEl.textContent = "";
      origEl.hidden = true;
    }
    root.classList.add("gb-visible");
    if (payload.is_final !== false) {
      root.classList.add("gb-final");
    } else {
      root.classList.remove("gb-final");
    }
  }

  function clearCaption() {
    textEl.textContent = "";
    origEl.textContent = "";
    root.classList.remove("gb-visible", "gb-final");
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "CAPTION") showCaption(msg.payload);
    if (msg.type === "CAPTION_CLEAR") clearCaption();
  });
})();
