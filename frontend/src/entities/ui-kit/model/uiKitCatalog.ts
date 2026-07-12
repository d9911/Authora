// Денис: файл создан или изменён по запросу пользователя.

export type UiKitCategory =
  | 'all'
  | 'surfaces'
  | 'actions'
  | 'forms'
  | 'navigation'
  | 'feedback';

export type UiKitCatalogStatus = 'ready' | 'extended' | 'new';
export type UiKitA11yKind =
  | 'native'
  | 'action'
  | 'form'
  | 'composite'
  | 'feedback'
  | 'decorative'
  | 'surface'
  | 'theme';

export interface UiKitCatalogItem {
  id:
    | 'auraSigil'
    | 'avatar'
    | 'badge'
    | 'buttonMain'
    | 'card'
    | 'feedbackText'
    | 'iconButton'
    | 'inputMain'
    | 'loaderMain'
    | 'modalMain'
    | 'alertDialog'
    | 'dropdownMenu'
    | 'otpCodeInput'
    | 'passwordInput'
    | 'progressBar'
    | 'rangeControl'
    | 'sectionHeader'
    | 'selectMain'
    | 'spatialPreview'
    | 'tabs'
    | 'themeToggle'
    | 'toast'
    | 'toggleSwitch';
  name: string;
  category: Exclude<UiKitCategory, 'all'>;
  status: UiKitCatalogStatus;
  api: string;
  a11y: UiKitA11yKind;
}

export const uiKitCatalog: readonly UiKitCatalogItem[] = [
  { id: 'auraSigil', name: 'AuraSigil', category: 'surfaces', status: 'ready', api: 'size', a11y: 'decorative' },
  { id: 'avatar', name: 'Avatar', category: 'surfaces', status: 'new', api: 'src · alt · fallback · size · decorative', a11y: 'native' },
  { id: 'badge', name: 'Badge', category: 'surfaces', status: 'ready', api: 'tone · variant', a11y: 'surface' },
  { id: 'buttonMain', name: 'ButtonMain', category: 'actions', status: 'extended', api: 'variant · size · loading · href', a11y: 'action' },
  { id: 'card', name: 'Card', category: 'surfaces', status: 'ready', api: 'tone · title · description · footer', a11y: 'surface' },
  { id: 'feedbackText', name: 'FeedbackText', category: 'feedback', status: 'extended', api: 'tone · role · aria-live', a11y: 'feedback' },
  { id: 'iconButton', name: 'IconButton', category: 'actions', status: 'ready', api: 'icon · label · variant · size', a11y: 'action' },
  { id: 'inputMain', name: 'InputMain', category: 'forms', status: 'extended', api: 'label · hint · error · mono · native input props', a11y: 'form' },
  { id: 'loaderMain', name: 'LoaderMain', category: 'feedback', status: 'ready', api: 'label · fullscreen', a11y: 'feedback' },
  { id: 'modalMain', name: 'ModalMain', category: 'feedback', status: 'extended', api: 'open · title · closeLabel · onClose · initialFocusRef', a11y: 'composite' },
  { id: 'alertDialog', name: 'AlertDialog', category: 'feedback', status: 'new', api: 'open · title · description · confirmLabel · cancelLabel · busy', a11y: 'composite' },
  { id: 'dropdownMenu', name: 'DropdownMenu', category: 'navigation', status: 'new', api: 'open · onOpenChange · renderTrigger · align', a11y: 'composite' },
  { id: 'otpCodeInput', name: 'OtpCodeInput', category: 'forms', status: 'ready', api: 'value · length · onValueChange · onComplete', a11y: 'form' },
  { id: 'passwordInput', name: 'PasswordInput', category: 'forms', status: 'extended', api: 'label · error · showAriaLabel · hideAriaLabel', a11y: 'form' },
  { id: 'progressBar', name: 'ProgressBar', category: 'feedback', status: 'ready', api: 'value · max · label · showValue', a11y: 'feedback' },
  { id: 'rangeControl', name: 'RangeControl', category: 'forms', status: 'ready', api: 'label · value · min · max · suffix', a11y: 'form' },
  { id: 'sectionHeader', name: 'SectionHeader', category: 'surfaces', status: 'ready', api: 'eyebrow · title · description · actions', a11y: 'surface' },
  { id: 'selectMain', name: 'SelectMain', category: 'forms', status: 'ready', api: 'single/multiple · options · value · clearable · placement', a11y: 'composite' },
  { id: 'spatialPreview', name: 'SpatialPreview', category: 'surfaces', status: 'ready', api: 'active · density', a11y: 'decorative' },
  { id: 'tabs', name: 'Tabs', category: 'navigation', status: 'extended', api: 'options · value · onChange · idPrefix', a11y: 'composite' },
  { id: 'themeToggle', name: 'ThemeToggle', category: 'navigation', status: 'ready', api: 'theme · label · native button props', a11y: 'theme' },
  { id: 'toast', name: 'Toast', category: 'feedback', status: 'extended', api: 'open · tone · title · description · onClose', a11y: 'feedback' },
  { id: 'toggleSwitch', name: 'ToggleSwitch', category: 'forms', status: 'ready', api: 'label · hint · native checkbox props', a11y: 'form' },
] as const;
