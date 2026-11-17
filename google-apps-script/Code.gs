/**
 * ============================================================================
 *  Studio Anadison O Mágico — API da Fila de Atendimento (Google Apps Script)
 * ============================================================================
 *
 *  Este script transforma a planilha do Google em uma "base compartilhada" para
 *  o site da fila. Todos os celulares e navegadores leem e gravam aqui.
 *
 *  Regras aplicadas NO SERVIDOR (não dá para burlar pelo site):
 *   - Clientes: apenas veem a lista e cadastram o próprio nome.
 *   - Barbeiro (com senha): marca atendidos, remove, cadastra e limpa a lista.
 *   - Máximo de 30 nomes por dia, sem nomes repetidos.
 *   - A lista é zerada automaticamente quando o dia muda.
 *
 *  Como instalar: veja o arquivo GUIA-CONFIGURACAO.md que acompanha o projeto.
 * ============================================================================
 */

/* ========================== CONFIGURAÇÕES ========================== */

/** Senha do painel do barbeiro. TROQUE antes de implantar. */
const SENHA_ADMIN = 'troque-esta-senha';

/** Limite de nomes por dia. */
const LIMITE_POR_DIA = 30;

/** true = clientes cadastram o próprio nome pela página. false = só o barbeiro cadastra. */
const CLIENTE_PODE_CADASTRAR = true;

/** Fuso horário usado para saber quando o dia vira. */
const FUSO_HORARIO = 'America/Sao_Paulo';

/**
 * ID da planilha (o trecho entre /d/ e /edit no endereço dela).
 * Deixe vazio se o script foi criado por dentro da planilha (Extensões → Apps Script).
 */
const PLANILHA_ID = '';

/* ======================= NÃO PRECISA ALTERAR ======================= */

const NOME_ABA = 'Fila';
const TAMANHO_MAX_NOME = 60;
const CABECALHO = ['ID', 'Nome', 'Status', 'Origem', 'Cadastrado em', 'Atendido em'];
const COL = { ID: 0, NOME: 1, STATUS: 2, ORIGEM: 3, CRIADO: 4, ATENDIDO: 5 };
const STATUS_AGUARDANDO = 'aguardando';
const STATUS_ATENDIDO = 'atendido';
const MAX_TENTATIVAS_SENHA = 10;
const BLOQUEIO_SEGUNDOS = 300;

/* --------------------------- Entradas HTTP --------------------------- */

/** GET: leitura pública da lista. */
function doGet(e) {
  try {
    const acao = (e && e.parameter && e.parameter.action) || 'list';
    if (acao !== 'list') return responder(erro('ACAO_INVALIDA', 'Ação inválida.'));
    return responder(listar(false));
  } catch (err) {
    console.error(err);
    return responder(erro('ERRO_INTERNO', 'Erro no servidor. Tente novamente.'));
  }
}

/** POST: cadastro e ações do barbeiro. O corpo é um JSON enviado como texto. */
function doPost(e) {
  let corpo;
  try {
    corpo = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return responder(erro('REQUISICAO_INVALIDA', 'Requisição inválida.'));
  }
  try {
    return responder(executar(corpo || {}));
  } catch (err) {
    console.error(err);
    return responder(erro('ERRO_INTERNO', 'Erro no servidor. Tente novamente.'));
  }
}

function executar(corpo) {
  // Ações públicas
  if (corpo.action === 'list') return listar(false);
  if (corpo.action === 'add') {
    if (!CLIENTE_PODE_CADASTRAR) return erro('NAO_PERMITIDO', 'O cadastro é feito pela barbearia.');
    return cadastrar(corpo.name, 'cliente');
  }

  // Daqui para baixo, somente com a senha do barbeiro
  const falha = autenticar(corpo.password);
  if (falha) return falha;

  switch (corpo.action) {
    case 'login':
      return ok({});
    case 'adminList':
      return listar(true);
    case 'adminAdd':
      return cadastrar(corpo.name, 'barbeiro');
    case 'setServed':
      return marcar(String(corpo.id || ''), corpo.served === true);
    case 'remove':
      return remover(String(corpo.id || ''));
    case 'reset':
      return reiniciar();
    default:
      return erro('ACAO_INVALIDA', 'Ação inválida.');
  }
}

/* ------------------------------ Ações ------------------------------ */

function listar(completo) {
  const aba = prepararDia();
  const linhas = lerLinhas(aba);
  return ok({
    date: hoje(),
    capacity: LIMITE_POR_DIA,
    allowPublicRegistration: CLIENTE_PODE_CADASTRAR,
    clients: linhas.map(function (l, i) {
      return paraCliente(l, i, completo);
    }),
  });
}

