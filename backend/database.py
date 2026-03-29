import sqlite3
from datetime import datetime

DB_PATH = "scans.db"


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS scan_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            scan_date TEXT NOT NULL,
            risk_level TEXT NOT NULL,
            matches_found INTEGER NOT NULL,
            deepfake_score REAL NOT NULL,
            ela_flag INTEGER NOT NULL
        )
    """)
    conn.commit()
    conn.close()


def save_scan(filename: str, risk_level: str, matches_found: int, deepfake_score: float, ela_flag: bool) -> int:
    conn = get_connection()
    cursor = conn.execute(
        """
        INSERT INTO scan_history (filename, scan_date, risk_level, matches_found, deepfake_score, ela_flag)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (filename, datetime.utcnow().isoformat(), risk_level, matches_found, deepfake_score, int(ela_flag)),
    )
    conn.commit()
    scan_id = cursor.lastrowid
    conn.close()
    return scan_id


def get_all_scans() -> list[dict]:
    conn = get_connection()
    rows = conn.execute("SELECT * FROM scan_history ORDER BY scan_date DESC").fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_scan_by_id(scan_id: int) -> dict | None:
    conn = get_connection()
    row = conn.execute("SELECT * FROM scan_history WHERE id = ?", (scan_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


init_db()
