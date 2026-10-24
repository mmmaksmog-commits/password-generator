// Генератор паролей. Случайность — только crypto.getRandomValues, без Math.random.
const $ = (s) => document.querySelector(s);

const SETS = {
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower: 'abcdefghijklmnopqrstuvwxyz',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.?/~',
};
const AMBIGUOUS = /[Il1O0o]/g;

// Короткие английские слова — их легко запомнить и ввести на любой клавиатуре
const WORDS = `able acid aged also area army atom aunt away baby back bake ball band bank barn base bath bead beam bean bear beef bell belt bend bike bird bite blue boat body bold bone book boot bowl brave bread brick bride brush cake calm camp cane card care cart cash cave chef chip city clay cliff clock cloud coal coat code coin cold comb cook cool corn crab crow cube cute dark dawn deer desk dice dish dock door dove dream drum duck dune dust eagle earth east echo edge eggs envy fair fall farm fern film fire fish flag flute foam fog folk fork fox frog fuel game gate gift glow goat gold golf grape grass gulf hair hand harp hawk heat hero hill honey hook horn horse iron isle jade jazz jelly jump kite knee lake lamp lava leaf lemon lily lime lion loaf lucky lunar mango maple mars mask meal milk mint moon moss moth mule nest night noon north oak ocean olive opal orbit owl palm panda paper peach pearl pilot pine pixel plum polar pony quiet rain raven reef rice river robin rock rose ruby sage sail salt sand scarf seal seed shell ship silk snow solar soup spark star stone storm sugar swan tiger toast tulip twig vivid wave whale wind wolf yarn zebra zest`.split(' ');

function randomInt(max) {
  // Отбраковка, чтобы не было смещения при остатке от деления
  const limit = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  do crypto.getRandomValues(buf); while (buf[0] >= limit);
  return buf[0] % max;
}
const pick = (str) => str[randomInt(str.length)];

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ---------- Генерация ----------
function genChars(o) {
  let sets = Object.keys(SETS).filter((k) => o[k]).map((k) => (o.noAmbig ? SETS[k].replace(AMBIGUOUS, '') : SETS[k]));
  if (!sets.length) sets = [SETS.lower];
  const all = sets.join('');
  // Гарантируем хотя бы по одному символу из каждого выбранного набора
  const chars = sets.map(pick);
  while (chars.length < o.len) chars.push(pick(all));
  return { value: shuffle(chars).slice(0, o.len).join(''), entropy: o.len * Math.log2(all.length) };
}

function genPhrase(o) {
  const words = Array.from({ length: o.words }, () => {
    const w = WORDS[randomInt(WORDS.length)];
    return o.caps ? w[0].toUpperCase() + w.slice(1) : w;
  });
  let entropy = o.words * Math.log2(WORDS.length);
  if (o.addNum) { words.splice(randomInt(words.length + 1), 0, String(randomInt(100))); entropy += Math.log2(100) + Math.log2(o.words + 1); }
  return { value: words.join(o.sep), entropy };
}

// ---------- Оценка ----------
const GUESSES_PER_SEC = 1e10; // мощный перебор на видеокартах

function crackTime(bits) {
  const sec = 2 ** bits / GUESSES_PER_SEC / 2;
  if (sec < 1) return 'мгновенно';
  const units = [[31557600 * 1e9, ['млрд лет']], [31557600 * 1e6, ['млн лет']], [31557600 * 1000, ['тыс. лет']], [31557600, ['год', 'года', 'лет']], [86400, ['день', 'дня', 'дней']], [3600, ['час', 'часа', 'часов']], [60, ['минута', 'минуты', 'минут']], [1, ['секунда', 'секунды', 'секунд']]];
  if (sec > 31557600 * 1.4e10) return 'дольше, чем существует Вселенная';
  for (const [u, forms] of units) {
    if (sec < u) continue;
    const n = Math.round(sec / u);
    return `≈ ${n.toLocaleString('ru-RU')} ${forms.length === 1 ? forms[0] : plural(n, ...forms)}`;
  }
  return 'мгновенно';
}

function plural(n, one, few, many) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

function level(bits) {
  if (bits < 36) return { k: 0.15, name: 'Очень слабый', color: '#ef4444' };
  if (bits < 50) return { k: 0.35, name: 'Слабый', color: '#f97316' };
  if (bits < 64) return { k: 0.55, name: 'Средний', color: '#eab308' };
  if (bits < 80) return { k: 0.78, name: 'Надёжный', color: '#22c55e' };
  return { k: 1, name: 'Очень надёжный', color: '#10b981' };
}

