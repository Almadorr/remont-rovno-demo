(function () {
  var P = window.PRICES;
  var rub = function (n) { return Math.round(n).toLocaleString("ru-RU") + " ₽"; };
  var round = function (n) { return Math.round(n / 1000) * 1000; };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* Меню на телефоне */
  var burger = $(".burger");
  if (burger) burger.addEventListener("click", function () {
    var open = document.body.classList.toggle("menu-open");
    burger.setAttribute("aria-expanded", open);
  });

  /* «от … ₽/м²» и таблицы цен берутся из prices.js */
  $$("[data-from]").forEach(function (el) {
    el.textContent = P.types[el.dataset.from].perM2.toLocaleString("ru-RU");
  });
  $$("[data-prices]").forEach(function (tb) {
    tb.innerHTML = P.works[tb.dataset.prices].map(function (w) {
      var pr = typeof w.price === "number" ? "от " + rub(w.price) : w.price;
      return "<tr><td>" + w.name + "</td><td>" + w.unit + "</td><td>" + pr + "</td></tr>";
    }).join("");
  });

  /* Общий расчёт — им пользуются и калькулятор, и квиз */
  function estimate(o) {
    var t = P.types[o.type], k = P.housing[o.housing].k * (o.stateK || 1);
    var lines = [];
    var base = t.perM2 * o.area * k;
    lines.push([t.name + ", " + o.area + " м²", base]);
    var bath = t.bathroom * o.baths;
    lines.push(["Санузлы: " + o.baths, bath]);
    var opts = 0;
    P.options.forEach(function (op) {
      if (o.options.indexOf(op.id) < 0) return;
      var v = op.fixed || op.perM2 * o.area;
      opts += v; lines.push([op.name, v]);
    });
    var total = base + bath + opts;
    var days = Math.round(t.days.base + t.days.perM2 * o.area);
    return {
      total: round(total), min: round(total * (1 - P.spread)), max: round(total * (1 + P.spread)),
      days: days, daysMax: Math.round(days * 1.25), lines: lines
    };
  }

  /* Калькулятор */
  $$("[data-calc]").forEach(function (box, idx) {
    var preset = box.dataset.calc || "capital";
    var id = function (s) { return "c" + idx + s; };
    var typeHtml = Object.keys(P.types).map(function (k) {
      var t = P.types[k];
      return '<input type="radio" name="' + id("t") + '" id="' + id(k) + '" value="' + k + '"' + (k === preset ? " checked" : "") + '>' +
        '<label for="' + id(k) + '">' + t.short + "<small>от " + t.perM2.toLocaleString("ru-RU") + " ₽/м²</small></label>";
    }).join("");
    var houseHtml = Object.keys(P.housing).map(function (k, i) {
      return '<input type="radio" name="' + id("h") + '" id="' + id(k) + '" value="' + k + '"' + (i === 0 ? " checked" : "") + '>' +
        '<label for="' + id(k) + '">' + P.housing[k].name + "</label>";
    }).join("");
    var optHtml = P.options.map(function (op) {
      var pr = op.fixed ? rub(op.fixed) : op.perM2.toLocaleString("ru-RU") + " ₽/м²";
      return '<label class="chk"><input type="checkbox" value="' + op.id + '"><span>' + op.name + '<br><small class="muted">' + pr + "</small></span></label>";
    }).join("");

    box.innerHTML =
      '<div><span class="eyebrow">Калькулятор</span><h2>Сколько стоит ремонт вашей квартиры</h2>' +
      '<p class="muted">Выберите параметры — сумма пересчитается сразу. Точную смету составим после бесплатного замера.</p>' +
      '<div class="field"><span class="lbl">Вид ремонта</span><div class="seg" data-g="type">' + typeHtml + "</div></div>" +
      '<div class="field"><label for="' + id("a") + '">Площадь квартиры, м²</label><div class="area">' +
      '<input type="number" id="' + id("a") + '" min="10" max="300" value="54" inputmode="numeric">' +
      '<input type="range" min="10" max="200" value="54" aria-label="Площадь, ползунок"></div></div>' +
      '<div class="field"><span class="lbl">Тип жилья</span><div class="seg two" data-g="housing">' + houseHtml + "</div></div>" +
      '<div class="field"><span class="lbl">Санузлов</span><div class="seg two" data-g="baths">' +
      '<input type="radio" name="' + id("b") + '" id="' + id("b1") + '" value="1" checked><label for="' + id("b1") + '">Один</label>' +
      '<input type="radio" name="' + id("b") + '" id="' + id("b2") + '" value="2"><label for="' + id("b2") + '">Два</label></div></div>' +
      '<div class="field" style="margin:0"><span class="lbl">Дополнительно</span><div class="opts">' + optHtml + "</div></div></div>" +
      '<div class="result" aria-live="polite"><span class="muted">Примерная стоимость</span>' +
      '<div class="sum">—</div><div class="range"></div><dl></dl>' +
      '<button class="btn btn-accent" type="button">Отправить расчёт</button>' +
      '<p class="note">Расчёт ориентировочный и не является офертой. Цены за работы, без стоимости чистовых материалов.</p></div>';

    var num = $("input[type=number]", box), rng = $("input[type=range]", box);
    var state;
    function read() {
      var area = Math.max(10, Math.min(300, parseInt(num.value, 10) || 10));
      return {
        type: $('[data-g=type] input:checked', box).value,
        housing: $('[data-g=housing] input:checked', box).value,
        baths: +$('[data-g=baths] input:checked', box).value,
        area: area,
        options: $$(".opts input:checked", box).map(function (c) { return c.value; })
      };
    }
    function render() {
      state = read();
      var e = estimate(state);
      $(".sum", box).textContent = "≈ " + rub(e.total);
      $(".range", box).textContent = "от " + rub(e.min) + " до " + rub(e.max);
      $("dl", box).innerHTML = e.lines.map(function (l) {
        return "<div><dt>" + l[0] + "</dt><dd>" + rub(l[1]) + "</dd></div>";
      }).join("") + "<div><dt>Срок работ</dt><dd>" + e.days + "–" + e.daysMax + " дней</dd></div>";
      state.e = e;
    }
    num.addEventListener("input", function () { rng.value = num.value; render(); });
    num.addEventListener("blur", function () { num.value = read().area; rng.value = num.value; render(); });
    rng.addEventListener("input", function () { num.value = rng.value; render(); });
    box.addEventListener("change", render);
    $(".result .btn", box).addEventListener("click", function () {
      var s = state, t = P.types[s.type];
      var opts = P.options.filter(function (o) { return s.options.indexOf(o.id) >= 0; }).map(function (o) { return o.name; });
      openLead("Отправить расчёт",
        "Расчёт с сайта:\n" + t.name + ", " + s.area + " м², " + P.housing[s.housing].name.toLowerCase() +
        ", санузлов: " + s.baths + (opts.length ? "\nДополнительно: " + opts.join(", ") : "") +
        "\nИтого ≈ " + rub(s.e.total) + " (" + rub(s.e.min) + " – " + rub(s.e.max) + "), срок " + s.e.days + "–" + s.e.daysMax + " дней");
    });
    render();
  });

  /* Модальные окна */
  function openModal(m) { m.classList.add("open"); document.body.style.overflow = "hidden"; var f = $("button,input", m); if (f) f.focus(); }
  function closeModal(m) { m.classList.remove("open"); document.body.style.overflow = ""; }
  $$(".modal").forEach(function (m) {
    m.addEventListener("click", function (e) { if (e.target === m || e.target.closest(".modal-x")) closeModal(m); });
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") $$(".modal.open").forEach(closeModal); });

  /* Форма заявки */
  var lead = $("#lead");
  function formHtml(summary) {
    return '<form class="form" novalidate>' +
      (summary ? '<div class="calc-sum">' + summary + "</div>" : "") +
      '<input name="name" placeholder="Ваше имя" autocomplete="name" required>' +
      '<input name="phone" type="tel" placeholder="+7 (___) ___-__-__" autocomplete="tel" required>' +
      '<textarea name="msg" placeholder="Комментарий (необязательно)"></textarea>' +
      '<button class="btn btn-accent" type="submit">Отправить заявку</button>' +
      '<p class="agree">Нажимая кнопку, вы соглашаетесь на обработку персональных данных.</p></form>';
  }
  function bindForm(root) {
    var f = $("form", root);
    if (!f) return;
    var ph = $("[name=phone]", f);
    ph.addEventListener("input", function () {
      var d = ph.value.replace(/\D/g, "").replace(/^[78]/, "").slice(0, 10);
      var out = "+7";
      if (d.length) out += " (" + d.slice(0, 3);
      if (d.length >= 3) out += ") " + d.slice(3, 6);
      if (d.length >= 6) out += "-" + d.slice(6, 8);
      if (d.length >= 8) out += "-" + d.slice(8, 10);
      ph.value = out;
    });
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = $("[name=name]", f), digits = ph.value.replace(/\D/g, "");
      name.style.borderColor = name.value.trim() ? "" : "var(--accent)";
      ph.style.borderColor = digits.length === 11 ? "" : "var(--accent)";
      if (!name.value.trim() || digits.length !== 11) return;
      f.outerHTML = '<div class="ok-msg">Спасибо, ' + name.value.trim().replace(/</g, "") +
        "! Заявка принята — перезвоним в течение 15 минут в рабочее время.<br><small>Демо-версия: на настоящем сайте заявка сразу придёт вам в Телеграм и на почту.</small></div>";
    });
  }
  function openLead(title, summary) {
    $("h2", lead).textContent = title;
    $(".lead-body", lead).innerHTML = formHtml(summary);
    bindForm(lead);
    openModal(lead);
  }
  $$("[data-lead]").forEach(function (b) { b.addEventListener("click", function () { openLead(b.dataset.lead || "Вызвать замерщика"); }); });
  $$(".inline-form").forEach(function (box) { box.innerHTML = formHtml(); bindForm(box); });

  /* Квиз */
  var quiz = $("#quiz");
  var Q = [
    { q: "Какое у вас жильё?", k: "housing", a: [["Новостройка", "new"], ["Вторичка", "old"]] },
    { q: "В каком состоянии квартира сейчас?", k: "state", a: [["Без отделки / бетон", 1.05], ["White box (предчистовая)", 0.9], ["Старый ремонт, нужно освежить", 1.0], ["Старый ремонт, всё под снос", 1.15]] },
    { q: "Какая площадь квартиры?", k: "area", a: [["До 40 м²", 35], ["40–60 м²", 50], ["60–90 м²", 75], ["Больше 90 м²", 105]] },
    { q: "Какой ремонт планируете?", k: "type", a: [["Косметический — обновить отделку", "cosmetic"], ["Капитальный — с заменой коммуникаций", "capital"], ["Под ключ — с дизайном и материалами", "turnkey"], ["Пока не знаю, нужна консультация", "capital"]] },
    { q: "Нужен дизайн-проект?", k: "design", a: [["Да, нужен", true], ["Уже есть свой", false], ["Нет, сделаем по фото-примерам", false]] },
    { q: "Когда хотите начать ремонт?", k: "when", a: [["В ближайшие 2 недели", "сразу"], ["В течение месяца", "в течение месяца"], ["Через 1–3 месяца", "через 1–3 месяца"], ["Пока присматриваюсь", "присматривается"]] }
  ];
  var ans = {}, cur = 0;
  function qRender() {
    var body = $(".quiz-body", quiz), total = Q.length + 1;
    $(".q-progress i", quiz).style.width = Math.round((cur / Q.length) * 100) + "%";
    if (cur < Q.length) {
      var it = Q[cur];
      body.innerHTML = '<div class="q-step">Вопрос ' + (cur + 1) + " из " + Q.length + "</div><h3 style=\"font-size:22px;margin-top:8px\">" + it.q + "</h3>" +
        '<div class="q-opts">' + it.a.map(function (a, i) {
          return '<button type="button" data-i="' + i + '"' + (ans[it.k] && ans[it.k].i === i ? ' class="sel"' : "") + ">" + a[0] + "</button>";
        }).join("") + "</div>" +
        '<div class="q-nav">' + (cur ? '<button type="button" class="q-back">← Назад</button>' : "<span></span>") + "</div>";
      $$(".q-opts button", body).forEach(function (b) {
        b.addEventListener("click", function () {
          var a = it.a[+b.dataset.i];
          ans[it.k] = { i: +b.dataset.i, v: a[1], t: a[0] };
          cur++; qRender();
        });
      });
    } else {
      var e = estimate({
        type: ans.type.v, housing: ans.housing.v, stateK: ans.state.v, area: ans.area.v, baths: 1,
        options: ans.design.v ? ["design"] : []
      });
      var summary = "Ответы квиза:\n" + Q.map(function (it) { return "• " + it.q + " — " + ans[it.k].t; }).join("\n") +
        "\nПредварительно: " + rub(e.min) + " – " + rub(e.max);
      body.innerHTML = '<div class="q-step">Готово!</div><h3 style="font-size:22px;margin-top:8px">Ваш ремонт обойдётся примерно в</h3>' +
        '<div class="q-result"><b>' + rub(e.min) + " – " + rub(e.max) + '</b><span class="muted">срок ' + e.days + "–" + e.daysMax +
        " дней · " + P.types[ans.type.v].name.toLowerCase() + "</span></div>" +
        "<p>Оставьте телефон — пришлём подробную смету и зафиксируем скидку 5% на работы.</p>" + formHtml(summary) +
        '<div class="q-nav"><button type="button" class="q-back">← Назад</button></div>';
      bindForm(body);
    }
    var back = $(".q-back", body);
    if (back) back.addEventListener("click", function () { cur--; qRender(); });
  }
  $$("[data-quiz]").forEach(function (b) {
    b.addEventListener("click", function () { cur = 0; ans = {}; qRender(); openModal(quiz); });
  });

  /* До/после */
  $$(".ba input").forEach(function (r) {
    var set = function () { r.parentNode.style.setProperty("--p", r.value + "%"); };
    r.addEventListener("input", set); set();
  });

  /* Фильтр работ */
  var fb = $$(".filters button");
  fb.forEach(function (b) {
    b.addEventListener("click", function () {
      fb.forEach(function (x) { x.setAttribute("aria-pressed", x === b); });
      $$(".work[data-type]").forEach(function (w) {
        w.hidden = b.dataset.f !== "all" && w.dataset.type !== b.dataset.f;
      });
    });
  });
})();
