export const WINDOW_STATUS = {
  CLEAN: 'clean',
  DIRTY: 'dirty',
  DELETED: 'deleted',
} as const;

export type WindowStatus = (typeof WINDOW_STATUS)[keyof typeof WINDOW_STATUS];

export const TITLEBAR_MODE = {
  PERSISTENT: 'persistent',
  ON_HOVER: 'onHover',
} as const;

export type TitlebarMode = (typeof TITLEBAR_MODE)[keyof typeof TITLEBAR_MODE];


export const LOAD_STATUS  = {
  START: 'start',
  LOADED: 'loaded',
  ERROR: 'error'
} as const;

export type LoadStatus = (typeof LOAD_STATUS)[keyof typeof LOAD_STATUS];

export const DIMENSION_TYPE = {
  SIZE: 'size',
  SCALE: 'scale'
} as const;

export type DimensionType = (typeof DIMENSION_TYPE)[keyof typeof DIMENSION_TYPE];

export const STYLE_VARIANT = {
  DEFAULT: 'default',
  LIGHT_GRAYSCALE: 'light-grayscale',
  INVERTED: 'inverted',
  BLUE: 'blue',
  ALERT_INFO: 'alert-info',
  ALERT_DANGER: 'alert-danger',
  ALERT_WARNING: 'alert-warning',
} as const;

export type StyleVariant = (typeof STYLE_VARIANT)[keyof typeof STYLE_VARIANT];