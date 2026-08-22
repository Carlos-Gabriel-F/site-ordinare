const modalContato = document.querySelector('#modal-contato');
const formulario = document.querySelector('#formulario-contato');
const contadorMensagem = document.querySelector('#contador-mensagem');
const botaoEnviar = formulario.querySelector('[type=submit]');
const avisoPendencias = document.querySelector('#pendencias-formulario');
const numeroWhatsappEmpresa = somenteNumeros(document.body.dataset.telefoneOrdinare);
const chaveUltimaAberturaWhatsapp = 'ordinareUltimaAberturaWhatsapp';
const intervaloAberturaWhatsapp = 60 * 1000;
const camposInteragidos = new Set();
const tiposAtendimentoValidos = new Set(['pessoa-fisica', 'empresa-existente', 'abrir-empresa']);
const servicosValidos = [...formulario.elements.servicoDesejado.options]
  .map((opcao) => opcao.value)
  .filter(Boolean);
let formularioInteragido = false;

function informarErro(campo, mensagem = '') {
  const elemento = formulario.elements[campo];
  const aviso = formulario.querySelector(`[data-erro=${campo}]`);
  if (elemento?.setAttribute) {
    mensagem ? elemento.setAttribute('aria-invalid', 'true') : elemento.removeAttribute('aria-invalid');
  }
  if (aviso) aviso.textContent = mensagem;
}

function alterarEstadoFormulario(mensagem = '', tipo = '') {
  const estado = document.querySelector('#estado-formulario');
  estado.textContent = mensagem;
  estado.className = `estado-formulario ${tipo}`.trim();
}

function obterTipoAtendimento() {
  const tipoAtendimento = formulario.elements.tipoAtendimento.value;
  return tiposAtendimentoValidos.has(tipoAtendimento) ? tipoAtendimento : '';
}

function atualizarTipoAtendimento() {
  const tipoAtendimento = obterTipoAtendimento();
  document.querySelector('#rotulo-nome').textContent = tipoAtendimento === 'empresa-existente'
    ? 'Nome do responsável'
    : 'Nome';

  formulario.querySelectorAll('[data-grupo-atendimento]').forEach((grupo) => {
    const ativo = grupo.dataset.grupoAtendimento === tipoAtendimento;
    grupo.hidden = !ativo;
    grupo.querySelectorAll('input, select, textarea').forEach((campo) => {
      campo.disabled = !ativo;
      if (!ativo) informarErro(campo.name);
    });
  });

  formulario.elements.servicoDesejado.required = tipoAtendimento === 'pessoa-fisica';
  formulario.elements.empresa.required = tipoAtendimento === 'empresa-existente';
  formulario.elements.cidadeEstado.required = tipoAtendimento === 'abrir-empresa';
  formulario.elements.atividadeEmpresa.required = tipoAtendimento === 'abrir-empresa';
  atualizarEstadoBotaoEnviar();
}

function limparFormulario(focarPrimeiroCampo = false) {
  formularioInteragido = false;
  camposInteragidos.clear();
  formulario.reset();
  formulario.querySelectorAll('[data-erro]').forEach((aviso) => (aviso.textContent = ''));
  formulario.querySelectorAll('[aria-invalid=true]').forEach((campo) => campo.removeAttribute('aria-invalid'));
  contadorMensagem.textContent = '0/500';
  avisoPendencias.textContent = '';
  avisoPendencias.className = 'pendencias-formulario campo-inteiro';
  alterarEstadoFormulario();
  atualizarTipoAtendimento();
  if (focarPrimeiroCampo) formulario.elements.nome.focus();
}

function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function validarQuantidadeOpcional(valor, minimo, maximo) {
  if (!valor) return true;
  const quantidade = Number(valor);
  return /^\d+$/.test(valor) && quantidade >= minimo && quantidade <= maximo;
}

function validarCidadeEstado(valor) {
  return /^.{2,}\s*[-/]\s*[A-Za-z]{2}$/.test(valor);
}

