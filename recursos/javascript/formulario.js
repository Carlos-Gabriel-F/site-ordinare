const modalContato = document.querySelector('#modal-contato');
const formulario = document.querySelector('#formulario-contato');
const avisoEndereco = document.querySelector('#aviso-endereco');
const camposEndereco = [...formulario.querySelectorAll('[data-endereco]')];
const contadorDescricao = document.querySelector('#contador-descricao');
const botaoEnviar = formulario.querySelector('[type="submit"]');
const avisoPendencias = document.querySelector('#pendencias-formulario');
const numeroWhatsappEmpresa = '5511932161365';
const chaveUltimaAberturaWhatsapp = 'ordinareUltimaAberturaWhatsapp';
const intervaloAberturaWhatsapp = 60 * 1000;
const camposInteragidos = new Set();
let formularioInteragido = false;
let numeroConsultaCep = 0;
const categoriasValidas = [...document.querySelector('#categoria').options]
  .map((opcao) => opcao.value)
  .filter(Boolean);

function informarErro(campo, mensagem = '') {
  const elemento = formulario.elements[campo];
  const aviso = formulario.querySelector(`[data-erro="${campo}"]`);
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

function atualizarTipoPessoa() {
  const pessoaJuridica = formulario.elements.tipoPessoa.value === 'PJ';
  const campoNascimento = document.querySelector('#campo-nascimento');
  const documento = formulario.elements.documento;

  document.querySelector('#rotulo-documento').textContent = pessoaJuridica ? 'CNPJ' : 'CPF';
  campoNascimento.hidden = pessoaJuridica;
  formulario.elements.dataNascimento.required = !pessoaJuridica;
  documento.inputMode = pessoaJuridica ? 'text' : 'numeric';
  documento.value = '';
  if (pessoaJuridica) formulario.elements.dataNascimento.value = '';
  camposInteragidos.delete('documento');
  camposInteragidos.delete('dataNascimento');
  informarErro('documento');
  informarErro('dataNascimento');
  atualizarEstadoBotaoEnviar();
}

function prepararEnderecoAutomatico() {
  avisoEndereco.hidden = true;
  camposEndereco.forEach((campo) => {
    campo.readOnly = true;
    campo.removeAttribute('aria-invalid');
  });
}

function permitirEnderecoManual(mensagem) {
  avisoEndereco.textContent = mensagem;
  avisoEndereco.hidden = false;
  camposEndereco.forEach((campo) => {
    campo.readOnly = false;
    if (!campo.value.trim()) campo.setAttribute('aria-invalid', 'true');
  });
  camposEndereco.find((campo) => !campo.value.trim())?.focus();
}

function limparFormulario(focarPrimeiroCampo = false) {
  numeroConsultaCep += 1;
  formularioInteragido = false;
  camposInteragidos.clear();
  formulario.reset();
  formulario.querySelectorAll('[data-erro]').forEach((aviso) => (aviso.textContent = ''));
  formulario.querySelectorAll('[aria-invalid="true"]').forEach((campo) => campo.removeAttribute('aria-invalid'));
  formulario.querySelector('[data-aviso-cep]').textContent = 'Informe o CEP para localizar o endereço.';
  contadorDescricao.textContent = '0/500';
  avisoPendencias.textContent = '';
  avisoPendencias.className = 'pendencias-formulario campo-inteiro';
  alterarEstadoFormulario();
  prepararEnderecoAutomatico();
  atualizarTipoPessoa();
  atualizarEstadoBotaoEnviar();
  if (focarPrimeiroCampo) formulario.elements.nome.focus();
}

async function consultarCep() {
  const cep = somenteNumeros(formulario.elements.cep.value).slice(0, 8);
  const aviso = formulario.querySelector('[data-aviso-cep]');
  const consultaAtual = ++numeroConsultaCep;
  formulario.elements.cep.value = cep.replace(/^(\d{5})(\d)/, '$1-$2');
  camposEndereco.forEach((campo) => (campo.value = ''));
  prepararEnderecoAutomatico();
  informarErro('cep');

  if (cep.length !== 8) {
    aviso.textContent = 'Informe o CEP para localizar o endereço.';
    return;
  }

  aviso.textContent = 'Consultando CEP…';
  const controle = new AbortController();
  const limite = setTimeout(() => controle.abort(), 5000);

  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: controle.signal });
    const endereco = await resposta.json();
    if (!resposta.ok || endereco.erro) throw new Error('CEP não encontrado.');
    if (consultaAtual !== numeroConsultaCep) return;
    formulario.elements.rua.value = endereco.logradouro || '';
    formulario.elements.cidade.value = endereco.localidade;
    formulario.elements.estado.value = endereco.uf;
    aviso.textContent = 'Endereço localizado automaticamente.';
    if (camposEndereco.some((campo) => !campo.value.trim())) {
      permitirEnderecoManual('O endereço foi encontrado parcialmente. Complete os campos destacados.');
    }
  } catch (erro) {
    if (consultaAtual !== numeroConsultaCep) return;
    aviso.textContent = 'Preenchimento manual liberado.';
    permitirEnderecoManual(
      erro.name === 'AbortError'
        ? 'A consulta demorou demais. Preencha o endereço manualmente.'
        : 'Não foi possível encontrar o endereço. Preencha os campos abaixo.',
    );
  } finally {
    clearTimeout(limite);
    atualizarEstadoBotaoEnviar();
  }
}