/** Грубая оценка чужого пароля: размер алфавита × длина, со штрафами за шаблоны. */
function estimate(pw) {
  if (!pw) return 0;
  let pool = 0;
  if (/[a-z]/.test(pw)) pool += 26;
  if (/[A-Z]/.test(pw)) pool += 26;
  if (/\d/.test(pw)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(pw)) pool += 33;
  if (/[а-яё]/i.test(pw)) pool += 33;
  let bits = pw.length * Math.log2(pool || 1);
  if (/^(.)\1+$/.test(pw)) bits = Math.log2(pool) + 2;
  if (/(012|123|234|345|456|567|678|789|abc|qwe|asd|zxc|йцу|фыв)/i.test(pw)) bits *= 0.7;
  if (/(password|qwerty|admin|login|1234|пароль|iloveyou)/i.test(pw)) bits *= 0.4;
  if (/^[a-zа-я]+\d{1,4}$/i.test(pw)) bits *= 0.75;
  return bits;
}

// ---------- Интерфейс ----------
let mode = 'chars';
let current = '';

const opts = () => ({
  len: Number($('#len').value),
  upper: $('#upper').checked,
  lower: $('#lower').checked,
  digits: $('#digits').checked,
  symbols: $('#symbols').checked,
  noAmbig: $('#noAmbig').checked,
  words: Number($('#words').value),
  sep: $('#sep').value,
  caps: $('#caps').checked,
  addNum: $('#addNum').checked,
});

function colorize(s) {
  return [...s].map((c) => {
    const cls = /\d/.test(c) ? 'd' : /[a-zA-Z]/.test(c) ? '' : 's';
    const ch = c === ' ' ? '&nbsp;' : c.replace(/[&<>]/g, (x) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[x]));
    return cls ? `<span class="${cls}">${ch}</span>` : ch;
  }).join('');
}

function generate() {
  const o = opts();
  const { value, entropy } = mode === 'chars' ? genChars(o) : genPhrase(o);
  current = value;
  $('#pw').innerHTML = colorize(value);
  $('#pw').classList.remove('flash');
  void $('#pw').offsetWidth;
  $('#pw').classList.add('flash');
  const lv = level(entropy);
  $('#meterBar').style.width = `${lv.k * 100}%`;
  $('#meterBar').style.background = lv.color;
  $('#verdict').textContent = lv.name;
  $('#verdict').style.color = lv.color;
  $('#crack').textContent = `${Math.round(entropy)} бит · взлом: ${crackTime(entropy)}`;
  $('#lenLabel').textContent = o.len;
  $('#wordsLabel').textContent = o.words;
}

async function copy() {
  try {
    await navigator.clipboard.writeText(current);
  } catch {
    const ta = Object.assign(document.createElement('textarea'), { value: current });
    document.body.append(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  $('#copy').textContent = 'Скопировано ✓';
  $('#toast').hidden = false;
  setTimeout(() => { $('#copy').textContent = 'Копировать'; $('#toast').hidden = true; }, 1500);
}

document.querySelector('.tabs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-mode]');
  if (!b) return;
  mode = b.dataset.mode;
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('is-active', t === b));
  $('#charsOpts').hidden = mode !== 'chars';
  $('#phraseOpts').hidden = mode !== 'phrase';
  generate();
});
document.querySelectorAll('#charsOpts input, #phraseOpts input, #phraseOpts select').forEach((el) => el.addEventListener('input', () => {
  // Нельзя выключить все наборы символов
  if (['upper', 'lower', 'digits', 'symbols'].every((k) => !$(`#${k}`).checked)) el.checked = true;
  generate();
}));
$('#regen').addEventListener('click', generate);
$('#copy').addEventListener('click', copy);
$('#pw').addEventListener('click', copy);

$('#check').addEventListener('input', (e) => {
  const pw = e.target.value;
  const bits = estimate(pw);
  const lv = level(bits);
  $('#checkBar').style.width = pw ? `${lv.k * 100}%` : '0';
  $('#checkBar').style.background = lv.color;
  $('#checkResult').innerHTML = pw
    ? `<b style="color:${lv.color}">${lv.name}</b> · примерно ${Math.round(bits)} бит · взлом: ${crackTime(bits)}`
    : 'Пароль проверяется только на этом устройстве.';
});

generate();
