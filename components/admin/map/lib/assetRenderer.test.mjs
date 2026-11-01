import assert from 'node:assert/strict';
import test from 'node:test';

import { getAssetCanvasDimensions, getMapGeneratorAssetMetrics, getOccupiedAssetBounds } from './assetRenderer.ts';

test('asset canvas dimensions preserve original aspect ratio and transparency margins', () => {
  const asset = {
    id: 'tree-24',
    name: 'Tree',
    category: 'tree',
    canvas_width: 24,
    canvas_height: 24,
    pixel_data: {
      '6,4': '#111111',
      '7,4': '#222222',
      '6,5': '#333333',
      '8,10': '#444444',
    },
    palette: ['#111111', '#222222', '#333333', '#444444'],
    updated_at: '2025-01-01T00:00:00.000Z',
    is_published: true,
  };

  const dims = getAssetCanvasDimensions(asset);
  assert.equal(dims.width, 24);
  assert.equal(dims.height, 24);

  const bounds = getOccupiedAssetBounds(asset);
  assert.equal(bounds.width, 3);
  assert.equal(bounds.height, 7);
  assert.equal(bounds.hasPixels, true);
});

test('asset canvas dimensions remain authoritative even when pixels are sparse', () => {
  const asset = {
    id: 'wide-16x10',
    name: 'Wide object',
    category: 'object',
    canvas_width: 16,
    canvas_height: 10,
    pixel_data: {
      '15,9': '#ffffff',
    },
    updated_at: '2025-01-01T00:00:00.000Z',
    is_published: true,
  };

  const dims = getAssetCanvasDimensions(asset);
  assert.equal(dims.width, 16);
  assert.equal(dims.height, 10);
  assert.equal(dims.width / dims.height, 1.6);

  const bounds = getOccupiedAssetBounds(asset);
  assert.equal(bounds.width, 1);
  assert.equal(bounds.height, 1);
  assert.equal(bounds.minX, 15);
  assert.equal(bounds.minY, 9);
});

test('animated assets use shared visible bounds across all frames', () => {
  const asset = {
    id: 'animated-bridge',
    name: 'Animated bridge',
    category: 'object',
    canvas_width: 24,
    canvas_height: 12,
    pixel_data: { '0,0': '#000000' },
    animation: {
      enabled: true,
      duration_ms: 250,
      loop: true,
      frames: [
        { '5,4': '#111111', '6,4': '#222222' },
        { '2,1': '#333333', '3,1': '#444444', '10,9': '#555555' },
      ],
    },
    updated_at: '2025-01-01T00:00:00.000Z',
    is_published: true,
  };

  const bounds = {
    width: 9,
    height: 9,
    minX: 2,
    minY: 1,
    hasPixels: true,
  };

  const actual = getMapGeneratorAssetMetrics(asset);
  assert.deepEqual(actual, bounds);
});
