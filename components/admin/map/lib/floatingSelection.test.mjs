import assert from 'node:assert/strict';
import test from 'node:test';

import { moveSelectionPixels, selectionPixelsFromRect } from './selectionOperations.mjs';

test('floating selection restores the previous destination when moved again', () => {
  const initial = {
    '0,0': '#a',
    '1,0': '#b',
    '0,1': '#c',
    '1,1': '#d',
    '4,0': '#x',
    '5,0': '#y',
    '4,1': '#z',
    '5,1': '#w',
  };

  const firstSelection = { x: 0, y: 0, width: 2, height: 2 };
  const firstSelected = selectionPixelsFromRect(firstSelection, initial);
  const firstMove = moveSelectionPixels({
    basePixels: initial,
    selection: firstSelection,
    selectedPixels: firstSelected,
    dx: 4,
    dy: 0,
    canvasWidth: 8,
    canvasHeight: 4,
  });

  const underlyingAtB = [
    { x: 4, y: 0, color: '#x' },
    { x: 5, y: 0, color: '#y' },
    { x: 4, y: 1, color: '#z' },
    { x: 5, y: 1, color: '#w' },
  ];

  const secondSelection = { x: 4, y: 0, width: 2, height: 2 };
  const secondSelected = selectionPixelsFromRect(secondSelection, firstMove.pixels);
  const secondMove = moveSelectionPixels({
    basePixels: firstMove.pixels,
    selection: secondSelection,
    selectedPixels: secondSelected,
    dx: 1,
    dy: 1,
    canvasWidth: 8,
    canvasHeight: 4,
    underlayPixels: underlyingAtB,
  });

  assert.equal(secondMove.pixels['4,0'], '#x');
  assert.equal(secondMove.pixels['5,0'], '#y');
  assert.equal(secondMove.pixels['4,1'], '#z');
  assert.equal(secondMove.pixels['5,1'], '#a');
  assert.equal(secondMove.pixels['6,1'], '#b');
  assert.equal(secondMove.pixels['5,2'], '#c');
  assert.equal(secondMove.pixels['6,2'], '#d');
});

test('transparent pixels preserve underlying destination when selection is applied', () => {
  const basePixels = {
    '0,0': '#111111',
    '1,0': '#222222',
    '2,0': '#333333',
  };
  const selection = { x: 0, y: 0, width: 2, height: 1 };
  const selectedPixels = [
    { x: 0, y: 0, color: 'transparent' },
    { x: 1, y: 0, color: '#ff00ff' },
  ];

  const result = moveSelectionPixels({
    basePixels,
    selection,
    selectedPixels,
    dx: 2,
    dy: 0,
    canvasWidth: 8,
    canvasHeight: 2,
  });

  assert.equal(result.pixels['3,0'], '#ff00ff');
  assert.equal(result.pixels['2,0'], '#333333');
  assert.equal(result.pixels['0,0'], undefined);
  assert.equal(result.pixels['1,0'], undefined);
  assert.equal(result.pixels['2,1'], undefined);
});
