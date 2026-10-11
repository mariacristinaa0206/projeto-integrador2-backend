import { Router } from 'express';
import { PAPEIS } from '../configuracao/constantes.js';
import * as controlador from '../controladores/auditoria.controlador.js';
import { autenticar, exigirPapel } from '../intermediarios/autenticar.js';
import { validar } from '../intermediarios/validar.js';
import { consultaAuditoria } from '../validadores/auditoria.js';

const roteador = Router();

// Trilha de auditoria (RNF10): só leitura, só administrador. Nada é alterado nem apagado pela API.
roteador.use(autenticar, exigirPapel(PAPEIS.ADMINISTRADOR));

roteador.get('/', validar({ consulta: consultaAuditoria }), controlador.listar);

export default roteador;
