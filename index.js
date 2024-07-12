import Fraction from './Fraction/fraction.js';

let inputMode = 1; // Default to mode 1

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
        MathJax.typeset();
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
        相關係數的分子: \\(\\sum{(X_i - \\overline{X})(Y_i - \\overline{Y})} = ${numerator.toLatex()} = ${numerator.valueOf().toFixed(3)}\\)<br>
        相關係數的分母X: \\(\\sqrt{\\sum{(X_i - \\overline{X})^2}} = \\sqrt{${denominatorX.toLatex()}} = ${sqrtDenominatorX.valueOf().toFixed(3)}\\)<br>
        相關係數的分母Y: \\(\\sqrt{\\sum{(Y_i - \\overline{Y})^2}} = \\sqrt{${denominatorY.toLatex()}} = ${sqrtDenominatorY.valueOf().toFixed(3)}\\)<br>
        相關係數: \\(r = \\frac{\\sum{(X_i - \\overline{X})(Y_i - \\overline{Y})}}{\\sqrt{\\sum{(X_i - \\overline{X})^2}} \\cdot \\sqrt{\\sum{(Y_i - \\overline{Y})^2}}}\\ = \\frac{${numerator.toLatex()}}{${sqrtDenominatorX.mul(sqrtDenominatorY).simplify().toLatex()}} = ${intermediateFraction.toLatex()} = ${correlation.valueOf().toFixed(3)}\\)<br>
        迴歸直線: \\(Y - ${meanY.toLatex()} = (${regressionSlope.toLatex()})(X - ${meanX.toLatex()})\\)<br>
        標準式: \\(Y = ${regressionSlope.toLatex()}X + ${regressionIntercept.toLatex()}\\)
    `;
    document.querySelector('#resultValues').innerHTML = resultValues;
    MathJax.typeset();
    drawScatterPlot(xValues, yValues, regressionSlope, regressionIntercept);
}

function clearCanvas() {
    const canvasContainer = document.getElementById('scatterPlot');
    canvasContainer.innerHTML = ''; // 清除 p5.js 畫布
}

function drawScatterPlot(xValues, yValues, slope, intercept) {
    const canvasContainer = document.getElementById('scatterPlot');
    canvasContainer.innerHTML = ''; // 清除之前的畫布

    new p5(p => {
        p.setup = function() {
            const canvas = p.createCanvas(800, 600);
            canvas.parent('scatterPlot');
            p.background(255);

            // Draw grid
            p.stroke(200);
            p.strokeWeight(1);
            for (let x = 0; x <= p.width; x += 50) {
                p.line(x, 0, x, p.height);
            }
            for (let y = 0; y <= p.height; y += 50) {
                p.line(0, y, p.width, y);
            }

            // Draw axes
            p.stroke(0);
            p.strokeWeight(2);
            p.line(50, p.height - 50, p.width - 50, p.height - 50); // x-axis
            p.line(50, 50, 50, p.height - 50); // y-axis

            // Scale functions
            const xMin = Math.min(...xValues.map(val => val.valueOf()));
            const xMax = Math.max(...xValues.map(val => val.valueOf()));
            const yMin = Math.min(...yValues.map(val => val.valueOf()));
            const yMax = Math.max(...yValues.map(val => val.valueOf()));
            const xScale = x => p.map(x, xMin, xMax, 50, p.width - 50);
            const yScale = y => p.map(y, yMin, yMax, p.height - 50, 50);

            // Draw points
            p.fill(0);
            xValues.forEach((x, i) => {
                p.ellipse(xScale(x.valueOf()), yScale(yValues[i].valueOf()), 5, 5);
            });

            // Draw regression line
            p.stroke('magenta');
            p.strokeWeight(2);
            p.line(
                xScale(xMin),
                yScale(slope.mul(xMin).add(intercept).valueOf()),
                xScale(xMax),
                yScale(slope.mul(xMax).add(intercept).valueOf())
            );
        };
    }, 'scatterPlot');
}
