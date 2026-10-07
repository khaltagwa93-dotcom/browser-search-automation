from fastapi import FastAPI, Request, Form
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.templating import Jinja2Templates
from pathlib import Path
import json
from datetime import datetime
from .searcher import run_search
import csv
import io

app = FastAPI(title="نظام أتمتة البحث الكامل - Playwright")
templates = Jinja2Templates(directory="templates")

DATA_DIR = Path("data")
DATA_DIR.mkdir(exist_ok=True)
HISTORY_FILE = DATA_DIR / "history.json"

def load_history():
    if HISTORY_FILE.exists():
        try:
            return json.loads(HISTORY_FILE.read_text(encoding="utf-8"))
        except:
            return []
    return []

def save_history(entry):
    history = load_history()
    history.insert(0, entry)
    history = history[:50]  # keep last 50
    HISTORY_FILE.write_text(json.dumps(history, ensure_ascii=False, indent=2), encoding="utf-8")

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    history = load_history()
    return templates.TemplateResponse("index.html", {
        "request": request,
        "history": history[:10]
    })

@app.post("/api/search")
async def api_search(
    query: str = Form(...),
    engine: str = Form("duckduckgo"),
    limit: int = Form(10)
):
    query = query.strip()
    if len(query) < 2:
        return JSONResponse({"error": "كلمة البحث قصيرة جداً"}, status_code=400)

    limit = min(max(limit, 1), 20)
    engine = engine.lower()

    try:
        results = await run_search(query, engine, limit)
        entry = {
            "query": query,
            "engine": engine,
            "count": len(results),
            "timestamp": datetime.now().isoformat(),
            "results": results
        }
        save_history(entry)
        return {
            "success": True,
            "query": query,
            "engine": engine,
            "results": results,
            "count": len(results),
            "timestamp": entry["timestamp"]
        }
    except Exception as e:
        return JSONResponse({
            "error": "فشل البحث",
            "message": str(e)
        }, status_code=500)

@app.get("/api/history")
async def get_history():
    return load_history()

@app.get("/health")
async def health():
    return {"status": "ok", "engine": "Playwright Full"}
