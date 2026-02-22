export const subjectsData = [
  {
    name: 'Geografia',
    icon: 'earth',
    colorLight: '#F0F4FF',
    colorDark: '#26324D',
    spine: '#1976D2',
    topics: [
      'Relevo Brasileiro',
      'Clima e Vegetação',
      'População e Urbanização',
      'Economia do Brasil',
      'Regiões do Brasil',
      'Hidrografia',
      'Globalização',
      'Meio Ambiente',
      'Cartografia',
      'Climatologia'
    ]
  },
  {
    name: 'Matemática',
    icon: 'calculator-outline',
    colorLight: '#F4FFF0',
    colorDark: '#23352B',
    spine: '#388E3C',
    topics: [
      'Álgebra',
      'Geometria Plana',
      'Geometria Espacial',
      'Trigonometria',
      'Funções',
      'Matemática Financeira',
      'Análise Combinatória',
      'Probabilidade',
      'Estatística',
      'Progressões'
    ]
  },
  // Adicione mais matérias conforme necessário
];

export const getSubjectTopics = (subjectName) => {
  const subject = subjectsData.find(subj => subj.name === subjectName);
  return subject ? subject.topics : [];
};
