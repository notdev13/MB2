import type { FormaPagamento } from './tipos';

// Listas de palavras e expressões do interpretador de voz (voz.ts). Ficam aqui para o código de voz.ts ficar só com a lógica;
// editar uma lista muda o comportamento, então rode `npm run check` e `npm run voz:medir` depois.

export const NUMEROS: Record<string, number> = {
  zero: 0, um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9,
  dez: 10, onze: 11, doze: 12, treze: 13, quatorze: 14, catorze: 14, quinze: 15, dezesseis: 16, dezessete: 17,
  dezoito: 18, dezenove: 19, vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60, setenta: 70,
  oitenta: 80, noventa: 90, cem: 100, cento: 100, duzentos: 200, trezentos: 300, quatrocentos: 400,
  quinhentos: 500, seiscentos: 600, setecentos: 700, oitocentos: 800, novecentos: 900,
  duzentas: 200, trezentas: 300, quatrocentas: 400, quinhentas: 500, seiscentas: 600, setecentas: 700, oitocentas: 800,
  novecentas: 900, dezasseis: 16, dezassete: 17, dezanove: 19, // feminino e português de Portugal
};

// Palavras que, logo depois de "2 mil 500", mostram que o 500 era outra coisa (quantidade).
export const UNIDADES_NUMERO = new Set(['sacos', 'metros', 'dias', 'horas', 'unidades', 'pecas', 'caixas', 'latas', 'kg']);

// "5 tomadas", "6 marmitas", "3 orçamentos": número pequeno seguido de substantivo no plural é quantidade.
export const NAO_E_PLURAL = /^(pelos|pelas|nos|nas|dos|das|aos|uns|umas|mais|menos|depois|antes|reais|todos|todas|sempre|apenas|ainda|talvez|pratas|mangos|contos|centavos|paus|pilas|mensais|anos|meses)$/;

// Unidades de contagem (peças que se compram aos montes): "20 sacos", "3 baldes".
// Equipe no plural: "dois pedreiros 450" não diz se são 450 de cada um ou no total.
export const EQUIPE = /^(pedreiros|serventes|ajudantes|encarregados|mestres|operarios|homens|eletricistas|encanadores|pintores|carpinteiros|marceneiros|gesseiros|azulejistas|soldadores|serralheiros|armadores|vigias|diaristas|jardineiros|motoristas)$/;
export const CONTAGEM = /^(sacos?|sacas?|latas?|caixas?|baldes?|rolos?|barras?|galao|galoes|fardos?|cargas?|tambores?)$/; // embalagens que custam mais de R$ 5 cada; "10 folhas 25" (lixa) pode ser total
export const UNIDADES = new Set([
  'saco', 'sacos', 'metro', 'metros', 'm', 'm2', 'm3', 'unidade', 'unidades', 'peca', 'pecas', 'lata', 'latas',
  'kg', 'quilo', 'quilos', 'tonelada', 'toneladas', 'caminhao', 'caminhoes', 'barra', 'barras', 'milheiro',
  'rolo', 'rolos', 'caixa', 'caixas', 'galao', 'galoes', 'litro', 'litros', 'dias', 'horas', 'vezes', 'parcelas',
  'pessoa', 'cabeca', 'folha', 'chapa', 'vara', 'par', 'pares', 'comodo', 'comodos', 'ponto', 'tomada', 'lampada', 'pacote', 'pacotes', 'saca', 'sacas', 'balde', 'baldes', 'tambor', 'tambores', 'carrada', 'carradas', 'carga',
  'cargas', 'carreta', 'carretas', 'fardo', 'fardos', 'm²', 'm³', 'parcela', 'etapa', 'fase', 'viagem', 'viagens', 'pessoas', 'homens', 'funcionarios', 'operarios', 'pedreiros', 'serventes',
  'ajudantes', 'quartos', 'andares', 'casas', 'lotes', 'pontos', 'tomadas', 'lampadas', 'milimetro', 'milimetros', 'mm', 'centimetro', 'centimetros', 'cm', 'polegada', 'polegadas', 'banheiros', 'andar', 'volt', 'volts', 'v', 'ampere', 'amperes', 'watts', 'w', 'hz', 'btu', 'btus', 'kva', 'kw', 'kwh', 'demao', 'demaos',
  'diaria', 'diarias', 'meses', 'anos', 'semestre', 'semestres', 'trimestre', 'trimestres', 'quinzena', 'quinzenas', 'vias', 'paginas', 'copias', 'assinaturas', 'km', 'sc', 'un', 'pc', 'pcs', 'cx', 'mt', 'mts', 'ton', 'tn', 'lt', 'lts', 'gl', 'pav', 'pavimento', 'pavimentos',
]);
export const MOEDA = new Set(['reais', 'real', 'conto', 'contos', 'pila', 'pilas', 'pratas', 'mangos']);
// "lote 39", "casa 12": o número é da obra, não é valor.
export const NUMERADORES = new Set(['lote', 'casa', 'lt', 'quadra', 'qd']);
export const OBRA_NUM = new Set(['lote', 'casa', 'lt', 'obra']); // "quadra 12" e "nota n 12" não são o número da obra
// Número que identifica documento ("nota fiscal 1234", "pedido 4521"), não dinheiro.
export const DOCUMENTOS = new Set(['nf-e', 'nfs', 'nfse', 'cei', 'cno', 'recibo', 'fatura', 'duplicata', 'comprovante', 'cupom', 'romaneio', 'nota', 'nf', 'pedido', 'orcamento', 'ordem', 'cheque', 'protocolo', 'contrato', 'processo',
  'matricula', 'cpf', 'cnpj', 'telefone', 'fone', 'cep', 'fiscal', 'apto', 'apt', 'ap', 'apartamento',
  'sala', 'andar', 'ano', 'parcela', 'prestacao', 'agencia', 'conta', 'numero', 'nfe', 'nº', 'n°', 'n', 'codigo', 'cod', 'ref', 'referencia', 'item', 'modelo', 'serie']);
