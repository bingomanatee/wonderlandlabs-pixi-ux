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

