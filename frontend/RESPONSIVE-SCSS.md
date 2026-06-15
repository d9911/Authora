# Responsive SCSS Modules

Модульная система стилей для адаптивного дизайна < 1200px.

## 📁 Структура

```
frontend/src/shared/styles/
├── breakpoints.scss          # Миксины для медиа-запросов
├── responsive.scss           # Глобальные responsive стили
└── globals.scss              # Импортирует responsive.scss

frontend/src/shared/ui/
├── InputMain/
│   └── InputMain.module.scss
├── ButtonMain/
│   └── ButtonMain.module.scss
└── ModalMain/
    └── ModalMain.module.scss

frontend/src/widgets/
├── HeaderMain/
│   └── HeaderMain.module.scss
├── FooterMain/
│   └── FooterMain.module.scss
├── ProfileCard/
│   └── ProfileCard.module.scss
└── LocationLists/
    └── LocationLists.module.scss

frontend/src/features/
└── SignInForm/
    └── SignInForm.module.scss
```

## 🎯 Breakpoints

```scss
$breakpoints: (
  xs: 480px,   // Очень маленькие телефоны
  sm: 640px,   // Телефоны
  md: 768px,   // Планшеты
  lg: 1024px,  // Маленькие ноутбуки
  xl: 1200px,  // Десктопы
  xxl: 1440px  // Большие экраны
);
```

## 📱 Использование

### В компонентах

```scss
@import '../../shared/styles/breakpoints.scss';

.my-component {
  padding: 20px;

  @include media(lg) {
    padding: 16px; // < 1024px
  }

  @include media(md) {
    padding: 12px; // < 768px
  }
}
```

### Глобальные стили

`responsive.scss` автоматически подключен в `globals.scss` и применяется ко всем базовым классам:
- `.container` — адаптивные отступы
- `.page` — адаптивная высота и padding
- `.grid-3` — адаптивные колонки
- `.card`, `.auth-card` — адаптивные размеры
- Типографика (h1-h4) — адаптивные размеры шрифтов

## 🎨 Что покрыто

### UI компоненты
- ✅ **InputMain** — адаптивные input поля
- ✅ **ButtonMain** — кнопки с responsive размерами + `.button-group` для вертикального стека на mobile
- ✅ **ModalMain** — модалки с bottom sheet на mobile

### Widgets
- ✅ **HeaderMain** — mobile menu toggle + collapsible nav
- ✅ **FooterMain** — адаптивная grid сетка
- ✅ **ProfileCard** — вертикальный layout на mobile
- ✅ **LocationLists** — адаптивные списки стран/городов/регионов

### Features
- ✅ **SignInForm** — адаптивные auth формы
- ✅ **SignUpForm** — использует те же стили из SignInForm.module.scss

## 🔧 Интеграция в компоненты

### Пример: InputMain

```tsx
import styles from './InputMain.module.scss';

export const InputMain = ({ label, ...props }) => (
  <label className={styles['input-wrapper']}>
    {label && <span className={styles['input-label']}>{label}</span>}
    <input className={styles['input-field']} {...props} />
  </label>
);
```

### Пример: ButtonMain

```tsx
import styles from './ButtonMain.module.scss';

export const ButtonMain = ({ variant = 'primary', full, children }) => (
  <button 
    className={`
      ${styles.button} 
      ${styles[`button-${variant}`]}
      ${full ? styles['button-full'] : ''}
    `}
  >
    {children}
  </button>
);
```

## 📊 Адаптивная логика

### < 1200px (xl)
- Container: 960px max-width
- Grid: minmax(220px, 1fr)
- Auth card: 360px

### < 1024px (lg)
- Container: 100% width
- Grid: minmax(280px, 1fr)
- Card padding: 20px

### < 768px (md)
- Font-size: 15px base
- Grid: 1 колонка
- Header: mobile menu
- Auth card: full width

### < 640px (sm)
- Компактные отступы
- Buttons: full width в группах
- Modal: bottom sheet
- Footer: вертикальный layout

### < 480px (xs)
- Минимальные отступы
- Auth card: full viewport

## 🚀 Следующие шаги

1. Применить классы к существующим компонентам
2. Заменить inline styles на CSS modules
3. Протестировать на реальных устройствах
4. Добавить CSS modules в компоненты которые используют только inline styles

## 💡 Best Practices

- Используй `@include media(breakpoint)` для max-width
- Используй `@include media-min(breakpoint)` для min-width
- Пиши mobile-first или desktop-first последовательно
- Избегай магических чисел — используй CSS переменные
- Тестируй на реальных устройствах, не только в DevTools