// Estes só são documento quando o número tem 4 dígitos ou mais ("RRT 130" ainda pode ser o valor).
export const DOCUMENTOS_LONGOS = new Set(['solda', 'eletrodo', 'art', 'rrt', 'crea', 'apolice', 'inscricao']);
// Só para "X reais a dúzia": preço por unidade; "duas dúzias" sozinho continua valendo como número solto.
export const PRECO_POR = new Set(['duzia', 'duzias', 'metro', 'dia', 'degrau', 'lance', 'trecho', 'pe', 'centimetro']);
export const TEMPO = new Set(['dias', 'hora', 'horas', 'diaria', 'diarias', 'semana', 'semanas', 'meses']);
// Palavras que tiram o valor falado do lançamento: conta, receita, empréstimo, dúvida de quem fala.
// Só entram palavras que quase nunca aparecem num serviço ou material de obra; o resto fica em FRASES_SEM_VALOR,
// que exige o contexto ("subiu 200", "proposta de 12 mil", "acho que").
export const CALCULO = new Set(['cada', 'metade', 'dobro', 'triplo', 'terco', 'abatimento', 'troco', 'sobrou', 'restou',
  'diferenca', 'estorno', 'estornei', 'reembolso', 'reembolsei', 'devolveram', 'devolvi', 'devolucao', 'cotei',
  'recebi', 'recebemos', 'entrou', 'entraram', 'depositou', 'creditou', 'aportou', 'rendeu', 'lucrou', 'faturou', 'ganhamos', 'ganhei', 'ganhou', 'talvez', 'provavelmente', 'possivelmente', 'chutando', 'chutei', 'chute', 'aparentemente',
  'precisar', 'precisarei', 'comprarei', 'compraremos', 'pagaram', 'depositaram', 'transferiram', 'recebimento', 'repasse',
  'venda', 'vendas', 'vendi', 'vendemos', 'lucro', 'faturamento', 'orcar', 'contratar', 'quanto', 'quantos', 'qual', 'quais']);
