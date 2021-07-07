#!/usr/bin/env node
/*
The MIT License (MIT)

Copyright (c) Kiyo Chinzei (kchinzei@gmail.com)

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
*/

/*
  calc.ts

  Make Asayake to Wake Project.
  Kiyo Chinzei
  https://github.com/kchinzei/kch-rgbw-calc
*/

import * as lib from 'kch-rgbw-lib';
import { program } from 'commander';

const LEDR = new lib.LEDChip('LED_R', { x: 0.6857, y: 0.3143, maxLuminance: 30.6, name: 'Red' });
const LEDG = new lib.LEDChip('LED_G', { x: 0.2002, y: 0.6976, maxLuminance: 67.2, name: 'Green' });
const LEDB = new lib.LEDChip('LED_B', { x: 0.1417, y: 0.0618, maxLuminance: 8.2,  name: 'Blue' });
let compositeLED = new lib.RGBWLED('default RGB', [LEDR, LEDG, LEDB]);

async function main(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  // const append = (val: string, prev: number[]) => prev.concat([parseInt(val, 10)]);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  const commaSeparatedList = (val: string) => val.split(',');

  program
    .option('-p --pwm <number>', 'Comma-separated list of PWM value', commaSeparatedList, [])
    .option('-a --alpha <number>', '(same as -p/--pwm)', commaSeparatedList, [])
    .option('-f --file <path>', 'Read LED information from JSON file (default: use typical R-G-B LEDs.)')
    .option('-n --normalize', 'Normalize PWM to [0,1] when any of alpha > 1 (default: NOT normalize)')
    .option('-M --max', 'Compute maximum Y at given color.')
    .option('-c --color <CSpaceTypes>', 'Use specified colorspace', 'xyY')
    .option('-l --list', 'List all LEDs in (x,y,Y) format')
    .option('-v --verbose', 'Verbose messages')
    .usage('[options] : Composite LED calculator based on kch-rgbw-lib.\n' +
           `       ${program.name()} [options] c1,c2[,c3] : Compute LED PWM (alpha values) for given color.\n` +
           `       ${program.name()} [options] -p p1,...,pn : Synthesize composite color using list of PWM` )
    .addHelpText('after', '\n' +
           'Colorspace and range of color parameters: \n' +
           '  -c rgb : in RGB (0-1, 0-1, 0-1) \n' +
           '  -c hsv : in HSV (0-360, 0-1, 0-1) \n' +
           '  -c XYZ : in XYZ (0-, 0-, 0-) \n' +
           '  -c xyY : in xyY (0-0.73, 0-0.83, 0-)')
    .parse(process.argv);
  const options = program.opts();

  if (options.file) {
    try {
      compositeLED = await lib.parseRGBWLEDfromJSONFileAsync(options.file);
    } catch (e) {
      // The file might be an array of LED.
      try {
        const tmpArray = await lib.parseLEDChipArrayfromJSONFileAsync(options.file);
        compositeLED = new lib.RGBWLED(`Composite LED from ${options.file}`, tmpArray);
      } catch (ee) {
        console.error(`Fail to load from ${options.file}`);
        process.exit(1);
      }
    }
  }

  if (options.list) {
    console.log('LEDs used in this program are');
    console.dir(compositeLED.LED);
  }

  // Main task
  if (options.alpha.length !== 0 || options.pwm.length !== 0) { // eslint-disable-line @typescript-eslint/no-unsafe-member-access
    if (program.args.length !== 0) {
      console.error(`Use error: Unexpected remaining arguments '${program.args}'`); // eslint-disable-line @typescript-eslint/restrict-template-expressions
      process.exit(1);
    }

    // Solve composite xyY from given PWM values.
    let aList: number[] = new Array(compositeLED.LED.length).fill(0) as number[];
    if (options.alpha.length !== 0) { // eslint-disable-line @typescript-eslint/no-unsafe-member-access
      for (let i=0; i<compositeLED.LED.length && i<options.alpha.length; i++) { // eslint-disable-line @typescript-eslint/no-unsafe-member-access
        aList[i] = parseFloat(options.alpha[i]); // eslint-disable-line @typescript-eslint/no-unsafe-member-access
      }
    } else {
      for (let i=0; i<compositeLED.LED.length && i<options.pwm.length; i++) {  // eslint-disable-line @typescript-eslint/no-unsafe-member-access
        aList[i] = parseFloat(options.pwm[i]); // eslint-disable-line @typescript-eslint/no-unsafe-member-access
      }
    }

    if (options.normalize)
      aList = normalize(aList);

    // Solve forward problem.
    const c: lib.CSpace = compositeLED.alpha2Color(aList);

    if (options.verbose) {
      console.log(`Input PWM values: ${aList}`); // eslint-disable-line @typescript-eslint/restrict-template-expressions
    }
    console.log(`Output composite color: ${JSON.stringify(c.conv(options.color))}`);
  } else {
    // Solve PWM values from given composite xyY.
    const a: number[] = [ 0, 0, 1 ];

    let i = 0;

    // Remaining args are for x, y and Y
    for (const arg of program.args) {
      const b = commaSeparatedList(arg);
      for (const s of b) {
        a[i++] = parseFloat(s);
        if (i === 3)
          break;
      }
    }

    if ((options.color === 'XYZ' || options.color === 'rgb' || options.color === 'hsv') && i <= 2) {
      console.error(`Use error: Three parameters required for color space '${options.color}' but only ${i+1} given.`);
      process.exit(1);
    } else if ((options.color === 'xyY' || options.color === 'xy') && i <= 1) {
      console.error(`Use error: At least two parameters required for color space '${options.color}' but only ${i+1} given.`);
      process.exit(1);
    }
    try {
      const c = new lib.CSpace(options.color, a);
      const c1 = c.xyY();

      if (options.max) {
        const maxY = await compositeLED.maxLuminanceAtAsync(c1);
        if (maxY < 0) {
          console.error(`Given color ${JSON.stringify(c)} seems outside the gamut.`);
          process.exit(1);
        }
        c1.Y = maxY;
      }

      const alphas = await compositeLED.color2AlphaAsync(c1);
      if (options.verbose)
        console.log(`Input composite color: ${JSON.stringify(c1.conv(options.color))}`);
      console.log(`Output PWM values: ${alphas}`); // eslint-disable-line @typescript-eslint/restrict-template-expressions
    } catch (e) {
      console.error('Error');
      console.error(e);
      process.exit(1);
    }
  }
}

const qSmall = 1e-6;

function round(val: number): number {
  if (1 < val && val < 1+qSmall)
    return 1;
  else if (val < qSmall)
    return 0;
  else
    return val;
}

function normalize(alpha: number[]): number[] {
  let aMax = 0;
  alpha = alpha.map(round);
  for (const a of alpha)
    if (a > aMax)
      aMax = a;
  if (aMax > 1)
    alpha = alpha.map((val) => val/aMax);
  return alpha;
}

void main();
