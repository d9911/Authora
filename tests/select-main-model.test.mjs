import assert from 'node:assert/strict';
import test from 'node:test';
import {
  findTypeaheadIndex,
  getNextEnabledIndex,
  resolveSelectLayout,
  toggleSelectedValue,
} from '../frontend/src/shared/ui/SelectMain/selectMainModel.ts';

const options = [
  { value: 'fr', label: 'France' },
  { value: 'de', label: 'Germany', disabled: true },
  { value: 'jp', label: 'Japan' },
];

test('auto placement chooses the side with more viewport space', () => {
  assert.equal(
    resolveSelectLayout({
      trigger: { top: 80, bottom: 126, left: 20, width: 240 },
      viewport: { width: 800, height: 700 },
      placement: 'auto',
      maxMenuHeight: 320,
    }).placement,
    'bottom',
  );

  assert.equal(
    resolveSelectLayout({
      trigger: { top: 560, bottom: 606, left: 20, width: 240 },
      viewport: { width: 800, height: 700 },
      placement: 'auto',
      maxMenuHeight: 320,
    }).placement,
    'top',
  );
});

test('explicit placement overrides automatic direction', () => {
  const layout = resolveSelectLayout({
    trigger: { top: 30, bottom: 76, left: 20, width: 240 },
    viewport: { width: 800, height: 700 },
    placement: 'top',
    maxMenuHeight: 320,
  });

  assert.equal(layout.placement, 'top');
  assert.equal(layout.transform, 'translateY(-100%)');
});

test('layout clamps popup width and horizontal position to the viewport', () => {
  const layout = resolveSelectLayout({
    trigger: { top: 100, bottom: 146, left: 260, width: 120 },
    viewport: { width: 320, height: 640 },
    placement: 'bottom',
    maxMenuHeight: 500,
  });

  assert.equal(layout.left, 192);
  assert.equal(layout.width, 120);
  assert.equal(layout.top, 154);
  assert.equal(layout.maxHeight, 478);
});

test('keyboard navigation skips disabled options and wraps', () => {
  assert.equal(getNextEnabledIndex(options, 0, 1), 2);
  assert.equal(getNextEnabledIndex(options, 2, 1), 0);
  assert.equal(getNextEnabledIndex(options, 0, -1), 2);
  assert.equal(getNextEnabledIndex(options, -1, 1), 0);
  assert.equal(
    getNextEnabledIndex(
      [
        { value: 'a', label: 'A', disabled: true },
        { value: 'b', label: 'B', disabled: true },
      ],
      -1,
      1,
    ),
    -1,
  );
});

test('typeahead finds the next enabled matching option', () => {
  assert.equal(findTypeaheadIndex(options, 'j', 0), 2);
  assert.equal(findTypeaheadIndex(options, 'fr', 2), 0);
  assert.equal(findTypeaheadIndex(options, 'g', 0), -1);
  assert.equal(findTypeaheadIndex(options, '  ', 0), -1);
});

test('multi value toggle adds and removes without mutating the input', () => {
  const initial = ['fr'];
  const added = toggleSelectedValue(initial, 'jp');
  const removed = toggleSelectedValue(added, 'fr');

  assert.deepEqual(initial, ['fr']);
  assert.deepEqual(added, ['fr', 'jp']);
  assert.deepEqual(removed, ['jp']);
});
