import express from 'express';
import upload from '../middleware/multer.js';
import { uploadImage, deleteImage } from '../controllers/upload.Controller.js';

const router = express.Router();

router.post('/image', upload.single('image'), uploadImage);
router.delete('/image', deleteImage);

export default router;