// "meio fio", "meia cana", "meia parede", "meio tijolo": nome de peça, não metade de nada.
export const PECA_COM_MEIO = /^(fio|cana|parede|tijolo|agua|bloco|esquadria)$/;
// Palavras de quem fala de saldo, verba, previsão, tabela, aporte ou conferência: o número é outra coisa, não um gasto.
// Cláusulas e garantias de contrato: sem "R$"/"reais" o número é do contrato; com "R$"/"reais" pode ser pagamento (caução, medição).
export const CONTRATO_SEM_MOEDA = / (segunda via|aditivo|retencao|caucao|garantia|no orcamento|do orcamento|medicao [a-z0-9 ]*aprovad[oa]) /;
export const PALAVRAS_PARA_EXIGIR_GASTO = 5;
// Lista de preços: "o m3 de areia 160", "quilo do prego 18" (unidade no começo da frase = preço de cada).
export const PRECO_DE_TABELA = /^ (o |a )?(m3|m2|metro|quilo|kg|saco|hora|litro|milheiro|tonelada|unidade|lata) (de|do|da|dos|das) /;
export const NAO_CUSTO = / (duplicad[oa]|duplicidade|sera que|estimativa|sangria|retirada de caixa|(tirei|retirei|tiramos|sacamos|saquei) do caixa|saque do caixa|se (o|a|os|as|um|uma) ([a-z]+ ){0,2}[a-z]+(ar|er|ir)|via errada|chegou errad[oa]|veio errad[oa]|cobranca indevida|esta errad[oa]|estava errad[oa]|dinheiro do (financiamento|cliente|banco)|chegou o dinheiro|parcela da caixa|liberacao da caixa|orcamento (original|inicial|previsto|total|da obra)|(fechou|ficou|esta|estamos) (no )?(negativ[oa]|positiv[oa])|acima do previsto|abaixo do previsto|economiz[a-z]+|poup[a-z]+ |credito na loja|vale-compra|vale compra|vale presente|cashback|ja (saiu|sairam|gastamos|gastou|pagamos)|caso|se (eu|a gente|nos|voce|ele|ela|for|der|puder|fechar|comprar|pagar|precisar)|renda (do|familiar|mensal|bruta|liquida)|salarial|subiu para|aumentou para|passou para|proposta (aceita|aprovada|recebida|enviada)|(a |o )?(casa|imovel|terreno|apartamento) vale|vale [0-9]|ate agora|ate hoje|ate aqui|ate o momento|acumulado|desde o comeco|desde o inicio|estour(ou|ar|amos) (o )?orcamento|pesquisar (o )?(orcamento|preco|valor)|simular|simulei|simulando|contrato [a-z0-9 ]*(assinado|assinamos|assinei|fechado)|multa contratual|saldo (da|do|de|em) (conta|caixa|banco)|saldo (bancario|disponivel|atual)|verba|limite|previsto|prevista|tabela|sinapi|aporte|extrato|meta|teto de gastos|teto maximo|teto do orcamento|teto orcamentario|estoque|poupanca|lembrar|lembrete|conferir|revisar|verificar|checar|medindo|mede|(a )?media de|em media|estimado|estimada|capital|patrimonio|nota de credito|entrada de dinheiro|pe direito) /;
export const ESTRANGEIRA = new Set(['dolar', 'dolares', 'euro', 'euros', 'libra', 'libras']);
export const SIMBOLO_ESTRANGEIRO = new Set(['us$', 'usd', 'u$s', 'eur', 'dolar', 'dolares', 'euro', 'euros']);
// Flexões dos mesmos verbos ('estornaram', 'devolveu'...)
export const RAIZ_CALCULO = /^(estorn|reembols|devolv|emprest|ressarc|(sobr|rest)(a|am|aram|ando)$)/;
// Começo de um número escrito: "R$", dígitos ou palavra de número ("dois", "cem", "mil").
export const COMECO_DE_NUMERO = '(r\\$|[0-9][0-9.,]*|' + Object.keys(NUMEROS).join('|') + '|mil|meio|meia)';
export const ENTRE_VERBOS = '(apaga|apague|exclui|exclua|remove|remova|cancela|cancele|desfaz|desfaca|corrige|corrija|altera|altere|edita|edite|' +
  'atualiza|atualize|substitui|substitua|anula|anule|esquece|ignora|retira|tira|troca|troque|muda|mude|mudar|alterar|corrigir|editar|atualizar|apagar|excluir|remover|desfazer|cancelar|substituir|anular|reabre|reabra|restaura|restaure|duplica|duplique|copia|copie|repete|repita)';
