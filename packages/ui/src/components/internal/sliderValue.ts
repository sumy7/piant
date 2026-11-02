export interface SliderRange {
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly last: number;
  normalize(value: number): number;
  ratio(value: number): number;
  fromRatio(ratio: number): number;
}

const zero = BigInt(0);
const one = BigInt(1);
const two = BigInt(2);
const power10 = (places: number) => BigInt(`1${'0'.repeat(places)}`);
const ratioPrecision = BigInt('1000000000000000000');

/** Use each number's decimal spelling so snapping does not accumulate binary error. */
function decimal(value: number) {
  const [mantissa, exponent = '0'] = String(value).split('e');
  const [whole, fraction = ''] = mantissa.split('.');
  return {
    coefficient: BigInt(whole + fraction),
    places: fraction.length - Number(exponent),
  };
}

function finite(value: number, name: string) {
  if (!Number.isFinite(value))
    throw new RangeError(`Slider ${name} must be finite.`);
}

/** A min-anchored decimal lattice; max need not itself be a legal value. */
export function getSliderRange(min = 0, max = 100, step = 1): SliderRange {
  finite(min, 'min');
  finite(max, 'max');
  finite(step, 'step');
  if (max < min || step <= 0)
    throw new RangeError('Slider requires max >= min and step > 0.');
  const lower = decimal(min);
  const upper = decimal(max);
  const increment = decimal(step);
  const places = Math.max(0, lower.places, upper.places, increment.places);
  const units = (value: ReturnType<typeof decimal>) =>
    value.coefficient * power10(places - value.places);
  const start = units(lower);
  const span = units(upper) - start;
  const stride = units(increment);
  const count = span / stride;
  if (count > BigInt(Number.MAX_SAFE_INTEGER))
    throw new RangeError(
      'Slider range has too many steps for safe numeric values.',
    );
  const at = (index: bigint) => Number(`${start + index * stride}e-${places}`);
  const last = at(count);
  // A decimal step below the spacing of numbers at either endpoint can collapse
  // adjacent stops. Reject that range instead of exposing duplicate values.
  const magnitude = Math.max(Math.abs(min), Math.abs(last));
  let exponent = Math.floor(Math.log2(magnitude));
  // log2 can round upward immediately below a power of two, including MAX_VALUE.
  if (2 ** exponent > magnitude) exponent--;
  const spacing = Math.max(Number.MIN_VALUE, 2 ** (exponent - 52));
  if ((count > one && step < spacing) || (count > zero && last <= min))
    throw new RangeError('Slider step is too small at this numeric magnitude.');

  const snapped = (distance: bigint, denominator: bigint) => {
    if (distance <= zero) return at(zero);
    const unit = stride * denominator;
    const index = (distance * two + unit) / (unit * two);
    return at(index > count ? count : index);
  };
  const normalize = (value: number) => {
    finite(value, 'value');
    if (value <= min) return at(zero);
    if (value >= max) return last;
    const current = decimal(value);
    const extra = Math.max(0, current.places - places);
    const denominator = power10(extra);
    const distance =
      current.coefficient * power10(places + extra - current.places) -
      start * denominator;
    return snapped(distance, denominator);
  };
  return {
    min,
    max,
    step,
    last,
    normalize,
    ratio(value) {
      const current = normalize(value);
      if (span === zero) return 0;
      const distance = units(decimal(current)) - start;
      return (
        Number((distance * ratioPrecision) / span) / Number(ratioPrecision)
      );
    },
    fromRatio(value) {
      finite(value, 'ratio');
      if (value <= 0 || span === zero) return at(zero);
      if (value >= 1) return last;
      const current = decimal(value);
      return snapped(span * current.coefficient, power10(current.places));
    },
  };
}
