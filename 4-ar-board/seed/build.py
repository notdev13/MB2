import json, datetime
items = []
def add(id, title, text, tags, preview):
    items.append({"id": id, "title": title, "text": text, "tags": tags, "preview": " ".join(preview.split())})

add("h01","Gelada na areia","A foto da oferta ocupa a tela inteira e o texto fica num cartão por cima. Máximo impacto para a Heineken.",["foto cheia","impacto"],"""
<style>.m{background:#fbfaf6;color:#17322b}.ph{position:absolute;inset:0}
.nav{position:absolute;top:0;left:0;right:0;display:flex;justify-content:space-between;align-items:center;padding:2cqw 3cqw}
.lg{font:800 2.6cqw 'Bricolage Grotesque';color:#fff;text-shadow:0 .2cqw .8cqw rgba(0,0,0,.3)}
.nv{display:flex;gap:2cqw;font-size:1.6cqw;color:#fff;font-weight:600;text-shadow:0 .2cqw .6cqw rgba(0,0,0,.3)}
.card{position:absolute;left:3cqw;bottom:4cqw;width:44cqw;background:#fbfaf6;border-radius:1.8cqw;padding:2.4cqw 2.6cqw;display:grid;gap:1cqw}
.k{font:700 1.3cqw 'JetBrains Mono';color:#e2553a;letter-spacing:.1em}
h1{font:800 4.2cqw/1 'Bricolage Grotesque'}p{font-size:1.6cqw;color:#41554f}
.b{justify-self:start;background:#2e8b6e;color:#fff;font-weight:700;font-size:1.6cqw;padding:1.1cqw 2cqw;border-radius:99px}</style>
<div class="m"><div class="ph" data-l="Foto da oferta: Heineken no gelo, praia do Campeche"><i class="btl" style="left:62%"></i><i class="btl" style="left:69%"></i><i class="btl" style="left:76%"></i></div>
<div class="nav"><span class="lg">Empório Eucalipto</span><span class="nv"><span>Ofertas</span><span>Categorias</span><span>Carrinho (0)</span></span></div>
<div class="card"><span class="k">OFERTA DA SEMANA</span><h1>Heineken trincando, entregue na sua porta</h1><p>Delivery grátis no Sul da Ilha · hoje das 14h às 21h</p><span class="b">Pedir pelo WhatsApp</span></div></div>""")

add("h02","Plaquinha de feira","Tom de bairro, letra à mão e o preço numa plaquinha amarela. Próximo, informal e jovem.",["letra à mão","bairro"],"""
<style>.m{background:#fbfaf6;color:#1f2a24;display:grid;grid-template-columns:1fr 1fr;gap:3cqw;padding:4cqw}
.l{display:grid;align-content:center;gap:1.6cqw}.lg{font:800 1.7cqw 'Bricolage Grotesque';color:#2e8b6e;letter-spacing:.04em}
h1{font:700 5.6cqw/.95 'Caveat'}h1 em{color:#e2553a;font-style:normal}p{font-size:1.6cqw;color:#55615b}
.b{justify-self:start;background:#9ccf3a;color:#16301f;font-weight:700;font-size:1.6cqw;padding:1.1cqw 2cqw;border-radius:1cqw;box-shadow:.4cqw .4cqw 0 #16301f}
.r{position:relative}.r .ph{height:100%;border-radius:1.4cqw}
.pl{position:absolute;left:-3cqw;top:3cqw;background:#ffdb4d;padding:1.4cqw 2cqw;transform:rotate(-6deg);font:700 2.6cqw/1 'Caveat';color:#1f2a24;box-shadow:0 .4cqw 1cqw rgba(0,0,0,.15)}
.pl b{display:block;font-size:4.4cqw;color:#c2372b}</style>
<div class="m"><div class="l"><span class="lg">EMPÓRIO EUCALIPTO · CAMPECHE</span><h1>Do empório pra sua casa, <em>gelado</em> e rapidinho</h1><p>Hortifruti, padaria, bebidas e mercearia. Frete grátis no Sul da Ilha.</p><span class="b">Montar meu pedido</span></div>
<div class="r"><div class="ph" data-l="Heineken no gelo, praia do Campeche"><i class="btl" style="left:42%"></i><i class="btl" style="left:55%"></i></div><div class="pl">Heineken long neck<b>R$ —,—</b></div></div></div>""")

