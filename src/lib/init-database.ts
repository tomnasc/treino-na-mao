import supabase from './supabase';

export async function initializeDatabase() {
  try {
    console.log('Iniciando inicialização do banco de dados...');

    // Verificar se a tabela de usuários já existe
    const { data: tablesExist, error: tableCheckError } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (tableCheckError) {
      console.log('Tabelas não encontradas, criando estrutura do banco de dados...');
      const sqlScript = await fetch('/treino_na_mao_postgres_schema.sql').then(res => res.text());
      
      // Em um ambiente real, executaríamos o script SQL via API ou dashboard do Supabase
      console.log('Script SQL obtido, execute-o no dashboard do Supabase');
      
      return {
        success: false,
        error: 'Estrutura do banco de dados não encontrada. Execute o script SQL no dashboard do Supabase.',
        sqlScript
      };
    }
    
    console.log('Banco de dados já inicializado!');
    return { success: true, error: null };
  } catch (error) {
    console.error('Erro ao inicializar banco de dados:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido ao inicializar banco de dados' 
    };
  }
}

export async function seedExercises() {
  try {
    console.log('Verificando se existem exercícios pré-cadastrados...');
    
    // Verificar se já existem exercícios no banco
    const { count, error: countError } = await supabase
      .from('exercises')
      .select('id', { count: 'exact', head: true });
    
    if (countError) throw new Error(countError.message);
    
    if (count && count > 0) {
      console.log(`${count} exercícios já cadastrados.`);
      return { success: true, count, error: null };
    }
    
    console.log('Nenhum exercício encontrado, inserindo dados iniciais...');
    
    // Dados de exemplo para exercícios
    const sampleExercises = [
      {
        name: 'Supino Reto',
        description: 'Exercício composto para desenvolvimento do peitoral, com ênfase na parte média.',
        muscle_groups: ['peito', 'tríceps', 'ombros'],
        equipment: ['barra', 'halteres', 'máquina'],
        category: 'compound',
        difficulty: 'intermediate',
        youtube_video_id: 'IODxDxX7oi4',
        is_verified: true
      },
      {
        name: 'Agachamento',
        description: 'Exercício composto para desenvolvimento dos músculos inferiores.',
        muscle_groups: ['quadríceps', 'glúteos', 'posterior de coxa'],
        equipment: ['barra', 'máquina smith', 'anilhas'],
        category: 'compound',
        difficulty: 'intermediate',
        youtube_video_id: 'ultWZbUMPL8',
        is_verified: true
      },
      {
        name: 'Levantamento Terra',
        description: 'Exercício para desenvolvimento posterior da coxa, glúteos e lombar.',
        muscle_groups: ['posterior de coxa', 'glúteos', 'lombar', 'trapézio'],
        equipment: ['barra', 'anilhas'],
        category: 'compound',
        difficulty: 'advanced',
        youtube_video_id: 'op9kVnSso6Q',
        is_verified: true
      },
      {
        name: 'Rosca Direta',
        description: 'Exercício de isolamento para desenvolvimento dos bíceps.',
        muscle_groups: ['bíceps'],
        equipment: ['barra', 'halteres'],
        category: 'isolation',
        difficulty: 'beginner',
        youtube_video_id: 'kwG2ipFRgfo',
        is_verified: true
      },
      {
        name: 'Tríceps Corda',
        description: 'Exercício de isolamento para desenvolvimento dos tríceps.',
        muscle_groups: ['tríceps'],
        equipment: ['cabo', 'corda'],
        category: 'isolation',
        difficulty: 'beginner',
        youtube_video_id: 'kiuVA0gs3EI',
        is_verified: true
      },
      {
        name: 'Desenvolvimento',
        description: 'Exercício para desenvolvimento dos deltoides.',
        muscle_groups: ['ombros', 'trapézio', 'tríceps'],
        equipment: ['barra', 'halteres', 'máquina'],
        category: 'compound',
        difficulty: 'intermediate',
        youtube_video_id: 'qEwKCR5JCog',
        is_verified: true
      },
      {
        name: 'Puxada Frontal',
        description: 'Exercício para desenvolvimento do dorsal.',
        muscle_groups: ['costas', 'bíceps', 'antebraço'],
        equipment: ['máquina', 'cabo'],
        category: 'compound',
        difficulty: 'intermediate',
        youtube_video_id: 'CAwf7n6Luuc',
        is_verified: true
      },
      {
        name: 'Leg Press',
        description: 'Exercício para desenvolvimento dos músculos inferiores em máquina.',
        muscle_groups: ['quadríceps', 'glúteos', 'posterior de coxa'],
        equipment: ['máquina'],
        category: 'compound',
        difficulty: 'intermediate',
        youtube_video_id: '8vk6rWMKEQw',
        is_verified: true
      },
      {
        name: 'Abdominal Reto',
        description: 'Exercício para desenvolvimento do abdômen.',
        muscle_groups: ['abdômen'],
        equipment: [],
        category: 'bodyweight',
        difficulty: 'beginner',
        youtube_video_id: '1fbU_MkV7NE',
        is_verified: true
      },
      {
        name: 'Flexão de Braço',
        description: 'Exercício com peso corporal para peito, ombros e tríceps.',
        muscle_groups: ['peito', 'ombros', 'tríceps'],
        equipment: [],
        category: 'bodyweight',
        difficulty: 'beginner',
        youtube_video_id: 'IODxDxX7oi4',
        is_verified: true
      }
    ];
    
    // Inserir exercícios
    const { error: insertError } = await supabase
      .from('exercises')
      .insert(sampleExercises);
    
    if (insertError) throw new Error(insertError.message);
    
    console.log(`${sampleExercises.length} exercícios iniciais inseridos com sucesso!`);
    return { success: true, count: sampleExercises.length, error: null };
  } catch (error) {
    console.error('Erro ao popular exercícios:', error);
    return { 
      success: false, 
      count: 0,
      error: error instanceof Error ? error.message : 'Erro desconhecido ao popular exercícios' 
    };
  }
}

export default { initializeDatabase, seedExercises }; 