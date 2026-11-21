"""Annotated review video: written under a .partial name and only renamed once finalized (playable)."""

import struct
from pathlib import Path

import cv2
import numpy as np

from nigah_worker.annotate import VideoSink, partial_path


def top_level_boxes(path: Path) -> list[str]:
    data, names, i = path.read_bytes(), [], 0
    while i + 8 <= len(data):
        size, kind = struct.unpack(">I4s", data[i:i + 8])
        if size == 1:
            size = struct.unpack(">Q", data[i + 8:i + 16])[0]
        names.append(kind.decode("latin1"))
        if size < 8:
            break
        i += size
    return names


def test_video_is_finalized_and_renamed_only_on_close(tmp_path) -> None:
    out = tmp_path / "review.mp4"
    sink = VideoSink(str(out), 10.0, (160, 120))
    for i in range(15):
        sink.write(np.full((120, 160, 3), i * 15, np.uint8))
    # While recording, the final name does not exist: a killed run leaves only review.partial.mp4.
    assert partial_path(out).exists() and not out.exists()

    assert sink.close() == out
    assert out.exists() and not partial_path(out).exists()
    assert "moov" in top_level_boxes(out)  # the index players need; missing when a run is killed
    cap = cv2.VideoCapture(str(out))
    frames = 0
    while cap.read()[0]:
        frames += 1
    assert frames == 15 and round(cap.get(cv2.CAP_PROP_FPS)) == 10
    assert sink.codec in ("H.264", "MPEG-4 Part 2")


def test_no_frames_leaves_no_file(tmp_path) -> None:
    out = tmp_path / "empty.mp4"
    sink = VideoSink(str(out), 10.0, (160, 120))
    assert sink.close() is None
    assert not out.exists() and not partial_path(out).exists()


def test_new_run_does_not_reuse_a_stale_partial_file(tmp_path) -> None:
    out = tmp_path / "review.mp4"
    partial_path(out).write_bytes(b"left over from a killed run")
    sink = VideoSink(str(out), 10.0, (160, 120))
    sink.write(np.zeros((120, 160, 3), np.uint8))
    sink.close()
    assert "moov" in top_level_boxes(out)