function cadastrar(nomeDigitado, origem) {
  const validacao = validarNome(nomeDigitado, origem === 'cliente');
  if (!validacao.ok) return validacao;
  const nome = validacao.name;

  return comTrava(function () {
    const aba = prepararDia(true);
    const linhas = lerLinhas(aba);

    if (linhas.length >= LIMITE_POR_DIA) {
      return erro('LISTA_CHEIA', 'As ' + LIMITE_POR_DIA + ' vagas de hoje já foram preenchidas.');
    }
    const chave = chaveNome(nome);
    for (let i = 0; i < linhas.length; i++) {
      if (chaveNome(String(linhas[i][COL.NOME])) === chave) {
        return erro(
          'NOME_REPETIDO',
          '"' + linhas[i][COL.NOME] + '" já está na lista de hoje. Se for outra pessoa, inclua um sobrenome diferente.',
        );
      }
    }

    const nova = [Utilities.getUuid(), nome, STATUS_AGUARDANDO, origem, agoraTexto(), ''];
    // setValues (e não appendRow) respeita o formato de texto das colunas de horário.
    colunasDeDataComoTexto(aba);
    aba.getRange(aba.getLastRow() + 1, 1, 1, CABECALHO.length).setValues([nova]);
    return ok({ client: paraCliente(nova, linhas.length, true) });
  });
}

function marcar(id, atendido) {
  return comTrava(function () {
    const aba = prepararDia(true);
    const linhas = lerLinhas(aba);
    const indice = buscarIndice(linhas, id);
    if (indice === -1) return erro('NAO_ENCONTRADO', 'Este nome não está mais na lista.');

    const linha = linhas[indice];
    linha[COL.STATUS] = atendido ? STATUS_ATENDIDO : STATUS_AGUARDANDO;
    linha[COL.ATENDIDO] = atendido ? agoraTexto() : '';
    colunasDeDataComoTexto(aba);
    aba.getRange(indice + 2, 1, 1, CABECALHO.length).setValues([linha]);
    return ok({ client: paraCliente(linha, indice, true) });
  });
}

function remover(id) {
  return comTrava(function () {
    const aba = prepararDia(true);
    const linhas = lerLinhas(aba);
    const indice = buscarIndice(linhas, id);
    if (indice === -1) return erro('NAO_ENCONTRADO', 'Este nome não está mais na lista.');
    const cliente = paraCliente(linhas[indice], indice, true);
    aba.deleteRow(indice + 2);
    return ok({ client: cliente });
  });
}

function reiniciar() {
  return comTrava(function () {
    const aba = obterAba();
    limparLinhas(aba);
    PropertiesService.getScriptProperties().setProperty('DATA_FILA', hoje());
    return ok({});
  });
}

/* --------------------------- Dia e planilha --------------------------- */

function hoje() {
  return Utilities.formatDate(new Date(), FUSO_HORARIO, 'yyyy-MM-dd');
}

/**
 * Garante que a lista é a de hoje. Se o dia mudou, apaga os nomes do dia anterior.
 * @param {boolean} jaTravado true quando chamado de dentro de comTrava()
 */
function prepararDia(jaTravado) {
  const aba = obterAba();
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('DATA_FILA') === hoje()) return aba;

  const zerar = function () {
    if (props.getProperty('DATA_FILA') !== hoje()) {
      limparLinhas(aba);
      props.setProperty('DATA_FILA', hoje());
    }
    return aba;
  };
  return jaTravado ? zerar() : comTrava(zerar);
}

function obterAba() {
  const planilha = PLANILHA_ID ? SpreadsheetApp.openById(PLANILHA_ID) : SpreadsheetApp.getActiveSpreadsheet();
  let aba = planilha.getSheetByName(NOME_ABA);
  if (!aba) {
    aba = planilha.insertSheet(NOME_ABA);
    aba.getRange(1, 1, 1, CABECALHO.length).setValues([CABECALHO]);
    aba.setFrozenRows(1);
    colunasDeDataComoTexto(aba);
  }
  return aba;
}

function lerLinhas(aba) {
  const ultima = aba.getLastRow();
  if (ultima < 2) return [];
  return aba
    .getRange(2, 1, ultima - 1, CABECALHO.length)
    .getValues()
    .filter(function (l) {
      return String(l[COL.ID]).trim() !== '' && String(l[COL.NOME]).trim() !== '';
    });
}

function limparLinhas(aba) {
  const ultima = aba.getLastRow();
  if (ultima > 1) aba.deleteRows(2, ultima - 1);
}

function buscarIndice(linhas, id) {
  for (let i = 0; i < linhas.length; i++) if (String(linhas[i][COL.ID]) === id) return i;
  return -1;
}

function paraCliente(linha, indice, completo) {
  const cliente = {
    id: String(linha[COL.ID]),
    position: indice + 1,
    name: String(linha[COL.NOME]),
    status: String(linha[COL.STATUS]).toLowerCase() === STATUS_ATENDIDO ? 'served' : 'waiting',
  };
  if (completo) {
    cliente.source = linha[COL.ORIGEM] === 'barbeiro' ? 'admin' : 'public';
    cliente.createdAt = paraISO(linha[COL.CRIADO]);
    cliente.servedAt = paraISO(linha[COL.ATENDIDO]);
  }
  return cliente;
}

