// need cloudinary to hold profile images and other uploaded images
//import { v2 as cloudinary } from "cloudinary";

const { unlink } = require("node:fs/promises");

import { logger } from "../utils/logger.js";

import AppError from "../errors/AppError.js";

//import { runMulter } from "../middleware/multer.js";

export default class Image {
  /**
   * Images can be used in the user profile or in messages
   *
   * @param {*} type is either 'profile' or 'message'
   */
  constructor(type = "profile") {
    this.type = type;
  }

  async addImageToProfile(req, res) {
    //const user = req.user;
    try {
      const file = req.file;  //await runMulter(req, res); -- we already ran multer in the validation step

      logger.info("in uploadFile: ", file, req.body);

      //const { originalname } = file;

      logger.info("file details from multer: ", file);
/*
      const options = {
        use_filename: true,
        overwrite: true,
        unique_filename: true,
        resource_type: "image",
        folder: "TOP-creations-showcase-app",
      };
*/
      // determine if this profile already has a featured image and replace it if so in cloudinary by setting its public_id in the options object
      /*
    const imageRow = await getProfileImage(user.id);
    if (imageRow) {
      options.public_id = imageRow.public_id.split("/")[1];
    }
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(options, (error, uploadResult) => {
          if (error) {
            return reject(error);
          }
          return resolve(uploadResult);
        })
        .end(file.buffer);
    });

      if (!uploadResult) {
        throw new AppError("Cloudinary upload failed. Please check logs.");
      }
      logger.info("cloudinary upload succeeded: ", uploadResult);

      //const dbCommand = imageRow ? updateImage : addNewImage;

      const newImageRow = await upsertImage(
        user.id,
        originalname,
        uploadResult.public_id,
        uploadResult.resource_type,
        uploadResult.secure_url,
      );

      if (newImageRow) {
        res.status(200).json({ status: "success", url: newImageRow.url });
      } else {
        throw new AppError("Unexpected error: failed to add the image");
      }
      */
    } catch (error) {
      logger.error("in uploadFile: found an error during upload?", error);
      /*
      if (uploadResult) {
        // clean up the file from cloudinary since we failed to store a record of it in postgresql
        const result = await cloudinary.uploader.destroy(uploadResult.public_id);
        logger.info(result);
      }
      */
      logger.error(error, error.stack);
      throw error;
    }

    res.status(200).end(); //temporary code TODO delete it!
  }

  async deleteFromMemory(path) {
    try {
      await unlink(path);
      logger.info(`successfully deleted ${path}`);
    } catch (error) {
      logger.info(
        "there was an error deleting a file from memory:",
        error.message,
      );
      throw new AppError("Unexpected error.", 500, error);
    }
  }
  /*
  async deleteProfileImage(req, res) {
    console.log("in deleteProjectImage");

    try {
      const deletedImage = await dbDeleteProfileImage(req.params.pid);
      if (deletedImage) {
        // delete from Cloudinary too
        const result = await cloudinary.uploader.destroy(deletedImage.public_id);
        console.log(result);
        res
          .status(200)
          .json({ status: "success", message: "Image delete complete." });
      } else {
        throw new AppError(
          "Failed to delete the image records. Contact support.",
          500,
        );
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      } else {
        throw new AppError("Failed to delete the project record", 500, error);
      }
    }
  }

  async deleteImage(req, res) {
    console.log("in deleteImage");

    try {
      // before deleting the project, delete the image(s) from cloudinary.
      const images = await getProfileImage(req.params.pid);
      console.log(images);
      if (images) {
        const deletedImage = await dbDeleteProfileImage(req.params.pid);
        if (!deletedImage) {
          throw new AppError(
            "Failed to delete the project and related image file",
          );
        }

        // delete from Cloudinary too
        images.forEach(async (image) => {
          const result = await cloudinary.uploader.destroy(image.public_id);
          console.log(
            "Cloudinary delete result for public_id: ",
            image.public_id,
          );
          console.log(result);
        });
      }

      res.status(204).end();
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      } else {
        throw new AppError("Failed to delete the project record", 500, error);
      }
    }
  }
  */
}
