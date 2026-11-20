// Small page behaviours: the install link, cards that tilt, and things that appear as you scroll.

// The app's address. Change this one line when the app moves to its own domain.
const APP_URL = "https://teamjoy-web-bxik3mpbpq-uk.a.run.app";
// "Add to Slack" is only on the welcome page that approved teams are sent.
document.querySelectorAll("[data-install]").forEach((link) => { link.href = APP_URL + "/slack/install"; });

// Counting what people do, if an analytics script is on the page (Plausible's `plausible`
// or PostHog's `posthog`). With neither, this does nothing. No names or answers are sent.
function track(event, props) {
  try {
    if (window.plausible) window.plausible(event, { props });
    else if (window.posthog) window.posthog.capture(event, props);
    else {
      // No analytics service on the page: tell Teamjoy's own app the name of what happened.
      // Nothing about the visitor is sent, and no cookie is set.
      const which = (props && (props.which || props.clip)) || "";
      const body = new Blob([JSON.stringify({ e: event, w: which })], { type: "text/plain" });
      navigator.sendBeacon(APP_URL + "/e", body);
    }
  } catch (error) { /* counting must never break the page */ }
}
// Which page was opened: "home", "privacy", "support", "pilot-terms" or "welcome".
track("view", { which: (location.pathname.split("/").pop() || "home").replace(/\.html$/, "").replace(/[^a-z0-9-]/g, "") || "home" });
document.querySelectorAll("[data-track]").forEach((el) => {
  el.addEventListener("click", () => track("click", { which: el.dataset.track }));
});
document.querySelectorAll("[data-install]").forEach((el) => {
  el.addEventListener("click", () => track("install-click"));
});

// Which outreach message brought this visitor: kept for this visit and sent with an application.
const params = new URLSearchParams(location.search);
const source = ["utm_source", "utm_medium", "utm_campaign"].map((k) => params.get(k)).filter(Boolean).join(" / ");
try { if (source) sessionStorage.setItem("tj-source", source); } catch (error) { /* private windows */ }

const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Cards lean towards the pointer.
if (!calm && window.matchMedia("(hover: hover)").matches) {
  document.querySelectorAll(".tilt").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const box = card.getBoundingClientRect();
      const x = (e.clientX - box.left) / box.width - 0.5;
      const y = (e.clientY - box.top) / box.height - 0.5;
      card.style.transform = `rotateY(${x * 14}deg) rotateX(${-y * 14}deg) translateY(-6px)`;
    });
    card.addEventListener("pointerleave", () => { card.style.transform = ""; });
  });
}

// Sections fade up, and the poll bars fill, when they come into view.
const seen = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add("in");
    entry.target.querySelectorAll(".bar i").forEach((bar) => { bar.style.width = bar.dataset.w + "%"; });
    seen.unobserve(entry.target);
  });
}, { threshold: 0.2 });
document.querySelectorAll(".reveal").forEach((el, i) => {
  el.style.transitionDelay = `${(i % 4) * 70}ms`;
  seen.observe(el);
});

// Monthly or yearly prices.
const periods = document.querySelectorAll(".billing button");
periods.forEach((button) => {
  button.addEventListener("click", () => {
    const period = button.dataset.period;
    periods.forEach((b) => {
      b.classList.toggle("on", b === button);
      b.setAttribute("aria-pressed", String(b === button));
    });
    document.querySelectorAll("[data-monthly]").forEach((el) => { el.textContent = el.dataset[period]; });
  });
});

// Forms on the site (the pilot application and the support message) are sent to the app,
// which passes them on to the Teamjoy team. No address of ours is on the page.
document.querySelectorAll("form[data-endpoint]").forEach((form) => {
  const note = form.querySelector(".form-note");
  const say = (text, kind) => { note.textContent = text; note.className = "form-note wide " + kind; };
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form));
    try { data.source = sessionStorage.getItem("tj-source") || ""; } catch (error) { data.source = ""; }
    const button = form.querySelector("button");
    button.disabled = true;
    say("Sending…", "");
    try {
      const response = await fetch(APP_URL + form.dataset.endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      const answer = await response.json().catch(() => ({}));
      if (response.ok) {
        form.classList.add("sent");
        say(form.dataset.done, "ok");
        track(form.dataset.event);
      } else {
        say(answer.message || "That didn't go through. Please check the form and try again.", "bad");
        track(form.dataset.event + "-failed");
        button.disabled = false;
      }
    } catch (error) {
      say("We couldn't reach the server. Please try again in a moment.", "bad");
      button.disabled = false;
    }
  });
});

