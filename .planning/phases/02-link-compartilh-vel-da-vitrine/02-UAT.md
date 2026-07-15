---
status: complete
phase: 02-link-compartilh-vel-da-vitrine
source: [02-VERIFICATION.md]
started: 2026-07-14T15:35:00Z
updated: 2026-07-14T15:50:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Editar Loja/WhatsApp em /configuracoes e salvar
expected: Editar nome/logo/cor/frase/WhatsApp/template em /configuracoes, clicar "Salvar alterações", ver o toast "Configurações salvas!" e confirmar que os valores persistem após refresh. Acessar /configuracoes deslogado deve redirecionar para /login.
result: pass

### 2. Trocar o slug em /configuracoes → Link e QR Code
expected: Digitar um nome com acentos (ex. "Café São Paulo") e ver o campo virar "cafe-sao-paulo" sem letras perdidas; digitar um slug já existente (segunda conta) e ver "Este link já está em uso."; digitar um slug livre e ver "Disponível" após ~400ms. Clicar "Salvar novo link" deve abrir um diálogo com aviso em linguagem simples; Escape/Cancelar não deve alterar o slug; confirmar em "Sim, trocar o link" deve salvar, mostrar toast e atualizar o QR/link exibidos.
result: pass

### 3. QR Code e cópia de link em /configuracoes → Link e QR Code
expected: O preview do QR deve renderizar ao carregar a página; "Baixar PNG" deve baixar "vitrine-qrcode.png"; escanear o PNG baixado com a câmera de um celular real deve abrir a URL correta da vitrine; "Copiar" deve colocar a URL exata na área de transferência (confirmar colando) e mostrar o toast "Link copiado!".
result: pass
note: "Confirmado pelo usuário como já testado anteriormente."

## Summary

total: 3
passed: 3
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
