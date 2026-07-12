export type SelectPlacement = 'auto' | 'top' | 'bottom';

export interface SelectModelOption {
  label: string;
  disabled?: boolean;
}

export interface SelectLayoutInput {
  trigger: {
    top: number;
    bottom: number;
    left: number;
    width: number;
  };
  viewport: {
    width: number;
    height: number;
  };
  placement: SelectPlacement;
  maxMenuHeight: number;
  gap?: number;
  viewportPadding?: number;
}

export interface SelectLayout {
  placement: Exclude<SelectPlacement, 'auto'>;
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  transform: 'none' | 'translateY(-100%)';
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(Math.max(value, minimum), maximum);

export function resolveSelectLayout({
  trigger,
  viewport,
  placement,
  maxMenuHeight,
  gap = 8,
  viewportPadding = 8,
}: SelectLayoutInput): SelectLayout {
  const spaceAbove = Math.max(0, trigger.top);
  const spaceBelow = Math.max(0, viewport.height - trigger.bottom);
  const resolvedPlacement =
    placement === 'auto'
      ? spaceAbove > spaceBelow
        ? 'top'
        : 'bottom'
      : placement;
  const availableSpace = resolvedPlacement === 'top' ? spaceAbove : spaceBelow;
  const width = Math.max(
    0,
    Math.min(trigger.width, Math.max(0, viewport.width - viewportPadding * 2)),
  );
  const maximumLeft = Math.max(viewportPadding, viewport.width - viewportPadding - width);

  return {
    placement: resolvedPlacement,
    top: resolvedPlacement === 'top' ? trigger.top - gap : trigger.bottom + gap,
    left: clamp(trigger.left, viewportPadding, maximumLeft),
    width,
    maxHeight: Math.max(0, Math.min(maxMenuHeight, availableSpace - gap - viewportPadding)),
    transform: resolvedPlacement === 'top' ? 'translateY(-100%)' : 'none',
  };
}

export function getNextEnabledIndex<T extends SelectModelOption>(
  options: readonly T[],
  currentIndex: number,
  direction: 1 | -1,
): number {
  if (options.length === 0) return -1;

  let index = currentIndex >= 0 && currentIndex < options.length
    ? currentIndex
    : direction === 1
      ? -1
      : 0;

  for (let step = 0; step < options.length; step += 1) {
    index = (index + direction + options.length) % options.length;
    if (!options[index]?.disabled) return index;
  }

  return -1;
}

export function findTypeaheadIndex<T extends SelectModelOption>(
  options: readonly T[],
  query: string,
  startIndex: number,
): number {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery || options.length === 0) return -1;

  const normalizedStart = startIndex >= 0 && startIndex < options.length ? startIndex : -1;

  for (let offset = 1; offset <= options.length; offset += 1) {
    const index = (normalizedStart + offset) % options.length;
    const option = options[index];
    if (!option?.disabled && option.label.toLocaleLowerCase().startsWith(normalizedQuery)) {
      return index;
    }
  }

  return -1;
}

export function toggleSelectedValue<T extends string>(
  values: readonly T[],
  value: T,
): T[] {
  return values.includes(value)
    ? values.filter((selectedValue) => selectedValue !== value)
    : [...values, value];
}
