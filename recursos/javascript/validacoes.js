const somenteNumeros = (valor) => String(valor || '').replace(/\D/g, '');

const limparDocumento = (valor) => String(valor || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

function formatarCnpj(valor) {
  const cnpj = limparDocumento(valor).slice(0, 14);
  if (cnpj.length <= 2) return cnpj;
  if (cnpj.length <= 5) return `${cnpj.slice(0, 2)}.${cnpj.slice(2)}`;
  if (cnpj.length <= 8) return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5)}`;
  if (cnpj.length <= 12) {
    return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8)}`;
  }
  return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`;
}

function validarCnpj(valor) {
  const cnpj = limparDocumento(valor);
  if (!/^[A-Z0-9]{12}\d{2}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false;

  // O cálculo segue a regra do CNPJ numérico e alfanumérico.
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
