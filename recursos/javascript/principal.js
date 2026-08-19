const menuMobile = document.querySelector('#menu-mobile');
const botaoMenuMobile = document.querySelector('.botao-menu-mobile');

function fecharSubmenus() {
  document.querySelectorAll('.item-menu').forEach((item) => item.classList.remove('aberto'));
  document.querySelectorAll('.botao-menu').forEach((botao) => botao.setAttribute('aria-expanded', 'false'));
}

function fecharMenuMobile() {
  menuMobile.classList.remove('aberto');
  document.body.classList.remove('menu-aberto');
  botaoMenuMobile.setAttribute('aria-expanded', 'false');
  botaoMenuMobile.setAttribute('aria-label', 'Abrir menu');
}

function inicializarNavegacao() {
  document.querySelectorAll('.botao-menu').forEach((botao) => {
    botao.addEventListener('click', () => {
      const item = botao.closest('.item-menu');
      const deveAbrir = !item.classList.contains('aberto');
      fecharSubmenus();
      item.classList.toggle('aberto', deveAbrir);
      botao.setAttribute('aria-expanded', String(deveAbrir));
    });
  });

  document.addEventListener('click', (evento) => {
    if (!evento.target.closest('.item-menu')) fecharSubmenus();
  });

  botaoMenuMobile.addEventListener('click', () => {
    const deveAbrir = !menuMobile.classList.contains('aberto');
    menuMobile.classList.toggle('aberto', deveAbrir);
    document.body.classList.toggle('menu-aberto', deveAbrir);
    botaoMenuMobile.setAttribute('aria-expanded', String(deveAbrir));
    botaoMenuMobile.setAttribute('aria-label', deveAbrir ? 'Fechar menu' : 'Abrir menu');
  });

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', fecharMenuMobile);
  });

  document.addEventListener('keydown', (evento) => {
    if (evento.key !== 'Escape') return;
    fecharSubmenus();
    fecharMenuMobile();
  });

  window.addEventListener(
    'scroll',
    () => document.querySelector('#cabecalho').classList.toggle('com-sombra', window.scrollY > 12),
    { passive: true },
  );
}

document.querySelector('#ano-atual').textContent = new Date().getFullYear();
inicializarNavegacao();
inicializarFormulario();
