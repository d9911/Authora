// Денис: файл создан или изменён по запросу пользователя.

'use client';

import {
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ForwardedRef,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type RefCallback,
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  getNextMenuItemIndex,
  resolveDropdownPlacement,
  type DropdownPlacement,
} from './dropdownMenuModel';
import styles from './DropdownMenu.module.scss';

export type DropdownMenuAlign = 'start' | 'end';

export interface DropdownMenuTriggerProps
  extends Pick<
    ButtonHTMLAttributes<HTMLButtonElement>,
    | 'id'
    | 'type'
    | 'aria-haspopup'
    | 'aria-expanded'
    | 'aria-controls'
    | 'onClick'
    | 'onKeyDown'
  > {
  ref: RefCallback<HTMLButtonElement>;
}

export interface DropdownMenuProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  renderTrigger: (props: DropdownMenuTriggerProps) => ReactNode;
  children: ReactNode;
  align?: DropdownMenuAlign;
  menuClassName?: string;
}

type PendingFocus = 'first' | 'last' | null;
type DropdownMenuStyle = CSSProperties & {
  '--dropdown-menu-max-height'?: string;
  '--dropdown-menu-trigger-width'?: string;
  '--dropdown-menu-viewport-width'?: string;
};

interface DropdownMenuPosition {
  top: number;
  left: number;
  maxHeight: number;
  triggerWidth: number;
  viewportWidth: number;
  placement: DropdownPlacement;
}

const MENU_ITEM_SELECTOR = '[role="menuitem"]';
const FOCUSABLE_SELECTOR = [
  'a[href]:not([tabindex="-1"])',
  'button:not([disabled]):not([tabindex="-1"])',
  'input:not([disabled]):not([tabindex="-1"])',
  'select:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');
const MAX_MENU_HEIGHT = 320;
const MENU_GAP = 8;
const VIEWPORT_PADDING = 8;
const HORIZONTAL_VIEWPORT_PADDING = 12;

function assignRef<T>(ref: ForwardedRef<T>, value: T | null) {
  if (typeof ref === 'function') {
    ref(value);
    return;
  }
  if (ref) ref.current = value;
}

function isDisabledMenuItem(item: HTMLElement) {
  return (
    item.getAttribute('aria-disabled') === 'true' ||
    (item instanceof HTMLButtonElement && item.disabled)
  );
}

/**
 * Controlled APG menu button. The render-trigger contract applies
 * aria-haspopup="menu", aria-expanded and aria-controls to the consumer button.
 */
