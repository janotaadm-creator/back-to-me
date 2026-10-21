# Assinaturas e experiência — 21/10/2026

Implementação autorizada por Guilherme: landing romântica, experiência sem cadastro, três experiências gratuitas, planos mensais USD9/19/29 com Meu Espaço recomendado. Somente sandbox Stripe; nenhuma cobrança real ativada.

## Entrega disponível
- Essencial: 90 cards/30 dias, progresso, revisão e ciclo de quatro práticas semanais após30dias.
- Meu Espaço: três percursos iniciais; mais três percursos (seis exercícios) liberados nos meses2/3/4 da conta; seis áudios digitais, seis exemplos de frases, caderno opcional e revisão guiada.
- Aprofundar: três oficinas narradas, liberadas nos meses1/2/3 da conta. Gravações de cerca de4min com roteiro para20min de prática; não são vídeos, consultas ou20min de fala contínua.
- Coleções finitas explicitadas, sem promessa de conteúdo novo indefinido. Períodos editoriais de30dias, cobrados por mês-calendário Stripe. Conta antiga pode já ter todas as liberações.
- Lembrete opcional via download de calendário por quatro semanas; nenhum e-mail/notificação enviado automaticamente.
- 90 revisões editoriais aplicadas na resposta da API; corpus original/seed/banco preservados. Revisão editorial não equivale a validação clínica/comercial.

## Pagamento e dados
Checkout de assinatura com preços inline USD900/1900/2900 centavos, sem trial. Bloqueio de segunda assinatura ativa e reaproveitamento de checkout aberto. Webhook assinado consulta o estado atual de Stripe, com lock por assinatura. Renovação só estende acesso após fatura paga. Cancelamento pelo app impede próxima renovação, mantém período pago. Troca de plano exige cancelar e aguardar término atual; não há troca imediata/prorrata neste lançamento. Pagamentos legados de30dias preservados.

Chave restrita existente: Checkout leitura/gravação, Subscriptions leitura/gravação, Invoices leitura, somente sandbox (autorização específica do dono). Webhook existente ganhou subscription.created/updated/deleted e invoice.paid/payment_failed/payment_action_required além dos três eventos Checkout. Nenhuma chave foi gerada, copiada ou rotacionada.

Respostas do exercício público ficam apenas no DOM. Caderno é opt-in, AES256-GCM na base, vinculado ao usuário; não é E2E. Chave de cifragem derivada de JWT_SECRET: **rotação futura desse segredo exige migração das notas com a chave anterior; não rotacionar sem planejar**. Até500notas/8000caracteres. Ler/exportar/excluir permanece após término do plano. Eventos registram somente nomes permitidos e user_id, nunca texto íntimo; são dados pseudônimos, não anônimos.

## Evidências antes do deploy
18 testes com PostgreSQL isolado: legado, assinaturas, duplicação, concorrência, falha/renovação/cancelamento, isolamento/cifragem de notas, acesso expirado, oficinas e áudio. Browser local: experiência sem cadastro → conta → três conclusões → recomendação US19; biblioteca e nota de exemplo salva; áudio213s carregado; desktop/celular390px sem overflow. Não testamos eficácia ou demanda com usuárias.

## Operação
Deploy por SHA exato da branch codex/railway-deploy. Não usar --from-source porque master ainda é antiga. O rollout executa migrations aditivas idempotentes. Dados de teste públicos devem ser fictícios, e a assinatura de QA deve ter renovação cancelada. Ativação live e autorização GitHub/autodeploy seguem decisões separadas.

## Publicação bloqueada nesta sessão
Railway recusou o deploy com “Deploys have been paused temporarily”. Incidente oficial https://status.railway.com/incident/QH8L8B3E: API/dashboard indisponíveis e builds pausados em todas as regiões (Identified, atualização09:28UTC). Nenhum novo deployment foi criado; site permanece em b204563. Novo fluxo de assinatura ainda NÃO está público. Retomar deploy do HEAD desta branch quando o serviço liberar, depois testar compra/cancelamento sandbox público. Não há publicação enfileirada nem monitor automático novo.

## Lapidação da landing — 21/10/2026, 08h BRT
Pedido adicional do dono: valor e esteira devem ficar na própria landing. Página inicial agora demonstra exercícios, seleção dos seis áudios e caderno em três prévias alternáveis; explica a diferença de US$10 entre Essencial e Meu Espaço, apresenta benefícios por uso e mantém convite gratuito antes da compra. No celular, texto e CTA vêm antes da foto. Exemplos fictícios rotulados, preços/periodicidade e limites preservados. Verificação no navegador: desktop1280/mobile390, alternância de três prévias, exercício gratuito, links internos sem destinos ausentes, sem overflow ou erroJS. Mudança só de HTML/CSS/JS da landing; não requer repetir a suíte de backend. Railway continua com builds pausados no incidenteQH8L8B3E; nova página não está pública.

