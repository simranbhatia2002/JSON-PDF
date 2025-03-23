const express = require("express");
const fs = require("fs");
const PDFDocument = require("pdfkit");
const path = require("path");

const app = express();
const PORT = 3000;

// Load chat data from JSON
const jsonFile = path.join(__dirname, "messages.json");
const jsonData = JSON.parse(fs.readFileSync(jsonFile, "utf-8"));

// Generate individual PDFs for each chat
const generateIndividualPDFs = () => {
  const outputDir = path.join(__dirname, "pdfs");

  // Ensure the directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  jsonData.conversations.forEach((conversation, index) => {
    const pdfPath = path.join(outputDir, `chat_${index + 1}.pdf`);
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    // Add chat details
    doc
      .fontSize(16)
      .text(`Chat with: ${conversation.displayName || "Unknown"}`, {
        underline: true,
      });
    doc.moveDown();

    // Add messages
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
        .text(`Message: ${msg.content.replace(/<.*?>/g, "") || "No Content"}`);
      doc.moveDown();
    });

    doc.end();
  });
};

// Call this function once when the server starts
generateIndividualPDFs();

// Route to serve the homepage with available chats
app.get("/", (req, res) => {
  let links = jsonData.conversations
    .map(
      (_, index) =>
        `<li><a href="/download/chat_${index + 1}.pdf">Download Chat ${
          index + 1
        }</a></li>`
    )
    .join("");

  res.send(`
    <h1>Download Individual Chats</h1>
    <ul>${links}</ul>
  `);
});

// Route to serve individual PDFs
app.get("/download/:filename", (req, res) => {
  const filePath = path.join(__dirname, "pdfs", req.params.filename);
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).send("File not found");
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
