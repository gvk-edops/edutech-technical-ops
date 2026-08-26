import cloudinary from "../config/cloudinary.config.js";

export const uploadImage = async (req, res) => {
  try {
    const { employeeNic, uploadType } = req.body;

    // Determine folder path based on upload type
    let folderPath;
    if (uploadType === "system_logo") {
      folderPath = "system/logo";
    } else if (employeeNic) {
      // Profile photos: employees/{NIC}/
      // Documents: employees/{NIC}/documents/
      folderPath =
        uploadType === "documents"
          ? `employees/${employeeNic}/documents`
          : `employees/${employeeNic}`;
    } else {
      return res.status(400).json({
        success: false,
        error: "Employee NIC is required for employee file uploads",
      });
    }

    const result = await cloudinary.uploader.upload_stream(
      {
        folder: folderPath,
        resource_type: "auto",
      },
      (error, result) => {
        if (error)
          return res.status(500).json({ success: false, error: error.message });
        res.json({
          success: true,
          data: { url: result.secure_url, publicId: result.public_id },
        });
      },
    );
    req.file.stream.pipe(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteImage = async (req, res) => {
  try {
    const { publicId } = req.body;
    // Use 'image' resource type for employee photos, or 'auto' to let Cloudinary detect
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