function validarFormulario() {
  const pessoaJuridica = formulario.elements.tipoPessoa.value === 'PJ';
  const dados = new FormData(formulario);
  const telefone = normalizarTelefone(dados.get('telefone'));
  const erros = {};

  if (String(dados.get('nome')).trim().length < 3) erros.nome = 'Informe seu nome completo.';
  if (pessoaJuridica ? !validarCnpj(dados.get('documento')) : !validarCpf(dados.get('documento'))) {
    erros.documento = `Informe um ${pessoaJuridica ? 'CNPJ' : 'CPF'} válido.`;
  }
  if (!pessoaJuridica && !validarData(dados.get('dataNascimento'))) erros.dataNascimento = 'Informe uma data válida.';
  if (!telefone) erros.telefone = 'Informe um telefone brasileiro válido.';
  if (somenteNumeros(dados.get('cep')).length !== 8) erros.cep = 'Informe um CEP com oito dígitos.';
  if (String(dados.get('rua')).trim().length < 3) erros.rua = 'Informe a rua.';
  if (String(dados.get('cidade')).trim().length < 2) erros.cidade = 'Informe a cidade.';
  if (!/^[A-Za-z]{2}$/.test(String(dados.get('estado')).trim())) erros.estado = 'Informe a UF com duas letras.';
  if (!categoriasValidas.includes(dados.get('categoria'))) erros.categoria = 'Selecione uma categoria.';
  if (!dados.get('regimeTributario')) erros.regimeTributario = 'Selecione o regime tributário.';
  if (!String(dados.get('descricao')).trim()) erros.descricao = 'Descreva brevemente sua solicitação.';
  if (String(dados.get('descricao')).trim().length > 500) erros.descricao = 'Use no máximo 500 caracteres.';
  if (!dados.get('privacidadeAceita')) erros.privacidadeAceita = 'O aceite é obrigatório.';
  if (dados.get('siteEmpresa')) erros.siteEmpresa = 'Envio não permitido.';

  return {
    erros,
    dados: {
      tipoPessoa: dados.get('tipoPessoa'),
      nome: String(dados.get('nome')).trim().replace(/\s+/g, ' '),
      documento: pessoaJuridica ? limparDocumento(dados.get('documento')) : somenteNumeros(dados.get('documento')),
      dataNascimento: pessoaJuridica ? null : dados.get('dataNascimento'),
      telefone,
      cep: somenteNumeros(dados.get('cep')),
      rua: String(dados.get('rua')).trim(),
      cidade: String(dados.get('cidade')).trim(),
      estado: String(dados.get('estado')).trim().toUpperCase(),
      categoria: dados.get('categoria'),
      regimeTributario: dados.get('regimeTributario'),
      descricao: String(dados.get('descricao')).trim(),
      privacidadeAceita: true,
      siteEmpresa: String(dados.get('siteEmpresa') || ''),
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

function formatarDataMensagem(data) {
  if (!data) return 'Não se aplica';
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
}

function montarMensagemWhatsapp(dados) {
  const categoria = formulario.elements.categoria.selectedOptions[0].textContent.trim();
  const regimeTributario = formulario.elements.regimeTributario.selectedOptions[0].textContent.trim();
  const tipoPessoa = dados.tipoPessoa === 'PJ' ? 'Pessoa jurídica' : 'Pessoa física';
  const tipoDocumento = dados.tipoPessoa === 'PJ' ? 'CNPJ' : 'CPF';

  return [
    'Olá, equipe Ordinare!',
    '',
    'Gostaria de solicitar um atendimento contábil.',
    '',
    `*Nome:* ${dados.nome}`,
    `*Tipo de pessoa:* ${tipoPessoa}`,
    `*${tipoDocumento}:* ${formulario.elements.documento.value}`,
    `*Data de nascimento:* ${formatarDataMensagem(dados.dataNascimento)}`,
    `*Telefone:* ${formulario.elements.telefone.value}`,
    `*CEP:* ${formulario.elements.cep.value}`,
    `*Rua:* ${dados.rua}`,
    `*Cidade/Estado:* ${dados.cidade}/${dados.estado}`,
    `*Categoria:* ${categoria}`,
    `*Regime tributário:* ${regimeTributario}`,
    '',
    '*Descrição da solicitação:*',
    dados.descricao,
    '',
    '*Aviso de privacidade:* aceito.',
  ].join('\n');
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
  formulario.querySelectorAll('[aria-invalid="true"]').forEach((campo) => campo.removeAttribute('aria-invalid'));
  alterarEstadoFormulario();

  const { erros, dados } = validarFormulario();
  if (Object.keys(erros).length) {
    Object.entries(erros).forEach(([campo, mensagem]) => informarErro(campo, mensagem));
    alterarEstadoFormulario('Revise os campos destacados.', 'erro');
    formulario.querySelector('[aria-invalid="true"]')?.focus();
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

function abrirModal(categoria = '') {
  if (categoriasValidas.includes(categoria)) formulario.elements.categoria.value = categoria;
  atualizarEstadoBotaoEnviar();
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
  formulario.elements.documento.addEventListener('input', (evento) => {
    evento.target.value = formulario.elements.tipoPessoa.value === 'PJ'
      ? formatarCnpj(evento.target.value)
      : formatarCpf(evento.target.value);
  });
  formulario.elements.telefone.addEventListener('input', (evento) => {
    evento.target.value = formatarTelefone(evento.target.value);
  });
  formulario.elements.cep.addEventListener('input', consultarCep);
  formulario.elements.descricao.addEventListener('input', (evento) => {
    contadorDescricao.textContent = `${evento.target.value.length}/500`;
  });
  camposEndereco.forEach((campo) => {
    campo.addEventListener('input', () => {
      if (campo === formulario.elements.estado) {
        campo.value = campo.value.toUpperCase().replace(/[^A-Z]/g, '');
      }
      if (campo.value.trim()) informarErro(campo.name);
    });
  });
  formulario.querySelectorAll('[name="tipoPessoa"]').forEach((campo) => {
    campo.addEventListener('change', atualizarTipoPessoa);
  });
  window.addEventListener('pageshow', (evento) => {
    if (evento.persisted) limparFormulario();
  });

  formulario.elements.dataNascimento.max = new Date().toISOString().slice(0, 10);
  limparFormulario();
}
