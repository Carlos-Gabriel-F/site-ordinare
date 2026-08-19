const { createHmac, randomUUID } = require('node:crypto');

const scriptLimiteIp = `
local chave = KEYS[1]
local agora = tonumber(ARGV[1])
local janela = tonumber(ARGV[2])
local limite = tonumber(ARGV[3])
local membro = ARGV[4]
redis.call('ZREMRANGEBYSCORE', chave, 0, agora - janela)
local quantidade = redis.call('ZCARD', chave)
if quantidade >= limite then
  local primeiro = redis.call('ZRANGE', chave, 0, 0, 'WITHSCORES')
  local espera = janela
  if #primeiro >= 2 then espera = math.max(1000, janela - (agora - tonumber(primeiro[2]))) end
  return {0, espera}
end
redis.call('ZADD', chave, agora, membro)
redis.call('PEXPIRE', chave, janela)
return {1, 0}
`;

const scriptReservaContato = `
local curta = KEYS[1]
local longa = KEYS[2]
local duplicada = KEYS[3]
local agora = tonumber(ARGV[1])
local janelaCurta = tonumber(ARGV[2])
local janelaLonga = tonumber(ARGV[3])
local janelaDuplicada = tonumber(ARGV[4])
local membro = ARGV[5]
redis.call('ZREMRANGEBYSCORE', curta, 0, agora - janelaCurta)
redis.call('ZREMRANGEBYSCORE', longa, 0, agora - janelaLonga)
if redis.call('EXISTS', duplicada) == 1 then return {0, redis.call('PTTL', duplicada), 3} end
if redis.call('ZCARD', curta) >= 1 then
  local primeiro = redis.call('ZRANGE', curta, 0, 0, 'WITHSCORES')
  return {0, math.max(1000, janelaCurta - (agora - tonumber(primeiro[2]))), 1}
end
if redis.call('ZCARD', longa) >= 3 then
  local primeiro = redis.call('ZRANGE', longa, 0, 0, 'WITHSCORES')
  return {0, math.max(1000, janelaLonga - (agora - tonumber(primeiro[2]))), 2}
end
redis.call('ZADD', curta, agora, membro)
redis.call('PEXPIRE', curta, janelaCurta)
redis.call('ZADD', longa, agora, membro)
redis.call('PEXPIRE', longa, janelaLonga)
redis.call('SET', duplicada, membro, 'PX', janelaDuplicada)
return {1, 0, 0}
`;

const scriptCancelarReserva = `
redis.call('ZREM', KEYS[1], ARGV[1])
redis.call('ZREM', KEYS[2], ARGV[1])
if redis.call('GET', KEYS[3]) == ARGV[1] then redis.call('DEL', KEYS[3]) end
return 1
`;

class ErroLimiteAntiFlood extends Error {
  constructor(mensagem, tentarNovamenteEm) {
    super(mensagem);
    this.name = 'ErroLimiteAntiFlood';
    this.tentarNovamenteEm = Math.max(1, Math.ceil(tentarNovamenteEm));
  }
}

class ErroServicoAntiFlood extends Error {
  constructor() {
    super('A proteção contra excesso de envios está indisponível.');
    this.name = 'ErroServicoAntiFlood';
  }
}

class ServicoAntiFlood {
  constructor(configuracao = {}) {
    this.urlRedis = configuracao.urlRedis ?? process.env.LIMITE_REDIS_URL ?? '';
    this.tokenRedis = configuracao.tokenRedis ?? process.env.LIMITE_REDIS_TOKEN ?? '';
    this.segredoHash = configuracao.segredoHash ?? process.env.LIMITE_SEGREDO_HASH ?? 'ordinare-local';
    this.exigirRedis = configuracao.exigirRedis ?? process.env.NODE_ENV === 'production';
    this.obterAgora = configuracao.obterAgora ?? (() => Date.now());
    this.janelasMemoria = new Map();
    this.duplicadosMemoria = new Map();

    const informouRedis = Boolean(this.urlRedis || this.tokenRedis);
    const segredoSeguro = this.segredoHash.length >= 32;
    this.usarRedis = Boolean(this.urlRedis && this.tokenRedis && segredoSeguro);
    this.configuracaoInvalida = (informouRedis && !this.usarRedis) || (this.exigirRedis && !this.usarRedis);
  }

  GerarHash(valor) {
    return createHmac('sha256', this.segredoHash).update(String(valor)).digest('hex');
  }

  ObterIp(requisicao) {
    return String(requisicao.headers['x-forwarded-for'] || requisicao.socket?.remoteAddress || 'local')
      .split(',')[0]
      .trim();
  }

