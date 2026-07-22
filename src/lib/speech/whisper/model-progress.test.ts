import { createProgressAggregator } from './model-progress';

describe('createProgressAggregator', () => {
  it('reports percent for a single file as it downloads', () => {
    const next = createProgressAggregator();
    expect(next({ status: 'progress', file: 'a.onnx', loaded: 25, total: 100 })).toBe(25);
    expect(next({ status: 'progress', file: 'a.onnx', loaded: 50, total: 100 })).toBe(50);
    expect(next({ status: 'progress', file: 'a.onnx', loaded: 100, total: 100 })).toBe(100);
  });

  it('weights percent across multiple files by size', () => {
    const next = createProgressAggregator();
    next({ status: 'progress', file: 'big.onnx', loaded: 0, total: 300 });
    next({ status: 'progress', file: 'small.json', loaded: 0, total: 100 });
    // 150 of 400 total bytes
    next({ status: 'progress', file: 'big.onnx', loaded: 100, total: 300 });
    expect(
      next({ status: 'progress', file: 'small.json', loaded: 50, total: 100 }),
    ).toBe(37);
  });

  it('marks a file complete on its done event', () => {
    const next = createProgressAggregator();
    next({ status: 'progress', file: 'a.onnx', loaded: 10, total: 200 });
    expect(next({ status: 'done', file: 'a.onnx' })).toBe(100);
  });

  it('ignores events without file size information', () => {
    const next = createProgressAggregator();
    expect(next({ status: 'initiate', file: 'a.onnx' })).toBeNull();
    expect(next({ status: 'ready' })).toBeNull();
    expect(next({ status: 'progress', file: 'a.onnx', loaded: 5 })).toBeNull();
  });

  it('never reports more than 100', () => {
    const next = createProgressAggregator();
    expect(
      next({ status: 'progress', file: 'a.onnx', loaded: 150, total: 100 }),
    ).toBe(100);
  });
});
