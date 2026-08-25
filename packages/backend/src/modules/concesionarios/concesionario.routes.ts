/**
 * Rutas del módulo Concesionarios.
 *
 * Router de Express montado en /api/v1/concesionarios desde src/index.ts.
 */

import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '@middleware/requireAuth';
import { requireAdmin } from '@middleware/requireAdmin';
import {
  listConcesionarios,
  getConcesionario,
  createConcesionario,
  updateConcesionario,
  deleteConcesionario,
  getHistorialEstados,
  subirImagenConcesionario,
  quitarImagenConcesionario,
} from './concesionario.controller';

const concesionariosRouter: Router = Router();

const subidaImagen = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\//.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('El archivo debe ser una imagen'));
    }
  },
});

concesionariosRouter.get('/', requireAuth, listConcesionarios);
concesionariosRouter.get('/:id', requireAuth, getConcesionario);
concesionariosRouter.get('/:id/historial-estados', requireAuth, getHistorialEstados);
concesionariosRouter.post('/', requireAdmin, createConcesionario);
concesionariosRouter.put('/:id', requireAdmin, updateConcesionario);
concesionariosRouter.post('/:id/imagen', requireAdmin, subidaImagen.single('imagen'), subirImagenConcesionario);
concesionariosRouter.delete('/:id/imagen', requireAdmin, quitarImagenConcesionario);
concesionariosRouter.delete('/:id', requireAdmin, deleteConcesionario);

export default concesionariosRouter;
