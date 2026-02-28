// need cloudinary to hold profile images and other uploaded images
import { v2 as cloudinary } from "cloudinary";

import { unlink } from "node:fs/promises";

import { logger } from "../utils/logger.js";

import AppError from "../errors/AppError.js";

import "dotenv/config";

export default class Image {

  static tag = process.env.NODE_ENV === "test" ? "chinwag_test" : "chinwag";

  /**
   * Images can be used in the user profile or in messages
   *
   * @param {*} file is the value that multer gives us in req.file
   */
  constructor(file) {
    this.file = file;
  }

  /**
   *
   * @param {*} oldImageId any old image's public_id that should be cleared
   * @returns the public_id integer value
   */
  async uploadImage(oldImageId = null) {
    try {
      logger.info("in uploadFile: ", oldImageId);

      const options = {
        use_filename: true,
        unique_filename: true,
        resource_type: "image", //that's the default anyway
        folder: "chinwag",
        tags: [Image.tag],
      };

      const uploadResult = await new Promise((resolve, reject) => {
        try {
          cloudinary.uploader
            .upload_stream(options, (error, result) => {
              if (error || result?.error) return reject(error || result.error);
              resolve(result);
            })
            .end(this.file.buffer);
        } catch (err) {
          reject(err);
        }
      });

      if (!uploadResult) {
        throw new AppError("Cloudinary upload failed. Please check logs.");
      }
      logger.info("cloudinary upload succeeded: ", uploadResult);

      // if the upload worked, then delete any old image in cloudinary before returning
      if (oldImageId) {
        await Image.deleteImage(oldImageId);
      }
      return uploadResult;
    } catch (error) {
      logger.error("in uploadFile: found an error during upload?", error);

      logger.error(error, error.stack);
      throw error;
    }
  }

  /**
   * cleans up all the images from cloudinary based on the tags
   */
  static async deleteAll() {
    logger.info("in Image deleteAll");
    try {
      const deleteResult = await new Promise((resolve, reject) => {
        cloudinary.api.delete_resources_by_tag(
          Image.tag,
          (error, deleteResult) => {
            if (error) {
              return reject(error);
            }
            return resolve(deleteResult);
          },
        );
      });

      if (!deleteResult) {
        throw new AppError(
          "Cloudinary delete all images failed. Please check logs.",
        );
      }
      logger.info("cloudinary delete succeeded: ", deleteResult);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      } else {
        throw new AppError(
          "Failed to delete the cloudinary images",
          500,
          error,
        );
      }
    }
  }

  static async deleteImage(imageId) {
    logger.info("in deleteImage: ", imageId);

    try {
      // delete from Cloudinary
      const result = await cloudinary.uploader.destroy(imageId);
      logger.info("Cloudinary delete result for public_id: ", imageId);
      logger.info("cloudinary destroy command result: ", result);
      if (result.result !== "ok") {
        logger.warn("Cloudinary destroy returned:", result);
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      } else {
        throw new AppError("Failed to delete the image", 500, error);
      }
    }
  }

  static async deleteFromMemory(path) {
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
}