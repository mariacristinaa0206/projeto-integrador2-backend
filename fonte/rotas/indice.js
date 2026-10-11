import { Router } from 'express';
import { verificarSaude } from '../controladores/saude.controlador.js';
import rotasAlertas from './alertas.rotas.js';
import rotasAlunos from './alunos.rotas.js';
import rotasAuditoria from './auditoria.rotas.js';
import rotasAutenticacao from './autenticacao.rotas.js';
import rotasConteudos from './conteudos.rotas.js';
import rotasConversas from './conversas.rotas.js';
import rotasFeedbacks from './feedbacks.rotas.js';
import rotasMetas from './metas.rotas.js';
import rotasNotificacoes from './notificacoes.rotas.js';
import rotasOrientacoes from './orientacoes.rotas.js';
import rotasPainel from './painel.rotas.js';
import rotasPerfil from './perfil.rotas.js';
import rotasRegistros from './registros.rotas.js';
import rotasRelatorios from './relatorios.rotas.js';
import rotasSessoes from './sessoes.rotas.js';
import rotasUsuarios from './usuarios.rotas.js';
import rotasVinculos from './vinculos.rotas.js';

const roteador = Router();

// Respostas da API não devem ser guardadas em cache (têm dados pessoais e de saúde).
roteador.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

roteador.get('/saude', verificarSaude);
roteador.use('/autenticacao', rotasAutenticacao);
roteador.use('/perfil', rotasPerfil);
roteador.use('/usuarios', rotasUsuarios);
roteador.use('/alunos', rotasAlunos);
roteador.use('/registros', rotasRegistros);
roteador.use('/orientacoes', rotasOrientacoes);
roteador.use('/conteudos', rotasConteudos);
roteador.use('/metas', rotasMetas);
roteador.use('/sessoes', rotasSessoes);
roteador.use('/conversas', rotasConversas);
roteador.use('/feedbacks', rotasFeedbacks);
roteador.use('/notificacoes', rotasNotificacoes);
roteador.use('/alertas', rotasAlertas);
roteador.use('/vinculos', rotasVinculos);
roteador.use('/relatorios', rotasRelatorios);
roteador.use('/painel', rotasPainel);
roteador.use('/auditoria', rotasAuditoria);

export default roteador;
