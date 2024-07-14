import Fraction from './Fraction/fraction.js';

let inputMode = 1; // 預設為模式 1

document.querySelector('#inputValues').addEventListener('input', function() {
    autoResizeTextarea(this);
    updateResultDisplay();
});

function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

window.setInputMode = function(mode) {
    inputMode = mode;
    updatePlaceholderText();
    updateActiveButton();
    updateResultDisplay();
}

function updatePlaceholderText() {
    const textarea = document.querySelector('#inputValues');
    if (inputMode === 1) {
        textarea.placeholder = "輸入用空格或,來分隔X和Y值(X,Y或X Y)\n值能用分數(例如2/3)\n輸入例子：\n1 2\n3,4.56\n...";
    } else if (inputMode === 2) {
        textarea.placeholder = "分開輸入X和Y值\n用空格或,來分隔值\n第一行輸入X值：\n1 2 3\n第二行輸入Y值：\n4 5 6\n...";
    }
}

function updateActiveButton() {
    document.querySelectorAll('.mode-button').forEach(button => {
        button.classList.remove('active');
    });
    document.querySelector(`#mode-${inputMode}`).classList.add('active');
}

function updateResultDisplay() {
    const input = document.querySelector('#inputValues').value.trim();
    if (!input) {
        document.querySelector('#resultValues').innerHTML = '';
        clearCanvas();
        return;
    }

    let inputValues;
    if (inputMode === 1) {
        inputValues = input.split('\n').map(row => row.split(/[, ]+/).map(str => new Fraction(str.trim()).simplify()));
    } else if (inputMode === 2) {
        const [xInput, yInput] = input.split('\n');
        const xValues = xInput.split(/[, ]+/).map(str => new Fraction(str.trim()).simplify());
        const yValues = yInput.split(/[, ]+/).map(str => new Fraction(str.trim()).simplify());
        inputValues = xValues.map((x, i) => [x, yValues[i]]);
    }

    if (inputValues.length < 2 || inputValues[0].length !== 2) {
        document.querySelector('#resultValues').innerHTML = '請輸入至少兩組數值，每組包含兩個數值，以逗號或空格分隔。';
        MathJax.typesetPromise();
        clearCanvas();
        return;
    }

    const xValues = inputValues.map(pair => pair[0]);
    const yValues = inputValues.map(pair => pair[1]);

    const sumX = xValues.reduce((acc, val) => acc.add(val), new Fraction(0)).simplify();
    const sumY = yValues.reduce((acc, val) => acc.add(val), new Fraction(0)).simplify();

    const meanX = sumX.div(new Fraction(xValues.length)).simplify();
    const meanY = sumY.div(new Fraction(yValues.length)).simplify();

    let numerator = new Fraction(0);
    let denominatorX = new Fraction(0);
    let denominatorY = new Fraction(0);

    for (let i = 0; i < xValues.length; i++) {
        const dx = xValues[i].sub(meanX).simplify();
        const dy = yValues[i].sub(meanY).simplify();
        numerator = numerator.add(dx.mul(dy)).simplify();
        denominatorX = denominatorX.add(dx.mul(dx)).simplify();
        denominatorY = denominatorY.add(dy.mul(dy)).simplify();
    }

    const sqrtDenominatorX = new Fraction(Math.sqrt(denominatorX.valueOf())).simplify();
    const sqrtDenominatorY = new Fraction(Math.sqrt(denominatorY.valueOf())).simplify();
    const intermediateFraction = numerator.div(sqrtDenominatorX.mul(sqrtDenominatorY).simplify());
    const correlation = intermediateFraction.simplify();

    const stdDevX = sqrtDenominatorX.simplify();
    const stdDevY = sqrtDenominatorY.simplify();

    const regressionSlope = correlation.mul(stdDevY).div(stdDevX).simplify();
    const regressionIntercept = meanY.sub(regressionSlope.mul(meanX)).simplify();

    const resultValues = `
        X平均值: \\(\\overline{X} = ${meanX.toLatex()} = ${meanX.valueOf().toFixed(3)}\\)<br>
        Y平均值: \\(\\overline{Y} = ${meanY.toLatex()} = ${meanY.valueOf().toFixed(3)}\\)<br>
        X標準差: \\(\\sigma_X = ${stdDevX.toLatex()} = ${stdDevX.valueOf().toFixed(3)}\\)<br>
        Y標準差: \\(\\sigma_Y = ${stdDevY.toLatex()} = ${stdDevY.valueOf().toFixed(3)}\\)<br>
        相關係數的分子: \\(\\sum{(X_i - \\overline{X})(Y_i - \\overline{Y})}\\ = \\frac{${numerator.toLatex()}}{${sqrtDenominatorX.mul(sqrtDenominatorY).simplify().toLatex()}} = ${intermediateFraction.toLatex()} = ${correlation.valueOf().toFixed(3)}\\)<br>
        回歸直線: \\(Y - ${meanY.toLatex()} = (${regressionSlope.toLatex()})(X - ${meanX.toLatex()})\\)<br>
        標準式: \\(Y = ${regressionSlope.toLatex()}X + ${regressionIntercept.toLatex()}\\)
    `;
    document.querySelector('#resultValues').innerHTML = resultValues;
    MathJax.typesetPromise();
    drawScatterPlot(xValues, yValues, regressionSlope, regressionIntercept);
}

function clearCanvas() {
    const canvasContainer = document.getElementById('scatterPlot');
    canvasContainer.innerHTML = ''; // 清除 p5.js 畫布
}

