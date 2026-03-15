"""
DAiSEE MediaPipe Landmark Extraction Script
Extracts 478 Face Mesh landmarks from raw DAiSEE videos.
Saves train, validation, and test splits as .npy files.
"""

import cv2
import mediapipe as mp
import numpy as np
import pandas as pd
import os
import sys
import time
from concurrent.futures import ProcessPoolExecutor, as_completed

# ============================================================
# CONFIG
# ============================================================
DATASET_ROOT = r"C:\Users\revan\Downloads\DAiSEE\DAiSEE"
OUTPUT_DIR = r"C:\Users\revan\Downloads\DAiSEE\mediapipe_processed"
SEQ_LEN = 30          # Frames per clip (temporal window)
NUM_LANDMARKS = 478   # Face Mesh with refine_landmarks=True
DIMS = 3              # x, y, z per landmark
FEATURE_DIM = NUM_LANDMARKS * DIMS  # 1434

SPLITS = {
    "train": {
        "labels_csv": os.path.join(DATASET_ROOT, "Labels", "TrainLabels.csv"),
        "video_dir": os.path.join(DATASET_ROOT, "DataSet", "Train"),
    },
    "val": {
        "labels_csv": os.path.join(DATASET_ROOT, "Labels", "ValidationLabels.csv"),
        "video_dir": os.path.join(DATASET_ROOT, "DataSet", "Validation"),
    },
    "test": {
        "labels_csv": os.path.join(DATASET_ROOT, "Labels", "TestLabels.csv"),
        "video_dir": os.path.join(DATASET_ROOT, "DataSet", "Test"),
    },
}


def find_video_path(clip_id: str, video_dir: str) -> str | None:
    """
    DAiSEE structure: DataSet/{Split}/{UserID}/{ClipID}/{ClipID}.avi
    UserID = first 6 chars of ClipID (without .avi)
    """
    clip_name = clip_id.replace(".avi", "")
    user_id = clip_name[:6]
    path = os.path.join(video_dir, user_id, clip_name, clip_id)
    if os.path.exists(path):
        return path
    # Fallback: search
    for root, dirs, files in os.walk(video_dir):
        if clip_id in files:
            return os.path.join(root, clip_id)
    return None


def extract_landmarks_from_video(video_path: str) -> np.ndarray | None:
    """
    Extract 478 Face Mesh landmarks for SEQ_LEN uniformly sampled frames.
    Returns shape: (SEQ_LEN, FEATURE_DIM) or None on failure.
    """
    try:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return None

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if total_frames <= 0:
            cap.release()
            return None

        # Uniformly sample SEQ_LEN frame indices
        frame_indices = np.linspace(0, total_frames - 1, SEQ_LEN, dtype=int)

        frames_data = []

        with mp.solutions.face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.3,
        ) as face_mesh:

            for idx in frame_indices:
                cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
                ret, frame = cap.read()
                if not ret:
                    frames_data.append(np.zeros(FEATURE_DIM, dtype=np.float32))
                    continue

                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = face_mesh.process(rgb)

                if results.multi_face_landmarks:
                    lm = results.multi_face_landmarks[0]
                    coords = []
                    for p in lm.landmark:
                        coords.extend([p.x, p.y, p.z])
                    frames_data.append(np.array(coords, dtype=np.float32))
                else:
                    frames_data.append(np.zeros(FEATURE_DIM, dtype=np.float32))

        cap.release()
        return np.array(frames_data, dtype=np.float32)

    except Exception as e:
        return None


def process_single_video(args):
    """Worker function for parallel processing."""
    clip_id, video_dir, label = args
    video_path = find_video_path(clip_id, video_dir)
    if video_path is None:
        return None, None

    features = extract_landmarks_from_video(video_path)
    if features is None:
        return None, None

    return features, label


def process_split(split_name: str, config: dict):
    """Process one split (train/val/test)."""
    print(f"\n{'='*60}")
    print(f"Processing {split_name.upper()} split")
    print(f"{'='*60}")

    # Load labels
    df = pd.read_csv(config["labels_csv"])
    # Clean column names
    df.columns = df.columns.str.strip()
    print(f"Found {len(df)} clips in labels CSV")

    video_dir = config["video_dir"]

    # Prepare work items
    work_items = []
    for _, row in df.iterrows():
        clip_id = row["ClipID"].strip()
        label = np.array([
            row["Boredom"],
            row["Engagement"],
            row["Confusion"],
            row["Frustration"]
        ], dtype=np.int32)
        work_items.append((clip_id, video_dir, label))

    # Process sequentially (MediaPipe is CPU-bound, parallel causes issues on Windows)
    X_list = []
    y_list = []
    failed = 0
    start_time = time.time()

    for i, args in enumerate(work_items):
        features, label = process_single_video(args)

        if features is not None:
            X_list.append(features)
            y_list.append(label)
        else:
            failed += 1

        # Progress
        if (i + 1) % 50 == 0 or (i + 1) == len(work_items):
            elapsed = time.time() - start_time
            rate = (i + 1) / elapsed
            remaining = (len(work_items) - i - 1) / max(rate, 0.01)
            print(f"  [{split_name}] {i+1}/{len(work_items)} "
                  f"({len(X_list)} ok, {failed} failed) "
                  f"| {rate:.1f} clips/sec "
                  f"| ETA: {remaining/60:.1f} min")

    if len(X_list) == 0:
        print(f"  ❌ No valid clips found for {split_name}!")
        return

    X = np.array(X_list, dtype=np.float32)
    y = np.array(y_list, dtype=np.int32)

    # Save
    np.save(os.path.join(OUTPUT_DIR, f"X_{split_name}.npy"), X)
    np.save(os.path.join(OUTPUT_DIR, f"y_{split_name}.npy"), y)

    elapsed = time.time() - start_time
    print(f"\n  ✅ {split_name}: Saved X={X.shape}, y={y.shape}")
    print(f"     Time: {elapsed/60:.1f} min | Failed: {failed}/{len(work_items)}")


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Save metadata
    metadata = {
        "seq_len": SEQ_LEN,
        "num_landmarks": NUM_LANDMARKS,
        "dims": DIMS,
        "feature_dim": FEATURE_DIM,
        "label_names": ["Boredom", "Engagement", "Confusion", "Frustration"],
        "label_range": "0-3 (Very Low to Very High)",
    }

    import json
    with open(os.path.join(OUTPUT_DIR, "metadata.json"), "w") as f:
        json.dump(metadata, f, indent=2)

    print("=" * 60)
    print("DAiSEE MediaPipe Landmark Extraction")
    print(f"Output: {OUTPUT_DIR}")
    print(f"Sequence Length: {SEQ_LEN} frames")
    print(f"Feature Dim: {FEATURE_DIM} (478 landmarks x 3)")
    print("=" * 60)

    for split_name, config in SPLITS.items():
        process_split(split_name, config)

    print("\n\n" + "=" * 60)
    print("🎉 ALL DONE!")
    print(f"Output saved to: {OUTPUT_DIR}")
    print("=" * 60)


if __name__ == "__main__":
    main()
