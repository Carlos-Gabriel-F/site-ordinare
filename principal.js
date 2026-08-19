const modalContato = document.querySelector('#modal-contato');
const formulario = document.querySelector('#formulario-contato');
const menuMobile = document.querySelector('#menu-mobile');
const botaoMenuMobile = document.querySelector('.botao-menu-mobile');
const avisoEndereco = document.querySelector('#aviso-endereco');
const camposEndereco = [...formulario.querySelectorAll('[data-endereco]')];
const contadorDescricao = document.querySelector('#contador-descricao');
let numeroConsultaCep = 0;
const categoriasValidas = [...document.querySelector('#categoria').options]
  .map((opcao) => opcao.value)
  .filter(Boolean);

const somenteNumeros = (valor) => String(valor || '').replace(/\D/g, '');
const limparDocumento = (valor) => String(valor || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

function formatarCpf(valor) {
  return somenteNumeros(valor)
    .slice(0, 11)
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

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

function formatarCnpj(valor) {
  const cnpj = limparDocumento(valor).slice(0, 14);
  if (cnpj.length <= 2) return cnpj;
  if (cnpj.length <= 5) return `${cnpj.slice(0, 2)}.${cnpj.slice(2)}`;
  if (cnpj.length <= 8) return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5)}`;
  if (cnpj.length <= 12) return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8)}`;
  return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`;
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

function formatarTelefone(valor) {
  const numero = somenteNumeros(valor).replace(/^55(?=\d{10,11}$)/, '').slice(0, 11);
  if (numero.length <= 2) return numero ? `(${numero}` : '';
  if (numero.length <= 6) return `(${numero.slice(0, 2)}) ${numero.slice(2)}`;
  if (numero.length <= 10) return `(${numero.slice(0, 2)}) ${numero.slice(2, 6)}-${numero.slice(6)}`;
  return `(${numero.slice(0, 2)}) ${numero.slice(2, 7)}-${numero.slice(7)}`;
}

function normalizarTelefone(valor) {
  const numero = somenteNumeros(valor).replace(/^55(?=\d{10,11}$)/, '');
  const dddValido = /^[1-9]\d/.test(numero);
  const celularValido = numero.length === 11 && numero[2] === '9';
  const fixoValido = numero.length === 10 && /^[2-5]/.test(numero[2]);
  return dddValido && (celularValido || fixoValido) ? `+55${numero}` : '';
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
  informarErro('documento');
  informarErro('dataNascimento');
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
    },
  };
}

async function enviarFormulario(evento) {
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

  const botao = formulario.querySelector('[type="submit"]');
  const conteudoOriginalBotao = botao.innerHTML;
  botao.disabled = true;
  botao.textContent = 'Enviando…';

  try {
    // O navegador chama somente nossa API; a credencial do WhatsApp nunca fica no site.
    const resposta = await fetch('/api/contato', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });
    const retorno = await resposta.json();
    if (!resposta.ok) throw Object.assign(new Error(retorno.mensagem), { erros: retorno.erros });
    formulario.reset();
    atualizarTipoPessoa();
    prepararEnderecoAutomatico();
    contadorDescricao.textContent = '0/500';
    alterarEstadoFormulario('Solicitação enviada. Um contador entrará em contato.', 'sucesso');
  } catch (erro) {
    Object.entries(erro.erros || {}).forEach(([campo, mensagem]) => informarErro(campo, mensagem));
    alterarEstadoFormulario(erro.message || 'Não foi possível enviar agora. Tente novamente.', 'erro');
  } finally {
    botao.disabled = false;
    botao.innerHTML = conteudoOriginalBotao;
  }
}

function abrirModal(categoria = '') {
  if (categoriasValidas.includes(categoria)) formulario.elements.categoria.value = categoria;
  modalContato.showModal();
  document.body.classList.add('modal-aberto');
  formulario.elements.nome.focus();
}

function fecharModal() {
  modalContato.close();
  document.body.classList.remove('modal-aberto');
}

document.querySelectorAll('[data-abrir-contato]').forEach((botao) => botao.addEventListener('click', () => abrirModal()));
document.querySelectorAll('[data-categoria]').forEach((botao) => botao.addEventListener('click', () => abrirModal(botao.dataset.categoria)));
document.querySelector('#fechar-modal').addEventListener('click', fecharModal);
modalContato.addEventListener('click', (evento) => {
  if (evento.target === modalContato) fecharModal();
});
modalContato.addEventListener('close', () => document.body.classList.remove('modal-aberto'));
formulario.addEventListener('submit', enviarFormulario);
formulario.elements.documento.addEventListener('input', (evento) => {
  evento.target.value = formulario.elements.tipoPessoa.value === 'PJ' ? formatarCnpj(evento.target.value) : formatarCpf(evento.target.value);
});
formulario.elements.telefone.addEventListener('input', (evento) => (evento.target.value = formatarTelefone(evento.target.value)));
formulario.elements.cep.addEventListener('input', consultarCep);
formulario.elements.descricao.addEventListener('input', (evento) => {
  contadorDescricao.textContent = `${evento.target.value.length}/500`;
});
camposEndereco.forEach((campo) => {
  campo.addEventListener('input', () => {
    if (campo === formulario.elements.estado) campo.value = campo.value.toUpperCase().replace(/[^A-Z]/g, '');
    if (campo.value.trim()) informarErro(campo.name);
  });
});
formulario.querySelectorAll('[name="tipoPessoa"]').forEach((campo) => campo.addEventListener('change', atualizarTipoPessoa));

document.querySelectorAll('.botao-menu').forEach((botao) => {
  botao.addEventListener('click', () => {
    const item = botao.closest('.item-menu');
    document.querySelectorAll('.item-menu').forEach((outro) => outro !== item && outro.classList.remove('aberto'));
    item.classList.toggle('aberto');
    botao.setAttribute('aria-expanded', String(item.classList.contains('aberto')));
  });
});

document.addEventListener('click', (evento) => {
  if (evento.target.closest('.item-menu')) return;
  document.querySelectorAll('.item-menu').forEach((item) => item.classList.remove('aberto'));
  document.querySelectorAll('.botao-menu').forEach((botao) => botao.setAttribute('aria-expanded', 'false'));
});

botaoMenuMobile.addEventListener('click', () => {
  const abrir = !menuMobile.classList.contains('aberto');
  menuMobile.classList.toggle('aberto', abrir);
  document.body.classList.toggle('menu-aberto', abrir);
  botaoMenuMobile.setAttribute('aria-expanded', String(abrir));
  botaoMenuMobile.setAttribute('aria-label', abrir ? 'Fechar menu' : 'Abrir menu');
});

document.querySelectorAll('a[href^="#"]').forEach((link) => link.addEventListener('click', () => {
  menuMobile.classList.remove('aberto');
  document.body.classList.remove('menu-aberto');
  botaoMenuMobile.setAttribute('aria-expanded', 'false');
}));

document.addEventListener('keydown', (evento) => {
  if (evento.key === 'Escape') {
    document.querySelectorAll('.item-menu').forEach((item) => item.classList.remove('aberto'));
    document.querySelectorAll('.botao-menu').forEach((botao) => botao.setAttribute('aria-expanded', 'false'));
    menuMobile.classList.remove('aberto');
    document.body.classList.remove('menu-aberto');
    botaoMenuMobile.setAttribute('aria-expanded', 'false');
  }
});

window.addEventListener('scroll', () => document.querySelector('#cabecalho').classList.toggle('com-sombra', window.scrollY > 12), { passive: true });
document.querySelector('#ano-atual').textContent = new Date().getFullYear();
formulario.elements.dataNascimento.max = new Date().toISOString().slice(0, 10);
prepararEnderecoAutomatico();
atualizarTipoPessoa();
