# 📸 Punchcard Scanner

A lightweight, premium web-based tool designed to digitize physical knitting punchcards and charts from photos. It transforms skewed, low-resolution photographs of physical charts into clean, 1-to-1 pixel binary images (1-bit black & white PNGs) ready for use with AYAB (All Yarns Are Beautiful) and computer-aided knitting machines.

---

## ✨ Features

- **Drag & Drop Upload**: Seamlessly drop any photo of a punchcard to begin calibration.
- **Auto & Manual Corner Calibration**: Automatically detects boundary corners of the physical punchcard on upload using a custom ray-scanning algorithm. Draggable anchor pins (Top-Left, Top-Right, Bottom-Left, Bottom-Right) allow manual fine-tuning for perspective correction.
- **Dynamic Grid Settings**: Adjust Columns (stitches) and Rows (height) to match standard knitting card sizes (e.g., 24 columns for standard Brother punchcards).
- **Advanced Image Tuning**:
  - **Scan Threshold**: Real-time slider to control binary brightness cutoff (black/white selection).
  - **Sampling Width**: Adjust the neighborhood pixel radius to average out noise, dust, and physical card imperfections.
- **Manual Pixel Editing**: Interactive draw/erase canvas. Click a cell to toggle it, or drag across the grid to paint/erase multiple cells based on the first clicked cell.
- **Safety State Locking**: Entering Edit Mode automatically locks all calibration inputs (columns, rows, threshold, radius) and disables corner handle dragging to safeguard your manual corrections.
- **Reset to Scan**: A dedicated button unlocks calibration parameters and restores the original digitized scan from the photo coordinates.
- **Pure Client-Side Processing**: Fast processing done entirely in the browser using HTML5 Canvas—no servers or databases needed.
- **1-Bit PNG Export**: One-click download of a precise, downscaled PNG containing exactly one pixel per cell (e.g., a 24x60 image file).

---

## 🛠️ How It Works

1. **Ray-Scanning Corner Detection**:
   When an image is imported or the "Auto-Detect" button is clicked, the application downsamples the photo to perform fast analysis. It samples baseline background colors from the extreme corners, then scans inwards along diagonal rays. When the luminance difference between scanned pixels and the baseline exceeds a threshold (confirmed by neighboring pixels), it identifies the punchcard boundary and maps the four outer corners.
2. **Bilinear Interpolation**:
   When you position the corner pins, the application maps the four corners of a regular grid `(0,0)` to `(W,H)` onto the arbitrary quadrilateral in the photo coordinates. For each cell in the target grid, it performs a bilinear mapping to find the exact source pixel coordinate in the high-resolution photo.
3. **Neighborhood Sampling**:
   To prevent single pixel noise or photo artifacts from distorting the scan, the app samples pixels in a window (customizable via *Sampling Width*) around the mapped coordinate and averages their RGB values.
4. **Thresholding**:
   The average color is converted to grayscale (`Y = 0.299R + 0.587G + 0.114B`) and thresholded against the user's *Scan Threshold* value to yield either a `1` (black) or `0` (white) pixel value.
5. **Manual Edit Mode & Safety Locking**:
   Clicking or dragging on the digitized preview canvas switches the app into an edited state. To protect the user's manual adjustments, any code recalculations via `digitize()` are bypassed, and inputs in the sidebar and corner-handle dragging are disabled. Clicking "Reset to Scan" sets the edited state back to false, unlocks the controls, and re-triggers standard digitizing of the original photo.

---

## 💡 Tips for Best Calibration & Scan Results

### 1. Auto-Corner Detection Optimization
To achieve the highest accuracy with the ray-scanning automatic corner detector:
- **Contrast**: Place the light-colored paper punchcard on a dark table, floor, or surface. The algorithm detects the boundary using luminance gradients.
- **Lighting**: Ensure diffuse, even lighting. Heavy directional shadows or bright glares across the corners of the card can lead to false edge triggers.
- **Framing**: Keep all four corners of the punchcard fully visible inside the bounds of the photo. Do not crop out the margins.

### 2. Manual Fine-Tuning
- If the auto-calibration is slightly offset, you can easily drag the TL, TR, BL, or BR pins directly on the source image to align the grid boundaries.
- Adjust the **Scan Threshold** and **Sampling Width** sliders to clean up speckling or ink fading on old cards before you export.

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

- [index.html](file:///Users/anna/GitHub/punchcard-scanner/index.html) - Structural markup, grid inputs, controls panel, and help modal overlay.
- [app.js](file:///Users/anna/GitHub/punchcard-scanner/app.js) - Corner calibration, bilinear mapping, neighborhood pixel sampling, canvas rendering, and export logic.
- [styles.css](file:///Users/anna/GitHub/punchcard-scanner/styles.css) - Styling, glassmorphic layout, dark mode aesthetic, and modal animations.