// Frases de dúvida, intenção, comando e receita (olham o texto todo, não uma palavra solta).
export const FRASES_SEM_VALOR = new RegExp(' (' + [
  // comando de edição: "apaga o último", "corrige para 700", "exclui o de 300"; "troca de fechadura" é serviço e passa
  ENTRE_VERBOS + ' ((o|a|os|as) )?(ultimo|ultima|lancamento|gasto|custo|anterior|esse|essa|isso|aquele|aquela|primeiro|para|pra)',
  ENTRE_VERBOS + ' (o|a|os|as) de',
  // intenção e pergunta
  '(vou|vamos|preciso|precisamos|pretendo|pretendemos|queria|quero|tenho que|tenho de|temos que|precisa|planejo) (comprar|gastar|orcar|contratar|fechar)',
  '(preciso|precisamos|precisa) de', '(iremos|vamos|ia) gastar', '(ia|iria|queria|gostaria de|pretendia) (pagar|comprar|mandar|depositar|transferir|contratar)', '(custa|custam|custando|custaria|custara|seria|sera) ' + COMECO_DE_NUMERO,
  // quem fala não tem certeza
  '(acho|creio|penso|imagino|suponho|aposto|recordo|estimo|calculo) (que|q)', 'deve (ter|ser)', 'nao sei', 'sei la', 'nao lembro',
  'nao me engano', 'nao tenho certeza', 'sem certeza', 'por alto', 'a olho', 'parece que', 'me parece', 'mais ou menos', 'a menos',
  // "desconto de 100", "100 de desconto"; "com desconto" sozinho é o preço já descontado
  '(desconto|abatimento) (de |em |uns )' + COMECO_DE_NUMERO, '(desconto|abatimento) (do|da|de) [a-z]+ ' + COMECO_DE_NUMERO, COMECO_DE_NUMERO + ' (reais )?(de |em )?(desconto|abatimento)',
  // variação de preço, proposta e receita: só com o número logo depois
  '(subiu|caiu|baixou|aumentou|aumentaram|aumento|reajuste|reajustou|acrescimo) (de |em |uns )?' + COMECO_DE_NUMERO,
  '(proposta|cotacao|orcamento|estimativa|previsao|simulacao) de ' + COMECO_DE_NUMERO, 'receita (de|da|do)',
  // combinado ou pedido ainda não é pagamento: "combinei 3 mil com o pintor", "o pintor pediu 3 mil"
  '(combinei|combinamos|pediu|pediram|ofereceu|ofereceram|prometi|prometeu|propos) (de |em |uns )?' + COMECO_DE_NUMERO,
  'cliente (me |nos )?(pagou|pagaram|depositou|transferiu)', 'cliente (me |nos )?(mandou|enviou|passou) (de |uns |mais )?' + COMECO_DE_NUMERO,
  // alguém pagou ou liberou dinheiro PARA nós: entrada, não custo
  '(me|nos) (pagou|pagaram|depositou|depositaram|transferiu|transferiram|mandou|mandaram|devolveu|devolveram)', '(banco|financeira|caixa) (liberou|liberaram|creditou|aprovou)', '(liberou|liberaram|creditou|creditaram|emprestou|emprestaram)',
  // desejo, conversa em andamento e comando de edição com o valor no fim
  '(quer|querem|quero|queremos|querendo) (de |uns |por )?' + COMECO_DE_NUMERO,
  'ainda (nao )?(vou )?(aceitei|aceitamos|conferir|confirmar|fechei|fechamos|decidi|decidimos|defini|definimos|sei|combinei)', 'nao (aceitei|aceitamos|fechei|fechamos|confirmei|decidi|conferi|combinei)',
  'vou (conferir|confirmar|ver|checar|pensar)', 'a (conferir|confirmar|combinar|definir)', 'se (der|puder|conseguir|fechar|rolar|precisar|tiver|a gente)',
  'pode (ser|custar|ficar|sair)', 'vai (custar|sair|ficar)', 'deve (custar|ficar|sair)', 'custe',
  ENTRE_VERBOS + ' ((o|a) )?(valor|preco|total)', ENTRE_VERBOS + '( [a-z]+){1,3} (para|pra) ' + COMECO_DE_NUMERO,
  // dinheiro separado ou só visto, compra desfeita, contestação e comentário sobre o preço: não é gasto
  '(guardei|separei|reservei|guardamos|separamos|reservamos|poupei) (de |uns |mais |mais de )?' + COMECO_DE_NUMERO,
  'nao (comprei|compramos|levei|levamos|contratei|contratamos|fechei|fechamos|aceitei|aceitamos)', '(vi|vimos|achei|achamos) (um|uma|o|a|os|as) [a-z]+', 'contest(ar|ei|amos|ando)',
  COMECO_DE_NUMERO + ' (esta|ta|fica|ficou|e|era|estava) (barat|car|alt|baix|bom|ruim|salgad|em conta|justo|absurd|muito|bem)[a-z]*',
  // pedido de pix/transferência e aporte de sócio: "me faz um pix de 300", "o sócio colocou 30 mil no caixa"
  '(me|nos) (faz|faca|fazer|fizer) (um |uma )?(pix|ted|doc|transferencia|deposito)', '(socio|socia|dono|dona|patrao) (colocou|botou|pos|investiu|aportou)',
  // dívida de outra pessoa conosco: "fulano deve 500 pra mim", "ele me deve 300"
  '(me|nos) (deve|devem|devia|devendo)', '(deve|devem) ' + COMECO_DE_NUMERO + '( [a-z]+)? (pra|para) (mim|gente|nos)',
  // outra pessoa pagou: "a dona Marlene pagou ela mesma a pintura"
  'pagou (ela|ele|elas|eles) (mesm[oa]s?|proprio|propria)', 'por conta (dele|dela|deles|delas)',
  // recado para ligar para alguém: "ligar pro fornecedor 48 99912 3456 areia 500"
  '(ligar|ligue|liga) (pro|pra|para|no|na|ao|a) [a-z]+',
  // pedido de dinheiro, oferta, salário e valor que falta: nada disso é um pagamento já feito
  '(me |nos )?(manda|mande|envia|envie|passa|passe|deposita|deposite|transfere|transfira|adianta|adiante|empresta|empreste|libera|libere) (me |nos |uns |de |mais )?' + COMECO_DE_NUMERO,
  '(pode|podia|poderia|consegue|conseguia) (me |nos )?(adiantar|mandar|enviar|depositar|transferir|emprestar|passar|liberar)',
  '(ganha|ganham|ganhava|recebe|recebem|cobra|cobram) (de |uns |por )?' + COMECO_DE_NUMERO, '(passa|passou|chega|chegou|ultrapassa|ultrapassou) (de|a) ' + COMECO_DE_NUMERO,
  '(falta|faltam|faltou|faltaram) (mais |uns )?' + COMECO_DE_NUMERO, '(desconto|abatimento|estorno|devolucao|reembolso|troco|diferenca) (foi|era|seria|sera|ficou|deu) (de |em )?' + COMECO_DE_NUMERO,
  'financiamento (aprovado|liberado)', '(oferta|lance) de ' + COMECO_DE_NUMERO, 'proposta de compra ' + COMECO_DE_NUMERO, '(pedindo|ofereci|ofereceu|oferecendo|ofereco|pedido de) (de |uns |por )?' + COMECO_DE_NUMERO,
  'fechamos (a|o) (semana|mes|dia|caixa|obra)', 'cliente (adiantou|adiantaram|bancou|liberou|devolveu|sinalizou)',
  // faturamento e cobrança ao cliente são receita: "fatura para o cliente", "cobrei 12 mil do cliente", "a medição do mês fechou em 56 mil"
  'pagamento (do|da|de) cliente', '(fatura|faturei|faturamos|nota|emiti|emitimos|cobrei|cobramos) (para|pra|pro|ao|do|de|de|a)? ?(o |a )?cliente', 'cobrei', 'cobramos', 'emiti', 'emitimos', 'faturei', 'faturamos',
  'cliente (deve|deve a gente|esta devendo|ficou devendo)', 'a receber', 'medicao (do|da|de)', 'ja (foram|somam|somou|passou de|chegou a)',
  // "o preço do m2 de piso 85", "o m2 sai a 42 reais": preço de tabela, não pagamento
  'preco( [a-z0-9]+){0,4} ' + COMECO_DE_NUMERO, 'sai (a|por|em) ' + COMECO_DE_NUMERO, 'ainda nao (lancei|lancamos|registrei|anotei|incluimos)',
  // preço combinado ou de tabela no presente: "o orçamento da cobertura é 22 mil", "o preço do saco é 39"
  '(orcamento|preco|proposta|cotacao|tabela)( [a-z]+){0,4} (esta|ta|seria|sera|fica) ' + COMECO_DE_NUMERO,
].join('|') + ') ');
// Espaço, bairro ou prédio: o número que vem depois é endereço, não dinheiro.
export const NOME_LUGAR = new Set(['rua', 'avenida', 'av', 'travessa', 'alameda', 'rodovia', 'estrada', 'residencial', 'edificio',
  'condominio', 'sitio', 'chacara', 'loteamento']);
