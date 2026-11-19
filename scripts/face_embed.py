#!/usr/bin/env python3
"""Real 128-D MobileFaceNet embedding extractor using OpenCV DNN + model_128d.onnx."""

import base64
import json
import os
import sys
import cv2
import numpy as np

DEFAULT_ONNX = r"C:\Users\calle\watcher_ref\grove-vision-face-embedding\qat_distill_v2_relu6_128d\model_128d.onnx"


def extract_embedding_from_b64(img_b64: str) -> dict:
    if "," in img_b64:
        img_b64 = img_b64.split(",", 1)[1]
    raw = base64.b64decode(img_b64)
    arr = np.frombuffer(raw, dtype=np.uint8)
    bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if bgr is None:
        return {"ok": False, "error": "invalid_image"}

    h, w = bgr.shape[:2]
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    cascade_path = os.path.join(cv2.data.haarcascades, "haarcascade_frontalface_default.xml")
    faces = []
    if os.path.exists(cascade_path):
        detector = cv2.CascadeClassifier(cascade_path)
        faces = detector.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(32, 32))

    if len(faces) > 0:
        x, y, fw, fh = max(faces, key=lambda b: b[2] * b[3])
        pad = int(0.15 * max(fw, fh))
        x0 = max(0, x - pad)
        y0 = max(0, y - pad)
        x1 = min(w, x + fw + pad)
        y1 = min(h, y + fh + pad)
        crop = bgr[y0:y1, x0:x1]
        face_detected = True
    else:
        side = min(h, w)
        y0 = (h - side) // 2
        x0 = (w - side) // 2
        crop = bgr[y0 : y0 + side, x0 : x0 + side]
        face_detected = False

    onnx_path = os.environ.get("IDEE_FACE_ONNX", DEFAULT_ONNX)
    if not os.path.exists(onnx_path):
        return {"ok": False, "error": f"model_not_found: {onnx_path}"}

    net = cv2.dnn.readNetFromONNX(onnx_path)
    rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
    resized = cv2.resize(rgb, (112, 112), interpolation=cv2.INTER_LINEAR).astype(np.float32)
    blob = (resized - 127.5) / 128.0
    blob = np.transpose(blob, (2, 0, 1))[np.newaxis, ...]

    net.setInput(blob)
    out = net.forward().flatten().astype(np.float64)
    norm = float(np.linalg.norm(out))
    if norm > 1e-8:
        out = out / norm

    return {
        "ok": True,
        "face_detected": face_detected,
        "dim": int(out.shape[0]),
        "embedding": [round(float(v), 6) for v in out],
    }


def main() -> int:
    payload = json.loads(sys.stdin.read())
    b64 = payload.get("image_b64", "")
    if not b64:
        print(json.dumps({"ok": False, "error": "missing_image_b64"}))
        return 1
    try:
        res = extract_embedding_from_b64(b64)
    except Exception as exc:
        res = {"ok": False, "error": str(exc)}
    print(json.dumps(res))
    return 0 if res.get("ok") else 1


if __name__ == "__main__":
    sys.exit(main())