export const DropdownMenu = forwardRef<HTMLButtonElement, DropdownMenuProps>(
  function DropdownMenu(
    {
      open,
      onOpenChange,
      renderTrigger,
      children,
      align = 'start',
      menuClassName,
      className,
      style,
      ...rest
    },
    forwardedRef,
  ) {
    const generatedId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
    const triggerId = `dropdown-trigger-${generatedId}`;
    const menuId = `dropdown-menu-${generatedId}`;
    const rootRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const pendingFocusRef = useRef<PendingFocus>(null);
    const [position, setPosition] = useState<DropdownMenuPosition | null>(null);

    const setTriggerRef = useCallback(
      (node: HTMLButtonElement | null) => {
        triggerRef.current = node;
        assignRef(forwardedRef, node);
      },
      [forwardedRef],
    );

    const getMenuItems = useCallback(() => {
      const menu = menuRef.current;
      if (!menu) return [];

      return Array.from(menu.querySelectorAll<HTMLElement>(MENU_ITEM_SELECTOR)).filter(
        (item) => !item.hidden && item.getClientRects().length > 0,
      );
    }, []);

    const focusBoundaryItem = useCallback(
      (boundary: Exclude<PendingFocus, null>) => {
        const items = getMenuItems();
        const states = items.map((item) => ({ disabled: isDisabledMenuItem(item) }));
        const index = getNextMenuItemIndex(states, -1, boundary === 'first' ? 1 : -1);

        for (const item of items) item.tabIndex = -1;
        if (index >= 0) items[index]?.focus({ preventScroll: true });
      },
      [getMenuItems],
    );

    const requestOpen = useCallback(
      (focus: Exclude<PendingFocus, null>) => {
        pendingFocusRef.current = focus;
        if (open) focusBoundaryItem(focus);
        else onOpenChange(true);
      },
      [focusBoundaryItem, onOpenChange, open],
    );

    const closeAndFocusTrigger = useCallback(() => {
      pendingFocusRef.current = null;
      onOpenChange(false);
      window.requestAnimationFrame(() => triggerRef.current?.focus({ preventScroll: true }));
    }, [onOpenChange]);

    const closeAndMoveFocus = useCallback(
      (backward: boolean) => {
        const trigger = triggerRef.current;
        const menu = menuRef.current;
        if (!trigger) {
          onOpenChange(false);
          return;
        }

        const focusable = Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
          .filter(
            (element) =>
              element.getClientRects().length > 0 &&
              !menu?.contains(element) &&
              !element.closest('[inert]') &&
              !element.closest('[aria-hidden="true"]'),
          );
        const triggerIndex = focusable.indexOf(trigger);
        const candidateIndex = triggerIndex + (backward ? -1 : 1);
        const targetIndex =
          triggerIndex < 0 || candidateIndex < 0 || candidateIndex >= focusable.length
            ? -1
            : candidateIndex;
        const target = targetIndex >= 0 ? focusable[targetIndex] : null;

        pendingFocusRef.current = null;
        onOpenChange(false);
        window.requestAnimationFrame(() => target?.focus({ preventScroll: true }));
      },
      [onOpenChange],
    );

    const updatePlacement = useCallback(() => {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger || !menu) return;

      const triggerRect = trigger.getBoundingClientRect();
      const visualViewport = window.visualViewport;
      const viewportTop = visualViewport?.offsetTop ?? 0;
      const viewportLeft = visualViewport?.offsetLeft ?? 0;
      const viewportHeight = visualViewport?.height ?? window.innerHeight;
      const viewportWidth = visualViewport?.width ?? window.innerWidth;
      const availableViewportWidth = Math.max(
        0,
        viewportWidth - HORIZONTAL_VIEWPORT_PADDING * 2,
      );

      // The menu is portalled, so its width can no longer inherit from the
      // trigger wrapper. Apply the trigger and viewport constraints before
      // measuring the final menu box.
      menu.style.setProperty('--dropdown-menu-trigger-width', `${triggerRect.width}px`);
      menu.style.setProperty(
        '--dropdown-menu-viewport-width',
        `${availableViewportWidth}px`,
      );

      const next = resolveDropdownPlacement({
        triggerTop: triggerRect.top,
        triggerBottom: triggerRect.bottom,
        menuHeight: menu.scrollHeight,
        viewportHeight,
        viewportTop,
        gap: MENU_GAP,
        viewportPadding: VIEWPORT_PADDING,
      });
      const maxHeight = Math.max(
        0,
        Math.min(MAX_MENU_HEIGHT, next.availableHeight),
      );
      menu.style.setProperty('--dropdown-menu-max-height', `${maxHeight}px`);

      const menuWidth = menu.offsetWidth;
      const menuHeight = menu.offsetHeight;
      const isRtl = window.getComputedStyle(trigger).direction === 'rtl';
      const anchorLeft = isRtl ? align === 'end' : align === 'start';
      const alignedLeft = anchorLeft
        ? triggerRect.left
        : triggerRect.right - menuWidth;
      const minLeft = viewportLeft + HORIZONTAL_VIEWPORT_PADDING;
      const maxLeft = Math.max(
        minLeft,
        viewportLeft + viewportWidth - HORIZONTAL_VIEWPORT_PADDING - menuWidth,
      );
      const left = Math.min(Math.max(alignedLeft, minLeft), maxLeft);
      const alignedTop =
        next.placement === 'bottom'
          ? triggerRect.bottom + MENU_GAP
          : triggerRect.top - MENU_GAP - menuHeight;
      const minTop = viewportTop + VIEWPORT_PADDING;
      const maxTop = Math.max(
        minTop,
        viewportTop + viewportHeight - VIEWPORT_PADDING - menuHeight,
      );
      const top = Math.min(Math.max(alignedTop, minTop), maxTop);

      setPosition({
        top,
        left,
        maxHeight,
        triggerWidth: triggerRect.width,
        viewportWidth: availableViewportWidth,
        placement: next.placement,
      });
    }, [align]);

    useLayoutEffect(() => {
      if (!open) return;

      updatePlacement();
      for (const item of getMenuItems()) item.tabIndex = -1;
      const frameId = window.requestAnimationFrame(() => {
        const pendingFocus = pendingFocusRef.current;
        pendingFocusRef.current = null;
        if (pendingFocus) focusBoundaryItem(pendingFocus);
      });

      const observer =
        typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updatePlacement);
      if (triggerRef.current) observer?.observe(triggerRef.current);
      if (menuRef.current) observer?.observe(menuRef.current);

      window.addEventListener('resize', updatePlacement);
      window.addEventListener('scroll', updatePlacement, true);
      window.visualViewport?.addEventListener('resize', updatePlacement);
      window.visualViewport?.addEventListener('scroll', updatePlacement);

      return () => {
        window.cancelAnimationFrame(frameId);
        observer?.disconnect();
        window.removeEventListener('resize', updatePlacement);
        window.removeEventListener('scroll', updatePlacement, true);
        window.visualViewport?.removeEventListener('resize', updatePlacement);
        window.visualViewport?.removeEventListener('scroll', updatePlacement);
      };
    }, [children, focusBoundaryItem, getMenuItems, open, updatePlacement]);

    useEffect(() => {
      if (!open) return;

      const closeOnOutsidePointer = (event: PointerEvent) => {
        const target = event.target;
        if (!(target instanceof Node)) return;
        if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
        onOpenChange(false);
      };

      document.addEventListener('pointerdown', closeOnOutsidePointer);
      return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
    }, [onOpenChange, open]);

    useEffect(() => {
      if (!open) {
        pendingFocusRef.current = null;
        setPosition(null);
      }
    }, [open]);

    const onTriggerClick = () => {
      if (open) {
        pendingFocusRef.current = null;
        onOpenChange(false);
        return;
      }
      requestOpen('first');
    };

    const onTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        requestOpen('first');
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        requestOpen('last');
        return;
      }

      if (event.key === 'Escape' && open) {
        event.preventDefault();
        closeAndFocusTrigger();
      }
    };

    const onMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeAndFocusTrigger();
        return;
      }

      if (event.key === 'Tab') {
        event.preventDefault();
        closeAndMoveFocus(event.shiftKey);
        return;
      }

      const items = getMenuItems();
      const states = items.map((item) => ({ disabled: isDisabledMenuItem(item) }));
      const currentIndex = items.indexOf(document.activeElement as HTMLElement);
      let nextIndex = -1;

      if (event.key === 'ArrowDown') {
        nextIndex = getNextMenuItemIndex(states, currentIndex, 1);
      } else if (event.key === 'ArrowUp') {
        nextIndex = getNextMenuItemIndex(states, currentIndex, -1);
      } else if (event.key === 'Home') {
        nextIndex = getNextMenuItemIndex(states, -1, 1);
      } else if (event.key === 'End') {
        nextIndex = getNextMenuItemIndex(states, -1, -1);
      } else {
        return;
      }

      event.preventDefault();
      for (const item of items) item.tabIndex = -1;
      if (nextIndex >= 0) items[nextIndex]?.focus({ preventScroll: true });
    };

    const onMenuClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
      const item = (event.target as HTMLElement).closest<HTMLElement>(MENU_ITEM_SELECTOR);
      if (!item || !menuRef.current?.contains(item)) return;
      if (isDisabledMenuItem(item)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const onMenuClick = (event: ReactMouseEvent<HTMLDivElement>) => {
      const item = (event.target as HTMLElement).closest<HTMLElement>(MENU_ITEM_SELECTOR);
      if (!item || !menuRef.current?.contains(item) || isDisabledMenuItem(item)) return;

      pendingFocusRef.current = null;
      onOpenChange(false);
    };

    const menuStyle: DropdownMenuStyle = {
      '--dropdown-menu-max-height': `${position?.maxHeight ?? MAX_MENU_HEIGHT}px`,
      '--dropdown-menu-trigger-width': `${position?.triggerWidth ?? 0}px`,
      '--dropdown-menu-viewport-width': `${position?.viewportWidth ?? 0}px`,
      top: position?.top,
      left: position?.left,
    };
    const rootClasses = [styles.root, className].filter(Boolean).join(' ');
    const menuClasses = [styles.menu, menuClassName].filter(Boolean).join(' ');
    const menu =
      open && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              className={menuClasses}
              role="menu"
              aria-labelledby={triggerId}
              aria-orientation="vertical"
              data-align={align}
              data-placement={position?.placement ?? 'bottom'}
              data-positioned={position !== null}
              style={menuStyle}
              onClickCapture={onMenuClickCapture}
              onClick={onMenuClick}
              onKeyDown={onMenuKeyDown}
            >
              {children}
            </div>,
            document.body,
          )
        : null;

    return (
      <div ref={rootRef} className={rootClasses} style={style} {...rest}>
        {renderTrigger({
          ref: setTriggerRef,
          id: triggerId,
          type: 'button',
          'aria-haspopup': 'menu',
          'aria-expanded': open,
          'aria-controls': menuId,
          onClick: onTriggerClick,
          onKeyDown: onTriggerKeyDown,
        })}
        {menu}
      </div>
    );
  },
);
