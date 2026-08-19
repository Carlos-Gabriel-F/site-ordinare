// Desabilittado temporáriamente por outra abordagem.
/*
const { createHmac, randomBytes, randomUUID } = require('node:crypto');

class ErroLimiteEnvios extends Error {
  constructor(mensagem, tentarNovamenteEm) {
    super(mensagem);
    this.name = 'ErroLimiteEnvios';
    this.tentarNovamenteEm = Math.max(1, Math.ceil(tentarNovamenteEm));
  }
}

class ServicoLimiteEnvios {
  constructor(configuracao = {}) {
    this.segredoHash = configuracao.segredoHash || randomBytes(32).toString('hex');
    this.obterAgora = configuracao.obterAgora || (() => Date.now());
    this.janelas = new Map();
    this.duplicados = new Map();
    this.proximaLimpeza = 0;
  }

  GerarHash(valor) {
    return createHmac('sha256', this.segredoHash).update(String(valor)).digest('hex');
  }

  ObterIp(requisicao) {
    return String(requisicao.headers['x-forwarded-for'] || requisicao.socket?.remoteAddress || 'local')
      .split(',')[0]
      .trim();
  }

  ConsultarJanela(chave, duracao) {
    const limiteInferior = this.obterAgora() - duracao;
    const registros = (this.janelas.get(chave) || []).filter(({ momento }) => momento > limiteInferior);
    registros.length ? this.janelas.set(chave, registros) : this.janelas.delete(chave);
    return registros;
  }

  CalcularEspera(registros, duracao) {
    return Math.max(1000, duracao - (this.obterAgora() - registros[0].momento));
  }

  LimparMemoriaExpirada() {
    const agora = this.obterAgora();
    if (agora < this.proximaLimpeza) return;

    const limiteInferior = agora - 30 * 60 * 1000;
    this.janelas.forEach((registros, chave) => {
      const atuais = registros.filter(({ momento }) => momento > limiteInferior);
      atuais.length ? this.janelas.set(chave, atuais) : this.janelas.delete(chave);
    });
    this.duplicados.forEach(({ expiraEm }, chave) => {
      if (expiraEm <= agora) this.duplicados.delete(chave);
    });
    this.proximaLimpeza = agora + 60 * 1000;
  }

  ValidarIp(requisicao) {
    this.LimparMemoriaExpirada();
    const duracao = 10 * 60 * 1000;
    const chave = `ip:${this.GerarHash(this.ObterIp(requisicao))}`;
    const registros = this.ConsultarJanela(chave, duracao);

    if (registros.length >= 20) {
      throw new ErroLimiteEnvios(
        'Muitas tentativas em pouco tempo.',
        this.CalcularEspera(registros, duracao) / 1000,
      );
    }

    registros.push({ momento: this.obterAgora(), membro: randomUUID() });
    this.janelas.set(chave, registros);
  }

  ReservarEnvio(dados) {
    const duracaoCurta = 2 * 60 * 1000;
    const duracaoLonga = 30 * 60 * 1000;
    const duracaoDuplicada = 10 * 60 * 1000;
    const contato = this.GerarHash(`${dados.documento}|${dados.telefone}`);
    const conteudo = this.GerarHash(JSON.stringify([
      dados.tipoPessoa,
      dados.nome,
      dados.documento,
      dados.dataNascimento,
      dados.telefone,
      dados.cep,
      dados.rua,
      dados.cidade,
      dados.estado,
      dados.categoria,
      dados.regimeTributario,
      dados.descricao,
    ]));
    const chaves = {
      curta: `contato:2m:${contato}`,
      longa: `contato:30m:${contato}`,
      duplicada: `duplicada:${conteudo}`,
    };
    const agora = this.obterAgora();
    const duplicada = this.duplicados.get(chaves.duplicada);

    if (duplicada?.expiraEm > agora) {
      this.LancarErroContato(3, duplicada.expiraEm - agora);
    }
    if (duplicada) this.duplicados.delete(chaves.duplicada);

    const registrosCurtos = this.ConsultarJanela(chaves.curta, duracaoCurta);
    if (registrosCurtos.length >= 1) {
      this.LancarErroContato(1, this.CalcularEspera(registrosCurtos, duracaoCurta));
    }

    const registrosLongos = this.ConsultarJanela(chaves.longa, duracaoLonga);
    if (registrosLongos.length >= 3) {
      this.LancarErroContato(2, this.CalcularEspera(registrosLongos, duracaoLonga));
    }

    const membro = randomUUID();
    const registro = { momento: agora, membro };
    registrosCurtos.push(registro);
    registrosLongos.push(registro);
    this.janelas.set(chaves.curta, registrosCurtos);
    this.janelas.set(chaves.longa, registrosLongos);
    this.duplicados.set(chaves.duplicada, { expiraEm: agora + duracaoDuplicada, membro });
    return { chaves, membro };
  }

  LancarErroContato(motivo, esperaMilissegundos) {
    const mensagens = {
      1: 'Aguarde antes de enviar uma nova solicitação.',
      2: 'Limite de solicitações atingido. Tente novamente mais tarde.',
      3: 'Esta solicitação já foi encaminhada recentemente.',
    };
    throw new ErroLimiteEnvios(mensagens[motivo] || mensagens[2], esperaMilissegundos / 1000);
  }

  CancelarReserva(reserva) {
    if (!reserva) return;

    [reserva.chaves.curta, reserva.chaves.longa].forEach((chave) => {
      const registros = (this.janelas.get(chave) || []).filter(({ membro }) => membro !== reserva.membro);
      registros.length ? this.janelas.set(chave, registros) : this.janelas.delete(chave);
    });

    if (this.duplicados.get(reserva.chaves.duplicada)?.membro === reserva.membro) {
      this.duplicados.delete(reserva.chaves.duplicada);
    }
  }
}

module.exports = {
  ErroLimiteEnvios,
  ServicoLimiteEnvios,
  servicoLimiteEnvios: new ServicoLimiteEnvios(),
};
*/
