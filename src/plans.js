const plans = [
  { id: 'Essencial', name: 'Essencial', cents: 900, level: 1, description: 'Um pequeno espaço na sua rotina', features: ['Jornada completa de 30 dias', 'Práticas de continuidade', 'Progresso e revisão semanal'] },
  { id: 'MeuEspaco', name: 'Meu Espaço', cents: 1900, level: 2, recommended: true, description: 'Encontre o que faz sentido para o seu momento', features: ['Tudo do Essencial', 'Biblioteca por situação e áudios guiados', 'Roteiros de conversa e caderno opcional', 'Revisão guiada e coleção de percursos mensais'] },
  { id: 'Aprofundar', name: 'Aprofundar', cents: 2900, level: 3, description: 'Tempo para explorar um tema com mais calma', features: ['Tudo do Meu Espaço', 'Oficinas narradas com material de aplicação', 'Práticas longas e acervo de oficinas'] },
];
const levels = { Basico: 0, 'Básico': 0, Pro: 2, Premium: 3, Essencial: 1, MeuEspaco: 2, Aprofundar: 3 };
module.exports = { plans, levels, planFor: id => plans.find(p => p.id === id) };
