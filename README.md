# 🚗 CHANGAN-GUI — NTIVI STUDIO: Car Portal

> Современный веб-портал для автомобильных магнитол **Changan / Qiyuan**  
> Одностраничное приложение (SPA), оптимизированное для встроенных автомобильных браузеров.

![NTIVI STUDIO](https://img.shields.io/badge/NTIVI%20STUDIO-Car%20Portal-FF6B00?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMkwyIDdsaW8gNSAxMCA1IDEwLTV6TTIgMTdsMTAgNSAxMC01TTIgMTJsMTAgNSAxMC01IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PC9zdmc+)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

---

## ✨ Описание

**CHANGAN-GUI** — это веб-приложение, разработанное специально для **встроенных автомобильных браузеров** магнитол Changan / Qiyuan (и аналогичных Android-головных устройств с заблокированной установкой APK).

Вместо установки отдельных приложений — один портал с удобным доступом ко всему необходимому прямо из браузера магнитолы.

---

## 🎯 Возможности

### 🗺 Навигация
| Сервис | Описание |
|--------|----------|
| Яндекс.Карты | Пробки в реальном времени, маршруты, голосовой ввод |
| Google Maps | Спутниковые карты, онлайн-маршруты |
| 2ГИС | Справочник организаций, работает офлайн |

### 🎬 Развлечения и Соцсети
- **YouTube** — полная веб-версия
- **Instagram** — Reels, Stories, лента
- **Telegram Web** — мессенджер, каналы, боты
- **TikTok** — короткие видео
- **ВКонтакте** — соцсеть, VK Музыка
- **Яндекс Музыка** — плейлисты и подкасты
- **Spotify** — международная музыка

### 📻 Онлайн-Радио
- Record, Europa Plus, Русское Радио, Energy FM, Авторадио

### ⚡ Виджеты и утилиты
- **Часы/Дата** — крупные цифры на русском языке
- **GPS-геолокация** — определение положения через `navigator.geolocation`
- **Поиск** — Яндекс / Google прямо с главной страницы
- **Быстрые теги** — Погода, Пробки, АЗС, Парковка, Курс валют
- **Перезагрузка** — сброс зависшего браузера магнитолы
- **Полноэкранный режим**

---

## 🖥 Технологии

| Технология | Назначение |
|------------|------------|
| **HTML5** | Единый файл, без сборщика |
| **Tailwind CSS** (CDN) | Адаптивная стилизация |
| **Lucide Icons** (CDN) | Векторные иконки |
| **Vanilla JS** | Вся логика без фреймворков |
| **Google Fonts / Inter** | Читаемый шрифт для авто-экранов |

---

## 🚀 Быстрый старт

### Вариант 1 — Открыть напрямую
Просто скачайте [`index.html`](./index.html) и откройте в любом браузере — ничего устанавливать не нужно.

### Вариант 2 — Скопировать на магнитолу
1. Скачайте `index.html`
2. Скопируйте на USB-флешку
3. Откройте через файловый менеджер магнитолы в браузере
4. Или используйте встроенную адресную строку браузера

### Вариант 3 — Хостинг через GitHub Pages
```bash
git clone https://github.com/NTIVI/CHANGAN-GUI.git
# Включите GitHub Pages в Settings → Pages → Branch: main
```
После этого портал будет доступен по адресу:  
**`https://ntivi.github.io/CHANGAN-GUI/`**

---

## 🎨 Дизайн-система

| Элемент | Значение |
|---------|----------|
| Фон | `#0a0a0a` (глубокий чёрный) |
| Карточки | `#111111` |
| Акцент | `#FF6B00` (фирменный оранжевый NTIVI) |
| Текст | `#e8e8e8` |
| Мутный текст | `#888888` |
| Шрифт | Inter (400/500/600/700/800/900) |

### Принципы UI
- ✅ Крупные плитки — попасть пальцем без отвлечения от дороги
- ✅ `user-select: none` — нет случайного выделения текста
- ✅ `maximum-scale=1, user-scalable=no` — отключён зум жестами
- ✅ Ripple-эффект при нажатии
- ✅ Анимация `scale(0.95)` при активном состоянии
- ✅ Альбомная ориентация (landscape) как основная

---

## 📁 Структура проекта

```
CHANGAN-GUI/
├── index.html      # Единый файл приложения (HTML + CSS + JS)
├── README.md       # Документация
├── LICENSE         # MIT License
└── .gitignore      # Исключения git
```

---

## ⚠️ Ограничения и совместимость

| Браузер | Статус |
|---------|--------|
| Changan / Qiyuan встроенный браузер | ✅ Полная поддержка |
| Chrome / Chromium | ✅ Полная поддержка |
| Safari / WebKit | ✅ Поддержка |
| Firefox | ✅ Поддержка |

> **Примечание:** Некоторые сервисы (Instagram, Telegram) блокируют отображение во встроенном iframe.  
> В таких случаях приложение автоматически открывает их в новой вкладке браузера.

---

## 📄 Лицензия

Распространяется под лицензией **MIT**. Подробности в файле [LICENSE](./LICENSE).

---

## 👨‍💻 Автор

**NTIVI STUDIO**  
🔗 GitHub: [@NTIVI](https://github.com/NTIVI)

---

<div align="center">
  <strong>NTIVI STUDIO Car Portal</strong> — Сделано с ❤️ для водителей Changan / Qiyuan
</div>
