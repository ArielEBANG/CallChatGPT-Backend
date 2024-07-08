const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const multer = require("multer");
const fs = require("fs");
const axios = require("axios");
const pdf = require("pdf-parse");
const fileUpload = require('express-fileupload');
require("dotenv").config();

const app = express();
const port = process.env.PORT || 8000;

const upload = multer({ dest: "uploads/" });

app.use(cors());
app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 },
}));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.post("/api/submit", async (req, res) => {
  const {
    empathy,
    coefEmp,
    observation,
    coefObs,
    adaptation,
    coefAdapt,
    analyticsReasoning,
    coefAnalytics,
    collaboration,
    coefCollab,
    createReasoning,
    coefCreate,
    planification,
    coefPlan,
    perseverance,
    coefPers,
    memory,
    coefMem,
    emotion,
    coefEmotion,
    job,
    prompt,
  } = req.body;

  const file = req.files.my_file;
  console.log('file', file);
  // console.log('my_file', file);
  // const file = my_file;

  if (!file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  
  try {
    const fileContent = await pdf(file.data);

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
            // content: `En tant que recruteur ou RH, je souhaite analyser, interpréter et utiliser les résultats d’un candidat suite à 
            //           l’évaluation de plusieurs compétences cognitives. Le candidat a obtenu un résultat de ${empathy}% en empathie de pondération 
            //           ${coefEmp}, ${observation}% en observation de pondération ${coefObs}, ${adaptation}% en adaptation de pondération ${coefAdapt}, 
            //           ${analyticsReasoning}% en raisonnement analytique de pondération ${coefAnalytics}, ${collaboration}% 
            //           en collaboration de pondération ${coefCollab}, ${createReasoning}% en raisonnement créatif de pondération ${coefCreate}, 
            //           ${planification}% en planification de pondération ${coefPlan}, ${perseverance}% en persévérance de pondération ${coefPers}, 
            //           ${memory}% en mémoire de pondération ${coefMem} et ${emotion}% en émotions de pondération ${coefEmotion}. 
            //           Job: ${job}.
            //           Document content: ${fileText}.
            //           ${prompt}`,
            // content: `${job}, ${prompt} ${fileText}`
            content: `${prompt} ${fileText}`
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
          console.log(response.data.choices[0]);
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
