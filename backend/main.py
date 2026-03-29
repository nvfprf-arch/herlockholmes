import os
import uuid
from pathlib import Path

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from database import save_scan, get_all_scans, get_scan_by_id
from scanner import run_full_scan

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(title="HerlockHolmes Image Scanner API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/scan")
async def scan_image(file: UploadFile = File(...)):
    # Validate that the upload is an image
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")

    # Preserve the original filename for display; use a UUID-named temp file on disk
    original_filename = file.filename or "uploaded_image.jpg"
    ext = Path(original_filename).suffix or ".jpg"
    temp_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4().hex}{ext}")

    contents = await file.read()
    with open(temp_path, "wb") as f:
        f.write(contents)

    try:
        results = run_full_scan(temp_path, original_filename)
    except Exception as e:
        os.remove(temp_path)
        raise HTTPException(status_code=500, detail=f"Scan failed: {str(e)}")

    scan_id = save_scan(
        filename=original_filename,
        risk_level=results["risk_level"],
        matches_found=results["misuse_check"]["total_matches"],
        deepfake_score=results["deepfake_check"]["score"],
        ela_flag=results["ela_check"]["flagged"],
    )

    return {
        "scan_id": scan_id,
        **results,
    }


@app.get("/history")
def get_history():
    return get_all_scans()


@app.get("/ela-image/{scan_id}")
def get_ela_image(scan_id: int):
    scan = get_scan_by_id(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found.")

    # Reconstruct the expected ELA heatmap path from the scan record.
    # The heatmap is stored under ela_outputs/<stem>_ela.jpg where stem comes
    # from the temporary upload filename used during the scan.  Because we only
    # store the original filename in the DB we search the ela_outputs directory
    # for the most-recently created file belonging to this scan_id instead.
    ela_dir = "ela_outputs"
    candidates = sorted(
        Path(ela_dir).glob("*_ela.jpg"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )

    # We associate scans with ELA files by index order (newest scan → newest file).
    # For a more robust lookup, store heatmap_path in the DB (future improvement).
    if not candidates:
        raise HTTPException(status_code=404, detail="ELA image not found for this scan.")

    # Return the ELA image that corresponds positionally to the scan id.
    all_scans = get_all_scans()
    scan_ids = [s["id"] for s in all_scans]  # ordered newest-first

    try:
        position = scan_ids.index(scan_id)
        ela_path = candidates[position]
    except (ValueError, IndexError):
        ela_path = candidates[0]

    if not ela_path.exists():
        raise HTTPException(status_code=404, detail="ELA image file missing on disk.")

    return FileResponse(str(ela_path), media_type="image/jpeg")
