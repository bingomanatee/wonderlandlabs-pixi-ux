import { parse } from 'yaml';
import slidesYaml from './slides.yaml?raw';

const decks = loadDecks(slidesYaml);
const slides = Array.isArray(decks.ten) ? decks.ten : [];

const slidesRoot = document.getElementById('slides-root');
const deckFrame = document.querySelector('.deck-frame');
const revealRoot = document.querySelector('.reveal');
const deckCount = document.getElementById('deck-count');
const restartButton = document.getElementById('restart-button');
const notesButton = document.getElementById('notes-button');
const searchButton = document.getElementById('search-button');
const fullscreenButton = document.getElementById('fullscreen-button');
const pageTitle = document.querySelector('title');

let revealDeck = null;

function slideMarkup(slide, index, total) {
  const slideClass = slide.variant
    ? `timeboard-slide timeboard-slide--${escapeHtml(slide.variant)}`
    : 'timeboard-slide';

  const bullets = Array.isArray(slide.bullets)
    ? `<ul>${slide.bullets
        .map(item => `<li><span>${escapeHtml(item)}</span></li>`)
        .join('')}</ul>`
    : '';

  const body = slide.body
    ? `<p class="slide-body">${escapeHtml(slide.body)}</p>`
    : '';

  const notes = slide.notes
    ? `<aside class="notes">${escapeHtml(slide.notes)}</aside>`
    : '';

  return `
    <section class="${slideClass}">
      <div class="slide-grid">
        <div class="slide-copy">
          <h2>${escapeHtml(slide.title)}</h2>
          ${slide.subtitle ? `<h3>${escapeHtml(slide.subtitle)}</h3>` : ''}
          ${body}
          ${bullets}
        </div>
      </div>
      ${notes}
    </section>
  `;
}

function renderSlides() {
  slidesRoot.innerHTML = slides
    .map((slide, index) => slideMarkup(slide, index, slides.length))
    .join('');
}

async function buildDeck() {
  const previousState = revealDeck?.getState() ?? null;
  renderSlides();
  syncTitle();
  syncDeckViewport();
  revealRoot.classList.remove('is-ready');

  if (revealDeck) {
    revealDeck.destroy();
    revealDeck = null;
  }

  revealDeck = new window.Reveal(revealRoot, {
    embedded: true,
    width: 1600,
    height: 900,
    hash: true,
    controls: true,
    progress: true,
    slideNumber: false,
    fragments: false,
    transition: 'none',
    backgroundTransition: 'none',
    center: false,
    margin: 0.02,
    plugins: [window.RevealNotes, window.RevealSearch, window.RevealZoom].filter(
      Boolean
    ),
  });

  await revealDeck.initialize();
  syncDeckCount();
  revealDeck.on('slidechanged', syncDeckCount);
  syncDeckViewport();
  requestAnimationFrame(() => {
    revealDeck?.layout();
    revealRoot.classList.add('is-ready');
  });

  if (previousState) {
    revealDeck.slide(clamp(previousState.indexh ?? 0, 0, slides.length - 1));
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function loadDecks(source) {
  const parsed = parse(source);

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('slides.yaml must parse to an object');
  }

  for (const mode of ['ten', 'five']) {
    if (!Array.isArray(parsed[mode])) {
      throw new Error(`slides.yaml is missing a '${mode}' deck array`);
    }
  }

  return parsed;
}

function syncTitle() {
  pageTitle.textContent = 'Timeboard Deck';
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function syncDeckViewport() {
  const frameRect = deckFrame.getBoundingClientRect();

  if (frameRect.width <= 0 || frameRect.height <= 0) {
    return;
  }

  revealRoot.style.width = `${Math.round(frameRect.width)}px`;
  revealRoot.style.height = `${Math.round(frameRect.height)}px`;
  revealDeck?.layout();
}

function syncDeckCount() {
  if (!revealDeck || !deckCount) {
    return;
  }

  const state = revealDeck.getState();
  const slideIndex = (state.indexh ?? 0) + 1;
  const isLastSlide = slideIndex === slides.length;
  deckCount.textContent = `${slideIndex} / ${slides.length}`;
  deckFrame.classList.toggle('is-last-slide', isLastSlide);
}

notesButton.addEventListener('click', () => {
  revealDeck?.getPlugin('notes')?.open();
});

searchButton.addEventListener('click', () => {
  revealDeck?.getPlugin('search')?.toggle();
});

fullscreenButton.addEventListener('click', async () => {
  if (document.fullscreenElement) {
    await document.exitFullscreen();
    return;
  }
  await document.documentElement.requestFullscreen();
});

restartButton.addEventListener('click', () => {
  revealDeck?.slide(0);
});

document.addEventListener('fullscreenchange', () => {
  fullscreenButton.textContent = document.fullscreenElement
    ? 'Exit fullscreen'
    : 'Fullscreen';
  syncDeckViewport();
});

window.addEventListener('resize', () => {
  syncDeckViewport();
});

if ('ResizeObserver' in window) {
  new ResizeObserver(() => {
    syncDeckViewport();
  }).observe(deckFrame);
}

void buildDeck();