## Correção de direção — preservar a landing anterior
Guilherme esclareceu que deseja o funil dentro da landing anterior, sem redesenhar a página. Esta entrada substitui a direção visual da lapidação acima. Restaurados HTML e CSS base de b204563: hero, foto, textos de abertura, cenas, ordem das cinco seções e foto primeiro no mobile. O card da seção Como funciona agora recebe a experiência gratuita; a seção de oferta mantém sua introdução e painel gratuito, com os planos USD9/19/29 inseridos abaixo. Meu Espaço destacado por benefícios reais. Removidas as seções novas de prévias, percurso e encerramento, assim como seus listeners. O antigo texto que responsabilizava a mulher pela falta de escuta não foi restaurado; o exercício usa cena, necessidade e escolha.
Verificado no navegador: desktop1280 e mobile390 sem overflow, cinco seções originais, hero idêntico (apenas destino do CTA passa ao exercício), exemplo por objetivo, resumo literal, limpar, links internos e encaminhamento MeuEspaco funcionando, console sem erro. Backend intacto, sem repetir testes já aprovados. Status oficial Railway novamente Identified: builds pausados, API/CLI indisponíveis; não houve nova publicação.

## Retomar a estrutura completa de valor da landing-fonte
Novo esclarecimento de Guilherme: faltava a demonstração de conteúdo e valor do curso original. A referência correta é a landing-v6-claude completa, não apenas a versão b204563 simplificada para o app. Recuperada sua sequência situação → ficha preenchida → uso concreto → materiais por dentro → oferta, com coração/rosa/vinho/foto/headline preservados. Conteúdo adaptado ao catálogo atual: três percursos/nove exercícios, duas fichas preenchidas além da experiência pública, seis prévias de recursos e capítulos da primeira oficina. Perguntas, exemplos e títulos conferidos em src/content/library.json. Não restauradas oferta antiga de pagamento único, garantia não definida ou alegação de nove aulas antigas entregues no app. Planos mensais9/19/29 mantidos.
Navegador desktop1280/mobile390: acordeões acessíveis, nove tópicos, seis materiais, links internos íntegros, sem overflow. Experiência pública e preços intactos; nenhuma alteração no backend. Publicação continua pendente por bloqueio Railway previamente confirmado.

## Experiência de exploração — 21/10/2026
Pedido do dono: melhorar a experiência “dopaminérgica” do site. Aplicada camada de interação preservando conteúdo, identidade, arquitetura e preços: reflexão em três etapas opcionais, voltar/editar com respostas preservadas, resumo com retorno visual de coração; filtro dos três percursos e indicação dos exercícios abertos nesta visita; navegação contextual fixa; entradas suaves de blocos e resposta ao toque; exclusão mútua de reprodução das amostras. Sem autoplay, urgência artificial, streak, armazenamento/tracking novo ou promessa de efeito psicológico.
Verificado no navegador: avançar/voltar, exemplo protegido contra sobrescrita, limpar, concluir sem escrever, resumo literal, filtros e abertura de exercícios, desktop1280/mobile390 sem overflow ou erroJS. Preferência de movimento reduzido simulada via DevTools: animation:none e scroll:auto confirmados; emulação removida. Somente frontend; testes de backend já aprovados não repetidos.

Áudios testados via controles do navegador: primeiro tocando/segundo parado; ao iniciar o segundo, primeiro pausou; ambos deixados pausados. Status oficial Railway novamente Identified, builds pausados e API/CLI indisponíveis; nenhum deploy iniciado.

## Voz da amostra substituída por ElevenLabs
Guilherme rejeitou a voz sintética e pediu ElevenLabs. A amostra cena, compartilhada pelos dois players da landing e pelo exercício correspondente no app, agora usa Giselle (pt-BR), eleven_v4. Roteiro reescrito para conversa breve com as mesmas três perguntas, sem avisos repetidos. Quatro tomadas geradas, lote estimado US$0,84; escolhida a de69,28s por ser a mais pausada em duração, sem alegar avaliação auditiva humana. A preferência de timbre continua sujeita à escuta do dono.
Arquivo media/cena.m4a convertido para AAC128k/44,1kHz com normalização de volume, sem mudança de velocidade/pitch; duração69,3s. Roteiro e origem em src/content/audio/elevenlabs/cena.txt e cena.json, sem URLs assinadas ou credenciais. Fonte anterior preservada no Git; build-audio.sh passa a preservar gravações ElevenLabs. Demais oito gravações continuam do sintetizador anterior: este ajuste atende à amostra apontada na landing.
Validação: endpoint público local200/audio-mp4, hash idêntico ao arquivo novo, reprodução no navegador readyState4/duração69,3s, pausada ao terminar a conferência. UI atualizada para1min10/narração digital ElevenLabs e cache-busting. Rotas/acesso inalterados. Publicação Railway segue pendente no incidente já confirmado.
