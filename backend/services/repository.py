import json, os, sqlite3
from pathlib import Path
from threading import RLock
from fastapi import HTTPException
from mock_data import seed

DB_PATH=os.getenv('ARQ_DB_PATH',str(Path(__file__).resolve().parents[1]/'data'/'demo.sqlite3'))
Path(DB_PATH).parent.mkdir(parents=True,exist_ok=True)
lock=RLock()

def connect():
    db=sqlite3.connect(DB_PATH)
    db.execute('CREATE TABLE IF NOT EXISTS records (collection TEXT, id TEXT, data TEXT, PRIMARY KEY(collection,id))')
    return db

with connect() as db:
    if not db.execute('SELECT 1 FROM records LIMIT 1').fetchone():
        for collection,rows in seed().items():
            db.executemany('INSERT INTO records VALUES (?,?,?)',[(collection,r['id'],json.dumps(r,ensure_ascii=False)) for r in rows])

def all_records(collection):
    with connect() as db:
        return [json.loads(r[0]) for r in db.execute('SELECT data FROM records WHERE collection=? ORDER BY rowid',(collection,))]

def get(collection,id):
    with connect() as db:
        row=db.execute('SELECT data FROM records WHERE collection=? AND id=?',(collection,id)).fetchone()
    if not row: raise HTTPException(404,'Registro não encontrado')
    return json.loads(row[0])

def save(collection,record):
    with lock,connect() as db:
        db.execute('INSERT OR REPLACE INTO records VALUES (?,?,?)',(collection,record['id'],json.dumps(record,ensure_ascii=False)))
    return record