export const RUAS = new Set(['rua', 'avenida', 'av', 'travessa', 'alameda', 'rodovia', 'estrada']);
export const TELEFONE = new Set(['telefone', 'fone', 'tel', 'celular', 'whats', 'whatsapp', 'zap', 'contato']);
// Número que descreve o lugar ou o material, não é valor: "banheiro 2", "cômodo 25", "cp 2", "brita 1".
export const TAMANHOS = new Set(['tamanho', 'tam', 'bota', 'botina', 'calca', 'camisa', 'camiseta', 'sapato', 'tenis', 'luva']); // numeração de roupa/calçado vai até 99
export const SPEC_PREFIX = new Set(['tamanho', 'tam', 'bota', 'botina', 'calca', 'camisa', 'camiseta', 'sapato', 'tenis', 'luva', 'dn', 'km', 'etapa', 'fase', 'parte', 'medicao', 'boletim', 'pav', 'pavimento', 'cp', 'classe', 'banheiro', 'quarto', 'suite', 'cozinha', 'comodo', 'bloco', 'galpao', 'torre', 'andar', 'fck', 'lancamento', 'semana', 'mes', 'versao', 'revisao', 'folha', 'prancha', 'trimestre', 'semestre', 'quinzena', 'voltagem', 'tensao', 'cota', 'nivel']);
// Medida técnica logo depois do número ("8 milímetros", "220 volts"): o número descreve o material, não é valor nem quantidade.
export const MEDIDA_TECNICA = new Set(['km', 'gb', 'mb', 'tb', 'mega', 'gbps', 'mbps', 'va', 'dbi', 'milimetro', 'milimetros', 'mm', 'centimetro', 'centimetros', 'cm', 'polegada', 'polegadas', 'volt', 'volts', 'v',
  'ampere', 'amperes', 'watts', 'w', 'hz', 'btu', 'btus', 'kva', 'kw', 'kwh', 'kwp', 'cv', 'hp', 'graus', 'rpm', 'bar', 'psi', 'ohms', 'mpa', 'kgf',
  'kelvin', 'lumens', 'lux', 'micras', 'kcal', 'newtons', 'decibeis', 'hectares', 'alqueires', 'pes', 'jardas', 'milhas', 'gramas', 'miligramas',
  'megapixels', 'megapixel', 'mp', 'mah', 'gigas', 'giga', 'watt', 'lumen', 'amp', 'kelvins', 'centilitros', 'ml', 'cl','demao', 'demaos', 'metros', 'm2', 'm3', 'm²', 'm³']);
