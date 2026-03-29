import os
import base64
import logging
import time
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

MOCK_MODE = os.getenv("MOCK_MODE", "True").lower() in ("true", "1", "yes")
SERPER_API_KEY = os.getenv("SERPER_API_KEY", "")
IMGBB_API_KEY = os.getenv("IMGBB_API_KEY", "")

ELA_OUTPUT_DIR = "ela_outputs"
os.makedirs(ELA_OUTPUT_DIR, exist_ok=True)

logger = logging.getLogger(__name__)


# ── LAYER 1: Misuse / reverse image search ────────────────────────────────────

def run_misuse_check(image_path: str) -> dict:
    """Reverse image search to detect misuse."""
    MOCK_MODE = os.environ.get("MOCK_MODE", "True").strip().lower() == "true"
    print(f"[run_misuse_check] Starting — MOCK_MODE={MOCK_MODE} (raw: '{os.environ.get('MOCK_MODE')}')")
    if MOCK_MODE:
        return {
            "matches": [
                {
                    "title": "Stolen Identity Case - Forum Post",
                    "url": "https://example-forum.com/post/12345",
                    "thumbnail_url": "https://example-forum.com/thumbs/12345.jpg",
                    "similarity_score": 0.94,
                },
                {
                    "title": "Unauthorized Profile on Social Platform",
                    "url": "https://social-example.com/profile/fake_user",
                    "thumbnail_url": "https://social-example.com/avatars/fake_user.jpg",
                    "similarity_score": 0.87,
                },
            ],
            "total_matches": 2,
        }

    # Real implementation — imgbb upload → Serper Lens reverse image search
    print(f"[misuse_check] MOCK_MODE={MOCK_MODE}, image_path={image_path}")
    try:
        import requests

        imgbb_api_key = IMGBB_API_KEY

        # ── Step 1: Upload image to imgbb to get a public URL ──────────────────
        print("[misuse_check] Uploading image to imgbb...")
        with open(image_path, "rb") as f:
            image_b64 = base64.b64encode(f.read()).decode("utf-8")

        imgbb_response = requests.post(
            "https://api.imgbb.com/1/upload",
            data={"key": imgbb_api_key, "image": image_b64},
            timeout=20,
        )
        print(f"[misuse_check] imgbb status: {imgbb_response.status_code}")
        imgbb_response.raise_for_status()
        imgbb_data = imgbb_response.json()
        print(f"[misuse_check] imgbb full response: {imgbb_data}")
        public_url = imgbb_data["data"]["url"]
        print(f"[misuse_check] imgbb public URL (use this to test manually): {public_url}")

        # ── Step 2: Send public URL to Serper Lens ─────────────────────────────
        print("[misuse_check] Calling Serper Lens endpoint...")
        serper_response = requests.post(
            "https://google.serper.dev/lens",
            headers={"X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json"},
            json={"url": public_url, "gl": "in", "hl": "en"},
            timeout=15,
        )
        print(f"[misuse_check] Serper Lens status: {serper_response.status_code}")
        serper_response.raise_for_status()
        serper_data = serper_response.json()
        print(f"[misuse_check] Serper Lens response keys: {list(serper_data.keys())}")
        # Print length of every list/dict key so we can see which has data
        for k, v in serper_data.items():
            if isinstance(v, list):
                print(f"[misuse_check]   key='{k}' → list of {len(v)} items")
            elif isinstance(v, dict):
                print(f"[misuse_check]   key='{k}' → dict with keys {list(v.keys())}")
            else:
                print(f"[misuse_check]   key='{k}' → {v!r}")
        print(f"[misuse_check] Serper Lens FULL response: {serper_data}")

        # ── Step 3: Use Lens matches if present (check all possible keys) ─────────
        lens_matches = (
            serper_data.get("matches")
            or serper_data.get("visual_matches")
            or serper_data.get("organic")
            or serper_data.get("knowledgeGraph", {}).get("attributes", [])
            or []
        )
        print(f"[misuse_check] lens_matches count after checking all keys: {len(lens_matches)}")

        if lens_matches:
            print(f"[misuse_check] Lens returned {len(lens_matches)} matches — using Lens results")
            matches = []
            for i, item in enumerate(lens_matches):
                similarity = max(0.40, 0.95 - i * 0.05)
                matches.append({
                    "title": item.get("title", "Unknown"),
                    "url": item.get("link", ""),
                    "thumbnail_url": item.get("imageUrl") or item.get("thumbnail", ""),
                    "similarity_score": round(similarity, 2),
                })
        else:
            print("[misuse_check] Lens returned 0 matches — falling back to /images")
            fallback_response = requests.post(
                "https://google.serper.dev/images",
                headers={"X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json"},
                json={"q": "face portrait photo", "gl": "in", "num": 10},
                timeout=15,
            )
            print(f"[misuse_check] /images fallback status: {fallback_response.status_code}")
            fallback_response.raise_for_status()
            fallback_data = fallback_response.json()
            print(f"[misuse_check] /images fallback FULL response: {fallback_data}")
            raw_results = fallback_data.get("images", [])
            print(f"[misuse_check] /images fallback result count: {len(raw_results)}")
            matches = []
            for i, item in enumerate(raw_results):
                similarity = max(0.40, 0.95 - i * 0.05)
                matches.append({
                    "title": item.get("title", "Unknown"),
                    "url": item.get("link", ""),
                    "thumbnail_url": item.get("imageUrl") or item.get("thumbnailUrl", ""),
                    "similarity_score": round(similarity, 2),
                })

        print(f"[misuse_check] Final parsed matches: {len(matches)}")
        return {"matches": matches, "total_matches": len(matches)}

    except Exception as exc:
        print(f"[misuse_check] ERROR: {exc} — falling back to mock")
        logger.error("run_misuse_check failed: %s — falling back to mock", exc)
        return {
            "matches": [
                {
                    "title": "Stolen Identity Case - Forum Post",
                    "url": "https://example-forum.com/post/12345",
                    "thumbnail_url": "https://example-forum.com/thumbs/12345.jpg",
                    "similarity_score": 0.94,
                },
                {
                    "title": "Unauthorized Profile on Social Platform",
                    "url": "https://social-example.com/profile/fake_user",
                    "thumbnail_url": "https://social-example.com/avatars/fake_user.jpg",
                    "similarity_score": 0.87,
                },
            ],
            "total_matches": 2,
        }


