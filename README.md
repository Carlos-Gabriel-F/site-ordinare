# Ordinare

Site institucional estático da Ordinare, feito com HTML, CSS e JavaScript puro. A única parte executada no servidor é o envio seguro do formulário para a API oficial do WhatsApp.

## Estrutura

```text
├── index.html       # conteúdo da página
├── estilos.css      # identidade visual e responsividade
├── principal.js     # menu, modal, máscaras, ViaCEP e formulário
├── icone-whatsapp.svg
├── api/
│   ├── contato.js            # validação final e envio seguro ao WhatsApp
│   └── ServicoAntiFlood.js   # limites de envio e bloqueio de duplicidades
├── og.png           # imagem de compartilhamento
└── refs/            # material local de referência, ignorado pelo Git
```

Para visualizar a página, abra o `index.html` diretamente ou use um servidor estático simples, como a extensão Live Server do editor.

## WhatsApp

O arquivo `api/contato.js` é uma função serverless compatível com o padrão de requisição e resposta da Vercel. Caso outro provedor seja escolhido, somente esse adaptador precisará ser ajustado.

Configure no ambiente do servidor as variáveis descritas em `.env.example`. Elas não podem ser colocadas no `principal.js`, no HTML ou receber qualquer prefixo que as publique no navegador.

O modelo aprovado na Meta deve possuir doze parâmetros de texto, nesta ordem: nome, tipo de pessoa, documento, nascimento, telefone, CEP, rua, cidade, estado, categoria, regime tributário e descrição da solicitação.

Sem as credenciais, o formulário responde que o atendimento ainda não foi configurado. Isso evita incluir tokens fictícios ou expor segredos no frontend.

## Proteção contra excesso de envios

O `ServicoAntiFlood` aplica três limites no servidor:

- cinco tentativas por IP em dez minutos;
- um envio por CPF/CNPJ e telefone a cada dois minutos, limitado a três em trinta minutos;
- bloqueio de uma solicitação idêntica por dez minutos.

Os identificadores são armazenados como hashes HMAC; CPF, telefone, IP e descrição não são gravados em texto aberto. Se o envio ao WhatsApp falhar, a reserva do contato é cancelada para permitir uma nova tentativa legítima. As respostas bloqueadas usam HTTP `429` e o cabeçalho `Retry-After`.

Para desenvolvimento local, o serviço usa memória. Em produção, configure `LIMITE_REDIS_URL`, `LIMITE_REDIS_TOKEN` e um `LIMITE_SEGREDO_HASH` aleatório com pelo menos 32 caracteres. A API interrompe o envio quando a proteção distribuída estiver ausente ou indisponível em produção.

## Antes da publicação

- Substituir no HTML o telefone, e-mail, endereço e CRC marcados como pendentes.
- Revisar a necessidade de CPF e nascimento e validar o aviso de privacidade com o responsável pela LGPD.
- Configurar o template, o destinatário e as credenciais da Meta.
- Configurar também uma regra de borda para `POST /api/contato` no provedor escolhido.

Os nomes do projeto, seletores e funções próprias estão padronizados em PT-BR. Termos obrigatórios das plataformas, como `fetch`, `addEventListener`, `module.exports` e nomes de propriedades da API da Meta, permanecem no formato definido por essas tecnologias.
