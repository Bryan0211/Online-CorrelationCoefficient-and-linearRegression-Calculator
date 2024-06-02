/**
 * @license Fraction.js v4.3.7 31/08/2023
 * https://raw.org/article/rational-numbers-in-javascript/
 *
 * Copyright (c) 2023, Robert Eisele (robert@raw.org)
 * Dual licensed under the MIT or GPL Version 2 licenses.
 **/


/**
 *
 * This class offers the possibility to calculate fractions.
 * You can pass a fraction in different formats. Either as array, as double, as string or as an integer.
 *
 * Array/Object form
 * [ 0 => <numerator>, 1 => <denominator> ]
 * [ n => <numerator>, d => <denominator> ]
 *
 * Integer form
 * - Single integer value
 *
 * Double form
 * - Single double value
 *
 * String form
 * 123.456 - a simple double
 * 123/456 - a string fraction
 * 123.'456' - a double with repeating decimal places
 * 123.(456) - synonym
 * 123.45'6' - a double with repeating last place
 * 123.45(6) - synonym
 *
 * Example:
 *
 * var f = new Fraction("9.4'31'");
 * f.mul([-4, 3]).div(4.9);
 *
 */


// Maximum search depth for cyclic rational numbers. 2000 should be more than enough.
// Example: 1/7 = 0.(142857) has 6 repeating decimal places.
// If MAX_CYCLE_LEN gets reduced, long cycles will not be detected and toString() only gets the first 10 digits
var MAX_CYCLE_LEN = 2000;

// Parsed data to avoid calling "new" all the time
var P = {
  "s": 1,
  "n": 0,
  "d": 1
};

function assign(n, s) {

  if (isNaN(n = parseInt(n, 10))) {
    throw InvalidParameter();
  }
  return n * s;
}

// Creates a new Fraction internally without the need of the bulky constructor
function newFraction(n, d) {

  if (d === 0) {
    throw DivisionByZero();
  }

  var f = Object.create(Fraction.prototype);
  f["s"] = n < 0 ? -1 : 1;

  n = n < 0 ? -n : n;

  var a = gcd(n, d);

  f["n"] = n / a;
  f["d"] = d / a;
  return f;
}

function factorize(num) {

  var factors = {};

  var n = num;
  var i = 2;
  var s = 4;

  while (s <= n) {

    while (n % i === 0) {
      n/= i;
      factors[i] = (factors[i] || 0) + 1;
    }
    s+= 1 + 2 * i++;
  }

  if (n !== num) {
    if (n > 1)
      factors[n] = (factors[n] || 0) + 1;
  } else {
    factors[num] = (factors[num] || 0) + 1;
  }
  return factors;
}

