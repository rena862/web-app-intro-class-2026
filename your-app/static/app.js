document.addEventListener("DOMContentLoaded", function() {
  // DOM要素の取得
  const wordInput = document.getElementById("word-input");
  const memoInput = document.getElementById("memo-input");
  const addBtn = document.getElementById("add-btn");
  const dictionaryList = document.getElementById("dictionary-list");
  const errorMessage = document.getElementById("error-message");
  const filterBtns = document.querySelectorAll(".filter-btn");
  const startStudyBtn = document.getElementById("start-study-btn");
  const selectAllBtn = document.getElementById("select-all-btn");
  const deselectAllBtn = document.getElementById("deselect-all-btn");

  // 進捗バー要素
  const masterProgressBar = document.getElementById("master-progress-bar");
  const masterProgressText = document.getElementById("master-progress-text");

  // バックアップ要素
  const exportBtn = document.getElementById("export-btn");
  const importFileInput = document.getElementById("import-file-input");

  // モーダル要素
  const cardModal = document.getElementById("card-modal");
  const closeModalBtn = document.getElementById("close-modal-btn");
  const flashCard = document.getElementById("flash-card");
  const flashCardInner = document.getElementById("flash-card-inner");
  const cardTitle = document.getElementById("card-title");
  const cardMemo = document.getElementById("card-memo");
  const cardProgress = document.getElementById("card-progress");
  const wikiBtn = document.getElementById("wiki-btn");
  const masterBtn = document.getElementById("master-btn");
  const nextBtn = document.getElementById("next-btn");

  const congratsScreen = document.getElementById("congrats-screen");
  const studyCardBody = document.getElementById("study-card-body");
  const congratsCloseBtn = document.getElementById("congrats-close-btn");
  const confettiContainer = document.getElementById("confetti-container");

  // ローカルストレージからの安全なデータ読み込み
  let words = [];
  try {
    const rawData = localStorage.getItem("pop_words");
    if (rawData) {
      const parsed = JSON.parse(rawData);
      if (Array.isArray(parsed)) {
        words = parsed.map(item => ({
          id: item.id || (Date.now() + Math.random()),
          title: item.title || "",
          memo: item.memo || "",
          selected: item.selected !== undefined ? !!item.selected : true,
          done: !!item.done
        }));
      }
    }
  } catch (e) {
    console.error("Data Load Error:", e);
    words = [];
  }

  let currentFilter = "all";
  let studySessionWords = [];
  let currentStudyIndex = 0;

  // 配列をシャッフルする関数
  function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // 初期表示処理
  renderList();
  updateProgressBar();

  // 単語追加処理
  function addWord() {
    if (!wordInput) return;

    const title = wordInput.value.trim();
    const memo = memoInput ? memoInput.value.trim() : "";

    if (!title) {
      showError("単語を入力してください！");
      return;
    }

    const newWord = {
      id: Date.now(),
      title: title,
      memo: memo || "（メモはありません）",
      selected: true,
      done: false
    };

    words.unshift(newWord);
    saveAndRender();

    wordInput.value = "";
    if (memoInput) memoInput.value = "";
    hideError();
  }

  // 追加ボタンのクリックイベント
  if (addBtn) {
    addBtn.addEventListener("click", function(e) {
      e.preventDefault();
      addWord();
    });
  }

  // Enterキー対応
  if (wordInput) {
    wordInput.addEventListener("keypress", function(e) {
      if (e.key === "Enter") {
        e.preventDefault();
        addWord();
      }
    });
  }

  function showError(msg) {
    if (errorMessage) {
      errorMessage.textContent = msg;
      errorMessage.style.display = "block";
    }
  }

  function hideError() {
    if (errorMessage) {
      errorMessage.style.display = "none";
    }
  }

  function saveAndRender() {
    try {
      localStorage.setItem("pop_words", JSON.stringify(words));
    } catch (e) {
      console.error("Save Error:", e);
    }
    renderList();
    updateProgressBar();
  }

  // 進捗バー更新
  function updateProgressBar() {
    if (!masterProgressBar || !masterProgressText) return;
    const total = words.length;
    if (total === 0) {
      masterProgressBar.style.width = "0%";
      masterProgressText.textContent = "0% (0 / 0)";
      return;
    }
    const masteredCount = words.filter(w => w.done).length;
    const percent = Math.round((masteredCount / total) * 100);
    masterProgressBar.style.width = percent + "%";
    masterProgressText.textContent = percent + "% (" + masteredCount + " / " + total + ")";
  }

  // 全選択・全解除（全選択時は習得済み単語も対象にして復帰可能に）
  if (selectAllBtn) {
    selectAllBtn.onclick = function() {
      words.forEach(w => {
        w.selected = true;
        if (w.done) w.done = false; // 全選択した場合は覚えた状態も解除
      });
      saveAndRender();
    };
  }

  if (deselectAllBtn) {
    deselectAllBtn.onclick = function() {
      words.forEach(w => w.selected = false);
      saveAndRender();
    };
  }

  // フィルター切り替え
  filterBtns.forEach(btn => {
    btn.onclick = function() {
      filterBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.filter;
      renderList();
    };
  });

  function escapeHTML(str) {
    if (!str) return "";
    return String(str).replace(/[&<>'"]/g, function(tag) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag;
    });
  }

  // 単語一覧の描画
  function renderList() {
    if (!dictionaryList) return;
    dictionaryList.innerHTML = "";

    const filteredWords = words.filter(word => {
      if (currentFilter === "unmastered") return !word.done;
      if (currentFilter === "mastered") return word.done;
      return true;
    });

    if (filteredWords.length === 0) {
      dictionaryList.innerHTML = '<li style="text-align:center; color:#14b8a6; padding:20px; font-size:14px; font-weight:bold;">該当する単語がありません</li>';
      return;
    }

    filteredWords.forEach(word => {
      const li = document.createElement("li");
      li.className = "dictionary-item " + (word.done ? "done" : "");

      // disabled属性を解除し、常に操作可能に修正
      li.innerHTML = `
        <label class="dictionary-label">
          <input type="checkbox" class="word-checkbox" ${word.selected ? "checked" : ""}>
          <div>
            <span class="dictionary-title">${escapeHTML(word.title)}</span>
            ${word.done ? '<span class="mastered-badge">覚えた！</span>' : ""}
            <div class="dictionary-memo-text">${escapeHTML(word.memo)}</div>
          </div>
        </label>
        <button type="button" class="delete-button">削除</button>
      `;

      // チェックボックス操作時の処理
      const checkbox = li.querySelector(".word-checkbox");
      if (checkbox) {
        checkbox.onchange = function() {
          word.selected = checkbox.checked;
          // 再びチェックを入れた場合は「覚えた」状態（done）を解除して未習得に戻す
          if (checkbox.checked && word.done) {
            word.done = false;
          }
          saveAndRender();
        };
      }

      const deleteBtn = li.querySelector(".delete-button");
      if (deleteBtn) {
        deleteBtn.onclick = function(e) {
          e.stopPropagation();
          words = words.filter(w => w.id !== word.id);
          saveAndRender();
        };
      }

      dictionaryList.appendChild(li);
    });
  }

  // バックアップ：エクスポート
  if (exportBtn) {
    exportBtn.onclick = function() {
      if (words.length === 0) {
        alert("保存する単語データがありません。");
        return;
      }
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(words, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "pop_words_backup.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    };
  }

  // バックアップ：インポート
  if (importFileInput) {
    importFileInput.onchange = function(e) {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(event) {
        try {
          const importedWords = JSON.parse(event.target.result);
          if (Array.isArray(importedWords)) {
            if (confirm("既存の単語データに上書きインポートしますか？")) {
              words = importedWords.map(item => ({
                id: item.id || (Date.now() + Math.random()),
                title: item.title || "",
                memo: item.memo || "",
                selected: item.selected !== undefined ? !!item.selected : true,
                done: !!item.done
              }));
              saveAndRender();
              alert("データを正常に復元しました！");
            }
          } else {
            alert("正しいファイルフォーマットではありません。");
          }
        } catch (err) {
          alert("ファイルの読み込みに失敗しました。");
        }
        importFileInput.value = "";
      };
      reader.readAsText(file);
    };
  }

  // 学習機能（モーダル表示）
  if (startStudyBtn) {
    startStudyBtn.onclick = function() {
      const targetWords = words.filter(w => w.selected && !w.done);

      if (targetWords.length === 0) {
        alert("勉強する単語が選択されていません！\n一覧から単語にチェックマークを入れてください。");
        return;
      }

      studySessionWords = shuffleArray(targetWords);
      currentStudyIndex = 0;

      if (congratsScreen) congratsScreen.style.display = "none";
      if (studyCardBody) studyCardBody.style.display = "block";
      if (confettiContainer) confettiContainer.innerHTML = "";

      openCardModal();
      updateCardDisplay();
    };
  }

  function openCardModal() {
    if (cardModal) cardModal.style.display = "flex";
    if (flashCardInner) flashCardInner.classList.remove("is-flipped");
  }

  function closeCardModal() {
    if (cardModal) cardModal.style.display = "none";
  }

  if (closeModalBtn) closeModalBtn.onclick = closeCardModal;
  if (congratsCloseBtn) congratsCloseBtn.onclick = closeCardModal;

  if (flashCard && flashCardInner) {
    flashCard.onclick = function() {
      flashCardInner.classList.toggle("is-flipped");
    };
  }

  function updateCardDisplay() {
    if (studySessionWords.length === 0) return;
    if (flashCardInner) flashCardInner.classList.remove("is-flipped");

    const currentWord = studySessionWords[currentStudyIndex];
    if (cardTitle) cardTitle.textContent = currentWord.title;
    if (cardMemo) cardMemo.textContent = currentWord.memo;
    if (cardProgress) cardProgress.textContent = (currentStudyIndex + 1) + " / " + studySessionWords.length;
  }

  // 次へボタン
  if (nextBtn) {
    nextBtn.onclick = function() {
      if (studySessionWords.length === 0) return;
      
      currentStudyIndex++;
      if (currentStudyIndex >= studySessionWords.length) {
        studySessionWords = shuffleArray(studySessionWords);
        currentStudyIndex = 0;
      }
      updateCardDisplay();
    };
  }

  // Wikipedia検索
  if (wikiBtn) {
    wikiBtn.onclick = function() {
      if (studySessionWords.length === 0) return;
      const currentWord = studySessionWords[currentStudyIndex];
      const url = "https://ja.wikipedia.org/wiki/" + encodeURIComponent(currentWord.title);
      window.open(url, "_blank");
    };
  }

  // 覚えた！ボタン
  if (masterBtn) {
    masterBtn.onclick = function() {
      if (studySessionWords.length === 0) return;

      const currentWord = studySessionWords[currentStudyIndex];
      const targetInMain = words.find(w => w.id === currentWord.id);
      if (targetInMain) {
        targetInMain.done = true;
        targetInMain.selected = false;
        saveAndRender();
      }

      studySessionWords.splice(currentStudyIndex, 1);

      if (studySessionWords.length === 0) {
        showCongrats();
        return;
      }

      if (currentStudyIndex >= studySessionWords.length) {
        studySessionWords = shuffleArray(studySessionWords);
        currentStudyIndex = 0;
      }
      updateCardDisplay();
    };
  }

  // 達成時紙吹雪アニメーション
  function showCongrats() {
    if (studyCardBody) studyCardBody.style.display = "none";
    if (congratsScreen) congratsScreen.style.display = "block";

    if (!confettiContainer) return;
    confettiContainer.innerHTML = "";
    const colors = ["#2dd4bf", "#99f6e4", "#38bdf8", "#fde68a", "#a7f3d0"];
    
    for (let i = 0; i < 40; i++) {
      const confetti = document.createElement("div");
      confetti.className = "confetti";
      confetti.style.left = (Math.random() * 100) + "%";
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.animationDelay = (Math.random() * 2) + "s";
      confetti.style.animationDuration = (1.5 + Math.random() * 2) + "s";
      confettiContainer.appendChild(confetti);
    }
  }
});