// "paguei dez de frete": depois de verbo de gasto, até número falado pequeno é dinheiro.
// Verbos e palavras que mostram gasto ou situação de pagamento. Frase LONGA sem nenhuma delas (e sem R$/reais, forma de pagamento
// ou item de obra) é comentário, não lançamento: "a laje tem 48 m2 e o prazo de entrega é 22 depois do feriado".
export const VERBO_DE_LANCAMENTO = /^(paguei|pagou|pagamos|pago|paga|pagos|pagas|pagaram|pagar|gastei|gastou|gastamos|gasto|gastaram|comprei|compramos|compra|comprou|custou|custa|saiu|ficou|deu|foi|foram|fechei|fechou|fechamos|liquidei|quitei|quitamos|acertei|acertamos|repassei|mandei|transferi|depositei|enviei|dei|passei|investi|desembolsei|custeei|bancou|arcamos|lanca|lancar|lance|lancei|anota|anotar|registra|registrar|adiciona|inclui|coloca|bota|poe|marca|salva|devo|devendo|vence|venc|vencimento|pendente|pendurado|fiado|aberto|atrasado|vencido|vencida|total|totalizou|somou|importou|aluguel|alugamos|aluguei|recebeu|levou|pegou|cobrou|peguei|gastos|comprados|pagamento|troquei|trocamos|abasteci|abastecemos|consertei|arrumei|reparei|instalei|montei|contratei|locamos|encomendei|bancamos|tirei|soltei|mandou|deixei|entreguei|levei|trouxe|trouxeram|fiz|fizemos)$/;
export const VERBO_GASTO = /^(paguei|gastei|gastamos|pagamos|custou|saiu|dei|mandei|passei|comprei|foi|deu)$/;

