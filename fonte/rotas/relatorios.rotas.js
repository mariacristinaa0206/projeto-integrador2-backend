import { Router } from 'express';
import * as controlador from '../controladores/relatorio.controlador.js';
import { autenticar } from '../intermediarios/autenticar.js';
import { corpoJson } from '../intermediarios/corpoJson.js';
import { limitadorRelatorios } from '../intermediarios/limitadores.js';
import { validar } from '../intermediarios/validar.js';
import { parametrosIdEsquema } from '../validadores/comuns.js';
import { consultaRelatorios, esquemaGerarRelatorio } from '../validadores/relatorio.js';

const roteador = Router();

// Quem pode gerar cada tipo (e para quem) é decidido no serviço: emocional (si mesmo ou aluno vinculado),
// pedagógico (painéis coletivos) e estatístico (administrador).
roteador.use(autenticar);

roteador.post('/', limitadorRelatorios, corpoJson(), validar({ corpo: esquemaGerarRelatorio }), controlador.gerar);
roteador.get('/', validar({ consulta: consultaRelatorios }), controlador.listar);
roteador.get('/:id', validar({ parametros: parametrosIdEsquema }), controlador.obter);

export default roteador;
