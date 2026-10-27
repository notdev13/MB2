// Site da MB2 · comportamento da página. Os dados vêm de dados/obras.json.
(function () {
  "use strict";
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const pendente = '<span class="pendente">a confirmar</span>';
  const semMovimento = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const computador = matchMedia("(min-width: 821px)");

  // Uma foto em dois tamanhos: o navegador escolhe pela largura da tela
  function foto(nome, alt, extra) {
    return `<img src="imagens/obras/${nome}-480.webp" srcset="imagens/obras/${nome}-480.webp 480w, imagens/obras/${nome}-1400.webp 1400w" sizes="${extra && extra.sizes ? extra.sizes : "(min-width: 821px) 33vw, 50vw"}" alt="${esc(alt)}" ${extra && extra.eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
  }

  // ---------- Menu ----------
  const topo = $(".topo"), menuBtn = $("#menu-btn"), menuMovel = $("#menu-movel");
  function abrirMenu(abre) {
    menuMovel.hidden = !abre;
    topo.classList.toggle("aberto", abre);
    menuBtn.setAttribute("aria-expanded", String(abre));
    menuBtn.setAttribute("aria-label", abre ? "Fechar menu" : "Abrir menu");
    document.body.style.overflow = abre ? "hidden" : "";
    topo.classList.toggle("no-topo", !abre && scrollY < 10);
  }
  menuBtn.addEventListener("click", () => abrirMenu(menuMovel.hidden));
  menuMovel.addEventListener("click", (e) => { if (e.target.closest("a")) abrirMenu(false); });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !menuMovel.hidden) abrirMenu(false); });

  // ---------- Tema claro / escuro ----------
  // Abre sempre claro; o botão liga o escuro só durante a visita
  const temaBtn = $("#tema-btn"), raiz = document.documentElement;
  temaBtn.addEventListener("click", () => {
    const escuro = raiz.getAttribute("data-theme") !== "dark";
    if (escuro) raiz.setAttribute("data-theme", "dark"); else raiz.removeAttribute("data-theme");
    temaBtn.setAttribute("aria-pressed", String(escuro));
    temaBtn.setAttribute("aria-label", escuro ? "Ativar tema claro" : "Ativar tema escuro");
  });

  // No alto da página o menu fica sem fundo; depois que passa do botão do topo, esmaece
  const ctaTopo = $("#hero-cta");
  let aguardando = false;
  function esmaecer() {
    aguardando = false;
    topo.classList.toggle("no-topo", scrollY < 10 && menuMovel.hidden);
    topo.classList.toggle("esmaecido", ctaTopo.getBoundingClientRect().bottom < topo.offsetHeight);
  }
  addEventListener("scroll", () => { if (!aguardando) { aguardando = true; requestAnimationFrame(esmaecer); } }, { passive: true });
  esmaecer();

  // ---------- Carrega os dados ----------
  fetch("dados/obras.json")
    .then((r) => r.json())
    .then(montar)
    .catch(() => {
      $("#grade").innerHTML = '<p class="aviso">Não consegui carregar a lista de obras. Recarregue a página.</p>';
    });

  function montar(dados) {
    const obras = dados.obras, empresa = dados.empresa;
    const d = obras.find((o) => o.id === dados.destaque) || obras[0];

    // ----- Topo: fotos que trocam (celular) ou vídeo (computador) -----
    const hero = $(".hero"), fotosWrap = $("#hero-fotos"), tracos = $("#hero-tracos"), legenda = $("#hero-legenda"), cartaoTitulo = $("#hero-cartao-titulo");
    fotosWrap.innerHTML = dados.topo.map((t, i) =>
      `<img class="hero-foto${i === 0 ? " ativa" : ""}" src="imagens/obras/${t.foto}-480.webp" srcset="imagens/obras/${t.foto}-480.webp 480w, imagens/obras/${t.foto}-1400.webp 1400w" sizes="100vw" alt="" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'}>`
    ).join("");
    const fotos = $$(".hero-foto", fotosWrap);
    let atual = 0, relogio;
    tracos.innerHTML = dados.topo.map((_, i) => `<button type="button" aria-label="Foto ${i + 1}"></button>`).join("");
    const botoesTraco = $$("button", tracos);
    botoesTraco.forEach((b, i) => (b.onclick = () => irPara(i, true)));
    function irPara(i, manual) {
      atual = (i + fotos.length) % fotos.length;
      fotos.forEach((f, j) => f.classList.toggle("ativa", j === atual));
      botoesTraco.forEach((b, j) => b.setAttribute("aria-current", String(j === atual)));
      legenda.textContent = dados.topo[atual].legenda;
      if (manual) reiniciar();
    }
    function reiniciar() {
      clearInterval(relogio);
      if (!semMovimento && !hero.classList.contains("com-video")) relogio = setInterval(() => irPara(atual + 1), 6000);
    }
    $("#hero-prev").onclick = () => irPara(atual - 1, true);
    $("#hero-next").onclick = () => irPara(atual + 1, true);
    irPara(0);
    reiniciar();

    // Arraste com o dedo troca a foto
    let x0 = null;
    hero.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    hero.addEventListener("touchend", (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) irPara(atual + (dx < 0 ? 1 : -1), true);
    }, { passive: true });

    // Vídeo só no computador; no celular ele nem é baixado
    const video = $("#hero-video"), pausa = $("#hero-pausa");
    function sincronizaPausa() {
      const parado = video.paused;
      pausa.setAttribute("aria-pressed", String(parado));
      pausa.setAttribute("aria-label", parado ? "Continuar vídeo" : "Pausar vídeo");
    }
    function decideVideo() {
      if (!computador.matches) {
        if (hero.classList.contains("com-video")) { video.pause(); hero.classList.remove("com-video"); cartaoTitulo.textContent = "Nossas casas"; irPara(0); reiniciar(); }
        return;
      }
      if (!video.src) { video.poster = "video/poster-1400.jpg"; video.src = "video/hero-mb2.mp4"; }
      hero.classList.add("com-video");
      clearInterval(relogio);
      cartaoTitulo.textContent = "Tour em vídeo";
      legenda.textContent = [d.nome, d.area_m2 && d.area_m2 + " m²"].filter(Boolean).join(" · ");
      if (!semMovimento) video.play().catch(() => {});
      sincronizaPausa();
    }
    video.addEventListener("play", sincronizaPausa);
    video.addEventListener("pause", sincronizaPausa);
    pausa.onclick = () => (video.paused ? video.play().catch(() => {}) : video.pause());
    (computador.addEventListener ? computador.addEventListener("change", decideVideo) : computador.addListener(decideVideo));
    decideVideo();

    // ----- Casa em destaque -----
    $("#destaque-foto").innerHTML = foto(d.foto, "Fachada: " + d.nome, { sizes: "(min-width: 821px) 64vw, 100vw" });
    $("#destaque-local").textContent = [d.bairro, d.cidade].filter(Boolean).join(" · ");
    $("#destaque-nome").textContent = d.nome;
    const etiquetas = [];
    if (d.area_m2) etiquetas.push(d.area_m2 + " m²");
    if (d.suites) etiquetas.push(d.suites + " suítes");
    if (d.vagas) etiquetas.push(d.vagas + " vagas");
    if (d.bairro) etiquetas.push(d.bairro);
    if (d.situacao) etiquetas.push(d.situacao);
    $("#destaque-etiquetas").innerHTML = etiquetas.map((e) => `<span>${esc(e)}</span>`).join("");

    // ----- Grade de obras -----
    const grade = $("#grade");
    function renderObras(filtro) {
      const lista = obras.filter((o) => filtro === "todas" || o.tipo === filtro);
      grade.innerHTML = lista.map((o) => {
        const local = [o.bairro, o.cidade].filter(Boolean).join(" · ");
        const dadosObra = [o.area_m2 && o.area_m2 + " m²", o.suites && o.suites + " suítes", o.situacao].filter(Boolean);
        return `<a class="card" href="#contato">
          <div class="moldura">${foto(o.foto, o.nome)}${o.tipo === "casas" ? '<span class="selo">Campeche</span>' : ""}</div>
          <span class="local">${local ? esc(local) : "Local " + pendente}</span>
          <h3>${esc(o.nome)}</h3>
          <span class="dados">${dadosObra.length ? dadosObra.map(esc).join(" · ") : "Área e tipologia " + pendente}</span>
        </a>`;
      }).join("");
      $("#contagem").textContent = lista.length + (lista.length === 1 ? " obra" : " obras");
    }
    $$(".chip").forEach((c) => (c.onclick = () => {
      $$(".chip").forEach((x) => x.setAttribute("aria-pressed", String(x === c)));
      renderObras(c.dataset.filtro);
    }));
    renderObras("todas");

    // ----- Fotos das outras seções -----
    $("#historia-foto").innerHTML = `<img src="imagens/obras/07-aurora-garden-480.webp" srcset="imagens/obras/07-aurora-garden-480.webp 480w, imagens/obras/07-aurora-garden-1400.webp 1400w" sizes="100vw" alt="" loading="lazy">`;
    $("#campeche-foto").innerHTML = foto("11-casa-jardim-campeche-288m2", "Casa da MB2 no Jardim Campeche", { sizes: "(min-width: 821px) 50vw, 100vw" });

    // ----- Contato: dados que a MB2 confirmar aparecem; os vazios ficam marcados -----
    const zap = $("#zap-fixo"), zapTexto = $("#zap-texto");
    if (empresa.whatsapp) {
      const n = empresa.whatsapp.replace(/\D/g, "");
      zap.href = "https://wa.me/" + n;
      zap.target = "_blank";
      zap.rel = "noopener";
      zapTexto.textContent = "WhatsApp";
      $$(".link-zap").forEach((a) => { a.href = zap.href; a.target = "_blank"; a.rel = "noopener"; });
    }
    $("#dados-contato").innerHTML =
      `Telefone e WhatsApp: ${empresa.whatsapp ? esc(empresa.whatsapp) : pendente} &nbsp;·&nbsp; E-mail: ${empresa.email ? esc(empresa.email) : pendente}`;
    $("#rodape-contato").innerHTML = [
      ["Telefone", empresa.telefone || empresa.whatsapp],
      ["E-mail", empresa.email],
      ["Endereço", empresa.endereco],
      ["CNPJ", empresa.cnpj]
    ].map(([k, v]) => `<li>${k} ${v ? esc(v) : pendente}</li>`).join("");
    if (empresa.instagram) {
      const ig = $("#instagram");
      ig.href = empresa.instagram;
      ig.hidden = false;
    }
  }

  // ----- Lançamentos (prévia: ainda não envia para lugar nenhum) -----
  $("#form-lancamentos").addEventListener("submit", (e) => {
    e.preventDefault();
    const aviso = $("#aviso-lancamentos"), email = $("#email").value.trim();
    aviso.hidden = false;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { aviso.textContent = "Digite um e-mail válido, como nome@exemplo.com."; return; }
    if (!$("#consentimento").checked) { aviso.textContent = "Marque a caixa da política de privacidade para continuar."; return; }
    aviso.textContent = "Esta é uma prévia: o cadastro ainda não está ligado a uma lista de e-mails.";
  });
})();
