const API_URL = "/words";

let checkedWords = [];
let currentCardWord = null;

// ============================================================
// データ取得 & 一覧描画
// ============================================================

async function loadWords() {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) return;
    const words = await response.json();
    renderWords(words);
  } catch (error) {
    showError("通信エラーが発生しました");
  }
}

function renderWords(words) {
  const list = document.getElementById("dictionary-list");
  list.innerHTML = "";

  words.forEach((word) => {
    const li = document.createElement("li");
    li.className = "dictionary-item" + (word.done ? " done" : "");

    const label = document.createElement("label");
    label.className = "dictionary-label";

    // チェックボックス
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "word-checkbox";
    checkbox.checked = word.done;
    checkbox.addEventListener("change", () => toggleWord(word.id, word.done));

    // タイトルとメモを入れるエリア
    const textContainer = document.createElement("div");
    textContainer.style.flex = "1";

    const titleHeader = document.createElement("div");
    titleHeader.style.display = "flex";
    titleHeader.style.alignItems = "center";
    titleHeader.style.gap = "8px";

    // 単語タイトル（Wikipediaリンク）
    const titleLink = document.createElement("a");
    titleLink.className = "dictionary-title";
    titleLink.textContent = word.title;
    titleLink.href = `https://ja.wikipedia.org/wiki/${encodeURIComponent(word.title)}`;
    titleLink.target = "_blank";
    titleLink.rel = "noopener noreferrer";
    // リンクをクリックしたときにチェックボックスが切り替わらないように保護
    titleLink.addEventListener("click", (e) => e.stopPropagation());

    titleHeader.appendChild(titleLink);

    // ★「覚えた！」マーク
    if (word.mastered) {
      const badge = document.createElement("span");
      badge.className = "mastered-badge";
      badge.textContent = "✨ 覚えた！";
      titleHeader.appendChild(badge);
    }

    textContainer.appendChild(titleHeader);

    // ★メモテキスト
    if (word.memo && word.memo.trim() !== "") {
      const memoDiv = document.createElement("div");
      memoDiv.className = "dictionary-memo-text";
      memoDiv.textContent = `📝 ${word.memo}`;
      textContainer.appendChild(memoDiv);
    }

    label.appendChild(checkbox);
    label.appendChild(textContainer);

    // 削除ボタン
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-button";
    deleteBtn.textContent = "削除";
    deleteBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation(); // チェックボックスの連動クリックを防止
      deleteWord(word.id);
    });

    li.appendChild(label);
    li.appendChild(deleteBtn);
    list.appendChild(li);
  });
}

// ============================================================
// API操作（追加・更新・削除）
// ============================================================

async function addWord() {
  const titleInput = document.getElementById("word-input");
  const memoInput = document.getElementById("memo-input");
  const title = titleInput.value.trim();
  const memo = memoInput ? memoInput.value.trim() : "";

  if (!title) {
    showError("WORDのタイトルを入力してください");
    return;
  }

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, memo }),
    });

    if (response.ok) {
      titleInput.value = "";
      if (memoInput) memoInput.value = "";
      await loadWords();
    }
  } catch (error) {
    showError("追加に失敗しました");
  }
}

async function toggleWord(id, currentDone) {
  try {
    await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !currentDone }),
    });
    await loadWords();
  } catch (error) {
    showError("更新に失敗しました");
  }
}

async function deleteWord(id) {
  try {
    await fetch(`${API_URL}/${id}`, { method: "DELETE" });
    await loadWords();
  } catch (error) {
    showError("削除に失敗しました");
  }
}

function showError(message) {
  const errorDiv = document.getElementById("error-message");
  errorDiv.textContent = message;
  errorDiv.style.display = "block";
  setTimeout(() => { errorDiv.style.display = "none"; }, 5000);
}

// ============================================================
// 単語カードモード機能
// ============================================================

function startFlashCards(allWords) {
  checkedWords = allWords.filter((w) => w.done);
  if (checkedWords.length === 0) {
    showError("チェックがついている単語がありません！");
    return;
  }
  document.getElementById("card-modal").style.display = "flex";
  showNextCard();
}

function showNextCard() {
  document.getElementById("flash-card-inner").classList.remove("is-flipped");

  const randomIndex = Math.floor(Math.random() * checkedWords.length);
  currentCardWord = checkedWords[randomIndex];

  document.getElementById("card-title").textContent = currentCardWord.title;
  
  const memoText = currentCardWord.memo && currentCardWord.memo.trim() !== "" 
    ? currentCardWord.memo 
    : "（メモはありません）";
  document.getElementById("card-memo").textContent = memoText;
}

document.getElementById("flash-card-container").addEventListener("click", () => {
  document.getElementById("flash-card-inner").classList.toggle("is-flipped");
});

// 「覚えた！」ボタンを押した時
document.getElementById("master-btn").addEventListener("click", async () => {
  if (!currentCardWord) return;

  try {
    const response = await fetch(`${API_URL}/${currentCardWord.id}`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json" // ← これがしっかり指定されているか確認！
      },
      body: JSON.stringify({ mastered: true }),
    });

    if (!response.ok) {
      const errDetail = await response.text();
      console.error("サーバーエラー内容:", errDetail);
      showError("更新に失敗しました");
      return;
    }

    currentCardWord.mastered = true;
    await loadWords();
    showNextCard();
  } catch (e) {
    showError("覚えた状態の更新に失敗しました");
  }
});

document.getElementById("start-card-btn").addEventListener("click", async () => {
  try {
    const res = await fetch(API_URL);
    if (res.ok) {
      const words = await res.json();
      startFlashCards(words);
    }
  } catch (e) {
    showError("読み込みエラー");
  }
});

document.getElementById("next-card-btn").addEventListener("click", showNextCard);

document.getElementById("wiki-link-btn").addEventListener("click", () => {
  if (currentCardWord) {
    window.open(`https://ja.wikipedia.org/wiki/${encodeURIComponent(currentCardWord.title)}`, "_blank");
  }
});

document.getElementById("close-card-btn").addEventListener("click", () => {
  document.getElementById("card-modal").style.display = "none";
});

document.getElementById("dictionary-form").addEventListener("submit", (e) => {
  e.preventDefault();
  addWord();
});

loadWords();