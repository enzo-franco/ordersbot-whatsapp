## WhatsApp Order Reminder Bot  -- English Version <img width="50" height="50" alt="AmericanFlagUsaGIFbyMOODMAN" src="https://github.com/user-attachments/assets/94da0517-f076-4394-acef-60863206c3c3" />



Sends a morning message to selected WhatsApp groups from Monday to Friday at **9:00 a.m. São Paulo time**.

## How the idea started

The idea came from the need to remind customers, politely and consistently, that they can place their orders at the beginning of the day. Instead of writing and sending a message manually every day, the bot rotates through five different messages, one for each weekday, and sends them to the selected groups.

## How it was built

This project was developed with the help of artificial intelligence (AI). It is built with JavaScript and Node.js, and uses `whatsapp-web.js` to connect through WhatsApp Web. A local dashboard lets the user scan the QR code, choose groups, review the messages, and configure the schedule. The program handles scheduled sending from Monday to Friday at 9:00 a.m. São Paulo time. Optional scripts can start the program automatically on Windows.

WhatsApp session data, selected groups, settings, and message history stay on the user's computer and are not included in this public repository.

## Getting started

1. Install dependencies with `npm install`.
2. Run `npm start`.
3. Open `http://127.0.0.1:3000` on the computer running the bot.
4. Scan the QR code with WhatsApp on your phone under **Linked devices**.
5. Select groups, review the five weekday messages, enable sending, and click **Save schedule**.

The bot automatically uses a different message for each weekday. The messages repeat weekly and have three paragraphs: greeting, order inquiry, and a closing. Edit them only if you want to change the wording.

To check the connection before the next scheduled send, use **Send a test now** in the dashboard. Choose a saved group and a weekday message, then confirm. The received text starts with `[BOT TEST — not the scheduled message]`; the test appears in the history and does not replace the 9:00 a.m. send. The dashboard prevents a second test to the same group for 5 minutes.

The computer must remain on, connected to the internet, and running the program at send time. If the bot is off or disconnected at 9:00 a.m., it will not send the message later. Each group gets at most one automatic attempt per day; an interrupted attempt is not automatically retried, to prevent duplicate messages.

This integration uses `whatsapp-web.js`, which operates through WhatsApp Web and is not an official Meta API. Changes to WhatsApp Web may interrupt it, and automated use may be subject to the platform's rules. Use it only in groups where you have permission to send these messages.

To use a different port, set the `PORT` environment variable before starting the app. The dashboard accepts connections only from the same computer (`127.0.0.1`).

## Optional automatic startup on Windows

The `register-task.ps1` script creates a Windows scheduled task that starts the bot when you sign in and attempts to start it again at 8:50 a.m. Sending remains scheduled for 9:00 a.m., Monday to Friday. The task will not send anything while scheduling is disabled in the dashboard. Windows must be configured for the São Paulo time zone.

To remove automatic startup, open Windows Task Scheduler and delete the **ChatBot - pedidos WhatsApp** task. This does not delete your settings or WhatsApp session.

---

# Bot de lembretes de pedidos pelo WhatsApp -- Brazilian Portuguese Version <img width="50" height="50" alt="BrazilNationalTeamGIF" src="https://github.com/user-attachments/assets/bebd741a-7f22-4b47-84ee-efa4c6b587a8" />



Envia uma mensagem de bom dia aos grupos selecionados, de segunda a sexta, às **9h no horário de São Paulo**.

## Como surgiu a ideia

A ideia surgiu da necessidade de lembrar os clientes, de forma educada e consistente, que podem fazer seus pedidos no começo do dia. Em vez de escrever e enviar uma mensagem manualmente todos os dias, o bot alterna entre cinco textos diferentes, um para cada dia útil, e envia a mensagem aos grupos selecionados.

## Como foi implementado

O projeto foi desenvolvido com apoio de inteligência artificial (IA). Foi implementado em JavaScript com Node.js e `whatsapp-web.js`, que conecta à conta por meio do WhatsApp Web. Um painel local permite escanear o QR Code, escolher os grupos, revisar as mensagens e configurar o agendamento. O programa cuida dos envios de segunda a sexta às 9h, no horário de São Paulo. No Windows, há scripts opcionais para iniciar o programa automaticamente.

Os dados da sessão do WhatsApp, os grupos selecionados, as configurações e o histórico ficam no computador do usuário e não são incluídos neste repositório público.

## Como iniciar

1. Instale as dependências com `npm install`.
2. Execute `npm start`.
3. Abra `http://127.0.0.1:3000` no computador onde o bot está rodando.
4. Escaneie o QR Code com o WhatsApp no celular em **Dispositivos conectados**.
5. Selecione os grupos, revise as cinco mensagens de segunda a sexta, ative os envios e clique em **Salvar agendamento**.

O bot usa automaticamente uma mensagem diferente para cada dia útil. As mensagens se repetem a cada semana e têm três parágrafos: saudação, pergunta sobre pedidos e fechamento. Edite os textos se quiser mudar a mensagem.

Para verificar a conexão antes do próximo horário agendado, use **Fazer um teste agora** no painel. Escolha um grupo salvo, escolha a mensagem de um dia útil e confirme. O texto recebido começa com `[TESTE DO BOT — não é o envio agendado]`; o teste aparece no histórico e não substitui o envio das 9h. O painel impede um segundo teste para o mesmo grupo durante 5 minutos.

O computador precisa permanecer ligado, conectado à internet e com o programa em execução no horário do envio. Se o bot estiver desligado ou desconectado às 9h, ele não faz envio retroativo. Cada grupo recebe no máximo uma tentativa automática por dia; uma tentativa interrompida não é repetida automaticamente para evitar duplicidade.

Esta integração usa `whatsapp-web.js`, que opera por meio do WhatsApp Web e não é uma API oficial da Meta. Mudanças no WhatsApp Web podem interromper o funcionamento, e o uso automatizado pode estar sujeito às regras da plataforma. Use apenas em grupos onde você tem permissão para mandar essas mensagens.

Para usar outra porta, defina a variável de ambiente `PORT` antes de iniciar. O painel aceita conexões apenas do próprio computador (`127.0.0.1`).

## Inicialização automática opcional no Windows

O script `register-task.ps1` registra uma tarefa do Windows para iniciar o bot quando você entrar na conta e tentar iniciá-lo novamente às 8h50. O envio continua programado para 9h, de segunda a sexta. A tarefa não envia nada enquanto o agendamento estiver desativado no painel. O Windows precisa estar configurado no fuso horário de São Paulo.

Para remover a inicialização automática, abra o Agendador de Tarefas do Windows e exclua a tarefa **ChatBot - pedidos WhatsApp**. Isso não apaga suas configurações nem sua sessão do WhatsApp.
