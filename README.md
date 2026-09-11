# 📸 Punchcard Scanner

A lightweight, premium web-based tool designed to digitize physical knitting punchcards and craft charts from photos. It transforms skewed, low-resolution photographs of physical charts into clean, 1-to-1 pixel binary images (1-bit black & white PNGs) ready for use with AYAB (All Yarns Are Beautiful), computer-aided knitting machines, and digital craft workflows.

---

## ✨ Features

- **Drag & Drop Upload**: Seamlessly drop any photo of a punchcard or chart to begin calibration.
- **Multiple Pattern Types**:
  - 🕳️ **Punchcard**: Designed for physical punchcards with circular punched holes. Uses central radial sampling with an adjustable neighborhood radius.
  - ❌ **Cross Stitch Embroidery**: Designed for charts where stitches are marked by crosses (`X`), plusses (`+`), slashes, or symbols inside grid squares. Uses border-margin insetting to ignore printed chart dividing lines, multi-sample stroke coverage detection, and diagonal cross alignment.
  - ⬛ **Crochet Filet**: Designed for mesh charts where filled blocks are solid/shaded squares and open blocks are empty mesh. Evaluates overall square area fill coverage with margin insetting.
- **Auto & Manual Corner Calibration**: Automatically detects boundary corners of the physical card or chart on upload using a custom ray-scanning algorithm. Draggable anchor pins (Top-Left, Top-Right, Bottom-Left, Bottom-Right) allow manual fine-tuning for perspective correction.
- **Dynamic Grid Settings**: Adjust Columns (stitches) and Rows (height) to match standard knitting card sizes (e.g., 24 columns for standard Brother punchcards) or custom embroidery/crochet charts.
- **Adaptive Image Tuning**:
  - **Scan Threshold**: Real-time slider to control binary brightness cutoff.
  - **Sampling Width** (Punchcard): Adjust the circular pixel radius sampled at hole centers.
  - **Mark Sensitivity** (Cross Stitch): Minimum stroke coverage inside the cell required to detect a stitch.
  - **Fill Coverage** (Crochet Filet): Minimum square fill density required to classify as a solid mesh block.
  - **Border Inset Margin** (Cross Stitch & Filet): Insets sampling from cell borders to prevent chart dividing lines from triggering false stitches.
  - **Invert Polarity**: Reverses binary mapping for light-on-dark patterns (e.g., backlit holes, negative charts, or white-on-dark filet patterns).
- **Manual Pixel Editing**: Interactive draw/erase canvas. Click a cell to toggle it, or drag across the grid to paint/erase multiple cells based on the first clicked cell.
- **Safety State Locking**: Entering Edit Mode automatically locks all calibration inputs (pattern type, columns, rows, tuning sliders, inversion) and disables corner handle dragging to safeguard your manual corrections.
- **Reset to Scan**: A dedicated button unlocks calibration parameters and restores the original digitized scan from the photo coordinates.
- **Pure Client-Side Processing**: Fast processing done entirely in the browser using HTML5 Canvas—no servers or databases needed.
- **1-Bit PNG Export**: One-click download of a precise, downscaled PNG containing exactly one pixel per cell (e.g., a 24x60 image file).

---

## 🛠️ How It Works

1. **Ray-Scanning Corner Detection**:
   When an image is imported or the "Auto-Detect" button is clicked, the application downsamples the photo to perform fast analysis. It samples baseline background colors from the extreme corners, then scans inwards along diagonal rays. When the luminance difference between scanned pixels and the baseline exceeds a threshold (confirmed by neighboring pixels), it identifies the card/chart boundary and maps the four outer corners.
2. **Bilinear Interpolation**:
   When you position the corner pins, the application maps the four corners of a regular grid `(0,0)` to `(W,H)` onto the arbitrary quadrilateral in the photo coordinates. For each cell in the target grid, it performs a bilinear mapping to find the exact source pixel coordinate in the high-resolution photo.
3. **Pattern-Specific Digitization Algorithms**:
   - **Punchcard**: Evaluates pixels in a circular disk around the cell center, averaging RGB luminance and comparing against the threshold.
   - **Cross Stitch**: Insets sampling from the cell borders by the user-specified margin (default 18%) to avoid printed gridlines. Evaluates a 7x7 sample matrix inside the cell for stroke density, diagonal cross energy (`X`), and plus energy (`+`). Flags the cell if stroke ratio meets sensitivity or diagonal/cross alignment is detected.
   - **Crochet Filet**: Insets sampling from cell borders and samples a 7x7 matrix across the square to measure fill ratio. Flags the cell as solid if fill coverage meets the threshold (default 40%), filtering out paper creases, light smudges, or pencil marks.
   - **Polarity Inversion**: When enabled, inverts the luminance comparator so that bright marks are digitized as active pixels.
4. **Manual Edit Mode & Safety Locking**:
   Clicking or dragging on the digitized preview canvas switches the app into an edited state. To protect the user's manual adjustments, any code recalculations via `digitize()` are bypassed, and inputs in the sidebar and corner-handle dragging are disabled. Clicking "Reset to Scan" sets the edited state back to false, unlocks the controls, and re-triggers standard digitizing of the original photo.

---

## 💡 Tips for Best Calibration & Scan Results

### 1. Auto-Corner Detection Optimization
- **Contrast**: Place the light-colored paper punchcard or chart on a dark table, floor, or surface. The algorithm detects the boundary using luminance gradients.
- **Lighting**: Ensure diffuse, even lighting. Heavy directional shadows or bright glares across the corners can lead to false edge triggers.
- **Framing**: Keep all four corners of the card or chart fully visible inside the bounds of the photo. Do not crop out the margins.

### 2. Pattern-Specific Tips
- **Punchcards**: Adjust **Sampling Width** so the sampling disk stays inside the punched holes.
- **Cross Stitch Charts**: If dividing grid lines on the chart are falsely triggering as stitches, increase **Border Inset Margin**. If faint pencil or printer crosses are missed, lower **Mark Sensitivity** or increase **Threshold**.
- **Crochet Filet**: Adjust **Fill Coverage** (default 40%) to ensure open mesh squares remain empty and filled mesh squares are detected, even with textured or hand-shaded charts.
- **Backlit / Inverted Material**: Use **Invert Polarity** if your punched card is photographed with light shining through the holes, or if working with dark-mode/negative charts.

---

## 🚀 Running Locally

The app uses standard vanilla HTML, CSS, and JS. It requires a local server to read image files securely using the JavaScript `FileReader` API.

You can launch a local server using Python (pre-installed on macOS/Linux):

```bash
python3 -m http.server 8123
```

Then, open your browser and navigate to:
[http://localhost:8123](http://localhost:8123)

---

## 📂 Project Structure

- [index.html](file:///Users/anna/GitHub/punchcard-scanner/index.html) - Structural markup, pattern type selector, grid inputs, controls panel, and help modal overlay.
- [app.js](file:///Users/anna/GitHub/punchcard-scanner/app.js) - Corner calibration, bilinear mapping, pattern-specific sampling algorithms (punchcard, cross stitch, crochet filet), canvas rendering, and export logic.
- [styles.css](file:///Users/anna/GitHub/punchcard-scanner/styles.css) - Styling, glassmorphic layout, dark mode aesthetic, and modal animations.
