window.onload = function() {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const color1Picker = document.getElementById('color1');
    const color2Picker = document.getElementById('color2');
    const color3Picker = document.getElementById('color3');
    const color5Picker = document.getElementById('color5');
    const canvasSizeSelect = document.getElementById('canvasSize');
    const customWidthInput = document.getElementById('customWidth');
    const customHeightInput = document.getElementById('customHeight');
    const setCustomSizeBtn = document.getElementById('setCustomSizeBtn');
    const randomBtn = document.getElementById('randomBtn');
    const swooshBtn = document.getElementById('swooshBtn');
    const sunriseBtn = document.getElementById('sunriseBtn');
    const moveBtn = document.getElementById('moveBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const saveColorsBtn = document.getElementById('saveColorsBtn');
    const loadColorsBtn = document.getElementById('loadColorsBtn');
    const loadColorsInput = document.getElementById('loadColorsInput');
    const swooshThumbnail = document.getElementById('swooshThumbnail');
    const sunriseThumbnail = document.getElementById('sunriseThumbnail');
    const moveThumbnail = document.getElementById('moveThumbnail');

    let currentComposition = 'swoosh';
    let gradientHistory = [];
    let currentGradientIndex = -1;
    let isAnimating = false;
    let stopPosition = 0;
    let capturer = null;

    function setCanvasSize(width, height) {
        canvas.width = width;
        canvas.height = height;
        updateGradient();
    }

    canvasSizeSelect.addEventListener('change', function() {
        if (canvasSizeSelect.value === 'custom') {
            document.getElementById('customSize').style.display = 'block';
        } else {
            document.getElementById('customSize').style.display = 'none';
            const [width, height] = canvasSizeSelect.value.split('x').map(Number);
            setCanvasSize(width, height);
        }
    });

    setCustomSizeBtn.addEventListener('click', function() {
        const width = parseInt(customWidthInput.value, 10);
        const height = parseInt(customHeightInput.value, 10);
        if (width > 0 && height > 0) {
            setCanvasSize(width, height);
        }
    });

    function randomColor() {
        return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
    }

    function hexToRgb(hex) {
        const bigint = parseInt(hex.slice(1), 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        return [r, g, b];
    }

    function rgbToHex(r, g, b) {
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
    }

    function rotateColor([r, g, b], degree) {
        const hsl = rgbToHsl(r, g, b);
        hsl[0] = (hsl[0] + degree) % 360;
        return hslToRgb(hsl[0], hsl[1], hsl[2]);
    }

    function rgbToHsl(r, g, b) {
        r /= 255, g /= 255, b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
    }

    function hslToRgb(h, s, l) {
        let r, g, b;

        h /= 360;
        s /= 100;
        l /= 100;

        if (s === 0) {
            r = g = b = l;
        } else {
            const hueToRgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hueToRgb(p, q, h + 1 / 3);
            g = hueToRgb(p, q, h);
            b = hueToRgb(p, q, h - 1 / 3);
        }
        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }

    function generateComplementaryColors(baseColor) {
        const rgb = hexToRgb(baseColor);
        const complementaryColor = rotateColor(rgb, 180);
        const additionalColor = rotateColor(rgb, 90);
        return [baseColor, rgbToHex(...complementaryColor), rgbToHex(...additionalColor)];
    }

    function generateAnalogousColors(baseColor) {
        const rgb = hexToRgb(baseColor);
        const color1 = rotateColor(rgb, -30);
        const color2 = rotateColor(rgb, 0);
        const color3 = rotateColor(rgb, 30);
        return [rgbToHex(...color1), rgbToHex(...color2), rgbToHex(...color3)];
    }

    function generateRandomColors() {
        return [randomColor(), randomColor(), randomColor(), randomColor()];
    }

    function saveCurrentColors() {
        const colors = {
            color1: color1Picker.value,
            color2: color2Picker.value,
            color3: color3Picker.value,
            color5: color5Picker.value
        };
        gradientHistory.push(colors);
        currentGradientIndex = gradientHistory.length - 1;
    }

    function loadColors(index) {
        if (index >= 0 && index < gradientHistory.length) {
            const colors = gradientHistory[index];
            color1Picker.value = colors.color1;
            color2Picker.value = colors.color2;
            color3Picker.value = colors.color3;
            color5Picker.value = colors.color5;
            updateGradient();
        }
    }

    function updateGradient(composition = currentComposition) {
        const color1 = color1Picker.value;
        const color2 = color2Picker.value;
        const color3 = color3Picker.value;
        const color4 = color1; // Color 4 is the same as Color 1
        const color5 = color5Picker.value;
        const color6 = "#FFFFFF"; // Color 6 is always white

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (composition === 'swoosh') {
            const upperGradient = ctx.createRadialGradient(0, canvas.height / 4, 0, 0, canvas.height / 4, canvas.width * 0.75);
            upperGradient.addColorStop(0.01, color1);
            upperGradient.addColorStop(0.15 + stopPosition / 100, color2);
            upperGradient.addColorStop(0.23 + stopPosition / 100, color3);
            upperGradient.addColorStop(0.325 + stopPosition / 100, color4);
            upperGradient.addColorStop(0.60 + stopPosition / 100, color5);
            upperGradient.addColorStop(1.0, color6);

            ctx.fillStyle = upperGradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height / 2);

            const lowerGradient = ctx.createRadialGradient(canvas.width, canvas.height * 3 / 4, 0, canvas.width, canvas.height * 3 / 4, canvas.width * 0.75);
            lowerGradient.addColorStop(0.01, color1);
            lowerGradient.addColorStop(0.15 + stopPosition / 100, color2);
            lowerGradient.addColorStop(0.23 + stopPosition / 100, color3);
            lowerGradient.addColorStop(0.325 + stopPosition / 100, color4);
            lowerGradient.addColorStop(0.60 + stopPosition / 100, color5);
            lowerGradient.addColorStop(1.0, color6);

            ctx.fillStyle = lowerGradient;
            ctx.fillRect(0, canvas.height / 2, canvas.width, canvas.height / 2);
        } else if (composition === 'sunrise') {
            const upperGradient = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, canvas.width * 0.75);
            upperGradient.addColorStop(0.01, color1);
            upperGradient.addColorStop(0.15 + stopPosition / 100, color2);
            upperGradient.addColorStop(0.23 + stopPosition / 100, color3);
            upperGradient.addColorStop(0.325 + stopPosition / 100, color4);
            upperGradient.addColorStop(0.60 + stopPosition / 100, color5);
            upperGradient.addColorStop(1.0, color6);

            ctx.fillStyle = upperGradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height / 2);

            const lowerGradient = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, canvas.width * 0.75);
            lowerGradient.addColorStop(0.01, color6);
            lowerGradient.addColorStop(0.15 + stopPosition / 100, color5);
            lowerGradient.addColorStop(0.23 + stopPosition / 100, color4);
            lowerGradient.addColorStop(0.325 + stopPosition / 100, color3);
            lowerGradient.addColorStop(0.60 + stopPosition / 100, color2);
            lowerGradient.addColorStop(1.0, color1);

            ctx.fillStyle = lowerGradient;
            ctx.fillRect(0, canvas.height / 2, canvas.width, canvas.height / 2);
        } else if (composition === 'move') {
            const upperGradient = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, canvas.width * 0.75);
            upperGradient.addColorStop(0.01, color1);
            upperGradient.addColorStop(0.15 + stopPosition / 100, color2);
            upperGradient.addColorStop(0.23 + stopPosition / 100, color3);
            upperGradient.addColorStop(0.325 + stopPosition / 100, color4);
            upperGradient.addColorStop(0.60 + stopPosition / 100, color5);
            upperGradient.addColorStop(1.0, color6);

            ctx.fillStyle = upperGradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height / 2);

            const lowerGradient = ctx.createRadialGradient(canvas.width / 2, canvas.height, 0, canvas.width / 2, canvas.height, canvas.width * 0.75);
            lowerGradient.addColorStop(0.01, color6);
            lowerGradient.addColorStop(0.15 + stopPosition / 100, color5);
            lowerGradient.addColorStop(0.23 + stopPosition / 100, color4);
            lowerGradient.addColorStop(0.325 + stopPosition / 100, color3);
            lowerGradient.addColorStop(0.60 + stopPosition / 100, color2);
            lowerGradient.addColorStop(1.0, color1);

            ctx.fillStyle = lowerGradient;
            ctx.fillRect(0, canvas.height / 2, canvas.width, canvas.height / 2);
        }

        updateThumbnails();
    }

    function updateThumbnails() {
        generateThumbnail(swooshThumbnail, 'swoosh');
        generateThumbnail(sunriseThumbnail, 'sunrise');
        generateThumbnail(moveThumbnail, 'move');
    }

    function generateThumbnail(thumbnailElement, composition) {
        const thumbnailCanvas = document.createElement('canvas');
        const thumbnailCtx = thumbnailCanvas.getContext('2d');
        thumbnailCanvas.width = 100;
        thumbnailCanvas.height = 100;

        const color1 = color1Picker.value;
        const color2 = color2Picker.value;
        const color3 = color3Picker.value;
        const color4 = color1; // Color 4 is the same as Color 1
        const color5 = color5Picker.value;
        const color6 = "#FFFFFF"; // Color 6 is always white

        thumbnailCtx.clearRect(0, 0, thumbnailCanvas.width, thumbnailCanvas.height);

        if (composition === 'swoosh') {
            const upperGradient = thumbnailCtx.createRadialGradient(0, thumbnailCanvas.height / 4, 0, 0, thumbnailCanvas.height / 4, thumbnailCanvas.width * 0.75);
            upperGradient.addColorStop(0.01, color1);
            upperGradient.addColorStop(0.15 + stopPosition / 100, color2);
            upperGradient.addColorStop(0.23 + stopPosition / 100, color3);
            upperGradient.addColorStop(0.325 + stopPosition / 100, color4);
            upperGradient.addColorStop(0.60 + stopPosition / 100, color5);
            upperGradient.addColorStop(1.0, color6);

            thumbnailCtx.fillStyle = upperGradient;
            thumbnailCtx.fillRect(0, 0, thumbnailCanvas.width, thumbnailCanvas.height / 2);

            const lowerGradient = thumbnailCtx.createRadialGradient(thumbnailCanvas.width, thumbnailCanvas.height * 3 / 4, 0, thumbnailCanvas.width, thumbnailCanvas.height * 3 / 4, thumbnailCanvas.width * 0.75);
            lowerGradient.addColorStop(0.01, color1);
            lowerGradient.addColorStop(0.15 + stopPosition / 100, color2);
            lowerGradient.addColorStop(0.23 + stopPosition / 100, color3);
            lowerGradient.addColorStop(0.325 + stopPosition / 100, color4);
            lowerGradient.addColorStop(0.60 + stopPosition / 100, color5);
            lowerGradient.addColorStop(1.0, color6);

            thumbnailCtx.fillStyle = lowerGradient;
            thumbnailCtx.fillRect(0, thumbnailCanvas.height / 2, thumbnailCanvas.width, thumbnailCanvas.height / 2);
        } else if (composition === 'sunrise') {
            const upperGradient = thumbnailCtx.createRadialGradient(thumbnailCanvas.width / 2, thumbnailCanvas.height / 2, 0, thumbnailCanvas.width / 2, thumbnailCanvas.height / 2, thumbnailCanvas.width * 0.75);
            upperGradient.addColorStop(0.01, color1);
            upperGradient.addColorStop(0.15 + stopPosition / 100, color2);
            upperGradient.addColorStop(0.23 + stopPosition / 100, color3);
            upperGradient.addColorStop(0.325 + stopPosition / 100, color4);
            upperGradient.addColorStop(0.60 + stopPosition / 100, color5);
            upperGradient.addColorStop(1.0, color6);

            thumbnailCtx.fillStyle = upperGradient;
            thumbnailCtx.fillRect(0, 0, thumbnailCanvas.width, thumbnailCanvas.height / 2);

            const lowerGradient = thumbnailCtx.createRadialGradient(thumbnailCanvas.width / 2, thumbnailCanvas.height / 2, 0, thumbnailCanvas.width / 2, thumbnailCanvas.height / 2, thumbnailCanvas.width * 0.75);
            lowerGradient.addColorStop(0.01, color6);
            lowerGradient.addColorStop(0.15 + stopPosition / 100, color5);
            lowerGradient.addColorStop(0.23 + stopPosition / 100, color4);
            lowerGradient.addColorStop(0.325 + stopPosition / 100, color3);
            lowerGradient.addColorStop(0.60 + stopPosition / 100, color2);
            lowerGradient.addColorStop(1.0, color1);

            thumbnailCtx.fillStyle = lowerGradient;
            thumbnailCtx.fillRect(0, thumbnailCanvas.height / 2, thumbnailCanvas.width, thumbnailCanvas.height / 2);
        } else if (composition === 'move') {
            const upperGradient = thumbnailCtx.createRadialGradient(thumbnailCanvas.width / 2, thumbnailCanvas.height / 2, 0, thumbnailCanvas.width / 2, thumbnailCanvas.height / 2, thumbnailCanvas.width * 0.75);
            upperGradient.addColorStop(0.01, color1);
            upperGradient.addColorStop(0.15 + stopPosition / 100, color2);
            upperGradient.addColorStop(0.23 + stopPosition / 100, color3);
            upperGradient.addColorStop(0.325 + stopPosition / 100, color4);
            upperGradient.addColorStop(0.60 + stopPosition / 100, color5);
            upperGradient.addColorStop(1.0, color6);

            thumbnailCtx.fillStyle = upperGradient;
            thumbnailCtx.fillRect(0, 0, thumbnailCanvas.width, thumbnailCanvas.height / 2);

            const lowerGradient = thumbnailCtx.createRadialGradient(thumbnailCanvas.width / 2, thumbnailCanvas.height, 0, thumbnailCanvas.width / 2, thumbnailCanvas.height, thumbnailCanvas.width * 0.75);
            lowerGradient.addColorStop(0.01, color6);
            lowerGradient.addColorStop(0.15 + stopPosition / 100, color5);
            lowerGradient.addColorStop(0.23 + stopPosition / 100, color4);
            lowerGradient.addColorStop(0.325 + stopPosition / 100, color3);
            lowerGradient.addColorStop(0.60 + stopPosition / 100, color2);
            lowerGradient.addColorStop(1.0, color1);

            thumbnailCtx.fillStyle = lowerGradient;
            thumbnailCtx.fillRect(0, thumbnailCanvas.height / 2, thumbnailCanvas.width, thumbnailCanvas.height / 2);
        }

        thumbnailElement.style.backgroundImage = `url(${thumbnailCanvas.toDataURL()})`;
    }

    color1Picker.addEventListener('input', () => updateGradient());
    color2Picker.addEventListener('input', () => updateGradient());
    color3Picker.addEventListener('input', () => updateGradient());
    color5Picker.addEventListener('input', () => updateGradient());

    randomBtn.addEventListener('click', () => {
        const colors = generateRandomColors();
        color1Picker.value = colors[0];
        color2Picker.value = colors[1];
        color3Picker.value = colors[2];
        color5Picker.value = colors[3];
        saveCurrentColors();
        updateGradient();
    });

    swooshBtn.addEventListener('click', () => {
        currentComposition = 'swoosh';
        updateGradient();
    });

    sunriseBtn.addEventListener('click', () => {
        currentComposition = 'sunrise';
        updateGradient();
    });

    moveBtn.addEventListener('click', () => {
        currentComposition = 'move';
        updateGradient();
    });

    downloadBtn.addEventListener('click', function() {
        const link = document.createElement('a');
        link.download = 'gradient.png';
        link.href = canvas.toDataURL();
        link.click();
    });

    saveColorsBtn.addEventListener('click', function() {
        const colors = {
            color1: color1Picker.value,
            color2: color2Picker.value,
            color3: color3Picker.value,
            color5: color5Picker.value
        };
        const colorsJSON = JSON.stringify(colors);
        const blob = new Blob([colorsJSON], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'colors.json';
        link.click();
    });

    loadColorsBtn.addEventListener('click', function() {
        loadColorsInput.click();
    });

    loadColorsInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const colors = JSON.parse(e.target.result);
                color1Picker.value = colors.color1;
                color2Picker.value = colors.color2;
                color3Picker.value = colors.color3;
                color5Picker.value = colors.color5;
                updateGradient();
            };
            reader.readAsText(file);
        }
    });

    document.addEventListener('keydown', function(event) {
        if (event.code === 'Space') {
            const colors = generateRandomColors();
            color1Picker.value = colors[0];
            color2Picker.value = colors[1];
            color3Picker.value = colors[2];
            color5Picker.value = colors[3];
            saveCurrentColors();
            updateGradient();
        } else if (event.code === 'ArrowLeft') {
            if (currentGradientIndex > 0) {
                currentGradientIndex--;
                loadColors(currentGradientIndex);
            }
        } else if (event.code === 'ArrowRight') {
            if (currentGradientIndex < gradientHistory.length - 1) {
                currentGradientIndex++;
                loadColors(currentGradientIndex);
            }
        }
    });

    setCanvasSize(1350, 1350);  // Initial setting of canvas size
    updateThumbnails(); // Initial thumbnails update
};
