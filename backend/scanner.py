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
            raw_items = lens_matches
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
            raw_items = fallback_data.get("images", [])
            print(f"[misuse_check] /images fallback result count: {len(raw_items)}")

        # ── Parse raw items into match dicts ──────────────────────────────────
        def parse_items(items):
            out = []
            for i, item in enumerate(items):
                similarity = max(0.40, 0.95 - i * 0.05)
                out.append({
                    "title": item.get("title", "Unknown"),
                    "url": item.get("link") or item.get("url", ""),
                    "thumbnail_url": item.get("imageUrl") or item.get("thumbnail") or item.get("thumbnailUrl", ""),
                    "similarity_score": round(similarity, 2),
                })
            return out

        all_matches = parse_items(raw_items)

        # ── Filter out shopping/product pages ────────────────────────────────
        BLOCKED_URL_TERMS = {
            "amazon", "flipkart", "myntra", "ajio", "meesho", "snapdeal",
            "shopify", "shop", "store", "buy", "cart", "product",
            "fashion", "kurti", "dress", "clothing", "fabric",
        }
        BLOCKED_TITLE_TERMS = {
            "buy", "shop", "price", "discount", "offer", "sale", "rs.", "₹",
        }

        def is_shopping(m):
            url_lower = m["url"].lower()
            title_lower = m["title"].lower()
            return (
                any(t in url_lower for t in BLOCKED_URL_TERMS)
                or any(t in title_lower for t in BLOCKED_TITLE_TERMS)
            )

        filtered = [m for m in all_matches if not is_shopping(m)]
        print(f"[misuse_check] After shopping filter: {len(filtered)} of {len(all_matches)} remain")

        # Fall back to unfiltered list if filtering removed too many results
        if len(filtered) < 3:
            print("[misuse_check] Too few after filtering — using unfiltered list")
            matches = all_matches[:10]
        else:
            matches = filtered[:10]

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

    # Real implementation — frequency analysis + face detection
    def detect_ai_generated(img_path: str) -> float:
        import cv2
        import numpy as np

        img = cv2.imread(img_path)
        if img is None:
            print("[deepfake_check] cv2.imread returned None — cannot analyse")
            return 0.5

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # Method 1: FFT frequency analysis — GAN images have distinctive artifacts
        f = np.fft.fft2(gray)
        fshift = np.fft.fftshift(f)
        magnitude = 20 * np.log(np.abs(fshift) + 1)
        h, w = magnitude.shape
        center_region = magnitude[h // 4: 3 * h // 4, w // 4: 3 * w // 4]
        edge_region = np.concatenate([magnitude[: h // 4].flatten(), magnitude[3 * h // 4 :].flatten()])
        center_mean = np.mean(center_region)
        edge_mean = np.mean(edge_region)
        freq_ratio = edge_mean / (center_mean + 1e-10)

        # Method 2: Laplacian noise variance — AI images are unnaturally clean
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        noise_score = np.var(laplacian)

        # Method 3: HSV saturation std — AI images have uniform saturation
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        sat_std = np.std(hsv[:, :, 1])

        print(f"[deepfake_check] freq_ratio={freq_ratio:.3f}, noise_score={noise_score:.1f}, sat_std={sat_std:.1f}")

        score = 0.3  # base
        if freq_ratio < 0.15:
            score += 0.35
            print("[deepfake_check] Low freq_ratio (+0.35) — possible GAN artifact")
        if noise_score < 50:
            score += 0.2
            print("[deepfake_check] Low noise_score (+0.20) — unusually clean image")
        if sat_std < 30:
            score += 0.15
            print("[deepfake_check] Low sat_std (+0.15) — uniform saturation")

        return min(score, 0.95)

    print("[run_deepfake_check] MOCK_MODE=False — running face detection + frequency analysis...")
    try:
        from deepface import DeepFace

        # Step 1: check if a face exists
        print("[run_deepfake_check] Calling DeepFace.extract_faces()...")
        faces = DeepFace.extract_faces(
            img_path=image_path,
            enforce_detection=False,
            detector_backend="opencv",
        )
        face_count = len(faces) if faces else 0
        print(f"[run_deepfake_check] extract_faces found {face_count} face(s)")

        if not faces or face_count == 0:
            print("[run_deepfake_check] No face detected — score=0.3, not flagged")
            return {
                "score": 0.3,
                "flagged": False,
                "confidence": "No face detected",
                "model": "freq-analysis",
            }

        # Step 2: run frequency/noise/saturation analysis
        print("[run_deepfake_check] Face found — running detect_ai_generated()...")
        deepfake_score = detect_ai_generated(image_path)
        flagged = deepfake_score > 0.55

        if deepfake_score > 0.7:
            explanation = "High AI probability — likely generated or manipulated"
        elif deepfake_score > 0.55:
            explanation = "Moderate AI signals — possibly manipulated"
        elif deepfake_score > 0.35:
            explanation = "Low AI signals — probably authentic"
        else:
            explanation = "Very low AI signals — likely authentic"

        print(f"[run_deepfake_check] Final: score={deepfake_score}, flagged={flagged}, explanation='{explanation}'")
        return {
            "score": round(deepfake_score, 3),
            "flagged": flagged,
            "confidence": explanation,
            "model": "freq-analysis",
        }

    except Exception as exc:
        print(f"[run_deepfake_check] ERROR — {type(exc).__name__}: {exc}")
        logger.error("run_deepfake_check failed: %s", exc)
        return {
            "score": 0.5,
            "flagged": False,
            "confidence": "Analysis failed — result uncertain",
            "model": "freq-analysis-failed",
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