var parse = function(p1, p2) {

  var n = 0, d = 1, s = 1;
  var v = 0, w = 0, x = 0, y = 1, z = 1;

  var A = 0, B = 1;
  var C = 1, D = 1;

  var N = 10000000;
  var M;

  if (p1 === undefined || p1 === null) {
    /* void */
  } else if (p2 !== undefined) {
    n = p1;
    d = p2;
    s = n * d;

    if (n % 1 !== 0 || d % 1 !== 0) {
      throw NonIntegerParameter();
    }

  } else
    switch (typeof p1) {

      case "object":
        {
          if ("d" in p1 && "n" in p1) {
            n = p1["n"];
            d = p1["d"];
            if ("s" in p1)
              n*= p1["s"];
          } else if (0 in p1) {
            n = p1[0];
            if (1 in p1)
              d = p1[1];
          } else {
            throw InvalidParameter();
          }
          s = n * d;
          break;
        }
      case "number":
        {
          if (p1 < 0) {
            s = p1;
            p1 = -p1;
          }

          if (p1 % 1 === 0) {
            n = p1;
          } else if (p1 > 0) { // check for != 0, scale would become NaN (log(0)), which converges really slow

            if (p1 >= 1) {
              z = Math.pow(10, Math.floor(1 + Math.log(p1) / Math.LN10));
              p1/= z;
            }

            // Using Farey Sequences
            // http://www.johndcook.com/blog/2010/10/20/best-rational-approximation/

            while (B <= N && D <= N) {
              M = (A + C) / (B + D);

              if (p1 === M) {
                if (B + D <= N) {
                  n = A + C;
                  d = B + D;
                } else if (D > B) {
                  n = C;
                  d = D;
                } else {
                  n = A;
                  d = B;
                }
                break;

              } else {

                if (p1 > M) {
                  A+= C;
                  B+= D;
                } else {
                  C+= A;
                  D+= B;
                }

                if (B > N) {
                  n = C;
                  d = D;
                } else {
                  n = A;
                  d = B;
                }
              }
            }
            n*= z;
          } else if (isNaN(p1) || isNaN(p2)) {
            d = n = NaN;
          }
          break;
        }
      case "string":
        {
          B = p1.match(/\d+|./g);

          if (B === null)
            throw InvalidParameter();

          if (B[A] === '-') {// Check for minus sign at the beginning
            s = -1;
            A++;
          } else if (B[A] === '+') {// Check for plus sign at the beginning
            A++;
          }

          if (B.length === A + 1) { // Check if it's just a simple number "1234"
            w = assign(B[A++], s);
          } else if (B[A + 1] === '.' || B[A] === '.') { // Check if it's a decimal number

            if (B[A] !== '.') { // Handle 0.5 and .5
              v = assign(B[A++], s);
            }
            A++;

            // Check for decimal places
            if (A + 1 === B.length || B[A + 1] === '(' && B[A + 3] === ')' || B[A + 1] === "'" && B[A + 3] === "'") {
              w = assign(B[A], s);
              y = Math.pow(10, B[A].length);
              A++;
            }

            // Check for repeating places
            if (B[A] === '(' && B[A + 2] === ')' || B[A] === "'" && B[A + 2] === "'") {
              x = assign(B[A + 1], s);
              z = Math.pow(10, B[A + 1].length) - 1;
              A+= 3;
            }

          } else if (B[A + 1] === '/' || B[A + 1] === ':') { // Check for a simple fraction "123/456" or "123:456"
            w = assign(B[A], s);
            y = assign(B[A + 2], 1);
            A+= 3;
          } else if (B[A + 3] === '/' && B[A + 1] === ' ') { // Check for a complex fraction "123 1/2"
            v = assign(B[A], s);
            w = assign(B[A + 2], s);
            y = assign(B[A + 4], 1);
            A+= 5;
          }

          if (B.length <= A) { // Check for more tokens on the stack
            d = y * z;
            s = /* void */
            n = x + d * v + z * w;
            break;
          }

          /* Fall through on error */
        }
      default:
        throw InvalidParameter();
    }

  if (d === 0) {
    throw DivisionByZero();
  }

  P["s"] = s < 0 ? -1 : 1;
  P["n"] = Math.abs(n);
  P["d"] = Math.abs(d);
};

function modpow(b, e, m) {

  var r = 1;
  for (; e > 0; b = (b * b) % m, e >>= 1) {

    if (e & 1) {
      r = (r * b) % m;
    }
  }
  return r;
}


function cycleLen(n, d) {

  for (; d % 2 === 0;
    d/= 2) {
  }

  for (; d % 5 === 0;
    d/= 5) {
  }

  if (d === 1) // Catch non-cyclic numbers
    return 0;

  // If we would like to compute really large numbers quicker, we could make use of Fermat's little theorem:
  // 10^(d-1) % d == 1
  // However, we don't need such large numbers and MAX_CYCLE_LEN should be the capstone,
  // as we want to translate the numbers to strings.

  var rem = 10 % d;
  var t = 1;

  for (; rem !== 1; t++) {
    rem = rem * 10 % d;

    if (t > MAX_CYCLE_LEN)
      return 0; // Returning 0 here means that we don't print it as a cyclic number. It's likely that the answer is `d-1`
  }
  return t;
}


function cycleStart(n, d, len) {

  var rem1 = 1;
  var rem2 = modpow(10, len, d);

  for (var t = 0; t < 300; t++) { // s < ~log10(Number.MAX_VALUE)
    // Solve 10^s == 10^(s+t) (mod d)

    if (rem1 === rem2)
      return t;

    rem1 = rem1 * 10 % d;
    rem2 = rem2 * 10 % d;
  }
  return 0;
}

function gcd(a, b) {

  if (!a)
    return b;
  if (!b)
    return a;

  while (1) {
    a%= b;
    if (!a)
      return b;
    b%= a;
    if (!b)
      return a;
  }
};

