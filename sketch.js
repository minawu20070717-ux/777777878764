let video;
let handPose;
let hands = [];

// 系統狀態：START_SCREEN (遊戲說明首頁), LOADING (載入中), PLAYING (進行中)
let systemState = "START_SCREEN"; 
let bootProgress = 0; 
let isModelReady = false; 

// 遊戲邏輯與計分
let score = 0;
let itemX, itemY;
let itemSpeed = 2.0; // 舒適平穩的慢速，絕不突然加速

let bucketX;
let bucketTargetX;
let bucketY;
let bucketWidth, bucketHeight;

// 首頁按鈕座標
let btnX, btnY, btnW, btnH;

// 資料庫：區分正確的分類 Tag (RECYCLABLE 與 TRASH)
const recyclablePool = [
    { name: "⚡ 鋰電池核心", type: "RECYCLABLE" },
    { name: "💾 量子磁碟", type: "RECYCLABLE" },
    { name: "🔌 奈米線材", type: "RECYCLABLE" },
    { name: "📱 壞處理器", type: "RECYCLABLE" }
];

const trashPool = [
    { name: "☢️ 輻射廢料", type: "TRASH" },
    { name: "⚠️ 工業機油", type: "TRASH" },
    { name: "📦 裂解塑料", type: "TRASH" },
    { name: "🧪 實驗殘渣", type: "TRASH" }
];

let currentGesture = "防禦系統準備就緒...";

function preload() {
    handPose = ml5.handPose(modelReady);
}

function modelReady() {
    isModelReady = true;
}

function setup() {
    // 完美的 4:3 手機/電腦自適應比例
    let canvasW = min(windowWidth - 20, 640);
    let canvasH = (canvasW / 4) * 3; 
    
    let canvas = createCanvas(canvasW, canvasH);
    canvas.parent('game-container');
    rectMode(CENTER);

    bucketWidth = width * 0.25;
    bucketHeight = height * 0.1;

    // 首頁按鈕位置優化
    btnX = width / 2;
    btnY = height * 0.8;
    btnW = width * 0.45;
    btnH = height * 0.12;

    video = createCapture(VIDEO);
    video.size(canvasW, canvasH);
    video.hide();

    handPose.detectStart(video, gotHands);

    resetItem();
    bucketX = width / 2;
    // 垃圾桶安全高度：保證手部在螢幕中央即可控，絕不沉入鏡頭死角
    bucketY = height - (bucketHeight + 70); 
    bucketTargetX = width / 2;
}

function gotHands(results) {
    hands = results;
}

function draw() {
    // 100% 正確的物理鏡像翻轉，玩家看畫面就像照鏡子
    push();
    translate(width, 0);
    scale(-1, 1);
    image(video, 0, 0, width, height);
    pop();

    background(10, 10, 20, 220);

    if (systemState === "START_SCREEN") {
        drawStartScreen();
    } else if (systemState === "LOADING") {
        drawLoadingScreen();
    } else if (systemState === "PLAYING") {
        drawGameCore();
    }
}

// 📄 📄 升級：地表最直覺、超好懂的「圖文遊戲規則」首頁
function drawStartScreen() {
    fill(0, 242, 254);
    noStroke();
    textSize(width * 0.055);
    textAlign(CENTER, CENTER);
    text("🛸 賽博垃圾分類大挑戰", width / 2, height * 0.15);

    // 遊戲說明外框
    stroke(0, 242, 254, 40);
    fill(255, 255, 255, 12);
    rect(width / 2, height * 0.46, width * 0.9, height * 0.42, 10);

    noStroke();
    textAlign(CENTER, CENTER);
    
    // 核心概念一目了然
    fill(255, 240, 0);
    textSize(width * 0.04);
    text("【 只要一隻手，隔空就能玩 】", width / 2, height * 0.3);

    // 回收規則
    textSize(width * 0.035);
    textAlign(LEFT, CENTER);
    
    fill(0, 255, 153);
    text("🖐️ 張開手掌 ➔ 磁盾去【左邊】資源回收區", width * 0.08, height * 0.38);
    fill(255, 255, 255, 180);
    textSize(width * 0.028);
    text(" (接住: ⚡電池、💾磁碟、🔌線材、📱晶片)", width * 0.08, height * 0.43);

    // 廢料規則
    textSize(width * 0.035);
    fill(255, 0, 127);
    text("✊ 捏緊拳頭 ➔ 磁盾去【右邊】終端廢料區", width * 0.08, height * 0.51);
    fill(255, 255, 255, 180);
    textSize(width * 0.028);
    text(" (接住: ☢️輻射、⚠️機油、📦塑料、🧪殘渣)", width * 0.08, height * 0.56);

    // 溫馨提醒
    fill(255, 255, 255, 120);
    textSize(width * 0.026);
    textAlign(CENTER, CENTER);
    text("※ 請將手舉在螢幕正中央，不需觸碰滑鼠鍵盤", width / 2, height * 0.63);

    // 「開始挑戰」按鈕
    stroke(0, 242, 254);
    strokeWeight(2);
    if (mouseX > btnX - btnW/2 && mouseX < btnX + btnW/2 && mouseY > btnY - btnH/2 && mouseY < btnY + btnH/2) {
        fill(0, 242, 254, 70); 
        cursor(HAND);
    } else {
        fill(0, 242, 254, 25);
        cursor(ARROW);
    }
    rect(btnX, btnY, btnW, btnH, 6);

    noStroke();
    fill(0, 242, 254);
    textSize(width * 0.045);
    text("開啟 AI 系統 ➔", btnX, btnY);
}

