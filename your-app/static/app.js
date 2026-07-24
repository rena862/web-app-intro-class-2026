const API_URL = "/words";

// ============================================================
// WORD操作（CRUD）
// ============================================================

/**
 * WORD一覧を取得して表示する
 */
async function loadWords() {
  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      const error = await response.json();
      showError(error.detail || "WORDの取得に失敗しました");
      return;
    }

    const words = await response.json();
    renderWords(words);
  } catch (error) {
    showError("通信エラー１が発生しました");
  }
}

/**
 * 新しいWORDを追加する
 */
async function addWord() {
  const input = document.getElementById("word-input");
  const title = input.value.trim();

  if (title === "") {
    showError("WORDのタイトルを入力してください");
    return;
  }

  if (title.length > 100) {
    showError("タイトルは100文字以内で入力してください");
    return;
  }

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title }),
    });

    if (!response.ok) {
      const error = await response.json();
      showError(error.detail || "WORDの追加に失敗しました");
      return;
    }

    input.value = "";
    await loadWords();
  } catch (error) {
    showError("通信エラー２が発生しました");
  }
}

/**
 * WORDの完了状態を切り替える
 */
async function toggleWord(id, currentDone) {
  try {
    const response = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !currentDone }),
    });

    if (!response.ok) {
      const error = await response.json();
      showError(error.detail || "WORDの更新に失敗しました");
      return;
    }

    await loadWords();
  } catch (error) {
    showError("通信エラー３が発生しました");
  }
}

/**
 * WORDを削除する
 */
async function deleteWord(id) {
  try {
    const response = await fetch(`${API_URL}/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      showError(error.detail || "WORDの削除に失敗しました");
      return;
    }

    await loadWords();
  } catch (error) {
    showError("通信エラー４が発生しました");
  }
}

// ============================================================
// 描画
// ============================================================

/**
 * WORDリストを描画する（Wikipediaリンク付き）
 */
function renderWords(words) {
  const list = document.getElementById("dictionary-list");
  list.innerHTML = "";

  words.forEach((word) => {
    const li = document.createElement("li");
    li.className = "dictionary-item" + (word.done ? " done" : "");

    const label = document.createElement("label");
    label.className = "dictionary-label";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "word-checkbox";
    checkbox.checked = word.done;
    checkbox.addEventListener("change", () => toggleWord(word.id, word.done));

    // WORDタイトルをWikipediaへのリンクにする
    const titleLink = document.createElement("a");
    titleLink.className = "dictionary-title";
    titleLink.textContent = word.title;
    titleLink.href = `https://ja.wikipedia.org/wiki/${encodeURIComponent(word.title)}`;
    titleLink.target = "_blank";
    titleLink.rel = "noopener noreferrer";

    label.appendChild(checkbox);
    label.appendChild(titleLink);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-button";
    deleteBtn.textContent = "削除";
    deleteBtn.addEventListener("click", () => deleteWord(word.id));

    li.appendChild(label);
    li.appendChild(deleteBtn);

    list.appendChild(li);
  });
}

// ============================================================
// メッセージ表示
// ============================================================

function showError(message) {
  const errorDiv = document.getElementById("error-message");
  errorDiv.textContent = message;
  errorDiv.style.display = "block";
  setTimeout(() => {
    errorDiv.style.display = "none";
  }, 5000);
}

// ============================================================
// イベントリスナー
// ============================================================

document.getElementById("dictionary-form").addEventListener("submit", function (e) {
  e.preventDefault();
  addWord();
});

// ページ読み込み時にWORD一覧を取得
loadWords();

let checkedWords = []; // チェックがついている単語を入れる配列
let currentCardWord = null; // いま表示している単語

// 学習モードを開始する
function startFlashCards(allWords) {
  // done === true (チェックがついている単語) だけを抽出する
  checkedWords = allWords.filter(word => word.done);

  if (checkedWords.length === 0) {
    showError("チェックがついている単語がありません！");
    return;
  }

  // モーダルを表示
  document.getElementById("card-modal").style.display = "flex";
  
  // 最初のランダム単語を表示
  showNextCard();
}

// ランダムに次の単語を表示する
function showNextCard() {
  // 配列からランダムに1文字選ぶ
  const randomIndex = Math.floor(Math.random() * checkedWords.length);
  currentCardWord = checkedWords[randomIndex];

  // 画面に表示
  document.getElementById("card-title").textContent = currentCardWord.title;
}

// ボタン等のイベント設定
document.getElementById("start-card-btn").addEventListener("click", async () => {
  // 最新の単語一覧をサーバーから取得してカードを開始
  try {
    const response = await fetch(API_URL);
    if (response.ok) {
      const words = await response.json();
      startFlashCards(words);
    }
  } catch (e) {
    showError("データの読み込みに失敗しました");
  }
});

// 次の単語へボタン
document.getElementById("next-card-btn").addEventListener("click", showNextCard);

// Wikipediaを開くボタン
document.getElementById("wiki-link-btn").addEventListener("click", () => {
  if (currentCardWord) {
    const url = `https://ja.wikipedia.org/wiki/${encodeURIComponent(currentCardWord.title)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }
});

// モーダルを閉じるボタン
document.getElementById("close-card-btn").addEventListener("click", () => {
  document.getElementById("card-modal").style.display = "none";
});