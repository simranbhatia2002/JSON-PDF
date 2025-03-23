const express = require("express");
const multer = require("multer");
const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;

// Multer - Store in memory
const upload = multer({ storage: multer.memoryStorage() });

// Serve static files (for UI)
app.use(express.static(__dirname));

// Directory for PDFs
const outputDir = path.join(__dirname, "pdfs");
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

/**
 * ✅ Function to sanitize filenames (Removes invalid characters)
 */
const sanitizeFileName = (name) => {
  return name.replace(/[:<>"/\\|?*,&]/g, "_").trim();
};

/**
 * 🔹 Upload & Process JSON (No File Storage)
 */
app.post("/upload", upload.single("jsonFile"), (req, res) => {
  if (!req.file) return res.status(400).send("No file uploaded.");

  try {
    // Parse JSON from buffer
    const jsonData = JSON.parse(req.file.buffer.toString("utf-8"));
    let chatFiles = [];

    // Generate PDFs for each conversation
    jsonData.conversations.forEach((conversation, index) => {
      const chatName = sanitizeFileName(
        conversation.displayName || `Chat_${index + 1}`
      );
      const pdfPath = path.join(outputDir, `${chatName}.pdf`);
      const doc = new PDFDocument();
      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);

      // Title
      doc
        .fontSize(16)
        .text(`Chat with: ${conversation.displayName || "Unknown"}`, {
          underline: true,
        });
      doc.moveDown();

      // Messages
      conversation.MessageList.forEach((msg) => {
        doc
          .fontSize(12)
          .fillColor("blue")
          .text(`Sender: ${msg.displayName || "Unknown"}`);
        doc
          .fillColor("gray")
          .text(`Time: ${msg.originalarrivaltime || "No Timestamp"}`);
        doc
          .fillColor("black")
          .text(
            `Message: ${msg.content.replace(/<.*?>/g, "") || "No Content"}`
          );
        doc.moveDown();
      });

      doc.end();
      chatFiles.push({
        displayName: conversation.displayName,
        filename: `${chatName}.pdf`,
      });
    });

    res.json({ message: "PDFs generated successfully!", files: chatFiles });
  } catch (error) {
    console.error("JSON Parsing Error:", error);
    res.status(500).send("Invalid JSON format.");
  }
});

/**
 * 🔹 API to Download a PDF
 */
app.get("/download/:filename", (req, res) => {
  const filePath = path.join(outputDir, sanitizeFileName(req.params.filename));
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).send("File not found.");
  }
});

/**
 * 🔹 Serve UI for File Upload
 */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

/**
 * 🔹 Start Server
 */
app.listen(PORT, () => {
  console.log(` Server running on http://localhost:${PORT}`);
});