/**
 * Module constructor
 *
 * @constructor
 * @param {number|Fraction=} a
 * @param {number=} b
 */

var DivisionByZero = function() { return new Error("Division by Zero"); };
var InvalidParameter = function() { return new Error("Invalid argument"); };
var NonIntegerParameter = function() { return new Error("Parameters must be integer"); };

// Refactor into a class 重構成class
class Fraction {
  constructor(a, b) {
    parse(a, b);

    if (this instanceof Fraction) {
      const a = gcd(P["d"], P["n"]);
      this["s"] = P["s"];
      this["n"] = P["n"] / a;
      this["d"] = P["d"] / a;
    } else {
      return newFraction(P['s'] * P['n'], P['d']);
    }
  }

  // 將所有方法都放在 class 裡面
  abs() {
    return newFraction(this["n"], this["d"]);
  }

  neg() {
    return newFraction(-this["s"] * this["n"], this["d"]);
  }

  add(a, b) {
    parse(a, b);
    return newFraction(
      this["s"] * this["n"] * P["d"] + P["s"] * this["d"] * P["n"],
      this["d"] * P["d"]
    );
  }

  sub(a, b) {
    parse(a, b);
    return newFraction(
      this["s"] * this["n"] * P["d"] - P["s"] * this["d"] * P["n"],
      this["d"] * P["d"]
    );
  }

  mul(a, b) {
    parse(a, b);
    return newFraction(
      this["s"] * P["s"] * this["n"] * P["n"],
      this["d"] * P["d"]
    );
  }

  div(a, b) {
    parse(a, b);
    return newFraction(
      this["s"] * P["s"] * this["n"] * P["d"],
      this["d"] * P["n"]
    );
  }

  clone() {
    return newFraction(this['s'] * this['n'], this['d']);
  }

  mod(a, b) {
    if (isNaN(this['n']) || isNaN(this['d'])) {
      return new Fraction(NaN);
    }

    if (a === undefined) {
      return newFraction(this["s"] * this["n"] % this["d"], 1);
    }

    parse(a, b);
    if (0 === P["n"] && 0 === this["d"]) {
      throw DivisionByZero();
    }

    return newFraction(
      this["s"] * (P["d"] * this["n"]) % (P["n"] * this["d"]),
      P["d"] * this["d"]
    );
  }

  gcd(a, b) {
    parse(a, b);

    return newFraction(gcd(P["n"], this["n"]) * gcd(P["d"], this["d"]), P["d"] * this["d"]);
  }

  lcm(a, b) {
    parse(a, b);

    if (P["n"] === 0 && this["n"] === 0) {
      return newFraction(0, 1);
    }
    return newFraction(P["n"] * this["n"], gcd(P["n"], this["n"]) * gcd(P["d"], this["d"]));
  }

  ceil(places) {
    places = Math.pow(10, places || 0);

    if (isNaN(this["n"]) || isNaN(this["d"])) {
      return new Fraction(NaN);
    }
    return newFraction(Math.ceil(places * this["s"] * this["n"] / this["d"]), places);
  }

  floor(places) {
    places = Math.pow(10, places || 0);

    if (isNaN(this["n"]) || isNaN(this["d"])) {
      return new Fraction(NaN);
    }
    return newFraction(Math.floor(places * this["s"] * this["n"] / this["d"]), places);
  }

  round(places) {
    places = Math.pow(10, places || 0);

    if (isNaN(this["n"]) || isNaN(this["d"])) {
      return new Fraction(NaN);
    }
    return newFraction(Math.round(places * this["s"] * this["n"] / this["d"]), places);
  }

  roundTo(a, b) {
    parse(a, b);
    return newFraction(this['s'] * Math.round(this['n'] * P['d'] / (this['d'] * P['n'])) * P['n'], P['d']);
  }

  inverse() {
    return newFraction(this["s"] * this["d"], this["n"]);
  }

