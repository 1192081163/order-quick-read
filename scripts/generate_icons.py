from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
ASSETS_DIR = ROOT / "assets"
PNG_PATH = ASSETS_DIR / "app_icon.png"
ICO_PATH = ASSETS_DIR / "app_icon.ico"
ICNS_PATH = ASSETS_DIR / "app_icon.icns"


def main() -> None:
    ASSETS_DIR.mkdir(exist_ok=True)
    icon = draw_icon(1024)
    icon.save(PNG_PATH)
    icon.save(
        ICO_PATH,
        sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )
    write_icns(icon)


def draw_icon(size: int) -> Image.Image:
    scale = size / 1024
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))

    background_rect = tuple(round(value * scale) for value in (72, 72, 952, 952))
    radius = round(202 * scale)
    background_mask = Image.new("L", (size, size), 0)
    mask_draw = ImageDraw.Draw(background_mask)
    mask_draw.rounded_rectangle(background_rect, radius=radius, fill=255)

    shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle(
        tuple(round(value * scale) for value in (92, 112, 952, 972)),
        radius=radius,
        fill=(10, 24, 32, 90),
    )
    image.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(round(26 * scale))))

    gradient = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    pixels = gradient.load()
    start = (23, 93, 105)
    end = (32, 128, 115)
    for y in range(background_rect[1], background_rect[3]):
        for x in range(background_rect[0], background_rect[2]):
            t = ((x - background_rect[0]) + (y - background_rect[1])) / (
                (background_rect[2] - background_rect[0]) + (background_rect[3] - background_rect[1])
            )
            color = tuple(round(start[index] + (end[index] - start[index]) * t) for index in range(3))
            pixels[x, y] = (*color, 255)
    gradient.putalpha(background_mask)
    image.alpha_composite(gradient)

    draw = ImageDraw.Draw(image)
    s = scale

    draw.rounded_rectangle(
        tuple(round(value * s) for value in (220, 284, 728, 620)),
        radius=round(72 * s),
        fill=(255, 255, 255, 255),
    )
    draw.line(
        [point(s, 270, 354), point(s, 474, 512), point(s, 680, 354)],
        fill=(154, 179, 189, 255),
        width=round(34 * s),
        joint="curve",
    )

    draw.rounded_rectangle(
        tuple(round(value * s) for value in (540, 448, 832, 816)),
        radius=round(48 * s),
        fill=(233, 255, 245, 255),
        outline=(34, 160, 107, 255),
        width=round(34 * s),
    )
    draw.line(
        [point(s, 610, 560), point(s, 762, 560)],
        fill=(34, 160, 107, 255),
        width=round(28 * s),
    )
    draw.line(
        [point(s, 610, 660), point(s, 762, 660)],
        fill=(34, 160, 107, 255),
        width=round(28 * s),
    )

    return image


def point(scale: float, x: int, y: int) -> tuple[int, int]:
    return (round(x * scale), round(y * scale))


def write_icns(icon: Image.Image) -> None:
    iconutil = shutil.which("iconutil")
    if not iconutil:
        raise RuntimeError("iconutil is required to generate app_icon.icns on macOS")

    iconset = ASSETS_DIR / "app_icon.iconset"
    if iconset.exists():
        shutil.rmtree(iconset)
    iconset.mkdir()

    pairs = [
        (16, "icon_16x16.png"),
        (32, "icon_16x16@2x.png"),
        (32, "icon_32x32.png"),
        (64, "icon_32x32@2x.png"),
        (128, "icon_128x128.png"),
        (256, "icon_128x128@2x.png"),
        (256, "icon_256x256.png"),
        (512, "icon_256x256@2x.png"),
        (512, "icon_512x512.png"),
        (1024, "icon_512x512@2x.png"),
    ]
    for pixel_size, filename in pairs:
        icon.resize((pixel_size, pixel_size), Image.Resampling.LANCZOS).save(iconset / filename)

    try:
        subprocess.run(
            [iconutil, "-c", "icns", str(iconset), "-o", str(ICNS_PATH)],
            check=True,
        )
    finally:
        shutil.rmtree(iconset, ignore_errors=True)


if __name__ == "__main__":
    main()
