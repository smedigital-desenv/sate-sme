window.SATE = window.SATE || {};

window.SATE.AuthService = {
  async getSession() {
    const { data, error } = await window.SATE.supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  async getCurrentEmail() {
    const session = await this.getSession();
    if (session?.user?.email) return session.user.email;
    return window.SATE.env.DEV_USER_EMAIL || '';
  },

  async getCurrentUserProfile() {
    const email = await this.getCurrentEmail();
    if (!email) return { autorizado: false, erro: 'Usuário não autenticado e DEV_USER_EMAIL não definido.' };

    const { data, error } = await window.SATE.supabase
      .from('usuarios')
      .select('id,nome,email,perfil,ativo,is_dev,funcao,unidade_id,unidades:unidade_id(id,nome,endereco)')
      .ilike('email', email)
      .maybeSingle();

    if (error) throw error;
    if (!data) return { autorizado: false, erro: `E-mail não cadastrado no SATE: ${email}` };
    if (!data.ativo) return { autorizado: false, erro: 'Usuário inativo no sistema.' };

    return {
      autorizado: true,
      id: data.id,
      nome: data.nome || window.SATE.env.DEV_USER_NAME || email,
      email: data.email,
      unidadeId: data.unidade_id || null,
      unidade: data.unidades?.nome || data.funcao || 'Secretaria de Educação',
      perfil: data.perfil || 'Escola',
      isDev: !!data.is_dev
    };
  }
};
