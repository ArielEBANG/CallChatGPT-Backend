const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fileUpload = require("express-fileupload");
const axios = require("axios");
const pdf = require("pdf-parse");
const mammoth = require("mammoth");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 8000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 }, // Limite de taille de fichier à 50MB
}));

app.post("/api/submit", async (req, res) => {
  const {
    filledPrompt,
  } = req.body;

  const file = req.files?.my_file;
  console.log('Received file:', file);

  if (!file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    let fileContent;
    const fileType = file.mimetype;

    if (fileType === 'application/pdf') {
      const pdfData = await pdf(file.data);
      fileContent = pdfData.text;
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer: file.data });
      fileContent = result.value;
    } else if (fileType === 'text/plain') {
      fileContent = file.data.toString('utf8');
    } else {
      return res.status(400).json({ error: "Unsupported file type" });
    }

    async function getSummary(fileText) {
      const apiKey = process.env.OPENAI_API_KEY;

      const body = {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "Vous êtes un assistant utile.",
          },
          {
            role: "user",
            content: `${filledPrompt} le tout en format JSON clé valeurs. Les clés seront : Analyse_synthetique, 
            Points_forts, Points_faibles et Questions_entretien. ${fileText}`
          },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      };

      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      };

      try {
        const response = await axios.post("https://api.openai.com/v1/chat/completions", body, {
          headers: headers,
        });

        if (response.data && response.data.choices && response.data.choices.length > 0) {
          return response.data.choices[0].message.content;
        } else {
          throw new Error("No choices found in the response.");
        }
      } catch (error) {
        console.error("Error:", error.message);
        throw error;
      }
    }

    const summary = await getSummary(fileContent);
    res.status(200).json({ summary });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => console.log(`Server is running on port ${port}`));