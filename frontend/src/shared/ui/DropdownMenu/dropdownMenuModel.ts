// Денис: файл создан или изменён по запросу пользователя.

export type DropdownPlacement = 'top' | 'bottom';

export interface DropdownPlacementInput {
  triggerTop: number;
  triggerBottom: number;
  menuHeight: number;
  viewportHeight: number;
  viewportTop?: number;
  gap?: number;
  viewportPadding?: number;
}

export interface DropdownPlacementResult {
  placement: DropdownPlacement;
  availableHeight: number;
}

export interface DropdownMenuItemState {
  disabled?: boolean;
}

export function resolveDropdownPlacement({
  triggerTop,
  triggerBottom,
  menuHeight,
  viewportHeight,
  viewportTop = 0,
  gap = 8,
  viewportPadding = 8,
}: DropdownPlacementInput): DropdownPlacementResult {
  const viewportBottom = viewportTop + viewportHeight;
  const spaceAbove = Math.max(0, triggerTop - viewportTop - gap - viewportPadding);
  const spaceBelow = Math.max(0, viewportBottom - triggerBottom - gap - viewportPadding);
  const placement =
    menuHeight <= spaceBelow || (menuHeight > spaceAbove && spaceBelow >= spaceAbove)
      ? 'bottom'
      : 'top';

  return {
    placement,
    availableHeight: placement === 'bottom' ? spaceBelow : spaceAbove,
  };
}

export function getNextMenuItemIndex<T extends DropdownMenuItemState>(
  items: readonly T[],
  currentIndex: number,
  direction: 1 | -1,
): number {
  if (items.length === 0) return -1;

  const index =
    currentIndex >= 0 && currentIndex < items.length
      ? currentIndex
      : direction === 1
        ? -1
        : 0;

  // APG menu items remain keyboard-focusable when aria-disabled. Activation
  // is guarded by DropdownMenu, but navigation still visits the item.
  return (index + direction + items.length) % items.length;
}
