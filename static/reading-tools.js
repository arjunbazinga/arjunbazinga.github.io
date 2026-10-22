(() => {
  const init = () => {
    document.querySelector('.navbar-toggler')?.removeAttribute('role');
    const episodeSearch = document.querySelector('.podcast-page .quarto-listing-filter input');
    if (episodeSearch) {
      episodeSearch.placeholder = 'Search episodes';
      episodeSearch.setAttribute('aria-label', 'Search episodes');
      const listing = window['quarto-listings']?.['listing-episodes'];
      if (listing) {
        const status = document.createElement('p');
        status.className = 'episode-search-status';
        status.setAttribute('role', 'status');
        document.querySelector('.episode-list').before(status);
        const updateCount = () => {
          const count = listing.matchingItems.length;
          status.textContent = `${count} ${count === 1 ? 'episode' : 'episodes'}`;
        };
        // This Quarto version's List.js expects lowercase search terms. Handle
        // input as well as keyup so paste and mobile keyboards work too.
        const search = () => listing.search(episodeSearch.value.toLocaleLowerCase());
        episodeSearch.addEventListener('input', search);
        episodeSearch.addEventListener('keyup', search);
        listing.on('updated', updateCount);
        updateCount();
      }
    }
    // Quarto adds category links after fetching listing metadata asynchronously.
    // Keep these descriptive labels even when that fetch finishes after load.
    const categories = document.querySelector('.quarto-categories');
    if (categories) {
      const plainCategories = () => categories.querySelectorAll('a').forEach(link => link.replaceWith(document.createTextNode(link.textContent)));
      plainCategories();
      new MutationObserver(plainCategories).observe(categories, {childList: true, subtree: true});
    }
    const main = document.querySelector('main.content');
    if (!main || !document.body.classList.contains('essay-page') || document.body.classList.contains('writing-page')) return;

    const toc = document.querySelector('#TOC');
    if (toc && !main.querySelector('.mobile-contents')) {
      const details = document.createElement('details');
      // headroom-target lets Quarto move it up with the header when that hides on scroll.
      details.className = 'mobile-contents headroom-target';
      const summary = document.createElement('summary');
      summary.textContent = 'On this page';
      const nav = document.createElement('nav');
      nav.setAttribute('aria-label', 'Article contents');
      const list = toc.querySelector('ul')?.cloneNode(true);
      if (list) {
        list.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
        list.querySelectorAll('[aria-current]').forEach(el => el.removeAttribute('aria-current'));
        list.querySelectorAll('.active').forEach(el => el.classList.remove('active'));
        nav.append(list);
        details.append(summary, nav);
        const title = main.querySelector('#title-block-header');
        if (title) title.after(details); else main.prepend(details);
        nav.addEventListener('click', event => {
          const link = event.target.closest('a');
          if (!link) return;
          details.open = false;
          const target = document.getElementById(decodeURIComponent(link.hash.slice(1)));
          if (target) {
            target.setAttribute('tabindex', '-1');
            target.focus({preventScroll: true});
          }
        });
      }
    }

    const markOverflow = () => {
      main.querySelectorAll('.table-scroll, pre').forEach(el => {
        if (el.closest('.mermaid, .cell-output-display') || el.classList.contains('mermaid')) return;
        const wide = el.scrollWidth > el.clientWidth + 2;
        el.classList.toggle('has-overflow', wide);
        if (wide && el.tagName === 'PRE') {
          el.tabIndex = 0;
          el.setAttribute('aria-label', 'Code or diagram; scroll horizontally to see more');
        }
        if (el.classList.contains('ascii-diagram')) {
          let hint = el.nextElementSibling?.classList.contains('diagram-scroll-hint') ? el.nextElementSibling : null;
          if (wide && !hint) {
            hint = document.createElement('p');
            hint.className = 'diagram-scroll-hint';
            hint.textContent = 'Scroll sideways to see the full diagram.';
            el.after(hint);
          } else if (!wide && hint) {
            hint.remove();
          }
        }
        if (el.classList.contains('table-scroll')) el.tabIndex = wide ? 0 : -1;
      });
    };
    markOverflow();
    window.addEventListener('resize', markOverflow);
    window.addEventListener('load', markOverflow, {once: true});
  };
  // Deferred scripts execute while readyState is "interactive", before the
  // DOMContentLoaded callbacks that initialize Quarto's listings.
  if (document.readyState === 'complete') init();
  else document.addEventListener('DOMContentLoaded', init, {once: true});
})();
