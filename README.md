# 🔐 Пароль

**Генератор надёжных паролей и фраз-паролей.**

### ▶️ [Открыть](https://mmmaksmog-commits.github.io/password-generator/)

Работает на телефоне и на ПК, без установки и регистрации.

## Возможности

- Криптостойкая случайность: crypto.getRandomValues с отбраковкой
- Длина 6–64, наборы символов, без похожих символов
- Фразы-пароли из запоминающихся слов
- Оценка энтропии и времени взлома
- Проверка своего пароля — только на устройстве

## Стек

JavaScript, Web Crypto API, Clipboard API. Без фреймворков и сборки.

## Запуск локально

```bash
git clone https://github.com/mmmaksmog-commits/password-generator.git
cd password-generator
python3 -m http.server 8000
```

Затем откройте http://localhost:8000.

---

Часть [портфолио](https://mmmaksmog-commits.github.io/).
