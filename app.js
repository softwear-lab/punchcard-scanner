document.addEventListener('DOMContentLoaded', () => {
    // --- State Variables ---
    let digiImage = null;
    let digiHandles = [];
    let activeDigiHandle = -1;
    let digitizedGrid = [];
    let isEdited = false;
    let isDrawing = false;
    let drawValue = 0;
    
    // --- DOM Elements ---
    const digiDropZone = document.getElementById('digitizer-drop-zone');
    const digiFileInput = document.getElementById('digitizer-file-input');
    const digiColsInput = document.getElementById('digi-cols');
    const digiRowsInput = document.getElementById('digi-rows');
    const digiThresholdSlider = document.getElementById('digitizer-threshold-slider') ? document.getElementById('digitizer-threshold-slider') : document.getElementById('digi-threshold-slider');
    const digiThresholdVal = document.getElementById('digi-threshold-val');
    const digiRadiusSlider = document.getElementById('digi-radius-slider');
    const digiRadiusVal = document.getElementById('digi-radius-val');
    const canvasDigiSource = document.getElementById('canvas-digitizer-source');
    const canvasDigiPreview = document.getElementById('canvas-digitizer-preview');
    const btnDownloadDigitized = document.getElementById('btn-download-digitized');
    const toast = document.getElementById('toast');
    const editModeStatus = document.getElementById('edit-mode-status');
    const btnResetScan = document.getElementById('btn-reset-scan');
    const chkGridlines = document.getElementById('chk-gridlines');
    const btnAutoDetect = document.getElementById('btn-auto-detect');

    // --- Drag & Drop File Selection ---
    digiDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        digiDropZone.classList.add('drag-over');
    });
    
    digiDropZone.addEventListener('dragleave', () => {
        digiDropZone.classList.remove('drag-over');
    });
    
    digiDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        digiDropZone.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) {
            handleDigitizerFile(e.dataTransfer.files[0]);
        }
    });
    
    digiFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleDigitizerFile(e.target.files[0]);
        }
    });
    
    // --- Form Controls Listeners ---
    [digiColsInput, digiRowsInput, digiThresholdSlider, digiRadiusSlider].forEach(el => {
        el.addEventListener('input', () => {
            if (el === digiThresholdSlider) digiThresholdVal.textContent = el.value;
            if (el === digiRadiusSlider) digiRadiusVal.textContent = el.value + 'px';
            
            if (digiImage) {
                digitize();
                drawDigitizerOverlay();
            }
        });
    });

    function handleDigitizerFile(file) {
        if (!file.type.startsWith('image/')) {
            showToast('❌ Please upload a valid image file.', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                digiImage = img;
                
                // Scale canvas size dynamically to fit viewport (max width 540px display scale)
                const displayWidth = Math.min(540, img.width);
                const scale = displayWidth / img.width;
                canvasDigiSource.width = displayWidth;
                canvasDigiSource.height = img.height * scale;
                
                // Hide placeholder
                const srcPlaceholder = document.getElementById('digi-src-placeholder');
                if (srcPlaceholder) srcPlaceholder.classList.add('hidden');
                
                activeDigiHandle = -1;
                btnDownloadDigitized.disabled = false;
                if (btnAutoDetect) btnAutoDetect.disabled = false;
                
                setEditMode(false);
                detectCorners();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    // --- Mouse & Touch Coordinates Tracking ---
    canvasDigiSource.addEventListener('mousedown', startDrag);
    canvasDigiSource.addEventListener('mousemove', drag);
    window.addEventListener('mouseup', endDrag);
    
    canvasDigiSource.addEventListener('touchstart', (e) => {
        startDrag(e);
        e.preventDefault();
    }, { passive: false });
    canvasDigiSource.addEventListener('touchmove', (e) => {
        drag(e);
        e.preventDefault();
    }, { passive: false });
    window.addEventListener('touchend', endDrag);
    
    function startDrag(e) {
        if (!digiImage || digiHandles.length === 0 || isEdited) return;
        const pos = getCanvasMousePos(canvasDigiSource, e);
        
        // Find closest handle within a click radius of 25px
        let minDistance = 25;
        let idx = -1;
        for (let i = 0; i < digiHandles.length; i++) {
            const d = Math.hypot(pos.x - digiHandles[i].x, pos.y - digiHandles[i].y);
            if (d < minDistance) {
                minDistance = d;
                idx = i;
            }
        }
        activeDigiHandle = idx;
    }
    
    function drag(e) {
        if (activeDigiHandle === -1 || !digiImage) return;
        const pos = getCanvasMousePos(canvasDigiSource, e);
        
        // Bounds checking within source canvas boundaries
        digiHandles[activeDigiHandle].x = Math.max(0, Math.min(canvasDigiSource.width, pos.x));
        digiHandles[activeDigiHandle].y = Math.max(0, Math.min(canvasDigiSource.height, pos.y));
        
        drawDigitizerOverlay();
        digitize();
    }
    
    function endDrag() {
        activeDigiHandle = -1;
    }
    
    function getCanvasMousePos(canvas, e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: (clientX - rect.left) * (canvas.width / rect.width),
            y: (clientY - rect.top) * (canvas.height / rect.height)
        };
    }
    
    // --- Render Overlay Guidelines ---
    function drawDigitizerOverlay() {
        if (!digiImage) return;
        const ctx = canvasDigiSource.getContext('2d');
        ctx.drawImage(digiImage, 0, 0, canvasDigiSource.width, canvasDigiSource.height);
        
        const tl = digiHandles[0];
        const tr = digiHandles[1];
        const bl = digiHandles[2];
        const br = digiHandles[3];
        
        const cols = parseInt(digiColsInput.value) || 24;
        const rows = parseInt(digiRowsInput.value) || 60;
        
        // Guidelines grid lines
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)'; // cyan grid overlay
        ctx.lineWidth = 1.0;
        
        // Columns
        for (let c = 0; c <= cols; c++) {
            const u = c / cols;
            const topX = tl.x * (1 - u) + tr.x * u;
            const topY = tl.y * (1 - u) + tr.y * u;
            const botX = bl.x * (1 - u) + br.x * u;
            const botY = bl.y * (1 - u) + br.y * u;
            
            ctx.beginPath();
            ctx.moveTo(topX, topY);
            ctx.lineTo(botX, botY);
            ctx.stroke();
        }
        
        // Rows
        for (let r = 0; r <= rows; r++) {
            const v = r / rows;
            const leftX = tl.x * (1 - v) + bl.x * v;
            const leftY = tl.y * (1 - v) + bl.y * v;
            const rightX = tr.x * (1 - v) + br.x * v;
            const rightY = tr.y * (1 - v) + br.y * v;
            
            ctx.beginPath();
            ctx.moveTo(leftX, leftY);
            ctx.lineTo(rightX, rightY);
            ctx.stroke();
        }
        
        // Boundary border (rose)
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.85)';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(tl.x, tl.y);
        ctx.lineTo(tr.x, tr.y);
        ctx.lineTo(br.x, br.y);
        ctx.lineTo(bl.x, bl.y);
        ctx.closePath();
        ctx.stroke();
        
        // Drag handles
        digiHandles.forEach((h, idx) => {
            ctx.fillStyle = activeDigiHandle === idx ? '#f43f5e' : '#38bdf8';
            ctx.strokeStyle = '#0d1117';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(h.x, h.y, 8, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
            
            // Labels
            ctx.fillStyle = '#f0f6fc';
            ctx.font = 'bold 11px "JetBrains Mono", monospace';
            ctx.shadowColor = '#000000';
            ctx.shadowBlur = 4;
            ctx.fillText(h.label, h.x + 10, h.y + 4);
            ctx.shadowBlur = 0;
        });
    }
    
    // --- Bilinear Mapping & Digitization ---
    function digitize() {
        try {
            if (!digiImage) return;
            if (isEdited) return;
            
            const cols = parseInt(digiColsInput.value) || 24;
            const rows = parseInt(digiRowsInput.value) || 60;
            const threshold = parseInt(digiThresholdSlider.value) || 128;
            const radius = parseInt(digiRadiusSlider.value) || 3;
            
            // Offscreen high-res canvas
            const offCanvas = document.createElement('canvas');
            offCanvas.width = digiImage.width;
            offCanvas.height = digiImage.height;
            const offCtx = offCanvas.getContext('2d');
            offCtx.drawImage(digiImage, 0, 0);
            const imgData = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height);
            const pixels = imgData.data;
            
            // Scale handles back to image space coordinates
            const scaleX = digiImage.width / canvasDigiSource.width;
            const scaleY = digiImage.height / canvasDigiSource.height;
            
            const qTL = { x: digiHandles[0].x * scaleX, y: digiHandles[0].y * scaleY };
            const qTR = { x: digiHandles[1].x * scaleX, y: digiHandles[1].y * scaleY };
            const qBL = { x: digiHandles[2].x * scaleX, y: digiHandles[2].y * scaleY };
            const qBR = { x: digiHandles[3].x * scaleX, y: digiHandles[3].y * scaleY };
            
            digitizedGrid = [];
            
            for (let r = 0; r < rows; r++) {
                const gridRow = [];
                const v = (r + 0.5) / rows;
                
                for (let c = 0; c < cols; c++) {
                    const u = (c + 0.5) / cols;
                    
                    // Bilinear interpolation
                    const topX = qTL.x * (1 - u) + qTR.x * u;
                    const topY = qTL.y * (1 - u) + qTR.y * u;
                    const botX = qBL.x * (1 - u) + qBR.x * u;
                    const botY = qBL.y * (1 - u) + qBR.y * u;
                    
                    const targetX = Math.round(topX * (1 - v) + botX * v);
                    const targetY = Math.round(topY * (1 - v) + botY * v);
                    
                    let rSum = 0, gSum = 0, bSum = 0;
                    let count = 0;
                    
                    for (let dy = -radius; dy <= radius; dy++) {
                        const sy = targetY + dy;
                        if (sy < 0 || sy >= digiImage.height) continue;
                        
                        for (let dx = -radius; dx <= radius; dx++) {
                            const sx = targetX + dx;
                            if (sx < 0 || sx >= digiImage.width) continue;
                            
                            const pixelIdx = (sy * digiImage.width + sx) * 4;
                            rSum += pixels[pixelIdx];
                            gSum += pixels[pixelIdx + 1];
                            bSum += pixels[pixelIdx + 2];
                            count++;
                        }
                    }
                    
                    let val = 0;
                    if (count > 0) {
                        const avgR = rSum / count;
                        const avgG = gSum / count;
                        const avgB = bSum / count;
                        const gray = 0.299 * avgR + 0.587 * avgG + 0.114 * avgB;
                        val = (gray < threshold) ? 1 : 0;
                    }
                    gridRow.push(val);
                }
                digitizedGrid.push(gridRow);
            }
            
            drawGridToCanvas(digitizedGrid, canvasDigiPreview);
        } catch (err) {
            showToast('❌ Scanner error: ' + err.message, 'error');
            console.error(err);
        }
    }
    
    function drawGridToCanvas(grid, canvas) {
        if (!grid || grid.length === 0) return;
        const h = grid.length;
        const w = grid[0].length;
        
        const maxDisplayWidth = 320;
        const pixelScale = Math.max(1, Math.floor(maxDisplayWidth / w));
        
        canvas.width = w * pixelScale;
        canvas.height = h * pixelScale;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        
        const container = canvas.parentElement;
        const placeholder = container.querySelector('.canvas-placeholder');
        if (placeholder) placeholder.classList.add('hidden');
        
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                ctx.fillStyle = grid[y][x] === 1 ? '#000000' : '#ffffff';
                ctx.fillRect(x * pixelScale, y * pixelScale, pixelScale, pixelScale);
            }
        }

        // Draw gridlines overlay if toggle is checked
        if (chkGridlines && chkGridlines.checked && pixelScale >= 4) {
            ctx.strokeStyle = 'rgba(110, 118, 129, 0.35)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            // Vertical lines
            for (let x = 1; x < w; x++) {
                ctx.moveTo(x * pixelScale, 0);
                ctx.lineTo(x * pixelScale, h * pixelScale);
            }
            // Horizontal lines
            for (let y = 1; y < h; y++) {
                ctx.moveTo(0, y * pixelScale);
                ctx.lineTo(w * pixelScale, y * pixelScale);
            }
            ctx.stroke();
        }
    }
    
    // --- Direct PNG Downloader ---
    btnDownloadDigitized.addEventListener('click', () => {
        if (digitizedGrid.length === 0) return;
        
        const cols = parseInt(digiColsInput.value) || 24;
        const rows = parseInt(digiRowsInput.value) || 60;
        
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = cols;
        exportCanvas.height = rows;
        const ctx = exportCanvas.getContext('2d');
        
        const imgData = ctx.createImageData(cols, rows);
        const data = imgData.data;
        
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const val = digitizedGrid[y][x] === 1 ? 0 : 255;
                const idx = (y * cols + x) * 4;
                data[idx] = val;
                data[idx + 1] = val;
                data[idx + 2] = val;
                data[idx + 3] = 255;
            }
        }
        ctx.putImageData(imgData, 0, 0);
        
        const filename = `digitized_grid_${cols}x${rows}.png`;
        const link = document.createElement('a');
        link.download = filename;
        link.href = exportCanvas.toDataURL('image/png');
        link.click();
        
        showToast('💾 Scanned PNG grid downloaded!', 'success');
    });

    // --- Toast Alert display helper ---
    function showToast(message, type = 'success') {
        toast.querySelector('.toast-message').textContent = message;
        const icon = toast.querySelector('.toast-icon');
        
        if (type === 'success') {
            icon.textContent = '✨';
            toast.style.borderLeftColor = 'var(--accent-success)';
        } else if (type === 'error') {
            icon.textContent = '❌';
            toast.style.borderLeftColor = 'var(--accent-error)';
        }
        
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3500);
    }

    // --- Control Lock/Unlock Helpers ---
    function setEditMode(active) {
        isEdited = active;
        
        // Show/hide status banner
        if (active) {
            if (editModeStatus) editModeStatus.classList.remove('hidden');
        } else {
            if (editModeStatus) editModeStatus.classList.add('hidden');
        }
        
        // Disable/enable sidebar controls
        const elementsToDisable = [
            digiColsInput,
            digiRowsInput,
            digiThresholdSlider,
            digiRadiusSlider,
            digiFileInput,
            btnAutoDetect
        ];
        
        elementsToDisable.forEach(el => {
            if (el) el.disabled = active;
        });
        
        if (active) {
            if (digiDropZone) digiDropZone.classList.add('disabled');
        } else {
            if (digiDropZone) digiDropZone.classList.remove('disabled');
        }
    }

    // --- Automatic Corner Detection (Ray-Scanning) ---
    function detectCorners() {
        if (!digiImage) return;
        
        try {
            // Use downsampled parameters to scan fast
            const scanCanvas = document.createElement('canvas');
            const maxDimension = 600;
            let width = digiImage.width;
            let height = digiImage.height;
            if (width > maxDimension || height > maxDimension) {
                const scale = Math.min(maxDimension / width, maxDimension / height);
                width = Math.round(width * scale);
                height = Math.round(height * scale);
            }
            scanCanvas.width = width;
            scanCanvas.height = height;
            
            const scanCtx = scanCanvas.getContext('2d');
            scanCtx.drawImage(digiImage, 0, 0, width, height);
            
            const imgData = scanCtx.getImageData(0, 0, width, height);
            const pixels = imgData.data;
            
            const getLuminance = (px, py) => {
                const idx = (py * width + px) * 4;
                const r = pixels[idx];
                const g = pixels[idx + 1];
                const b = pixels[idx + 2];
                return 0.299 * r + 0.587 * g + 0.114 * b;
            };
            
            const getBaselineCornerLuminance = (cornerX, cornerY) => {
                let sum = 0;
                let count = 0;
                const radius = 2;
                for (let dy = -radius; dy <= radius; dy++) {
                    const py = cornerY + dy;
                    if (py < 0 || py >= height) continue;
                    for (let dx = -radius; dx <= radius; dx++) {
                        const px = cornerX + dx;
                        if (px < 0 || px >= width) continue;
                        sum += getLuminance(px, py);
                        count++;
                    }
                }
                return count > 0 ? sum / count : getLuminance(cornerX, cornerY);
            };
            
            const scanRayInward = (startX, startY, dx, dy) => {
                const baselineL = getBaselineCornerLuminance(startX, startY);
                const maxSteps = Math.floor(Math.min(width, height) * 0.45);
                const threshold = 35; // Luminance diff to declare card edge hit
                
                for (let t = 5; t < maxSteps; t++) {
                    const px = startX + dx * t;
                    const py = startY + dy * t;
                    if (px < 0 || px >= width || py < 0 || py >= height) break;
                    
                    const L = getLuminance(px, py);
                    if (Math.abs(L - baselineL) > threshold) {
                        let confirmCount = 0;
                        const confirmSteps = 4;
                        for (let k = 1; k <= confirmSteps; k++) {
                            const cx = px + dx * k;
                            const cy = py + dy * k;
                            if (cx >= 0 && cx < width && cy >= 0 && cy < height) {
                                const cL = getLuminance(cx, cy);
                                if (Math.abs(cL - baselineL) > threshold) {
                                    confirmCount++;
                                }
                            }
                        }
                        
                        if (confirmCount >= confirmSteps - 1) {
                            return { x: px / width, y: py / height };
                        }
                    }
                }
                return null;
            };
            
            const tlNorm = scanRayInward(0, 0, 1, 1) || { x: 0.15, y: 0.15 };
            const trNorm = scanRayInward(width - 1, 0, -1, 1) || { x: 0.85, y: 0.15 };
            const blNorm = scanRayInward(0, height - 1, 1, -1) || { x: 0.15, y: 0.85 };
            const brNorm = scanRayInward(width - 1, height - 1, -1, -1) || { x: 0.85, y: 0.85 };
            
            const w = canvasDigiSource.width;
            const h = canvasDigiSource.height;
            
            digiHandles = [
                { x: tlNorm.x * w, y: tlNorm.y * h, label: "TL" },
                { x: trNorm.x * w, y: trNorm.y * h, label: "TR" },
                { x: blNorm.x * w, y: blNorm.y * h, label: "BL" },
                { x: brNorm.x * w, y: brNorm.y * h, label: "BR" }
            ];
            
            drawDigitizerOverlay();
            digitize();
            showToast('📸 Grid scanner ready! Auto-calibrated.', 'success');
        } catch (err) {
            console.error('Corner detection error:', err);
            // Default inset fallback
            const w = canvasDigiSource.width;
            const h = canvasDigiSource.height;
            digiHandles = [
                { x: w * 0.15, y: h * 0.15, label: "TL" },
                { x: w * 0.85, y: h * 0.15, label: "TR" },
                { x: w * 0.15, y: h * 0.85, label: "BL" },
                { x: w * 0.85, y: h * 0.85, label: "BR" }
            ];
            drawDigitizerOverlay();
            digitize();
            showToast('⚠️ Auto-calibrate failed. Corner pins set to default bounds.', 'error');
        }
    }

    // --- Pixel Editing Interaction ---
    function handlePreviewInteraction(e, isStart) {
        if (!digiImage || digitizedGrid.length === 0) return;
        
        const rect = canvasDigiPreview.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        // Translate client coordinates to canvas internal coordinates
        const canvasX = (clientX - rect.left) * (canvasDigiPreview.width / rect.width);
        const canvasY = (clientY - rect.top) * (canvasDigiPreview.height / rect.height);
        
        const rows = digitizedGrid.length;
        const cols = digitizedGrid[0].length;
        
        const cellWidth = canvasDigiPreview.width / cols;
        const cellHeight = canvasDigiPreview.height / rows;
        
        const col = Math.floor(canvasX / cellWidth);
        const row = Math.floor(canvasY / cellHeight);
        
        if (col >= 0 && col < cols && row >= 0 && row < rows) {
            if (isStart) {
                // Enter edit mode if not already
                if (!isEdited) {
                    setEditMode(true);
                    showToast('✏️ Manual edit mode activated', 'success');
                }
                
                isDrawing = true;
                // Toggle cell state and record the new state for dragging
                drawValue = digitizedGrid[row][col] === 1 ? 0 : 1;
                digitizedGrid[row][col] = drawValue;
                
                drawGridToCanvas(digitizedGrid, canvasDigiPreview);
            } else {
                // Dragging: set cell to drawValue if it changed
                if (isDrawing && digitizedGrid[row][col] !== drawValue) {
                    digitizedGrid[row][col] = drawValue;
                    drawGridToCanvas(digitizedGrid, canvasDigiPreview);
                }
            }
        }
    }

    // Bind preview canvas draw listeners
    if (canvasDigiPreview) {
        canvasDigiPreview.addEventListener('mousedown', (e) => {
            handlePreviewInteraction(e, true);
        });
        canvasDigiPreview.addEventListener('mousemove', (e) => {
            handlePreviewInteraction(e, false);
        });
        
        canvasDigiPreview.addEventListener('touchstart', (e) => {
            handlePreviewInteraction(e, true);
            e.preventDefault();
        }, { passive: false });
        
        canvasDigiPreview.addEventListener('touchmove', (e) => {
            handlePreviewInteraction(e, false);
            e.preventDefault();
        }, { passive: false });
    }

    // Bind reset to scan button listener
    if (btnResetScan) {
        btnResetScan.addEventListener('click', () => {
            setEditMode(false);
            digitize();
            showToast('🔄 Grid scan reset to calibration parameters.', 'success');
        });
    }

    // Bind gridlines toggle listener
    if (chkGridlines) {
        chkGridlines.addEventListener('change', () => {
            if (digitizedGrid.length > 0) {
                drawGridToCanvas(digitizedGrid, canvasDigiPreview);
            }
        });
    }

    // Bind auto-detect button listener
    if (btnAutoDetect) {
        btnAutoDetect.addEventListener('click', () => {
            if (isEdited) {
                if (!confirm('Auto-detecting corners will overwrite your manual pixel edits. Continue?')) {
                    return;
                }
                setEditMode(false);
            }
            detectCorners();
        });
    }

    // Reset isDrawing on global pointer release
    window.addEventListener('mouseup', () => {
        isDrawing = false;
    });
    window.addEventListener('touchend', () => {
        isDrawing = false;
    });

    // --- Help Modal Logic ---
    const btnHelp = document.getElementById('btn-help');
    const helpModal = document.getElementById('help-modal');
    const btnCloseModal = document.getElementById('btn-close-modal');

    if (btnHelp && helpModal && btnCloseModal) {
        const openModal = () => {
            helpModal.classList.remove('hidden');
            // Force browser reflow to trigger opacity transition
            helpModal.offsetHeight;
            helpModal.classList.add('show');
        };

        const closeModal = () => {
            helpModal.classList.remove('show');
            // Wait for transition to complete before hiding display
            setTimeout(() => {
                if (!helpModal.classList.contains('show')) {
                    helpModal.classList.add('hidden');
                }
            }, 300);
        };

        btnHelp.addEventListener('click', openModal);
        btnCloseModal.addEventListener('click', closeModal);

        // Close when clicking the backdrop
        helpModal.addEventListener('click', (e) => {
            if (e.target === helpModal) {
                closeModal();
            }
        });

        // Close on Escape key press
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !helpModal.classList.contains('hidden')) {
                closeModal();
            }
        });
    }
});

