const express = require('express');
const fs = require('fs');
const csvParser = require('csv-parser');
const { RandomForestClassifier } = require('random-forest-classifier');
const cors = require('cors'); // Import the cors package
const app = express();
const port = 5500;
app.use(cors());

let df = []; // Initialize an empty array to store the data

// Read the CSV file and store the data in the 'df' array
fs.createReadStream('./Crop_recommendation.csv')
  .pipe(csvParser())
  .on('data', (row) => {
    df.push(row);
  })
  .on('end', () => {
    console.log('CSV file successfully loaded.');

    // Proceed with model training and setup the prediction endpoint
    setupModelAndEndpoints();
  });

function splitData(data, testSize) {
  const features = data.map((row) => {
    // N,P,K,temperature,humidity,ph,rainfall,label
    
    return [parseFloat(row['N']), parseFloat(row['P']), parseFloat(row['K']), parseFloat(row['temperature']), parseFloat(row['humidity']), parseFloat(row['ph']), parseFloat(row['rainfall']) /* add more features here */];
  });

  const labels = data.map((row) => {
    return parseInt(row['label']); // Assuming 'label' is an integer representing the target class
  });

  // Split data into training and testing sets
  const trainSize = Math.floor((1 - testSize) * features.length);
  const trainFeatures = features.slice(0, trainSize);
  const testFeatures = features.slice(trainSize);
  const trainLabels = labels.slice(0, trainSize);
  const testLabels = labels.slice(trainSize);

  return { trainFeatures, testFeatures, trainLabels, testLabels };
}

function setupModelAndEndpoints() {
  // Separate features and target label
  const features = df.map(item => [parseFloat(item.N), parseFloat(item.P), parseFloat(item.K), parseFloat(item.temperature), parseFloat(item.humidity), parseFloat(item.ph), parseFloat(item.rainfall)]);
  const labels = df.map(item => parseInt(item.label));

  // Split the data into training and testing sets (80% train, 20% test)
  const { trainFeatures, testFeatures, trainLabels, testLabels } = splitData(df, 0.2);

  // Initialize the Random Forest model with 20 trees
  const randomForest = new RandomForestClassifier({ nEstimators: 20 });

  // Train the model using the fit method
  randomForest.fit(trainFeatures, trainLabels);

    // For the home route, send the index.html
    app.get('/', (req, res) => {
        res.sendFile(__dirname + '/index.html');
      });

  // Making a prediction
  app.post('/predict', express.json(), (req, res) => {
    const data = req.body;

    // Assuming the 'data' sent from the client is an object containing the input features
    const inputFeatures = [parseFloat(data.N), parseFloat(data.P), parseFloat(data.K), parseFloat(data.temperature), parseFloat(data.humidity), parseFloat(data.ph), parseFloat(data.rainfall)];

    // Make predictions using the trained Random Forest model
    const predictedCrop = randomForest.predict([inputFeatures]);

    // Send the predicted crop back to the client
    res.json({ predictedCrop: predictedCrop[0] });
  });



  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}
