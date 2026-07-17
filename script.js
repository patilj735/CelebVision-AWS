// ===============================
// API URLs
// ===============================

const API_BASE = "https://h4liz5w0w1.execute-api.ap-south-1.amazonaws.com";

const UPLOAD_API = `${API_BASE}/upload`;
const CELEBRITY_API = `${API_BASE}/celebrity`;
const HISTORY_API = `${API_BASE}/history`;

// ===============================

const imageInput = document.getElementById("imageInput");
const preview = document.getElementById("preview");
const detectBtn = document.getElementById("detectBtn");

const loading = document.getElementById("loading");
const result = document.getElementById("result");
const historyTable = document.getElementById("historyTable");

let selectedFile = null;

// Preview Image

imageInput.addEventListener("change", function () {

    selectedFile = this.files[0];

    if (!selectedFile) return;

    const reader = new FileReader();

    reader.onload = function (e) {

        preview.src = e.target.result;
        preview.style.display = "block";

    }

    reader.readAsDataURL(selectedFile);

});

// Detect Button

detectBtn.addEventListener("click", async () => {

    if (!selectedFile) {

        alert("Please select an image.");

        return;

    }

    loading.style.display = "block";

    result.innerHTML = "";

    try {

        // Convert to Base64

        const base64 = await fileToBase64(selectedFile);

        // Upload

        const uploadResponse = await fetch(UPLOAD_API, {

            method: "POST",

            headers: {

                "Content-Type": "application/json"

            },

            body: JSON.stringify({

                image: base64,

                extension: selectedFile.name.split(".").pop()

            })

        });

        const uploadData = await uploadResponse.json();

        const imageName = uploadData.image;

        // Detect Celebrity

        const detectResponse = await fetch(

            `${CELEBRITY_API}?image=${imageName}`

        );

        const detectData = await detectResponse.json();

        loading.style.display = "none";

        displayResult(detectData);

        loadHistory();

    }

    catch (err) {

        loading.style.display = "none";

        alert("Error : " + err);

    }

});

// Convert Image to Base64

function fileToBase64(file) {

    return new Promise((resolve, reject) => {

        const reader = new FileReader();

        reader.onload = () => {

            resolve(reader.result.split(",")[1]);

        };

        reader.onerror = reject;

        reader.readAsDataURL(file);

    });

}

// Display Result

function displayResult(data) {

    result.innerHTML = "";

    if (data.count === 0) {

        result.innerHTML = `

        <div class="empty">

            No celebrity detected.

        </div>

        `;

        return;

    }

    data.celebrities.forEach(c => {

        result.innerHTML += `

        <div class="result-card">

            <h3>🌟 ${c.name}</h3>

            <p>Confidence</p>

            <div class="badge">

                ${c.confidence}%

            </div>

        </div>

        `;

    });

}

// Load History

async function loadHistory() {

    try {

        const response = await fetch(HISTORY_API);

        const data = await response.json();

        historyTable.innerHTML = "";

        data.reverse().forEach(item => {

            const names = item.Celebrities.map(

                x => x.name

            ).join(", ");

            historyTable.innerHTML += `

            <tr>

                <td>${item.ImageName}</td>

                <td>${names}</td>

                <td>${item.CelebrityCount}</td>

                <td>${new Date(item.Timestamp).toLocaleString()}</td>

            </tr>

            `;

        });

    }

    catch (err) {

        console.log(err);

    }

}

loadHistory();
