// === Echoes in Transit (Sydney Edition) ===
// Interactive emotional map over Sydney train routes
// by bam-bina x GPT-5

let trainGeo;
let messages = [];
let stationInputStart, stationInputEnd, nameInput, messageInput, sendButton;
let font;
let firestore;

// Approximate bounds of Sydney area (for mapping coords)
let lonMin = 150.6;
let lonMax = 151.4;
let latMin = -34.1;
let latMax = -33.7;

// 🧩 Preload GeoJSON
function preload() {
  trainGeo = loadJSON('sydney_train_routes.json', onGeoLoaded, onGeoError);
}

// ✅ Successful load
function onGeoLoaded(data) {
  console.log('✅ GeoJSON loaded successfully');
  trainGeo = data;
}

// ❌ Load error
function onGeoError(err) {
  console.error('❌ Failed to load GeoJSON:', err);
}

// 🎬 Setup
function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('Press Start 2P');
  textAlign(CENTER);
  noLoop();

  // UI
  createUI();

  // Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBva3BFLhJhytiHAcIjgIYF6aSepG-a6v8",
  authDomain: "echoes-in-transit-v2.firebaseapp.com",
  projectId: "echoes-in-transit-v2",
  storageBucket: "echoes-in-transit-v2.firebasestorage.app",
  messagingSenderId: "252548572349",
  appId: "1:252548572349:web:2f172fbd17a3b6931c43d4"
};

  firebase.initializeApp(firebaseConfig);
  firestore = firebase.firestore();

  // Listen to updates
  firestore.collection("messages").onSnapshot((snapshot) => {
    messages = [];
    snapshot.forEach((doc) => {
      messages.push(doc.data());
    });
    redraw();
  });
}

// 📦 Create UI
function createUI() {
  const uiDiv = createDiv('').id('ui').style('position', 'absolute').style('top', '20px').style('left', '20px');

  nameInput = createInput('').attribute('placeholder', 'your name').parent(uiDiv);
  nameInput.style('display', 'block').style('margin-bottom', '8px');

  stationInputStart = createInput('').attribute('placeholder', 'start station').parent(uiDiv);
  stationInputStart.style('display', 'block').style('margin-bottom', '8px');

  stationInputEnd = createInput('').attribute('placeholder', 'end station').parent(uiDiv);
  stationInputEnd.style('display', 'block').style('margin-bottom', '8px');

  messageInput = createInput('').attribute('placeholder', 'unsent message...').parent(uiDiv);
  messageInput.style('display', 'block').style('margin-bottom', '8px').style('width', '240px');

  sendButton = createButton('SEND EMOTION').parent(uiDiv);
  sendButton.mousePressed(sendMessage);
}

// 💬 Send message
function sendMessage() {
  const name = nameInput.value();
  const start = stationInputStart.value();
  const end = stationInputEnd.value();
  const text = messageInput.value();

  if (name && start && end && text) {
    firestore.collection("messages").add({
      name: name,
      start: start,
      end: end,
      text: text,
      timestamp: Date.now()
    });
    messageInput.value('');
  }
}

// 🗺️ Draw
function draw() {
  background(10);

  // Draw Sydney outline (rough grid)
  stroke(40);
  for (let x = 100; x < width - 100; x += 50) line(x, 100, x, height - 100);
  for (let y = 100; y < height - 100; y += 50) line(100, y, width - 100, y);

  // Draw train routes
  if (trainGeo && trainGeo.features) {
    stroke(255, 255, 255, 80);
    strokeWeight(1.5);
    noFill();

    for (let f of trainGeo.features) {
      beginShape();
      for (let coord of f.geometry.coordinates) {
        let [lon, lat] = coord;
        let x = map(lon, lonMin, lonMax, 100, width - 100);
        let y = map(lat, latMin, latMax, height - 100, 100);
        vertex(x, y);
      }
      endShape();
    }
  }

  // Draw messages
  for (let m of messages) {
    const x = random(100, width - 100);
    const y = random(100, height - 100);
    fill(255);
    noStroke();
    textSize(8);
    text(`${m.name}: ${m.text}`, x, y);
  }

  // Title
  textSize(14);
  fill(255);
  text("ECHOES IN TRANSIT — SYDNEY TRAINS", width / 2, 40);
}
