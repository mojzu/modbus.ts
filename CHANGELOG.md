# CHANGELOG

## 3.0.2 (2018-08-07)

### Changed

- Package dependency updates.

---

## 3.0.1 (2018-07-31)

### Changed

- Package dependency updates.

---

## 3.0.0 (2018-07-30)

### Added

- Make `serialport` dependency optional by making `port` constructor argument to `rtu.Master` a generic interface (contributed by Wolf Walter).
- Reimplement master abstract class queue using observables, requests are sent in order of function calls, requests are queue until previous requests completed.
- Add `destroy` method to `rtu.Master` and `tcp.Client` classes, cleans up observables and disconnects port/socket if connected, prefer use of this over `close`, `disconnect` methods unless trying to reconnect.

### Changed

- Refactoring for file/class name consistency with other libraries.
- Update documentation link in `README.md`.
- Update `examples` directory files to showcase request order and queueing.
- Reduced use of `instanceof` for checking types, use instance property as secondary test.