function mousePressed() {
    if (systemState === "START_SCREEN") {
        if (mouseX > btnX - btnW/2 && mouseX < btnX + btnW/2 && mouseY > btnY - btnH/2 && mouseY < btnY + btnH/2) {
            systemState = "LOADING"; 
        }
    }
}

// 🤖 載入中畫面
function drawLoadingScreen() {
    cursor(ARROW);
    if (bootProgress < 75) {
        bootProgress += 2.5; 
    } else if (bootProgress >= 75 && bootProgress < 99 && isModelReady) {
        bootProgress += 4.0; 
    } else if (isModelReady && bootProgress >= 99) {
        bootProgress = 100;  
    }

    if (bootProgress >= 100) {
        systemState = "PLAYING";
        return;
    }

    stroke(0, 242, 254, 80);
    strokeWeight(1);
    noFill();
    rect(width / 2, height / 2, width * 0.8, height * 0.5, 8);

    noStroke();
    fill(0, 242, 254);
    textSize(width * 0.045);
    textAlign(CENTER, CENTER);
    text("// AI 神經網路建立中 //", width / 2, height / 2 - (height * 0.1));
    
    textSize(width * 0.032);
    fill(255, 200);
    let displayPercent = floor(bootProgress);
    text("安全協議初始化... " + displayPercent + "%", width / 2, height / 2);

    noFill();
    stroke(0, 242, 254, 50);
    rect(width / 2, height / 2 + (height * 0.1), width * 0.5, 12, 6);
    
    fill(0, 242, 254, 200);
    noStroke();
    let maxBarW = width * 0.5 - 4;
    let currentBarWidth = map(displayPercent, 0, 100, 0, maxBarW);
    
    rectMode(LEFT); 
    rect(width / 2 - maxBarW/2, height / 2 + (height * 0.1), currentBarWidth, 8, 4);
    rectMode(CENTER); 
}

// 🎮 遊戲核心
function drawGameCore() {
    drawTechHUD();
    processHandTracking();
    manageFallingObjects();
    updateTechBucket();
    drawUI();
}

// 🌌 升級：背景色彩全幅視覺引導，讓玩家知道左右磁場區隔
function drawTechHUD() {
    strokeWeight(1);
    
    // 【左半邊】資源回收底色提示 (綠霓虹)
    fill(0, 255, 153, 15);
    stroke(0, 255, 153, 50);
    rect(width * 0.25, height / 2, width / 2 - 12, height - 20, 8);
    
    // 【右半邊】終端廢料底色提示 (粉紅霓虹)
    fill(255, 0, 127, 15);
    stroke(255, 0, 127, 60);
    rect(width * 0.75, height / 2, width / 2 - 12, height - 20, 8);

    noStroke();
    textSize(width * 0.028); 
    fill(0, 255, 153);
    textAlign(LEFT, TOP);
    text(">>【核心回收】\n🖐️ 請張開手掌\n(電池/晶片/線材)", 15, 20);

    fill(255, 0, 127);
    textAlign(RIGHT, TOP);
    text("【終端廢料】 <<\n✊ 請握拳/捏緊\n(輻射/機油/塑料)", width - 15, 20);
}

function processHandTracking() {
    if (hands.length > 0) {
        let hand = hands[0];
        
        // 抓取最乾淨的原生視訊數據
        let rawThumbX = hand.thumb_tip.x;
        let rawThumbY = hand.thumb_tip.y;
        let rawIndexX = hand.index_finger_tip.x;
        let rawIndexY = hand.index_finger_tip.y;

        // 【100% 錯誤修正核心 1】指尖物理距離計算完全不經鏡像加工，維持最原始的物理數據
        let d = dist(rawThumbX, rawThumbY, rawIndexX, rawIndexY);

        // 僅在「視覺渲染」時進行網頁鏡像(width - x)轉換
        let displayThumbX = width - rawThumbX;
        let displayThumbY = rawThumbY;
        let displayIndexX = width - rawIndexX;
        let displayIndexY = rawIndexY;

        // 渲染藍色關節骨骼點
        for (let i = 0; i < hand.keypoints.length; i++) {
            let kp = hand.keypoints[i];
            fill(0, 242, 254, 220);
            noStroke();
            ellipse(width - kp.x, kp.y, 5, 5);
        }

        // 靈敏度優化閾值
        let closeThresh = 45; 
        let openThresh = 75;  

        if (d < closeThresh) { 
            // 捏拳/握拳 -> 垃圾桶分配至右側
            currentGesture = "系統狀態: 偵測到脈衝拳壓 // 磁場調向右側";
            bucketTargetX = width * 0.75; 
            
            stroke(255, 0, 127, 230);
            strokeWeight(3);
            line(displayThumbX, displayThumbY, displayIndexX, displayIndexY);
            
            fill(255, 0, 127);
            noStroke();
            ellipse((displayThumbX + displayIndexX) / 2, (displayThumbY + displayIndexY) / 2, 8, 8);
        } else if (d > openThresh) {
            // 張開手 -> 垃圾桶分配至左側
            currentGesture = "系統狀態: 偵測到全面張力 // 磁場調向左側";
            bucketTargetX = width * 0.25; 
            
            stroke(0, 255, 153, 230);
            strokeWeight(2);
            line(displayThumbX, displayThumbY, displayIndexX, displayIndexY);
        }
    } else {
        currentGesture = "安全警告: 未偵測到生物手勢訊號...";
    }
}