function validarFormulario() {
  const dadosFormulario = new FormData(formulario);
  const tipoAtendimento = obterTipoAtendimento();
  const nome = String(dadosFormulario.get('nome') || '').trim().replace(/\s+/g, ' ');
  const email = String(dadosFormulario.get('email') || '').trim().toLowerCase();
  const telefone = normalizarTelefone(dadosFormulario.get('telefone'));
  const mensagem = String(dadosFormulario.get('mensagem') || '').trim();
  const empresa = String(dadosFormulario.get('empresa') || '').trim().replace(/\s+/g, ' ');
  const cnpjInformado = String(dadosFormulario.get('cnpj') || '').trim();
  const quantidadeFuncionarios = String(dadosFormulario.get('quantidadeFuncionarios') || '').trim();
  const cidadeEstado = String(dadosFormulario.get('cidadeEstado') || '').trim();
  const atividadeEmpresa = String(dadosFormulario.get('atividadeEmpresa') || '').trim();
  const quantidadeSocios = String(dadosFormulario.get('quantidadeSocios') || '').trim();
  const erros = {};

  if (!tipoAtendimento) erros.tipoAtendimento = 'Escolha como podemos ajudar.';
  if (nome.length < 3) erros.nome = tipoAtendimento === 'empresa-existente'
    ? 'Informe o nome do responsável.'
    : 'Informe seu nome.';
  if (email && !validarEmail(email)) erros.email = 'Informe um e-mail válido ou deixe o campo vazio.';
  if (!telefone) erros.telefone = 'Informe um telefone ou WhatsApp brasileiro válido.';

  if (tipoAtendimento === 'pessoa-fisica' && !servicosValidos.includes(dadosFormulario.get('servicoDesejado'))) {
    erros.servicoDesejado = 'Selecione o serviço desejado.';
  }

  if (tipoAtendimento === 'empresa-existente') {
    if (empresa.length < 2) erros.empresa = 'Informe o nome da empresa.';
    if (cnpjInformado && !validarCnpj(cnpjInformado)) {
      erros.cnpj = 'Informe um CNPJ válido ou deixe o campo vazio.';
    }
    if (!validarQuantidadeOpcional(quantidadeFuncionarios, 0, 99999)) {
      erros.quantidadeFuncionarios = 'Informe uma quantidade válida ou deixe o campo vazio.';
    }
  }

  if (tipoAtendimento === 'abrir-empresa') {
    if (!validarCidadeEstado(cidadeEstado)) erros.cidadeEstado = 'Informe a cidade e a UF, por exemplo: São Paulo/SP.';
    if (atividadeEmpresa.length < 3) erros.atividadeEmpresa = 'Informe a atividade da futura empresa.';
    if (!validarQuantidadeOpcional(quantidadeSocios, 1, 999)) {
      erros.quantidadeSocios = 'Informe ao menos um sócio ou deixe o campo vazio.';
    }
  }

  if (mensagem.length > 500) erros.mensagem = 'Use no máximo 500 caracteres.';
  if (!dadosFormulario.get('privacidadeAceita')) erros.privacidadeAceita = 'O aceite é obrigatório.';
  if (dadosFormulario.get('siteEmpresa')) erros.siteEmpresa = 'Envio não permitido.';

  return {
    erros,
    dados: {
      tipoAtendimento,
      nome,
      email,
      telefone,
      servicoDesejado: dadosFormulario.get('servicoDesejado') || '',
      empresa,
      cnpj: cnpjInformado ? limparDocumento(cnpjInformado) : '',
      quantidadeFuncionarios,
      cidadeEstado,
      atividadeEmpresa,
      quantidadeSocios,
      mensagem,
    },
  };
}

