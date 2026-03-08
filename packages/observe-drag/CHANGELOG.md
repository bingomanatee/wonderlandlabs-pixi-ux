# CHANGELOG FOR observe-drag

## 1.2.0 

- Added `dragObserverFactory` naming and retained `observeDrag` alias for compatibility.
- Added configurable inactivity failsafe (`abortTime`, `0` disables watchdog).
- Added factory-level `activePointer$` injection; default lock scope is per-stage.
- Simplified debug API from `Map` listeners to a single callback:
  `debug(source, message, data)`.
