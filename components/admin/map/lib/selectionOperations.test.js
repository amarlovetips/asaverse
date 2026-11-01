import assert from 'node:assert/strict';
import test from 'node:test';

import {
  deleteSelectionPixels,
  moveSelectionPixels,
  selectionPixelsFromRect,
  transformSelectionPixels,
} from './selectionOperations.js';

test('selection drag moves pixels once without deleting source before commit', () => {
  const basePixels = {
    '1,0': '#ff0000',
    '2,0': '#ff0000',
    '1,1': '#00ff00',
    '2,1': '#00ff00',
    '5,0': '#0000ff',
    '5,1': '#0000ff',
    '3,0': '#ffff00',
    '3,1': '#ffffff',
  };
  const selection = { x: 1, y: 0, width: 2, height: 2 };
  const selectedPixels = selectionPixelsFromRect(selection, basePixels);

  const result = moveSelectionPixels({
    basePixels,
    selection,
    selectedPixels,
    dx: 2,
    dy: 0,
    canvasWidth: 8,
    canvasHeight: 4,
  });

  assert.equal(result.moved, true);
  assert.equal(result.selectedPixels.length, 4);
  assert.equal(new Set(result.selectedPixels.map((pixel) => `${pixel.x},${pixel.y}`)).size, 4);
  assert.equal(result.pixels['3,0'], '#ff0000');
  assert.equal(result.pixels['4,0'], '#ff0000');
  assert.equal(result.pixels['3,1'], '#00ff00');
  assert.equal(result.pixels['4,1'], '#00ff00');
  assert.equal(result.pixels['5,0'], '#0000ff');
  assert.equal(result.pixels['5,1'], '#0000ff');
  assert.equal(result.pixels['1,0'], undefined);
  assert.equal(result.pixels['2,1'], undefined);
  assert.equal(result.selection.x, 3);
  assert.equal(result.selection.y, 0);
});

test('dragging beyond canvas is rejected without mutating the original pixels', () => {
  const basePixels = { '0,0': '#111111', '1,0': '#222222' };
  const selection = { x: 0, y: 0, width: 2, height: 1 };
  const selectedPixels = selectionPixelsFromRect(selection, basePixels);

  const result = moveSelectionPixels({
    basePixels,
    selection,
    selectedPixels,
    dx: 10,
    dy: 0,
    canvasWidth: 3,
    canvasHeight: 1,
  });

  assert.equal(result.moved, false);
  assert.deepEqual(result.pixels, basePixels);
  assert.deepEqual(result.selectedPixels, selectedPixels);
});

test('delete selection removes only selected pixels and preserves unrelated artwork', () => {
  const basePixels = {
    '0,0': '#aa0000',
    '1,0': '#00aa00',
    '2,0': '#0000aa',
    '0,1': '#ff00ff',
  };
  const selectedPixels = [{ x: 0, y: 0, color: '#aa0000' }, { x: 1, y: 0, color: '#00aa00' }];

  const nextPixels = deleteSelectionPixels(basePixels, selectedPixels);

  assert.equal(nextPixels['0,0'], undefined);
  assert.equal(nextPixels['1,0'], undefined);
  assert.equal(nextPixels['2,0'], '#0000aa');
  assert.equal(nextPixels['0,1'], '#ff00ff');
});

test('flip horizontal and vertical transform selected pixels within the original canvas', () => {
  const basePixels = {
    '0,0': '#a',
    '1,0': '#b',
    '0,1': '#c',
    '1,1': '#d',
  };
  const selection = { x: 0, y: 0, width: 2, height: 2 };
  const selectedPixels = selectionPixelsFromRect(selection, basePixels);

  const horizontal = transformSelectionPixels({
    basePixels,
    selection,
    selectedPixels,
    mode: 'flip-horizontal',
    canvasWidth: 4,
    canvasHeight: 4,
  });
  assert.deepEqual(horizontal.selectedPixels.map((pixel) => `${pixel.x},${pixel.y}`), ['1,0', '0,0', '1,1', '0,1']);
  assert.equal(horizontal.pixels['1,0'], '#a');
  assert.equal(horizontal.pixels['0,0'], '#b');

  const vertical = transformSelectionPixels({
    basePixels,
    selection,
    selectedPixels,
    mode: 'flip-vertical',
    canvasWidth: 4,
    canvasHeight: 4,
  });
  assert.deepEqual(vertical.selectedPixels.map((pixel) => `${pixel.x},${pixel.y}`), ['0,1', '1,1', '0,0', '1,0']);
  assert.equal(vertical.pixels['0,1'], '#a');
  assert.equal(vertical.pixels['1,1'], '#b');
});

test('rotate left and rotate right preserve transparency and canvas bounds', () => {
  const basePixels = {
    '0,0': '#a',
    '1,0': '#b',
    '0,1': '#c',
    '1,1': '#d',
    '2,1': '#e',
  };
  const selection = { x: 0, y: 0, width: 3, height: 2 };
  const selectedPixels = selectionPixelsFromRect(selection, basePixels);

  const left = transformSelectionPixels({
    basePixels,
    selection,
    selectedPixels,
    mode: 'rotate-left',
    canvasWidth: 6,
    canvasHeight: 4,
  });
  assert.equal(left.selection.width, 2);
  assert.equal(left.selection.height, 3);
  assert.equal(left.pixels['0,0'], '#c');
  assert.equal(left.pixels['1,0'], '#d');
  assert.equal(left.pixels['0,1'], '#a');
  assert.equal(left.pixels['0,2'], '#b');

  const right = transformSelectionPixels({
    basePixels,
    selection,
    selectedPixels,
    mode: 'rotate-right',
    canvasWidth: 6,
    canvasHeight: 4,
  });
  assert.equal(right.selection.width, 2);
  assert.equal(right.selection.height, 3);
  assert.equal(right.pixels['1,0'], '#a');
  assert.equal(right.pixels['1,1'], '#b');
  assert.equal(right.pixels['1,2'], '#c');
});
