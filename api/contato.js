const { randomUUID } = require('node:crypto');
const {
  ErroLimiteAntiFlood,
  ErroServicoAntiFlood,
  servicoAntiFlood,
} = require('./ServicoAntiFlood');

const categoriasPermitidas = new Set([
  'abertura',
  'consultoria-financeira',
  'contabilidade-mensal',
  'bpo-financeiro',
  'folha-pagamento',
  'consultoria-tributaria',
  'emissao-nf',
  'reducao-impostos',
  'mei',
  'simples-nacional',
  'lucro-presumido',
  'lucro-real',
]);
const regimesPermitidos = new Set(['mei', 'simples-nacional', 'lucro-presumido', 'lucro-real', 'nao-sei']);

const somenteNumeros = (valor) => String(valor || '').replace(/\D/g, '');
const limparDocumento = (valor) => String(valor || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

function validarCpf(valor) {
  const cpf = somenteNumeros(valor);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const calcularDigito = (quantidade) => {
    let soma = 0;
    for (let indice = 0; indice < quantidade; indice += 1) {
      soma += Number(cpf[indice]) * (quantidade + 1 - indice);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return calcularDigito(9) === Number(cpf[9]) && calcularDigito(10) === Number(cpf[10]);
}

function validarCnpj(valor) {
  const cnpj = limparDocumento(valor);
  if (!/^[A-Z0-9]{12}\d{2}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false;

  // O cálculo também atende ao novo CNPJ alfanumérico definido pela Receita Federal.
  const calcularDigito = (caracteres, pesos) => {
    const soma = [...caracteres].reduce(
      (total, caractere, indice) => total + (caractere.charCodeAt(0) - 48) * pesos[indice],
      0,
    );
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const base = cnpj.slice(0, 12);
  const primeiro = calcularDigito(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const segundo = calcularDigito(`${base}${primeiro}`, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return cnpj.endsWith(`${primeiro}${segundo}`);
}

function normalizarTelefone(valor) {
  const numero = somenteNumeros(valor).replace(/^55(?=\d{10,11}$)/, '');
  const dddValido = /^[1-9]\d/.test(numero);
  const formatoValido =
    (numero.length === 11 && numero[2] === '9') || (numero.length === 10 && /^[2-5]/.test(numero[2]));
  return dddValido && formatoValido ? `+55${numero}` : '';
}

function validarData(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const [ano, mes, dia] = valor.split('-').map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  const hoje = new Date();
  const limite = new Date(Date.UTC(hoje.getUTCFullYear() - 120, hoje.getUTCMonth(), hoje.getUTCDate()));
  return (
    data.getUTCFullYear() === ano &&
    data.getUTCMonth() === mes - 1 &&
    data.getUTCDate() === dia &&
    data <= hoje &&
    data >= limite
  );
}

function responder(resposta, codigo, conteudo) {
  resposta.statusCode = codigo;
  resposta.setHeader('Content-Type', 'application/json; charset=utf-8');
  resposta.setHeader('Cache-Control', 'no-store');
  resposta.end(JSON.stringify(conteudo));
}

function origemPermitida(requisicao) {
  const origem = requisicao.headers.origin;
  if (!origem) return true;
  try {
    return new URL(origem).host === requisicao.headers.host;
  } catch {
    return false;
  }
}

function validarDados(corpo) {
  const tipoPessoa = corpo.tipoPessoa === 'PJ' ? 'PJ' : corpo.tipoPessoa === 'PF' ? 'PF' : '';
  const nome = String(corpo.nome || '').trim().replace(/\s+/g, ' ').slice(0, 120);
  const documento = tipoPessoa === 'PJ' ? limparDocumento(corpo.documento) : somenteNumeros(corpo.documento);
  const telefone = normalizarTelefone(corpo.telefone);
  const cep = somenteNumeros(corpo.cep);
  const rua = String(corpo.rua || '').trim().slice(0, 150);
  const cidade = String(corpo.cidade || '').trim().slice(0, 100);
  const estado = String(corpo.estado || '').trim().toUpperCase();
  const descricao = String(corpo.descricao || '').trim();
  const erros = {};

  if (nome.length < 3) erros.nome = 'Informe seu nome completo.';
  if (!tipoPessoa) erros.tipoPessoa = 'Informe o tipo de pessoa.';
  if (tipoPessoa === 'PF' && !validarCpf(documento)) erros.documento = 'Informe um CPF válido.';
  if (tipoPessoa === 'PJ' && !validarCnpj(documento)) erros.documento = 'Informe um CNPJ válido.';
  if (tipoPessoa === 'PF' && !validarData(corpo.dataNascimento)) erros.dataNascimento = 'Informe uma data válida.';
  if (!telefone) erros.telefone = 'Informe um telefone brasileiro válido.';
  if (cep.length !== 8) erros.cep = 'Informe um CEP com oito dígitos.';
  if (rua.length < 3) erros.rua = 'Informe a rua.';
  if (cidade.length < 2) erros.cidade = 'Informe a cidade.';
  if (!/^[A-Z]{2}$/.test(estado)) erros.estado = 'Informe uma UF válida.';
  if (!categoriasPermitidas.has(corpo.categoria)) erros.categoria = 'Selecione uma categoria válida.';
  if (!regimesPermitidos.has(corpo.regimeTributario)) erros.regimeTributario = 'Selecione um regime válido.';
  if (!descricao) erros.descricao = 'Descreva brevemente sua solicitação.';
  if (descricao.length > 500) erros.descricao = 'Use no máximo 500 caracteres.';
  if (corpo.privacidadeAceita !== true) erros.privacidadeAceita = 'O aceite é obrigatório.';

  return {
    erros,
    dados: {
      tipoPessoa,
      nome,
      documento,
      dataNascimento: tipoPessoa === 'PF' ? corpo.dataNascimento : null,
      telefone,
      cep,
      rua,
      cidade,
      estado,
      categoria: corpo.categoria,
      regimeTributario: corpo.regimeTributario,
      descricao: descricao.slice(0, 500),
    },
  };
}

async function consultarEndereco(cep) {
  const controle = new AbortController();
  const limite = setTimeout(() => controle.abort(), 5000);

  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: controle.signal });
    const endereco = await resposta.json();
    if (!resposta.ok || endereco.erro) return null;
    return { rua: endereco.logradouro, cidade: endereco.localidade, estado: endereco.uf };
  } catch {
    return null;
  } finally {
    clearTimeout(limite);
  }
}

async function enviarParaWhatsapp(dados) {
  const versaoApi = process.env.WHATSAPP_VERSAO_API;
  const idTelefone = process.env.WHATSAPP_ID_TELEFONE;
  const tokenAcesso = process.env.WHATSAPP_TOKEN_ACESSO;
  const numeroDestino = process.env.WHATSAPP_NUMERO_DESTINO;
  const nomeModelo = process.env.WHATSAPP_NOME_MODELO;
  const idiomaModelo = process.env.WHATSAPP_IDIOMA_MODELO || 'pt_BR';

  if (![versaoApi, idTelefone, tokenAcesso, numeroDestino, nomeModelo].every(Boolean)) return false;

  // O modelo aprovado na Meta deve possuir doze parâmetros de texto, nesta mesma ordem.
  const valores = [
    dados.nome,
    dados.tipoPessoa,
    dados.documento,
    dados.dataNascimento || 'Não se aplica',
    dados.telefone,
    dados.cep,
    dados.rua,
    dados.cidade,
    dados.estado,
    dados.categoria,
    dados.regimeTributario,
    dados.descricao,
  ];
  const resposta = await fetch(`https://graph.facebook.com/${versaoApi}/${idTelefone}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenAcesso}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: numeroDestino,
      type: 'template',
      template: {
        name: nomeModelo,
        language: { code: idiomaModelo },
        components: [{ type: 'body', parameters: valores.map((text) => ({ type: 'text', text })) }],
      },
    }),
  });

  return resposta.ok;
}

module.exports = async function receberContato(requisicao, resposta) {
  if (requisicao.method !== 'POST') return responder(resposta, 405, { mensagem: 'Método não permitido.' });
  if (!origemPermitida(requisicao)) return responder(resposta, 403, { mensagem: 'Origem não permitida.' });

  const tamanho = Number(requisicao.headers['content-length'] || 0);
  if (tamanho > 16_384) return responder(resposta, 413, { mensagem: 'Conteúdo muito grande.' });

  try {
    await servicoAntiFlood.ValidarOrigem(requisicao);
    const corpo = typeof requisicao.body === 'string' ? JSON.parse(requisicao.body) : requisicao.body || {};
    const { erros, dados } = validarDados(corpo);
    if (Object.keys(erros).length) return responder(resposta, 422, { mensagem: 'Revise os dados enviados.', erros });

    // Quando disponível, o ViaCEP prevalece; campos ausentes continuam com o preenchimento manual.
    const endereco = await consultarEndereco(dados.cep);
    if (endereco) {
      dados.rua = endereco.rua || dados.rua;
      dados.cidade = endereco.cidade || dados.cidade;
      dados.estado = endereco.estado || dados.estado;
    }
    const configurado = [
      process.env.WHATSAPP_VERSAO_API,
      process.env.WHATSAPP_ID_TELEFONE,
      process.env.WHATSAPP_TOKEN_ACESSO,
      process.env.WHATSAPP_NUMERO_DESTINO,
      process.env.WHATSAPP_NOME_MODELO,
    ].every(Boolean);
    if (!configurado) return responder(resposta, 503, { mensagem: 'O atendimento ainda não está configurado.' });

    const reservaAntiFlood = await servicoAntiFlood.ReservarEnvio(dados);
    let enviado = false;
    try {
      enviado = await enviarParaWhatsapp(dados);
    } catch (erro) {
      await servicoAntiFlood.CancelarReserva(reservaAntiFlood);
      throw erro;
    }
    if (!enviado) {
      await servicoAntiFlood.CancelarReserva(reservaAntiFlood);
      return responder(resposta, 502, { mensagem: 'Não foi possível encaminhar agora. Tente novamente.' });
    }

    const idSolicitacao = randomUUID();
    console.info({ evento: 'contato_enviado', idSolicitacao });
    return responder(resposta, 202, { sucesso: true, idSolicitacao });
  } catch (erro) {
    if (erro instanceof ErroLimiteAntiFlood) {
      resposta.setHeader('Retry-After', String(erro.tentarNovamenteEm));
      return responder(resposta, 429, {
        mensagem: erro.message,
        tentarNovamenteEm: erro.tentarNovamenteEm,
      });
    }
    if (erro instanceof ErroServicoAntiFlood) {
      return responder(resposta, 503, { mensagem: 'A proteção de envio está temporariamente indisponível.' });
    }
    console.error({ evento: 'falha_contato', tipo: erro.name });
    return responder(resposta, 500, { mensagem: 'Não foi possível concluir o atendimento.' });
  }
};
