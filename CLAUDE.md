# Projeto: App de Controle Financeiro Pessoal

## Fonte da verdade
O arquivo `arquitetura-app-financas.md` (nesta mesma pasta) contém TODA a
arquitetura já decidida: escopo, stack, modelo de dados, motores de cálculo
(orçamento, projeção, alocação), ingestão e o roadmap em 4 fases. Leia esse
arquivo no início de toda sessão, antes de qualquer trabalho.

Este projeto foi desenhado numa conversa com o usuário usando uma metodologia
de checkpoints (CP1 a CP6, todos fechados nesse arquivo). Você deve CONTINUAR
essa mesma metodologia daqui em diante, sem precisar que o usuário volte a
outra conversa.

## Regras permanentes de trabalho

1. **Nunca decida sozinho pontos de produto ambíguos.** Se durante a
   implementação surgir uma decisão que não está no `arquitetura-app-financas.md`
   (ex: um caso de borda, um trade-off técnico com implicação de produto),
   PARE e pergunte ao usuário antes de prosseguir — do mesmo jeito que os
   checkpoints anteriores foram fechados (apresente 2-4 opções concretas
   quando fizer sentido, com um exemplo se a pergunta não for óbvia).

2. **Mantenha o `arquitetura-app-financas.md` vivo.** Toda vez que uma nova
   decisão de produto for tomada durante a implementação (inclusive as
   pendências já listadas: carência da previdência, calibração de layout de
   comprovante), atualize o arquivo na seção correspondente. Esse arquivo é
   a memória do projeto — não deixe decisões só no seu contexto de sessão.

3. **Respeite a ordem de fases.** Não implemente Fase 2, 3 ou 4 sem o
   usuário pedir explicitamente, mesmo que pareça natural adiantar.

4. **Trabalhe em checkpoints pequenos e comitáveis.** Cada entrega = um
   commit com mensagem clara. Ao final de cada checkpoint, resuma em 2-3
   linhas o que foi feito e o que vem a seguir.

5. **Priorize praticidade de uso.** O requisito de produto mais importante
   do usuário é conseguir registrar e ver informação rápido, com poucos
   toques — isso pesa em qualquer decisão de UX.

6. **Stack é fixa** (React PWA + Node.js + Supabase/PostgreSQL + Vercel,
   tudo no free tier). Não proponha alternativas sem avisar e justificar
   antes.

## Estado atual
Ver `arquitetura-app-financas.md` → CP6 → "Ordem de construção" para saber
exatamente em qual item da Fase 1 começar.
