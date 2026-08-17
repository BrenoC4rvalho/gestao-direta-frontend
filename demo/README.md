# Vídeo demonstrativo

O comando abaixo inicia o frontend, grava o roteiro no Chromium em 1920×1080 e salva o resultado em `demo-output/`.

```bash
DEMO_EMAIL='conta@exemplo.com' \\
DEMO_PASSWORD='senha-da-conta' \\
DEMO_FARM_NAME='Nome da fazenda' \\
npm run demo:video
```

Pré-requisito: o backend deve estar disponível em `http://localhost:8080`. Para apontar o frontend para outro endereço já iniciado, defina `DEMO_BASE_URL`.

O roteiro cria e atualiza uma atividade produtiva com prefixo `[DEMO]`; não exclui, inativa ou altera registros existentes. O arquivo original é `demo-output/apresentacao-sistema.webm`. Se `ffmpeg` estiver disponível, o comando também cria `demo-output/apresentacao-sistema.mp4`.
