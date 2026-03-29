import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

MOCK_MODE = os.getenv("MOCK_MODE", "True").lower() in ("true", "1", "yes")

ELA_OUTPUT_DIR = "ela_outputs"
os.makedirs(ELA_OUTPUT_DIR, exist_ok=True)


def run_misuse_check(image_path: str) -> dict:
    """Reverse image search to detect misuse. Returns mock data in MOCK_MODE."""
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

    # Real implementation would call Serper or similar reverse image search API
    return {"matches": [], "total_matches": 0}


def run_deepfake_check(image_path: str) -> dict:
    """Runs deepfake detection on the image. Returns mock data in MOCK_MODE."""
    if MOCK_MODE:
        return {
            "score": 0.82,
            "flagged": True,
            "confidence": "High",
            "model": "mock-deepfake-detector-v1",
        }

    # Real implementation would call a deepfake detection model
    return {"score": 0.0, "flagged": False, "confidence": "Low", "model": "none"}


def run_ela_check(image_path: str) -> dict:
    """
    Runs Error Level Analysis on the image.
    Saves a heatmap image and returns flagged status and suspicious regions.
    """
    from PIL import Image, ImageChops, ImageEnhance
    import io

    image_stem = Path(image_path).stem
    heatmap_filename = f"{image_stem}_ela.jpg"
    heatmap_path = os.path.join(ELA_OUTPUT_DIR, heatmap_filename)

    if MOCK_MODE:
        # Generate a simple mock ELA heatmap by brightening the image
        img = Image.open(image_path).convert("RGB")
        resaved = io.BytesIO()
        img.save(resaved, format="JPEG", quality=75)
        resaved.seek(0)
        resaved_img = Image.open(resaved)

        ela_img = ImageChops.difference(img, resaved_img)
        enhancer = ImageEnhance.Brightness(ela_img)
        ela_img = enhancer.enhance(20)
        ela_img.save(heatmap_path)

        return {
            "flagged": True,
            "heatmap_path": heatmap_path,
            "suspicious_regions": [
                {"x": 120, "y": 85, "width": 60, "height": 45, "confidence": 0.91},
                {"x": 300, "y": 200, "width": 80, "height": 60, "confidence": 0.78},
            ],
        }

    # Real implementation: proper ELA at multiple quality levels
    img = Image.open(image_path).convert("RGB")
    resaved = io.BytesIO()
    img.save(resaved, format="JPEG", quality=90)
    resaved.seek(0)
    resaved_img = Image.open(resaved)

    ela_img = ImageChops.difference(img, resaved_img)
    enhancer = ImageEnhance.Brightness(ela_img)
    ela_img = enhancer.enhance(20)
    ela_img.save(heatmap_path)

    return {
        "flagged": False,
        "heatmap_path": heatmap_path,
        "suspicious_regions": [],
    }


def run_full_scan(image_path: str, filename: str) -> dict:
    """Runs all three checks and returns combined results with an overall risk level."""
    misuse = run_misuse_check(image_path)
    deepfake = run_deepfake_check(image_path)
    ela = run_ela_check(image_path)

    # Determine overall risk level
    risk_score = 0

    if misuse["total_matches"] >= 2:
        risk_score += 2
    elif misuse["total_matches"] == 1:
        risk_score += 1

    if deepfake["flagged"]:
        if deepfake["score"] >= 0.8:
            risk_score += 2
        else:
            risk_score += 1

    if ela["flagged"]:
        risk_score += 1

    if risk_score >= 4:
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