/**
 * Horários são gravados como texto no fuso de Brasília ("2026-11-16 23:28:11"),
 * o que evita diferenças de fuso entre o projeto e a planilha e fica legível.
 */
function agoraTexto() {
  return Utilities.formatDate(new Date(), FUSO_HORARIO, 'yyyy-MM-dd HH:mm:ss');
}

/** Garante que as colunas de horário não sejam convertidas automaticamente em data. */
function colunasDeDataComoTexto(aba) {
  aba.getRange(1, COL.CRIADO + 1, aba.getMaxRows(), 2).setNumberFormat('@');
}

/** Converte o horário salvo para ISO (o Brasil não tem horário de verão desde 2019: UTC-3). */
function paraISO(valor) {
  if (valor instanceof Date && !isNaN(valor.getTime())) return valor.toISOString();
  const texto = String(valor || '').trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(texto)) {
    const data = new Date(texto.replace(' ', 'T') + '-03:00');
    if (!isNaN(data.getTime())) return data.toISOString();
  }
  return null;
}

/* ------------------------------ Segurança ------------------------------ */

function autenticar(senha) {
  const cache = CacheService.getScriptCache();
  const tentativas = Number(cache.get('falhas_senha') || 0);
  if (tentativas >= MAX_TENTATIVAS_SENHA) {
    return erro('BLOQUEADO', 'Muitas tentativas de senha. Aguarde alguns minutos.');
  }
  if (typeof senha !== 'string' || senha !== SENHA_ADMIN) {
    cache.put('falhas_senha', String(tentativas + 1), BLOQUEIO_SEGUNDOS);
    return erro('SENHA_INVALIDA', 'Senha incorreta.');
  }
  return null;
}

/** Executa uma função com trava, evitando que dois cadastros simultâneos se atropelem. */
function comTrava(fn) {
  const trava = LockService.getScriptLock();
  if (!trava.tryLock(15000)) return erro('OCUPADO', 'Muitos acessos ao mesmo tempo. Tente de novo.');
  try {
    return fn();
  } finally {
    trava.releaseLock();
  }
}

/* --------------------------- Validação de nome --------------------------- */

const PALAVRAS_MINUSCULAS = ['da', 'de', 'do', 'das', 'dos', 'e'];

function validarNome(bruto, exigirSobrenome) {
  const nome = String(bruto || '').trim().replace(/\s+/g, ' ');
  if (!nome) return erro('NOME_VAZIO', 'Digite o nome completo.');
  if (nome.length > TAMANHO_MAX_NOME) {
    return erro('NOME_LONGO', 'O nome pode ter no máximo ' + TAMANHO_MAX_NOME + ' caracteres.');
  }
  if (!/^[\p{L}][\p{L}' .-]*$/u.test(nome) || nome.replace(/[^\p{L}]/gu, '').length < 2) {
    return erro('NOME_INVALIDO', 'Use apenas letras no nome, sem números ou símbolos.');
  }
  if (exigirSobrenome) {
    const partes = nome.split(' ').filter(function (p) {
      return p.replace(/[^\p{L}]/gu, '').length >= 2;
    });
    if (partes.length < 2) return erro('NOME_INCOMPLETO', 'Informe nome e sobrenome para facilitar a chamada.');
  }
  return { ok: true, name: formatarNome(nome) };
}

function formatarNome(nome) {
  return nome
    .split(' ')
    .map(function (palavra, i) {
      const minuscula = palavra.toLowerCase();
      if (i > 0 && PALAVRAS_MINUSCULAS.indexOf(minuscula) !== -1) return minuscula;
      return minuscula.charAt(0).toUpperCase() + minuscula.slice(1);
    })
    .join(' ');
}

function chaveNome(nome) {
  return String(nome).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}

/* ------------------------------ Respostas ------------------------------ */

function ok(dados) {
  return Object.assign({ ok: true }, dados);
}

function erro(codigo, mensagem) {
  return { ok: false, error: codigo, message: mensagem };
}

function responder(objeto) {
  return ContentService.createTextOutput(JSON.stringify(objeto)).setMimeType(ContentService.MimeType.JSON);
}

/* ------------------------ Configuração inicial ------------------------ */

/**
 * Rode esta função UMA VEZ pelo editor (botão "Executar") antes de implantar.
 * Ela cria a aba "Fila" e pede as autorizações do Google.
 */
function configurarPlanilha() {
  const aba = obterAba();
  prepararDia();
  console.log('Tudo certo! Aba "' + aba.getName() + '" pronta. Lista de hoje: ' + hoje());
}
