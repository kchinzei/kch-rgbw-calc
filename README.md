# Kch RGBW Calc

[![npm version](https://badge.fury.io/js/kch-rgbw-calc.svg)](https://badge.fury.io/js/kch-rgbw-calc)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Calculate composite LED color from brightness of primary LEDs, vice versa.

It is a sample node command line script using [kch-rgbw-lib](https://www.npmjs.com/package/kch-rgbw-lib).

## Usage

`calc [options] `: Composite LED calculator based on kch-rgbw-lib.

`getcolor [options] p1,...,pn `: Synthesize composite color from comma-separated list of PWM values.

`getpwm [options] (color parameters) `: Compute LED PWM (alpha values) to synthesize given comma-separated color.

Run `(command) -h` to see help messages. `getcolor` and `getpwm` are part of `calc`.

## Options

- `-f, --file <path>`  
  Read LED information from JSON file (default: use typical R-G-B LEDs.)
- `-n, --normalize`  
  Normalize PWM to [0,1] when any of alpha > 1
- `-M, --max`  
  Compute maximum luminance at given color.
- `-c, --color <CSpaceTypes>`  
  Use specified color space (default: `'xyY'`)
- `-l, --list` :
  List all LEDs in `'xyY'` format
- `-v, --verbose` :
  Verbose messages
- `-h, --help` :
  Display help for command

Color space and range of color parameters are:

- `-c rgb` : in RGB (0-1, 0-1, 0-1)
- `-c hsv` : in HSV (0-360, 0-1, 0-1)
- `-c XYZ` : in XYZ (0-, 0-, 0-)
- `-c xyY` : in CIE1931 + Y (0-0.73, 0-0.83, 0-)

## Installation

`npm install kch-rgbw-calc`

## Examples

### 1. List default R-G-B LEDs.

These programs have default R-G-B LEDs set. If you don't provide a JSON file by `-f` option, the default LEDs are used.
Find example of the JSON file in [rgbw-led-01.json](./rgbw-led-01.json).

```Shell
> getpwm -l
LEDs used in this program are
[
  LEDChip {
    _type: 'xyY',
    _a: [ 0.6857, 0.3143, 30.6 ],
    ... (omit)
]
```

### 2. PWM values to produce 6500K white at maximum luminance using the default R-G-B LEDs.

6500K white in CIE1931 chromaticity is (0.3155, 0.3270).

```Shell
> getpwm 0.3155,0.3270,1 -M
Output PWM values: 0.9362416831504904,1,0.9816423115080402
```

If omitting `-M`, you get this.

```Shell
> getpwm 0.3155,0.3270,1
Output PWM values: 0.009011121637358305,0.009624781506240486,0.00944809276554575
```

It's PWM for luminance = 1.

### 3. Composite color when turning all default LED at maximum brightness

```Shell
> getcolor 1,1,1
Output composite color: {"_type":"xyY","_a":[0.32124386658937365,0.3247792103347052,106.00000000000001]}
```

If you want to get this in RGB,

```Shell
> getcolor 1,1,1 -c rgb
Output composite color: {"_type":"rgb","_a":[0.9999999999999999,0.9999999999999999,0.9999999999999999]}
```

Saturated? Yes. It's because these programs (and `kch-rgbw-lib`) use `'xyY'` color space as their basic color representation. `'xyY'` treats `Y` component as luminance, which is absolute value, while `'rgb'` and `'hsv'` spaces based on brightness, which is relative to max luminance.

The problem is that 'max luminance' is not uniform across the gamut of different LEDs.
In very short, max luminance varies by color to represent.
It is problematic in case of composite LEDs. To avoid this issue, I recommend you to use `'xyY'` instead of `'rgb'`.

But you probably still need to convert between RGB. Try smaller PWM values. Since max luminance was 106 for PWM=1.0, we try 0.001.

```Shell
> getcolor 0.001,0.001,0.001 -c rgb
Output composite color: {"_type":"rgb","_a":[0.3799334439841642,0.3525921606511399,0.3596477933688514]}
```

Yes, it's white slightly shifted to red.

# License

The MIT License (MIT)
Copyright (c) K. Chinzei (kchinzei@gmail.com)
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
