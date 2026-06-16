from __future__ import annotations

from PySide6.QtCore import QPointF, QRectF, Qt
from PySide6.QtGui import QColor, QIcon, QLinearGradient, QPainter, QPainterPath, QPen, QPixmap


def create_app_icon(size: int = 256) -> QIcon:
    pixmap = QPixmap(size, size)
    pixmap.fill(Qt.GlobalColor.transparent)

    painter = QPainter(pixmap)
    painter.setRenderHint(QPainter.RenderHint.Antialiasing, True)

    scale = size / 256
    background = QRectF(18 * scale, 18 * scale, 220 * scale, 220 * scale)
    gradient = QLinearGradient(background.topLeft(), background.bottomRight())
    gradient.setColorAt(0, QColor("#175d69"))
    gradient.setColorAt(1, QColor("#208073"))

    painter.setPen(Qt.PenStyle.NoPen)
    painter.setBrush(gradient)
    painter.drawRoundedRect(background, 50 * scale, 50 * scale)

    shadow = QColor(0, 0, 0, 34)
    painter.setBrush(shadow)
    painter.drawRoundedRect(QRectF(58 * scale, 76 * scale, 120 * scale, 78 * scale), 18 * scale, 18 * scale)

    envelope = QRectF(54 * scale, 70 * scale, 128 * scale, 86 * scale)
    painter.setBrush(QColor("#ffffff"))
    painter.drawRoundedRect(envelope, 18 * scale, 18 * scale)

    flap = QPainterPath()
    flap.moveTo(QPointF(66 * scale, 88 * scale))
    flap.lineTo(QPointF(118 * scale, 128 * scale))
    flap.lineTo(QPointF(170 * scale, 88 * scale))
    painter.setPen(QPen(QColor("#9ab3bd"), 8 * scale, Qt.PenStyle.SolidLine, Qt.PenCapStyle.RoundCap))
    painter.setBrush(Qt.BrushStyle.NoBrush)
    painter.drawPath(flap)

    sheet = QRectF(136 * scale, 112 * scale, 72 * scale, 92 * scale)
    painter.setPen(QPen(QColor("#22a06b"), 8 * scale, Qt.PenStyle.SolidLine, Qt.PenCapStyle.RoundCap))
    painter.setBrush(QColor("#e9fff5"))
    painter.drawRoundedRect(sheet, 12 * scale, 12 * scale)

    painter.setPen(QPen(QColor("#22a06b"), 7 * scale, Qt.PenStyle.SolidLine, Qt.PenCapStyle.RoundCap))
    painter.drawLine(QPointF(154 * scale, 140 * scale), QPointF(190 * scale, 140 * scale))
    painter.drawLine(QPointF(154 * scale, 164 * scale), QPointF(190 * scale, 164 * scale))

    painter.end()
    return QIcon(pixmap)