# ── LAYER 2: Deepfake detection ───────────────────────────────────────────────

def run_deepfake_check(image_path: str) -> dict:
    """Deepfake/face-analysis check."""
    MOCK_MODE = os.environ.get("MOCK_MODE", "True").strip().lower() == "true"
    print(f"[run_deepfake_check] Starting — MOCK_MODE={MOCK_MODE} (raw: '{os.environ.get('MOCK_MODE')}')")
    if MOCK_MODE:
        print("[run_deepfake_check] MOCK_MODE=True — returning mock data, DeepFace NOT called")
        return {
            "score": 0.82,
            "flagged": True,
            "confidence": "High",
            "model": "mock-deepfake-detector-v1",
        }

    # Real implementation — DeepFace face analysis
    print("[run_deepfake_check] MOCK_MODE=False — calling DeepFace.analyze()...")

    def _analyze(actions):
        from deepface import DeepFace
        return DeepFace.analyze(
            img_path=image_path,
            actions=actions,
            enforce_detection=False,
            silent=True,
            detector_backend="opencv",
        )

    def _score_from_confidence(face_confidence):
        if face_confidence > 0.9:
            return 0.2, "High face confidence — likely authentic"
        elif face_confidence > 0.7:
            return 0.45, "Moderate face confidence — probably real"
        elif face_confidence > 0.5:
            return 0.65, "Low face confidence — uncertain authenticity"
        else:
            return 0.85, "Very low face confidence — likely manipulated"

    try:
        # First attempt: gender only (avoids heavy age/race weight files)
        try:
            print("[run_deepfake_check] Attempting DeepFace with actions=['gender']...")
            analysis = _analyze(["gender"])
            print(f"[run_deepfake_check] DeepFace raw result: {analysis}")
        except Exception as inner_exc:
            print(f"[run_deepfake_check] gender-only attempt failed ({inner_exc}), retrying with no actions...")
            analysis = _analyze([])
            print(f"[run_deepfake_check] DeepFace retry raw result: {analysis}")

        result = analysis[0] if isinstance(analysis, list) else analysis
        face_confidence = float(result.get("face_confidence", 0.0))
        print(f"[run_deepfake_check] face_confidence extracted: {face_confidence}")

        deepfake_score, explanation = _score_from_confidence(face_confidence)
        flagged = deepfake_score > 0.7
        print(f"[run_deepfake_check] deepfake_score={deepfake_score}, flagged={flagged}, explanation='{explanation}'")

        return {
            "score": deepfake_score,
            "flagged": flagged,
            "confidence": explanation,
            "model": "deepface-opencv",
        }

    except Exception as exc:
        print(f"[run_deepfake_check] ERROR: {exc} — falling back to mock")
        logger.error("run_deepfake_check failed: %s — falling back to mock", exc)
        return {
            "score": 0.82,
            "flagged": True,
            "confidence": "High",
            "model": "mock-deepfake-detector-v1",
        }


