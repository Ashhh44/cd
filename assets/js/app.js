document.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});

document.addEventListener("dragstart", (event) => {
  if (event.target instanceof HTMLImageElement) {
    event.preventDefault();
  }
});

(function () {
  "use strict";

  const config = window.INVITATION_CONFIG;

  if (!config) {
    throw new Error("Invitation config was not loaded. Check assets/js/config.js.");
  }

  const select = (selector, root = document) => root.querySelector(selector);
  const selectAll = (selector, root = document) => [...root.querySelectorAll(selector)];

  function getValue(path) {
    return path.split(".").reduce((value, key) => value?.[key], config);
  }

  function createElement(tagName, className, text) {
    const element = document.createElement(tagName);

    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;

    return element;
  }

  function setName(element, fullName) {
    if (!element) return;
    const formattedName = fullName.replace(/\n/g, "<br>");
    element.innerHTML = formattedName;
  }

  function setCoupleNames(element) {
    if (!element) return;
    element.replaceChildren(
      document.createTextNode("Enas"),
      document.createTextNode(" "),
      createElement("span", "", "&"),
      document.createTextNode(" "),
      document.createTextNode(config.couple.groom.shortName || "Ahrar"),
    );
  }

  function applyConfig() {
    document.title = config.site.title;

    const description = select('meta[name="description"]');
    const ogTitle = select('meta[property="og:title"]');
    const ogDescription = select('meta[property="og:description"]');

    description?.setAttribute("content", config.site.description);
    ogTitle?.setAttribute("content", config.site.title);
    ogDescription?.setAttribute("content", config.site.description);

    const root = document.documentElement;

    Object.entries(config.theme).forEach(([name, value]) => {
      root.style.setProperty(`--${name}`, value);
    });

    selectAll("[data-bind]").forEach((element) => {
      const value = getValue(element.dataset.bind);
      element.textContent = value ?? "";
    });

    setName(select("#brideName"), config.couple.bride.name);
    setName(select("#groomName"), config.couple.groom.name);
    setCoupleNames(select("#welcomeSignature"));
    setCoupleNames(select("#closingNames"));

    const closingDetails = select("#closingDetails");
    if (closingDetails) {
      closingDetails.textContent = `${config.wedding.date} · ${config.venue.name}`;
    }

    const mapLink = select("#mapLink");
    if (mapLink) mapLink.href = config.venue.mapUrl;

    const audio = select("#backgroundMusic");
    const video = select("#introVideo");
    const videoSource = select("#introVideoSource");

    if (audio) audio.src = config.media.music;
    if (video && videoSource) {
      video.poster = config.media.introPoster;
      videoSource.src = config.media.introVideo;
      video.load();
    }

    renderGallery();
  }

  let activeSlide = 0;
  let galleryTimer;
  let touchStartX = 0;
  let touchStartY = 0;

  function renderGallery() {
    const slides = select("#gallerySlides");
    const dots = select("#galleryDots");
    if (!slides || !dots) return;

    config.media.gallery.forEach((image, index) => {
      const figure = createElement(
        "figure",
        `gallery-slide${index === 0 ? " is-active" : ""}`,
      );

      const photo = createElement("img");

      photo.src = image.src;
      photo.alt = image.alt;
      photo.loading = index === 0 ? "eager" : "lazy";

      figure.append(
        photo,
        createElement("figcaption", "", image.caption)
      );

      slides.append(figure);

      const dot = createElement(
        "button",
        index === 0 ? "is-active" : ""
      );

      dot.type = "button";
      dot.setAttribute("aria-label", `Show image ${index + 1}`);
      dot.addEventListener("click", () => showSlide(index));

      dots.append(dot);
    });

    const frame = select("#galleryFrame");
    if (!frame) return;

    frame.addEventListener("pointerdown", (event) => {
      touchStartX = event.clientX;
      touchStartY = event.clientY;
    });

    frame.addEventListener("pointerup", (event) => {
      const distanceX = touchStartX - event.clientX;
      const distanceY = touchStartY - event.clientY;

  
      if (Math.abs(distanceX) >= 45) {
        showSlide(
          distanceX > 0
            ? (activeSlide + 1) % config.media.gallery.length
            : (activeSlide - 1 + config.media.gallery.length) %
                config.media.gallery.length
        );

        return;
      }


      if (Math.abs(distanceY) > 20) return;


      showSlide(
        (activeSlide + 1) % config.media.gallery.length
      );
    });

    galleryTimer = window.setInterval(() => {
      showSlide(
        (activeSlide + 1) % config.media.gallery.length
      );
    }, 5200);
  }

  function showSlide(index) {
    activeSlide = index;

    selectAll(".gallery-slide").forEach((slide, slideIndex) => {
      slide.classList.toggle(
        "is-active",
        slideIndex === index
      );
    });

    selectAll("#galleryDots button").forEach((dot, dotIndex) => {
      dot.classList.toggle(
        "is-active",
        dotIndex === index
      );

      dot.toggleAttribute(
        "aria-current",
        dotIndex === index
      );
    });
  } 

  function updateMusicControl() {
    const audio = select("#backgroundMusic");
    const button = select("#musicToggle");
    const label = select("#musicLabel");
    if (!audio || !button) return;

    const playing = !audio.paused;

    button.classList.toggle("is-playing", playing);
    button.setAttribute(
      "aria-label",
      playing ? "Pause background music" : "Play background music",
    );
    if (label) label.textContent = playing ? "Music" : "Music";
  }

  function initializeOpening() {
    const hero = select("#hero");
    const video = select("#introVideo");
    if (!hero) return;
    let opened = false;

    function openInvitation() {
      if (opened) return;

      opened = true;
      hero.classList.remove("is-closed");
      hero.classList.add("is-open");
      hero.removeAttribute("role");
      hero.removeAttribute("aria-label");
      hero.tabIndex = -1;
      select("#openingMark")?.setAttribute("aria-hidden", "true");
      document.body.classList.remove("intro-locked");
      if (video) video.play().catch(() => undefined);
      const audio = select("#backgroundMusic");

      if (audio) {
        audio.play()
          .then(updateMusicControl)
          .catch(updateMusicControl);
      }
    }

    hero.addEventListener("click", openInvitation);
    hero.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") openInvitation();
    });

    select(".scroll-cue")?.addEventListener("click", (event) => {
      event.stopPropagation();
    });
  }

  function initializeMusic() {
    const audio = select("#backgroundMusic");
    const button = select("#musicToggle");
    if (!audio || !button) return;

    button.addEventListener("click", async (event) => {
      event.stopPropagation();

      if (audio.paused) {
        try {
          await audio.play();
        } catch {

        }
      } else {
        audio.pause();
      }

      updateMusicControl();
    });

    audio.addEventListener("play", updateMusicControl);
    audio.addEventListener("pause", updateMusicControl);

    updateMusicControl();
  }

  function initializeRevealAnimations() {
    const revealElements = selectAll(".reveal");

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      revealElements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.13 },
    );

    revealElements.forEach((element) => observer.observe(element));
  }

  function initializeScratchCard() {
    const canvas = select("#scratchCanvas");
    const card = select("#scratchCard");
    const heading = select("#scratchHeading");
    const note = select("#scratchNote");
    if (!canvas || !card) return;

    let drawing = false;
    let revealed = false;

    function prepareCanvas() {
      if (revealed || !canvas.isConnected) return;

      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const context = canvas.getContext("2d", {
        willReadFrequently: true,
      });

      canvas.width = Math.round(rect.width * ratio);
      canvas.height = Math.round(rect.height * ratio);

      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      const width = rect.width;
      const height = rect.height;

     
      const gradient = context.createLinearGradient(0, 0, width, height);

      gradient.addColorStop(0, config.theme.plum);
      gradient.addColorStop(0.45, config.theme.lavender);
      gradient.addColorStop(0.72, config.theme.mauve);
      gradient.addColorStop(1, config.theme.plum);

      context.globalCompositeOperation = "source-over";
      context.globalAlpha = 1;

      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);


      const shimmer = context.createLinearGradient(0, 0, width, height);

      shimmer.addColorStop(0, "rgba(255,255,255,0)");
      shimmer.addColorStop(0.35, "rgba(255,235,190,0.07)");
      shimmer.addColorStop(0.5, "rgba(255,255,255,0.13)");
      shimmer.addColorStop(0.65, "rgba(255,220,160,0.06)");
      shimmer.addColorStop(1, "rgba(255,255,255,0)");

      context.fillStyle = shimmer;
      context.fillRect(0, 0, width, height);


      const glitterCount = Math.min(
        1100,
        Math.round((width * height) / 120),
      );

      for (let i = 0; i < glitterCount; i += 1) {
        const x = Math.random() * width;
        const y = Math.random() * height;

        const size = 0.25 + Math.random() * 1.15;
        const brightness = 0.15 + Math.random() * 0.55;

        context.globalAlpha = brightness;

        context.fillStyle =
          Math.random() > 0.18
            ? config.theme.champagne
            : config.theme.ivory;

        context.beginPath();
        context.arc(x, y, size, 0, Math.PI * 2);
        context.fill();
      }


      const sparkleCount = Math.max(
        20,
        Math.round(width / 12),
      );

      for (let i = 0; i < sparkleCount; i += 1) {
        const x = Math.random() * width;
        const y = Math.random() * height;

        const size = 1 + Math.random() * 2.1;

        context.globalAlpha = 0.3 + Math.random() * 0.5;

        context.strokeStyle =
          Math.random() > 0.25
            ? config.theme.champagne
            : config.theme.ivory;

        context.lineWidth = 0.55;

        context.beginPath();
        context.moveTo(x - size, y);
        context.lineTo(x + size, y);
        context.moveTo(x, y - size);
        context.lineTo(x, y + size);
        context.stroke();
      }


      for (let i = 0; i < 350; i += 1) {
        const x = Math.random() * width;
        const y = Math.random() * height;

        context.globalAlpha = 0.06 + Math.random() * 0.1;
        context.fillStyle = config.theme.ivory;

        context.fillRect(
          x,
          y,
          Math.random() * 0.7 + 0.15,
          Math.random() * 0.7 + 0.15,
        );
      }

      context.globalAlpha = 1;


      context.globalCompositeOperation = "destination-out";
      context.lineCap = "round";
      context.lineJoin = "round";
      context.lineWidth = 42;
    }

    function pointerPosition(event) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    }

    function beginScratch(event) {
      if (revealed) return;

      drawing = true;
      canvas.setPointerCapture(event.pointerId);

      const position = pointerPosition(event);
      const context = canvas.getContext("2d", { willReadFrequently: true });

      context.beginPath();
      context.moveTo(position.x, position.y);
    }

    function continueScratch(event) {
      if (!drawing || revealed) return;

      const position = pointerPosition(event);
      const context = canvas.getContext("2d", { willReadFrequently: true });

      context.lineTo(position.x, position.y);
      context.stroke();

      if (scratchCompletion(context) > 0.42) finishReveal();
    }

    function scratchCompletion(context) {
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let transparentSamples = 0;
      let totalSamples = 0;

      for (let alphaIndex = 3; alphaIndex < pixels.length; alphaIndex += 64) {
        totalSamples += 1;
        if (pixels[alphaIndex] < 30) transparentSamples += 1;
      }

      return transparentSamples / totalSamples;
    }

    function finishReveal() {
      if (revealed) return;

      revealed = true;
      drawing = false;

      card.classList.add("is-revealed", "is-visible");
      if (heading) heading.textContent = "Our forever begins";
      if (note) {
        note.textContent =
          "Save the date — we would be honoured to have you with us.";
      }
      canvas.remove();
      createPetalShower();
    }

    canvas.addEventListener("pointerdown", beginScratch);
    canvas.addEventListener("pointermove", continueScratch);
    canvas.addEventListener("pointerup", () => {
      drawing = false;
    });
    canvas.addEventListener("pointercancel", () => {
      drawing = false;
    });
    canvas.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") finishReveal();
    });

    prepareCanvas();
    window.addEventListener("resize", prepareCanvas);
  }

  function createPetalShower() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    document.querySelector(".petal-shower")?.remove();

    const shower = createElement("div", "petal-shower");
    shower.setAttribute("aria-hidden", "true");

    const rootStyles = getComputedStyle(document.documentElement);

    const mauve = rootStyles.getPropertyValue("--mauve").trim() || "#A51520";
    const lavender = rootStyles.getPropertyValue("--lavender").trim() || "#6F0B17";
    const champagne = rootStyles.getPropertyValue("--champagne").trim() || "#C9A35F";

    const colors = [mauve, lavender, mauve, lavender, mauve, champagne];
    const shapes = [
      "80% 20% 70% 30% / 65% 35% 65% 35%",
      "70% 30% 85% 15% / 55% 45% 70% 30%",
      "90% 10% 60% 40% / 70% 30% 80% 20%",
      "60% 40% 75% 25% / 80% 20% 60% 40%",
    ];

    const random = (min, max) => Math.random() * (max - min) + min;
    const randomItem = (items) => items[Math.floor(Math.random() * items.length)];

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const petalCount = Math.min(
      60,
      Math.max(38, Math.round(viewportWidth / 9)),
    );

    const petals = [];

    for (let index = 0; index < petalCount; index += 1) {
      const element = createElement("i");
      const size = random(7, 14);
      const x = random(-25, viewportWidth + 25);
      const y = random(-100, -25);
      const rotation = random(0, 360);
      const rotationX = random(0, 360);
      const rotationY = random(0, 360);
      const scale = random(0.65, 1.2);

      element.style.width = `${size}px`;
      element.style.height = `${size * random(1.2, 1.7)}px`;
      element.style.background = randomItem(colors);
      element.style.borderRadius = randomItem(shapes);
      element.style.opacity = "0";
      element.style.transform = `
        translate3d(${x}px, ${y}px, 0)
        rotate(${rotation}deg)
        rotateX(${rotationX}deg)
        rotateY(${rotationY}deg)
        scale(${scale})
      `;

      shower.append(element);

      petals.push({
        element,
        x,
        y,
        vx: random(-30, 30),
        vy: random(65, 120),
        gravity: random(12, 26),
        wind: random(-8, 8),
        sway: random(15, 55),
        swaySpeed: random(1.4, 3.5),
        swayPhase: random(0, Math.PI * 2),
        rotation,
        rotationX,
        rotationY,
        spin: random(-220, 220),
        spinX: random(-190, 190),
        spinY: random(-260, 260),
        scale,
        baseOpacity: random(0.55, 0.9),
        delay: random(0, 700),
        lifetime: random(5800, 8600),
      });
    }

    document.body.append(shower);

    let startTime = null;
    let previousTime = null;

    function animate(currentTime) {
      if (startTime === null) {
        startTime = currentTime;
        previousTime = currentTime;
      }

      const elapsed = currentTime - startTime;
      const delta = Math.min((currentTime - previousTime) / 1000, 0.032);
      previousTime = currentTime;

      petals.forEach((petal) => {
        if (elapsed < petal.delay) {
          petal.element.style.opacity = "0";
          return;
        }

        const age = elapsed - petal.delay;
        if (age >= petal.lifetime) {
          petal.element.style.display = "none";
          return;
        }

        const time = age / 1000;

        petal.vy += petal.gravity * delta;
        petal.vx += Math.sin(time * 0.75 + petal.swayPhase) * petal.wind * delta;

        petal.x += petal.vx * delta;
        petal.y += petal.vy * delta;

        petal.rotation += petal.spin * delta;
        petal.rotationX += petal.spinX * delta;
        petal.rotationY += petal.spinY * delta;

        const sway = Math.sin(time * petal.swaySpeed + petal.swayPhase) * petal.sway;
        const flutterY = Math.sin(time * petal.swaySpeed * 2.2 + petal.swayPhase) * 5;
        const flip = 0.35 + Math.abs(Math.cos(time * petal.swaySpeed * 1.8 + petal.swayPhase)) * 0.65;

        const fadeInDuration = 250;
        let opacity = petal.baseOpacity * Math.min(1, age / fadeInDuration);
        const fadeStart = viewportHeight * 0.82;

        if (petal.y > fadeStart) {
          const bottomFade = 1 - (petal.y - fadeStart) / (viewportHeight + 100 - fadeStart);
          opacity *= Math.max(0, bottomFade);
        }

        if (age > petal.lifetime * 0.82) {
          const lifeFade = 1 - (age - petal.lifetime * 0.82) / (petal.lifetime * 0.18);
          opacity *= Math.max(0, lifeFade);
        }

        petal.element.style.opacity = Math.max(0, opacity);
        petal.element.style.transform = `
          translate3d(${petal.x + sway}px, ${petal.y + flutterY}px, 0)
          rotate(${petal.rotation}deg)
          rotateX(${petal.rotationX}deg)
          rotateY(${petal.rotationY}deg)
          scale(${petal.scale})
          scaleX(${flip})
        `;

        if (petal.y > viewportHeight + 120) {
          petal.element.style.display = "none";
        }
      });

      if (elapsed < 10000) {
        requestAnimationFrame(animate);
      } else {
        shower.remove();
      }
    }

    requestAnimationFrame(animate);
  }

  function initializeCountdown() {
    const targetDate = new Date(config.wedding.isoDate).getTime();

    function updateCountdown() {
      const difference = Math.max(0, targetDate - Date.now());
      const values = {
        countdownDays: Math.floor(difference / 86400000),
        countdownHours: Math.floor((difference / 3600000) % 24),
        countdownMinutes: Math.floor((difference / 60000) % 60),
        countdownSeconds: Math.floor((difference / 1000) % 60),
      };

      Object.entries(values).forEach(([id, value]) => {
        const el = select(`#${id}`);
        if (el) el.textContent = String(value).padStart(2, "0");
      });
    }

    updateCountdown();
    window.setInterval(updateCountdown, 1000);
  }

  function initialize() {
    applyConfig();
    initializeOpening();
    initializeMusic();
    initializeRevealAnimations();
    initializeScratchCard();
    initializeCountdown();
  }

  document.addEventListener("DOMContentLoaded", initialize);
})();
