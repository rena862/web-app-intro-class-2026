from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import Optional, List

app = FastAPI()

# データを保存するリスト（メモリ上）
words_db = []
current_id = 1

class WordCreate(BaseModel):
    title: str = Field(..., max_length=100)
    memo: Optional[str] = Field(default="", max_length=500)

class WordUpdate(BaseModel):
    done: Optional[bool] = None
    mastered: Optional[bool] = None
    memo: Optional[str] = None

class WordResponse(BaseModel):
    id: int
    title: str
    memo: str
    done: bool
    mastered: bool

@app.get("/words", response_model=List[WordResponse])
def get_words():
    return words_db

@app.post("/words", response_model=WordResponse)
def create_word(word: WordCreate):
    global current_id
    new_word = {
        "id": current_id,
        "title": word.title,
        "memo": word.memo or "",
        "done": True, # デフォルトでチェック対象にする
        "mastered": False
    }
    words_db.append(new_word)
    current_id += 1
    return new_word

@app.put("/words/{word_id}", response_model=WordResponse)
def update_word(word_id: int, word_update: WordUpdate):
    for word in words_db:
        if word["id"] == word_id:
            # 送られてきた項目だけを更新する
            if word_update.done is not None:
                word["done"] = word_update.done
            if word_update.mastered is not None:
                word["mastered"] = word_update.mastered
            if word_update.memo is not None:
                word["memo"] = word_update.memo
            return word
    raise HTTPException(status_code=404, detail="WORDが見つかりません")

@app.delete("/words/{word_id}")
def delete_word(word_id: int):
    global words_db
    words_db = [w for w in words_db if w["id"] != word_id]
    return {"message": "削除しました"}

app.mount("/", StaticFiles(directory="static", html=True), name="static")

# 直接起動用のコードを追加！
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)