function atualizarEstadoBotaoEnviar() {
  const { erros } = validarFormulario();
  const pendencias = Object.entries(erros).filter(([campo]) => campo !== 'siteEmpresa');
  const mostrarPendenciasRestantes = formularioInteragido && pendencias.length <= 2;
  let quantidadeErrosVisiveis = 0;

  formulario.querySelectorAll('[data-erro]').forEach((aviso) => {
    const campo = aviso.dataset.erro;
    const mensagem = erros[campo] || '';
    const mostrarErro = Boolean(mensagem) && (camposInteragidos.has(campo) || mostrarPendenciasRestantes);
    informarErro(campo, mostrarErro ? mensagem : '');
    if (mostrarErro) quantidadeErrosVisiveis += 1;
  });

  botaoEnviar.disabled = Object.keys(erros).length > 0;
  if (!formularioInteragido) {
    avisoPendencias.textContent = '';
    avisoPendencias.className = 'pendencias-formulario campo-inteiro';
  } else if (!botaoEnviar.disabled) {
    avisoPendencias.textContent = 'Tudo certo. Você já pode continuar pelo WhatsApp.';
    avisoPendencias.className = 'pendencias-formulario campo-inteiro sucesso';
  } else if (quantidadeErrosVisiveis > 0) {
    avisoPendencias.textContent = 'Revise os campos destacados para continuar pelo WhatsApp.';
    avisoPendencias.className = 'pendencias-formulario campo-inteiro erro';
  } else {
    avisoPendencias.textContent = 'Preencha todos os campos obrigatórios para liberar o WhatsApp.';
    avisoPendencias.className = 'pendencias-formulario campo-inteiro';
  }
}

function registrarDigitacaoFormulario() {
  formularioInteragido = true;
  atualizarEstadoBotaoEnviar();
}

function registrarCampoInteragido(evento) {
  formularioInteragido = true;
  if (evento.target.name) camposInteragidos.add(evento.target.name);
  atualizarEstadoBotaoEnviar();
}

function obterTextoSelecionado(campo) {
  return campo.selectedOptions[0]?.textContent.trim() || 'Não informado';
}

function montarMensagemWhatsapp(dados) {
  const tiposAtendimento = {
    'pessoa-fisica': 'Sou Pessoa Física',
    'empresa-existente': 'Já tenho uma Empresa',
    'abrir-empresa': 'Quero Abrir uma Empresa',
  };
  const linhas = [
    'Olá, equipe Ordinare!',
    '',
    `*Como podemos ajudar:* ${tiposAtendimento[dados.tipoAtendimento]}`,
    `*${dados.tipoAtendimento === 'empresa-existente' ? 'Nome do responsável' : 'Nome'}:* ${dados.nome}`,
    `*E-mail:* ${dados.email || 'Não informado'}`,
    `*Telefone/WhatsApp:* ${formulario.elements.telefone.value}`,
  ];

  if (dados.tipoAtendimento === 'pessoa-fisica') {
    linhas.push(`*Serviço desejado:* ${obterTextoSelecionado(formulario.elements.servicoDesejado)}`);
  }

  if (dados.tipoAtendimento === 'empresa-existente') {
    linhas.push(
      `*Empresa:* ${dados.empresa}`,
      `*CNPJ:* ${formulario.elements.cnpj.value || 'Não informado'}`,
      `*Quantidade de funcionários:* ${dados.quantidadeFuncionarios || 'Não informada'}`,
    );
  }

  if (dados.tipoAtendimento === 'abrir-empresa') {
    linhas.push(
      `*Cidade/UF:* ${dados.cidadeEstado}`,
      `*Atividade da empresa:* ${dados.atividadeEmpresa}`,
      `*Quantidade de sócios:* ${dados.quantidadeSocios || 'Não informada'}`,
    );
  }

  linhas.push('', '*Mensagem:*', dados.mensagem || 'Não informada.', '', '*Aviso de privacidade:* aceito.');
  return linhas.join('\n');
}

function usarAplicativoWhatsapp() {
  const dispositivoAppleComToque = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return navigator.userAgentData?.mobile === true ||
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
    dispositivoAppleComToque;
}

function abrirWhatsapp(dados) {
  const mensagem = encodeURIComponent(montarMensagemWhatsapp(dados));
  const enderecoAplicativo = `https://wa.me/${numeroWhatsappEmpresa}?text=${mensagem}`;
  const enderecoWhatsappWeb = `https://web.whatsapp.com/send?phone=${numeroWhatsappEmpresa}&text=${mensagem}`;

  if (usarAplicativoWhatsapp()) {
    window.location.assign(enderecoAplicativo);
    return true;
  }

  const novaAba = window.open('', '_blank');
  if (!novaAba) return false;
  novaAba.opener = null;
  novaAba.location.href = enderecoWhatsappWeb;
  return true;
}

function obterEsperaWhatsapp() {
  try {
    const ultimaAbertura = Number(localStorage.getItem(chaveUltimaAberturaWhatsapp) || 0);
    return Math.max(0, intervaloAberturaWhatsapp - (Date.now() - ultimaAbertura));
  } catch {
    return 0;
  }
}

