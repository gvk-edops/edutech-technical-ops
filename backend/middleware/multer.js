import multer from "multer";
import { Readable } from 'stream';

const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only images and PDFs allowed'), false);
        }
    }
});

upload.single = (fieldName) => {
    const middleware = multer({ storage, limits: upload.limits, fileFilter: upload.fileFilter }).single(fieldName);
    return (req, res, next) => {
        middleware(req, res, (err) => {
            if (err) return next(err);
            if (req.file) req.file.stream = Readable.from(req.file.buffer);
            next();
        });
    };
};

export default upload;