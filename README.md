# Ordinare

Site institucional da Ordinare desenvolvido com HTML, CSS e JavaScript puro. O formulário prepara a mensagem e abre o WhatsApp para o próprio usuário confirmar o envio.

## Estrutura

```text
├── index.html
├── recursos/
│   ├── estilos/
│   │   └── estilos.css
│   ├── imagens/
│   │   ├── icone-whatsapp.svg
│   │   └── compartilhamento.png
│   └── javascript/
│       ├── principal.js
│       ├── formulario.js
│       └── validacoes.js
├── api/
│   ├── contato.js
│   └── ServicoLimiteEnvios.js
└── referencias/
```

O `principal.js` aplica os contatos centralizados no HTML e inicializa a navegação e o formulário. As regras do formulário e do WhatsApp ficam em `formulario.js`; máscaras e validações reutilizáveis ficam em `validacoes.js`.

Os arquivos da pasta `api` estão temporariamente comentados e preservados para uma futura integração automática com usuário de serviço.

## WhatsApp

O telefone e o e-mail ficam centralizados nos atributos `data-telefone-ordinare` e `data-email-ordinare`, no começo do `body` do `index.html`. O número usado no primeiro teste é `5511932161365`.

- Computadores abrem o WhatsApp Web em uma nova aba.
- Celulares e tablets abrem o endereço `wa.me`, permitindo que o sistema encaminhe ao aplicativo instalado.
- A mensagem contém os campos preenchidos e ainda precisa ser enviada pelo próprio usuário.
- Nenhum token ou credencial da Meta é necessário nessa abordagem.

O formulário possui três fluxos: pessoa física, empresa existente e abertura de empresa. Somente os campos do fluxo selecionado são validados e incluídos na mensagem. Os dados são codificados no endereço do WhatsApp.

## Proteção inicial contra repetição

Como não existe envio automático nem chamada à API da Meta, o site não consegue disparar mensagens sozinho. A proteção inicial inclui:

- validação dos campos obrigatórios e dos opcionais que forem preenchidos;
- botão bloqueado enquanto o formulário estiver inválido;
- campo invisível contra preenchimento automatizado simples;
- intervalo local de sessenta segundos entre aberturas do WhatsApp;
- limpeza dos dados depois que o WhatsApp for aberto.

O intervalo local é uma barreira de conveniência e pode ser contornado por quem controla o navegador. Um bloqueio forte somente será necessário se o envio automático pela API for reativado.

## Evolução quando houver escala

1. Manter a abertura manual enquanto o volume de contatos for baixo.
2. Adicionar Cloudflare Turnstile gratuito se houver automação abusiva do formulário.
3. Ao reativar a API, usar limite distribuído, idempotência e validação no servidor.
4. Em alto volume, adicionar fila de envio, métricas, alertas e limites de custo.

## Responsividade

- Até `1080px`: menu móvel e conteúdo principal em uma coluna, adequado para tablets em retrato e paisagem.
- Até `680px`: cartões, rodapé e formulário em uma coluna, adequado para celulares.
- Altura de até `600px` em paisagem: cabeçalho e formulário do modal são compactados e permanecem roláveis.
- Imagens, grades e textos respeitam a largura disponível sem criar rolagem horizontal.

## Antes da publicação

- Substituir telefone, e-mail e CRC pelos dados oficiais.
- Validar o aviso de privacidade com o responsável pela LGPD.
- Substituir o número de teste pelo WhatsApp definitivo.
- Reavaliar a proteção no servidor caso a integração automática seja reativada.

Os nomes próprios do projeto estão em PT-BR. Nomes obrigatórios das plataformas, como `fetch`, `addEventListener`, `module.exports` e propriedades da API da Meta, preservam o formato exigido por essas tecnologias.
