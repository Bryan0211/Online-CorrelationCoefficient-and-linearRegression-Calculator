//let F = window.FractionMathJs.builder;
import Fraction from './Fraction/fraction.js';


let fraction1 = new Fraction(1, 2); // 1/2
let fraction2 = new Fraction(3, 4); // 3/4

document.getElementById('inputValues').addEventListener('input', function() {
    autoResizeTextarea(this);
    updateResultDisplay();
});

function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

function updateResultDisplay() {
    const input = document.getElementById('inputValues').value.trim();
    if (!input) {
        document.getElementById('resultValues').innerHTML = '';
        return;
    }

    const inputValues = input.split('\n').map(row => row.split(',').map(Number));
    if (inputValues.length < 2 || inputValues[0].length !== 2) {
        document.getElementById('resultValues').innerHTML = '請輸入至少兩組數值，每組包含兩個數值，以逗號分隔。';
        MathJax.typeset();
        return;
    }

    const xValues = inputValues.map(pair => pair[0]);
    const yValues = inputValues.map(pair => pair[1]);

    const meanX = xValues.reduce((a, b) => a + b, 0) / xValues.length;
    const meanY = yValues.reduce((a, b) => a + b, 0) / yValues.length;

    let numerator = 0;
    let denominatorX = 0;
    let denominatorY = 0;

    for (let i = 0; i < xValues.length; i++) {
        const dx = xValues[i] - meanX;
        const dy = yValues[i] - meanY;
        numerator += dx * dy;
        denominatorX += dx * dx;
        denominatorY += dy * dy;
    }

    const correlation = numerator / Math.sqrt(denominatorX * denominatorY);

    try {
        // 檢查 Fraction 是否正確導入
        if (typeof Fraction === 'undefined') {
            throw new Error('Fraction is not defined. Please check the library inclusion.');
        }

        // 使用 Fraction 進行計算
        const meanXFrac = new Fraction(meanX).toFraction();
        const meanYFrac = new Fraction(meanY).toString();
        const numeratorFrac = new Fraction(numerator).toString();
        const denominatorXFrac = new Fraction(denominatorX).toString();
        const denominatorYFrac = new Fraction(denominatorY).toString();

        const resultValues = `
            X平均值: \\(\\overline{X} = ${meanX.toFixed(2)}\\) \\(= ${meanXFrac}\\)<br>
            Y平均值: \\(\\overline{Y} = ${meanY.toFixed(2)}\\) \\(= ${meanYFrac}\\)<br>
            分子: \\(\\sum{(X_i - \\overline{X})(Y_i - \\overline{Y})} = ${numerator.toFixed(2)}\\) \\(= ${numeratorFrac}\\)<br>
            分母X: \\(\\sqrt{\\sum{(X_i - \\overline{X})^2}} = \\sqrt{${denominatorX.toFixed(2)}}\\) = \\(\\sqrt{${denominatorXFrac}}\\)<br>
            分母Y: \\(\\sqrt{\\sum{(Y_i - \\overline{Y})^2}} = \\sqrt{${denominatorY.toFixed(2)}}\\) = \\(\\sqrt{${denominatorYFrac}}\\)<br>
            相關係數: \\(r = ${correlation.toFixed(2)}\\)
        `;
        document.getElementById('resultValues').innerHTML = resultValues;
        MathJax.typeset();
    } catch (error) {
        console.error('分數計算過程中出現錯誤:', error);
        document.getElementById('resultValues').innerHTML = '數學計算過程中出現錯誤。';
        MathJax.typeset();
    }
}
