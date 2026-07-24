"""
TODOアプリ バックエンド - 完成版
第8回: セキュリティの基礎 & 総仕上げ
"""

import sqlite3  # Python標準のデータベース（SQLite）を使うためのライブラリ
import uvicorn  # FastAPIアプリを動かすためのWebサーバー

from fastapi import FastAPI, HTTPException  # Webアプリ本体とエラー応答用
from fastapi.middleware.cors import CORSMiddleware  # ブラウザからのアクセスを許可する設定
from fastapi.staticfiles import StaticFiles  # HTML/CSS/JSなどのファイルを配信する機能
from pydantic import BaseModel, Field  # 受け取るデータの形をチェックする道具

# --- FastAPIアプリ ---
# このappが、Webアプリ全体の本体になる
app = FastAPI(title="WORD App")

# CORS設定: 別のアドレスで動くフロント（ブラウザの画面）からの通信を許可する
# allow_origins=["*"] は「どこからのアクセスでもOK」という意味（学習用の設定）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- データベース設定 ---
# データを保存するファイルの名前。アプリと同じフォルダに word.db が作られる
DATABASE = "word.db"


def init_db():
    """データベースとテーブルを初期化する"""
    conn = sqlite3.connect(DATABASE)  # データベースに接続する
    cursor = conn.cursor()  # SQLを実行する係（カーソル）を用意する
    # words テーブルがまだ無ければ作る（IF NOT EXISTS）
    #   id    : 自動で増える番号（主キー）
    #   title : WORDの内容（空はNG）
    #   done  : 完了したかどうか（0=未完了, 1=完了）
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS words (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            done INTEGER DEFAULT 0
        )
    """)
    conn.commit()  # 変更を確定して保存する
    conn.close()  # 接続を閉じる


# --- Pydanticモデル ---
# APIが受け取るデータの「形」を決めるクラス。
# 形に合わないデータが送られてきたら、FastAPIが自動でエラーを返してくれる。


class WordCreate(BaseModel):
    # 新しいWORDを作るときに受け取るデータ
    # title は1文字以上100文字以下の文字列でなければならない
    title: str = Field(min_length=1, max_length=100)


class WordUpdate(BaseModel):
    # WORDを更新するときに受け取るデータ
    # done は True / False（完了したかどうか）
    done: bool


# --- APIエンドポイント ---
# @app.get / @app.post などの飾り（デコレータ）で、
# 「どのURLに、どの種類のリクエストが来たら、この関数を動かすか」を決める。


@app.get("/words")  # GET /words にアクセスされたら実行
def get_words():
    """WORD一覧を取得する"""
    conn = sqlite3.connect(DATABASE)  # 接続する
    cursor = conn.cursor()

    # words テーブルの全データを id 順に取り出す
    cursor.execute("SELECT id, title, done FROM words ORDER BY id")
    words = cursor.fetchall()  # 取り出した全行をリストで受け取る

    conn.close()  # 接続を閉じる
    # 1行は (id, title, done) の順のタプルなので、番号で取り出す。
    # 取り出したデータを、ブラウザに返しやすい辞書のリストに作り変える。
    return [
        {"id": word[0], "title": word[1], "done": bool(word[2])}
        for word in words
    ]


@app.post("/words", status_code=201)  # POST /words で新規作成（201=作成成功）
def create_word(word: WordCreate):
    """新しいWORDを作成する"""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    # 新しいWORDを1件追加する（done は 0=未完了で登録）
    # ? を使うことで、危険な文字列が混ざってもSQLが壊れない（SQLインジェクション対策）
    cursor.execute(
        "INSERT INTO words (title, done) VALUES (?, 0)",
        (word.title,),
    )
    conn.commit()  # 追加を確定する
    word_id = cursor.lastrowid  # たった今追加した行の id を取得する

    conn.close()
    return {"id": word_id, "title": word.title, "done": False}


# PUT /words/5 のように、URLの {word_id} の部分が引数 word_id に入る
@app.put("/words/{word_id}")
def update_word(word_id: int, word: WordUpdate):
    """WORDの完了状態を更新する"""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    # まず、その id のWORDが本当にあるか確認する
    cursor.execute("SELECT title FROM words WHERE id = ?", (word_id,))
    existing = cursor.fetchone()  # 1件だけ取り出す。無ければ None が返る
    if existing is None:
        conn.close()  # 見つからないときも接続は閉じてから終わる
        # 404エラー（見つからない）を返して処理を中断する
        raise HTTPException(status_code=404, detail="WORD not found")

    # done（完了状態）を更新する。True/False は int() で 1/0 に変換して保存
    cursor.execute(
        "UPDATE words SET done = ? WHERE id = ?",
        (int(word.done), word_id),
    )
    conn.commit()  # 更新を確定する

    conn.close()
    # existing は (title,) のタプルなので、先頭を取り出す
    return {"id": word_id, "title": existing[0], "done": word.done}


@app.delete("/words/{word_id}")  # DELETE /words/5 で id=5 のWORDを削除
def delete_word(word_id: int):
    """WORDを削除する"""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    # 削除する前に、その id のWORDが存在するか確認する
    cursor.execute("SELECT id FROM words WHERE id = ?", (word_id,))
    existing = cursor.fetchone()
    if existing is None:
        conn.close()
        raise HTTPException(status_code=404, detail="WORD not found")

    cursor.execute("DELETE FROM words WHERE id = ?", (word_id,))  # 削除する
    conn.commit()  # 削除を確定する

    conn.close()
    return {"message": "WORD deleted", "id": word_id}


# --- 静的ファイル配信 ---
# static フォルダの中身（index.html など）をそのままブラウザに表示できるようにする
app.mount("/", StaticFiles(directory="static", html=True), name="static")

# --- アプリ起動時にDBを初期化 ---
# プログラムが読み込まれたタイミングで、テーブルが無ければ作っておく
init_db()

# このファイルを直接 `python main.py` で実行したときだけ、サーバーを起動する
if __name__ == "__main__":
    # host="0.0.0.0" で外部からのアクセスも受け付ける。ポート8000で待ち受ける
    uvicorn.run(app, host="0.0.0.0", 
            port=8000)
