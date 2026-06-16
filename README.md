# Sistema simples para Clínica OdontoEstética (usa cookies)

Arquivos principais:
- `index.html` — interface da clínica (login, preferências, agendamento).
- `style.css` — estilos da interface.
- `script.js` — lógica: autenticação por cookie, preferências e agendamentos.

Como usar:

1. Abra `index.html` no navegador ou sirva a pasta com um servidor estático:


```bash
python -m http.server
```

2. Acesse `http://localhost:8000` e use o formulário para:
- Entrar: informe nome e e-mail (salvo no cookie `user`).
- Preferências: escolha tema (salvo no cookie `theme`)..
- Agendar: agende um serviço; agendamentos são salvos em `localStorage` e o resumo no cookie `lastAppointment`.

Notas:
- Cookies são manipulados via `document.cookie` (funções em `script.js`).
- Para testes locais, prefira servidor para evitar limitações de caminho nos navegadores..
