# CHANGELOG

## 3.1.51 (2020-10-02)

### Changed

- Updated package dependencies.

---

## 3.1.50 (2020-09-14)

### Changed

- Updated package dependencies.

---

## 3.1.49 (2020-09-02)

### Changed

- Updated package dependencies.

---

## 3.1.48 (2020-08-03)

### Changed

- Updated package dependencies.

---

## 3.1.47 (2020-07-02)

### Changed

- Updated package dependencies.

---

## 3.1.46 (2020-06-02)

### Changed

- Updated package dependencies.

---

## 3.1.45 (2020-05-04)

### Changed

- Updated package dependencies.

---

## 3.1.44 (2020-04-02)

### Changed

- Updated package dependencies.

---

## 3.1.43 (2020-02-23)

### Changed

- Updated package dependencies.

---

## 3.1.42 (2019-12-29)

### Changed

- Updated package dependencies.

---

## 3.1.41 (2019-11-19)

### Changed

- Downgrade TypeScript version for compatability.

---

## 3.1.40 (2019-11-19)

### Changed

- Updated package dependencies.

---

## 3.1.39 (2019-10-20)

### Changed

- Updated package dependencies.

---

## 3.1.38 (2019-10-05)

### Changed

- Updated package dependencies.

---

## 3.1.37 (2019-08-19)

### Changed

- Updated package dependencies.

---

## 3.1.36 (2019-08-04)

### Changed

- Package dependency updates.

---

## 3.1.35 (2019-07-15)

### Changed

- Package dependency updates.

---

## 3.1.34 (2019-07-02)

### Changed

- Package dependency updates.

---

## 3.1.33 (2019-06-06)

### Changed

- Package dependency updates.

---

## 3.1.32 (2019-05-16)

### Changed

- Package dependency updates.

---

## 3.1.31 (2019-05-11)

### Changed

- Package dependency updates.

---

## 3.1.30 (2019-04-27)

### Changed

- Package dependency updates.
- Replaced yarn with npm.

---

## 3.1.29 (2019-03-24)

### Changed

- Package dependency updates.

---

## 3.1.28 (2019-03-11)

### Changed

- Package dependency updates.

---

## 3.1.27 (2019-02-18)

### Changed

- Package dependency updates.

---

## 3.1.26 (2019-02-13)

### Changed

- Package dependency updates.

---

## 3.1.25 (2019-02-09)

### Changed

- Package dependency updates.

---

## 3.1.24 (2019-02-04)

### Changed

- Package dependency updates.

---

## 3.1.23 (2019-02-01)

### Changed

- Package dependency updates.

---

## 3.1.22 (2019-01-23)

### Changed

- Package dependency updates.

---

## 3.1.21 (2019-01-19)

### Changed

- Package dependency updates.

---

## 3.1.20 (2019-01-12)

### Changed

- Package dependency updates.

---

## 3.1.19 (2019-01-01)

### Changed

- Package dependency updates.

---

## 3.1.18 (2018-12-23)

### Changed

- Package dependency updates.

---

## 3.1.17 (2018-12-09)

### Changed

- Package dependency updates.

---

## 3.1.16 (2018-12-02)

### Changed

- Package dependency updates.

---

## 3.1.15 (2018-11-27)

### Changed

- Package dependency updates.

---

## 3.1.14 (2018-11-24)

### Changed

- Package dependency updates.

---

## 3.1.13 (2018-11-18)

### Changed

- Package dependency updates.

---

## 3.1.12 (2018-11-13)

### Changed

- Package dependency updates.

---

## 3.1.11 (2018-11-06)

### Changed

- Package dependency updates.

---

## 3.1.10 (2018-11-04)

### Changed

- Package dependency updates.

---

## 3.1.9 (2018-10-25)

### Changed

- Package dependency updates.

---

## 3.1.8 (2018-10-10)

### Changed

- Package dependency updates.

---

## 3.1.7 (2018-10-01)

### Changed

- Package dependency updates.

---

## 3.1.6 (2018-09-26)

### Changed

- Package dependency updates.

---

## 3.1.5 (2018-09-15)

### Changed

- Package dependency updates.

---

## 3.1.4 (2018-09-03)

### Changed

- Package dependency updates.

---

## 3.1.3 (2018-08-30)

### Changed

- Package dependency updates.

---

## 3.1.2 (2018-08-27)

### Changed

- Package dependency updates.

---

## 3.1.1 (2018-08-19)

### Changed

- Package dependency updates.

---

## 3.1.0 (2018-08-11)

### Changed

- Refactored `MasterError` class constructor arguments for consistency with `container.ts`. Check usage of error `name` any `value` properties, search and replace: `ModbusTcpClientWriteError`, `ModbusTcpClientWriteError`.
- Package dependency updates.

---

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
