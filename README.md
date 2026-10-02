# Bot de pedidos para WhatsApp

Envia uma mensagem de bom dia aos grupos escolhidos, de segunda a sexta, às **9h no horário de São Paulo**.

## Iniciar

1. Instale as dependências com `npm install`.
2. Execute `npm start`.
3. Abra `http://127.0.0.1:3000` no computador onde o bot está rodando.
4. Escaneie o QR Code com o WhatsApp no celular em **Dispositivos conectados**.
5. Selecione os grupos, revise as cinco mensagens de segunda a sexta, ative os envios e clique em **Salvar agendamento**.

O bot usa automaticamente uma mensagem diferente para cada dia útil. As mensagens se repetem a cada semana e têm três parágrafos: saudação, pergunta sobre pedidos e fechamento. Você só precisa editá-las se quiser mudar o texto.

Para verificar a conexão antes do próximo horário agendado, use **Fazer um teste agora** no painel. Escolha um grupo salvo, escolha a mensagem de um dia útil e confirme. O texto recebido começa com `[TESTE DO BOT — não é o envio agendado]`; o teste aparece no histórico e não substitui o envio das 9h. O painel impede um segundo teste para o mesmo grupo durante 5 minutos.

O computador precisa permanecer ligado, conectado à internet e com o programa em execução no horário do envio. Se o bot estiver desligado ou desconectado às 9h, ele não faz envio retroativo. Cada grupo recebe no máximo uma tentativa automática por dia; uma tentativa interrompida não é repetida automaticamente para evitar duplicidade.

Esta integração usa `whatsapp-web.js`, que opera por meio do WhatsApp Web e não é uma API oficial da Meta. Mudanças no WhatsApp Web podem interromper o funcionamento, e o uso automatizado pode estar sujeito às regras da plataforma. Use apenas em grupos onde você tem permissão para mandar essas mensagens.

Os dados da sessão, as configurações e o histórico ficam em `data/` e `.wwebjs_auth/` no próprio computador. Não compartilhe essas pastas. Para parar os envios, desative o agendamento no painel ou encerre o programa.

Para outra porta, defina a variável de ambiente `PORT` antes de iniciar. O painel aceita conexões apenas do próprio computador (`127.0.0.1`).

## Inicialização automática no Windows

O script `register-task.ps1` registra uma tarefa do Windows para iniciar o bot quando você entrar na conta e tentar iniciá-lo novamente às 8h50. O envio em si continua programado para 9h, de segunda a sexta. A tarefa não envia nada enquanto o agendamento estiver desativado no painel. O Windows deste computador está configurado no horário de Brasília.

Para remover essa inicialização automática, abra o Agendador de Tarefas do Windows e exclua a tarefa **ChatBot - pedidos WhatsApp**. Isso não apaga suas configurações nem sua sessão do WhatsApp.