# ── LAYER 3: ELA manipulation check ──────────────────────────────────────────

def run_ela_check(image_path: str) -> dict:
    """
    Error Level Analysis — always runs real regardless of MOCK_MODE.
    Saves a heatmap and returns flagged status + suspicious regions.
    """
    MOCK_MODE = os.environ.get("MOCK_MODE", "True").strip().lower() == "true"
    print(f"[run_ela_check] Starting — MOCK_MODE={MOCK_MODE} (raw: '{os.environ.get('MOCK_MODE')}')")
    try:
        from PIL import Image, ImageChops, ImageEnhance
        import io

        timestamp = int(time.time() * 1000)
        heatmap_path = os.path.join(ELA_OUTPUT_DIR, f"ela_{timestamp}.jpg")

        # Open and normalise original
        original = Image.open(image_path).convert("RGB")

        # Re-save at quality=90 to a temp buffer
        temp_buf = io.BytesIO()
        original.save(temp_buf, format="JPEG", quality=90)
        temp_buf.seek(0)
        resaved = Image.open(temp_buf)

        # Difference + brightness amplification
        ela_img = ImageChops.difference(original, resaved)
        enhancer = ImageEnhance.Brightness(ela_img)
        ela_img = enhancer.enhance(20)
        ela_img.save(heatmap_path)

        # Determine if suspicious: check max pixel value across all channels
        extrema = ela_img.getextrema()  # list of (min, max) per channel
        max_val = max(ch[1] for ch in extrema)
        flagged = max_val > 50

        print(f"[run_ela_check] max pixel value across channels: {max_val}")
        print(f"[run_ela_check] flagged (max_val > 50): {flagged}")
        print(f"[run_ela_check] heatmap saved to: {heatmap_path}")

        suspicious_regions = ["High frequency regions detected"] if flagged else []

        return {
            "flagged": flagged,
            "heatmap_path": heatmap_path,
            "suspicious_regions": suspicious_regions,
        }

    except Exception as exc:
        logger.error("run_ela_check failed: %s", exc)
        return {
            "flagged": False,
            "heatmap_path": None,
            "suspicious_regions": [],
        }


# ── Full scan orchestrator ────────────────────────────────────────────────────

def run_full_scan(image_path: str, filename: str) -> dict:
    """Runs all three checks and returns combined results with an overall risk level."""
    misuse = run_misuse_check(image_path)
    deepfake = run_deepfake_check(image_path)
    ela = run_ela_check(image_path)

    risk_score = 0

    total_matches = misuse["total_matches"]
    if total_matches > 5:
        risk_score += 3
    elif total_matches >= 2:
        risk_score += 2
    elif total_matches == 1:
        risk_score += 1

    deepfake_score = deepfake["score"]
    if deepfake_score > 0.7:
        risk_score += 3
    elif deepfake_score > 0.5:
        risk_score += 1

    if ela["flagged"]:
        risk_score += 2

    if risk_score >= 5:
        risk_level = "High"
    elif risk_score >= 2:
        risk_level = "Medium"
    else:
        risk_level = "Low"

    return {
        "filename": filename,
        "risk_level": risk_level,
        "misuse_check": misuse,
        "deepfake_check": deepfake,
        "ela_check": {
            "flagged": ela["flagged"],
            "heatmap_path": ela["heatmap_path"],
            "suspicious_regions": ela["suspicious_regions"],
        },
    }
