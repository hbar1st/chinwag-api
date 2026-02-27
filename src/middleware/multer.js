import multer from "multer";
import logger from "../utils/logger.js";
import ValidationError from "../errors/ValidationError.js";

const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // value of 10MB transferred to bytes

export function createUploader({ maxFileSize = DEFAULT_MAX_FILE_SIZE } = {}) {
  //Multer Configuration to store the file in memory on its way to cloudinary
  // the file info will contain a field called buffer that contains the entire file.
  const storage = multer.memoryStorage();

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: maxFileSize,
      files: 1,
    },
  });
}

 
function fileFilter(_req, file, cb) {
  // The function should call `cb` with a boolean
  // to indicate if the file should be accepted

  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new ValidationError("Image file type is expected"), false); //reject the file
  }

  // You can always pass an error if something goes wrong:
  //cb(new Error("I don't have a clue!"));
}

/**
 * assumes that the field name is image
 * but we will need a TODO to use a different name for message uploads
 * 
 * @param {} req 
 * @param {*} res 
 * @returns 
 */
export function runMulter(req, res, options = {}) {
   const upload = createUploader(options);

   return new Promise((resolve, reject) => {
     upload.single("image")(req, res, (err) => {
       if (err) {
         logger.warn("about to reject the file upload");
         return reject(err);
       }

       resolve(req.file);
     });
   });
 }
