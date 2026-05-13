# performance-tests

Test performance of parsing, processing, and serialization of 3D models.

Runs a suite over a directory of `.stl` files using [meshlib], records
per-model timings (parsing, cleansing, optimization, 2-manifold check,
hull voxelization, volume fill), and emits both a JSONL data file and
an HTML report.

[meshlib]: https://github.com/brickify/meshlib


## Requirements

- Node.js (with ESM support)
- An `stl` corpus in `./models/`


## Install

```sh
npm install
```


## Usage

Place `.stl` files in `./models/`, then run the test suite:

```sh
npm test
```

Note: the performance suite in `src/index.ts` is currently registered
via `describe.skip` — un-skip it to actually run the benchmark.

Other scripts:

```sh
npm run build      # Compile TypeScript to dist/
npm run dev        # Run via tsx without building
npm start          # Run compiled output
npm run typecheck  # Type-check without emitting
npm run clean      # Remove dist/
```


## Output

Each run writes to `./results/<UTC-timestamp>/`:

- `report.html` — rendered from `templates/report.pug`, includes the
  current git branch and commit
- `data.jsonl` — one JSON object per model with all measured metrics
- `debug.log` — winston log at `silly` level


## Layout

```
src/
  index.ts              # Test runner, streams models through Tester
  reportGenerator.ts    # Pug-based HTML report
templates/report.pug    # Report template
assets/index.js         # Client-side script loaded by the report
```


## License

MIT © Adrian Sieber
