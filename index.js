import Fraction from './Fraction/fraction.js';

document.querySelector('#inputValues').addEventListener('input', function() {
    autoResizeTextarea(this);
    updateResultDisplay();
});

function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

function updateResultDisplay() {
    const input = document.querySelector('#inputValues').value.trim();
    if (!input) {
        document.querySelector('#resultValues').innerHTML = '';
        return;
    }

    const inputValues = input.split('\n').map(row => row.split(',').map(Number));
    if (inputValues.length < 2 || inputValues[0].length !== 2) {
        document.querySelector('#resultValues').innerHTML = '請輸入至少兩組數值，每組包含兩個數值，以逗號分隔。';
        MathJax.typeset();
        return;
    }

    const xValues = inputValues.map(pair => new Fraction(pair[0]));
    const yValues = inputValues.map(pair => new Fraction(pair[1]));

    const sumX = xValues.reduce((acc, val) => acc.add(val), new Fraction(0));
    const sumY = yValues.reduce((acc, val) => acc.add(val), new Fraction(0));

    const meanX = sumX.div(new Fraction(xValues.length));
    const meanY = sumY.div(new Fraction(yValues.length));

    let numerator = new Fraction(0);
    let denominatorX = new Fraction(0);
    let denominatorY = new Fraction(0);

    for (let i = 0; i < xValues.length; i++) {
        const dx = xValues[i].sub(meanX);
        const dy = yValues[i].sub(meanY);
        numerator = numerator.add(dx.mul(dy));
        denominatorX = denominatorX.add(dx.mul(dx));
        denominatorY = denominatorY.add(dy.mul(dy));
    }

    const sqrtDenominatorXValue = Math.sqrt(denominatorX.valueOf());
    const sqrtDenominatorYValue = Math.sqrt(denominatorY.valueOf());

    const resultValues = `
        X平均值: \\(\\overline{X} = ${meanX.toFraction()} = ${meanX.valueOf().toFixed(3)}\\)<br>
        Y平均值: \\(\\overline{Y} = ${meanY.toFraction()} = ${meanY.valueOf().toFixed(3)}\\)<br>
        分子: \\(\\sum{(X_i - \\overline{X})(Y_i - \\overline{Y})} = ${numerator.toFraction()} = ${numerator.valueOf().toFixed(3)}\\)<br>
        分母X: \\(\\sqrt{\\sum{(X_i - \\overline{X})^2}} = \\sqrt{${denominatorX.toFraction()}} = ${sqrtDenominatorXValue.toFixed(3)}\\)<br>
        分母Y: \\(\\sqrt{\\sum{(Y_i - \\overline{Y})^2}} = \\sqrt{${denominatorY.toFraction()}} = ${sqrtDenominatorYValue.toFixed(3)}\\)<br>
        相關係數: \\(r = ${numerator.div(denominatorX.mul(denominatorY)).toFraction()} = ${numerator.div(denominatorX.mul(denominatorY)).valueOf().toFixed(3)}\\)
    `;
    document.querySelector('#resultValues').innerHTML = resultValues;
    MathJax.typeset();
}
