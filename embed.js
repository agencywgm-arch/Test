(function () {
  "use strict";

  var ORIGIN = (function () {
    var s = document.currentScript;
    if (s && s.src) {
      var url = new URL(s.src);
      return url.origin + url.pathname.replace(/\/embed\.js$/, "");
    }
    return "";
  })();

  function injectStyles() {
    if (document.getElementById("__wegemo_styles__")) return;
    var el = document.createElement("style");
    el.id = "__wegemo_styles__";
    el.textContent = [
      ".__wegemo_btn{display:inline-flex;align-items:center;gap:10px;padding:14px 26px;border:none;border-radius:50px;font-size:16px;font-weight:700;cursor:pointer;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;box-shadow:0 4px 20px rgba(0,0,0,0.18);transition:transform 0.15s,box-shadow 0.15s;text-decoration:none;}",
      ".__wegemo_btn:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(0,0,0,0.22);}",
      ".__wegemo_btn:active{transform:scale(0.97);}",
      ".__wegemo_overlay{position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:2147483647;display:flex;align-items:flex-end;justify-content:center;animation:__wegemo_fadein 0.2s ease;}",
      ".__wegemo_sheet{width:100%;max-width:480px;height:90vh;background:#fff;border-radius:24px 24px 0 0;overflow:hidden;display:flex;flex-direction:column;animation:__wegemo_slideup 0.3s cubic-bezier(0.32,0.72,0,1);}",
      ".__wegemo_handle_bar{background:#fff;display:flex;align-items:center;justify-content:space-between;padding:12px 18px 0;flex-shrink:0;}",
      ".__wegemo_close{background:rgba(0,0,0,0.07);border:none;border-radius:50%;width:32px;height:32px;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#333;}",
      ".__wegemo_iframe{flex:1;border:none;width:100%;}",
      "@keyframes __wegemo_fadein{from{opacity:0}to{opacity:1}}",
      "@keyframes __wegemo_slideup{from{transform:translateY(100%)}to{transform:translateY(0)}}",
    ].join("");
    document.head.appendChild(el);
  }

  function openModal(src, restaurantName) {
    var overlay = document.createElement("div");
    overlay.className = "__wegemo_overlay";
    overlay.innerHTML = [
      '<div class="__wegemo_sheet">',
        '<div class="__wegemo_handle_bar">',
          '<div style="width:40px;height:4px;background:#e0e0e0;border-radius:2px;margin:0 auto 4px;"></div>',
          '<span style="font-size:13px;font-weight:600;color:#888;">' + (restaurantName || "Commander") + "</span>",
          '<button class="__wegemo_close" aria-label="Fermer">✕</button>',
        "</div>",
        '<iframe class="__wegemo_iframe" src="' + src + '" allow="payment" loading="lazy"></iframe>',
      "</div>",
    ].join("");

    overlay.querySelector(".__wegemo_close").onclick = function () {
      overlay.remove();
    };
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) overlay.remove();
    });
    document.addEventListener("keydown", function esc(e) {
      if (e.key === "Escape") { overlay.remove(); document.removeEventListener("keydown", esc); }
    });
    document.body.appendChild(overlay);
  }

  function init() {
    injectStyles();
    var containers = document.querySelectorAll("[data-wegemo]");
    containers.forEach(function (el) {
      var rid = el.getAttribute("data-wegemo");
      if (!rid) return;
      var table   = el.getAttribute("data-table") || "0";
      var label   = el.getAttribute("data-label") || "🛒 Commander";
      var color   = el.getAttribute("data-color") || "#1D1D1F";
      var txtColor= el.getAttribute("data-text-color") || "#ffffff";
      var name    = el.getAttribute("data-name") || "";
      var src = ORIGIN + "/r/" + rid + "/t/" + table;

      var btn = document.createElement("button");
      btn.className = "__wegemo_btn";
      btn.style.background = color;
      btn.style.color = txtColor;
      btn.textContent = label;
      btn.onclick = function () { openModal(src, name); };
      el.appendChild(btn);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
