const ALIGN_START = '<';
const ALIGN_CENTER = '|';
const ALIGN_END = '>';
const ALIGN_FILL = '<>';
const AXIS_X = 'x';
const AXIS_Y = 'y';

const ALIGN_KEYWORD_START = 's';
const ALIGN_KEYWORD_CENTER = 'c';
const ALIGN_KEYWORD_END = 'e';
const ALIGN_KEYWORD_FILL = 'f';

const MODE_PX = 'px';
const MODE_PERCENT = '%';
const MODE_FRACTION = '/';
const SIZE_MODE_PERCENT = 'percent';
const SIZE_MODE_PERCENT_FREE = 'percentFree';
const SIZE_MODE_FILL = 'fill';
const SIZE_MODE_HUG = 'hug';

export const AXIS = Object.freeze({
  X: AXIS_X,
  Y: AXIS_Y,
} as const);

export const ALIGN_ENUM_KEYWORDS = Object.freeze({
  START: ALIGN_KEYWORD_START,
  CENTER: ALIGN_KEYWORD_CENTER,
  END: ALIGN_KEYWORD_END,
  FILL: ALIGN_KEYWORD_FILL,
} as const);

export const ALIGN_ENUM_ALIASES = Object.freeze({
  START_SYMBOL: ALIGN_START,
  CENTER_SYMBOL: ALIGN_CENTER,
  END_SYMBOL: ALIGN_END,
  FILL_SYMBOL: ALIGN_FILL,
} as const);

export const ALIGN = Object.freeze({
  START: ALIGN_START,
  LEFT: ALIGN_START,
  TOP: ALIGN_START,
  CENTER: ALIGN_CENTER,
  MIDDLE: ALIGN_CENTER,
  END: ALIGN_END,
  RIGHT: ALIGN_END,
  BOTTOM: ALIGN_END,
  FILL: ALIGN_FILL,
  STRETCH: ALIGN_FILL,
  S: ALIGN_KEYWORD_START,
  C: ALIGN_KEYWORD_CENTER,
  E: ALIGN_KEYWORD_END,
  F: ALIGN_KEYWORD_FILL,
} as const);

export const MEASUREMENT_ENUM_CANONICAL = Object.freeze({
  PX: MODE_PX,
  PERCENT: MODE_PERCENT,
} as const);

export const MEASUREMENT_ENUM_INPUT = Object.freeze({
  ...MEASUREMENT_ENUM_CANONICAL,
  FRACTION: MODE_FRACTION,
} as const);

export const MEASUREMENT_MODE = Object.freeze({
  PX: MODE_PX,
  PIXELS: MODE_PX,
  PERCENT: MODE_PERCENT,
  FRACTION: MODE_FRACTION,
} as const);

export const SIZE_MODE_INPUT = Object.freeze({
  PX: MODE_PX,
  PERCENT: SIZE_MODE_PERCENT,
  PERCENT_FREE: SIZE_MODE_PERCENT_FREE,
  FILL: SIZE_MODE_FILL,
  HUG: SIZE_MODE_HUG,
} as const);

export const SIZE_MODE = Object.freeze({
  PX: MODE_PX,
  PERCENT: SIZE_MODE_PERCENT,
  PERCENT_FREE: SIZE_MODE_PERCENT_FREE,
  HUG: SIZE_MODE_HUG,
} as const);