export const PERTO_DE_OUTRO_VALOR = /^(de|pro|pra|para|na|no|ou|ate)$/;
export const PISTAS = new Set(['por', 'total', 'tot', 'valor', 'vlr', 'custou', 'ficou', 'igual']);

export const MESES: Record<string, number> = {
  janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6, julho: 7, agosto: 8, setembro: 9,
  outubro: 10, novembro: 11, dezembro: 12,
};

export const SEMANA: Record<string, number> = {
  domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6,
};

export const GENERICAS = new Set(['obra', 'obras', 'projeto', 'terreno', 'servidao', 'rua', 'casa', 'residencial',
  'lote', 'jd', 'jardim', 'geminada', 'geminadas', 'de', 'da', 'do', 'das', 'dos', 'e']);

// Palavras do dia a dia que aparecem em nome de obra mas não a identificam sozinhas ("tinta azul", "comprei pedras").
export const PALAVRAS_COMUNS = new Set(['azul', 'verde', 'branco', 'branca', 'amarelo', 'rio', 'morro', 'pedra', 'pedras', 'praia', 'serra', 'vila', 'bairro',
  'parque', 'alto', 'baixo', 'novo', 'nova', 'velho', 'sobrado', 'dona', 'seu', 'dom', 'sao', 'santa', 'santo', 'condominio', 'edificio', 'vale', 'campo', 'centro']);

export const PAGAMENTOS: [RegExp, FormaPagamento][] = [
  // O reconhecimento de voz erra: "pix" vira "pique"/"piks", "boleto" vira "bolheto".
  [/^(pix|pique|piques|piks|pics|pixe)$/, 'pix'],
  [/^(boletos?|bolhetos?|bolletos?|boleta)$/, 'boleto'],
  [/^(cartao|credito|debito)$/, 'cartao'],
  [/^(transferencia|transferi|ted|doc|depositei)$/, 'transferencia'], // "depósito" sozinho é a loja de material, não a forma de pagamento
  [/^(dinheiro|especie|cash)$/, 'dinheiro'],
  [/^(cheque|cheques)$/, 'outro'],
];

export const VAZIAS = new Set([
  '', // o "|" de fim de frase
  'paguei', 'pagou', 'pago', 'paga', 'pagamos', 'pagar', 'pagamento', 'gastei', 'gasto', 'gastamos', 'comprei',
  'compra', 'compramos', 'lancar', 'lanca', 'lancamento', 'custo', 'foi', 'de', 'do', 'da', 'dos', 'das', 'no',
  'na', 'nos', 'nas', 'em', 'com', 'o', 'a', 'os', 'as', 'ao', 'aos', 'um', 'uma', 'pro', 'pra', 'para', 'por',
  'r$', 'valor', 'total', 'e', 'que', 'via', 'pelo', 'pela', 'feito', 'feita', 'hoje', 'ontem', 'obra', 'reais',
  'real', 'ainda', 'falta', 'vou', 'vai', 'fica', 'ficou', 'aberto', 'fiado', 'prazo', 'passada', 'passado', 'feira', 'mais', 'agora', 'agorinha', 'vem', 'noite', 'manha', 'tarde', 'cedo', 'amanha', 'proxima', 'proximo',
  // ruído de fala e verbos que não dizem o que foi comprado
  'entao', 'ta', 'hum', 'hm', 'ah', 'eh', 'ne', 'olha', 'certo', 'pronto', 'bom', 'tipo', 'assim', 'ok', 'deu', 'dei',
  'mandei', 'transferi', 'depositei', 'acertei', 'cada', 'meio', 'meia', 'parcelado', 'parcelada', 'parcelas', 'vezes',
  'centavos', 'conto', 'contos',
]);