  async ExecutarRedis(script, chaves, argumentos) {
    if (this.configuracaoInvalida) throw new ErroServicoAntiFlood();

    const controle = new AbortController();
    const limiteTempo = setTimeout(() => controle.abort(), 2500);

    try {
      const resposta = await fetch(this.urlRedis.replace(/\/$/, ''), {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.tokenRedis}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(['EVAL', script, chaves.length, ...chaves, ...argumentos]),
        signal: controle.signal,
      });
      const retorno = await resposta.json();
      if (!resposta.ok || retorno.error) throw new Error('Falha no armazenamento de limites.');
      return retorno.result;
    } catch {
      throw new ErroServicoAntiFlood();
    } finally {
      clearTimeout(limiteTempo);
    }
  }

  ConsultarJanelaMemoria(chave, janela) {
    const limiteInferior = this.obterAgora() - janela;
    const registros = (this.janelasMemoria.get(chave) || []).filter(({ momento }) => momento > limiteInferior);
    registros.length ? this.janelasMemoria.set(chave, registros) : this.janelasMemoria.delete(chave);
    return registros;
  }

  CalcularEspera(registros, janela) {
    return Math.max(1000, janela - (this.obterAgora() - registros[0].momento));
  }

  async ValidarOrigem(requisicao) {
    if (this.configuracaoInvalida) throw new ErroServicoAntiFlood();

    const janela = 10 * 60 * 1000;
    const chave = `ordinare:ip:${this.GerarHash(this.ObterIp(requisicao))}`;
    const membro = randomUUID();

    if (this.usarRedis) {
      const [permitido, espera] = await this.ExecutarRedis(scriptLimiteIp, [chave], [this.obterAgora(), janela, 5, membro]);
      if (!Number(permitido)) throw new ErroLimiteAntiFlood('Muitas tentativas em pouco tempo.', Number(espera) / 1000);
      return;
    }

    const registros = this.ConsultarJanelaMemoria(chave, janela);
    if (registros.length >= 5) throw new ErroLimiteAntiFlood('Muitas tentativas em pouco tempo.', this.CalcularEspera(registros, janela) / 1000);
    registros.push({ momento: this.obterAgora(), membro });
    this.janelasMemoria.set(chave, registros);
  }

  async ReservarEnvio(dados) {
    if (this.configuracaoInvalida) throw new ErroServicoAntiFlood();

    const janelaCurta = 2 * 60 * 1000;
    const janelaLonga = 30 * 60 * 1000;
    const janelaDuplicada = 10 * 60 * 1000;
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
      curta: `ordinare:contato:2m:${contato}`,
      longa: `ordinare:contato:30m:${contato}`,
      duplicada: `ordinare:duplicada:${conteudo}`,
    };
    const membro = randomUUID();

    if (this.usarRedis) {
      const [permitido, espera, motivo] = await this.ExecutarRedis(
        scriptReservaContato,
        [chaves.curta, chaves.longa, chaves.duplicada],
        [this.obterAgora(), janelaCurta, janelaLonga, janelaDuplicada, membro],
      );
      if (!Number(permitido)) this.LancarErroContato(Number(motivo), Number(espera));
      return { modo: 'redis', chaves, membro };
    }

    const agora = this.obterAgora();
    const duplicadaAte = this.duplicadosMemoria.get(chaves.duplicada) || 0;
    if (duplicadaAte > agora) this.LancarErroContato(3, duplicadaAte - agora);

    const registrosCurtos = this.ConsultarJanelaMemoria(chaves.curta, janelaCurta);
    if (registrosCurtos.length >= 1) this.LancarErroContato(1, this.CalcularEspera(registrosCurtos, janelaCurta));

    const registrosLongos = this.ConsultarJanelaMemoria(chaves.longa, janelaLonga);
    if (registrosLongos.length >= 3) this.LancarErroContato(2, this.CalcularEspera(registrosLongos, janelaLonga));

    const registro = { momento: agora, membro };
    registrosCurtos.push(registro);
    registrosLongos.push(registro);
    this.janelasMemoria.set(chaves.curta, registrosCurtos);
    this.janelasMemoria.set(chaves.longa, registrosLongos);
    this.duplicadosMemoria.set(chaves.duplicada, agora + janelaDuplicada);
    return { modo: 'memoria', chaves, membro };
  }

  LancarErroContato(motivo, esperaMilissegundos) {
    const mensagens = {
      1: 'Aguarde antes de enviar uma nova solicitação.',
      2: 'Limite de solicitações atingido. Tente novamente mais tarde.',
      3: 'Esta solicitação já foi encaminhada recentemente.',
    };
    throw new ErroLimiteAntiFlood(mensagens[motivo] || mensagens[2], esperaMilissegundos / 1000);
  }

  async CancelarReserva(reserva) {
    if (!reserva) return;

    if (reserva.modo === 'redis') {
      try {
        await this.ExecutarRedis(
          scriptCancelarReserva,
          [reserva.chaves.curta, reserva.chaves.longa, reserva.chaves.duplicada],
          [reserva.membro],
        );
      } catch {
        return;
      }
      return;
    }

    [reserva.chaves.curta, reserva.chaves.longa].forEach((chave) => {
      const registros = (this.janelasMemoria.get(chave) || []).filter(({ membro }) => membro !== reserva.membro);
      registros.length ? this.janelasMemoria.set(chave, registros) : this.janelasMemoria.delete(chave);
    });
    this.duplicadosMemoria.delete(reserva.chaves.duplicada);
  }
}

module.exports = {
  ErroLimiteAntiFlood,
  ErroServicoAntiFlood,
  ServicoAntiFlood,
  servicoAntiFlood: new ServicoAntiFlood(),
};
