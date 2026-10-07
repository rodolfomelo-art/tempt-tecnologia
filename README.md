# Site Tempt Tecnologia

HTML, CSS e canvas. O formulário de contato envia o lead por WhatsApp via [OpenWA](https://www.open-wa.org).

## Rodar

```
cp .env.example .env        # preencha OPENWA_API_KEY, OPENWA_SESSION_ID e WHATSAPP_NOTIFY_TO
node --env-file=.env server/server.js    # Node 18+  →  http://localhost:3000
```

Sem `.env` preenchido o site funciona normalmente e o formulário abre o e-mail do visitante.

## OpenWA (resumo)

1. Suba o OpenWA (veja o quickstart em https://docs.open-wa.org) e crie uma sessão: `POST /api/sessions` com `X-API-Key`.
2. Inicie a sessão (`POST /api/sessions/{id}/start`) e leia o QR em `GET /api/sessions/{id}/qr` com o WhatsApp do número da empresa.
3. Copie a chave de API e o ID da sessão para o `.env`.

A chave fica só no servidor (`server/server.js`); o navegador chama `/api/contato`.
O servidor valida os campos, exige consentimento, tem campo isca anti-bot e limita 5 envios por IP a cada 10 minutos.

## Atenção

O OpenWA não é oficial do WhatsApp/Meta e há risco de bloqueio do número se houver abuso. Use um número dedicado, apenas para notificações e atendimento a quem pediu contato.
