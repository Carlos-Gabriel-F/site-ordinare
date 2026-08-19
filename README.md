# Ordinare

Site institucional estático da Ordinare, feito com HTML, CSS e JavaScript puro. A única parte executada no servidor é o envio seguro do formulário para a API oficial do WhatsApp.

## Estrutura

```text
├── index.html       # conteúdo da página
├── estilos.css      # identidade visual e responsividade
├── principal.js     # menu, modal, máscaras, ViaCEP e formulário
├── icone-whatsapp.svg
├── api/
│   └── contato.js   # validação final e envio seguro ao WhatsApp
├── og.png           # imagem de compartilhamento
└── refs/            # material local de referência, ignorado pelo Git
```

Para visualizar a página, abra o `index.html` diretamente ou use um servidor estático simples, como a extensão Live Server do editor.

## WhatsApp

O arquivo `api/contato.js` é uma função serverless compatível com o padrão de requisição e resposta da Vercel. Caso outro provedor seja escolhido, somente esse adaptador precisará ser ajustado.

Configure no ambiente do servidor as variáveis descritas em `.env.example`. Elas não podem ser colocadas no `principal.js`, no HTML ou receber qualquer prefixo que as publique no navegador.

O modelo aprovado na Meta deve possuir doze parâmetros de texto, nesta ordem: nome, tipo de pessoa, documento, nascimento, telefone, CEP, rua, cidade, estado, categoria, regime tributário e descrição da solicitação.

Sem as credenciais, o formulário responde que o atendimento ainda não foi configurado. Isso evita incluir tokens fictícios ou expor segredos no frontend.

## Antes da publicação

- Substituir no HTML o telefone, e-mail, endereço e CRC marcados como pendentes.
- Revisar a necessidade de CPF e nascimento e validar o aviso de privacidade com o responsável pela LGPD.
- Configurar o template, o destinatário e as credenciais da Meta.
- Configurar proteção de borda contra excesso de requisições no provedor escolhido.

Os nomes do projeto, seletores e funções próprias estão padronizados em PT-BR. Termos obrigatórios das plataformas, como `fetch`, `addEventListener`, `module.exports` e nomes de propriedades da API da Meta, permanecem no formato definido por essas tecnologias.