function registrarAberturaWhatsapp() {
  try {
    localStorage.setItem(chaveUltimaAberturaWhatsapp, String(Date.now()));
  } catch {
    return;
  }
}

// Desabilittado temporáriamente por outra abordagem.
/*
async function enviarFormularioViaApi(dados) {
  const resposta = await fetch('/api/contato', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  });
  const retorno = await resposta.json();
  if (!resposta.ok) {
    throw Object.assign(new Error(retorno.mensagem), { erros: retorno.erros });
  }
  return retorno;
}
*/

function enviarFormulario(evento) {
  evento.preventDefault();
  formulario.querySelectorAll('[data-erro]').forEach((aviso) => (aviso.textContent = ''));
  formulario.querySelectorAll('[aria-invalid=true]').forEach((campo) => campo.removeAttribute('aria-invalid'));
  alterarEstadoFormulario();

  const { erros, dados } = validarFormulario();
  if (Object.keys(erros).length) {
    Object.entries(erros).forEach(([campo, mensagem]) => informarErro(campo, mensagem));
    alterarEstadoFormulario('Revise os campos destacados.', 'erro');
    formulario.querySelector('[aria-invalid=true]')?.focus();
    return;
  }

  const esperaWhatsapp = obterEsperaWhatsapp();
  if (esperaWhatsapp > 0) {
    const segundos = Math.ceil(esperaWhatsapp / 1000);
    alterarEstadoFormulario(`Aguarde ${segundos} segundos antes de abrir uma nova conversa.`, 'erro');
    return;
  }

  if (!abrirWhatsapp(dados)) {
    alterarEstadoFormulario('O navegador bloqueou a nova aba. Permita pop-ups e tente novamente.', 'erro');
    return;
  }

  registrarAberturaWhatsapp();
  limparFormulario();
  fecharModal();
}

function abrirModal(servico = '') {
  if (servico === 'abertura') {
    formulario.elements.tipoAtendimento.value = 'abrir-empresa';
  } else if (servicosValidos.includes(servico)) {
    formulario.elements.tipoAtendimento.value = 'pessoa-fisica';
    formulario.elements.servicoDesejado.value = servico;
  }
  atualizarTipoAtendimento();
  modalContato.showModal();
  document.body.classList.add('modal-aberto');
  formulario.elements.nome.focus();
}

function fecharModal() {
  modalContato.close();
  document.body.classList.remove('modal-aberto');
}

function inicializarFormulario() {
  document.querySelectorAll('[data-abrir-contato]').forEach((botao) => {
    botao.addEventListener('click', () => abrirModal());
  });
  document.querySelectorAll('[data-categoria]').forEach((botao) => {
    botao.addEventListener('click', () => abrirModal(botao.dataset.categoria));
  });
  document.querySelector('#fechar-modal').addEventListener('click', fecharModal);
  modalContato.addEventListener('click', (evento) => {
    if (evento.target === modalContato) fecharModal();
  });
  modalContato.addEventListener('close', () => document.body.classList.remove('modal-aberto'));
  formulario.addEventListener('submit', enviarFormulario);
  formulario.addEventListener('input', registrarDigitacaoFormulario);
  formulario.addEventListener('change', registrarCampoInteragido);
  formulario.addEventListener('focusout', registrarCampoInteragido);
  document.querySelector('#limpar-formulario').addEventListener('click', () => limparFormulario(true));
  formulario.elements.telefone.addEventListener('input', (evento) => {
    evento.target.value = formatarTelefone(evento.target.value);
  });
  formulario.elements.cnpj.addEventListener('input', (evento) => {
    evento.target.value = formatarCnpj(evento.target.value);
  });
  formulario.elements.mensagem.addEventListener('input', (evento) => {
    contadorMensagem.textContent = `${evento.target.value.length}/500`;
  });
  formulario.querySelectorAll('[name=tipoAtendimento]').forEach((campo) => {
    campo.addEventListener('change', atualizarTipoAtendimento);
  });
  window.addEventListener('pageshow', (evento) => {
    if (evento.persisted) limparFormulario();
  });

  limparFormulario();
}