add("h03","Cara de app","Busca, carrinho e categorias logo no topo; a oferta vira o banner nº 1. Para quem já chega querendo comprar.",["app","conversão"],"""
<style>.m{background:#f6f7f4;color:#14231e;padding:2.6cqw 3cqw;display:grid;grid-template-rows:auto auto 1fr auto;gap:1.8cqw}
.top{display:flex;align-items:center;gap:2cqw}.lg{font:800 2.2cqw 'Bricolage Grotesque';color:#2e8b6e;white-space:nowrap}
.s{flex:1;background:#fff;border:.15cqw solid #dfe3dd;border-radius:99px;padding:1.1cqw 2cqw;font-size:1.5cqw;color:#7b867f}
.cart{background:#14231e;color:#fff;border-radius:99px;padding:1.1cqw 1.8cqw;font-size:1.5cqw;font-weight:700;white-space:nowrap}
.ch{display:flex;gap:1cqw;flex-wrap:wrap}.ch span{background:#fff;border:.15cqw solid #dfe3dd;border-radius:99px;padding:.7cqw 1.6cqw;font-size:1.4cqw}
.ch span:first-child{background:#ff6b4a;border-color:#ff6b4a;color:#fff}
.bn{display:grid;grid-template-columns:1.1fr 1fr;border-radius:2cqw;overflow:hidden;background:#123d33;color:#fff}
.bt{padding:3cqw;display:grid;align-content:center;gap:1.2cqw}.bt small{font:600 1.3cqw 'JetBrains Mono';color:#9ee6c9;letter-spacing:.08em}
.bt h1{font:800 3.8cqw/1 'Bricolage Grotesque'}.bt span{justify-self:start;background:#ffcc33;color:#14231e;font-weight:700;font-size:1.5cqw;padding:1cqw 1.8cqw;border-radius:99px}
.ft{display:flex;gap:2.4cqw;font-size:1.35cqw;color:#55635c}</style>
<div class="m"><div class="top"><span class="lg">Empório Eucalipto</span><span class="s">Buscar produtos…</span><span class="cart">Carrinho · 0</span></div>
<div class="ch"><span>Ofertas</span><span>Bebidas</span><span>Hortifruti</span><span>Padaria</span><span>Mercearia</span><span>Limpeza</span></div>
<div class="bn"><div class="bt"><small>DESTAQUE Nº 1</small><h1>Heineken gelada com preço de praia</h1><span>Adicionar ao carrinho</span></div><div class="ph" data-l="Foto: Heineken no gelo"><i class="btl" style="left:28%;height:13cqw"></i><i class="btl" style="left:44%;height:13cqw"></i><i class="btl" style="left:60%;height:13cqw"></i></div></div>
<div class="ft"><span>Grátis no Sul da Ilha</span><span>R$ 9,90 até a Lagoa</span><span>Delivery hoje 14h–21h</span></div></div>""")

add("h04","Editorial","Título grande em serifa e a foto num arco ao lado. Mais sofisticado e menos varejo.",["serifa","premium"],"""
<style>.m{background:#fbfaf6;color:#1c2421;padding:3.4cqw 4cqw;display:grid;grid-template-columns:1.25fr 1fr;gap:4cqw;align-items:center}
.l{display:grid;gap:1.8cqw}.k{font:500 1.25cqw 'JetBrains Mono';color:#2e8b6e;letter-spacing:.1em}
h1{font:600 5.8cqw/.98 'Fraunces';letter-spacing:-.02em}h1 i{color:#2e8b6e}p{font-size:1.7cqw;color:#4f5a55}
.cta{display:flex;gap:2cqw;font-size:1.6cqw;font-weight:600;align-items:center}.cta span:first-child{background:#1c2421;color:#fbfaf6;padding:1.1cqw 2cqw;border-radius:99px}.cta span:last-child{text-decoration:underline}
.c{display:grid;gap:1.2cqw}.c .ph{aspect-ratio:1/1;border-radius:24cqw 24cqw 1.6cqw 1.6cqw}.c small{font-size:1.4cqw;color:#4f5a55}.c b{color:#e2553a}</style>
<div class="m"><div class="l"><span class="k">EMPÓRIO EUCALIPTO · AV. JARDIM DOS EUCALIPTOS</span><h1>O empório do Campeche, <i>na sua porta.</i></h1><p>Escolha no site, finalize no WhatsApp. Frete grátis em todo o Sul da Ilha.</p><div class="cta"><span>Ver ofertas</span><span>Como funciona</span></div></div>
<div class="c"><div class="ph" data-l="Heineken no gelo"><i class="btl" style="left:34%"></i><i class="btl" style="left:52%"></i></div><small><b>Oferta da semana:</b> Heineken long neck gelada</small></div></div>""")

