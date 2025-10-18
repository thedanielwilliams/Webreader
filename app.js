(() => {
  const els = {
    home: document.getElementById('home'),
    list: document.getElementById('book-list'),
    search: document.getElementById('search'),
    uploadBtn: document.getElementById('upload-btn'),
    uploadInput: document.getElementById('upload-input'),
    readerView: document.getElementById('reader-view'),
    reader: document.getElementById('reader'),
    pageInfo: document.getElementById('page-info'),
    prevPage: document.getElementById('prev-page'),
    nextPage: document.getElementById('next-page'),
    back: document.getElementById('back-btn'),
    title: document.getElementById('book-title'),
    fontSize: document.getElementById('font-size'),
    theme: document.getElementById('theme')
  };

  const state = {
    books: [],
    uploaded: [],
    current: null,
    fontSize: parseInt(localStorage.getItem('fontSize') || '18', 10),
    theme: localStorage.getItem('theme') || 'light'
  };

  function applyTheme(theme) {
    document.body.classList.remove('light', 'sepia', 'dark');
    document.body.classList.add(theme);
  }

  function applyFontSize(px) {
    els.reader.style.fontSize = `${px}px`;
  }

  function loadBooks() {
    fetch('books/books.json')
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load books (${res.status})`);
        return res.json();
      })
      .then(json => {
        state.books = json;
        renderList();
      })
      .catch(err => {
        console.error(err);
        els.list.innerHTML = `<li>Error loading books: ${err.message}</li>`;
      });
  }

  function renderList() {
    const q = (els.search.value || '').trim().toLowerCase();
    const all = [...state.uploaded, ...state.books];
    const books = all.filter(b => b.title.toLowerCase().includes(q) || (b.author || '').toLowerCase().includes(q));
    els.list.innerHTML = '';
    if (books.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'No books found.';
      els.list.appendChild(li);
      return;
    }
    for (const b of books) {
      const li = document.createElement('li');
      li.innerHTML = `<div>${b.title}</div><div class=\"meta\">${b.author || ''}</div>`;
      li.addEventListener('click', () => openBook(b));
      els.list.appendChild(li);
    }
  }

  function openBook(book) {
    state.current = book;
    els.title.textContent = book.title;
    els.home.classList.add('hidden');
    els.readerView.classList.remove('hidden');

    const isPdf = /\.pdf(\?.*)?$/i.test(book.file) || book.type === 'pdf';
    setUiForMode(isPdf);

    // Uploaded files: handle without fetch
    if (book.source === 'upload') {
      if (isPdf) {
        renderPdf(book.blobUrl || book.file);
      } else {
        renderText(book.content || '');
      }
      restoreProgress(book.id);
      updatePageInfo();
      els.reader.focus();
      return;
    }

    if (isPdf) {
      renderPdf(book.file);
      restoreProgress(book.id);
      updatePageInfo();
      els.reader.focus();
      return;
    }

    fetch(book.file)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load book file (${res.status})`);
        return res.text();
      })
      .then(text => {
        renderText(text);
        restoreProgress(book.id);
        updatePageInfo();
        els.reader.focus();
      })
      .catch(err => {
        console.error(err);
        els.reader.textContent = `Error loading book: ${err.message}`;
      });
  }

  function renderText(text) {
    els.reader.innerHTML = '';
    const paragraphs = text.split(/\n\s*\n/g);
    for (const p of paragraphs) {
      const para = document.createElement('p');
      para.textContent = p.trim();
      els.reader.appendChild(para);
    }
  }

  function renderPdf(src) {
    els.reader.innerHTML = '';
    const obj = document.createElement('object');
    obj.type = 'application/pdf';
    obj.data = src;
    obj.className = 'pdf-embed';
    obj.innerHTML = `<p>PDF preview unavailable. <a href="${src}" target="_blank" rel="noopener">Download PDF</a></p>`;
    els.reader.appendChild(obj);
  }

  function saveProgress() {
    if (!state.current) return;
    const isPdf = /\.pdf(\?.*)?$/i.test(state.current.file || '') || state.current.type === 'pdf';
    const p = {
      fontSize: state.fontSize,
      theme: state.theme
    };
    if (!isPdf) {
      p.scrollTop = els.reader.scrollTop;
      p.percent = Math.min(100, Math.round((els.reader.scrollTop / (els.reader.scrollHeight - els.reader.clientHeight)) * 100)) || 0;
    }
    localStorage.setItem(`progress:${state.current.id}`, JSON.stringify(p));
  }

  function restoreProgress(bookId) {
    const raw = localStorage.getItem(`progress:${bookId}`);
    if (!raw) return;
    try {
      const p = JSON.parse(raw);
      // apply settings stored with the progress
      if (typeof p.fontSize === 'number') {
        state.fontSize = p.fontSize;
        els.fontSize.value = String(p.fontSize);
        applyFontSize(p.fontSize);
        localStorage.setItem('fontSize', String(p.fontSize));
      }
      if (p.theme) {
        state.theme = p.theme;
        els.theme.value = p.theme;
        applyTheme(p.theme);
        localStorage.setItem('theme', p.theme);
      }
      // restore position
      requestAnimationFrame(() => {
        const isPdf = state.current && (/\.pdf(\?.*)?$/i.test(state.current.file || '') || state.current.type === 'pdf');
        if (!isPdf) {
          els.reader.scrollTop = p.scrollTop || 0;
        }
        updatePageInfo();
      });
    } catch {}
  }

  function updatePageInfo() {
    const isPdf = state.current && (/\.pdf(\?.*)?$/i.test(state.current.file || '') || state.current.type === 'pdf');
    if (isPdf) {
      els.pageInfo.textContent = 'PDF';
      return;
    }
    const total = Math.max(1, Math.ceil(els.reader.scrollHeight / els.reader.clientHeight));
    const current = Math.min(total, Math.max(1, Math.floor(els.reader.scrollTop / els.reader.clientHeight) + 1));
    els.pageInfo.textContent = `Page ${current}/${total}`;
  }

  function nextPage() {
    els.reader.scrollBy({ top: els.reader.clientHeight - 40, behavior: 'smooth' });
  }
  function prevPage() {
    els.reader.scrollBy({ top: -(els.reader.clientHeight - 40), behavior: 'smooth' });
  }

  // events
  const debounce = (fn, ms = 250) => {
    let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  };

  els.search.addEventListener('input', renderList);
  els.reader.addEventListener('scroll', () => { updatePageInfo(); saveProgress(); });

  els.nextPage.addEventListener('click', nextPage);
  els.prevPage.addEventListener('click', prevPage);

  els.back.addEventListener('click', () => {
    saveProgress();
    state.current = null;
    els.readerView.classList.add('hidden');
    els.home.classList.remove('hidden');
  });

  els.fontSize.addEventListener('input', (e) => {
    const px = parseInt(e.target.value, 10);
    state.fontSize = px;
    applyFontSize(px);
    localStorage.setItem('fontSize', String(px));
    updatePageInfo();
    saveProgress();
  });

  els.theme.addEventListener('change', (e) => {
    const theme = e.target.value;
    state.theme = theme;
    applyTheme(theme);
    localStorage.setItem('theme', theme);
    saveProgress();
  });

  // initial
  applyTheme(state.theme);
  els.theme.value = state.theme;
  applyFontSize(state.fontSize);
  els.fontSize.value = String(state.fontSize);

  // Upload helpers and UI toggles are defined inside the app init closure
  function setUiForMode(isPdf) {
    const fontLabel = els.fontSize.closest('label');
    if (isPdf) {
      fontLabel && fontLabel.classList.add('hidden');
      els.prevPage.classList.add('hidden');
      els.nextPage.classList.add('hidden');
      els.pageInfo.classList.add('hidden');
    } else {
      fontLabel && fontLabel.classList.remove('hidden');
      els.prevPage.classList.remove('hidden');
      els.nextPage.classList.remove('hidden');
      els.pageInfo.classList.remove('hidden');
    }
  }

  function handleFiles(fileList) {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    let idx = 0;
    for (const file of files) {
      const isPdf = /\.pdf$/i.test(file.name) || file.type === 'application/pdf';
      const id = `upload-${Date.now()}-${idx++}`;
      const title = file.name.replace(/\.(txt|pdf)$/i, '');
      if (isPdf) {
        const url = URL.createObjectURL(file);
        state.uploaded.unshift({ id, title: file.name, author: 'Local file', type: 'pdf', file: url, blobUrl: url, source: 'upload' });
        renderList();
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          const content = String(reader.result || '');
          state.uploaded.unshift({ id, title: file.name, author: 'Local file', type: 'text', content, source: 'upload' });
          renderList();
        };
        reader.readAsText(file);
      }
    }
  }

  // Wire upload button, file input, and drag-and-drop
  els.uploadBtn.addEventListener('click', () => {
    els.uploadInput.click();
  });
  els.uploadInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
    e.target.value = '';
  });
  els.home.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });
  els.home.addEventListener('drop', (e) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  });

  loadBooks();
})();