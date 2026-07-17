(function () {
  // Cache of path -> { htmlText, mainElement, tocElement, title }
  const pageCache = new Map();
  let isTransitioning = false;
  let scrollCooldown = false;

  // Initialize current page in cache
  const currentPath = window.location.pathname;
  const currentMain = document.querySelector('main');
  const currentToc = document.querySelector('starlight-toc');
  if (currentMain) {
    pageCache.set(currentPath, {
      htmlText: document.documentElement.outerHTML,
      mainElement: currentMain.cloneNode(true),
      tocElement: currentToc ? currentToc.cloneNode(true) : null,
      title: document.title
    });
  }

  // Pre-fetch a URL and store it in cache
  async function prefetch(url) {
    if (pageCache.has(url)) return;
    try {
      const response = await fetch(url);
      if (!response.ok) return;
      const htmlText = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');
      const mainElement = doc.querySelector('main');
      const tocElement = doc.querySelector('starlight-toc');
      const title = doc.title;

      if (mainElement) {
        pageCache.set(url, { htmlText, mainElement, tocElement, title });
      }
    } catch (e) {
      console.warn('Failed to pre-fetch page:', url, e);
    }
  }

  // Perform SPA-like page transition
  async function transitionToPage(url, pushState = true) {
    if (isTransitioning) return;
    isTransitioning = true;

    // 1. Ensure page is in cache (or fetch if not cached)
    let pageData = pageCache.get(url);
    if (!pageData) {
      await prefetch(url);
      pageData = pageCache.get(url);
    }

    if (!pageData || !pageData.mainElement) {
      // Fallback: standard navigation if loading fails
      window.location.href = url;
      return;
    }

    const currentMainEl = document.querySelector('main');
    if (!currentMainEl) {
      window.location.href = url;
      return;
    }

    // 2. Animate out current content
    currentMainEl.classList.add('page-transition-fade');
    await new Promise(resolve => setTimeout(resolve, 200));

    // 3. Update DOM content & attributes
    currentMainEl.innerHTML = pageData.mainElement.innerHTML;
    // Copy all attributes from cached main to current main
    for (const attr of pageData.mainElement.attributes) {
      currentMainEl.setAttribute(attr.name, attr.value);
    }

    // Reset scroll to top
    window.scrollTo({ top: 0, behavior: 'instant' });

    // 4. Update Document Title
    document.title = pageData.title;

    // 5. Update browser history
    if (pushState) {
      history.pushState(null, '', url);
    }

    // 6. Sync Left Sidebar
    syncSidebar(url);

    // 7. Sync Right Table of Contents (TOC)
    syncToc(url);

    // 8. Re-evaluate inline scripts in the new content
    reinitializeScripts(currentMainEl);

    // 9. Animate in new content
    currentMainEl.classList.remove('page-transition-fade');

    isTransitioning = false;

    // Cooldown to prevent scroll momentum from triggering immediate consecutive scrolls
    scrollCooldown = true;
    setTimeout(() => {
      scrollCooldown = false;
    }, 1200);

    // 10. Prefetch new next/prev links
    prefetchNextPrev();
  }

  function syncSidebar(url) {
    document.querySelectorAll('.sidebar-content a[aria-current="page"]').forEach(el => {
      el.removeAttribute('aria-current');
    });
    const newActive = document.querySelector(`.sidebar-content a[href="${url}"], .sidebar-content a[href="${url}/"]`);
    if (newActive) {
      newActive.setAttribute('aria-current', 'page');
      newActive.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  function syncToc(url) {
    const pageData = pageCache.get(url);
    if (pageData && pageData.tocElement) {
      const currentTocEl = document.querySelector('starlight-toc');
      if (currentTocEl) {
        currentTocEl.replaceWith(pageData.tocElement.cloneNode(true));
      }
    }
  }

  function reinitializeScripts(container) {
    // Re-evaluate script tags within the newly injected content
    container.querySelectorAll('script').forEach(oldScript => {
      const newScript = document.createElement('script');
      for (const attr of oldScript.attributes) {
        newScript.setAttribute(attr.name, attr.value);
      }
      newScript.textContent = oldScript.textContent;
      oldScript.parentNode.replaceChild(newScript, oldScript);
    });
  }

  function prefetchNextPrev() {
    const nextLink = document.querySelector('main .pagination-links a[rel="next"]');
    const prevLink = document.querySelector('main .pagination-links a[rel="prev"]');
    if (nextLink) prefetch(nextLink.getAttribute('href'));
    if (prevLink) prefetch(prevLink.getAttribute('href'));
  }

  function handleScroll() {
    if (isTransitioning || scrollCooldown) return;

    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = document.documentElement.clientHeight;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;

    // 1. Only auto-transition if the page has a meaningful scrollable area (at least 150px)
    // This prevents instant transitions on short/unscrollable pages
    const isScrollable = scrollHeight > clientHeight + 150;
    if (!isScrollable) return;

    // 2. Check if the user has scrolled to the bottom (within 50px of the absolute bottom)
    const reachedBottom = scrollTop + clientHeight >= scrollHeight - 50;

    if (reachedBottom) {
      const nextLink = document.querySelector('main .pagination-links a[rel="next"]');
      if (nextLink) {
        const nextUrl = nextLink.getAttribute('href');
        transitionToPage(nextUrl);
      }
    }
  }

  // Set up throttled scroll listener
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    if (scrollTimeout) return;
    scrollTimeout = setTimeout(() => {
      scrollTimeout = null;
      handleScroll();
    }, 100);
  }, { passive: true });

  // Handle browser back/forward buttons
  window.addEventListener('popstate', () => {
    transitionToPage(window.location.pathname, false);
  });

  // Prefetch immediately on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', prefetchNextPrev);
  } else {
    prefetchNextPrev();
  }
})();