add("h05","Cupom","A oferta aparece como um cupom recortado. Reforça a ideia de preço especial e de tempo limitado.",["cupom","promoção"],"""
<style>.m{background:#e9f4ef;color:#132620;padding:3cqw;display:grid;grid-template-columns:1fr 1.15fr;gap:3cqw;align-items:center}
.cp{background:#fffdf7;border-radius:1.2cqw;padding:3cqw;font-family:'JetBrains Mono',monospace;border:.25cqw dashed #2e8b6e;display:grid;gap:1.2cqw}
.cp small{font-size:1.25cqw;letter-spacing:.1em;color:#2e8b6e}.cp h2{font:800 3.4cqw/1.05 'Bricolage Grotesque'}
.cp .p{font-size:5cqw;font-weight:700;color:#e2553a}.cp .t{font-size:1.25cqw;color:#5b6b64;border-top:.2cqw dotted #9ab8ab;padding-top:1.2cqw;line-height:1.5}
.r{display:grid;gap:1.6cqw}.lg{font:800 2cqw 'Bricolage Grotesque';color:#2e8b6e}h1{font:800 4.2cqw/1 'Bricolage Grotesque'}
.r .ph{height:20cqw;border-radius:1.4cqw}.b{justify-self:start;background:#132620;color:#fff;font-weight:700;font-size:1.5cqw;padding:1.1cqw 2cqw;border-radius:99px}</style>
<div class="m"><div class="cp"><small>CUPOM · VÁLIDO ESTA SEMANA</small><h2>Heineken long neck</h2><div class="p">R$ —,—</div><div class="t">Delivery grátis no Sul da Ilha<br>Pedido fechado pelo WhatsApp</div></div>
<div class="r"><span class="lg">Empório Eucalipto</span><h1>Gelada no cupom, entregue no Campeche</h1><div class="ph" data-l="Foto: Heineken no gelo, praia"><i class="btl" style="left:40%;height:11cqw"></i><i class="btl" style="left:53%;height:11cqw"></i></div><span class="b">Usar cupom no pedido</span></div></div>""")

add("h06","Calculadora de frete","A oferta vira uma faixa no topo e o destaque passa a ser o frete por bairro. Opção arriscada: a Heineken perde força.",["frete","utilidade","arriscada"],"""
<style>.m{background:#fbfaf6;color:#152520;display:grid;grid-template-rows:auto 1fr}
.of{display:flex;align-items:center;gap:2cqw;background:#123d33;color:#fff;padding:1.4cqw 3cqw;font-size:1.6cqw}
.of .ph{width:9cqw;height:5cqw;border-radius:.8cqw;flex:none}.of b{color:#ffcc33}
.of span:last-child{margin-left:auto;background:#ffcc33;color:#123d33;padding:.8cqw 1.6cqw;border-radius:99px;font-weight:700}
.bd{display:grid;grid-template-columns:1fr 1fr;gap:3cqw;padding:3cqw;align-items:center}.l{display:grid;gap:1.6cqw}
h1{font:800 4.6cqw/1 'Bricolage Grotesque'}p{font-size:1.6cqw;color:#4d5c56}
.ip{background:#fff;border:.15cqw solid #dfe3dd;border-radius:99px;padding:1.1cqw 2cqw;font-size:1.5cqw;color:#7b867f}
.z{display:grid;gap:1cqw}.z div{display:flex;justify-content:space-between;align-items:center;border-radius:1.2cqw;padding:1.4cqw 2cqw;font-size:1.6cqw;font-weight:600}
.z div:nth-child(1){background:#2e8b6e;color:#fff}.z div:nth-child(2){background:#bfe8d6}.z div:nth-child(3){background:#eef0ea}.z b{font:700 1.6cqw 'JetBrains Mono'}</style>
<div class="m"><div class="of"><div class="ph" data-l=""><i class="btl" style="left:40%;height:4cqw;width:1.4cqw"></i></div><span><b>Oferta nº 1:</b> Heineken long neck gelada</span><span>Quero</span></div>
<div class="bd"><div class="l"><h1>Quanto custa chegar até você?</h1><p>Digite seu bairro e veja o frete antes de montar o pedido.</p><span class="ip">Seu bairro ou CEP…</span></div>
<div class="z"><div>Sul da Ilha<b>GRÁTIS</b></div><div>Até a Lagoa da Conceição<b>R$ 9,90</b></div><div>Demais bairros<b>R$ 5 / 3 km</b></div></div></div></div>""")

