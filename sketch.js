let trainGeo;
let routes = [];
let ding;
let db;

let startDropdown, endDropdown, msgInput, sendBtn, nameInput;

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCYqTDbVZB9my0u1p6wgH4jUmhH3-8tGu8",
  authDomain: "echoes-in-transit.firebaseapp.com",
  projectId: "echoes-in-transit",
  storageBucket: "echoes-in-transit.firebasestorage.app",
  messagingSenderId: "418859552197",
  appId: "1:418859552197:web:b5bd359c40bff8ddbccfac"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
function preload() {
  trainGeo = loadJSON("sydney_train_routes.geojson");
  ding = new p5.Oscillator('sine');
  ding.amp(0.04);
  ding.freq(900);
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();

  nameInput = select("#nameInput");
  startDropdown = select("#startDropdown");
  endDropdown = select("#endDropdown");
  msgInput = select("#msgInput");
  sendBtn = select("#sendBtn");
  sendBtn.mousePressed(sendMessage);

  populateStations();

  db.collection("messages").orderBy("timestamp").onSnapshot(snapshot => {
    routes = [];
    snapshot.docs.forEach(doc => {
      let d = doc.data();
      routes.push({
        coords: d.coords,
        msg: d.msg,
        sender: d.sender,
        t: random(1)
      });
    });
  });
}

function draw() {
  background(10, 10, 20);
  drawTrainLines();
  drawMessages();
}

function drawTrainLines() {
  noFill();
  stroke(255, 80, 160, 100);
  strokeWeight(1.5);

  for (let f of trainGeo.features) {
    if (!f.geometry) continue;
    let geom = f.geometry;
    if (geom.type === "LineString") {
      drawRoute(geom.coordinates);
    } else if (geom.type === "MultiLineString") {
      geom.coordinates.forEach(coords => drawRoute(coords));
    }
  }
}

function drawRoute(coords) {
  beginShape();
  for (let pt of coords) {
    let v = project(pt[0], pt[1]);
    vertex(v.x, v.y);
  }
  endShape();
}

function project(lon, lat) {
  let lonMin = 150.5, lonMax = 151.3;
  let latMin = -34.1, latMax = -33.7;
  let x = map(lon, lonMin, lonMax, 100, width - 100);
  let y = map(lat, latMin, latMax, height - 100, 100);
  return createVector(x, y);
}

function populateStations() {
  let seen = new Set();
  for (let f of trainGeo.features) {
    let geom = f.geometry;
    let coordsArr = (geom.type === "MultiLineString") ? geom.coordinates.flat() : geom.coordinates;
    coordsArr.forEach(pt => {
      let key = `${pt[0].toFixed(3)},${pt[1].toFixed(3)}`;
      if (!seen.has(key)) {
        startDropdown.option(key);
        endDropdown.option(key);
        seen.add(key);
      }
    });
  }
}

function drawMessages() {
  noStroke();
  fill("#a0f0f0");

  for (let r of routes) {
    let coords = r.coords;
    if (!coords || coords.length < 2) continue;

    let idx = r.t * (coords.length - 1);
    let i = floor(idx), f = idx - i;
    if (i >= coords.length - 1) i = coords.length - 2;

    let p1 = project(coords[i][0], coords[i][1]);
    let p2 = project(coords[i + 1][0], coords[i + 1][1]);
    let x = lerp(p1.x, p2.x, f);
    let y = lerp(p1.y, p2.y, f);

    ellipse(x, y, 8, 8);
    r.t += 0.002;
    if (r.t > 1) r.t = 0;

    if (dist(mouseX, mouseY, x, y) < 10) {
      fill(255);
      textAlign(CENTER);
      textSize(14);
      text(`${r.sender || "Anonymous"}: ${r.msg}`, x, y - 16);
    }
  }
}

function sendMessage() {
  let start = startDropdown.value();
  let end = endDropdown.value();
  let msg = msgInput.value().trim().slice(0, 240);
  let sender = nameInput.value().trim().slice(0, 50);

  if (!start || !end || start === end || !msg) return;

  let startCoords = start.split(",").map(Number);
  let endCoords = end.split(",").map(Number);

  let path = findNearestLine(startCoords, endCoords);
  if (!path) return;

  let messageData = {
    coords: path,
    msg: msg,
    sender: sender || "Anonymous",
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    t: 0
  };

  db.collection("messages").add(messageData);
  ding.start();
  ding.stop(0.2);

  msgInput.value("");
  nameInput.value("");
}

function findNearestLine(start, end) {
  let best = null;
  let bestDist = 999999;

  for (let f of trainGeo.features) {
    let geom = f.geometry;
    let allCoords = (geom.type === "MultiLineString") ? geom.coordinates.flat() : geom.coordinates;
    let s = allCoords[0];
    let e = allCoords[allCoords.length - 1];
    let d = dist(start[0], start[1], s[0], s[1]) + dist(end[0], end[1], e[0], e[1]);
    if (d < bestDist) {
      bestDist = d;
      best = allCoords;
    }
  }
  return best;
}
