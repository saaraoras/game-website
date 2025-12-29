(() => {
  "use strict";

  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // 1) Never allow “reveal” to hide content
  const forceVisible = () => {
    qsa(".reveal").forEach((el) => el.classList.add("visible"));
  };

  // 2) Mobile nav (safe)
  const setupNav = () => {
    const toggle = qs(".nav-toggle");
    const nav = qs(".main-nav");
    if (!toggle || !nav) return;

    toggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    qsa("a", nav).forEach((a) => {
      a.addEventListener("click", () => {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  };

  // 3) Teaser modal (optional)
  const setupTeaserModal = () => {
    const modal = qs("#teaserModal");
    if (!modal) return;

    const openers = qsa('[data-open="teaser"]');
    const closers = qsa("[data-close]");

    const open = () => {
      modal.classList.add("open");
      modal.setAttribute("aria-hidden", "false");
    };
    const close = () => {
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
    };

    openers.forEach((b) => b.addEventListener("click", open));
    closers.forEach((b) => b.addEventListener("click", close));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });
  };

  // Helper: fetch to detect 404 vs ok (Live Server required)
  const probeUrl = async (url) => {
    try {
      const r = await fetch(url, { method: "GET", cache: "no-store" });
      return { ok: r.ok, status: r.status };
    } catch (_) {
      return { ok: false, status: 0 };
    }
  };

  // 4) 3D orb init (clean paths)
  const init3DOrb = async () => {
    const orb = qs("#heroOrb") || qs(".hero-art");
    const mv = qs("#heroModel") || qs("model-viewer.hero-model") || qs("model-viewer");
    const statusEl = qs("#modelStatus") || (orb ? qs(".model-status", orb) : null);
    const fallback = qs("#fallbackImg") || qs(".hero-fallback");

    if (!orb || !mv || !statusEl) return;

    // Make sure fallback points to the clean PNG path
    if (fallback && !fallback.getAttribute("src")) {
      fallback.setAttribute("src", "./assets/images/character.png");
    }

    // Check if <model-viewer> is registered (script loaded)
    let defined = false;
    try {
      await Promise.race([
        customElements.whenDefined("model-viewer").then(() => { defined = true; }),
        wait(2500)
      ]);
    } catch (_) {}

    if (!defined) {
      statusEl.textContent = "3D VIEWER NOT LOADED (script blocked/offline)";
      return;
    }

    // Clean GLB path (what you said you switched to)
    const glbPath = "./assets/models/character.glb";

    // Probe the GLB so we know if it’s 404
    statusEl.textContent = "Checking GLB path…";
    const check = await probeUrl(glbPath);

    if (!check.ok) {
      statusEl.textContent = `GLB NOT FOUND (${check.status || "no server"}) — ${glbPath}`;
      return;
    }

    // Try to load the model
    statusEl.textContent = "Loading 3D model…";
    mv.setAttribute("src", glbPath);

    // Ensure these defaults (helps with “loaded but invisible”)
    mv.setAttribute("environment-image", "neutral");
    mv.setAttribute("shadow-intensity", "0");
    mv.setAttribute("exposure", "1.25");
    mv.setAttribute("camera-orbit", "35deg 75deg 105%");
    mv.setAttribute("camera-target", "0m 1m 0m");
    mv.setAttribute("field-of-view", "30deg");

    mv.addEventListener("load", () => {
      statusEl.remove();
      orb.classList.add("model-ready"); // your CSS fades PNG if you set it up
      if (fallback) fallback.style.opacity = "0";
    }, { once: true });

    mv.addEventListener("error", () => {
      statusEl.textContent = "GLB FOUND BUT FAILED TO PARSE (re-export GLB without compression)";
    }, { once: true });

    // Optional camera drift (won’t fight dragging)
    let dragging = false;
    mv.addEventListener("pointerdown", () => (dragging = true));
    window.addEventListener("pointerup", () => (dragging = false));

    const baseTheta = 35, basePhi = 75, radius = "105%";
    let raf = 0, nextTheta = baseTheta, nextPhi = basePhi;

    const apply = () => {
      raf = 0;
      mv.setAttribute("camera-orbit", `${nextTheta}deg ${nextPhi}deg ${radius}`);
    };

    orb.addEventListener("pointermove", (e) => {
      if (dragging) return;
      const r = orb.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width;
      const ny = (e.clientY - r.top) / r.height;

      const mx = (nx - 0.5) * 2;
      const my = (ny - 0.5) * 2;

      nextTheta = baseTheta + mx * 10;
      nextPhi = basePhi + my * 6;

      if (!raf) raf = requestAnimationFrame(apply);
    });

    orb.addEventListener("pointerleave", () => {
      if (dragging) return;
      nextTheta = baseTheta;
      nextPhi = basePhi;
      if (!raf) raf = requestAnimationFrame(apply);
    });
  };

  const boot = () => {
    forceVisible();
    setupNav();
    setupTeaserModal();
    init3DOrb();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();