// Menu links glide to their section. (Page-wide smooth scrolling is off: see styles.css.)
if (!calm) {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const target = document.getElementById(link.getAttribute("href").slice(1));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth" });
      history.replaceState(null, "", link.getAttribute("href"));
    });
  });
}

// How it works: choose a feature from the list and its short clip plays beside it. When a clip
// ends it is ticked off and the next one starts, so the list can also be watched straight through.
const tour = document.getElementById("tour");
if (tour) {
  const video = document.getElementById("tour-video");
  const title = document.getElementById("tour-title");
  const text = document.getElementById("tour-text");
  // What each clip is showing, by the second it starts. Shown under the player as the clip plays.
  const CAPTIONS = {
    setup: [[0, "Add to Slack, about a minute", "Install takes about a minute, from a work account."],
            [6.9, "Set up once", "Tell it who's on the team, which channel to post in, and when to stay quiet."]],
    celebrations: [[0, "You approve everything", "A birthday is coming. Teamjoy drafts the post, but nothing goes to the team until you approve it."]],
    events: [[0, "Ask in plain words", "Ask for a team dinner and it proposes dates, posts the poll once you say yes, and reminds anyone who hasn't voted."],
             [16.1, "Venues, plan, RSVPs", "It suggests places nearby, posts the plan, and tracks who's coming."]],
    games: [[0, "Games for the happy hour", "Ask for games and get ones your team can play together online, free and paid, each with a link."]],
    ideas: [[0, "It tells you what's coming", "A few weeks ahead, Teamjoy privately suggests what's worth planning. Holidays stay off until you switch them on."]],
    santa: [[0, "Secret Santa, really secret", "People join with a tap. Teamjoy draws the names and tells each person privately."],
            [10.7, "Secret Santa, really secret", "Nobody sees the list, not even the manager."]],
    gifts: [[0, "Surprise stays a surprise", "Everyone except the person it's for gets a private message with how to pay you. Teamjoy never holds the money."]],
    budget: [[0, "Budget guardrails", "Set a team budget and it warns you before a plan goes over."]],
  };
  const caption = () => {
    let line = CAPTIONS[current.dataset.clip][0];
    for (const cue of CAPTIONS[current.dataset.clip]) if (video.currentTime >= cue[0]) line = cue;
    if (title.textContent !== line[1]) title.textContent = line[1];
    if (text.textContent !== line[2]) text.textContent = line[2];
  };
  const items = [...tour.querySelectorAll(".tour-item")];
  let current = items[0], next = 0;
  const show = (item, play) => {
    clearTimeout(next);
    current = item;
    items.forEach((other) => {
      other.classList.toggle("on", other === item);
      other.setAttribute("aria-pressed", other === item ? "true" : "false");
    });
    video.poster = `assets/clips/${item.dataset.clip}.jpg?v=2`;
    video.src = `assets/clips/${item.dataset.clip}.mp4?v=2`;
    caption();
    if (play) video.play().catch(() => { /* the browser wants a tap on the player itself */ });
  };
  items.forEach((item) => {
    item.addEventListener("click", () => { show(item, true); track("tour", { clip: item.dataset.clip }); });
  });
  video.addEventListener("timeupdate", caption);
  let counted = "";
  video.addEventListener("play", () => {   // one count per clip, however often it is paused and resumed
    if (counted !== current.dataset.clip) { counted = current.dataset.clip; track("clip-play", { clip: counted }); }
  });
  video.addEventListener("ended", () => {
    current.classList.add("done");
    const after = items[items.indexOf(current) + 1];
    if (after) next = setTimeout(() => show(after, true), 900);
  });
}