add("h07","Blocos de cor","Amarelo, verde e foto em blocos chapados, com título em caixa alta. Visual forte de varejo jovem.",["caixa alta","contraste"],"""
<style>.m{display:grid;grid-template-columns:1.2fr 1fr;grid-template-rows:1fr auto;background:#fbfaf6}
.a{background:#ffcc33;padding:3.4cqw;display:grid;align-content:space-between;color:#14231e}.a small{font:700 1.4cqw 'JetBrains Mono';letter-spacing:.1em}
.a h1{font:400 6.6cqw/.9 'Archivo Black';text-transform:uppercase}.m>.ph{grid-row:1/3;grid-column:2}
.c{background:#2e8b6e;color:#fff;padding:2cqw 3.4cqw;display:flex;justify-content:space-between;align-items:center;font-size:1.6cqw;gap:2cqw}
.c span:last-child{background:#fbfaf6;color:#14231e;font-weight:700;padding:1cqw 1.8cqw;border-radius:99px;white-space:nowrap}</style>
<div class="m"><div class="a"><small>EMPÓRIO EUCALIPTO · CAMPECHE</small><h1>Heineken gelada. Já.</h1></div><div class="ph" data-l="Foto: Heineken no gelo, praia do Campeche"><i class="btl" style="left:22%"></i><i class="btl" style="left:40%"></i><i class="btl" style="left:58%"></i></div><div class="c"><span>Frete grátis no Sul da Ilha</span><span>Pedir no WhatsApp</span></div></div>""")

add("h08","Aberto agora","Fundo escuro com o status do delivery ao vivo e os horários do dia. Foge de propósito da base off-white da v5, para testar contraste.",["status ao vivo","fundo escuro","fora da v5"],"""
<style>.m{background:#0f2a24;color:#eaf6f0;padding:3cqw 3.6cqw;display:grid;grid-template-columns:1fr 1fr;gap:3cqw;align-items:center}
.l{display:grid;gap:1.8cqw}.st{justify-self:start;display:flex;align-items:center;gap:1cqw;border:.15cqw solid #9ee6c9;color:#9ee6c9;border-radius:99px;padding:.8cqw 1.6cqw;font:600 1.35cqw 'JetBrains Mono'}
.st::before{content:"";width:1cqw;height:1cqw;border-radius:50%;background:#46d68f;box-shadow:0 0 0 .5cqw rgba(70,214,143,.25)}
h1{font:800 4.4cqw/1 'Bricolage Grotesque'}.h{display:grid;grid-template-columns:auto 1fr;gap:.6cqw 2cqw;font-size:1.5cqw;color:#b9cfc6}.h b{color:#fff;font-family:'JetBrains Mono'}
.b{justify-self:start;background:#ffcc33;color:#0f2a24;font-weight:700;font-size:1.6cqw;padding:1.1cqw 2cqw;border-radius:99px}
.c{background:#fbfaf6;color:#14231e;border-radius:2cqw;overflow:hidden}.c .ph{height:24cqw}.c .f{padding:1.6cqw 2cqw;font-size:1.6cqw;display:flex;justify-content:space-between}.c b{color:#e2553a}</style>
<div class="m"><div class="l"><span class="st">DELIVERY ABERTO · HOJE ATÉ 21H</span><h1>Seu mercado do Campeche está aberto agora</h1><div class="h"><span>Delivery</span><b>14h – 21h</b><span>Loja física</span><b>7h30 – 21h</b></div><span class="b">Fazer pedido</span></div>
<div class="c"><div class="ph" data-l="Heineken no gelo"><i class="btl" style="left:35%;height:12cqw"></i><i class="btl" style="left:52%;height:12cqw"></i></div><div class="f"><span>Heineken long neck</span><b>Oferta</b></div></div></div>""")

