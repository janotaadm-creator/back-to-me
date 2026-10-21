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
17 testes com PostgreSQL isolado: legado, assinaturas, duplicação, concorrência, falha/renovação/cancelamento, isolamento/cifragem de notas, acesso expirado, oficinas e áudio. Browser local: experiência sem cadastro → conta → três conclusões → recomendação US19; biblioteca e nota de exemplo salva; áudio213s carregado; desktop/celular390px sem overflow. Não testamos eficácia ou demanda com usuárias.

## Operação
Deploy por SHA exato da branch codex/railway-deploy. Não usar --from-source porque master ainda é antiga. O rollout executa migrations aditivas idempotentes. Dados de teste públicos devem ser fictícios, e a assinatura de QA deve ter renovação cancelada. Ativação live e autorização GitHub/autodeploy seguem decisões separadas.
