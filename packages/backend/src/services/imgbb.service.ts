/**
 * Servicio de integración con ImgBB.
 *
 * Sube imágenes (buffer) a https://api.imgbb.com/1/upload usando la clave
 * IMGBB_API_KEY del entorno y devuelve la URL pública resultante.
 * La API pública de ImgBB no ofrece borrado; al reemplazar la imagen de un
 * concesionario la anterior queda huérfana (decisión aceptada).
 */

import axios from 'axios';
import { ApiError } from '@utils/helpers';

const IMGBB_UPLOAD_URL = 'https://api.imgbb.com/1/upload';
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

interface ImgbbResponse {
  success: boolean;
  status: number;
  data: {
    url?: string;
    display_url?: string;
    delete_url?: string;
  };
}

function obtenerApiKey(): string {
  const key = process.env.IMGBB_API_KEY;
  if (!key) {
    throw new ApiError('El servidor no tiene configurada IMGBB_API_KEY', 500);
  }
  return key;
}

/** Valida tamaño/tipo y sube la imagen a ImgBB. Devuelve la URL pública. */
export async function subirImagen(file: Express.Multer.File): Promise<string> {
  if (!file || !file.buffer) {
    throw new ApiError('El archivo de imagen es requerido', 400);
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new ApiError('La imagen no debe superar los 5 MB', 400);
  }
  if (!/^image\//.test(file.mimetype)) {
    throw new ApiError('El archivo debe ser una imagen', 400);
  }

  const base64 = file.buffer.toString('base64');
  const body = new URLSearchParams({ image: base64 }).toString();

  try {
    const respuesta = await axios.post<ImgbbResponse>(IMGBB_UPLOAD_URL, body, {
      params: { key: obtenerApiKey() },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 30000,
    });

    const url = respuesta.data?.data?.url ?? respuesta.data?.data?.display_url;
    if (!respuesta.data?.success || !url) {
      throw new ApiError('ImgBB no devolvió una URL válida', 502);
    }
    return url;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const msg = error.response?.data?.error?.message ?? error.message;
      if (status === 400) {
        throw new ApiError(`ImgBB rechazó la imagen: ${msg}`, 400);
      }
      if (status === 403) {
        throw new ApiError('Clave de API de ImgBB inválida o sin acceso', 403);
      }
      if (status) {
        throw new ApiError(`Error de ImgBB (HTTP ${status}): ${msg}`, 502);
      }
      throw new ApiError(`Error de conexión con ImgBB: ${msg}`, 502);
    }
    throw new ApiError('Error al subir la imagen a ImgBB', 502);
  }
}