function resetItem() {
    itemY = -30;
    itemX = random(width * 0.22, width * 0.78);
    itemSpeed = 2.0; // 絕對恆定慢速度，保證新手能輕鬆上手

    if (random(1) > 0.5) {
        let selected = random(recyclablePool);
        itemName = selected.name;
        itemType = selected.type; 
    } else {
        let selected = random(trashPool);
        itemName = selected.name;
        itemType = selected.type; 
    }
}

function manageFallingObjects() {
    itemY += itemSpeed;

    push();
    stroke(0, 242, 254, 200);
    strokeWeight(1.2);
    fill(5, 10, 25, 240);
    let cardW = width * 0.32; 
    rect(itemX, itemY, cardW, 32, 4);

    noStroke();
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(width * 0.026);
    text(itemName, itemX, itemY);
    pop();

    // 加寬碰撞判定盒
    let withinX = (itemX > bucketX - bucketWidth / 2 - 25) && (itemX < bucketX + bucketWidth / 2 + 25);
    let withinY = (itemY >= bucketY - bucketHeight / 2 - 15) && (itemY <= bucketY + bucketHeight / 2 + 15);

    if (withinX && withinY) {
        // 【100% 錯誤修正核心 2】不再用 bucketX 座標去猜。
        // 當垃圾桶目標點在 width*0.25（左側）時，就是資源回收桶；在 width*0.75（右側）時就是一般廢料桶。
        // 比對底層綁定的物件類型 (RECYCLABLE 與 TRASH)，邏輯保證完美精準！
        let isLeftBucket = (bucketTargetX < width / 2);
        
        if ((isLeftBucket && itemType === "RECYCLABLE") || (!isLeftBucket && itemType === "TRASH")) {
            score += 10; 
        } else {
            score = max(0, score - 5); 
        }
        resetItem();
    }

    if (itemY > height + 40) {
        resetItem();
    }
}

function updateTechBucket() {
    bucketX = lerp(bucketX, bucketTargetX, 0.16);

    push();
    // 垃圾桶顏色、文字與「目前目標位置」完全一致，保證視覺不發生倒置錯亂 Bug
    if (bucketTargetX < width / 2) {
        stroke(0, 255, 153);
        fill(0, 255, 153, 35);
        drawingContext.shadowBlur = 15;
        drawingContext.shadowColor = 'rgba(0, 255, 153, 0.7)';
    } else {
        stroke(255, 0, 127);
        fill(255, 0, 127, 35);
        drawingContext.shadowBlur = 15;
        drawingContext.shadowColor = 'rgba(255, 0, 127, 0.7)';
    }
    
    strokeWeight(2);
    rect(bucketX, bucketY, bucketWidth, bucketHeight, 5);

    drawingContext.shadowBlur = 0;
    noStroke();
    fill(255);
    textSize(width * 0.025);
    textAlign(CENTER, CENTER);
    text(bucketTargetX < width / 2 ? "【 資源回收 】" : " 【 一般廢料 】", bucketX, bucketY);
    pop();
}

function drawUI() {
    fill(0, 242, 254);
    noStroke();
    textSize(width * 0.035);
    textAlign(CENTER, TOP);
    text("核心同步積分: " + score, width / 2, height * 0.18); 

    rectMode(CENTER);
    fill(5, 5, 12, 240);
    stroke(0, 242, 254, 70);
    strokeWeight(1);
    rect(width / 2, height - 20, width * 0.85, 22, 4);

    noStroke();
    fill(0, 242, 254);
    textSize(width * 0.022);
    textAlign(CENTER, CENTER);
    text(currentGesture, width / 2, height - 20);
}

function windowResized() {
    let canvasW = min(windowWidth - 20, 640);
    let canvasH = (canvasW / 4) * 3;
    resizeCanvas(canvasW, canvasH);
    bucketWidth = width * 0.25;
    bucketHeight = height * 0.1;
    bucketY = height - (bucketHeight + 70);
    btnX = width / 2;
    btnY = height * 0.8;
    btnW = width * 0.45;
    btnH = height * 0.12;
}