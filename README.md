# Evolução Enfermagem — PWA

PWA estático, mobile-first e preparado para GitHub Pages. A geração do texto é feita localmente no navegador e não usa backend.

## Publicar no GitHub Pages

1. Crie um repositório no GitHub, por exemplo `evolucao-enfermagem`.
2. Envie todos os arquivos desta pasta para a raiz do repositório.
3. No GitHub, abra **Settings → Pages**.
4. Em **Build and deployment**, escolha **Deploy from a branch**.
5. Selecione a branch `main` e a pasta `/(root)`.
6. Aguarde a publicação e abra a URL fornecida pelo GitHub Pages.

Os caminhos usam `./`, então o projeto funciona em subpastas como `https://usuario.github.io/evolucao-enfermagem/`.

## Instalação no celular

Abra o site publicado pelo GitHub Pages em navegador compatível e use o botão de instalação do navegador/PWA. O app possui `manifest.webmanifest` e `service worker` para cache dos arquivos essenciais.

## Observação clínica

O app gera somente rascunhos a partir dos dados digitados e dos cuidados explicitamente selecionados. Revise tudo antes de registrar em prontuário e siga as rotinas da instituição.
