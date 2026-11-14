"""Prints the inline SVG for the essay's Hilbert figure: the curve on 2x2, 4x4 and 8x8 grids.
Colours are set on the SVG itself (currentColor), so it draws correctly even before or without the stylesheet, in light and dark mode.
usage: python3 hilbert_figure.py > /tmp/hilbert.svg"""
def d2xy(n, d):
    x = y = 0; s = 1; t = d
    while s < n:
        rx = 1 & (t // 2); ry = 1 & (t ^ rx)
        if ry == 0:
            if rx == 1: x, y = s - 1 - x, s - 1 - y
            x, y = y, x
        x += s * rx; y += s * ry; t //= 4; s *= 2
    return x, y
W, GAP = 200, 40
parts = []
for k, n in enumerate((2, 4, 8)):
    ox, c = k * (W + GAP), W / n
    grid = ''.join(f'<rect x="{ox + i*c:.2f}" y="{j*c:.2f}" width="{c:.2f}" height="{c:.2f}"/>' for i in range(n) for j in range(n))
    pts = ' '.join(f'{ox + (x + .5)*c:.2f},{W - (y + .5)*c:.2f}' for x, y in (d2xy(n, d) for d in range(n*n)))
    parts.append(f'<g class="h-grid" fill="none" stroke="currentColor" stroke-opacity="0.18" stroke-width="1">{grid}</g>'
                 f'<polyline class="h-line" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" points="{pts}"/>')
print(f'<svg viewBox="-4 -4 {3*W + 2*GAP + 8} {W + 8}" role="img" aria-label="Hilbert\'s curve on grids of 4, 16 and 64 squares: each version is four copies of the one before, joined end to end.">' + ''.join(parts) + '</svg>')
