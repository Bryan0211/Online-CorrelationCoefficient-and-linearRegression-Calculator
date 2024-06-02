import Fraction from './Fraction/fraction.js';
//暫時拋棄，等到cdn更新再用 import { Fraction } from 'https://cdn.jsdelivr.net/gh/Bryan0211/Fraction.js@master/fraction.js';

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

    const inputValues = input.split('\n').map(row => row.split(',').map(str => new Fraction(str.trim()).simplify()));
    if (inputValues.length < 2 || inputValues[0].length !== 2) {
        document.querySelector('#resultValues').innerHTML = '請輸入至少兩組數值，每組包含兩個數值，以逗號分隔。';
        MathJax.typeset();
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
}