add("h09","Carrossel de ofertas","Ofertas em slides, com a Heineken travada no slide 1. Escala bem quando entrarem outras promoções.",["carrossel","escalável"],"""
<style>.m{background:#fbfaf6;color:#14231e;display:grid;grid-template-rows:auto 1fr auto;padding:2.4cqw 3cqw;gap:1.6cqw}
.nav{display:flex;justify-content:space-between;align-items:center;font-size:1.5cqw}.lg{font:800 2.2cqw 'Bricolage Grotesque';color:#2e8b6e}
.sl{position:relative;border-radius:2cqw;overflow:hidden}.sl .ph{position:absolute;inset:0}
.ov{position:absolute;inset:0;background:linear-gradient(90deg,rgba(15,42,36,.88),rgba(15,42,36,0) 62%);padding:3.4cqw;display:grid;align-content:center;gap:1.4cqw;color:#fff;justify-items:start}
.ov small{font:600 1.3cqw 'JetBrains Mono';letter-spacing:.1em;color:#ffcc33}.ov h1{font:800 4.4cqw/1 'Bricolage Grotesque';max-width:42cqw}
.ov span{background:#ff6b4a;font-weight:700;font-size:1.5cqw;padding:1cqw 1.8cqw;border-radius:99px}
.ar{position:absolute;right:2cqw;top:50%;transform:translateY(-50%);width:4cqw;height:4cqw;border-radius:50%;background:#fff;color:#14231e;display:grid;place-items:center;font-size:2.4cqw}
.dt{display:flex;justify-content:center;gap:1cqw}.dt i{width:1.2cqw;height:1.2cqw;border-radius:99px;background:#cfd6d1}.dt i:first-child{width:4cqw;background:#2e8b6e}</style>
<div class="m"><div class="nav"><span class="lg">Empório Eucalipto</span><span>Ofertas · Categorias · Frete · Carrinho</span></div>
<div class="sl"><div class="ph" data-l="Slide 1 de 4: Heineken no gelo"><i class="btl" style="left:64%"></i><i class="btl" style="left:72%"></i></div><div class="ov"><small>1 DE 4 · OFERTA FIXA NO TOPO</small><h1>Heineken gelada, do empório pra areia</h1><span>Pedir agora</span></div><span class="ar">›</span></div>
<div class="dt"><i></i><i></i><i></i><i></i></div></div>""")

add("h10","Botânico","Folhas de eucalipto estilizadas, serifa suave e foto redonda. Mais acolhedor e menos promocional.",["botânico","acolhedor"],"""
<style>.m{background:#f4f6ef;color:#1e2b25;display:grid;grid-template-columns:1fr 1fr;align-items:center;padding:3cqw 4cqw;gap:3cqw}
.l{display:grid;gap:1.6cqw;position:relative;z-index:1}.lg{font:400 2.4cqw 'Young Serif';color:#3f7d63}
h1{font:400 4.6cqw/1.04 'Young Serif'}p{font-size:1.6cqw;color:#55635c}
.b{justify-self:start;background:#f2a07b;color:#1e2b25;font-weight:700;font-size:1.6cqw;padding:1.1cqw 2cqw;border-radius:99px}
.r{position:relative;height:100%;display:grid;place-items:center}.lf{position:absolute;width:18cqw;height:18cqw;border-radius:0 50% 0 50%;background:#a9c9b4;opacity:.7}
.r .ph{width:30cqw;height:30cqw;border-radius:50%}.r .ph::after{right:50%;transform:translateX(50%);bottom:4cqw;white-space:nowrap}
.tg{position:absolute;right:0;bottom:3cqw;background:#fff;border-radius:1.2cqw;padding:1.2cqw 1.6cqw;font-size:1.4cqw;box-shadow:0 .6cqw 1.6cqw rgba(30,43,37,.12)}.tg b{display:block;font-size:1.8cqw;color:#c2372b}</style>
<div class="m"><div class="l"><span class="lg">Empório Eucalipto</span><h1>Frescor de bairro, entregue com calma e rapidez</h1><p>Hortifruti, pães e bebidas geladas. Grátis no Sul da Ilha.</p><span class="b">Ver o que tem hoje</span></div>
<div class="r"><i class="lf" style="top:1cqw;left:1cqw"></i><i class="lf" style="bottom:1cqw;right:1cqw;transform:rotate(90deg)"></i><div class="ph" data-l="Heineken no gelo"><i class="btl" style="left:38%;height:12cqw"></i><i class="btl" style="left:52%;height:12cqw"></i></div><div class="tg">Oferta nº 1<b>Heineken gelada</b></div></div></div>""")

board = {
  "profile":"design","round":1,
  "title":"Empório Eucalipto · hero do site",
  "brief":"10 direções para a primeira dobra do site de delivery. Regras fixas: oferta da Heineken como 1º destaque, base off-white da identidade v5, sem elementos orientais. Fotos e cores são marcadores; o preço da oferta ainda está em aberto.",
  "createdAt": datetime.datetime(2026,10,12,18,40,tzinfo=datetime.timezone.utc).isoformat(),
  "items": items
}
json.dump(board, open('/home/claude/ar-board/seed/board-design-r1.json','w'), ensure_ascii=False)
print(len(json.dumps(board, ensure_ascii=False)), len(items))
