"""Generate a 1-minute French explainer video about NotebookLM.

Audio: synthesized soft background tone per slide (no external TTS required).
Narration text is displayed as subtitles on each slide.
"""

import os
import struct
import wave
from pathlib import Path

import numpy as np
from moviepy import AudioFileClip, ColorClip, CompositeVideoClip, ImageClip, concatenate_videoclips
from PIL import Image, ImageDraw, ImageFont

OUTPUT_DIR = Path("video_assets")
OUTPUT_DIR.mkdir(exist_ok=True)

# --------------------------------------------------------------------------- #
# Slides: (title, body, accent_color, duration_sec, subtitle)
# --------------------------------------------------------------------------- #
SLIDES = [
    (
        "NotebookLM",
        "L'assistant IA de Google\npour vos documents",
        (30, 120, 200),
        10,
        "NotebookLM est un assistant IA développé par Google\n"
        "pour vous aider à comprendre et explorer vos propres documents.",
    ),
    (
        "Comment ça marche ?",
        "1. Importez vos sources\n   PDFs · Sites web · YouTube · Audio\n"
        "2. NotebookLM les analyse\n3. Posez vos questions",
        (20, 140, 100),
        12,
        "Importez vos sources, NotebookLM les analyse,\n"
        "puis posez-lui n'importe quelle question sur leur contenu.",
    ),
    (
        "Fonctionnalités clés",
        "✦  Résumés automatiques\n"
        "✦  Chat avec vos documents\n"
        "✦  Guides d'étude\n"
        "✦  Podcast généré par l'IA",
        (140, 50, 180),
        12,
        "Résumés, chat interactif, guides d'étude,\n"
        "et même génération de podcasts audio à partir de vos sources.",
    ),
    (
        "NotebookLM en Python",
        "pip install notebooklm-py\n\n"
        "→ Créez des notebooks\n"
        "→ Ajoutez des sources\n"
        "→ Intégrez dans vos apps",
        (180, 90, 20),
        12,
        "Avec notebooklm-py, pilotez NotebookLM depuis votre code Python :\n"
        "créez des notebooks, ajoutez des sources, intégrez l'IA dans vos apps.",
    ),
    (
        "Pour qui ?",
        "🎓  Étudiants & chercheurs\n"
        "💼  Professionnels\n"
        "✍️   Créateurs de contenu\n"
        "👩‍💻  Développeurs",
        (10, 100, 150),
        10,
        "NotebookLM s'adresse à tous : étudiants, chercheurs,\n"
        "professionnels, créateurs et développeurs.",
    ),
    (
        "Essayez maintenant !",
        "notebooklm.google.com\n\npip install notebooklm-py",
        (50, 50, 50),
        8,
        "Rendez-vous sur notebooklm.google.com ou installez\n"
        "notebooklm-py pour l'intégrer dans vos projets !",
    ),
]

W, H = 1280, 720
BG_COLOR = (15, 15, 30)
SUBTITLE_H = 110  # height reserved at bottom for subtitles
SAMPLE_RATE = 44100


def make_frame(title: str, body: str, accent: tuple, subtitle: str) -> Image.Image:
    img = Image.new("RGB", (W, H), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # Accent bars
    draw.rectangle([(0, 0), (W, 8)], fill=accent)
    draw.rectangle([(0, H - SUBTITLE_H - 4), (W, H - SUBTITLE_H)], fill=accent)

    # Subtitle background
    draw.rectangle([(0, H - SUBTITLE_H), (W, H)], fill=(5, 5, 20))

    # Left accent stripe
    draw.rectangle([(60, 80), (68, H - SUBTITLE_H - 20)], fill=accent)

    try:
        font_title = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 58)
        font_body = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 34)
        font_sub = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 28)
    except OSError:
        font_title = ImageFont.load_default()
        font_body = ImageFont.load_default()
        font_sub = ImageFont.load_default()

    # Title
    draw.text((96, 90), title, font=font_title, fill=(255, 255, 255))
    bbox = draw.textbbox((96, 90), title, font=font_title)
    draw.rectangle([(96, bbox[3] + 10), (min(bbox[2], W - 60), bbox[3] + 14)], fill=accent)

    # Body
    y = bbox[3] + 50
    for line in body.split("\n"):
        draw.text((96, y), line, font=font_body, fill=(210, 220, 240))
        y += 48

    # Subtitles
    sub_y = H - SUBTITLE_H + 16
    for line in subtitle.split("\n"):
        bbox_s = draw.textbbox((0, 0), line, font=font_sub)
        x_center = (W - (bbox_s[2] - bbox_s[0])) // 2
        draw.text((x_center, sub_y), line, font=font_sub, fill=(230, 230, 180))
        sub_y += 38

    return img


def make_tone_audio(duration: float, freq: float, path: Path) -> None:
    """Generate a gentle soft pad tone as background audio."""
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)

    # Soft chord: fundamental + fifth + octave, gentle fade in/out
    wave_data = (
        0.18 * np.sin(2 * np.pi * freq * t)
        + 0.10 * np.sin(2 * np.pi * freq * 1.5 * t)
        + 0.06 * np.sin(2 * np.pi * freq * 2.0 * t)
    )

    # Envelope: fade in 0.4s, fade out 0.6s
    fade_in = int(0.4 * SAMPLE_RATE)
    fade_out = int(0.6 * SAMPLE_RATE)
    envelope = np.ones(len(t))
    envelope[:fade_in] = np.linspace(0, 1, fade_in)
    envelope[-fade_out:] = np.linspace(1, 0, fade_out)
    wave_data *= envelope

    samples = (wave_data * 32767).astype(np.int16)

    with wave.open(str(path), "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(samples.tobytes())


# Base frequencies (pentatonic scale) for each slide
FREQS = [261.6, 293.7, 329.6, 392.0, 440.0, 523.3]


def build_slide_clip(idx: int, title: str, body: str, accent: tuple, duration: int, subtitle: str):
    img_path = OUTPUT_DIR / f"slide_{idx:02d}.png"
    audio_path = OUTPUT_DIR / f"audio_{idx:02d}.wav"

    print(f"  Slide {idx + 1}/{len(SLIDES)}: {title!r}  ({duration}s)")

    frame = make_frame(title, body, accent, subtitle)
    frame.save(str(img_path))

    make_tone_audio(float(duration), FREQS[idx % len(FREQS)], audio_path)

    img_clip = ImageClip(str(img_path)).with_duration(duration)
    audio_clip = AudioFileClip(str(audio_path)).with_duration(duration)
    return img_clip.with_audio(audio_clip)


def main():
    print("Building slides...")
    clips = [build_slide_clip(i, *slide) for i, slide in enumerate(SLIDES)]

    total = sum(s[3] for s in SLIDES)
    print(f"\nTotal duration: {total}s ({total/60:.1f} min)")

    print("Concatenating clips...")
    final = concatenate_videoclips(clips, method="compose")

    out = "notebooklm_explainer.mp4"
    print(f"Rendering → {out}")
    final.write_videofile(out, fps=24, codec="libx264", audio_codec="aac", logger=None)
    print(f"\nDone! Video saved: {out}  ({final.duration:.1f}s)")


if __name__ == "__main__":
    main()