  pow(a, b) {
    parse(a, b);

    if (P['d'] === 1) {
      if (P['s'] < 0) {
        return newFraction(Math.pow(this['s'] * this["d"], P['n']), Math.pow(this["n"], P['n']));
      } else {
        return newFraction(Math.pow(this['s'] * this["n"], P['n']), Math.pow(this["d"], P['n']));
      }
    }

    if (this['s'] < 0) return null;

    const N = factorize(this['n']);
    const D = factorize(this['d']);

    let n = 1;
    let d = 1;
    for (let k in N) {
      if (k === '1') continue;
      if (k === '0') {
        n = 0;
        break;
      }
      N[k] *= P['n'];

      if (N[k] % P['d'] === 0) {
        N[k] /= P['d'];
      } else return null;
      n *= Math.pow(k, N[k]);
    }

    for (let k in D) {
      if (k === '1') continue;
      D[k] *= P['n'];

      if (D[k] % P['d'] === 0) {
        D[k] /= P['d'];
      } else return null;
      d *= Math.pow(k, D[k]);
    }

    if (P['s'] < 0) {
      return newFraction(d, n);
    }
    return newFraction(n, d);
  }

  equals(a, b) {
    parse(a, b);
    return this["s"] * this["n"] * P["d"] === P["s"] * P["n"] * this["d"];
  }

  compare(a, b) {
    parse(a, b);
    const t = (this["s"] * this["n"] * P["d"] - P["s"] * P["n"] * this["d"]);
    return (0 < t) - (t < 0);
  }

  simplify(eps) {
    if (isNaN(this['n']) || isNaN(this['d'])) {
      return this;
    }

    eps = eps || 0.001;

    const thisABS = this['abs']();
    const cont = thisABS['toContinued']();

    for (let i = 1; i < cont.length; i++) {
      let s = newFraction(cont[i - 1], 1);
      for (let k = i - 2; k >= 0; k--) {
        s = s['inverse']()['add'](cont[k]);
      }

      if (Math.abs(s['sub'](thisABS).valueOf()) < eps) {
        return s['mul'](this['s']);
      }
    }
    return this;
  }

  divisible(a, b) {
    parse(a, b);
    return !(!(P["n"] * this["d"]) || ((this["n"] * P["d"]) % (P["n"] * this["d"])));
  }

  valueOf() {
    return this["s"] * this["n"] / this["d"];
  }

  toFraction(excludeWhole) {
    let whole, str = "";
    let n = this["n"];
    let d = this["d"];
    if (this["s"] < 0) {
      str += '-';
    }

    if (d === 1) {
      str += n;
    } else {
      if (excludeWhole && (whole = Math.floor(n / d)) > 0) {
        str += whole;
        str += " ";
        n %= d;
      }

      str += n;
      str += '/';
      str += d;
    }
    return str;
  }

  toLatex(excludeWhole) {
    let whole, str = "";
    let n = this["n"];
    let d = this["d"];
    if (this["s"] < 0) {
      str += '-';
    }

    if (d === 1) {
      str += n;
    } else {
      if (excludeWhole && (whole = Math.floor(n / d)) > 0) {
        str += whole;
        n %= d;
      }

      str += "\\frac{";
      str += n;
      str += '}{';
      str += d;
      str += '}';
    }
    return str;
  }

  toContinued() {
    let t;
    let a = this['n'];
    let b = this['d'];
    let res = [];

    if (isNaN(a) || isNaN(b)) {
      return res;
    }

    do {
      res.push(Math.floor(a / b));
      t = a % b;
      a = b;
      b = t;
    } while (a !== 1);

    return res;
  }

  toString(dec) {
    let N = this["n"];
    let D = this["d"];

    if (isNaN(N) || isNaN(D)) {
      return "NaN";
    }

    dec = dec || 15;

    const cycLen = cycleLen(N, D);
    const cycOff = cycleStart(N, D, cycLen);

    let str = this['s'] < 0 ? "-" : "";

    str += Math.floor(N / D);

    N %= D;
    N *= 10;

    if (N)
      str += ".";

    if (cycLen) {
      for (let i = cycOff; i--;) {
        str += Math.floor(N / D);
        N %= D;
        N *= 10;
      }
      str += "(";
      for (let i = cycLen; i--;) {
        str += Math.floor(N / D);
        N %= D;
        N *= 10;
      }
      str += ")";
    } else {
      for (let i = dec; N && i--;) {
        str += Math.floor(N / D);
        N %= D;
        N *= 10;
      }
    }
    return str;
  }
}

// export the class 導出該類
export default Fraction;