function drawScatterPlot(xValues, yValues, slope, intercept) {
    const canvasContainer = document.querySelector('#scatterPlot');
    canvasContainer.innerHTML = '';

    new p5(p => {
        let zoom = 1;
        let offsetX = 0;
        let offsetY = 0;
        let isDragging = false;
        let lastMouseX, lastMouseY;

        let xMin, xMax, yMin, yMax;
        let xScale, yScale;

        p.setup = function() {
            const canvas = p.createCanvas(800, 600);
            canvas.parent('scatterPlot');

            calculateDataRange();
            setupScales();

            canvas.mouseWheel(handleZoom);
            canvas.mousePressed(startDrag);
            canvas.mouseReleased(endDrag);
            canvas.mouseMoved(handleDragging);
        };

        function calculateDataRange() {
            xMin = Math.min(...xValues.map(val => val.valueOf()), 0);
            xMax = Math.max(...xValues.map(val => val.valueOf()), 0);
            yMin = Math.min(...yValues.map(val => val.valueOf()), 0);
            yMax = Math.max(...yValues.map(val => val.valueOf()), 0);

            const xMargin = (xMax - xMin) * 0.1;
            const yMargin = (yMax - yMin) * 0.1;
            xMin -= xMargin;
            xMax += xMargin;
            yMin -= yMargin;
            yMax += yMargin;
        }

        function setupScales() {
            xScale = p.width / (xMax - xMin);
            yScale = p.height / (yMax - yMin);
        }

        p.draw = function() {
            p.background(255);
            p.push();
            p.translate(p.width / 2, p.height / 2);
            p.scale(zoom);
            p.translate(offsetX, offsetY);

            drawGrid();
            drawAxes();
            drawPoints();
            drawRegressionLine();

            p.pop();
        };

        function drawGrid() {
            p.stroke(220);
            p.strokeWeight(1 / zoom);

            for (let x = Math.ceil(xMin); x <= Math.floor(xMax); x++) {
                const screenX = (x - xMin) * xScale - p.width / 2;
                p.line(screenX, -p.height / 2, screenX, p.height / 2);
            }

            for (let y = Math.ceil(yMin); y <= Math.floor(yMax); y++) {
                const screenY = p.height / 2 - (y - yMin) * yScale;
                p.line(-p.width / 2, screenY, p.width / 2, screenY);
            }
        }

        function drawAxes() {
            p.stroke(0);
            p.strokeWeight(2 / zoom);

            const xAxisY = p.height / 2 - (0 - yMin) * yScale;
            p.line(-p.width / 2, xAxisY, p.width / 2, xAxisY);

            const yAxisX = (0 - xMin) * xScale - p.width / 2;
            p.line(yAxisX, -p.height / 2, yAxisX, p.height / 2);

            p.textAlign(p.CENTER, p.CENTER);
            p.textSize(12 / zoom);

            for (let x = Math.ceil(xMin); x <= Math.floor(xMax); x++) {
                const screenX = (x - xMin) * xScale - p.width / 2;
                p.line(screenX, xAxisY - 5 / zoom, screenX, xAxisY + 5 / zoom);
                p.text(x, screenX, xAxisY + 20 / zoom);
            }

            for (let y = Math.ceil(yMin); y <= Math.floor(yMax); y++) {
                const screenY = p.height / 2 - (y - yMin) * yScale;
                p.line(yAxisX - 5 / zoom, screenY, yAxisX + 5 / zoom, screenY);
                p.text(y, yAxisX - 20 / zoom, screenY);
            }
        }

        function drawPoints() {
            p.noStroke();
            p.fill(0, 0, 255);
            xValues.forEach((x, i) => {
                const screenX = (x.valueOf() - xMin) * xScale - p.width / 2;
                const screenY = p.height / 2 - (yValues[i].valueOf() - yMin) * yScale;
                p.ellipse(screenX, screenY, 8 / zoom, 8 / zoom);
                
                // 顯示座標點
                p.textAlign(p.LEFT, p.BOTTOM);
                p.textSize(12 / zoom);
                p.fill(0);
                p.text(`(${x.valueOf().toFixed(2)}, ${yValues[i].valueOf().toFixed(2)})`, screenX + 10 / zoom, screenY - 10 / zoom);
            });
        }

        function drawRegressionLine() {
            p.stroke(255, 0, 0);
            p.strokeWeight(2 / zoom);
            const y1 = slope.mul(xMin).add(intercept).valueOf();
            const y2 = slope.mul(xMax).add(intercept).valueOf();
            const x1 = (xMin - xMin) * xScale - p.width / 2;
            const x2 = (xMax - xMin) * xScale - p.width / 2;
            const screenY1 = p.height / 2 - (y1 - yMin) * yScale;
            const screenY2 = p.height / 2 - (y2 - yMin) * yScale;
            p.line(x1, screenY1, x2, screenY2);
        }

        function handleZoom(event) {
            const zoomFactor = event.deltaY > 0 ? 0.95 : 1.05;
            const mouseX = event.offsetX - p.width / 2;
            const mouseY = event.offsetY - p.height / 2;
            
            const newZoom = zoom * zoomFactor;
            const newOffsetX = mouseX - (mouseX - offsetX) * (newZoom / zoom);
            const newOffsetY = mouseY - (mouseY - offsetY) * (newZoom / zoom);

            zoom = newZoom;
            offsetX = newOffsetX;
            offsetY = newOffsetY;

            event.preventDefault();
        }

        function startDrag() {
            isDragging = true;
            lastMouseX = p.mouseX;
            lastMouseY = p.mouseY;
        }

        function endDrag() {
            isDragging = false;
        }

        function handleDragging() {
            if (isDragging) {
                offsetX += (p.mouseX - lastMouseX) / zoom;
                offsetY += (p.mouseY - lastMouseY) / zoom;
                lastMouseX = p.mouseX;
                lastMouseY = p.mouseY;
            }
        }
    }, 'scatterPlot');
}

// 初始化
updatePlaceholderText();
updateActiveButton();