import os
import io
import json
import base64
import requests
import pypdf
from PIL import Image

def main():
    pdf_path = "Aptitude Pdf's/Infosys/Copy of Infosys Materials.docx.pdf"
    if not os.path.exists(pdf_path):
        # Fallback search if run from backend directory
        pdf_path = os.path.join("..", pdf_path)

    r = pypdf.PdfReader(pdf_path)
    img_obj = r.pages[1].images[0]
    img_bytes = img_obj.data
    
    # 1. Determine actual image format, dimensions, and size
    pil_img = Image.open(io.BytesIO(img_bytes))
    img_format = pil_img.format or "PNG"
    mime_type = f"image/{img_format.lower()}"
    if img_format.upper() == "JPG":
        mime_type = "image/jpeg"

    print(f"Extracted Image: {img_obj.name}")
    print(f"Dimensions: {pil_img.size} (Width x Height)")
    print(f"Format: {img_format}, MIME: {mime_type}")
    print(f"Byte size: {len(img_bytes)} bytes ({len(img_bytes)/1024:.2f} KB)")

    # 2. Encode to base64
    b64_data = base64.b64encode(img_bytes).decode("utf-8")

    # 3. Load API key
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        env_candidates = [".env", os.path.join("..", ".env")]
        for env_file in env_candidates:
            if os.path.exists(env_file):
                with open(env_file, "r", encoding="utf-8") as f:
                    for line in f:
                        if line.startswith("GEMINI_API_KEY="):
                            api_key = line.split("=", 1)[1].strip().strip('"').strip("'")
                            break
            if api_key:
                break

    if not api_key:
        print("Error: GEMINI_API_KEY not found in environment or .env file.")
        return

    # 4. Call Gemini 2.5 Flash Vision endpoint with appropriate 60s timeout
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    payload = {
        "contents": [{
            "parts": [
                {
                    "text": (
                        "Inspect this image from a campus placement aptitude paper. "
                        "Determine if this is a clear, legible question diagram/chart/formula or if it is "
                        "a blurry/unreadable/decorative logo. Provide a concise 1-2 sentence assessment."
                    )
                },
                {
                    "inline_data": {
                        "mime_type": mime_type,
                        "data": b64_data
                    }
                }
            ]
        }]
    }

    print("\nSending request to Gemini 2.5 Flash Vision (timeout=60s)...")
    try:
        res = requests.post(url, json=payload, timeout=60)
        print("Gemini HTTP Status:", res.status_code)
        if res.status_code == 200:
            result_text = res.json()["candidates"][0]["content"]["parts"][0]["text"]
            print("\n=== Gemini Vision Analysis ===")
            print(result_text.strip())
        else:
            print("Gemini API Error:", res.status_code, res.text[:300])
    except requests.exceptions.Timeout:
        print("Request timed out after 60 seconds.")
    except Exception as e:
        print("Request failed with error:", e)

if __name__ == "__main__":
    main()
